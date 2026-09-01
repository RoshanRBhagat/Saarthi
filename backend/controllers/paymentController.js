/* =========================================================
   SAARTHI - PAYMENT CONTROLLER
========================================================= */

const crypto =
    require("crypto");

const Razorpay =
    require("razorpay");

const Booking =
    require("../models/Booking");


/* =========================================================
   RAZORPAY CLIENT
========================================================= */

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
           FIND CUSTOMER BOOKING
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
           CONFIRMED ONLY
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
           INR → PAISE
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
                    process.env.RAZORPAY_KEY_ID

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


/* =========================================================
   VERIFY RAZORPAY PAYMENT
========================================================= */

async function verifyPayment(
    req,
    res
) {

    try {

        const {
            bookingId,
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature
        } = req.body;


        /* -------------------------------------------------
           AUTHENTICATION
        ------------------------------------------------- */

        if (!req.user) {

            return res.status(401).json({

                success: false,

                message:
                    "Authentication required."

            });

        }


        /* -------------------------------------------------
           VALIDATE INPUT
        ------------------------------------------------- */

        if (
            !bookingId ||
            !razorpay_payment_id ||
            !razorpay_order_id ||
            !razorpay_signature
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Incomplete payment verification data."

            });

        }


        /* -------------------------------------------------
           FIND BOOKING
        ------------------------------------------------- */

        const booking =
            await Booking.findOne({

                bookingId,

                userId:
                    req.user._id

            });


        if (!booking) {

            return res.status(404).json({

                success: false,

                message:
                    "Booking not found in your account."

            });

        }


        /* -------------------------------------------------
           CHECK BOOKING STATUS
        ------------------------------------------------- */

        if (
            booking.status !==
            "confirmed"
        ) {

            return res.status(400).json({

                success: false,

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

            return res.json({

                success: true,

                message:
                    "Booking is already marked as paid.",

                data: {

                    bookingId:
                        booking.bookingId,

                    paymentStatus:
                        booking.paymentStatus

                }

            });

        }


        /* -------------------------------------------------
           EXPECTED BOOKING AMOUNT
        ------------------------------------------------- */

        const expectedAmount =
            Math.round(
                Number(
                    booking.totalAmount
                ) * 100
            );


        if (
            !Number.isFinite(
                expectedAmount
            ) ||
            expectedAmount <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid booking amount."

            });

        }


        /* -------------------------------------------------
           FETCH RAZORPAY ORDER
        ------------------------------------------------- */

        const order =
            await razorpay.orders.fetch(
                razorpay_order_id
            );


        /* -------------------------------------------------
           VERIFY ORDER ↔ BOOKING
        ------------------------------------------------- */

        if (
            order.receipt !==
            booking.bookingId
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Payment order does not belong to this booking."

            });

        }


        /* -------------------------------------------------
           VERIFY ORDER AMOUNT
        ------------------------------------------------- */

        if (
            Number(order.amount) !==
            expectedAmount
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Payment amount does not match the booking amount."

            });

        }


        /* -------------------------------------------------
           FETCH PAYMENT
        ------------------------------------------------- */

        let payment =
            await razorpay.payments.fetch(
                razorpay_payment_id
            );


        console.log(
            "Razorpay payment status:",
            payment.status
        );


        /* -------------------------------------------------
           VERIFY PAYMENT ↔ ORDER
        ------------------------------------------------- */

        if (
            payment.order_id !==
            razorpay_order_id
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Payment does not belong to this order."

            });

        }


        /* -------------------------------------------------
           VERIFY PAYMENT AMOUNT
        ------------------------------------------------- */

        if (
            Number(payment.amount) !==
            expectedAmount
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Payment amount does not match the booking amount."

            });

        }


        /* -------------------------------------------------
           VERIFY RAZORPAY SIGNATURE
        ------------------------------------------------- */

        const generatedSignature =
            crypto
                .createHmac(
                    "sha256",
                    process.env.RAZORPAY_KEY_SECRET
                )
                .update(
                    `${razorpay_order_id}|${razorpay_payment_id}`
                )
                .digest(
                    "hex"
                );


        const receivedSignatureBuffer =
            Buffer.from(
                String(
                    razorpay_signature
                ),
                "utf8"
            );


        const generatedSignatureBuffer =
            Buffer.from(
                generatedSignature,
                "utf8"
            );


        if (
            receivedSignatureBuffer.length !==
            generatedSignatureBuffer.length ||
            !crypto.timingSafeEqual(
                receivedSignatureBuffer,
                generatedSignatureBuffer
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Payment signature verification failed."

            });

        }


        /* -------------------------------------------------
           CAPTURE AUTHORIZED PAYMENT
        ------------------------------------------------- */

        if (
            payment.status ===
            "authorized"
        ) {

            console.log(
                `Payment ${razorpay_payment_id} is authorized. Capturing...`
            );


            await razorpay.payments.capture(
                razorpay_payment_id,
                expectedAmount
            );


            /* ---------------------------------------------
               FETCH PAYMENT AGAIN
            --------------------------------------------- */

            payment =
                await razorpay.payments.fetch(
                    razorpay_payment_id
                );


            console.log(
                "Payment status after capture:",
                payment.status
            );

        }


        /* -------------------------------------------------
           FINAL CAPTURE CHECK
        ------------------------------------------------- */

        if (
            payment.status !==
            "captured"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    `Payment is not captured. Current status: ${payment.status}`

            });

        }


        /* -------------------------------------------------
           UPDATE BOOKING
        ------------------------------------------------- */

        booking.paymentStatus =
            "paid";


        booking.paymentId =
            razorpay_payment_id;


        booking.paymentOrderId =
            razorpay_order_id;


        booking.paymentSignature =
            razorpay_signature;


        booking.paidAt =
            new Date();


        await booking.save();


        /* -------------------------------------------------
           SUCCESS
        ------------------------------------------------- */

        return res.json({

            success: true,

            message:
                "Payment verified successfully.",

            data: {

                bookingId:
                    booking.bookingId,

                paymentStatus:
                    booking.paymentStatus,

                paymentId:
                    booking.paymentId

            }

        });


    } catch (error) {

        console.error(
            "Payment verification error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to verify payment."

        });

    }

}


/* =========================================================
   EXPORTS
========================================================= */

module.exports = {

    createPaymentOrder,

    verifyPayment

};