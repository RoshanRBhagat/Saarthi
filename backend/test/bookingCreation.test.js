const test = require("node:test");
const assert = require("node:assert/strict");

const Booking = require("../models/Booking");
const Car = require("../models/Car");
const carReservations = require("../services/carReservationService");

const originals = {
    bookingFindOne: Booking.findOne,
    bookingCreate: Booking.create,
    carFindOne: Car.findOne,
    createReservation: carReservations.createCarDateReservations,
    activateReservation: carReservations.activateCarDateReservations
};

const car = { carId: "CAR-BOOKING-QA", dailyPrice: 1200 };
let createdBooking;
let reservationCalls;
let activationCalls;

Booking.findOne = async () => null;
Booking.create = async booking => {
    createdBooking = booking;
    return booking;
};
Car.findOne = async filter => {
    assert.deepEqual(filter, { carId: car.carId, status: "available" });
    return car;
};
carReservations.createCarDateReservations = async details => {
    reservationCalls.push(details);
    return { ok: true, claimId: "test-claim" };
};
carReservations.activateCarDateReservations = async bookingId => {
    activationCalls.push(bookingId);
};

const { createBooking } = require("../controllers/bookingController");

test.after(() => {
    Booking.findOne = originals.bookingFindOne;
    Booking.create = originals.bookingCreate;
    Car.findOne = originals.carFindOne;
    carReservations.createCarDateReservations = originals.createReservation;
    carReservations.activateCarDateReservations = originals.activateReservation;
});

function makeRequest(overrides = {}) {
    return {
        user: { _id: "customer-user-id" },
        body: {
            carId: car.carId,
            customerName: " Test Customer ",
            customerPhone: "7000000000",
            customerEmail: "customer@example.test",
            pickupDate: "2030-01-01",
            returnDate: "2030-01-01",
            driverRequired: true,
            couponCode: "welcome10",
            totalAmount: 1,
            dailyPrice: 1,
            discountAmount: 999999,
            paymentStatus: "paid",
            status: "confirmed",
            ...overrides
        }
    };
}

function makeResponse() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
}

test("booking creation derives the paid amount from the car price and applies the server coupon", async () => {
    createdBooking = null;
    reservationCalls = [];
    activationCalls = [];
    const response = makeResponse();

    await createBooking(makeRequest(), response);

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.success, true);
    assert.equal(createdBooking.dailyPrice, 1200);
    assert.equal(createdBooking.totalDays, 1);
    assert.equal(createdBooking.subtotalAmount, 1200);
    assert.equal(createdBooking.discountAmount, 120);
    assert.equal(createdBooking.totalAmount, 1080);
    assert.equal(createdBooking.couponCode, "WELCOME10");
    assert.equal(createdBooking.driverRequired, true);
    assert.equal(createdBooking.status, "pending");
    assert.equal(createdBooking.paymentStatus, "pending");
    assert.equal(response.body.data.totalAmount, 1080);
    assert.equal(reservationCalls.length, 1);
    assert.equal(activationCalls[0], createdBooking.bookingId);
});

test("booking creation rejects an invalid coupon before reserving dates or creating a booking", async () => {
    createdBooking = null;
    reservationCalls = [];
    activationCalls = [];
    const response = makeResponse();

    await createBooking(makeRequest({ couponCode: "NOT-A-REAL-COUPON" }), response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
    assert.match(response.body.message, /invalid coupon/i);
    assert.equal(createdBooking, null);
    assert.equal(reservationCalls.length, 0);
    assert.equal(activationCalls.length, 0);
});
