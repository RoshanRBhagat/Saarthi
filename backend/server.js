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


const Razorpay =
    require("razorpay");


/* =========================================================
   ROUTES
========================================================= */

const carRoutes =
    require("./routes/carRoutes");


const bookingRoutes =
    require("./routes/bookingRoutes");


const paymentRoutes =
    require("./routes/paymentRoutes");


/* =========================================================
   EXPRESS APP
========================================================= */

const app =
    express();


/* =========================================================
   CONFIGURATION
========================================================= */

const PORT =
    process.env.PORT || 5000;


const MONGODB_URI =
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/saarthi";


/* =========================================================
   RAZORPAY
========================================================= */

const razorpay =
    new Razorpay({

        key_id:
            process.env.RAZORPAY_KEY_ID,

        key_secret:
            process.env.RAZORPAY_KEY_SECRET

    });


/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(
    express.json()
);


app.use(
    express.urlencoded({
        extended: true
    })
);


/* =========================================================
   API ROUTES
========================================================= */


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


/* ---------- Payment APIs ---------- */

app.use(
    "/api/payments",
    paymentRoutes
);


/* =========================================================
   UPLOADS
========================================================= */

app.use(
    "/uploads",
    express.static(
        path.join(
            __dirname,
            "uploads"
        )
    )
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

        const configured =
            Boolean(
                process.env.RAZORPAY_KEY_ID &&
                process.env.RAZORPAY_KEY_SECRET
            );


        return res.json({

            success:
                true,

            configured,

            keyId:
                process.env.RAZORPAY_KEY_ID ||
                null

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

async function startServer() {

    try {

        /* -------------------------------------------------
           CONNECT MONGODB
        ------------------------------------------------- */

        await mongoose.connect(
            MONGODB_URI
        );


        console.log(
            "MongoDB connected."
        );


        /* -------------------------------------------------
           RAZORPAY CHECK
        ------------------------------------------------- */

        if (
            process.env.RAZORPAY_KEY_ID &&
            process.env.RAZORPAY_KEY_SECRET
        ) {

            console.log(
                "Razorpay configuration loaded."
            );

        } else {

            console.warn(
                "Warning: Razorpay keys are not configured."
            );

        }


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

startServer();