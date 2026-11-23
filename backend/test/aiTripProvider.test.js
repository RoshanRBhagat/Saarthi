const test = require("node:test");
const assert = require("node:assert/strict");
const Car = require("../models/Car");
const Booking = require("../models/Booking");
const CarReservation = require("../models/CarReservation");

const previousApiKey = process.env.GEMINI_API_KEY;
const previousModel = process.env.GEMINI_MODEL;
process.env.GEMINI_API_KEY = "test-only-key";
process.env.GEMINI_MODEL = "test-model";
const { planTrip } = require("../services/aiTripService");

function emptyQueryResult() {
    return {
        select() { return this; },
        lean() { return Promise.resolve([]); }
    };
}

test("AI trip planning bounds Gemini requests and handles a valid response", async () => {
    const originalCarFind = Car.find;
    const originalBookingFind = Booking.find;
    const originalReservationFind = CarReservation.find;
    const originalFetch = global.fetch;
    let requestSignal;

    Car.find = () => ({
        sort() { return this; },
        limit() { return this; },
        lean() { return Promise.resolve([]); }
    });
    Booking.find = () => emptyQueryResult();
    CarReservation.find = () => emptyQueryResult();
    global.fetch = async (_url, options) => {
        requestSignal = options.signal;
        return {
            ok: true,
            json: async () => ({ candidates: [{ content: { parts: [{ text: "{}" }] } }] })
        };
    };

    try {
        const result = await planTrip({
            origin: "Nagpur",
            destination: "Pune",
            startDate: "2035-04-10",
            endDate: "2035-04-11",
            travelers: 1
        });

        assert.equal(requestSignal instanceof AbortSignal, true);
        assert.equal(requestSignal.aborted, false);
        assert.equal(result.status, "planned");
        assert.equal(result.plan.vehicleRecommendation.name, "No matching Saarthi vehicle found");
    } finally {
        Car.find = originalCarFind;
        Booking.find = originalBookingFind;
        CarReservation.find = originalReservationFind;
        global.fetch = originalFetch;
        if (previousApiKey === undefined) delete process.env.GEMINI_API_KEY;
        else process.env.GEMINI_API_KEY = previousApiKey;
        if (previousModel === undefined) delete process.env.GEMINI_MODEL;
        else process.env.GEMINI_MODEL = previousModel;
    }
});
