const express = require("express");

const {
    recommendCars
} = require("../controllers/recommendationController");


const router =
    express.Router();


// =========================================================
// AI CAR RECOMMENDATION
// POST /api/recommendations/cars
// =========================================================

router.post(
    "/cars",
    recommendCars
);


module.exports =
    router;