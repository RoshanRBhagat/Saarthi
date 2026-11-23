const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { createRateLimiter } = require("../middleware/rateLimit");
const { getTrustProxyHops } = require("../services/runtimeConfig");

function makeResponse() {
    return {
        headers: {},
        statusCode: 200,
        body: null,
        setHeader(name, value) { this.headers[name] = value; return this; },
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
}

test("auth rate limiter blocks excess attempts per client and resets after the window", () => {
    let currentTime = 1_000;
    const limit = createRateLimiter({ windowMs: 1_000, max: 2, now: () => currentTime });
    const request = ip => ({ ip });
    const pass = ip => {
        const response = makeResponse();
        let continued = false;
        limit(request(ip), response, () => { continued = true; });
        return { response, continued };
    };

    assert.equal(pass("192.0.2.1").continued, true);
    assert.equal(pass("192.0.2.1").continued, true);
    const blocked = pass("192.0.2.1");
    assert.equal(blocked.continued, false);
    assert.equal(blocked.response.statusCode, 429);
    assert.equal(blocked.response.headers["Retry-After"], "1");
    assert.equal(pass("192.0.2.2").continued, true);

    currentTime = 2_000;
    assert.equal(pass("192.0.2.1").continued, true);
});

test("authentication routes apply independent registration and login limits", () => {
    const routeSource = fs.readFileSync(path.resolve(__dirname, "../routes/authRoutes.js"), "utf8");
    assert.match(routeSource, /"\/register",\s*registerRateLimit,\s*registerUser/);
    assert.match(routeSource, /"\/login",\s*loginRateLimit,\s*loginUser/);
});

test("paid AI routes are limited before JSON body parsing", () => {
    const serverSource = fs.readFileSync(path.resolve(__dirname, "../server.js"), "utf8");
    const limiterSetup = serverSource.indexOf('app.use("/api/ai-trip", aiTripRateLimit)');
    const recommendationLimiterSetup = serverSource.indexOf('app.use("/api/recommendations", recommendationRateLimit)');
    const jsonParserSetup = serverSource.indexOf("express.json({");
    assert.ok(limiterSetup >= 0, "AI trip planning should be rate limited.");
    assert.ok(jsonParserSetup >= 0 && limiterSetup < jsonParserSetup, "AI limits must run before JSON bodies are parsed.");
    assert.ok(recommendationLimiterSetup >= 0 && recommendationLimiterSetup < jsonParserSetup, "Recommendation limits must run before JSON bodies are parsed.");
    assert.match(serverSource, /app\.use\("\/api\/damage-detection", damageDetectionRateLimit\)/);
    assert.match(serverSource, /app\.use\("\/api\/recommendations", recommendationRateLimit\)/);
    assert.match(serverSource, /app\.use\(\s*"\/api\/bookings\/host\/:bookingId\/inspection\/return\/retry-analysis",\s*damageComparisonRetryRateLimit\s*\)/);
    assert.match(serverSource, /app\.use\(\s*"\/api\/recommendations",\s*recommendationRoutes\s*\)/);
});

test("AI rate limits enforce distinct hourly budgets by client", () => {
    const {
        aiTripRateLimit,
        damageDetectionRateLimit,
        damageComparisonRetryRateLimit,
        recommendationRateLimit
    } = require("../middleware/aiRateLimit");
    const exercise = (limit, ip, allowedCount) => {
        let blocked = null;
        for (let index = 0; index <= allowedCount; index += 1) {
            const response = makeResponse();
            let continued = false;
            limit({ ip }, response, () => { continued = true; });
            if (!continued) blocked = response;
        }
        return blocked;
    };

    const tripBlocked = exercise(aiTripRateLimit, "192.0.2.111", 20);
    const damageBlocked = exercise(damageDetectionRateLimit, "192.0.2.112", 12);
    const retryBlocked = exercise(damageComparisonRetryRateLimit, "192.0.2.113", 12);
    const recommendationsBlocked = exercise(recommendationRateLimit, "192.0.2.114", 60);
    assert.equal(tripBlocked.statusCode, 429);
    assert.match(tripBlocked.body.message, /AI trip/);
    assert.equal(damageBlocked.statusCode, 429);
    assert.match(damageBlocked.body.message, /damage analyses/);
    assert.equal(retryBlocked.statusCode, 429);
    assert.match(retryBlocked.body.message, /comparison retries/);
    assert.equal(recommendationsBlocked.statusCode, 429);
    assert.match(recommendationsBlocked.body.message, /recommendation requests/);
});

test("trusted proxy hop configuration accepts only bounded non-negative integers", () => {
    assert.equal(getTrustProxyHops({}), 0);
    assert.equal(getTrustProxyHops({ TRUST_PROXY_HOPS: "2" }), 2);
    assert.throws(() => getTrustProxyHops({ TRUST_PROXY_HOPS: "1.5" }), /non-negative integer/);
    assert.throws(() => getTrustProxyHops({ TRUST_PROXY_HOPS: "11" }), /between 0 and 10/);
});
