const test = require("node:test");
const assert = require("node:assert/strict");
const DriverReservation = require("../models/DriverReservation");
const Booking = require("../models/Booking");
const {
    createDriverDateReservations,
    reconcileDriverDateReservations
} = require("../services/driverReservationService");

test("driver date slots have a unique driver-and-day database index", () => {
    const uniqueScheduleIndex = DriverReservation.schema.indexes().find(([fields, options]) =>
        fields.driverId === 1 && fields.dateKey === 1 && options.unique === true
    );
    assert.ok(uniqueScheduleIndex, "Concurrent writes must not reserve the same driver and date.");
});

test("driver date claims cover every rental day and use an expiring setup lease", async () => {
    const originalInsertMany = DriverReservation.insertMany;
    const originalDeleteMany = DriverReservation.deleteMany;
    let inserted;
    let options;
    DriverReservation.insertMany = async (rows, insertOptions) => {
        inserted = rows;
        options = insertOptions;
        return rows;
    };
    DriverReservation.deleteMany = async () => ({ deletedCount: 0 });

    try {
        const result = await createDriverDateReservations({
            driverId: "driver-1",
            bookingId: "BOOK-DRIVER-1",
            pickupDate: new Date("2031-07-01T00:00:00Z"),
            returnDate: new Date("2031-07-03T00:00:00Z")
        });
        assert.equal(result.ok, true);
        assert.equal(typeof result.claimId, "string");
        assert.deepEqual(inserted.map(row => row.dateKey), ["2031-07-01", "2031-07-02", "2031-07-03"]);
        assert.ok(inserted.every(row => row.state === "creating" && row.expiresAt instanceof Date));
        assert.deepEqual(options, { ordered: false });
    } finally {
        DriverReservation.insertMany = originalInsertMany;
        DriverReservation.deleteMany = originalDeleteMany;
    }
});

test("driver date claim reports a unique-index collision as unavailable and clears only its own claim", async () => {
    const originalInsertMany = DriverReservation.insertMany;
    const originalDeleteMany = DriverReservation.deleteMany;
    let cleanupFilter;
    let attemptedClaimId;
    DriverReservation.deleteMany = async filter => { cleanupFilter = filter; };
    DriverReservation.insertMany = async rows => {
        attemptedClaimId = rows[0].claimId;
        const error = new Error("duplicate date slot");
        error.writeErrors = [{ code: 11000 }];
        throw error;
    };

    try {
        const result = await createDriverDateReservations({
            driverId: "driver-2",
            bookingId: "BOOK-DRIVER-2",
            pickupDate: new Date("2031-07-01T00:00:00Z"),
            returnDate: new Date("2031-07-02T00:00:00Z")
        });
        assert.deepEqual(result, { ok: false, reason: "unavailable" });
        assert.deepEqual(cleanupFilter, {
            bookingId: "BOOK-DRIVER-2",
            driverId: "driver-2",
            claimId: attemptedClaimId,
            state: "creating"
        });
    } finally {
        DriverReservation.insertMany = originalInsertMany;
        DriverReservation.deleteMany = originalDeleteMany;
    }
});

test("driver date recovery activates matching bookings and releases orphaned or changed claims", async () => {
    const originalReservationFind = DriverReservation.find;
    const originalUpdateMany = DriverReservation.updateMany;
    const originalDeleteMany = DriverReservation.deleteMany;
    const originalBookingFind = Booking.find;
    const reservations = [
        { bookingId: "BOOK-1", driverId: "driver-1", claimId: "claim-1", state: "creating" },
        { bookingId: "BOOK-1", driverId: "driver-1", claimId: "claim-1", state: "creating" },
        { bookingId: "BOOK-2", driverId: "driver-2", claimId: "claim-2", state: "creating" },
        { bookingId: "BOOK-3", driverId: "driver-3", claimId: "claim-3", state: "creating" }
    ];
    const bookings = [
        { bookingId: "BOOK-1", driverId: "driver-1", status: "confirmed" },
        { bookingId: "BOOK-2", driverId: "driver-9", status: "confirmed" },
        { bookingId: "BOOK-3", driverId: "driver-3", status: "cancelled" }
    ];
    const activated = [];
    const released = [];

    DriverReservation.find = filter => {
        assert.deepEqual(filter, { state: "creating" });
        return { select() { return this; }, lean: async () => reservations };
    };
    Booking.find = filter => {
        assert.deepEqual(filter, { bookingId: { $in: ["BOOK-1", "BOOK-2", "BOOK-3"] } });
        return { select() { return this; }, lean: async () => bookings };
    };
    DriverReservation.updateMany = async (filter, update) => { activated.push({ filter, update }); };
    DriverReservation.deleteMany = async filter => { released.push(filter); };

    try {
        const result = await reconcileDriverDateReservations();
        assert.deepEqual(result, { activated: 1, released: 2 });
        assert.equal(activated.length, 1);
        assert.equal(activated[0].filter.bookingId, "BOOK-1");
        assert.equal(released.length, 2);
        assert.ok(released.some(filter => filter.bookingId.$in[0] === "BOOK-2" && filter.driverId === "driver-2"));
        assert.ok(released.some(filter => filter.bookingId.$in[0] === "BOOK-3" && filter.driverId === "driver-3"));
    } finally {
        DriverReservation.find = originalReservationFind;
        DriverReservation.updateMany = originalUpdateMany;
        DriverReservation.deleteMany = originalDeleteMany;
        Booking.find = originalBookingFind;
    }
});
