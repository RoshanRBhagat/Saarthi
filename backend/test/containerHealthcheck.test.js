const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { isApplicationHealthy } = require("../scripts/containerHealthcheck");

test("container health check follows the platform-provided port", async () => {
    let requestedUrl = "";
    const healthy = await isApplicationHealthy(async url => {
        requestedUrl = url;
        return { ok: true };
    }, "10000");

    assert.equal(healthy, true);
    assert.equal(requestedUrl, "http://127.0.0.1:10000/api/health");
});

test("container health check fails closed for degraded health and network errors", async () => {
    assert.equal(await isApplicationHealthy(async () => ({ ok: false }), "5000"), false);
    assert.equal(await isApplicationHealthy(async () => { throw new Error("offline"); }, "5000"), false);
});

test("Dockerfile runs the tested dynamic-port health check script", () => {
    const dockerfile = fs.readFileSync(path.resolve(__dirname, "../../Dockerfile"), "utf8");
    assert.match(dockerfile, /HEALTHCHECK[^\r\n]*CMD \["node", "scripts\/containerHealthcheck\.js"\]/);
});
