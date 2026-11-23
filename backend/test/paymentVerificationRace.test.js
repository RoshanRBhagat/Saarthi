const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const Booking = require("../models/Booking");
const Razorpay = require("razorpay");
const { verifyPayment } = require("../controllers/paymentController");

test("checkout verification queues refund review when cancellation wins a payment race", async () => {
    const original = {
        findOne: Booking.findOne,
        updateOne: Booking.updateOne,
        addResources: Razorpay.prototype.addResources,
        keyId: process.env.RAZORPAY_KEY_ID,
        keySecret: process.env.RAZORPAY_KEY_SECRET
    };
    const orderId = "order-race-test";
    const paymentId = "pay-race-test";
    const userId = "customer-race-test";
    const booking = {
        _id: "booking-race-test",
        bookingId: "BOOK-RACE-TEST",
        userId,
        paymentOrderId: orderId,
        totalAmount: 2500,
        status: "cancelled",
        paymentStatus: "pending",
        paymentId: "",
        refundStatus: "none"
    };
    let initialRead = false;
    process.env.RAZORPAY_KEY_ID = "rzp_test_key";
    process.env.RAZORPAY_KEY_SECRET = "test-secret";
    Razorpay.prototype.addResources = function () {
        this.orders = { fetch: async id => ({ id, receipt: booking.bookingId, amount: 250000, currency: "INR" }) };
        this.payments = {
            fetch: async id => ({ id, order_id: orderId, amount: 250000, currency: "INR", status: "captured", captured: true })
        };
    };
    Booking.findOne = filter => {
        if (filter.bookingId && filter.userId) {
            if (!initialRead) {
                initialRead = true;
                return Promise.resolve({ ...booking, status: "confirmed", paymentStatus: "pending" });
            }
            return { select: () => ({ lean: async () => ({ ...booking }) }) };
        }
        if (filter.paymentOrderId) return Promise.resolve(booking);
        throw new Error("Unexpected booking query in payment verification test.");
    };
    Booking.updateOne = async (filter, update) => {
        if (
            !initialRead || filter._id !== booking._id ||
            filter.paymentOrderId !== orderId || booking.status !== "cancelled" ||
            (filter.status?.$in && !filter.status.$in.includes(booking.status)) ||
            (typeof filter.status === "string" && filter.status !== booking.status) ||
            !filter.paymentStatus.$in.includes(booking.paymentStatus)
        ) return { matchedCount: 0 };
        Object.assign(booking, update.$set);
        return { matchedCount: 1 };
    };

    try {
        const signature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${orderId}|${paymentId}`).digest("hex");
        const response = {
            statusCode: 200,
            body: null,
            status(code) { this.statusCode = code; return this; },
            json(body) { this.body = body; return this; }
        };
        await verifyPayment({
            user: { _id: userId },
            body: {
                bookingId: booking.bookingId,
                razorpay_payment_id: paymentId,
                razorpay_order_id: orderId,
                razorpay_signature: signature
            }
        }, response);

        assert.equal(response.statusCode, 200);
        assert.equal(response.body.success, true);
        assert.equal(response.body.data.refundStatus, "pending_review");
        assert.equal(booking.status, "cancelled");
        assert.equal(booking.paymentStatus, "paid");
        assert.equal(booking.paymentId, paymentId);
        assert.equal(booking.refundStatus, "pending_review");
    } finally {
        Booking.findOne = original.findOne;
        Booking.updateOne = original.updateOne;
        Razorpay.prototype.addResources = original.addResources;
        if (original.keyId === undefined) delete process.env.RAZORPAY_KEY_ID;
        else process.env.RAZORPAY_KEY_ID = original.keyId;
        if (original.keySecret === undefined) delete process.env.RAZORPAY_KEY_SECRET;
        else process.env.RAZORPAY_KEY_SECRET = original.keySecret;
    }
});
