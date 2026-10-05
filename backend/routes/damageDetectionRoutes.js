const express = require("express");

const {
    analyzeVehicleDamage
} = require(
    "../controllers/damageDetectionController"
);

const router =
    express.Router();


router.post(
    "/analyze",
    analyzeVehicleDamage
);


module.exports = router;