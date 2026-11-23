const test = require("node:test");
const assert = require("node:assert/strict");
process.env.RAZORPAY_KEY_ID ||= "rzp_test_unit";
process.env.RAZORPAY_KEY_SECRET ||= "unit-test-secret";
const Razorpay = require("razorpay");
const Booking = require("../models/Booking");
const CarReservation = require("../models/CarReservation");
const DriverReservation = require("../models/DriverReservation");
const { finishRefund, reconcileRefundWebhook, reviewRefundRequest } = require("../controllers/refundController");

function makeResponse() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
}

function mockRazorpay(handlers, callback) {
    const originalAddResources = Razorpay.prototype.addResources;
    Razorpay.prototype.addResources = function addMockResources() {
        this.payments = handlers.payments;
        this.refunds = handlers.refunds || {};
    };
    return Promise.resolve().then(callback).finally(() => {
        Razorpay.prototype.addResources = originalAddResources;
    });
}

test("pending provider refund stays in processing and records its provider ID", async () => {
    const originalUpdateOne = Booking.updateOne;
    let update;
    Booking.updateOne = async (filter, value) => {
        update = { filter, value };
        return { matchedCount: 1 };
    };
    try {
        const booking = { _id: "booking-db-id", paymentId: "pay_123", refundAmountPaise: 25000, refundStatus: "processing" };
        const result = await finishRefund(booking, {
            id: "rfnd_123", payment_id: "pay_123", amount: 25000, status: "pending"
        });
        assert.deepEqual(result, { ok: true, pending: true });
        assert.equal(update.filter.refundStatus, "processing");
        assert.equal(update.value.$set.refundId, "rfnd_123");
    } finally {
        Booking.updateOne = originalUpdateOne;
    }
});

test("refund provider results must match the booking payment and requested amount", async () => {
    const booking = { _id: "booking-db-id", paymentId: "pay_123", refundAmountPaise: 25000, refundStatus: "processing" };
    const result = await finishRefund(booking, {
        id: "rfnd_wrong", payment_id: "pay_other", amount: 25000, status: "processed"
    });
    assert.equal(result.ok, false);
    assert.match(result.message, /do not match/);
});

test("successful partial refund cancels the booking and records the remaining paid balance", async () => {
    const originalFindOneAndUpdate = Booking.findOneAndUpdate;
    const originalDeleteMany = CarReservation.deleteMany;
    const originalDeleteDriverReservations = DriverReservation.deleteMany;
    const booking = {
        _id: "booking-db-id",
        bookingId: "BOOK-PARTIAL-TEST",
        paymentId: "pay_123",
        totalAmount: 300,
        paymentStatus: "paid",
        status: "confirmed",
        refundStatus: "processing",
        refundAmountPaise: 10000,
        refundedAmountPaise: 0
    };
    Booking.findOneAndUpdate = async (_filter, update) => {
        Object.assign(booking, update.$set);
        return booking;
    };
    CarReservation.deleteMany = async () => ({ deletedCount: 3 });
    DriverReservation.deleteMany = async () => ({ deletedCount: 3 });
    try {
        const result = await finishRefund(booking, {
            id: "rfnd_partial", payment_id: "pay_123", amount: 10000, status: "processed"
        }, "admin-id");
        assert.equal(result.processed, true);
        assert.equal(booking.status, "cancelled");
        assert.equal(booking.paymentStatus, "partially_refunded");
        assert.equal(booking.refundStatus, "partially_processed");
        assert.equal(booking.refundedAmountPaise, 10000);
        assert.equal(booking.refundProcessedBy, "admin-id");
    } finally {
        Booking.findOneAndUpdate = originalFindOneAndUpdate;
        CarReservation.deleteMany = originalDeleteMany;
        DriverReservation.deleteMany = originalDeleteDriverReservations;
    }
});

test("refund cannot exceed the original booking amount", async () => {
    const originalFindOneAndUpdate = Booking.findOneAndUpdate;
    let changed = false;
    Booking.findOneAndUpdate = async () => { changed = true; return null; };
    try {
        const result = await finishRefund({
            _id: "booking-db-id", bookingId: "BOOK-OVER-REFUND", paymentId: "pay_123",
            totalAmount: 100, refundedAmountPaise: 0, refundAmountPaise: 12000, refundStatus: "processing"
        }, { id: "rfnd_over", payment_id: "pay_123", amount: 12000, status: "processed" });
        assert.equal(result.ok, false);
        assert.match(result.message, /exceeds the booking payment/);
        assert.equal(changed, false);
    } finally {
        Booking.findOneAndUpdate = originalFindOneAndUpdate;
    }
});

test("refund webhook ignores events from an earlier attempt", async () => {
    const originalFindOne = Booking.findOne;
    const originalUpdateOne = Booking.updateOne;
    const attemptStartedAt = new Date("2035-04-12T12:00:00.000Z");
    let wroteUpdate = false;
    Booking.findOne = async () => ({
        _id: "booking-db-id",
        bookingId: "BOOK123",
        paymentId: "pay_123",
        refundAmountPaise: 25000,
        refundStatus: "processing",
        refundId: "",
        refundAttemptStartedAt: attemptStartedAt
    });
    Booking.updateOne = async () => {
        wroteUpdate = true;
        return { matchedCount: 1 };
    };
    try {
        const result = await reconcileRefundWebhook({
            id: "rfnd_old",
            payment_id: "pay_123",
            amount: 25000,
            status: "failed",
            created_at: Math.floor(new Date("2035-04-12T11:00:00.000Z").getTime() / 1000)
        });
        assert.deepEqual(result, { outcome: "ignored", reason: "stale_refund_attempt" });
        assert.equal(wroteUpdate, false);
    } finally {
        Booking.findOne = originalFindOne;
        Booking.updateOne = originalUpdateOne;
    }
});

test("admin refund review validates the captured payment then submits the exact approved paise amount", async () => {
    const originals = {
        findOne: Booking.findOne,
        findOneAndUpdate: Booking.findOneAndUpdate,
        updateOne: Booking.updateOne
    };
    const booking = {
        _id: "booking-db-id", bookingId: "BOOK-ADMIN-REFUND", paymentId: "pay_123",
        paymentOrderId: "order_123", paymentStatus: "paid", status: "confirmed",
        refundStatus: "pending_review", totalAmount: 2500, refundedAmountPaise: 0,
        refundAmountPaise: 0, refundId: "", refundReceipt: ""
    };
    let providerRefundInput;
    let paymentFetched = false;
    Booking.findOne = async () => booking;
    Booking.findOneAndUpdate = async (_filter, update) => {
        Object.assign(booking, update.$set);
        return booking;
    };
    Booking.updateOne = async (_filter, update) => {
        Object.assign(booking, update.$set);
        return { matchedCount: 1 };
    };

    try {
        await mockRazorpay({
            payments: {
                async fetch(paymentId) {
                    paymentFetched = paymentId === "pay_123";
                    return {
                        id: paymentId, order_id: "order_123", amount: 250000,
                        amount_refunded: 0, currency: "INR", status: "captured", captured: true
                    };
                },
                async refund(paymentId, input) {
                    providerRefundInput = { paymentId, input };
                    return {
                        id: "rfnd_admin_test", payment_id: paymentId,
                        amount: input.amount, status: "pending"
                    };
                }
            }
        }, async () => {
            const res = makeResponse();
            await reviewRefundRequest({
                params: { bookingId: booking.bookingId },
                body: { decision: "refund", amountPaise: 125000, note: "Approved partial refund" },
                user: { _id: "admin-user-id" }
            }, res);
            assert.equal(res.statusCode, 200);
            assert.equal(res.body.success, true);
            assert.equal(res.body.pending, true);
        });

        assert.equal(paymentFetched, true);
        assert.equal(providerRefundInput.paymentId, "pay_123");
        assert.equal(providerRefundInput.input.amount, 125000);
        assert.equal(providerRefundInput.input.notes.bookingId, "BOOK-ADMIN-REFUND");
        assert.ok(providerRefundInput.input.receipt.length <= 40);
        assert.equal(booking.refundStatus, "processing");
        assert.equal(booking.refundId, "rfnd_admin_test");
    } finally {
        Booking.findOne = originals.findOne;
        Booking.findOneAndUpdate = originals.findOneAndUpdate;
        Booking.updateOne = originals.updateOne;
    }
});

test("admin refund review rejects amounts above the provider-reported remainder without submitting a refund", async () => {
    const originals = { findOne: Booking.findOne, findOneAndUpdate: Booking.findOneAndUpdate };
    const booking = {
        _id: "booking-db-id", bookingId: "BOOK-ADMIN-REFUND", paymentId: "pay_123",
        paymentOrderId: "order_123", paymentStatus: "paid", status: "confirmed",
        refundStatus: "pending_review", totalAmount: 2500, refundedAmountPaise: 0
    };
    let refundSubmitted = false;
    Booking.findOne = async () => booking;
    Booking.findOneAndUpdate = async () => { throw new Error("A rejected amount must not claim the request."); };
    try {
        await mockRazorpay({
            payments: {
                async fetch() {
                    return {
                        order_id: "order_123", amount: 250000,
                        amount_refunded: 200000, currency: "INR", status: "captured", captured: true
                    };
                },
                async refund() { refundSubmitted = true; }
            }
        }, async () => {
            const res = makeResponse();
            await reviewRefundRequest({
                params: { bookingId: booking.bookingId },
                body: { decision: "refund", amountPaise: 60000 },
                user: { _id: "admin-user-id" }
            }, res);
            assert.equal(res.statusCode, 400);
            assert.match(res.body.message, /exceeds the remaining amount/);
        });
        assert.equal(refundSubmitted, false);
    } finally {
        Booking.findOne = originals.findOne;
        Booking.findOneAndUpdate = originals.findOneAndUpdate;
    }
});
