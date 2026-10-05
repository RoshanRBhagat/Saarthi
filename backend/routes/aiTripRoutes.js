const express = require("express");

const {
    createTripPlan
} = require("../controllers/aiTripController");

const router = express.Router();

router.post("/plan", createTripPlan);

module.exports = router;