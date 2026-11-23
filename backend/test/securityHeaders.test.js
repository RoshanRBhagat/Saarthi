const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { setSecurityHeaders, preventApiCaching } = require("../middleware/securityHeaders");

function makeResponse() {
    return {
        headers: {},
        setHeader(name, value) { this.headers[name.toLowerCase()] = value; }
    };
}

test("browser security headers are set on every response", () => {
    const response = makeResponse();
    let continued = false;

    setSecurityHeaders({}, response, () => { continued = true; });

    assert.equal(continued, true);
    assert.equal(response.headers["x-content-type-options"], "nosniff");
    assert.equal(response.headers["x-frame-options"], "DENY");
    assert.equal(response.headers["referrer-policy"], "strict-origin-when-cross-origin");
    assert.equal(response.headers["permissions-policy"], "camera=(self), geolocation=(self), microphone=()");
});

test("API responses are marked no-store", () => {
    const response = makeResponse();
    let continued = false;

    preventApiCaching({}, response, () => { continued = true; });

    assert.equal(continued, true);
    assert.equal(response.headers["cache-control"], "no-store");
});

test("security and cache middleware are mounted before the health and route handlers", () => {
    const source = fs.readFileSync(path.resolve(__dirname, "../server.js"), "utf8");
    const securityMount = source.indexOf("app.use(setSecurityHeaders)");
    const apiCacheMount = source.indexOf('app.use("/api", preventApiCaching)');
    const healthRoute = source.indexOf('app.get("/api/health"');
    assert.ok(securityMount >= 0 && securityMount < healthRoute);
    assert.ok(apiCacheMount >= 0 && apiCacheMount < healthRoute);
});
