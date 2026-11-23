const express =
    require("express");


const {
    registerUser,
    loginUser
} =
    require(
        "../controllers/authController"
    );


const router =
    express.Router();

const { createRateLimiter } = require("../middleware/rateLimit");
const registerRateLimit = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 6,
    message: "Too many account creation attempts. Please wait before trying again."
});
const loginRateLimit = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: "Too many sign-in attempts. Please wait before trying again."
});


// =========================================================
// REGISTER
// POST /api/auth/register
// =========================================================

router.post(
    "/register",
    registerRateLimit,
    registerUser
);


// =========================================================
// LOGIN
// POST /api/auth/login
// =========================================================

router.post(
    "/login",
    loginRateLimit,
    loginUser
);


module.exports =
    router;
