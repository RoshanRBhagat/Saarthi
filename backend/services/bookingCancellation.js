function queueCancellationRefund(booking, userId, reason = "") {
    if (booking.paymentStatus !== "paid") {
        return { queued: false, message: "A refund request can only be opened for a paid booking." };
    }

    if (!["pending", "confirmed"].includes(booking.status)) {
        return { queued: false, message: "This booking can no longer be cancelled." };
    }
    if (booking.pickupStatus === "confirmed" || booking.returnStatus === "confirmed") {
        return { queued: false, message: "A paid booking cannot be cancelled after vehicle pickup has been confirmed." };
    }

    if (["pending_review", "processing"].includes(booking.refundStatus)) {
        return { queued: false, message: "A cancellation refund request is already being reviewed." };
    }
    if (booking.refundStatus === "failed") {
        return { queued: false, message: "A refund attempt failed; an administrator must resolve it before another cancellation request." };
    }

    booking.refundStatus = "pending_review";
    booking.refundReason = String(reason).trim().slice(0, 500);
    booking.refundRequestedAt = new Date();
    booking.refundRequestedBy = userId;
    booking.refundAdminNote = "";
    booking.refundId = "";

    return { queued: true };
}

module.exports = { queueCancellationRefund };
