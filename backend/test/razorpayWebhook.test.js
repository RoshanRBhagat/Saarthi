const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const {
    verifyRazorpayWebhookSignature,
    reconcileCapturedPayment
} = require("../services/razorpayWebhook");

function createBookingModel(booking) {
    return {
        async findOne(filter) {
            return filter.paymentOrderId === booking.paymentOrderId ? booking : null;
        },
        async updateOne(filter, update) {
            if (
                filter._id !== booking._id ||
                filter.paymentOrderId !== booking.paymentOrderId ||
                (filter.paymentStatus?.$in && !filter.paymentStatus.$in.includes(booking.paymentStatus)) ||
                (filter.paymentStatus && !filter.paymentStatus.$in && filter.paymentStatus !== booking.paymentStatus) ||
                (filter.status?.$in && !filter.status.$in.includes(booking.status)) ||
                (typeof filter.status === "string" && filter.status !== booking.status) ||
                (filter.refundStatus && filter.refundStatus !== booking.refundStatus)
            ) return { matchedCount: 0 };
            Object.assign(booking, update.$set);
            return { matchedCount: 1 };
        },
        findById(id) {
            return {
                select() {
                    return { lean: async () => id === booking._id ? { ...booking } : null };
                }
            };
        }
    };
}

function capturedPayment(overrides = {}) {
    return {
        id: "pay_test_123",
        order_id: "order_test_123",
        amount: 250000,
        currency: "INR",
        status: "captured",
        captured: true,
        ...overrides
    };
}

test("Razorpay webhook HMAC uses the original raw request bytes", () => {
    const secret = "test-webhook-secret";
    const rawBody = Buffer.from('{"event":"payment.captured"}');
    const signature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

    assert.equal(verifyRazorpayWebhookSignature(rawBody, signature, secret), true);
    assert.equal(verifyRazorpayWebhookSignature(Buffer.from('{"event":"payment.failed"}'), signature, secret), false);
    assert.equal(verifyRazorpayWebhookSignature(rawBody, "not-a-signature", secret), false);
    assert.equal(verifyRazorpayWebhookSignature(rawBody, signature, ""), false);
});

test("captured payment after cancellation is recorded and queued for administrator refund review", async () => {
    const booking = {
        _id: "booking-cancelled",
        bookingId: "BOOK-CANCELLED-LATE-PAYMENT",
        userId: "customer-123",
        paymentOrderId: "order_test_123",
        totalAmount: 2500,
        status: "cancelled",
        paymentStatus: "pending",
        paymentId: "",
        refundStatus: "none"
    };
    const Booking = createBookingModel(booking);

    assert.deepEqual(await reconcileCapturedPayment(Booking, capturedPayment()), {
        outcome: "processed",
        reason: "late_capture_refund_queued"
    });
    assert.equal(booking.status, "cancelled");
    assert.equal(booking.paymentStatus, "paid");
    assert.equal(booking.paymentId, "pay_test_123");
    assert.equal(booking.refundStatus, "pending_review");
    assert.equal(booking.refundRequestedBy, "customer-123");
    assert.match(booking.refundReason, /captured after the booking was cancelled/i);

    assert.deepEqual(await reconcileCapturedPayment(Booking, capturedPayment()), {
        outcome: "processed",
        reason: "late_capture_already_recorded"
    });
});

test("captured webhook marks only the matching INR booking paid and is idempotent", async () => {
    const booking = {
        _id: "booking-1", paymentOrderId: "order_test_123", totalAmount: 2500,
        status: "confirmed",
        paymentStatus: "pending", paymentId: ""
    };
    const Booking = createBookingModel(booking);

    assert.deepEqual(await reconcileCapturedPayment(Booking, capturedPayment()), {
        outcome: "processed", reason: "captured_payment_recorded"
    });
    assert.equal(booking.paymentStatus, "paid");
    assert.equal(booking.paymentId, "pay_test_123");
    assert.ok(booking.paidAt instanceof Date);
    assert.deepEqual(await reconcileCapturedPayment(Booking, capturedPayment()), {
        outcome: "processed", reason: "already_recorded"
    });
});

test("captured webhook rejects mismatched amount, currency, order, and payment state", async () => {
    const booking = {
        _id: "booking-1", paymentOrderId: "order_test_123", totalAmount: 2500,
        status: "confirmed",
        paymentStatus: "pending", paymentId: ""
    };
    const Booking = createBookingModel(booking);

    assert.equal((await reconcileCapturedPayment(Booking, capturedPayment({ amount: 249999 }))).reason, "amount_mismatch");
    assert.equal((await reconcileCapturedPayment(Booking, capturedPayment({ currency: "USD" }))).reason, "currency_mismatch");
    assert.equal((await reconcileCapturedPayment(Booking, capturedPayment({ order_id: "order_other" }))).reason, "booking_not_found");
    assert.equal((await reconcileCapturedPayment(Booking, capturedPayment({ status: "authorized", captured: false }))).reason, "payment_not_captured");
    assert.equal(booking.paymentStatus, "pending");

    booking.paymentStatus = "refunded";
    assert.equal((await reconcileCapturedPayment(Booking, capturedPayment())).reason, "booking_already_refunded");
    assert.equal(booking.paymentStatus, "refunded");
});
