const Car = require("../models/Car");
const Booking = require("../models/Booking");


const GEMINI_MODELS = [
    process.env.GEMINI_MODEL || "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite"
];


/* =========================================================
   HELPERS
========================================================= */

function clean(value) {
    return String(value || "").trim();
}


function normalizeDate(value) {

    const text = clean(value);

    if (!text) {
        return "";
    }

    const date =
        new Date(`${text}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toISOString().slice(0, 10);
}


function calculateDays(startDate, endDate) {

    if (!startDate || !endDate) {
        return 1;
    }

    const start =
        new Date(`${startDate}T00:00:00`);

    const end =
        new Date(`${endDate}T00:00:00`);

    if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        end < start
    ) {
        return 1;
    }

    return (
        Math.floor(
            (end.getTime() - start.getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
    );
}


function escapeRegex(value) {

    return String(value).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}


/* =========================================================
   GEMINI
========================================================= */

async function callGemini(prompt) {

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


    let lastError = null;


    for (
        const model of GEMINI_MODELS
    ) {

        try {

            console.log(
                `Saarthi AI: trying ${model}...`
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

                        body: JSON.stringify({

                            contents: [
                                {
                                    role: "user",

                                    parts: [
                                        {
                                            text: prompt
                                        }
                                    ]
                                }
                            ],

                            generationConfig: {

                                responseMimeType:
                                    "application/json",

                                maxOutputTokens:
                                    12000
                            }
                        })
                    }
                );


            const result =
                await response.json();


            if (!response.ok) {

                const message =
                    result?.error?.message ||
                    "Gemini API request failed.";

                console.error(
                    `Gemini ${model} failed:`,
                    message
                );

                lastError =
                    new Error(message);

                lastError.status =
                    response.status;


                /*
                   429 = rate limit
                   503 = temporary service/model overload

                   Try the next model automatically.
                */

                if (
                    response.status === 429 ||
                    response.status === 503
                ) {

                    continue;
                }

                throw lastError;
            }


            const text =
                result
                    ?.candidates?.[0]
                    ?.content?.parts
                    ?.map(
                        part =>
                            part.text || ""
                    )
                    .join("")
                    .trim();


            if (!text) {

                lastError =
                    new Error(
                        `Gemini ${model} returned an empty response.`
                    );

                continue;
            }


            let data;

            try {

                data =
                    JSON.parse(text);

            } catch (error) {

                console.error(
                    `Invalid JSON from ${model}:`,
                    text
                );

                lastError =
                    new Error(
                        `Gemini ${model} returned invalid JSON.`
                    );

                continue;
            }


            console.log(
                `Saarthi AI: ${model} succeeded.`
            );


            return data;

        } catch (error) {

            console.error(
                `Gemini ${model} error:`,
                error.message
            );

            lastError =
                error;

            continue;
        }
    }


    throw (
        lastError ||
        new Error(
            "All Gemini models are temporarily unavailable."
        )
    );
}


/* =========================================================
   LIVE SAARTHI CARS
========================================================= */

async function getAvailableCars(trip) {

    const filter = {

        status: "available",

        seats: {
            $gte: trip.travelers
        }
    };


    if (trip.origin) {

        const originCity =
            trip.origin
                .split(",")[0]
                .trim();


        if (originCity) {

            filter.city =
                new RegExp(
                    `^${escapeRegex(originCity)}$`,
                    "i"
                );
        }
    }


    let cars =
        await Car.find(filter)
            .sort({
                rating: -1,
                dailyPrice: 1
            })
            .limit(20)
            .lean();


    let availabilityChecked =
        false;


    /* -------------------------------------------------------
       DATE AVAILABILITY
    ------------------------------------------------------- */

    if (
        trip.startDate &&
        trip.endDate &&
        cars.length
    ) {

        const bookings =
            await Booking.find({

                carId: {
                    $in:
                        cars.map(
                            car =>
                                car.carId
                        )
                },

                status: {
                    $in: [
                        "pending",
                        "confirmed"
                    ]
                },

                pickupDate: {
                    $lte:
                        new Date(
                            `${trip.endDate}T23:59:59`
                        )
                },

                returnDate: {
                    $gte:
                        new Date(
                            `${trip.startDate}T00:00:00`
                        )
                }
            })
            .select("carId")
            .lean();


        const busyIds =
            new Set(
                bookings.map(
                    booking =>
                        String(
                            booking.carId
                        )
                )
            );


        cars =
            cars.filter(
                car =>
                    !busyIds.has(
                        String(car.carId)
                    )
            );


        availabilityChecked =
            true;
    }


    return {
        cars,
        availabilityChecked
    };
}


/* =========================================================
   PLAN GENERATOR
========================================================= */

async function generatePlan({

    trip,

    cars,

    availabilityChecked,

    prompt,

    modification,

    previousPlan

}) {

    const liveCars =
        cars.map(car => ({

            carId:
                car.carId,

            make:
                car.make,

            model:
                car.model,

            year:
                car.year,

            category:
                car.category,

            seats:
                car.seats,

            luggageCapacity:
                car.luggageCapacity,

            fuelType:
                car.fuelType,

            transmission:
                car.transmission,

            features:
                Array.isArray(car.features)
                    ? car.features.slice(0, 10)
                    : [],

            city:
                car.city,

            state:
                car.state,

            dailyPrice:
                car.dailyPrice,

            rating:
                car.rating,

            description:
                car.description || ""
        }));


    const previous =
        previousPlan
            ? JSON.stringify(
                previousPlan,
                null,
                2
            )
            : "None";


    const request = {

        userPrompt:
            prompt,

        trip,

        liveSaarthiCars:
            liveCars,

        availabilityChecked,

        modification:
            modification || "",

        previousPlan:
            previous
    };


    const aiPrompt = `

You are Saarthi AI, an intelligent road-trip planner
inside a real Indian car-rental application.

Create a practical trip plan from the information below.

IMPORTANT RULES:

1. Do not invent Saarthi vehicles.
2. The vehicle must be selected ONLY from liveSaarthiCars.
3. Never invent a carId.
4. Respect traveler count.
5. Respect the trip dates and duration.
6. Respect the user's budget.
7. Respect travel style and interests.
8. Build a useful day-by-day itinerary.
9. Keep nearby places together to reduce unnecessary driving.
10. Give realistic cost estimates.
11. Rental cost = dailyPrice × rentalDays.
12. Estimates are planning estimates, not booking quotes.
13. When availabilityChecked=true, only use the supplied available vehicles.
14. When availabilityChecked=false, say that exact-date availability was not checked.
15. When modification is provided, modify the existing plan according to the user's request.
16. Do not invent exact opening times, road conditions or current prices.
17. Return ONLY valid JSON.

The JSON must have this exact structure:

{
  "title": "string",
  "summary": "string",

  "trip": {
    "origin": "string",
    "destination": "string",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "durationDays": 1,
    "travelers": 1,
    "travelStyle": "string",
    "interests": []
  },

  "itinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "title": "string",
      "area": "string",
      "travelNote": "string",

      "activities": [
        {
          "time": "string",
          "name": "string",
          "description": "string",
          "estimatedCost": 0
        }
      ]
    }
  ],

  "routePlan": [
    {
      "from": "string",
      "to": "string",
      "reason": "string"
    }
  ],

  "vehicleRecommendation": {
    "carId": "string",
    "name": "string",
    "reason": "string",
    "dailyPrice": 0,
    "rentalDays": 1,
    "rentalCost": 0,
    "availabilityChecked": true
  },

  "estimatedBudget": {
    "budgetProvided": true,
    "totalBudget": 0,
    "carRental": 0,
    "fuel": 0,
    "tolls": 0,
    "accommodation": 0,
    "food": 0,
    "activities": 0,
    "misc": 0,
    "estimatedTotal": 0,
    "remainingOrOver": 0,
    "note": "string"
  },

  "practicalTips": [],
  "assumptions": []
}

DATA:

${JSON.stringify(
    request,
    null,
    2
)}

`;


    return await callGemini(
        aiPrompt
    );
}


/* =========================================================
   MAIN
========================================================= */

async function planTrip(body) {

    const origin =
        clean(body.origin);

    const destination =
        clean(body.destination);

    const startDate =
        normalizeDate(
            body.startDate
        );

    const endDate =
        normalizeDate(
            body.endDate
        );

    const travelers =
        Number(body.travelers) || 0;

    const budget =
        Number(body.budget) || 0;

    const prompt =
        clean(body.prompt);

    const modification =
        clean(body.modification);

    const previousPlan =
        body.previousPlan || null;


    /* -------------------------------------------------------
       VALIDATION
    ------------------------------------------------------- */

    if (!origin) {

        throw new Error(
            "Starting location is required."
        );
    }

    if (!destination) {

        throw new Error(
            "Destination is required."
        );
    }

    if (!startDate) {

        throw new Error(
            "Trip start date is required."
        );
    }

    if (!endDate) {

        throw new Error(
            "Trip end date is required."
        );
    }

    if (endDate < startDate) {

        throw new Error(
            "Return date cannot be before pickup date."
        );
    }

    if (travelers < 1) {

        throw new Error(
            "At least one traveler is required."
        );
    }


    const durationDays =
        calculateDays(
            startDate,
            endDate
        );


    const preferences =
        Array.isArray(
            body.preferences
        )
            ? body.preferences
                .map(clean)
                .filter(Boolean)
            : [];


    const trip = {

        origin,

        destination,

        startDate,

        endDate,

        durationDays,

        travelers,

        budget,

        travelStyle:
            preferences.join(", ") ||
            "balanced",

        interests:
            preferences,

        specialRequirements:
            []
    };


    /* -------------------------------------------------------
       GET LIVE CARS
    ------------------------------------------------------- */

    const {
        cars,
        availabilityChecked
    } =
        await getAvailableCars(
            trip
        );


    /* -------------------------------------------------------
       GENERATE WITH GEMINI
    ------------------------------------------------------- */

    const plan =
        await generatePlan({

            trip,

            cars,

            availabilityChecked,

            prompt,

            modification,

            previousPlan
        });


    /* -------------------------------------------------------
       SANITY CHECK VEHICLE
    ------------------------------------------------------- */

    let selectedVehicle =
        null;


    if (
        plan
            ?.vehicleRecommendation
            ?.carId
    ) {

        selectedVehicle =
            cars.find(
                car =>
                    String(
                        car.carId
                    ) ===
                    String(
                        plan
                            .vehicleRecommendation
                            .carId
                    )
            );
    }


    if (selectedVehicle) {

        const rentalDays =
            durationDays;

        plan.vehicleRecommendation =
            {

                carId:
                    selectedVehicle.carId,

                name:
                    `${selectedVehicle.make || ""} ${selectedVehicle.model || ""}`
                        .trim(),

                reason:
                    plan
                        .vehicleRecommendation
                        ?.reason ||
                    "Recommended based on trip requirements.",

                dailyPrice:
                    Number(
                        selectedVehicle.dailyPrice
                    ) || 0,

                rentalDays,

                rentalCost:
                    (
                        Number(
                            selectedVehicle.dailyPrice
                        ) || 0
                    ) *
                    rentalDays,

                availabilityChecked
            };
    }


    /* -------------------------------------------------------
       NO VEHICLE
    ------------------------------------------------------- */

    if (!selectedVehicle) {

        plan.vehicleRecommendation = {

            carId: "",

            name:
                "No matching Saarthi vehicle found",

            reason:
                "No live available vehicle matched the trip requirements.",

            dailyPrice: 0,

            rentalDays: durationDays,

            rentalCost: 0,

            availabilityChecked
        };
    }


    /* -------------------------------------------------------
       RETURN
    ------------------------------------------------------- */

    return {

        status:
            "planned",

        request:
            trip,

        plan,

        vehicleCandidates:
            cars.map(
                car => ({

                    carId:
                        car.carId,

                    name:
                        `${car.make || ""} ${car.model || ""}`
                            .trim(),

                    dailyPrice:
                        car.dailyPrice,

                    seats:
                        car.seats,

                    rating:
                        car.rating,

                    availabilityChecked
                })
            ),

        sources: []
    };
}


module.exports = {
    planTrip
};