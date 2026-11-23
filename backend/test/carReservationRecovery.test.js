const test = require("node:test");
const assert = require("node:assert/strict");

const CarReservation = require("../models/CarReservation");
const Booking = require("../models/Booking");
const { reconcileCarDateReservations } = require("../services/carReservationService");

test("reservation recovery activates saved bookings and releases terminal ones", async () => {
    const originals = {
        distinct: CarReservation.distinct,
        updateMany: CarReservation.updateMany,
        deleteMany: CarReservation.deleteMany,
        find: Booking.find
    };
    let bookingQuery;
    const updates = [];
    const deletions = [];

    CarReservation.distinct = async (field, filter) => {
        assert.equal(field, "bookingId");
        assert.deepEqual(filter, { state: "creating" });
        return ["BOOK-PENDING", "BOOK-CANCELLED", "BOOK-ORPHAN"];
    };
    Booking.find = query => {
        bookingQuery = query;
        return {
            select() { return this; },
            lean: async () => [
                { bookingId: "BOOK-PENDING", status: "pending" },
                { bookingId: "BOOK-CANCELLED", status: "cancelled" }
            ]
        };
    };
    CarReservation.updateMany = async (...args) => { updates.push(args); };
    CarReservation.deleteMany = async (...args) => { deletions.push(args); };

    try {
        const result = await reconcileCarDateReservations();
        assert.deepEqual(bookingQuery, { bookingId: { $in: ["BOOK-PENDING", "BOOK-CANCELLED", "BOOK-ORPHAN"] } });
        assert.deepEqual(result, { activated: 1, released: 1 });
        assert.deepEqual(updates[0], [
            { bookingId: { $in: ["BOOK-PENDING"] }, state: "creating" },
            { $set: { state: "active" }, $unset: { expiresAt: 1 } }
        ]);
        assert.deepEqual(deletions, [[{ bookingId: { $in: ["BOOK-CANCELLED"] } }]]);
    } finally {
        CarReservation.distinct = originals.distinct;
        CarReservation.updateMany = originals.updateMany;
        CarReservation.deleteMany = originals.deleteMany;
        Booking.find = originals.find;
    }
});
