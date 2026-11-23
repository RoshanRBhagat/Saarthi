const test = require("node:test");
const assert = require("node:assert/strict");

const previousConfiguredModel = process.env.GEMINI_DAMAGE_MODEL;
process.env.GEMINI_DAMAGE_MODEL = "test-model";
const { detectDamage } = require("../services/damageDetectionService");
if (previousConfiguredModel === undefined) delete process.env.GEMINI_DAMAGE_MODEL;
else process.env.GEMINI_DAMAGE_MODEL = previousConfiguredModel;

test("Gemini damage detection sends both images with a timeout and parses the analysis", async () => {
    const previousApiKey = process.env.GEMINI_API_KEY;
    const originalFetch = global.fetch;
    process.env.GEMINI_API_KEY = "test-only-key";

    const analysis = {
        vehicleMatch: { sameVehicleLikely: true, confidence: 90, reason: "Matching illustration." },
        overallAssessment: { damageDetected: true, severity: "minor", confidence: 82, summary: "A small mark appeared." },
        beforeCondition: { summary: "No visible mark.", visibleExistingIssues: [] },
        afterCondition: { summary: "A small mark is visible on the door." },
        changes: [{ area: "door", type: "scratch", description: "A short mark is visible.", severity: "minor", confidence: 82, newDamageLikely: true }],
        recommendedAction: "Review the image pair.",
        limitations: []
    };
    let requestSignal;
    let requestBody;
    let requestUrl;
    global.fetch = async (url, options) => {
        requestUrl = url;
        requestSignal = options.signal;
        requestBody = JSON.parse(options.body);
        return {
            ok: true,
            json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(analysis) }] } }] })
        };
    };

    try {
        const image = "data:image/png;base64,dGVzdA==";
        const result = await detectDamage({ beforeImage: image, afterImage: image });

        assert.equal(requestSignal instanceof AbortSignal, true);
        assert.equal(requestSignal.aborted, false);
        assert.equal(requestUrl.includes("/test-model:"), true);
        assert.deepEqual(result.analysis, analysis);
        assert.equal(result.imageInfo.beforeBytes, 4);
        assert.equal(result.imageInfo.afterBytes, 4);
        const imageParts = requestBody.contents[0].parts.filter(part => part.inlineData);
        assert.deepEqual(imageParts.map(part => part.inlineData.mimeType), ["image/png", "image/png"]);
        assert.deepEqual(imageParts.map(part => part.inlineData.data), ["dGVzdA==", "dGVzdA=="]);
    } finally {
        global.fetch = originalFetch;
        if (previousApiKey === undefined) delete process.env.GEMINI_API_KEY;
        else process.env.GEMINI_API_KEY = previousApiKey;
    }
});

test("Gemini damage detection rejects unsupported images before contacting the provider", async () => {
    const originalFetch = global.fetch;
    let fetchCalled = false;
    global.fetch = async () => {
        fetchCalled = true;
        throw new Error("Provider must not be called for invalid input.");
    };

    try {
        await assert.rejects(
            detectDamage({ beforeImage: "data:image/svg+xml;base64,dGVzdA==", afterImage: "data:image/png;base64,dGVzdA==" }),
            /Only JPG, PNG or WebP images are supported/
        );
        assert.equal(fetchCalled, false);
    } finally {
        global.fetch = originalFetch;
    }
});
