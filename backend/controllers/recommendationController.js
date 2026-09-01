const Car = require("../models/Car");


// =========================================================
// AI-STYLE CAR RECOMMENDATION ENGINE
// =========================================================
//
// This first version is an explainable recommendation engine.
// It ranks REAL cars from MongoDB instead of inventing cars.
//
// Later we can connect an actual AI/LLM model to interpret
// natural-language trip requests.
//
// Supported inputs:
//
// destination / city
// state
// travelers
// budget
// preferences[]
//
// Example:
//
// {
//     "city": "Nagpur",
//     "state": "Maharashtra",
//     "travelers": 4,
//     "budget": 3000,
//     "preferences": ["Nature", "Adventure"]
// }
// =========================================================


async function recommendCars(req, res) {

    try {

        const {
            city,
            state,
            travelers,
            budget,
            preferences
        } = req.body;


        // =================================================
        // VALIDATE REQUIRED INPUT
        // =================================================

        if (
            !city ||
            !travelers ||
            !budget
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "City, travelers and budget are required."

            });

        }


        const travelerCount =
            Number(travelers);


        const maxBudget =
            Number(budget);


        if (
            !Number.isFinite(
                travelerCount
            ) ||
            travelerCount < 1
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Travelers must be a valid number."

            });

        }


        if (
            !Number.isFinite(
                maxBudget
            ) ||
            maxBudget <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Budget must be a valid positive number."

            });

        }


        // =================================================
        // NORMALIZE PREFERENCES
        // =================================================

        const selectedPreferences =
            Array.isArray(preferences)
                ? preferences.map(
                    preference =>
                        String(
                            preference
                        )
                        .trim()
                        .toLowerCase()
                )
                : [];


        // =================================================
        // FETCH REAL INVENTORY
        // =================================================
        //
        // Hard requirements:
        //
        // - available
        // - city
        // - enough seats
        //
        // Budget is used for scoring rather than as the
        // only hard filter, because a slightly more expensive
        // vehicle may still be the best recommendation.
        // =================================================

        const query = {

            status:
                "available",

            city: {
                $regex:
                    `^${escapeRegex(
                        String(city).trim()
                    )}$`,

                $options:
                    "i"
            },

            seats: {
                $gte:
                    travelerCount
            }

        };


        // -------------------------------------------------
        // Optional state filter
        // -------------------------------------------------

        if (
            state &&
            String(state).trim() !== ""
        ) {

            query.state = {

                $regex:
                    `^${escapeRegex(
                        String(state).trim()
                    )}$`,

                $options:
                    "i"

            };

        }


        const cars =
            await Car.find(
                query
            );


        // =================================================
        // NO MATCHING INVENTORY
        // =================================================

        if (
            cars.length === 0
        ) {

            return res.json({

                success: true,

                count: 0,

                data: [],

                message:
                    "No available vehicles match your location and passenger requirement."

            });

        }


        // =================================================
        // SCORE EACH CAR
        // =================================================

        const scoredCars =
            cars.map(
                (car) => {

                    let score = 0;

                    const reasons = [];


                    const dailyPrice =
                        Number(
                            car.dailyPrice || 0
                        );


                    const seats =
                        Number(
                            car.seats || 0
                        );


                    const category =
                        String(
                            car.category || ""
                        )
                        .toLowerCase();


                    const fuelType =
                        String(
                            car.fuelType || ""
                        )
                        .toLowerCase();


                    const transmission =
                        String(
                            car.transmission || ""
                        )
                        .toLowerCase();


                    const features =
                        Array.isArray(
                            car.features
                        )
                            ? car.features.map(
                                feature =>
                                    String(
                                        feature
                                    ).toLowerCase()
                            )
                            : [];


                    // =================================================
                    // 1. BUDGET MATCH
                    // =================================================

                    if (
                        dailyPrice <=
                        maxBudget
                    ) {

                        score += 30;

                        reasons.push(
                            "Fits your daily budget."
                        );

                    } else {

                        /*
                            Penalize vehicles that exceed budget.
                            The farther above budget, the larger
                            the penalty.
                        */

                        const excessRatio =
                            (
                                dailyPrice -
                                maxBudget
                            ) /
                            maxBudget;


                        score += Math.max(
                            0,
                            30 -
                            Math.round(
                                excessRatio *
                                50
                            )
                        );

                        reasons.push(
                            "Slightly above your daily budget."
                        );

                    }


                    // =================================================
                    // 2. PASSENGER CAPACITY
                    // =================================================

                    if (
                        seats ===
                        travelerCount
                    ) {

                        score += 25;

                        reasons.push(
                            "Passenger capacity matches your group."
                        );

                    } else {

                        const extraSeats =
                            seats -
                            travelerCount;


                        if (
                            extraSeats > 0
                        ) {

                            score +=
                                Math.max(
                                    15 -
                                    extraSeats * 2,
                                    5
                                );

                            reasons.push(
                                `Has ${extraSeats} extra seat${
                                    extraSeats === 1
                                        ? ""
                                        : "s"
                                } for additional comfort.`
                            );

                        }

                    }


                    // =================================================
                    // 3. TRIP PREFERENCE MATCH
                    // =================================================

                    selectedPreferences.forEach(
                        (preference) => {

                            // -----------------------------------------
                            // Adventure
                            // -----------------------------------------

                            if (
                                preference ===
                                "adventure"
                            ) {

                                if (
                                    [
                                        "suv",
                                        "muv",
                                        "offroad"
                                    ].includes(
                                        category
                                    )
                                ) {

                                    score += 12;

                                    reasons.push(
                                        "SUV/MUV style suits an adventure-focused trip."
                                    );

                                }


                                if (
                                    fuelType ===
                                    "diesel"
                                ) {

                                    score += 3;

                                }

                            }


                            // -----------------------------------------
                            // Nature
                            // -----------------------------------------

                            if (
                                preference ===
                                "nature"
                            ) {

                                if (
                                    [
                                        "suv",
                                        "muv"
                                    ].includes(
                                        category
                                    )
                                ) {

                                    score += 10;

                                    reasons.push(
                                        "Vehicle type is well suited to outdoor travel."
                                    );

                                }

                            }


                            // -----------------------------------------
                            // Family
                            // -----------------------------------------

                            if (
                                preference ===
                                "family"
                            ) {

                                if (
                                    seats >=
                                    travelerCount + 1
                                ) {

                                    score += 10;

                                    reasons.push(
                                        "Extra seating gives your family more room."
                                    );

                                }

                            }


                            // -----------------------------------------
                            // Relaxation
                            // -----------------------------------------

                            if (
                                preference ===
                                "relaxation"
                            ) {

                                if (
                                    transmission ===
                                    "automatic"
                                ) {

                                    score += 10;

                                    reasons.push(
                                        "Automatic transmission is convenient for a relaxed drive."
                                    );

                                }

                            }


                            // -----------------------------------------
                            // Romantic
                            // -----------------------------------------

                            if (
                                preference ===
                                "romantic"
                            ) {

                                if (
                                    [
                                        "sedan",
                                        "hatchback"
                                    ].includes(
                                        category
                                    )
                                ) {

                                    score += 8;

                                    reasons.push(
                                        "This vehicle type is a comfortable choice for a couple's trip."
                                    );

                                }

                            }

                        }
                    );


                    // =================================================
                    // 4. EXISTING RATING
                    // =================================================

                    const rating =
                        Number(
                            car.rating || 0
                        );


                    if (
                        rating > 0
                    ) {

                        score +=
                            Math.min(
                                rating * 2,
                                10
                            );

                    }


                    // =================================================
                    // 5. IMAGE AVAILABILITY
                    // =================================================

                    if (
                        Array.isArray(
                            car.images
                        ) &&
                        car.images.length >= 3
                    ) {

                        score += 3;

                    }


                    // =================================================
                    // CAP SCORE
                    // =================================================

                    score =
                        Math.min(
                            Math.round(score),
                            100
                        );


                    // =================================================
                    // UNIQUE REASONS
                    // =================================================

                    const uniqueReasons =
                        [
                            ...new Set(
                                reasons
                            )
                        ];


                    return {

                        car,

                        score,

                        reasons:
                            uniqueReasons.slice(
                                0,
                                5
                            )

                    };

                }
            );


        // =================================================
        // SORT BEST FIRST
        // =================================================

        scoredCars.sort(
            (
                a,
                b
            ) =>
                b.score -
                a.score
        );


        // =================================================
        // RETURN TOP 5
        // =================================================

        const recommendations =
            scoredCars
                .slice(
                    0,
                    5
                )
                .map(
                    ({
                        car,
                        score,
                        reasons
                    }) => ({

                        car,

                        matchScore:
                            score,

                        reasons

                    })
                );


        // =================================================
        // RESPONSE
        // =================================================

        return res.json({

            success: true,

            count:
                recommendations.length,

            data:
                recommendations

        });


    } catch (error) {

        console.error(
            "Recommendation error:",
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to generate car recommendations."

        });

    }

}


// =========================================================
// ESCAPE REGEX
// =========================================================

function escapeRegex(
    value
) {

    return String(value).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );

}


// =========================================================
// EXPORT
// =========================================================

module.exports = {

    recommendCars

};