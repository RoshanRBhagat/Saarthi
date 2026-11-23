const test = require("node:test");
const assert = require("node:assert/strict");

const {
    normalizeAngleResult,
    buildOverallReport,
    callGeminiForAngleBatch
} = require("../services/damageComparisonService");

test("damage comparison preserves the valid none severity instead of upgrading it", () => {
    const result = normalizeAngleResult("front", {
        sameVehicleLikely: true,
        vehicleMatchConfidence: 96,
        damageDetected: false,
        summary: "No visible change.",
        changes: [{
            area: "front bumper",
            type: "scratch",
            description: "Possible mark, uncertain.",
            severity: "none",
            confidence: 28,
            newDamageLikely: true
        }]
    });

    assert.equal(result.changes[0].severity, "none");
    assert.equal(result.damageDetected, true);

    const report = buildOverallReport([result]);
    assert.equal(report.overallAssessment.severity, "none");
    assert.equal(report.overallAssessment.damageDetected, true);
});

test("damage comparison uses minor only as a fallback for an invalid severity", () => {
    const result = normalizeAngleResult("rear", {
        changes: [{ severity: "critical", newDamageLikely: true }]
    });

    assert.equal(result.changes[0].severity, "minor");
    assert.equal(result.damageDetected, true);
});

test("damage report does not promote changes without positive new-damage evidence", () => {
    const result = normalizeAngleResult("rear", {
        damageDetected: true,
        changes: [{ area: "bumper", severity: "severe", confidence: 90 }]
    });

    assert.equal(result.damageDetected, false);
    assert.equal(result.changes.length, 0);

    const report = buildOverallReport([result]);
    assert.equal(report.overallAssessment.damageDetected, false);
    assert.equal(report.overallAssessment.severity, "none");
    assert.match(report.overallAssessment.summary, /No reliable new damage/);
});

test("Gemini comparison requests carry an abort timeout and accept structured image results", async () => {
    const previousApiKey = process.env.GEMINI_API_KEY;
    const previousModel = process.env.GEMINI_DAMAGE_MODEL;
    const originalFetch = global.fetch;
    process.env.GEMINI_API_KEY = "test-only-key";
    process.env.GEMINI_DAMAGE_MODEL = "test-model";

    const image = { mimeType: "image/jpeg", data: "dGVzdA==" };
    let requestSignal;
    global.fetch = async (_url, options) => {
        requestSignal = options.signal;
        return {
            ok: true,
            json: async () => ({
                candidates: [{ content: { parts: [{
                    text: JSON.stringify({ comparisons: [{ angle: "front", changes: [] }] })
                }] } }]
            })
        };
    };

    try {
        const result = await callGeminiForAngleBatch(
            ["front"],
            new Map([["front", image]]),
            new Map([["front", image]])
        );
        assert.equal(requestSignal instanceof AbortSignal, true);
        assert.equal(requestSignal.aborted, false);
        assert.equal(result[0].angle, "front");
    } finally {
        global.fetch = originalFetch;
        if (previousApiKey === undefined) delete process.env.GEMINI_API_KEY;
        else process.env.GEMINI_API_KEY = previousApiKey;
        if (previousModel === undefined) delete process.env.GEMINI_DAMAGE_MODEL;
        else process.env.GEMINI_DAMAGE_MODEL = previousModel;
    }
});
