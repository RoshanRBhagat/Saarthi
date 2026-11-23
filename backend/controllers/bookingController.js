const Car =
    require("../models/Car");

const crypto = require("crypto");
const {
    createCarDateReservations,
    activateCarDateReservations,
    releaseCarDateReservations,
    hasReservedDates,
    MAX_RENTAL_DAYS
} = require("../services/carReservationService");
const { releaseDriverDateReservations } = require("../services/driverReservationService");

const Booking =
    require("../models/Booking");

const { calculateCoupon, roundMoney } =
    require("../services/couponService");
const { queueCancellationRefund } =
    require("../services/bookingCancellation");
const { parseDateOnly: parseStrictDateOnly, parseDriverRequest, isTodayOrFutureIndia } =
    require("../services/bookingValidation");

function canViewHandoverInstructions(booking) {
    return Boolean(
        booking &&
        ["confirmed", "completed"].includes(booking.status) &&
        booking.paymentStatus === "paid" &&
        !["pending_review", "processing", "failed"].includes(booking.refundStatus)
    );
}



/* =========================================================
   CHECK CAR AVAILABILITY
========================================================= */

async function checkAvailability(
    req,
    res
) {

    try {

        const carId =
            req.params.carId;

        const {
            pickupDate,
            returnDate
        } = req.query;


        /* -------------------------------------------------
           VALIDATE INPUT
        ------------------------------------------------- */

        if (
            !pickupDate ||
            !returnDate
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Pickup date and return date are required."

            });

        }


        /* -------------------------------------------------
           PARSE DATES
        ------------------------------------------------- */

        const requestedPickup =
            parseStrictDateOnly(
                pickupDate
            );

        const requestedReturn =
            parseStrictDateOnly(
                returnDate
            );


        if (
            !requestedPickup ||
            !requestedReturn
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please provide valid pickup and return dates."

            });

        }


        /* -------------------------------------------------
           DATE ORDER
        ------------------------------------------------- */

        if (
            requestedReturn <
            requestedPickup
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Return date cannot be before pickup date."

            });

        }

        if (Math.floor((requestedReturn - requestedPickup) / 86400000) + 1 > MAX_RENTAL_DAYS) {
            return res.status(400).json({ success: false, message: `Rentals cannot exceed ${MAX_RENTAL_DAYS} days.` });
        }

        if (!isTodayOrFutureIndia(requestedPickup)) {
            return res.status(400).json({ success: false, message: "Pickup date cannot be in the past." });
        }


        /* -------------------------------------------------
           FIND CAR
        ------------------------------------------------- */

        const car =
            await Car.findOne({

                carId,

                status:
                    "available"

            });


        if (!car) {

            return res.status(404).json({

                success: false,

                message:
                    "Car not found or is not currently available."

            });

        }


        /* -------------------------------------------------
           CHECK OVERLAPPING BOOKINGS
        ------------------------------------------------- */

        const overlappingBooking =
            await Booking.findOne({

                carId,

                status: {
                    $in: [
                        "pending",
                        "confirmed"
                    ]
                },

                pickupDate: {
                    $lte:
                        requestedReturn
                },

                returnDate: {
                    $gte:
                        requestedPickup
                }

            });


        if (
            overlappingBooking
        ) {

            return res.json({

                success: true,

                available: false,

                message:
                    "This car is already booked for the selected dates."

            });

        }

        if (await hasReservedDates(carId, requestedPickup, requestedReturn)) {
            return res.json({ success: true, available: false, message: "This car is already reserved for the selected dates." });
        }


        /* -------------------------------------------------
           AVAILABLE
        ------------------------------------------------- */

        return res.json({

            success: true,

            available: true,

            message:
                "This car is available for the selected dates.",

            car: {

                carId:
                    car.carId,

                make:
                    car.make,

                model:
                    car.model,

                dailyPrice:
                    car.dailyPrice

            }

        });


    } catch (error) {

        console.error(
            "Availability check error:",
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to check car availability."

        });

    }

}



/* =========================================================
   CREATE BOOKING
========================================================= */

async function createBooking(
    req,
    res
) {

    try {

        const {
            carId,
            customerName,
            customerPhone,
            customerEmail,
            pickupDate,
            returnDate,
            driverRequired,
            couponCode
        } = req.body;


        /* -------------------------------------------------
           AUTHENTICATED USER
        ------------------------------------------------- */

        const user =
            req.user;


        if (!user) {

            return res.status(401).json({

                success: false,

                message:
                    "Authentication required."

            });

        }


        /* -------------------------------------------------
           BASIC VALIDATION
        ------------------------------------------------- */

        if (
            !carId ||
            !customerName ||
            !customerPhone ||
            !pickupDate ||
            !returnDate
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please provide all required booking details."

            });

        }


        /* -------------------------------------------------
           PHONE VALIDATION
        ------------------------------------------------- */

        if (
            !/^[0-9]{10}$/.test(
                String(
                    customerPhone
                ).trim()
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please provide a valid 10-digit mobile number."

            });

        }


        /* -------------------------------------------------
           DATE VALIDATION
        ------------------------------------------------- */

        const requestedPickup = parseStrictDateOnly(pickupDate);
        const requestedReturn = parseStrictDateOnly(returnDate);
        const normalizedDriverRequest = parseDriverRequest(driverRequired);


        if (
            !requestedPickup ||
            !requestedReturn
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid pickup or return date."

            });

        }

        if (normalizedDriverRequest === null) {
            return res.status(400).json({ success: false, message: "Driver request must be true or false." });
        }


        if (
            requestedReturn <
            requestedPickup
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Return date cannot be before pickup date."

            });

        }

        if (Math.floor((requestedReturn - requestedPickup) / 86400000) + 1 > MAX_RENTAL_DAYS) {
            return res.status(400).json({ success: false, message: `Rentals cannot exceed ${MAX_RENTAL_DAYS} days.` });
        }

        if (!isTodayOrFutureIndia(requestedPickup)) {
            return res.status(400).json({ success: false, message: "Pickup date cannot be in the past." });
        }


        /* -------------------------------------------------
           FIND CAR
        ------------------------------------------------- */

        const car =
            await Car.findOne({

                carId,

                status:
                    "available"

            });


        if (!car) {

            return res.status(404).json({

                success: false,

                message:
                    "Car not found or is not available."

            });

        }


        /* -------------------------------------------------
           RE-CHECK AVAILABILITY
        ------------------------------------------------- */

        const overlappingBooking =
            await Booking.findOne({

                carId,

                status: {
                    $in: [
                        "pending",
                        "confirmed"
                    ]
                },

                pickupDate: {
                    $lte:
                        requestedReturn
                },

                returnDate: {
                    $gte:
                        requestedPickup
                }

            });


        if (
            overlappingBooking
        ) {

            return res.status(409).json({

                success: false,

                message:
                    "This car is already booked for the selected dates."

            });

        }


        /* -------------------------------------------------
           CALCULATE RENTAL
        ------------------------------------------------- */

        const millisecondsPerDay =
            1000 *
            60 *
            60 *
            24;


        const totalDays =
            Math.floor(

                (
                    requestedReturn.getTime() -
                    requestedPickup.getTime()
                ) /
                millisecondsPerDay

            ) + 1;


        const dailyPrice =
            Number(
                car.dailyPrice || 0
            );


        const subtotalAmount =
            roundMoney(totalDays * dailyPrice);

        let couponPricing;
        try {
            couponPricing = calculateCoupon(couponCode, subtotalAmount);
        } catch (couponError) {
            return res.status(400).json({
                success: false,
                message: couponError.message || "Invalid coupon code."
            });
        }

        const totalAmount = couponPricing.totalAmount;


        /* -------------------------------------------------
           GENERATE BOOKING ID
        ------------------------------------------------- */

        const bookingId = `BOOK${Date.now()}${crypto.randomBytes(4).toString("hex")}`;

        const reservation = await createCarDateReservations({ carId, bookingId, pickupDate: requestedPickup, returnDate: requestedReturn });
        if (!reservation.ok) {
            return res.status(reservation.reason === "unavailable" ? 409 : 400).json({
                success: false,
                message: reservation.reason === "unavailable"
                    ? "This car was just reserved by another customer for those dates."
                    : `Rentals cannot exceed ${MAX_RENTAL_DAYS} days.`
            });
        }


        /* -------------------------------------------------
           CREATE BOOKING
        ------------------------------------------------- */

        let booking;
        try {
            booking = await Booking.create({

                bookingId,

                carId,

                userId:
                    user._id,

                customerName:
                    String(
                        customerName
                    ).trim(),

                customerPhone:
                    String(
                        customerPhone
                    ).trim(),

                customerEmail:
                    customerEmail
                        ? String(
                            customerEmail
                        ).trim()
                        : "",

                pickupDate:
                    requestedPickup,

                returnDate:
                    requestedReturn,

                totalDays,

                dailyPrice,

                subtotalAmount: couponPricing.subtotalAmount,

                discountAmount: couponPricing.discountAmount,

                couponCode: couponPricing.couponCode,

                totalAmount,

                status:
                    "pending",

                paymentStatus:
                    "pending",

                driverRequired:
                    normalizedDriverRequest

            });
            await activateCarDateReservations(bookingId);
        } catch (creationError) {
            // Keep the short-lived creating lease after uncertain persistence errors;
            // deleting it could let a concurrent request double-book a saved booking.
            throw creationError;
        }


        /* -------------------------------------------------
           SUCCESS
        ------------------------------------------------- */

        return res.status(201).json({

            success: true,

            message:
                "Booking created successfully.",

            data:
                booking

        });


    } catch (error) {

        console.error(
            "Booking creation error:",
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to create booking."

        });

    }

}



/* =========================================================
   RENTAL DAYS
========================================================= */

function calculateRentalDays(
    pickupDate,
    returnDate
) {

    const milliseconds =
        returnDate.getTime() -
        pickupDate.getTime();


    return (

        Math.floor(

            milliseconds /
            (
                1000 *
                60 *
                60 *
                24
            )

        ) + 1

    );

}



/* =========================================================
   RENTAL STATUS
========================================================= */

function getRentalStatus(
    booking
) {

    if (
        booking.status ===
        "pending"
    ) {

        return "pending";

    }


    if (
        booking.status ===
        "cancelled"
    ) {

        return "cancelled";

    }


    if (
        booking.status ===
        "completed"
    ) {

        return "completed";

    }


    if (
        booking.status !==
        "confirmed"
    ) {

        return booking.status;

    }


    const pickupDate =
        new Date(
            booking.pickupDate
        );

    const returnDate =
        new Date(
            booking.returnDate
        );


    pickupDate.setHours(
        0,
        0,
        0,
        0
    );

    returnDate.setHours(
        0,
        0,
        0,
        0
    );


    const today =
        new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );


    if (
        today <
        pickupDate
    ) {

        return "upcoming";

    }


    if (
        today >= pickupDate &&
        today <= returnDate
    ) {

        return "active";

    }


    if (
        today >
        returnDate
    ) {

        return "completed";

    }


    return "upcoming";

}



/* =========================================================
   INSPECTION VALIDATION
========================================================= */

function hasCompleteInspection(inspection) {
    const requiredAngles = [
        "front",
        "front-left",
        "left",
        "rear-left",
        "rear",
        "rear-right",
        "right",
        "front-right"
    ];

    const photos = Array.isArray(inspection?.photos)
        ? inspection.photos
        : [];

    const angles = photos.map(photo => photo?.angle);

    return (
        inspection?.status === "completed" &&
        photos.length === requiredAngles.length &&
        new Set(angles).size === requiredAngles.length &&
        requiredAngles.every(angle => angles.includes(angle))
    );
}


/* =========================================================
   AUTO COMPLETE FINISHED BOOKINGS
========================================================= */

async function autoCompleteFinishedBookings() {

    /*
        Do NOT automatically change a confirmed booking to
        completed merely because its return date has passed.

        The host must explicitly confirm the vehicle return.

        Once returnStatus becomes "confirmed", confirmReturn()
        already changes booking.status to "completed".

        This prevents a late return confirmation from becoming
        impossible after the scheduled return date.
    */

    const eligibleBookings = await Booking.find({
        status: "confirmed",
        returnStatus: "confirmed"
    }).select("bookingId").lean();

    if (eligibleBookings.length === 0) return;

    const bookingIds = eligibleBookings.map(booking => booking.bookingId);
    await Booking.updateMany(
        {
            bookingId: { $in: bookingIds },
            status: "confirmed",
            returnStatus: "confirmed"
        },
        { $set: { status: "completed" } }
    );

    await releaseCarDateReservations(bookingIds).catch(error => {
        console.error("Unable to release completed booking reservations:", error.message);
    });
    await releaseDriverDateReservations(bookingIds).catch(error => {
        console.error("Unable to release completed driver reservations:", error.message);
    });

}


/* =========================================================
   GET CUSTOMER BOOKINGS
========================================================= */

async function getCustomerBookings(
    req,
    res
) {

    try {

        await autoCompleteFinishedBookings();


        const userId =
            req.user._id;


        const bookings =
            await Booking.find({

                userId

            }).sort({

                createdAt:
                    -1

            });


        const bookingData =
            bookings.map(

                booking => {

                    const data =
                        booking.toObject();


                    data.rentalStatus =
                        getRentalStatus(
                            booking
                        );


                    return data;

                }

            );

        const bookingsWithLocationAccess = bookingData.filter(canViewHandoverInstructions);
        if (bookingsWithLocationAccess.length > 0) {
            const cars = await Car.find({
                carId: { $in: bookingsWithLocationAccess.map(booking => booking.carId) }
            }).select("carId +handoverInstructions").lean();
            const carById = new Map(cars.map(car => [car.carId, car]));
            bookingsWithLocationAccess.forEach(booking => {
                const car = carById.get(booking.carId);
                if (car?.handoverInstructions) booking.handoverInstructions = car.handoverInstructions;
            });
        }

        const Driver = require("../models/Driver");
        const driverIds = bookingData.map(item => item.driverId).filter(Boolean);
        const assignedDrivers = await Driver.find({ _id: { $in: driverIds } }).populate("userId", "name phone").select("userId city status").lean();
        const driverMap = new Map(assignedDrivers.map(item => [String(item._id), item]));
        bookingData.forEach(item => { item.assignedDriver = item.driverId ? driverMap.get(String(item.driverId)) || null : null; });


        return res.json({

            success: true,

            count:
                bookingData.length,

            data:
                bookingData

        });


    } catch (error) {

        console.error(
            "Get my bookings error:",
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to fetch your bookings."

        });

    }

}



/* =========================================================
   GET HOST BOOKINGS
========================================================= */

async function getHostBookings(
    req,
    res
) {

    try {

        await autoCompleteFinishedBookings();


        const ownerId =
            req.user._id;


        /* -------------------------------------------------
           FIND HOST'S CARS
        ------------------------------------------------- */

        const hostCars =
            await Car.find({

                ownerId

            }).select(

                "carId make model mainImage city state dailyPrice"

            );


        if (
            hostCars.length === 0
        ) {

            return res.json({

                success: true,

                count: 0,

                data: []

            });

        }


        /* -------------------------------------------------
           CAR IDS
        ------------------------------------------------- */

        const hostCarIds =
            hostCars.map(

                car =>
                    car.carId

            );


        /* -------------------------------------------------
           BOOKINGS
        ------------------------------------------------- */

        const bookings =
            await Booking.find({

                carId: {

                    $in:
                        hostCarIds

                }

            }).sort({

                createdAt:
                    -1

            });


        /* -------------------------------------------------
           CAR LOOKUP
        ------------------------------------------------- */

        const carMap =
            new Map();


        hostCars.forEach(

            car => {

                carMap.set(

                    car.carId,

                    car

                );

            }

        );


        /* -------------------------------------------------
           RESPONSE DATA
        ------------------------------------------------- */

        const bookingData =
            bookings.map(

                booking => {

                    const car =
                        carMap.get(
                            booking.carId
                        );


                    return {

                        bookingId:
                            booking.bookingId,

                        carId:
                            booking.carId,

                        customerName:
                            booking.customerName,

                        customerPhone:
                            booking.customerPhone,

                        customerEmail:
                            booking.customerEmail,

                        pickupDate:
                            booking.pickupDate,

                        returnDate:
                            booking.returnDate,

                        totalDays:
                            booking.totalDays,

                        dailyPrice:
                            booking.dailyPrice,

                        subtotalAmount:
                            booking.subtotalAmount ?? booking.totalAmount,

                        discountAmount:
                            booking.discountAmount || 0,

                        couponCode:
                            booking.couponCode || "",

                        totalAmount:
                            booking.totalAmount,

                        status:
                            booking.status,

                        rentalStatus:
                            getRentalStatus(
                                booking
                            ),

                        paymentStatus:
                            booking.paymentStatus,

                        refundStatus:
                            booking.refundStatus || "none",

                        refundedAmountPaise:
                            booking.refundedAmountPaise || 0,

                        paymentId:
                            booking.paymentId,

                        paidAt:
                            booking.paidAt,

                        pickupStatus:
                            booking.pickupStatus,

                        pickupConfirmedAt:
                            booking.pickupConfirmedAt,

                        pickupNotes:
                            booking.pickupNotes,

                        returnStatus:
                            booking.returnStatus,

                        returnConfirmedAt:
                            booking.returnConfirmedAt,

                        returnNotes:
                            booking.returnNotes,

                        pickupInspection:
                            booking.pickupInspection
                                ? {
                                    status: booking.pickupInspection.status,
                                    photos: booking.pickupInspection.photos,
                                    completedAt: booking.pickupInspection.completedAt,
                                    notes: booking.pickupInspection.notes
                                }
                                : null,

                        returnInspection:
                            booking.returnInspection
                                ? {
                                    status: booking.returnInspection.status,
                                    photos: booking.returnInspection.photos,
                                    completedAt: booking.returnInspection.completedAt,
                                    notes: booking.returnInspection.notes,
                                    aiAnalysis: booking.returnInspection.aiAnalysis,
                                    aiAnalyzedAt: booking.returnInspection.aiAnalyzedAt
                                }
                                : null,

                        driverRequired:
                            booking.driverRequired,

                        driverId:
                            booking.driverId,


                        createdAt:
                            booking.createdAt,

                        car:
                            car
                                ? {

                                    make:
                                        car.make,

                                    model:
                                        car.model,

                                    mainImage:
                                        car.mainImage,

                                    city:
                                        car.city,

                                    state:
                                        car.state,

                                    dailyPrice:
                                        car.dailyPrice

                                }
                                : null

                    };

                }

            );


        return res.json({

            success: true,

            count:
                bookingData.length,

            data:
                bookingData

        });


    } catch (error) {

        console.error(
            "Host bookings error:",
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to fetch host bookings."

        });

    }

}



/* =========================================================
   UPDATE HOST BOOKING STATUS
========================================================= */

async function updateHostBookingStatus(
    req,
    res
) {

    try {

        const bookingId =
            req.params.bookingId;


        const {
            status
        } =
            req.body;


        const allowedStatuses = [

            "confirmed",

            "cancelled"

        ];


        if (
            !allowedStatuses.includes(
                status
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid booking status."

            });

        }


        /* -------------------------------------------------
           FIND HOST'S VEHICLES
        ------------------------------------------------- */

        const hostCars =
            await Car.find({

                ownerId:
                    req.user._id

            }).select(
                "carId"
            );


        const hostCarIds =
            hostCars.map(

                car =>
                    car.carId

            );


        if (
            hostCarIds.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "You do not have any vehicles."

            });

        }


        /* -------------------------------------------------
           FIND BOOKING
        ------------------------------------------------- */

        const booking =
            await Booking.findOne({

                bookingId,

                carId: {
                    $in:
                        hostCarIds
                }

            });


        if (
            !booking
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Booking not found for your vehicles."

            });

        }


        /* -------------------------------------------------
           PREVENT CHANGING COMPLETED BOOKINGS
        ------------------------------------------------- */

        if (
            booking.status ===
            "completed"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Completed bookings cannot be changed."

            });

        }

        if (booking.status === "cancelled") {
            return res.status(409).json({
                success: false,
                message: "Cancelled bookings cannot be changed. Create a new booking if the customer still needs the vehicle."
            });
        }

        if (status === "cancelled" && booking.pickupStatus === "confirmed") {
            return res.status(409).json({
                success: false,
                message: "A booking cannot be cancelled after vehicle pickup has been confirmed."
            });
        }

        if (
            status === "confirmed" &&
            ["pending_review", "processing", "failed"].includes(booking.refundStatus)
        ) {
            return res.status(409).json({
                success: false,
                message: "A cancellation and refund request is under review; this booking cannot be reconfirmed yet."
            });
        }


        /* -------------------------------------------------
           UPDATE
        ------------------------------------------------- */

        if (status === "cancelled" && booking.paymentStatus === "paid") {
            const queued = queueCancellationRefund(booking, req.user._id, req.body?.reason);
            if (!queued.queued) {
                return res.status(409).json({ success: false, message: queued.message });
            }
            await booking.save();
            return res.status(202).json({
                success: true,
                cancellationRequested: true,
                message: "Cancellation and refund request sent for administrator review. The booking remains active until the refund is processed.",
                data: booking
            });
        }

        booking.status =
            status;


        await booking.save();
        if (status === "cancelled") {
            await releaseCarDateReservations(bookingId).catch(error => {
                console.error("Unable to release cancelled booking reservations:", error.message);
            });
            await releaseDriverDateReservations(bookingId).catch(error => {
                console.error("Unable to release cancelled driver reservations:", error.message);
            });
        }


        return res.json({

            success: true,

            message:
                `Booking ${status} successfully.`,

            data:
                booking

        });


    } catch (error) {

        console.error(
            "Host booking status error:",
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to update booking status."

        });

    }

}



/* =========================================================
   CANCEL CUSTOMER BOOKING
========================================================= */

async function cancelCustomerBooking(
    req,
    res
) {

    try {

        const bookingId =
            req.params.bookingId;


        /* -------------------------------------------------
           FIND BOOKING
        ------------------------------------------------- */

        const booking =
            await Booking.findOne({

                bookingId,

                userId:
                    req.user._id

            });


        if (
            !booking
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Booking not found in your account."

            });

        }


        /* -------------------------------------------------
           ALREADY CANCELLED
        ------------------------------------------------- */

        if (
            booking.status ===
            "cancelled"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "This booking is already cancelled."

            });

        }


        /* -------------------------------------------------
           COMPLETED
        ------------------------------------------------- */

        if (
            booking.status ===
            "completed"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Completed bookings cannot be cancelled."

            });

        }


        /* -------------------------------------------------
           ONLY PENDING / CONFIRMED
        ------------------------------------------------- */

        if (
            ![
                "pending",
                "confirmed"
            ].includes(
                booking.status
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "This booking cannot be cancelled."

            });

        }

        /* -------------------------------------------------
           RENTAL ALREADY STARTED
        ------------------------------------------------- */

        const pickupDate =
            new Date(
                booking.pickupDate
            );


        pickupDate.setHours(
            0,
            0,
            0,
            0
        );


        const today =
            new Date();


        today.setHours(
            0,
            0,
            0,
            0
        );


        if (
            pickupDate <=
            today
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Bookings cannot be cancelled once the pickup date has arrived."

            });

        }

        if (booking.paymentStatus === "paid") {
            const queued = queueCancellationRefund(booking, req.user._id, req.body?.reason);
            if (!queued.queued) {
                return res.status(409).json({ success: false, message: queued.message });
            }
            await booking.save();
            return res.status(202).json({
                success: true,
                cancellationRequested: true,
                message: "Cancellation and refund request sent for administrator review. The booking remains active until the refund is processed.",
                data: booking
            });
        }


        /* -------------------------------------------------
           CANCEL UNPAID BOOKING ATOMICALLY
           This prevents a stale customer request from overwriting a
           concurrent captured-payment update.
        ------------------------------------------------- */

        const cancelledBooking = await Booking.findOneAndUpdate(
            {
                _id: booking._id,
                userId: req.user._id,
                status: { $in: ["pending", "confirmed"] },
                paymentStatus: { $in: ["pending", "failed"] },
                pickupStatus: { $ne: "confirmed" },
                returnStatus: { $ne: "confirmed" }
            },
            { $set: { status: "cancelled" } },
            { returnDocument: "after" }
        );

        if (!cancelledBooking) {
            const latestBooking = await Booking.findById(booking._id);
            if (latestBooking?.paymentStatus === "paid" && ["pending", "confirmed"].includes(latestBooking.status)) {
                const queued = queueCancellationRefund(latestBooking, req.user._id, req.body?.reason);
                if (!queued.queued) {
                    return res.status(409).json({ success: false, message: queued.message });
                }
                await latestBooking.save();
                return res.status(202).json({
                    success: true,
                    cancellationRequested: true,
                    message: "Payment completed while cancellation was being submitted. A cancellation and refund request has been sent for administrator review.",
                    data: latestBooking
                });
            }
            if (latestBooking?.status === "cancelled") {
                return res.status(400).json({ success: false, message: "This booking is already cancelled." });
            }
            return res.status(409).json({
                success: false,
                message: "The booking changed while cancellation was being submitted. Refresh the page and review its current status."
            });
        }

        await releaseCarDateReservations(bookingId).catch(error => {
            console.error("Unable to release cancelled booking reservations:", error.message);
        });
        await releaseDriverDateReservations(bookingId).catch(error => {
            console.error("Unable to release cancelled driver reservations:", error.message);
        });


        return res.json({

            success: true,

            message:
                "Booking cancelled successfully.",

            data:
                cancelledBooking

        });


    } catch (error) {

        console.error(
            "Customer booking cancellation error:",
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to cancel booking."

        });

    }

}



/* =========================================================
   CONFIRM PICKUP
========================================================= */

async function confirmPickup(
    req,
    res
) {

    try {

        const bookingId =
            req.params.bookingId;


        /* -------------------------------------------------
           FIND HOST'S VEHICLES
        ------------------------------------------------- */

        const hostCars =
            await Car.find({

                ownerId:
                    req.user._id

            }).select(
                "carId"
            );


        const hostCarIds =
            hostCars.map(

                car =>
                    car.carId

            );


        if (
            hostCarIds.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "You do not have any vehicles."

            });

        }


        /* -------------------------------------------------
           FIND BOOKING
        ------------------------------------------------- */

        const booking =
            await Booking.findOne({

                bookingId,

                carId: {
                    $in:
                        hostCarIds
                }

            });


        if (
            !booking
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Booking not found for your vehicles."

            });

        }


        /* -------------------------------------------------
           BOOKING MUST BE CONFIRMED
        ------------------------------------------------- */

        if (
            booking.status !==
            "confirmed"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Only confirmed bookings can be picked up."

            });

        }

        if (["pending_review", "processing", "failed"].includes(booking.refundStatus)) {
            return res.status(409).json({
                success: false,
                message: "Pickup is paused while the cancellation and refund request is being reviewed."
            });
        }


        /* -------------------------------------------------
           PAYMENT MUST BE COMPLETED
        ------------------------------------------------- */

        if (
            booking.paymentStatus !==
            "paid"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Pickup cannot be confirmed until payment is completed."

            });

        }


        /* -------------------------------------------------
           PICKUP INSPECTION MUST BE COMPLETE
        ------------------------------------------------- */

        if (!hasCompleteInspection(booking.pickupInspection)) {
            return res.status(409).json({
                success: false,
                message:
                    "Upload all 8 pickup inspection photos before confirming vehicle pickup."
            });
        }


        /* -------------------------------------------------
           PREVENT DUPLICATE PICKUP
        ------------------------------------------------- */

        if (
            booking.pickupStatus ===
            "confirmed"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Pickup has already been confirmed."

            });

        }


        /* -------------------------------------------------
           CHECK PICKUP DATE
        ------------------------------------------------- */

        const today =
            new Date();


        today.setHours(
            0,
            0,
            0,
            0
        );


        const pickupDate =
            new Date(
                booking.pickupDate
            );


        pickupDate.setHours(
            0,
            0,
            0,
            0
        );


        if (
            today <
            pickupDate
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Pickup cannot be confirmed before the pickup date."

            });

        }


        /* -------------------------------------------------
           OPTIONAL NOTES
        ------------------------------------------------- */

        const notes =
            typeof req.body.notes ===
            "string"

                ? req.body.notes.trim()

                : "";


        /* -------------------------------------------------
           CONFIRM PICKUP
        ------------------------------------------------- */

        booking.pickupStatus =
            "confirmed";

        booking.pickupConfirmedAt =
            new Date();

        booking.pickupNotes =
            notes;


        await booking.save();


        return res.json({

            success: true,

            message:
                "Vehicle pickup confirmed successfully.",

            data:
                booking

        });


    } catch (error) {

        console.error(
            "Pickup confirmation error:",
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to confirm vehicle pickup."

        });

    }

}



/* =========================================================
   CONFIRM RETURN
========================================================= */

async function confirmReturn(
    req,
    res
) {

    try {

        const bookingId =
            req.params.bookingId;


        /* -------------------------------------------------
           FIND HOST'S VEHICLES
        ------------------------------------------------- */

        const hostCars =
            await Car.find({

                ownerId:
                    req.user._id

            }).select(
                "carId"
            );


        const hostCarIds =
            hostCars.map(

                car =>
                    car.carId

            );


        if (
            hostCarIds.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "You do not have any vehicles."

            });

        }


        /* -------------------------------------------------
           FIND BOOKING
        ------------------------------------------------- */

        const booking =
            await Booking.findOne({

                bookingId,

                carId: {
                    $in:
                        hostCarIds
                }

            });


        if (
            !booking
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Booking not found for your vehicles."

            });

        }


        /* -------------------------------------------------
           BOOKING MUST BE CONFIRMED
        ------------------------------------------------- */

        if (
            booking.status !==
            "confirmed"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Only confirmed bookings can be returned."

            });

        }


        /* -------------------------------------------------
           PAYMENT MUST BE COMPLETED
        ------------------------------------------------- */

        if (
            booking.paymentStatus !==
            "paid"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Return cannot be confirmed until payment is completed."

            });

        }


        /* -------------------------------------------------
           PICKUP MUST BE CONFIRMED
        ------------------------------------------------- */

        if (
            booking.pickupStatus !==
            "confirmed"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Vehicle pickup must be confirmed before return."

            });

        }


        /* -------------------------------------------------
           RETURN INSPECTION MUST BE COMPLETE
        ------------------------------------------------- */

        if (!hasCompleteInspection(booking.returnInspection)) {
            return res.status(409).json({
                success: false,
                message:
                    "Upload all 8 return inspection photos before confirming vehicle return."
            });
        }


        /* -------------------------------------------------
           PREVENT DUPLICATE RETURN
        ------------------------------------------------- */

        if (
            booking.returnStatus ===
            "confirmed"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Return has already been confirmed."

            });

        }


        /* -------------------------------------------------
           VEHICLE RENTAL MUST HAVE STARTED
        ------------------------------------------------- */

        const today =
            new Date();


        today.setHours(
            0,
            0,
            0,
            0
        );


        const pickupDate =
            new Date(
                booking.pickupDate
            );


        pickupDate.setHours(
            0,
            0,
            0,
            0
        );


        if (
            today <
            pickupDate
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Vehicle cannot be returned before the rental starts."

            });

        }


        /* -------------------------------------------------
           OPTIONAL NOTES
        ------------------------------------------------- */

        const notes =
            typeof req.body.notes ===
            "string"

                ? req.body.notes.trim()

                : "";


        /* -------------------------------------------------
           CONFIRM RETURN
        ------------------------------------------------- */

        booking.returnStatus =
            "confirmed";

        booking.returnConfirmedAt =
            new Date();

        booking.returnNotes =
            notes;

        booking.status =
            "completed";


        await booking.save();

        await releaseCarDateReservations(bookingId).catch(error => {
            console.error("Unable to release completed booking reservations:", error.message);
        });
        await releaseDriverDateReservations(bookingId).catch(error => {
            console.error("Unable to release completed driver reservations:", error.message);
        });


        return res.json({

            success: true,

            message:
                "Vehicle return confirmed successfully.",

            data:
                booking

        });


    } catch (error) {

        console.error(
            "Return confirmation error:",
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to confirm vehicle return."

        });

    }

}



/* =========================================================
   EXPORTS
========================================================= */

module.exports = {

    checkAvailability,

    createBooking,

    getCustomerBookings,

    cancelCustomerBooking,
    canViewHandoverInstructions,

    getHostBookings,

    updateHostBookingStatus,

    confirmPickup,

    confirmReturn

};
