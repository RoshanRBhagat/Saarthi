const {
    detectDamage
} = require("../services/damageDetectionService");


async function analyzeVehicleDamage(
    req,
    res
) {

    try {

        const {
            beforeImage,
            afterImage
        } = req.body || {};


        if (!beforeImage) {

            return res.status(400).json({
                success: false,
                message:
                    "Before-rental vehicle image is required."
            });
        }


        if (!afterImage) {

            return res.status(400).json({
                success: false,
                message:
                    "After-rental vehicle image is required."
            });
        }


        const result =
            await detectDamage({

                beforeImage,

                afterImage
            });


        return res.json({
            success: true,
            ...result
        });

    } catch (error) {

        console.error(
            "Vehicle damage detection error:",
            error
        );


        if (
            error.code ===
            "GEMINI_CONFIG_MISSING"
        ) {

            return res.status(503).json({

                success: false,

                message:
                    "AI Damage Detection is not configured. Add GEMINI_API_KEY to backend/.env."
            });
        }


        return res.status(
            error.status >= 400 &&
            error.status < 500
                ? error.status
                : 500
        ).json({

            success: false,

            message:
                error.message ||
                "Unable to analyze vehicle damage."
        });
    }
}


module.exports = {
    analyzeVehicleDamage
};