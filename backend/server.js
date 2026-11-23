/* =========================================================
   SAARTHI - BACKEND SERVER
========================================================= */


/* =========================================================
   ENVIRONMENT VARIABLES
========================================================= */

require("dotenv").config();


/* =========================================================
   DEPENDENCIES
========================================================= */

const express =
    require("express");


const mongoose =
    require("mongoose");


const path =
    require("path");
const { getCarUploadsDir, getLegacyCarUploadsDir } = require("./services/storagePaths");
const { getHealthStatus } = require("./services/healthStatus");
const { getMissingProductionVariables, getTrustProxyHops } = require("./services/runtimeConfig");
const { isUploadStorageWritable } = require("./services/storageHealth");
const { getRazorpayTestPublicKey } = require("./services/razorpayMode");
const { reconcileCarDateReservations } = require("./services/carReservationService");
const { reconcileDriverDateReservations } = require("./services/driverReservationService");


/* =========================================================
   ROUTES
========================================================= */

const aiTripRoutes =
    require("./routes/aiTripRoutes");

const carRoutes =
    require("./routes/carRoutes");


const bookingRoutes =
    require("./routes/bookingRoutes");


const paymentRoutes =
    require("./routes/paymentRoutes");

const authRoutes =
    require("./routes/authRoutes");

const damageDetectionRoutes =
    require("./routes/damageDetectionRoutes");
const recommendationRoutes =
    require("./routes/recommendationRoutes");
const {
    aiTripRateLimit,
    damageDetectionRateLimit,
    damageComparisonRetryRateLimit,
    recommendationRateLimit
} = require("./middleware/aiRateLimit");
const driverRoutes = require("./routes/driverRoutes");
const CarReservation = require("./models/CarReservation");
const RazorpayWebhookEvent = require("./models/RazorpayWebhookEvent");
const DriverReservation = require("./models/DriverReservation");

/* =========================================================
   EXPRESS APP
========================================================= */

const app =
    express();

const {
    setSecurityHeaders,
    preventApiCaching
} = require("./middleware/securityHeaders");

app.use(setSecurityHeaders);
app.use("/api", preventApiCaching);

async function runReservationRecovery() {
    try {
        const recovered = await reconcileCarDateReservations();
        const driverRecovered = await reconcileDriverDateReservations();
        if (recovered.activated || recovered.released || driverRecovered.activated || driverRecovered.released) {
            console.info("Booking reservation recovery completed.", { cars: recovered, drivers: driverRecovered });
        }
    } catch (error) {
        console.error("Car reservation recovery failed:", error.message);
    }
}

function secureCarUploadHeaders(response) {
    response.setHeader("X-Content-Type-Options", "nosniff");
}

app.get("/api/health", async (req, res) => {
    const storageWritable = await isUploadStorageWritable();
    const health = getHealthStatus(mongoose.connection.readyState, storageWritable);
    return res.status(health.httpStatus).json(health.body);
});


/* =========================================================
   CONFIGURATION
========================================================= */

const PORT =
    process.env.PORT || 5000;


const MONGODB_URI =
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/saarthi";


/* =========================================================
   MIDDLEWARE
========================================================= */

// Preserve exact signed bytes for Razorpay before the JSON parser consumes the body.
app.use(
    "/api/payments/webhook",
    express.raw({ type: "application/json", limit: "1mb" })
);

// Limit paid AI requests before JSON parsing to reduce provider and parser abuse.
app.use("/api/ai-trip", aiTripRateLimit);
app.use("/api/damage-detection", damageDetectionRateLimit);
app.use("/api/recommendations", recommendationRateLimit);
app.use(
    "/api/bookings/host/:bookingId/inspection/return/retry-analysis",
    damageComparisonRetryRateLimit
);

app.use(
    express.json({
        limit: "16mb"
    })
);


app.use(
    express.urlencoded({
        extended: true
    })
);


/* =========================================================
   API ROUTES
========================================================= */


/* ---------- Authentication APIs ---------- */

app.use(
    "/api/auth",
    authRoutes
);

/* ---------- Car APIs ---------- */

app.use(
    "/api/cars",
    carRoutes
);


/* ---------- Booking APIs ---------- */

app.use(
    "/api/bookings",
    bookingRoutes
);

app.use(
    "/api/ai-trip",
    aiTripRoutes
);

app.use(
    "/api/damage-detection",
    damageDetectionRoutes
);

app.use(
    "/api/recommendations",
    recommendationRoutes
);


/* ---------- Payment APIs ---------- */

app.use(
    "/api/payments",
    paymentRoutes
);

app.use("/api/drivers", driverRoutes);


/* =========================================================
   UPLOADS
========================================================= */

// Car listing images are public. Inspection evidence lives under
// uploads/damage and is served only through the authenticated inspection-photo API.
app.use(
    "/uploads/cars",
    express.static(
        getCarUploadsDir(),
        {
            fallthrough: true,
            maxAge: "1h",
            setHeaders: secureCarUploadHeaders
        }
    )
);

app.use(
    "/uploads/cars",
    express.static(getLegacyCarUploadsDir(), {
        fallthrough: true,
        maxAge: "1h",
        setHeaders: secureCarUploadHeaders
    })
);


/* =========================================================
   FRONTEND
========================================================= */

const frontendPath =
    path.join(
        __dirname,
        "..",
        "frontend"
    );


app.use(
    express.static(
        frontendPath
    )
);


/* =========================================================
   HOME PAGE
========================================================= */

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                frontendPath,
                "index.html"
            )
        );

    }
);


/* =========================================================
   RAZORPAY CONFIG TEST
========================================================= */

app.get(
    "/api/payment/config",
    (req, res) => {

        const keyId = getRazorpayTestPublicKey();


        return res.json({

            success:
                true,

            configured: Boolean(keyId),

            keyId

        });

    }
);


/* =========================================================
   API 404 HANDLER
========================================================= */

app.use(
    (req, res, next) => {

        if (
            req.path.startsWith(
                "/api/"
            )
        ) {

            return res.status(404).json({

                success:
                    false,

                message:
                    "API route not found."

            });

        }


        next();

    }
);


/* =========================================================
   GENERAL ERROR HANDLER
========================================================= */

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        console.error(
            "Unhandled server error:",
            error
        );


        return res.status(500).json({

            success:
                false,

            message:
                "Internal server error."

        });

    }
);


/* =========================================================
   START SERVER
========================================================= */

let initializationPromise;

async function initializeApp() {
    if (mongoose.connection.readyState === 1) return;
    if (initializationPromise) return initializationPromise;

    initializationPromise = (async () => {
        app.set("trust proxy", getTrustProxyHops());
        const missingProductionVariables = getMissingProductionVariables();
        if (missingProductionVariables.length > 0) {
            throw new Error(`Missing required production configuration: ${missingProductionVariables.join(", ")}`);
        }

        await mongoose.connect(MONGODB_URI);
        await CarReservation.init();
        await DriverReservation.init();
        await RazorpayWebhookEvent.init();
        await runReservationRecovery();

        if (!process.env.NETLIFY) {
            const reservationRecoveryTimer = setInterval(runReservationRecovery, 60_000);
            reservationRecoveryTimer.unref();
        }

        console.log("MongoDB connected.");
        if (getRazorpayTestPublicKey()) console.log("Razorpay configuration loaded.");
        else console.warn("Warning: Razorpay keys are not configured.");
    })();

    try {
        await initializationPromise;
    } catch (error) {
        initializationPromise = null;
        throw error;
    }
}

async function startServer() {

    try {

        await initializeApp();


        /* -------------------------------------------------
           START EXPRESS SERVER
        ------------------------------------------------- */

        app.listen(
            PORT,
            () => {

                console.log(
                    `Saarthi server running at http://localhost:${PORT}`
                );

            }
        );

    } catch (error) {

        console.error(
            "Server startup failed:",
            error.message
        );


        process.exit(1);

    }

}


/* =========================================================
   START APPLICATION
========================================================= */

if (require.main === module) startServer();

module.exports = { app, initializeApp };
