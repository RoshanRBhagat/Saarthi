const {
    planTrip
} = require("../services/aiTripService");


async function createTripPlan(req, res) {

    try {

        const result =
            await planTrip(req.body || {});

        return res.json({
            success: true,
            ...result
        });

    } catch (error) {

        console.error(
            "AI trip planner error:",
            error
        );

        if (
            error.code ===
            "GEMINI_CONFIG_MISSING"
        ) {

            return res.status(503).json({
                success: false,
                message:
                    "AI Trip Planner is not configured. Add GEMINI_API_KEY to backend/.env."
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
                "Unable to generate trip plan."
        });
    }
}


module.exports = {
    createTripPlan
};