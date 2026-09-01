const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config();


// =========================================================
// IMPORT ROUTES
// =========================================================

const carRoutes =
    require("./routes/carRoutes");

const recommendationRoutes =
    require("./routes/recommendationRoutes");

const bookingRoutes =
    require("./routes/bookingRoutes");

const authRoutes =
    require("./routes/authRoutes");


// =========================================================
// CREATE EXPRESS APP
// =========================================================

const app =
    express();


// =========================================================
// ENVIRONMENT VARIABLES
// =========================================================

const PORT =
    process.env.PORT || 5000;

const MONGODB_URI =
    process.env.MONGODB_URI;

const JWT_SECRET =
    process.env.JWT_SECRET;


// =========================================================
// CHECK REQUIRED ENVIRONMENT VARIABLES
// =========================================================

if (!MONGODB_URI) {

    console.error(
        "MONGODB_URI is missing from .env"
    );

    process.exit(1);

}


if (!JWT_SECRET) {

    console.error(
        "JWT_SECRET is missing from .env"
    );

    process.exit(1);

}


// =========================================================
// PROJECT PATHS
// =========================================================

const PROJECT_ROOT =
    path.join(
        __dirname,
        ".."
    );


const FRONTEND_ROOT =
    path.join(
        PROJECT_ROOT,
        "frontend"
    );


const UPLOADS_ROOT =
    path.join(
        __dirname,
        "uploads"
    );


// =========================================================
// MIDDLEWARE
// =========================================================

app.use(
    express.json()
);


// =========================================================
// SERVE FRONTEND
// =========================================================

app.use(
    express.static(
        FRONTEND_ROOT
    )
);


// =========================================================
// SERVE UPLOADED CAR IMAGES
// =========================================================
//
// MongoDB stores paths such as:
//
// /uploads/cars/example.jpg
//
// Express serves those files from:
//
// backend/uploads/cars/
// =========================================================

app.use(
    "/uploads",
    express.static(
        UPLOADS_ROOT
    )
);


// =========================================================
// HOME PAGE
// =========================================================

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                FRONTEND_ROOT,
                "index.html"
            )
        );

    }
);


// =========================================================
// CAR API
// =========================================================

app.use(
    "/api/cars",
    carRoutes
);


// =========================================================
// AI RECOMMENDATION API
// =========================================================

app.use(
    "/api/recommendations",
    recommendationRoutes
);


// =========================================================
// BOOKING API
// =========================================================

app.use(
    "/api/bookings",
    bookingRoutes
);


// =========================================================
// AUTHENTICATION API
// =========================================================

app.use(
    "/api/auth",
    authRoutes
);


// =========================================================
// START SERVER AFTER MONGODB CONNECTION
// =========================================================

mongoose
    .connect(
        MONGODB_URI
    )

    .then(
        () => {

            console.log(
                "MongoDB connected successfully."
            );


            app.listen(
                PORT,
                () => {

                    console.log(
                        `Saarthi server running at http://localhost:${PORT}`
                    );

                }
            );

        }
    )

    .catch(
        (error) => {

            console.error(
                "MongoDB connection failed:",
                error.message
            );

            process.exit(1);

        }
    );