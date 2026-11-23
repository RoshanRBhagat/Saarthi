const test = require("node:test");
const assert = require("node:assert/strict");

const Booking = require("../models/Booking");
const Car = require("../models/Car");
const { getHostInspectionPhoto } = require("../controllers/bookingInspectionPhotoController");

test("host inspection photo access is denied when the vehicle belongs to another host", async () => {
    const originalBookingFindOne = Booking.findOne;
    const originalCarFindOne = Car.findOne;
    let bookingQuery;
    let carQuery;
    let statusCode;
    let responseBody;

    Booking.findOne = query => {
        bookingQuery = query;
        return { select: async () => ({
            bookingId: "BOOK-PRIVATE",
            carId: "CAR-PRIVATE",
            pickupInspection: { status: "completed", photos: [] }
        }) };
    };
    Car.findOne = query => {
        carQuery = query;
        return { select: async () => null };
    };

    try {
        await getHostInspectionPhoto({
            params: { bookingId: "BOOK-PRIVATE", phase: "pickup", angle: "front" },
            user: { _id: "other-host" }
        }, {
            status(code) { statusCode = code; return this; },
            json(body) { responseBody = body; return this; }
        });

        assert.deepEqual(bookingQuery, { bookingId: "BOOK-PRIVATE" });
        assert.deepEqual(carQuery, { carId: "CAR-PRIVATE", ownerId: "other-host" });
        assert.equal(statusCode, 404);
        assert.equal(responseBody.success, false);
    } finally {
        Booking.findOne = originalBookingFindOne;
        Car.findOne = originalCarFindOne;
    }
});
