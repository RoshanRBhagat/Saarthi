const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
process.env.RAZORPAY_KEY_ID ||= "rzp_test_unit";
process.env.RAZORPAY_KEY_SECRET ||= "unit-test-secret";
process.env.RAZORPAY_WEBHOOK_SECRET = "refund-webhook-test-secret";

const Booking = require("../models/Booking");
const CarReservation = require("../models/CarReservation");
const DriverReservation = require("../models/DriverReservation");
const RazorpayWebhookEvent = require("../models/RazorpayWebhookEvent");
const { handleRazorpayWebhook } = require("../controllers/paymentController");

function makeResponse() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
}

test("signed refund.processed webhook cancels the booking and releases its reserved dates idempotently", async () => {
    const originals = {
        findOne: Booking.findOne,
        findOneAndUpdate: Booking.findOneAndUpdate,
        deleteMany: CarReservation.deleteMany,
        deleteDriverReservations: DriverReservation.deleteMany,
        eventFindOne: RazorpayWebhookEvent.findOne,
        eventCreate: RazorpayWebhookEvent.create
    };
    const booking = {
        _id: "booking-db-id",
        bookingId: "BOOK-REFUND-TEST",
        paymentId: "pay_refund_test",
        totalAmount: 250,
        paymentStatus: "paid",
        status: "confirmed",
        refundStatus: "processing",
        refundAmountPaise: 25000,
        refundedAmountPaise: 0,
        refundId: "rfnd_refund_test",
        refundAttemptStartedAt: new Date("2035-04-12T12:00:00Z")
    };
    const storedEvents = new Set();
    let released = false;
    let driverDatesReleased = false;
    let eventCreates = 0;
    Booking.findOne = async () => booking;
    Booking.findOneAndUpdate = async (filter, update) => {
        if (filter.refundStatus !== "processing") return null;
        Object.assign(booking, update.$set);
        return booking;
    };
    CarReservation.deleteMany = async () => { released = true; return { deletedCount: 3 }; };
    DriverReservation.deleteMany = async () => { driverDatesReleased = true; return { deletedCount: 3 }; };
    RazorpayWebhookEvent.findOne = filter => ({ lean: async () => storedEvents.has(filter.eventId) ? { eventId: filter.eventId } : null });
    RazorpayWebhookEvent.create = async event => {
        eventCreates += 1;
        storedEvents.add(event.eventId);
        return event;
    };

    const rawBody = Buffer.from(JSON.stringify({
        event: "refund.processed",
        payload: { refund: { entity: {
            id: "rfnd_refund_test",
            payment_id: "pay_refund_test",
            amount: 25000,
            status: "processed",
            created_at: Math.floor(new Date("2035-04-12T13:00:00Z").getTime() / 1000)
        } } }
    }));
    const signature = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
    const req = {
        body: rawBody,
        get(name) {
            if (name.toLowerCase() === "x-razorpay-signature") return signature;
            if (name.toLowerCase() === "x-razorpay-event-id") return "evt_refund_test";
            return undefined;
        }
    };

    try {
        const firstResponse = makeResponse();
        await handleRazorpayWebhook(req, firstResponse);
        assert.equal(firstResponse.statusCode, 200);
        assert.equal(booking.status, "cancelled");
        assert.equal(booking.paymentStatus, "refunded");
        assert.equal(booking.refundStatus, "processed");
        assert.equal(booking.refundedAmountPaise, 25000);
        assert.equal(released, true);
        assert.equal(driverDatesReleased, true);

        const duplicateResponse = makeResponse();
        await handleRazorpayWebhook(req, duplicateResponse);
        assert.equal(duplicateResponse.statusCode, 200);
        assert.equal(duplicateResponse.body.duplicate, true);
        assert.equal(eventCreates, 1);
    } finally {
        Booking.findOne = originals.findOne;
        Booking.findOneAndUpdate = originals.findOneAndUpdate;
        CarReservation.deleteMany = originals.deleteMany;
        DriverReservation.deleteMany = originals.deleteDriverReservations;
        RazorpayWebhookEvent.findOne = originals.eventFindOne;
        RazorpayWebhookEvent.create = originals.eventCreate;
    }
});
