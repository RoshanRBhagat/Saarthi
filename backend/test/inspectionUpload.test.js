const test = require("node:test");
const assert = require("node:assert/strict");
const Booking = require("../models/Booking");

test("booking inspections support an expiring upload claim before completion", async () => {
    const leaseExpiry = new Date(Date.now() + 60_000);
    const booking = new Booking({
        bookingId: "BOOK-INSPECTION-QA",
        carId: "CAR-INSPECTION-QA",
        customerName: "Inspection QA",
        customerPhone: "7000000011",
        pickupDate: new Date("2032-04-01"),
        returnDate: new Date("2032-04-02"),
        totalDays: 2,
        dailyPrice: 100,
        totalAmount: 200,
        pickupInspection: {
            status: "uploading",
            uploadLeaseToken: "claim-token",
            uploadLeaseExpiresAt: leaseExpiry
        }
    });

    await booking.validate();
    assert.equal(booking.pickupInspection.status, "uploading");
    assert.equal(booking.pickupInspection.uploadLeaseToken, "claim-token");
    assert.equal(booking.pickupInspection.uploadLeaseExpiresAt.getTime(), leaseExpiry.getTime());
});
