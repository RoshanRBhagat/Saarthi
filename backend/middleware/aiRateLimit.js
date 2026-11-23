const { createRateLimiter } = require("./rateLimit");

const aiTripRateLimit = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: "Too many AI trip requests. Please try again later."
});

const damageDetectionRateLimit = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 12,
    message: "Too many vehicle damage analyses. Please try again later."
});

const damageComparisonRetryRateLimit = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 12,
    message: "Too many damage comparison retries. Please try again later."
});

const recommendationRateLimit = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 60,
    message: "Too many car recommendation requests. Please try again later."
});

module.exports = {
    aiTripRateLimit,
    damageDetectionRateLimit,
    damageComparisonRetryRateLimit,
    recommendationRateLimit
};
