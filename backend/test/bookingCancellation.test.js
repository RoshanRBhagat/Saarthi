const test = require("node:test");
const assert = require("node:assert/strict");
const { queueCancellationRefund } = require("../services/bookingCancellation");

test("paid cancellation becomes an administrator refund request while the booking stays active", () => {
    const booking = { status: "confirmed", paymentStatus: "paid", refundStatus: "none" };
    const result = queueCancellationRefund(booking, "admin-user-id", "Customer changed plans");
    assert.deepEqual(result, { queued: true });
    assert.equal(booking.status, "confirmed");
    assert.equal(booking.refundStatus, "pending_review");
    assert.equal(booking.refundRequestedBy, "admin-user-id");
    assert.equal(booking.refundReason, "Customer changed plans");
    assert.ok(booking.refundRequestedAt instanceof Date);
});

test("duplicate and failed paid cancellation requests cannot silently create a second refund attempt", () => {
    for (const refundStatus of ["pending_review", "processing", "failed"]) {
        const booking = { status: "confirmed", paymentStatus: "paid", refundStatus };
        const result = queueCancellationRefund(booking, "user-id");
        assert.equal(result.queued, false);
        assert.equal(booking.refundStatus, refundStatus);
    }
});

test("unpaid or ineligible bookings cannot open refund requests", () => {
    assert.equal(queueCancellationRefund({ status: "confirmed", paymentStatus: "pending" }, "user").queued, false);
    assert.equal(queueCancellationRefund({ status: "completed", paymentStatus: "paid" }, "user").queued, false);
});
