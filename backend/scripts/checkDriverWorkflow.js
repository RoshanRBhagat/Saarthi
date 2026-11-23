const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { PassThrough } = require("node:stream");
const { finished } = require("node:stream/promises");

const suffix = crypto.randomBytes(5).toString("hex");
const databaseName = `saarthi_driver_check_${suffix}`;
const mongoUri = `mongodb://127.0.0.1:27017/${databaseName}`;
const uploadRoot = path.join(os.tmpdir(), `saarthi-driver-check-${suffix}`);
const jwtSecret = crypto.randomBytes(32).toString("hex");
const webhookSecret = crypto.randomBytes(32).toString("hex");

process.env.MONGODB_URI = mongoUri;
process.env.SAARTHI_UPLOAD_DIR = uploadRoot;
process.env.JWT_SECRET = jwtSecret;
process.env.RAZORPAY_KEY_ID = `rzp_test_${suffix}`;
process.env.RAZORPAY_KEY_SECRET = crypto.randomBytes(24).toString("hex");
process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;
process.env.GEMINI_API_KEY = `synthetic-workflow-key-${suffix}`;

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Car = require("../models/Car");
const CarReservation = require("../models/CarReservation");
const Booking = require("../models/Booking");
const Driver = require("../models/Driver");
const DriverReservation = require("../models/DriverReservation");
const { createCar } = require("../controllers/carController");
const {
    createBooking,
    updateHostBookingStatus,
    confirmPickup,
    confirmReturn
} = require("../controllers/bookingController");
const { apply, review, assign, getAssignments } = require("../controllers/driverController");
const {
    saveBookingInspection,
    retryReturnDamageAnalysis
} = require("../controllers/bookingInspectionController");
const {
    getCustomerInspectionPhoto,
    getHostInspectionPhoto
} = require("../controllers/bookingInspectionPhotoController");
const { handleRazorpayWebhook } = require("../controllers/paymentController");

function responseStream() {
    const response = new PassThrough();
    response.statusCode = 200;
    response.headers = {};
    response.set = (name, value) => {
        response.headers[String(name).toLowerCase()] = value;
        return response;
    };
    response.status = code => {
        response.statusCode = code;
        return response;
    };
    response.json = body => {
        response.body = body;
        response.end(JSON.stringify(body));
        return response;
    };
    return response;
}

async function invoke(controller, req, expectedStatus = 200) {
    const res = responseStream();
    await controller(req, res);
    assert.equal(res.statusCode, expectedStatus, res.body?.message || "Unexpected controller response.");
    return { req, res, body: res.body };
}

function indiaDate(offset = 0) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());
    const today = `${parts.find(part => part.type === "year").value}-${parts.find(part => part.type === "month").value}-${parts.find(part => part.type === "day").value}`;
    const date = new Date(`${today}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
}

async function makeUser(role, name, index) {
    return User.create({
        name,
        email: `${role}-${suffix}-${index}@example.test`,
        phone: String(9000000000 + Number.parseInt(suffix.slice(0, 7), 16) + index),
        password: await bcrypt.hash("E2E-Only-Password-7", 10),
        role,
        status: "active"
    });
}

async function run() {
    assert.match(databaseName, /^saarthi_driver_check_[a-f0-9]{10}$/);
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    assert.equal(mongoose.connection.name, databaseName);

    const [host, customer, driverUser, unrelatedUser, admin] = await Promise.all([
        makeUser("host", "Workflow Host", 1),
        makeUser("customer", "Workflow Customer", 2),
        makeUser("driver", "Workflow Driver", 3),
        makeUser("driver", "Unassigned Driver", 4),
        makeUser("admin", "Workflow Admin", 5)
    ]);

    const carResponse = await invoke(createCar, {
        user: host,
        body: {
            make: "Workflow",
            model: "Test Hatchback",
            year: 2024,
            category: "hatchback",
            seats: 5,
            luggageCapacity: 2,
            fuelType: "petrol",
            transmission: "manual",
            city: "Pune",
            state: "Maharashtra",
            dailyPrice: 900,
            description: "Isolated driver workflow fixture",
            handoverInstructions: "Use the temporary test pickup bay."
        },
        files: []
    }, 201);
    const car = carResponse.body.data;

    const bookingResponse = await invoke(createBooking, {
        user: customer,
        body: {
            carId: car.carId,
            customerName: customer.name,
            customerPhone: customer.phone,
            customerEmail: customer.email,
            pickupDate: indiaDate(0),
            returnDate: indiaDate(1),
            driverRequired: true
        }
    }, 201);
    const bookingId = bookingResponse.body.data.bookingId;
    assert.equal(bookingResponse.body.data.driverRequired, true);

    const application = await invoke(apply, {
        user: driverUser,
        body: { licenseNumber: `E2E-${suffix}`, licenseExpiry: "2099-12-31", city: "Pune" }
    });
    assert.equal(application.body.data.status, "pending_review");
    await invoke(review, {
        user: admin,
        params: { driverId: String(application.body.data._id) },
        body: { status: "active" }
    });
    assert.equal((await Driver.findById(application.body.data._id)).status, "active");

    await invoke(updateHostBookingStatus, {
        user: host,
        params: { bookingId },
        body: { status: "confirmed" }
    });

    const orderId = `order_e2e_${suffix}`;
    await Booking.updateOne({ bookingId }, { $set: { paymentOrderId: orderId } });
    const eventBody = Buffer.from(JSON.stringify({
        event: "payment.captured",
        payload: {
            payment: {
                entity: {
                    id: `pay_e2e_${suffix}`,
                    order_id: orderId,
                    amount: Math.round(bookingResponse.body.data.totalAmount * 100),
                    currency: "INR",
                    status: "captured",
                    captured: true
                }
            }
        }
    }));
    const signature = crypto.createHmac("sha256", webhookSecret).update(eventBody).digest("hex");
    const webhookRes = responseStream();
    const webhookReq = {
        body: eventBody,
        get(name) {
            const header = String(name).toLowerCase();
            if (header === "x-razorpay-signature") return signature;
            if (header === "x-razorpay-event-id") return `evt_e2e_${suffix}`;
            return undefined;
        }
    };
    await handleRazorpayWebhook(webhookReq, webhookRes);
    assert.equal(webhookRes.statusCode, 200, webhookRes.body?.message || "Synthetic webhook failed.");
    assert.equal((await Booking.findOne({ bookingId })).paymentStatus, "paid");

    await invoke(assign, {
        user: host,
        params: { bookingId },
        body: { driverId: String(application.body.data._id) }
    });
    const assignments = await invoke(getAssignments, { user: driverUser });
    assert.equal(assignments.body.data.length, 1);
    assert.equal(assignments.body.data[0].bookingId, bookingId);
    assert.equal(assignments.body.data[0].canUploadInspection, true);
    assert.equal(assignments.body.data[0].car.handoverInstructions, "Use the temporary test pickup bay.");

    const angles = ["front", "front-left", "left", "rear-left", "rear", "rear-right", "right", "front-right"];
    const imageData = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0]).toString("base64")}`;
    const photos = angles.map(angle => ({ angle, dataUrl: imageData }));
    await invoke(saveBookingInspection, {
        user: unrelatedUser,
        params: { bookingId, phase: "pickup" },
        body: { photos }
    }, 403);
    const upload = await invoke(saveBookingInspection, {
        user: driverUser,
        params: { bookingId, phase: "pickup" },
        body: { photos, notes: "Synthetic pickup evidence." }
    });
    assert.equal(upload.body.data.photoCount, 8);

    const photoResponse = responseStream();
    const chunks = [];
    photoResponse.on("data", chunk => chunks.push(chunk));
    const photoDone = finished(photoResponse);
    await getHostInspectionPhoto({
        user: host,
        params: { bookingId, phase: "pickup", angle: "front" }
    }, photoResponse);
    await photoDone;
    assert.deepEqual(Buffer.concat(chunks), Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
    assert.equal(photoResponse.headers["cache-control"], "private, no-store");

    const customerPhotoResponse = responseStream();
    const customerChunks = [];
    customerPhotoResponse.on("data", chunk => customerChunks.push(chunk));
    const customerPhotoDone = finished(customerPhotoResponse);
    await getCustomerInspectionPhoto({
        user: customer,
        params: { bookingId, phase: "pickup", angle: "front" }
    }, customerPhotoResponse);
    await customerPhotoDone;
    assert.deepEqual(Buffer.concat(customerChunks), Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
    assert.equal(customerPhotoResponse.headers["cache-control"], "private, no-store");
    await invoke(getCustomerInspectionPhoto, {
        user: unrelatedUser,
        params: { bookingId, phase: "pickup", angle: "front" }
    }, 404);

    await invoke(saveBookingInspection, {
        user: driverUser,
        params: { bookingId, phase: "pickup" },
        body: { photos, notes: "Attempted replacement." }
    }, 409);

    await invoke(confirmPickup, {
        user: host,
        params: { bookingId },
        body: { notes: "Synthetic pickup confirmed." }
    });
    const savedBooking = await Booking.findOne({ bookingId }).lean();
    assert.equal(savedBooking.pickupStatus, "confirmed");
    assert.equal(savedBooking.pickupInspection.photos.length, 8);
    assert.equal((await DriverReservation.find({ bookingId, state: "active" })).length, 2);

    const originalFetch = global.fetch;
    global.fetch = async () => ({
        ok: false,
        status: 503,
        json: async () => ({ error: { message: "Synthetic temporary AI outage." } })
    });

    try {
        const returnUpload = await invoke(saveBookingInspection, {
            user: driverUser,
            params: { bookingId, phase: "return" },
            body: { photos, notes: "Synthetic return evidence." }
        });
        assert.equal(returnUpload.body.data.photoCount, 8);
        assert.equal(returnUpload.body.data.analysis, null);
        assert.match(returnUpload.body.data.analysisError, /Synthetic temporary AI outage/);
        const savedAfterFailure = await Booking.findOne({ bookingId }).lean();
        assert.equal(savedAfterFailure.returnInspection.status, "completed");
        assert.equal(savedAfterFailure.returnInspection.photos.length, 8);
        assert.equal(savedAfterFailure.returnInspection.aiAnalysis.status, "failed");
    } finally {
        global.fetch = originalFetch;
    }

    let comparisonRequestCount = 0;
    global.fetch = async (_url, options) => {
        comparisonRequestCount += 1;
        const request = JSON.parse(options.body);
        const batchAngles = request.contents[0].parts
            .filter(part => typeof part.text === "string" && part.text.startsWith("PICKUP / BEFORE RENTAL photo"))
            .map(part => part.text.split("angle: ")[1]);
        assert.equal(batchAngles.length, 2);
        const comparisons = batchAngles.map(angle => ({
            angle,
            sameVehicleLikely: true,
            vehicleMatchConfidence: 95,
            damageDetected: false,
            summary: "No reliable new damage is visible in this synthetic workflow check.",
            changes: [],
            limitations: []
        }));
        return {
            ok: true,
            status: 200,
            json: async () => ({
                candidates: [{ content: { parts: [{ text: JSON.stringify({ comparisons }) }] } }]
            })
        };
    };

    try {
        const retry = await invoke(retryReturnDamageAnalysis, {
            user: host,
            params: { bookingId }
        });
        assert.equal(retry.body.data.analysis.overallAssessment.damageDetected, false);
        assert.equal(retry.body.data.analysis.angleResults.length, 8);
        assert.equal(comparisonRequestCount, 4);
    } finally {
        global.fetch = originalFetch;
    }

    await invoke(confirmReturn, {
        user: host,
        params: { bookingId },
        body: { notes: "Synthetic return confirmed." }
    });
    const completedBooking = await Booking.findOne({ bookingId }).lean();
    assert.equal(completedBooking.status, "completed");
    assert.equal(completedBooking.returnStatus, "confirmed");
    assert.equal(completedBooking.returnInspection.photos.length, 8);
    assert.equal((await DriverReservation.countDocuments({ bookingId })), 0);
    assert.equal((await CarReservation.countDocuments({ bookingId })), 0);

    console.log("PASS: isolated rental workflow completed (booking, signed Test Mode webhook, driver assignment, pickup and return photos, AI outage recovery and retry, private photo access, host confirmations, reservation release).");
}

run()
    .catch(error => {
        console.error(`Driver workflow check failed: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        try {
            if (mongoose.connection.readyState === 1 && mongoose.connection.name === databaseName) {
                await mongoose.connection.dropDatabase();
            }
        } catch (error) {
            console.error(`Isolated database cleanup failed: ${error.message}`);
            process.exitCode = 1;
        }
        await mongoose.disconnect().catch(() => {});
        await fs.rm(uploadRoot, { recursive: true, force: true }).catch(() => {});
    });
