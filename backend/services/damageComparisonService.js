const fs = require("fs/promises");
const path = require("path");

const ANGLES = [
    "front",
    "front-left",
    "left",
    "rear-left",
    "rear",
    "rear-right",
    "right",
    "front-right"
];

const SEVERITY_ORDER = {
    none: 0,
    minor: 1,
    moderate: 2,
    severe: 3
};

function getModelCandidates() {
    const configured =
        process.env.GEMINI_DAMAGE_MODEL ||
        process.env.GEMINI_MODEL ||
        "gemini-3.6-flash";

    return [...new Set([
        configured,
        "gemini-3.6-flash",
        "gemini-3.5-flash-lite"
    ])].filter(Boolean);
}

function getMimeType(filename) {
    const extension = path.extname(filename).toLowerCase();

    if (extension === ".jpg" || extension === ".jpeg") {
        return "image/jpeg";
    }

    if (extension === ".png") {
        return "image/png";
    }

    if (extension === ".webp") {
        return "image/webp";
    }

    throw new Error("Unsupported stored inspection image format.");
}

async function readInspectionImages(bookingId, phase, photos) {
    if (!/^[a-zA-Z0-9_-]+$/.test(String(bookingId))) {
        throw new Error("Invalid booking ID for image comparison.");
    }

    const root = path.resolve(
        __dirname,
        "..",
        "uploads",
        "damage",
        String(bookingId),
        phase
    );

    const storedPhotos = Array.isArray(photos) ? photos : [];
    const map = new Map();

    for (const angle of ANGLES) {
        const photo = storedPhotos.find(item => item && item.angle === angle);

        if (!photo || typeof photo.path !== "string") {
            throw new Error(`Missing ${phase} photo for angle: ${angle}.`);
        }

        const filename = path.basename(photo.path);
        const allowedName = new RegExp(`^${angle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.(jpg|jpeg|png|webp)$`, "i");

        if (!allowedName.test(filename)) {
            throw new Error(`Invalid stored filename for angle: ${angle}.`);
        }

        const absolutePath = path.resolve(root, filename);

        if (!absolutePath.startsWith(root + path.sep)) {
            throw new Error("Invalid inspection image path.");
        }

        const buffer = await fs.readFile(absolutePath);

        map.set(angle, {
            mimeType: getMimeType(filename),
            data: buffer.toString("base64")
        });
    }

    return map;
}

function parseJson(text) {
    const cleaned = String(text || "")
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "");

    try {
        return JSON.parse(cleaned);
    } catch (error) {
        console.error("Gemini damage comparison invalid JSON:", text);
        throw new Error("Gemini returned invalid JSON for the damage comparison.");
    }
}

async function callGeminiForAngleBatch(batchAngles, pickupImages, returnImages) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        const error = new Error("GEMINI_API_KEY is not configured in backend/.env.");
        error.code = "GEMINI_CONFIG_MISSING";
        throw error;
    }

    const instruction = `
You are Saarthi's vehicle condition comparison assistant.
Compare the supplied PICKUP (before rental) and RETURN (after rental) images for each angle.
Each angle has one pickup image and one return image. Compare only matching angles.

Rules:
- Report only visible differences that could be new damage after the rental.
- Existing damage visible at pickup is not new damage.
- Do not mistake lighting, reflections, shadows, dirt, camera angle, or image quality for damage where reasonably avoidable.
- Do not invent an item or claim certainty if evidence is unclear.
- For each angle, return exactly one comparison object, including an empty changes array if no reliable new damage is visible.
- Severity must be none, minor, moderate, or severe.
- Confidence values must be integers from 0 to 100.
- If photos are too unclear or appear to show inconsistent views/vehicles, flag that in summary or limitations.
- This is an AI visual aid, not a legal or insurance determination.
- Return ONLY valid JSON with this shape:
{
  "comparisons": [
    {
      "angle": "front",
      "sameVehicleLikely": true,
      "vehicleMatchConfidence": 0,
      "damageDetected": false,
      "summary": "string",
      "changes": [
        {
          "area": "string",
          "type": "scratch|dent|crack|broken part|paint damage|glass damage|tyre/wheel damage|bumper damage|mirror damage|light damage|other",
          "description": "string",
          "severity": "none|minor|moderate|severe",
          "confidence": 0,
          "newDamageLikely": true
        }
      ],
      "limitations": []
    }
  ]
}
`;

    const parts = [{ text: instruction }];

    for (const angle of batchAngles) {
        parts.push({ text: `PICKUP / BEFORE RENTAL photo — angle: ${angle}` });
        parts.push({ inlineData: pickupImages.get(angle) });
        parts.push({ text: `RETURN / AFTER RENTAL photo — same angle: ${angle}` });
        parts.push({ inlineData: returnImages.get(angle) });
    }

    let lastError;

    for (const model of getModelCandidates()) {
        try {
            console.log(`Saarthi Damage AI: comparing ${batchAngles.join(", ")} with ${model}...`);

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-goog-api-key": apiKey
                    },
                    body: JSON.stringify({
                        contents: [{ role: "user", parts }],
                        generationConfig: {
                            responseMimeType: "application/json",
                            temperature: 0.2,
                            maxOutputTokens: 4500
                        }
                    })
                }
            );

            const result = await response.json();

            if (!response.ok) {
                const message = result?.error?.message || `Gemini returned HTTP ${response.status}.`;
                lastError = new Error(message);
                lastError.status = response.status;
                console.error(`Damage comparison ${model} failed:`, message);

                if ([429, 500, 503, 504].includes(response.status)) {
                    continue;
                }

                throw lastError;
            }

            const text = result?.candidates?.[0]?.content?.parts
                ?.map(part => part.text || "")
                .join("")
                .trim();

            if (!text) {
                lastError = new Error(`Gemini ${model} returned an empty comparison.`);
                continue;
            }

            const data = parseJson(text);
            const comparisons = Array.isArray(data.comparisons) ? data.comparisons : [];

            console.log(`Saarthi Damage AI: ${model} completed ${batchAngles.join(", ")}.`);
            return comparisons;
        } catch (error) {
            lastError = error;
            if (error.code === "GEMINI_CONFIG_MISSING") throw error;
            console.error(`Damage comparison model ${model} error:`, error.message);
        }
    }

    throw lastError || new Error("All damage comparison models are temporarily unavailable.");
}

function normalizeAngleResult(angle, raw) {
    const changes = Array.isArray(raw?.changes)
        ? raw.changes
            .filter(change => change && change.newDamageLikely !== false)
            .map(change => ({
                area: String(change.area || "Unspecified area").slice(0, 160),
                type: String(change.type || "other").slice(0, 60),
                description: String(change.description || "Visible change requires review.").slice(0, 1000),
                severity: SEVERITY_ORDER[change.severity] ? change.severity : "minor",
                confidence: Math.max(0, Math.min(100, Number(change.confidence) || 0)),
                newDamageLikely: change.newDamageLikely === true
            }))
        : [];

    const damageDetected = raw?.damageDetected === true || changes.some(change => change.newDamageLikely);

    return {
        angle,
        sameVehicleLikely: raw?.sameVehicleLikely === true,
        vehicleMatchConfidence: Math.max(0, Math.min(100, Number(raw?.vehicleMatchConfidence) || 0)),
        damageDetected,
        summary: String(raw?.summary || "This angle needs a manual review.").slice(0, 1000),
        changes,
        limitations: Array.isArray(raw?.limitations)
            ? raw.limitations.map(item => String(item).slice(0, 300)).slice(0, 5)
            : []
    };
}

function buildOverallReport(angleResults) {
    const changes = angleResults.flatMap(result =>
        result.changes.map(change => ({ ...change, angle: result.angle }))
    );

    const damageDetected = changes.some(change => change.newDamageLikely === true);
    const severities = changes.map(change => change.severity);
    const severity = severities.reduce(
        (highest, current) =>
            (SEVERITY_ORDER[current] || 0) > (SEVERITY_ORDER[highest] || 0)
                ? current
                : highest,
        "none"
    );

    const damageConfidence = changes.length
        ? Math.round(changes.reduce((sum, item) => sum + item.confidence, 0) / changes.length)
        : Math.round(
            angleResults.reduce((sum, item) => sum + (item.damageDetected ? 55 : 70), 0) /
            Math.max(angleResults.length, 1)
        );

    const matchConfidence = Math.round(
        angleResults.reduce((sum, item) => sum + item.vehicleMatchConfidence, 0) /
        Math.max(angleResults.length, 1)
    );

    const vehicleMatchLikely =
        angleResults.filter(item => item.sameVehicleLikely).length >= Math.ceil(angleResults.length / 2);

    const limitations = [
        ...new Set(angleResults.flatMap(item => item.limitations))
    ];

    limitations.push(
        "AI image comparison can miss damage or mistake changes in lighting and camera position for damage. Review the photos manually before making decisions."
    );

    return {
        status: "completed",
        generatedAt: new Date().toISOString(),
        vehicleMatch: {
            sameVehicleLikely: vehicleMatchLikely,
            confidence: matchConfidence,
            note: "Vehicle similarity is an AI estimate, not identity verification."
        },
        overallAssessment: {
            damageDetected,
            severity,
            confidence: damageConfidence,
            summary: damageDetected
                ? `${changes.length} possible new damage finding(s) identified across the inspection angles. Review each finding and the original photos.`
                : "No reliable new damage was identified from the submitted matching views. This does not guarantee the vehicle is damage-free."
        },
        angleResults,
        changes,
        recommendedAction: damageDetected
            ? "Review the flagged angle photos with the customer and document any agreed findings before deciding on next steps."
            : "Review the complete photo set and confirm the vehicle condition manually.",
        limitations
    };
}

async function compareBookingInspections({ bookingId, pickupPhotos, returnPhotos }) {
    const pickupImages = await readInspectionImages(bookingId, "pickup", pickupPhotos);
    const returnImages = await readInspectionImages(bookingId, "return", returnPhotos);

    const rawResults = [];

    // Four requests compare two corresponding angles at a time, keeping each
    // multimodal request well below the size of uploading all 16 photos together.
    for (let index = 0; index < ANGLES.length; index += 2) {
        const batchAngles = ANGLES.slice(index, index + 2);
        const batchResults = await callGeminiForAngleBatch(
            batchAngles,
            pickupImages,
            returnImages
        );

        for (const angle of batchAngles) {
            const match = batchResults.find(item => item?.angle === angle);
            if (!match) {
                throw new Error(`Gemini did not return a result for the ${angle} angle.`);
            }
            rawResults.push(normalizeAngleResult(angle, match));
        }
    }

    return buildOverallReport(rawResults);
}

module.exports = {
    compareBookingInspections
};
