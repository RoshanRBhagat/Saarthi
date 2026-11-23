const Razorpay = require("razorpay");
const crypto = require("crypto");
const Booking = require("../models/Booking");
const { releaseCarDateReservations } = require("../services/carReservationService");
const { releaseDriverDateReservations } = require("../services/driverReservationService");
const { hasRazorpayTestCredentials } = require("../services/razorpayMode");

function getRazorpayClient() {
    if (!hasRazorpayTestCredentials()) return null;
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
}

async function listRefundRequests(req, res) {
    try {
        const data = await Booking.find({
            refundStatus: { $in: ["pending_review", "processing", "failed"] }
        })
            .select("bookingId carId customerName customerEmail customerPhone pickupDate returnDate totalAmount status paymentId paymentStatus refundStatus refundReason refundRequestedAt refundAmountPaise refundedAmountPaise refundId refundAttemptStartedAt")
            .sort({ refundRequestedAt: 1 })
            .lean();
        return res.json({ success: true, data });
    } catch (error) {
        console.error("Refund queue error:", error.message);
        return res.status(500).json({ success: false, message: "Unable to load refund requests." });
    }
}

async function finishRefund(booking, refund, adminId = null) {
    if (!refund || refund.payment_id !== booking.paymentId || Number(refund.amount) !== Number(booking.refundAmountPaise)) {
        return { ok: false, message: "Refund provider details do not match the booking." };
    }

    if (refund.status === "pending") {
        await Booking.updateOne(
            { _id: booking._id, refundStatus: "processing" },
            { $set: { refundId: refund.id } }
        );
        return { ok: true, pending: true };
    }

    if (!["processed", "failed"].includes(refund.status)) {
        return { ok: false, message: "Refund provider returned an unsupported state." };
    }

    if (refund.status === "failed") {
        await Booking.updateOne(
            { _id: booking._id, refundStatus: "processing" },
            { $set: { refundId: refund.id, refundStatus: "failed" } }
        );
        return { ok: true, failed: true };
    }

    const totalPaise = Math.round(Number(booking.totalAmount) * 100);
    const newRefundedAmount = Number(booking.refundedAmountPaise || 0) + Number(refund.amount);
    if (!Number.isFinite(totalPaise) || newRefundedAmount > totalPaise) {
        return { ok: false, message: "Refund amount exceeds the booking payment." };
    }

    const fullyRefunded = newRefundedAmount >= totalPaise;
    const updated = await Booking.findOneAndUpdate(
        { _id: booking._id, refundStatus: "processing" },
        {
            $set: {
                refundId: refund.id,
                refundedAmountPaise: newRefundedAmount,
                paymentStatus: fullyRefunded ? "refunded" : "partially_refunded",
                refundStatus: fullyRefunded ? "processed" : "partially_processed",
                refundProcessedAt: new Date(),
                ...(adminId ? { refundProcessedBy: adminId } : {}),
                status: "cancelled"
            }
        },
        { returnDocument: "after" }
    );

    if (updated) {
        await releaseCarDateReservations(booking.bookingId);
        await releaseDriverDateReservations(booking.bookingId);
        return { ok: true, processed: true, booking: updated };
    }

    const latest = await Booking.findById(booking._id).lean();
    if (["processed", "partially_processed"].includes(latest?.refundStatus) && latest.refundId === refund.id) {
        await releaseCarDateReservations(booking.bookingId);
        await releaseDriverDateReservations(booking.bookingId);
        return { ok: true, processed: true, booking: latest };
    }
    return { ok: false, message: "Booking changed while the refund was being recorded." };
}

async function reviewRefundRequest(req, res) {
    try {
        const booking = await Booking.findOne({ bookingId: req.params.bookingId });
        if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });
        const requestIsReviewable = ["pending_review", "failed"].includes(booking.refundStatus);
        if (!requestIsReviewable) {
            return res.status(409).json({ success: false, message: "This refund request is no longer awaiting review." });
        }

        const { decision, amountPaise, note } = req.body || {};
        const adminNote = String(note || "").trim().slice(0, 500);

        if (decision === "reject") {
            if (booking.refundStatus !== "pending_review") {
                return res.status(409).json({ success: false, message: "A failed provider refund cannot be rejected; retry it or contact the customer." });
            }
            if (booking.status === "cancelled") {
                return res.status(409).json({
                    success: false,
                    message: "This payment was captured after cancellation; the refund request cannot be rejected. Process the refund to resolve the payment."
                });
            }
            const updated = await Booking.findOneAndUpdate(
                { _id: booking._id, refundStatus: "pending_review" },
                { $set: { refundStatus: "rejected", refundAdminNote: adminNote } },
                { returnDocument: "after" }
            );
            if (!updated) return res.status(409).json({ success: false, message: "This request was already reviewed." });
            return res.json({ success: true, message: "Refund request rejected. The booking remains active.", data: updated });
        }

        if (decision !== "refund") {
            return res.status(400).json({ success: false, message: "Choose refund or reject." });
        }
        if (booking.paymentStatus !== "paid" || !booking.paymentId) {
            return res.status(409).json({ success: false, message: "A captured payment is required before issuing a refund." });
        }

        const razorpay = getRazorpayClient();
        if (!razorpay) {
            return res.status(503).json({ success: false, message: "Online refunds are not configured." });
        }
        if (booking.refundStatus === "failed" && booking.refundId) {
            const priorRefund = await razorpay.refunds.fetch(booking.refundId);
            if (priorRefund.status !== "failed") {
                const claimedPrior = await Booking.findOneAndUpdate(
                    { _id: booking._id, refundStatus: "failed", refundId: priorRefund.id },
                    { $set: { refundStatus: "processing" } },
                    { returnDocument: "after" }
                );
                if (!claimedPrior) return res.status(409).json({ success: false, message: "This refund changed while its provider status was refreshed." });
                const reconciliation = await finishRefund(claimedPrior, priorRefund, req.user._id);
                if (reconciliation.ok) {
                    return res.status(reconciliation.pending ? 202 : 200).json({
                        success: true,
                        message: reconciliation.processed
                            ? "The earlier refund has now been confirmed and the booking cancelled."
                            : "The earlier refund is still processing; do not submit another refund yet.",
                        data: reconciliation.booking || claimedPrior,
                        pending: Boolean(reconciliation.pending)
                    });
                }
                return res.status(409).json({ success: false, message: "The earlier refund is not confirmed as failed. Refresh the request status before trying again." });
            }
        }

        const amount = Number(amountPaise);
        const totalPaise = Math.round(Number(booking.totalAmount) * 100);
        if (!Number.isSafeInteger(totalPaise) || totalPaise < 1 || !Number.isSafeInteger(amount) || amount < 1) {
            return res.status(400).json({ success: false, message: "Enter a refund amount in paise within the remaining paid amount." });
        }

        const providerPayment = await razorpay.payments.fetch(booking.paymentId);
        if (
            providerPayment.order_id !== booking.paymentOrderId ||
            String(providerPayment.currency).toUpperCase() !== "INR" ||
            Number(providerPayment.amount) !== totalPaise ||
            providerPayment.captured !== true ||
            !["captured", "refunded"].includes(providerPayment.status)
        ) {
            return res.status(409).json({ success: false, message: "Payment provider details do not match this captured INR booking." });
        }
        const providerRefundedPaise = Number(providerPayment.amount_refunded || 0);
        const alreadyRefundedPaise = Math.max(Number(booking.refundedAmountPaise || 0), providerRefundedPaise);
        const remainingPaise = totalPaise - alreadyRefundedPaise;
        if (!Number.isSafeInteger(providerRefundedPaise) || providerRefundedPaise < 0 || amount > remainingPaise) {
            return res.status(400).json({ success: false, message: "Refund amount exceeds the remaining amount recorded by the payment provider." });
        }

        const attemptStartedAt = new Date();
        const refundReceipt = `rf_${booking.bookingId.slice(-16)}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
        const claimed = await Booking.findOneAndUpdate(
            { _id: booking._id, refundStatus: { $in: ["pending_review", "failed"] }, paymentStatus: "paid", status: { $in: ["pending", "confirmed", "cancelled"] } },
            { $set: { refundStatus: "processing", refundAmountPaise: amount, refundedAmountPaise: alreadyRefundedPaise, refundAdminNote: adminNote, refundId: "", refundReceipt, refundAttemptStartedAt: attemptStartedAt } },
            { returnDocument: "after" }
        );
        if (!claimed) return res.status(409).json({ success: false, message: "This request changed while it was being reviewed." });

        try {
            const refund = await razorpay.payments.refund(claimed.paymentId, {
                amount,
                receipt: claimed.refundReceipt,
                notes: { bookingId: claimed.bookingId, adminId: String(req.user._id) }
            });
            const result = await finishRefund(claimed, refund, req.user._id);
            if (!result.ok) return res.status(502).json({ success: false, message: result.message });
            const message = result.processed
                ? "Refund processed and booking cancelled."
                : result.failed
                    ? "The payment provider could not process the refund. Review the failed request before retrying."
                    : "Refund submitted to the payment provider and is still processing.";
            return res.json({ success: true, message, data: result.booking || claimed, pending: Boolean(result.pending) });
        } catch (providerError) {
            // Leave the claim in processing after uncertain network failures to prevent a duplicate refund.
            console.error("Razorpay refund request failed:", providerError.message);
            return res.status(502).json({
                success: false,
                pendingReview: true,
                message: "Refund status is uncertain. Check the Razorpay dashboard before retrying to avoid a duplicate refund."
            });
        }
    } catch (error) {
        console.error("Refund review error:", error.message);
        return res.status(500).json({ success: false, message: "Unable to review refund request." });
    }
}

async function refreshRefundStatus(req, res) {
    try {
        const booking = await Booking.findOne({ bookingId: req.params.bookingId });
        if (!booking || booking.refundStatus !== "processing") {
            return res.status(404).json({ success: false, message: "No processing refund request was found." });
        }
        const razorpay = getRazorpayClient();
        if (!razorpay) {
            return res.status(503).json({ success: false, message: "Online refunds are not configured." });
        }
        let refund = booking.refundId
            ? await razorpay.refunds.fetch(booking.refundId)
            : null;
        if (!refund && booking.refundReceipt) {
            const providerRefunds = await razorpay.refunds.all({ payment_id: booking.paymentId, count: 100 });
            refund = providerRefunds.items?.find(item =>
                item.receipt === booking.refundReceipt &&
                Number(item.amount) === Number(booking.refundAmountPaise)
            ) || null;
        }
        if (!refund) {
            return res.status(409).json({
                success: false,
                message: "No matching refund was found yet. Check Razorpay using this booking’s refund reference before retrying."
            });
        }
        const result = await finishRefund(booking, refund, req.user._id);
        if (!result.ok) return res.status(409).json({ success: false, message: result.message });
        return res.status(result.pending ? 202 : 200).json({
            success: true,
            pending: Boolean(result.pending),
            message: result.processed
                ? "Refund processed and booking cancelled."
                : result.failed
                    ? booking.status === "cancelled"
                        ? "Provider reports that the refund failed. The booking remains cancelled; review the failed refund before retrying."
                        : "Provider reports that the refund failed. The booking remains active."
                    : "Refund is still processing.",
            data: result.booking || booking
        });
    } catch (error) {
        console.error("Refund status refresh error:", error.message);
        return res.status(502).json({ success: false, message: "Unable to refresh refund status from the payment provider." });
    }
}

async function reconcileRefundWebhook(refund) {
    if (!refund?.id || !refund?.payment_id || !Number.isSafeInteger(Number(refund.amount))) {
        return { outcome: "ignored", reason: "refund_data_incomplete" };
    }
    const booking = await Booking.findOne({
        paymentId: refund.payment_id,
        refundStatus: { $in: ["processing", "processed", "partially_processed"] },
        refundAmountPaise: Number(refund.amount)
    });
    if (!booking) return { outcome: "ignored", reason: "refund_booking_not_found" };
    if (booking.refundId && booking.refundId !== refund.id) {
        return { outcome: "ignored", reason: "refund_attempt_mismatch" };
    }
    if (booking.refundAttemptStartedAt && !Number.isFinite(Number(refund.created_at))) {
        return { outcome: "ignored", reason: "refund_timestamp_missing" };
    }
    if (booking.refundAttemptStartedAt) {
        const providerCreatedAt = Number(refund.created_at) * 1000;
        if (providerCreatedAt < booking.refundAttemptStartedAt.getTime()) {
            return { outcome: "ignored", reason: "stale_refund_attempt" };
        }
    }
    const result = await finishRefund(booking, refund);
    return result.ok
        ? { outcome: "processed", reason: refund.status === "processed" ? "refund_processed" : `refund_${refund.status}` }
        : { outcome: "ignored", reason: "refund_reconciliation_failed" };
}

module.exports = { listRefundRequests, reviewRefundRequest, refreshRefundStatus, reconcileRefundWebhook, finishRefund };
