/* =========================================================
   SAARTHI AI DAMAGE DETECTION
   Before/After vehicle image comparison using Gemini Vision
========================================================= */

const GEMINI_MODELS = [
    process.env.GEMINI_DAMAGE_MODEL ||
        "gemini-3.6-flash",

    "gemini-3.5-flash-lite"
];

const MAX_IMAGE_BYTES =
    5 * 1024 * 1024;


/* =========================================================
   IMAGE HELPERS
========================================================= */

function parseImageDataUrl(dataUrl) {

    if (
        typeof dataUrl !== "string" ||
        !dataUrl.trim()
    ) {

        throw new Error(
            "Vehicle image is required."
        );
    }

    const match =
        dataUrl.match(
            /^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i
        );

    if (!match) {

        throw new Error(
            "Only JPG, PNG or WebP images are supported."
        );
    }

    const mimeType =
        match[1]
            .toLowerCase()
            .replace(
                "image/jpg",
                "image/jpeg"
            );

    const base64Data =
        match[2]
            .replace(/\s/g, "");

    if (!base64Data) {

        throw new Error(
            "The uploaded image is empty."
        );
    }


    let buffer;

    try {

        buffer =
            Buffer.from(
                base64Data,
                "base64"
            );

    } catch (error) {

        throw new Error(
            "Invalid image data."
        );
    }


    if (
        !buffer.length
    ) {

        throw new Error(
            "Invalid image data."
        );
    }


    if (
        buffer.length >
        MAX_IMAGE_BYTES
    ) {

        throw new Error(
            "Each image must be 5 MB or smaller."
        );
    }


    return {
        mimeType,
        base64Data,
        bytes: buffer.length
    };
}


/* =========================================================
   JSON PARSER
========================================================= */

function parseGeminiJson(text) {

    if (!text) {

        throw new Error(
            "Gemini returned an empty response."
        );
    }


    let cleaned =
        String(text).trim();


    /*
        Gemini can occasionally return
        a fenced JSON block.
    */

    if (
        cleaned.startsWith("```")
    ) {

        cleaned =
            cleaned
                .replace(
                    /^```(?:json)?\s*/i,
                    ""
                )
                .replace(
                    /\s*```$/,
                    ""
                )
                .trim();
    }


    try {

        return JSON.parse(
            cleaned
        );

    } catch (error) {

        console.error(
            "Gemini raw damage response:",
            text
        );

        throw new Error(
            "Gemini returned invalid damage-analysis JSON."
        );
    }
}


/* =========================================================
   GEMINI REQUEST
========================================================= */

async function analyzeWithGemini({

    beforeImage,

    afterImage

}) {

    const apiKey =
        process.env.GEMINI_API_KEY;


    if (!apiKey) {

        const error =
            new Error(
                "GEMINI_API_KEY is not configured in backend/.env."
            );

        error.code =
            "GEMINI_CONFIG_MISSING";

        throw error;
    }


    const prompt = `

You are Saarthi AI Vehicle Damage Inspector.

You are comparing two photographs of the SAME vehicle.

IMAGE 1 = BEFORE RENTAL
IMAGE 2 = AFTER RENTAL

Your job is to identify visible changes that may represent
new vehicle damage between the before and after photographs.

IMPORTANT:

1. Compare ONLY visible evidence.
2. Do not invent damage.
3. Do not assume that an unclear area is damaged.
4. Existing damage visible in the BEFORE image should NOT be
   classified as new damage.
5. Ignore differences caused by lighting, shadows, reflections,
   camera angle, dirt or image quality when reasonably possible.
6. If the two images show different vehicles or substantially
   different views, say so.
7. Be conservative.
8. This is an AI visual inspection, not a legal insurance
   assessment.
9. Give a confidence level for every detected change.
10. Damage categories can include:
    - scratch
    - dent
    - crack
    - broken part
    - paint damage
    - glass damage
    - tyre/wheel damage
    - bumper damage
    - mirror damage
    - light damage
    - other
11. Severity should be:
    - none
    - minor
    - moderate
    - severe
12. Return ONLY valid JSON.

Use this exact JSON structure:

{
    "vehicleMatch": {
        "sameVehicleLikely": true,
        "confidence": 0,
        "reason": "string"
    },

    "overallAssessment": {
        "damageDetected": true,
        "severity": "minor",
        "confidence": 0,
        "summary": "string"
    },

    "beforeCondition": {
        "summary": "string",
        "visibleExistingIssues": []
    },

    "afterCondition": {
        "summary": "string"
    },

    "changes": [
        {
            "area": "front bumper",
            "type": "scratch",
            "description": "string",
            "severity": "minor",
            "confidence": 0,
            "newDamageLikely": true
        }
    ],

    "recommendedAction": "string",

    "limitations": [
        "string"
    ]
}

Confidence must be a number from 0 to 100.

If there is no reliable evidence of new damage:

"damageDetected": false

and:

"changes": []

`;

    let lastError = null;


    for (
        const model of GEMINI_MODELS
    ) {

        try {

            console.log(
                `Saarthi Damage AI: trying ${model}...`
            );


            const response =
                await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json",

                            "x-goog-api-key":
                                apiKey
                        },

                        body:
                            JSON.stringify({

                                contents: [

                                    {
                                        role: "user",

                                        parts: [

                                            {
                                                text:
                                                    prompt
                                            },

                                            {
                                                inlineData: {

                                                    mimeType:
                                                        beforeImage.mimeType,

                                                    data:
                                                        beforeImage.base64Data
                                                }
                                            },

                                            {
                                                text:
                                                    "IMAGE 2 — AFTER RENTAL"
                                            },

                                            {
                                                inlineData: {

                                                    mimeType:
                                                        afterImage.mimeType,

                                                    data:
                                                        afterImage.base64Data
                                                }
                                            }
                                        ]
                                    }
                                ],

                                generationConfig: {

                                    responseMimeType:
                                        "application/json",

                                    temperature:
                                        0.2,

                                    maxOutputTokens:
                                        6000
                                }
                            })
                    }
                );


            const result =
                await response.json();


            if (!response.ok) {

                const message =
                    result
                        ?.error
                        ?.message ||
                    "Gemini damage analysis failed.";

                console.error(
                    `Damage model ${model} failed:`,
                    message
                );

                lastError =
                    new Error(
                        message
                    );

                lastError.status =
                    response.status;


                /*
                    Retry another model when
                    Gemini is temporarily overloaded
                    or rate limited.
                */

                if (
                    response.status === 429 ||
                    response.status === 503
                ) {

                    continue;
                }

                throw lastError;
            }


            const responseText =
                result
                    ?.candidates?.[0]
                    ?.content?.parts
                    ?.map(
                        part =>
                            part.text || ""
                    )
                    .join("")
                    .trim();


            if (!responseText) {

                lastError =
                    new Error(
                        "Gemini returned no damage analysis."
                    );

                continue;
            }


            const analysis =
                parseGeminiJson(
                    responseText
                );


            console.log(
                `Saarthi Damage AI: ${model} succeeded.`
            );


            return analysis;

        } catch (error) {

            console.error(
                `Damage model ${model} error:`,
                error.message
            );

            lastError =
                error;
        }
    }


    throw (
        lastError ||
        new Error(
            "All damage-detection models are temporarily unavailable."
        )
    );
}


/* =========================================================
   MAIN SERVICE
========================================================= */

async function detectDamage({

    beforeImage,

    afterImage

}) {

    const before =
        parseImageDataUrl(
            beforeImage
        );

    const after =
        parseImageDataUrl(
            afterImage
        );


    const totalBytes =
        before.bytes +
        after.bytes;


    /*
        Keep total image payload comfortably below
        Gemini's documented 20 MB inline request limit.
    */

    if (
        totalBytes >
        9 * 1024 * 1024
    ) {

        throw new Error(
            "The combined before/after images are too large. Please use smaller photos."
        );
    }


    const analysis =
        await analyzeWithGemini({

            beforeImage:
                before,

            afterImage:
                after
        });


    return {

        success: true,

        analysis,

        inspectedAt:
            new Date().toISOString(),

        imageInfo: {

            beforeBytes:
                before.bytes,

            afterBytes:
                after.bytes
        }
    };
}


module.exports = {
    detectDamage
};