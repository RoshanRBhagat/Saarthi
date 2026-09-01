/* =========================================================
   SAARTHI - PAYMENT CONTROLLER
========================================================= */

const Razorpay = require("razorpay");

const Booking =
    require("../models/Booking");

const razorpay =
    new Razorpay({

        key_id:
            process.env.RAZORPAY_KEY_ID,

        key_secret:
            process.env.RAZORPAY_KEY_SECRET

    });


/* =========================================================
   CREATE RAZORPAY ORDER
========================================================= */

async function createPaymentOrder(
    req,
    res
) {

    try {

        const {
            bookingId
        } = req.body;


        /* -------------------------------------------------
           AUTHENTICATION
        ------------------------------------------------- */

        if (
            !req.user
        ) {

            return res.status(401).json({

                success:
                    false,

                message:
                    "Authentication required."

            });

        }


        /* -------------------------------------------------
           VALIDATE BOOKING ID
        ------------------------------------------------- */

        if (
            !bookingId
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Booking ID is required."

            });

        }


        /* -------------------------------------------------
           FIND CUSTOMER'S BOOKING
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

                success:
                    false,

                message:
                    "Booking not found in your account."

            });

        }


        /* -------------------------------------------------
           ONLY CONFIRMED BOOKINGS CAN BE PAID
        ------------------------------------------------- */

        if (
            booking.status !==
            "confirmed"
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Only confirmed bookings can be paid."

            });

        }


        /* -------------------------------------------------
           ALREADY PAID
        ------------------------------------------------- */

        if (
            booking.paymentStatus ===
            "paid"
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "This booking has already been paid."

            });

        }


        /* -------------------------------------------------
           VALIDATE AMOUNT
        ------------------------------------------------- */

        const totalAmount =
            Number(
                booking.totalAmount
            );


        if (
            !Number.isFinite(
                totalAmount
            ) ||
            totalAmount <= 0
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Invalid booking amount."

            });

        }


        /* -------------------------------------------------
           CONVERT INR → PAISE
        ------------------------------------------------- */

        const amountInPaise =
            Math.round(
                totalAmount * 100
            );


        /* -------------------------------------------------
           CREATE RAZORPAY ORDER
        ------------------------------------------------- */

        const order =
            await razorpay.orders.create({

                amount:
                    amountInPaise,

                currency:
                    "INR",

                receipt:
                    booking.bookingId,

                notes: {

                    bookingId:
                        booking.bookingId,

                    userId:
                        String(
                            req.user._id
                        )

                }

            });


        /* -------------------------------------------------
           RESPONSE
        ------------------------------------------------- */

        return res.json({

            success:
                true,

            data: {

                orderId:
                    order.id,

                amount:
                    order.amount,

                currency:
                    order.currency,

                keyId:
                    process.env
                        .RAZORPAY_KEY_ID

            }

        });


    } catch (error) {

        console.error(
            "Create Razorpay order error:",
            error.message
        );


        return res.status(500).json({

            success:
                false,

            message:
                "Unable to create payment order."

        });

    }

}


module.exports = {

    createPaymentOrder

};