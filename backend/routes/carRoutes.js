const express = require("express");

const {
    authenticateUser,
    requireHost
} =
    require(
        "../middleware/authMiddleware"
    );

const {
    getAvailableCars,
    getCarById,
    createCar,
    getHostCars,
    updateHostCarStatus,
    updateHostCar
} = require(
    "../controllers/carController"
);


const upload =
    require("../middleware/upload");


const router =
    express.Router();


// =========================================================
// GET ALL AVAILABLE CARS
// GET /api/cars
// =========================================================

router.get(
    "/",
    getAvailableCars
);



// =========================================================
// GET ONE CAR
// GET /api/cars/:carId
// =========================================================

router.get(
    "/host/my-cars",
    authenticateUser,
    requireHost,
    getHostCars
);

/* =========================================================
   UPDATE HOST VEHICLE STATUS
========================================================= */

router.patch(
    "/host/:carId/status",
    authenticateUser,
    requireHost,
    updateHostCarStatus
);

/* =========================================================
   UPDATE HOST VEHICLE
========================================================= */

router.patch(
    "/host/:carId",
    authenticateUser,
    requireHost,
    updateHostCar
);

router.get(
    "/:carId",
    getCarById
);


// =========================================================
// CREATE NEW CAR + IMAGES
// POST /api/cars
// =========================================================

router.post(
    "/",
    authenticateUser,
    requireHost,
    upload.array(
        "carImages",
        8
    ),
    createCar
);


module.exports =
    router;