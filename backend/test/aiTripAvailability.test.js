const test = require("node:test");
const assert = require("node:assert/strict");
const Car = require("../models/Car");
const Booking = require("../models/Booking");
const CarReservation = require("../models/CarReservation");
const { getAvailableCars } = require("../services/aiTripService");

function queryResult(records) {
    return {
        select() { return this; },
        lean() { return Promise.resolve(records); }
    };
}

test("AI trip car suggestions exclude existing bookings and active date holds", async () => {
    const originalCarFind = Car.find;
    const originalBookingFind = Booking.find;
    const originalReservationFind = CarReservation.find;
    const candidates = ["CAR-FREE", "CAR-BOOKED", "CAR-HELD"].map(carId => ({ carId }));
    let bookingQuery;
    let reservationQuery;

    Car.find = () => ({
        sort() { return this; },
        limit() { return this; },
        lean() { return Promise.resolve(candidates); }
    });
    Booking.find = query => {
        bookingQuery = query;
        return queryResult([{ carId: "CAR-BOOKED" }]);
    };
    CarReservation.find = query => {
        reservationQuery = query;
        return queryResult([{ carId: "CAR-HELD" }]);
    };

    try {
        const result = await getAvailableCars({
            origin: "Nagpur, Maharashtra",
            travelers: 2,
            startDate: "2035-04-10",
            endDate: "2035-04-12"
        });

        assert.deepEqual(result.cars.map(car => car.carId), ["CAR-FREE"]);
        assert.equal(result.availabilityChecked, true);
        assert.deepEqual(reservationQuery.dateKey, {
            $gte: "2035-04-10",
            $lte: "2035-04-12"
        });
        assert.deepEqual(reservationQuery.$or[0], { state: "active" });
        assert.equal(reservationQuery.$or[1].state, "creating");
        assert.ok(reservationQuery.$or[1].expiresAt.$gt instanceof Date);
        assert.deepEqual(bookingQuery.status.$in, ["pending", "confirmed"]);
    } finally {
        Car.find = originalCarFind;
        Booking.find = originalBookingFind;
        CarReservation.find = originalReservationFind;
    }
});
