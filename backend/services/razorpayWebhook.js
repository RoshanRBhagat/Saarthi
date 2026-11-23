const crypto = require("crypto");

function verifyRazorpayWebhookSignature(rawBody, signature, secret) {
    if (!Buffer.isBuffer(rawBody) || !secret || typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature)) {
        return false;
    }

    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest();
    const received = Buffer.from(signature, "hex");
    return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

async function reconcileCapturedPayment(Booking, payment) {
    const paymentId = typeof payment?.id === "string" ? payment.id : "";
    const orderId = typeof payment?.order_id === "string" ? payment.order_id : "";

    if (!paymentId || !orderId || payment.status !== "captured" || payment.captured !== true) {
        return { outcome: "ignored", reason: "payment_not_captured" };
    }

    const booking = await Booking.findOne({ paymentOrderId: orderId });
    if (!booking) return { outcome: "ignored", reason: "booking_not_found" };

    const expectedAmount = Math.round(Number(booking.totalAmount) * 100);
    if (!Number.isFinite(expectedAmount) || expectedAmount <= 0 || Number(payment.amount) !== expectedAmount) {
        return { outcome: "ignored", reason: "amount_mismatch" };
    }
    if (String(payment.currency).toUpperCase() !== "INR") {
        return { outcome: "ignored", reason: "currency_mismatch" };
    }

    if (booking.status === "cancelled") {
        const now = new Date();
        const latePaymentFields = {
            paymentStatus: "paid",
            paymentId,
            paidAt: now,
            refundStatus: "pending_review",
            refundReason: "Payment was captured after the booking was cancelled. Review this payment for refund.",
            refundRequestedAt: now,
            refundRequestedBy: booking.userId || null
        };

        if (booking.paymentStatus === "paid" && booking.paymentId === paymentId) {
            if (booking.refundStatus === "none") {
                const queued = await Booking.updateOne(
                    { _id: booking._id, status: "cancelled", paymentStatus: "paid", paymentId, refundStatus: "none" },
                    { $set: { refundStatus: "pending_review", refundReason: latePaymentFields.refundReason, refundRequestedAt: now, refundRequestedBy: booking.userId || null } }
                );
                if (queued.matchedCount > 0) return { outcome: "processed", reason: "late_capture_refund_queued" };
            }
            return { outcome: "processed", reason: "late_capture_already_recorded" };
        }

        if (!["pending", "failed"].includes(booking.paymentStatus)) {
            return { outcome: "ignored", reason: "cancelled_booking_payment_state_changed" };
        }

        const latePayment = await Booking.updateOne(
            { _id: booking._id, paymentOrderId: orderId, status: "cancelled", paymentStatus: { $in: ["pending", "failed"] }, refundStatus: "none" },
            { $set: latePaymentFields }
        );
        if (latePayment.matchedCount > 0) {
            return { outcome: "processed", reason: "late_capture_refund_queued" };
        }

        const latest = await Booking.findById(booking._id)
            .select("status paymentStatus paymentId refundStatus")
            .lean();
        if (latest?.status === "cancelled" && latest.paymentStatus === "paid" && latest.paymentId === paymentId) {
            return { outcome: "processed", reason: "late_capture_already_recorded" };
        }
        return { outcome: "ignored", reason: "cancelled_booking_payment_state_changed" };
    }

    if (!["pending", "confirmed"].includes(booking.status)) {
        return { outcome: "ignored", reason: "booking_not_payable" };
    }

    if (booking.paymentStatus === "refunded") {
        return { outcome: "ignored", reason: "booking_already_refunded" };
    }
    if (booking.paymentStatus === "paid") {
        return booking.paymentId === paymentId
            ? { outcome: "processed", reason: "already_recorded" }
            : { outcome: "ignored", reason: "different_payment_already_recorded" };
    }

    const update = await Booking.updateOne(
        {
            _id: booking._id,
            paymentOrderId: orderId,
            status: { $in: ["pending", "confirmed"] },
            paymentStatus: { $in: ["pending", "failed"] }
        },
        {
            $set: {
                paymentStatus: "paid",
                paymentId,
                paidAt: new Date()
            }
        }
    );

    if (update.matchedCount > 0) return { outcome: "processed", reason: "captured_payment_recorded" };

    // The checkout verification route may have recorded this same payment concurrently.
    const latest = await Booking.findById(booking._id)
        .select("status paymentStatus paymentId refundStatus userId")
        .lean();
    if (latest?.paymentStatus === "paid" && latest.paymentId === paymentId) {
        if (latest.status === "cancelled" && latest.refundStatus === "none") {
            const queued = await Booking.updateOne(
                { _id: booking._id, status: "cancelled", paymentStatus: "paid", paymentId, refundStatus: "none" },
                {
                    $set: {
                        refundStatus: "pending_review",
                        refundReason: "Payment was captured after the booking was cancelled. Review this payment for refund.",
                        refundRequestedAt: new Date(),
                        refundRequestedBy: latest.userId || null
                    }
                }
            );
            if (queued.matchedCount > 0) return { outcome: "processed", reason: "late_capture_refund_queued" };
        }
        return { outcome: "processed", reason: "already_recorded" };
    }

    if (latest?.status === "cancelled" && ["pending", "failed"].includes(latest.paymentStatus)) {
        return reconcileCapturedPayment(Booking, payment);
    }

    return { outcome: "ignored", reason: "booking_payment_state_changed" };
}

module.exports = { verifyRazorpayWebhookSignature, reconcileCapturedPayment };
