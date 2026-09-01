const Car = require("../models/Car");
const Booking = require("../models/Booking");


// =========================================================
// CHECK CAR AVAILABILITY
// =========================================================
//
// GET /api/bookings/availability/:carId
//
// Query:
//
// ?pickupDate=2026-09-10&returnDate=2026-09-12
//
// Returns whether the requested car is available.
// =========================================================

async function checkAvailability(req, res) {

    try {

        const carId =
            req.params.carId;

        const {
            pickupDate,
            returnDate
        } = req.query;


        // =================================================
        // VALIDATE INPUT
        // =================================================

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


        // =================================================
        // PARSE DATES
        // =================================================

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


        // =================================================
        // DATE ORDER
        // =================================================

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


        // =================================================
        // CHECK CAR
        // =================================================

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


        // =================================================
        // CHECK OVERLAPPING BOOKINGS
        // =================================================
        //
        // Two date ranges overlap when:
        //
        // existingPickup <= requestedReturn
        //
        // AND
        //
        // existingReturn >= requestedPickup
        //
        // We only consider bookings that are actually
        // blocking availability.
        // =================================================

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


        // =================================================
        // NOT AVAILABLE
        // =================================================

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


        // =================================================
        // AVAILABLE
        // =================================================

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


// =========================================================
// CREATE BOOKING
// =========================================================
//
// POST /api/bookings
//
// This will be used after we build the booking form.
// =========================================================

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


        if (
            !user
        ) {

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


        if (
            !car
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Car not found or is not available."

            });

        }


        /* =================================================
           IMPORTANT:
           RE-CHECK AVAILABILITY DURING BOOKING CREATION
           
           Never trust only the frontend or the separate
           availability endpoint.
        ================================================== */

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


        /* -------------------------------------------------
           BOOKING CONFLICT
        ------------------------------------------------- */

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

                /* -----------------------------------------
                   New bookings require host approval
                ------------------------------------------ */

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


// =========================================================
// DATE HELPER
// =========================================================
//
// Converts YYYY-MM-DD into a Date at UTC midnight.
// Using date-only values avoids common timezone problems
// when customers select rental dates.
// =========================================================

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


// =========================================================
// RENTAL DAYS
// =========================================================

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
   GET CUSTOMER BOOKINGS
========================================================= */

/* =========================================================
   GET MY BOOKINGS
========================================================= */

async function getCustomerBookings(
    req,
    res
) {

    try {

        /* -------------------------------------------------
           AUTHENTICATED USER
        ------------------------------------------------- */

        const userId =
            req.user._id;


        /* -------------------------------------------------
           FIND ONLY THIS USER'S BOOKINGS
        ------------------------------------------------- */

        const bookings =
            await Booking.find({

                userId:

                    userId

            })
            .sort({

                createdAt:
                    -1

            });


        /* -------------------------------------------------
           RESPONSE
        ------------------------------------------------- */

        return res.json({

            success: true,

            count:
                bookings.length,

            data:
                bookings

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

        /* -------------------------------------------------
           AUTHENTICATED HOST
        ------------------------------------------------- */

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


        /* -------------------------------------------------
           NO VEHICLES
        ------------------------------------------------- */

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
           GET CAR IDS
        ------------------------------------------------- */

        const hostCarIds =
            hostCars.map(
                car =>
                    car.carId
            );


        /* -------------------------------------------------
           FIND BOOKINGS
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
           CREATE QUICK CAR LOOKUP
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
           ATTACH CAR DETAILS
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

                        paymentStatus:
                            booking.paymentStatus,

                        driverRequired:
                            booking.driverRequired,

                        createdAt:
                            booking.createdAt,

                        car: car
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


        /* -------------------------------------------------
           RESPONSE
        ------------------------------------------------- */

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
        } = req.body;


        /* -------------------------------------------------
           VALID STATUS
        ------------------------------------------------- */

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
           
           Notice that we verify BOTH:
           
           bookingId
           +
           carId belongs to host
           
           This prevents one host from modifying
           another host's booking.
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


        /* -------------------------------------------------
           RESPONSE
        ------------------------------------------------- */

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
           FIND BOOKING BELONGING TO LOGGED-IN USER
        ------------------------------------------------- */

        const booking =
            await Booking.findOne({

                bookingId,

                userId:
                    req.user._id

            });


        /* -------------------------------------------------
           NOT FOUND
        ------------------------------------------------- */

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
           ONLY PENDING / CONFIRMED BOOKINGS
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

        const now =
            new Date();


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


        /* -------------------------------------------------
           RESPONSE
        ------------------------------------------------- */

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


// =========================================================
// EXPORTS
// =========================================================

module.exports = {

    checkAvailability,

    createBooking,

    getCustomerBookings,

    cancelCustomerBooking,

    getHostBookings,

    updateHostBookingStatus

};