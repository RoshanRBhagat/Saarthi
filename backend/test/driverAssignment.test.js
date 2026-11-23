const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Driver = require("../models/Driver");
const Booking = require("../models/Booking");
const Car = require("../models/Car");
const DriverReservation = require("../models/DriverReservation");
const { assign } = require("../controllers/driverController");

async function withAssignmentMocks({ insertMany }) {
    const originals = {
        carFind: Car.find,
        bookingFindOne: Booking.findOne,
        bookingFindOneAndUpdate: Booking.findOneAndUpdate,
        driverFindOne: Driver.findOne,
        reservationInsertMany: DriverReservation.insertMany,
        reservationUpdateMany: DriverReservation.updateMany,
        reservationDeleteMany: DriverReservation.deleteMany
    };
    const booking = {
        _id: new mongoose.Types.ObjectId(),
        bookingId: "BOOK-ASSIGN-QA",
        carId: "CAR-ASSIGN-QA",
        driverId: null,
        driverRequired: true,
        status: "confirmed",
        paymentStatus: "paid",
        pickupStatus: "pending",
        refundStatus: "",
        pickupDate: new Date("2031-07-01T00:00:00.000Z"),
        returnDate: new Date("2031-07-03T00:00:00.000Z")
    };
    const driver = {
        _id: new mongoose.Types.ObjectId(),
        status: "active",
        licenseExpiry: new Date("2032-01-01T00:00:00.000Z")
    };
    const observed = { inserted: null, updateFilter: null, update: null, activated: null, deleted: null };
    let insertCalls = 0;

    Car.find = () => ({ select: async () => [{ carId: booking.carId }] });
    Booking.findOne = async filter => filter.bookingId ? booking : null;
    Booking.findOneAndUpdate = async (filter, update) => {
        observed.updateFilter = filter;
        observed.update = update;
        booking.driverId = update.$set.driverId;
        return booking;
    };
    Driver.findOne = async () => driver;
    DriverReservation.insertMany = async (rows, options) => {
        insertCalls += 1;
        observed.inserted = { rows, options };
        return insertMany ? insertMany(rows, options) : rows;
    };
    DriverReservation.updateMany = async (filter, update) => { observed.activated = { filter, update }; };
    DriverReservation.deleteMany = async filter => { observed.deleted = filter; };

    try {
        let statusCode = 200;
        let responseBody;
        await assign({
            user: { _id: "host-1" },
            params: { bookingId: booking.bookingId },
            body: { driverId: String(driver._id) }
        }, {
            status(code) { statusCode = code; return this; },
            json(body) { responseBody = body; return this; }
        });
        return { statusCode, responseBody, observed, insertCalls, booking, driver };
    } finally {
        Car.find = originals.carFind;
        Booking.findOne = originals.bookingFindOne;
        Booking.findOneAndUpdate = originals.bookingFindOneAndUpdate;
        Driver.findOne = originals.driverFindOne;
        DriverReservation.insertMany = originals.reservationInsertMany;
        DriverReservation.updateMany = originals.reservationUpdateMany;
        DriverReservation.deleteMany = originals.reservationDeleteMany;
    }
}

test("host driver assignment reserves dates before atomically setting the booking driver", async () => {
    const result = await withAssignmentMocks({});
    assert.equal(result.statusCode, 200);
    assert.equal(result.responseBody.success, true);
    assert.equal(String(result.booking.driverId), String(result.driver._id));
    assert.equal(result.observed.inserted.rows.length, 3);
    assert.deepEqual(result.observed.updateFilter.driverId, null);
    assert.equal(result.observed.updateFilter.paymentStatus, "paid");
    assert.equal(result.observed.update.$set.driverId, result.driver._id);
    assert.equal(result.observed.activated.filter.state, "creating");
});

test("host driver assignment returns a conflict when the atomic date claim collides", async () => {
    const result = await withAssignmentMocks({
        insertMany: async () => {
            const error = new Error("overlapping driver reservation");
            error.code = 11000;
            throw error;
        }
    });
    assert.equal(result.statusCode, 409);
    assert.equal(result.responseBody.success, false);
    assert.match(result.responseBody.message, /overlapping booking/i);
    assert.equal(result.observed.updateFilter, null);
    assert.equal(result.observed.deleted.bookingId, "BOOK-ASSIGN-QA");
    assert.equal(result.observed.deleted.driverId, result.driver._id);
    assert.equal(result.observed.deleted.claimId, result.observed.inserted.rows[0].claimId);
    assert.equal(result.observed.deleted.state, "creating");
});
