/* =========================================================
   SAARTHI - PAYMENT CONTROLLER
========================================================= */

const crypto =
    require("crypto");

const Razorpay =
    require("razorpay");

const Booking =
    require("../models/Booking");
const RazorpayWebhookEvent = require("../models/RazorpayWebhookEvent");
const { verifyRazorpayWebhookSignature, reconcileCapturedPayment } = require("../services/razorpayWebhook");
const { reconcileRefundWebhook } = require("./refundController");
const { hasRazorpayTestCredentials } = require("../services/razorpayMode");


function getRazorpayClient() {
    if (!hasRazorpayTestCredentials()) return null;
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
}


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

        const razorpay = getRazorpayClient();
        if (!razorpay) {
            return res.status(503).json({
                success: false,
                message: "Online payments are not configured. Please try again later."
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

        let order = null;

        if (booking.paymentOrderId) {
            try {
                const previousOrder = await razorpay.orders.fetch(booking.paymentOrderId);
                if (
                    previousOrder.status === "created" &&
                    Number(previousOrder.amount) === amountInPaise &&
                    String(previousOrder.currency).toUpperCase() === "INR" &&
                    previousOrder.receipt === booking.bookingId
                ) {
                    order = previousOrder;
                }
            } catch (fetchError) {
                // A stale provider order ID should not prevent creating a replacement.
                console.warn("Existing payment order could not be reused.");
            }
        }

        if (!order) {
            order = await razorpay.orders.create({

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

            booking.paymentOrderId = order.id;
            await booking.save();
        }


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

        const razorpay = getRazorpayClient();
        if (!razorpay) {
            return res.status(503).json({
                success: false,
                message: "Online payments are not configured. Please try again later."
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

        if (booking.paymentOrderId && booking.paymentOrderId !== razorpay_order_id) {
            return res.status(400).json({
                success: false,
                message: "Payment order does not match the active booking order."
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

        if (String(order.currency).toUpperCase() !== "INR") {
            return res.status(400).json({ success: false, message: "Payment order currency is not supported." });
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

        if (String(payment.currency).toUpperCase() !== "INR") {
            return res.status(400).json({ success: false, message: "Payment currency is not supported." });
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

        if (!/^[a-f0-9]{64}$/i.test(String(razorpay_signature))) {
            return res.status(400).json({ success: false, message: "Payment signature format is invalid." });
        }


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
            payment.status !== "captured" ||
            payment.captured !== true
        ) {

            return res.status(400).json({

                success: false,

                message:
                    `Payment is not captured. Current status: ${payment.status}`

            });

        }


        /* -------------------------------------------------
           RECONCILE PAYMENT ATOMICALLY
        ------------------------------------------------- */

        // The booking can be cancelled after the earlier status check while
        // Razorpay is processing checkout. Use the same conditional update as
        // the signed webhook so a late capture is sent to refund review instead
        // of overwriting the cancellation state with a stale document save.
        const reconciliation = await reconcileCapturedPayment(Booking, payment);
        if (reconciliation.outcome !== "processed") {
            return res.status(409).json({
                success: false,
                message: "Payment was captured, but the booking changed before it could be updated. Please contact Saarthi support.",
                data: { reason: reconciliation.reason }
            });
        }

        const latestBooking = await Booking.findOne({ bookingId, userId: req.user._id })
            .select("bookingId paymentStatus paymentId refundStatus")
            .lean();


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
                    latestBooking?.paymentStatus || "paid",

                paymentId:
                    latestBooking?.paymentId || razorpay_payment_id,

                refundStatus:
                    latestBooking?.refundStatus || "none"

            }

        });


    } catch (error) {

        // Provider error objects can include request configuration or auth details;
        // keep logs limited to the message so secrets never enter application logs.
        console.error(
            "Payment verification error:",
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to verify payment."

        });

    }

}


/* =========================================================
   RAZORPAY CAPTURE WEBHOOK
========================================================= */

async function handleRazorpayWebhook(req, res) {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!hasRazorpayTestCredentials()) {
            return res.status(503).json({ success: false, message: "Only Razorpay Test Mode payments are enabled." });
        }
        if (!webhookSecret) {
            return res.status(503).json({ success: false, message: "Payment webhook is not configured." });
        }

        if (!Buffer.isBuffer(req.body)) {
            return res.status(415).json({ success: false, message: "Webhook requires an application/json request body." });
        }

        if (!verifyRazorpayWebhookSignature(req.body, req.get("X-Razorpay-Signature"), webhookSecret)) {
            return res.status(400).json({ success: false, message: "Webhook signature is invalid." });
        }

        let payload;
        try {
            payload = JSON.parse(req.body.toString("utf8"));
        } catch {
            return res.status(400).json({ success: false, message: "Webhook payload is invalid." });
        }

        const eventType = payload?.event;
        if (!["payment.captured", "refund.processed", "refund.failed"].includes(eventType)) {
            return res.status(200).json({ success: true, received: true });
        }

        const eventId = req.get("x-razorpay-event-id");
        const payment = payload?.payload?.payment?.entity;
        const refund = payload?.payload?.refund?.entity;
        const entity = eventType === "payment.captured" ? payment : refund;
        if (typeof eventId !== "string" || !eventId.trim() || eventId.length > 255 || !entity || typeof entity !== "object") {
            return res.status(400).json({ success: false, message: "Webhook event data is incomplete." });
        }

        const existingEvent = await RazorpayWebhookEvent.findOne({ eventId }).lean();
        if (existingEvent) return res.status(200).json({ success: true, received: true, duplicate: true });

        const result = eventType === "payment.captured"
            ? await reconcileCapturedPayment(Booking, payment)
            : await reconcileRefundWebhook(refund);
        try {
            await RazorpayWebhookEvent.create({
                eventId,
                eventType,
                paymentId: eventType === "payment.captured"
                    ? (typeof payment.id === "string" ? payment.id : "")
                    : (typeof refund.payment_id === "string" ? refund.payment_id : ""),
                orderId: typeof payment?.order_id === "string" ? payment.order_id : "",
                outcome: result.outcome,
                reason: result.reason
            });
        } catch (error) {
            // Concurrent duplicate deliveries can race after the idempotent booking update.
            if (error.code !== 11000) throw error;
        }

        return res.status(200).json({ success: true, received: true });
    } catch (error) {
        console.error("Razorpay webhook processing error:", error.message);
        return res.status(500).json({ success: false, message: "Unable to process payment webhook." });
    }
}


/* =========================================================
   EXPORTS
========================================================= */

module.exports = {

    createPaymentOrder,

    verifyPayment,

    handleRazorpayWebhook

};
