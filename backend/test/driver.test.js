const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const User = require("../models/User");
const Driver = require("../models/Driver");
const Booking = require("../models/Booking");
const Car = require("../models/Car");
const { requireAdmin, requireHost } = require("../middleware/authMiddleware");
const { parseDateOnly, parseDriverRequest, getIndiaTodayStartUtc, isTodayOrFutureIndia } = require("../services/bookingValidation");
const { getHealthStatus } = require("../services/healthStatus");
const storagePaths = require("../services/storagePaths");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs/promises");
const os = require("node:os");
const { replaceDirectory } = require("../services/atomicDirectory");
const { getDateKeys, MAX_RENTAL_DAYS } = require("../services/carReservationService");
const { REQUIRED_PRODUCTION_VARIABLES, getMissingProductionVariables } = require("../services/runtimeConfig");
const { isUploadStorageWritable } = require("../services/storageHealth");
const { isAllowedCarImage } = require("../middleware/upload");
const { serializeDriverAssignment, getAssignments } = require("../controllers/driverController");
const { apply: applyDriver, review: reviewDriver, listForAdmin } = require("../controllers/driverController");
const { canViewHandoverInstructions } = require("../controllers/bookingController");
const { normalizeHandoverInstructions } = require("../controllers/carController");
const { getPublicRegistrationRole } = require("../controllers/authController");

function runGuard(guard, role) {
    let passed = false;
    let statusCode = 200;
    let responseBody;
    const req = { user: role ? { role } : null };
    const res = {
        status(code) { statusCode = code; return this; },
        json(body) { responseBody = body; return this; }
    };
    guard(req, res, () => { passed = true; });
    return { passed, statusCode, responseBody };
}

test("driver applicants can be represented as normal user accounts", async () => {
    const user = new User({
        name: "Driver Test", email: "driver@example.test", phone: "7000000000",
        password: "hashed-password-value", role: "driver"
    });
    await user.validate();
    assert.equal(user.role, "driver");
});

test("public registration supports driver accounts without allowing public administrator accounts", () => {
    assert.equal(getPublicRegistrationRole("driver"), "driver");
    assert.equal(getPublicRegistrationRole("host"), "host");
    assert.equal(getPublicRegistrationRole("customer"), "customer");
    assert.equal(getPublicRegistrationRole("admin"), "customer");
});

test("registration checks JWT configuration before querying or creating an account", () => {
    const program = `
        const User = require("./models/User");
        const { registerUser } = require("./controllers/authController");
        let lookupCalled = false;
        let createCalled = false;
        let statusCode;
        User.findOne = async () => { lookupCalled = true; };
        User.create = async () => { createCalled = true; };
        const response = {
            status(code) { statusCode = code; return this; },
            json() { return this; }
        };
        registerUser({ body: {
            name: "Test Driver", email: "driver@example.test", phone: "7000000000",
            password: "password123", role: "driver"
        } }, response).then(() => {
            if (statusCode !== 500 || lookupCalled || createCalled) process.exitCode = 1;
            process.stdout.write(JSON.stringify({ statusCode, lookupCalled, createCalled }));
        });
    `;
    const result = spawnSync(process.execPath, ["-e", program], {
        cwd: path.resolve(__dirname, ".."),
        encoding: "utf8",
        env: { ...process.env, JWT_SECRET: "" }
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { statusCode: 500, lookupCalled: false, createCalled: false });
});

test("car uploads require a matching image filename extension and MIME type", () => {
    assert.equal(isAllowedCarImage({ originalname: "car.JPG", mimetype: "image/jpeg" }), true);
    assert.equal(isAllowedCarImage({ originalname: "car.jpeg", mimetype: "image/jpg" }), true);
    assert.equal(isAllowedCarImage({ originalname: "car.png", mimetype: "image/png" }), true);
    assert.equal(isAllowedCarImage({ originalname: "payload.html", mimetype: "image/png" }), false);
    assert.equal(isAllowedCarImage({ originalname: "car.png", mimetype: "image/jpeg" }), false);
    assert.equal(isAllowedCarImage({ originalname: "car.svg", mimetype: "image/svg+xml" }), false);
});

test("driver profile requires valid status and linked user", async () => {
    const driver = new Driver({
        userId: new mongoose.Types.ObjectId(), licenseNumber: "DL-QA-123",
        licenseExpiry: new Date("2032-01-01"), city: "Pune", status: "pending_review"
    });
    await driver.validate();
    driver.status = "self_approved";
    await assert.rejects(driver.validate());
});

test("booking driver assignment is optional and references Driver", async () => {
    const booking = new Booking({
        bookingId: "BOOK-QA", carId: "CAR-QA", customerName: "Customer",
        customerPhone: "7000000001", pickupDate: new Date("2032-01-01"),
        returnDate: new Date("2032-01-02"), totalDays: 2, dailyPrice: 100,
        totalAmount: 200
    });
    await booking.validate();
    assert.equal(booking.driverRequired, false);
    assert.equal(booking.driverId, null);
});

test("driver assignment response contains operational fields without payment or inspection internals", () => {
    const booking = {
        bookingId: "BOOK-DRIVER-QA",
        carId: "CAR-DRIVER-QA",
        customerName: "Rider",
        customerPhone: "7000000022",
        pickupDate: new Date("2032-06-01"),
        returnDate: new Date("2032-06-03"),
        status: "confirmed",
        pickupStatus: "pending",
        returnStatus: "pending",
        pickupInspectionStatus: "pending",
        returnInspectionStatus: "pending",
        paymentStatus: "paid",
        paymentSignature: "must-not-leak",
        paymentId: "pay_private",
        totalAmount: 2500,
        refundReason: "private reason",
        pickupInspection: { photos: [{ path: "/private/path" }] },
        userId: "customer-user-id"
    };

    const result = serializeDriverAssignment(booking, {
        make: "Example",
        model: "Car",
        city: "Pune",
        ownerId: { name: "Host Contact", phone: "7000000088", password: "must-not-leak" }
    });

    assert.deepEqual(Object.keys(result).sort(), [
        "bookingId", "car", "customerName", "customerPhone", "pickupDate",
        "canUploadInspection", "pickupInspectionStatus", "pickupStatus", "refundStatus", "returnDate",
        "returnInspectionStatus", "returnStatus", "status"
    ].sort());
    assert.equal(result.car.ownerId, undefined);
    assert.deepEqual(result.car.host, { name: "Host Contact", phone: "7000000088" });
    assert.equal(JSON.stringify(result).includes("must-not-leak"), false);
    assert.equal(JSON.stringify(result).includes("private reason"), false);
    assert.equal(JSON.stringify(result).includes("/private/path"), false);
    assert.equal(JSON.stringify(result).includes("password"), false);
});

test("handover instructions require a paid confirmed or completed booking without an active refund", () => {
    for (const status of ["confirmed", "completed"]) {
        assert.equal(canViewHandoverInstructions({ status, paymentStatus: "paid", refundStatus: "none" }), true);
    }
    for (const booking of [
        { status: "pending", paymentStatus: "paid" },
        { status: "confirmed", paymentStatus: "pending" },
        { status: "cancelled", paymentStatus: "paid" },
        { status: "confirmed", paymentStatus: "paid", refundStatus: "pending_review" },
        { status: "confirmed", paymentStatus: "paid", refundStatus: "processing" },
        { status: "confirmed", paymentStatus: "paid", refundStatus: "failed" }
    ]) assert.equal(canViewHandoverInstructions(booking), false);
});

test("pickup instruction normalization trims text and enforces a 500 character limit", () => {
    assert.equal(normalizeHandoverInstructions("  Meet at gate 2  "), "Meet at gate 2");
    assert.equal(normalizeHandoverInstructions("x".repeat(500)).length, 500);
    assert.equal(normalizeHandoverInstructions("x".repeat(501)), null);
    assert.equal(normalizeHandoverInstructions({}), null);
});

test("vehicle handover instructions are private by default in ordinary vehicle queries", () => {
    assert.equal(Car.schema.path("handoverInstructions").options.select, false);
});

test("assigned driver receives the host handover contact for their own booking", async () => {
    const originals = {
        driverFindOne: Driver.findOne,
        bookingFind: Booking.find,
        carFind: Car.find
    };
    const driver = { _id: new mongoose.Types.ObjectId(), status: "active" };
    const booking = {
        bookingId: "BOOK-HANDOVER-QA", carId: "CAR-HANDOVER-QA",
        customerName: "Customer", customerPhone: "7000000022",
        pickupDate: new Date("2032-06-01"), returnDate: new Date("2032-06-03"),
        status: "confirmed", pickupStatus: "pending", returnStatus: "pending",
        paymentStatus: "paid", refundStatus: "none"
    };
    let responseBody;
    Driver.findOne = async filter => {
        assert.equal(String(filter.userId), "driver-user");
        return driver;
    };
    Booking.find = filter => {
        assert.equal(String(filter.driverId), String(driver._id));
        assert.equal(filter.driverRequired, true);
        return {
            select() { return this; },
            sort() { return this; },
            lean: async () => [booking]
        };
    };
    Car.find = filter => {
        assert.deepEqual(filter.carId.$in, ["CAR-HANDOVER-QA"]);
        return {
            select(fields) { assert.match(fields, /ownerId/); return this; },
            populate(path, fields) { assert.equal(path, "ownerId"); assert.equal(fields, "name phone"); return this; },
            lean: async () => [{
                carId: "CAR-HANDOVER-QA", make: "Example", model: "Car", city: "Pune",
                handoverInstructions: "Use the side entrance",
                ownerId: { name: "Vehicle Host", phone: "7000000088", password: "private" }
            }]
        };
    };

    try {
        await getAssignments({ user: { _id: "driver-user", name: "Driver", phone: "7000000011" } }, {
            json(body) { responseBody = body; return this; }
        });
        assert.equal(responseBody.success, true);
        assert.deepEqual(responseBody.data[0].car.host, { name: "Vehicle Host", phone: "7000000088" });
        assert.equal(responseBody.data[0].car.handoverInstructions, "Use the side entrance");
        assert.equal(JSON.stringify(responseBody).includes("private"), false);
    } finally {
        Driver.findOne = originals.driverFindOne;
        Booking.find = originals.bookingFind;
        Car.find = originals.carFind;
    }
});

test("active drivers can submit changed license details for review without a fake support handoff", async () => {
    const originalFindOne = Driver.findOne;
    const originalFindOneAndUpdate = Driver.findOneAndUpdate;
    const activeProfile = {
        status: "active",
        licenseNumber: "OLD-123",
        city: "Pune",
        licenseExpiry: new Date("2031-01-01")
    };
    let capturedUpdate;
    let responseBody;
    let statusCode = 200;

    Driver.findOne = async () => activeProfile;
    Driver.findOneAndUpdate = async (_filter, update) => {
        capturedUpdate = update;
        return { ...activeProfile, ...update.$set };
    };

    try {
        await applyDriver({
            user: { _id: "driver-user" },
            body: { licenseNumber: " new-456 ", licenseExpiry: "2099-01-01", city: " Mumbai " }
        }, {
            status(code) { statusCode = code; return this; },
            json(body) { responseBody = body; return this; }
        });

        assert.equal(statusCode, 200);
        assert.equal(capturedUpdate.$set.status, "pending_review");
        assert.equal(capturedUpdate.$set.reviewedAt, null);
        assert.equal(capturedUpdate.$set.licenseNumber, "NEW-456");
        assert.equal(capturedUpdate.$set.city, "Mumbai");
        assert.match(responseBody.message, /submitted for admin review/i);
        assert.doesNotMatch(responseBody.message, /contact support/i);
    } finally {
        Driver.findOne = originalFindOne;
        Driver.findOneAndUpdate = originalFindOneAndUpdate;
    }
});

test("admin cannot approve a driver with an expired license", async () => {
    const originalFindById = Driver.findById;
    let statusCode;
    let responseBody;
    Driver.findById = async () => ({
        licenseExpiry: new Date("2020-01-01"),
        save() { throw new Error("Expired driver must not be saved as active."); }
    });

    try {
        await reviewDriver({ params: { driverId: "expired-driver" }, body: { status: "active" } }, {
            status(code) { statusCode = code; return this; },
            json(body) { responseBody = body; return this; }
        });
        assert.equal(statusCode, 409);
        assert.match(responseBody.message, /license has expired/i);
    } finally {
        Driver.findById = originalFindById;
    }
});

test("administrator driver list includes profiles in every review state", async () => {
    const originalFind = Driver.find;
    const rows = [{ status: "active" }, { status: "pending_review" }, { status: "suspended" }];
    let responseBody;
    Driver.find = filter => {
        assert.deepEqual(filter, {});
        return {
            populate(path, fields) {
                assert.equal(path, "userId");
                assert.equal(fields, "name email phone");
                return this;
            },
            sort(order) {
                assert.deepEqual(order, { status: 1, createdAt: -1 });
                return Promise.resolve(rows);
            }
        };
    };

    try {
        await listForAdmin({}, { json(body) { responseBody = body; return this; } });
        assert.equal(responseBody.count, 3);
        assert.deepEqual(responseBody.data.map(row => row.status), ["active", "pending_review", "suspended"]);
    } finally {
        Driver.find = originalFind;
    }
});

test("admin and host route guards enforce their own roles", () => {
    assert.equal(runGuard(requireAdmin, "admin").passed, true);
    assert.equal(runGuard(requireAdmin, "host").statusCode, 403);
    assert.equal(runGuard(requireHost, "host").passed, true);
    assert.equal(runGuard(requireHost, "admin").statusCode, 403);
    assert.equal(runGuard(requireAdmin, null).statusCode, 403);
});

test("booking date parser rejects malformed and impossible dates", () => {
    assert.equal(parseDateOnly("2030-02-29"), null);
    assert.equal(parseDateOnly("2032-02-29") instanceof Date, true);
    assert.equal(parseDateOnly("2032-2-09"), null);
});

test("driver request parser rejects truthy non-boolean values", () => {
    assert.equal(parseDriverRequest(undefined), false);
    assert.equal(parseDriverRequest(true), true);
    assert.equal(parseDriverRequest(false), false);
    assert.equal(parseDriverRequest("false"), null);
    assert.equal(parseDriverRequest(1), null);
});

test("rental pickup date rejects a past date", () => {
    assert.equal(isTodayOrFutureIndia(new Date("2000-01-01T00:00:00.000Z")), false);
    assert.equal(isTodayOrFutureIndia(new Date("2099-01-01T00:00:00.000Z")), true);
});

test("India date-only license expiry remains valid through its calendar date", () => {
    const afternoonOnExpiryDate = new Date("2032-05-10T16:00:00+05:30");
    assert.equal(isTodayOrFutureIndia(parseDateOnly("2032-05-10"), afternoonOnExpiryDate), true);
    assert.equal(isTodayOrFutureIndia(parseDateOnly("2032-05-09"), afternoonOnExpiryDate), false);
    assert.equal(isTodayOrFutureIndia(parseDateOnly("2032-02-31"), afternoonOnExpiryDate), false);
});

test("driver application accepts today's valid license expiry date", async () => {
    const originalFindOne = Driver.findOne;
    const originalFindOneAndUpdate = Driver.findOneAndUpdate;
    const today = getIndiaTodayStartUtc().toISOString().slice(0, 10);
    let statusCode;
    let responseBody;
    let capturedUpdate;
    Driver.findOne = async () => null;
    Driver.findOneAndUpdate = async (_filter, update) => {
        capturedUpdate = update;
        return { ...update.$set, _id: "driver-profile" };
    };

    try {
        await applyDriver({
            user: { _id: "driver-user" },
            body: { licenseNumber: "TODAY-123", licenseExpiry: today, city: "Pune" }
        }, {
            status(code) { statusCode = code; return this; },
            json(body) { responseBody = body; return this; }
        });

        assert.equal(statusCode, 200);
        assert.equal(responseBody.success, true);
        assert.equal(capturedUpdate.$set.licenseExpiry.toISOString().slice(0, 10), today);
    } finally {
        Driver.findOne = originalFindOne;
        Driver.findOneAndUpdate = originalFindOneAndUpdate;
    }
});

test("driver application rejects impossible license expiry dates before writing a profile", async () => {
    const originalFindOne = Driver.findOne;
    const originalFindOneAndUpdate = Driver.findOneAndUpdate;
    let statusCode;
    let updateCalled = false;
    Driver.findOne = async () => null;
    Driver.findOneAndUpdate = async () => { updateCalled = true; };

    try {
        await applyDriver({
            user: { _id: "driver-user" },
            body: { licenseNumber: "INVALID-123", licenseExpiry: "2099-02-31", city: "Pune" }
        }, {
            status(code) { statusCode = code; return this; },
            json() { return this; }
        });

        assert.equal(statusCode, 400);
        assert.equal(updateCalled, false);
    } finally {
        Driver.findOne = originalFindOne;
        Driver.findOneAndUpdate = originalFindOneAndUpdate;
    }
});

test("health status is ready only when MongoDB is connected", () => {
    assert.deepEqual(getHealthStatus(0), {
        httpStatus: 503,
        body: {
            success: false,
            status: "degraded",
            dependencies: { database: "unavailable", uploadStorage: "writable" }
        }
    });
    assert.deepEqual(getHealthStatus(1), {
        httpStatus: 200,
        body: {
            success: true,
            status: "ok",
            dependencies: { database: "connected", uploadStorage: "writable" }
        }
    });
    assert.equal(getHealthStatus(1, false).httpStatus, 503);
});

test("upload storage readiness probe requires a writable existing directory", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "saarthi-storage-health-"));
    try {
        // Real persistent volumes are commonly mounted empty on first deploy.
        assert.equal(await isUploadStorageWritable(root), true);
        assert.deepEqual(await fs.readdir(path.join(root, "cars")), []);
        assert.deepEqual(await fs.readdir(path.join(root, "damage")), []);

        assert.equal(await isUploadStorageWritable(root), true);
        assert.deepEqual(await fs.readdir(path.join(root, "cars")), []);
        assert.deepEqual(await fs.readdir(path.join(root, "damage")), []);
        assert.equal(await isUploadStorageWritable(path.join(root, "missing")), false);
    } finally {
        await fs.rm(root, { recursive: true, force: true });
    }
});

test("loading car upload middleware does not make a missing persistent mount look present", async () => {
    const parent = await fs.mkdtemp(path.join(os.tmpdir(), "saarthi-unmounted-volume-"));
    const configuredRoot = path.join(parent, "volume-not-mounted", "uploads");
    try {
        const result = spawnSync(process.execPath, ["-e", "require('./middleware/upload')"], {
            cwd: path.resolve(__dirname, ".."),
            env: { ...process.env, SAARTHI_UPLOAD_DIR: configuredRoot },
            encoding: "utf8"
        });

        assert.equal(result.status, 0, result.stderr);
        await assert.rejects(fs.access(configuredRoot));
    } finally {
        await fs.rm(parent, { recursive: true, force: true });
    }
});

test("production startup requires every critical external service and persistent storage", () => {
    assert.deepEqual(getMissingProductionVariables({ NODE_ENV: "development" }), []);
    assert.deepEqual(getMissingProductionVariables({ NODE_ENV: "production" }), REQUIRED_PRODUCTION_VARIABLES);

    const completeEnvironment = Object.fromEntries(REQUIRED_PRODUCTION_VARIABLES.map(name => [name, "configured"]));
    completeEnvironment.JWT_SECRET = "production-test-secret-that-is-over-32-bytes";
    completeEnvironment.RAZORPAY_KEY_ID = "rzp_test_example123";
    completeEnvironment.NODE_ENV = "production";
    completeEnvironment.SAARTHI_UPLOAD_DIR = path.resolve("/var/lib/saarthi/uploads");
    assert.deepEqual(getMissingProductionVariables(completeEnvironment), []);

    completeEnvironment.SAARTHI_UPLOAD_DIR = "uploads";
    assert.deepEqual(getMissingProductionVariables(completeEnvironment), [
        "SAARTHI_UPLOAD_DIR (must be an absolute persistent-volume path)"
    ]);

    completeEnvironment.SAARTHI_UPLOAD_DIR = path.resolve("/var/lib/saarthi/uploads");
    completeEnvironment.RAZORPAY_KEY_ID = "rzp_live_example123";
    assert.deepEqual(getMissingProductionVariables(completeEnvironment), [
        "RAZORPAY_KEY_ID (production currently accepts Test Mode keys only)"
    ]);

    completeEnvironment.RAZORPAY_KEY_ID = "rzp_test_example123";
    for (const unsafeSecret of ["your_jwt_secret", "short", "a".repeat(40)]) {
        completeEnvironment.JWT_SECRET = unsafeSecret;
        assert.deepEqual(getMissingProductionVariables(completeEnvironment), [
            "JWT_SECRET (must be at least 32 bytes and not a placeholder)"
        ]);
    }
});

test("upload paths default to the existing backend uploads directory", () => {
    assert.equal(storagePaths.getUploadsRoot(), require("node:path").resolve(__dirname, "..", "uploads"));
    assert.equal(storagePaths.getCarUploadsDir(), require("node:path").join(storagePaths.getUploadsRoot(), "cars"));
    assert.equal(storagePaths.getDamageUploadsDir(), require("node:path").join(storagePaths.getUploadsRoot(), "damage"));
});

test("upload paths honor a persistent-volume environment override", () => {
    const expectedRoot = path.resolve("C:/saarthi-persistent/uploads");
    const result = spawnSync(process.execPath, [
        "-e",
        "const p=require('./services/storagePaths');process.stdout.write(JSON.stringify([p.getUploadsRoot(),p.getCarUploadsDir(),p.getDamageUploadsDir()]))"
    ], {
        cwd: path.resolve(__dirname, ".."),
        env: { ...process.env, SAARTHI_UPLOAD_DIR: expectedRoot },
        encoding: "utf8"
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), [
        expectedRoot,
        path.join(expectedRoot, "cars"),
        path.join(expectedRoot, "damage")
    ]);
});

test("inspection directory replacement preserves only the complete new set", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "saarthi-inspection-test-"));
    const current = path.join(root, "pickup");
    const replacement = path.join(root, "pickup-tmp");
    try {
        await fs.mkdir(current);
        await fs.writeFile(path.join(current, "old.jpg"), "old-photo");
        await fs.mkdir(replacement);
        await fs.writeFile(path.join(replacement, "front.jpg"), "new-photo");
        await replaceDirectory(replacement, current);
        assert.equal(await fs.readFile(path.join(current, "front.jpg"), "utf8"), "new-photo");
        await assert.rejects(fs.stat(path.join(current, "old.jpg")));
        assert.deepEqual((await fs.readdir(root)).sort(), ["pickup"]);
    } finally {
        await fs.rm(root, { recursive: true, force: true });
    }
});

test("car reservations cover every rental day inclusively and cap abusive ranges", () => {
    assert.deepEqual(
        getDateKeys(new Date("2032-02-28T00:00:00Z"), new Date("2032-03-01T00:00:00Z")),
        ["2032-02-28", "2032-02-29", "2032-03-01"]
    );
    assert.equal(
        getDateKeys(new Date("2032-01-01T00:00:00Z"), new Date("2033-01-01T00:00:00Z")),
        null
    );
    assert.equal(MAX_RENTAL_DAYS, 365);
});
