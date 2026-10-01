const Car =
    require("../models/Car");

const Booking =
    require("../models/Booking");



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
            parseDateOnly(
                pickupDate
            );

        const requestedReturn =
            parseDateOnly(
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
            driverRequired
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

        const requestedPickup =
            new Date(
                `${pickupDate}T00:00:00`
            );

        const requestedReturn =
            new Date(
                `${returnDate}T00:00:00`
            );


        if (
            Number.isNaN(
                requestedPickup.getTime()
            ) ||
            Number.isNaN(
                requestedReturn.getTime()
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid pickup or return date."

            });

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


        const totalAmount =
            totalDays *
            dailyPrice;


        /* -------------------------------------------------
           GENERATE BOOKING ID
        ------------------------------------------------- */

        const bookingId =
            "BOOK" +
            Date.now();


        /* -------------------------------------------------
           CREATE BOOKING
        ------------------------------------------------- */

        const booking =
            await Booking.create({

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

                totalAmount,

                status:
                    "pending",

                paymentStatus:
                    "pending",

                driverRequired:
                    Boolean(
                        driverRequired
                    )

            });


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
   DATE HELPER
========================================================= */

function parseDateOnly(
    dateString
) {

    if (
        typeof dateString !==
        "string"
    ) {

        return null;

    }


    const match =
        /^(\d{4})-(\d{2})-(\d{2})$/
            .exec(
                dateString
            );


    if (!match) {

        return null;

    }


    const year =
        Number(
            match[1]
        );

    const month =
        Number(
            match[2]
        );

    const day =
        Number(
            match[3]
        );


    const date =
        new Date(

            Date.UTC(
                year,
                month - 1,
                day
            )

        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return null;

    }


    return date;

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

    await Booking.updateMany(

        {
            status: "confirmed",

            returnStatus: "confirmed"
        },

        {
            $set: {
                status: "completed"
            }
        }

    );

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

                        driverRequired:
                            booking.driverRequired,

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


        /* -------------------------------------------------
           UPDATE
        ------------------------------------------------- */

        booking.status =
            status;


        await booking.save();


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


        /* -------------------------------------------------
           CANCEL
        ------------------------------------------------- */

        booking.status =
            "cancelled";


        await booking.save();


        return res.json({

            success: true,

            message:
                "Booking cancelled successfully.",

            data:
                booking

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

    getHostBookings,

    updateHostBookingStatus,

    confirmPickup,

    confirmReturn

};