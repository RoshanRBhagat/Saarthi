const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const originalUploadDir = process.env.SAARTHI_UPLOAD_DIR;
const uploadRoot = path.join(os.tmpdir(), `saarthi-driver-inspection-${process.pid}-${Date.now()}`);
process.env.SAARTHI_UPLOAD_DIR = uploadRoot;

const Booking = require("../models/Booking");
const Car = require("../models/Car");
const Driver = require("../models/Driver");
const { saveBookingInspection } = require("../controllers/bookingInspectionController");

test.after(async () => {
    if (originalUploadDir === undefined) delete process.env.SAARTHI_UPLOAD_DIR;
    else process.env.SAARTHI_UPLOAD_DIR = originalUploadDir;
    await fs.rm(uploadRoot, { recursive: true, force: true });
});

test("assigned driver inspection upload writes all eight pickup photos and finalizes the inspection", async () => {
    const originals = {
        bookingFindOne: Booking.findOne,
        bookingFindOneAndUpdate: Booking.findOneAndUpdate,
        carFindOne: Car.findOne,
        driverFindOne: Driver.findOne
    };
    const booking = {
        _id: "booking-driver-upload-test",
        bookingId: "BOOK-DRIVER-UPLOAD-TEST",
        carId: "CAR-DRIVER-UPLOAD-TEST",
        driverId: "approved-driver-id",
        driverRequired: true,
        status: "confirmed",
        paymentStatus: "paid",
        refundStatus: "none",
        pickupStatus: "pending",
        returnStatus: "pending",
        pickupInspection: { status: "pending", photos: [] },
        returnInspection: { status: "pending", photos: [] }
    };
    const setNestedValue = (target, dottedPath, value) => {
        const keys = dottedPath.split(".");
        const finalKey = keys.pop();
        const parent = keys.reduce((current, key) => current[key] || (current[key] = {}), target);
        parent[finalKey] = value;
    };
    Booking.findOne = async query => {
        assert.deepEqual(query, { bookingId: booking.bookingId });
        return booking;
    };
    Booking.findOneAndUpdate = async (filter, update) => {
        if (filter._id) assert.equal(filter._id, booking._id);
        for (const [key, value] of Object.entries(update.$set || {})) setNestedValue(booking, key, value);
        for (const key of Object.keys(update.$unset || {})) {
            const keys = key.split(".");
            const finalKey = keys.pop();
            const parent = keys.reduce((current, part) => current?.[part], booking);
            if (parent) delete parent[finalKey];
        }
        return booking;
    };
    Car.findOne = query => {
        assert.equal(query.ownerId, "driver-user-id");
        return { select: async () => null };
    };
    Driver.findOne = query => {
        assert.equal(query.userId, "driver-user-id");
        assert.equal(query.status, "active");
        return { select: () => ({ lean: async () => ({ _id: "approved-driver-id" }) }) };
    };

    try {
        const angles = ["front", "front-left", "left", "rear-left", "rear", "rear-right", "right", "front-right"];
        const image = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0x00]).toString("base64")}`;
        let responseBody;
        let statusCode = 200;
        await saveBookingInspection({
            params: { bookingId: booking.bookingId, phase: "pickup" },
            user: { _id: "driver-user-id" },
            body: { photos: angles.map(angle => ({ angle, dataUrl: image })), notes: "Handover ready" }
        }, {
            status(code) { statusCode = code; return this; },
            json(body) { responseBody = body; return this; }
        });

        assert.equal(statusCode, 200);
        assert.equal(responseBody.success, true);
        assert.equal(responseBody.data.photoCount, 8);
        assert.equal(booking.pickupInspection.status, "completed");
        assert.equal(booking.pickupInspection.completedBy, "driver-user-id");
        assert.equal(booking.pickupInspection.notes, "Handover ready");
        assert.equal(booking.pickupInspection.uploadLeaseToken, undefined);
        for (const angle of angles) {
            const photoPath = path.join(uploadRoot, "damage", booking.bookingId, "pickup", `${angle}.jpg`);
            const storedPhoto = await fs.readFile(photoPath);
            assert.deepEqual(storedPhoto, Buffer.from([0xff, 0xd8, 0xff, 0x00]));
        }
    } finally {
        Booking.findOne = originals.bookingFindOne;
        Booking.findOneAndUpdate = originals.bookingFindOneAndUpdate;
        Car.findOne = originals.carFindOne;
        Driver.findOne = originals.driverFindOne;
    }
});
