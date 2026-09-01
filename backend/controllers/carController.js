const Car = require("../models/Car");


// =========================================================
// GET AVAILABLE CARS WITH FILTERS
// =========================================================
//
// Supported query parameters:
//
// ?state=Maharashtra
// ?city=Nagpur
// ?travelers=4
// ?maxPrice=3000
//
// Example:
//
// /api/cars?state=Maharashtra&city=Nagpur&travelers=4&maxPrice=3000
// =========================================================

async function getAvailableCars(req, res) {

    try {

        const {
            city,
            state,
            travelers,
            maxPrice
        } = req.query;


        // =================================================
        // BASE QUERY
        // =================================================

        const query = {

            status: "available"

        };


        // =================================================
        // STATE FILTER
        // =================================================

        if (
            state &&
            state.trim() !== ""
        ) {

            query.state = {

                $regex:
                    `^${escapeRegex(
                        state.trim()
                    )}$`,

                $options:
                    "i"

            };

        }


        // =================================================
        // CITY FILTER
        // =================================================

        if (
            city &&
            city.trim() !== ""
        ) {

            query.city = {

                $regex:
                    `^${escapeRegex(
                        city.trim()
                    )}$`,

                $options:
                    "i"

            };

        }


        // =================================================
        // TRAVELER / SEAT FILTER
        // =================================================

        if (
            travelers &&
            travelers.trim() !== ""
        ) {

            const numberOfTravelers =
                Number(
                    travelers
                );


            if (
                !Number.isFinite(
                    numberOfTravelers
                ) ||
                numberOfTravelers < 1
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid travelers value."

                });

            }


            query.seats = {

                $gte:
                    numberOfTravelers

            };

        }


        // =================================================
        // MAX PRICE FILTER
        // =================================================

        if (
            maxPrice &&
            maxPrice.trim() !== ""
        ) {

            const maximumPrice =
                Number(
                    maxPrice
                );


            if (
                !Number.isFinite(
                    maximumPrice
                ) ||
                maximumPrice < 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid maximum price."

                });

            }


            query.dailyPrice = {

                $lte:
                    maximumPrice

            };

        }


        // =================================================
        // FETCH CARS
        // =================================================

        const cars =
            await Car.find(
                query
            ).sort({

                createdAt:
                    -1

            });


        // =================================================
        // RESPONSE
        // =================================================

        return res.json({

            success: true,

            count:
                cars.length,

            data:
                cars

        });


    } catch (error) {

        console.error(
            "Error fetching cars:",
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to fetch cars."

        });

    }

}


// =========================================================
// GET ONE CAR BY CAR ID
// =========================================================
//
// GET /api/cars/:carId
// =========================================================

async function getCarById(
    req,
    res
) {

    try {

        const carId =
            req.params.carId;


        const car =
            await Car.findOne({

                carId,

                status:
                    "available"

            });


        // =================================================
        // NOT FOUND
        // =================================================

        if (
            !car
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Car not found or is no longer available."

            });

        }


        // =================================================
        // RESPONSE
        // =================================================

        return res.json({

            success: true,

            data:
                car

        });


    } catch (error) {

        console.error(
            "Error fetching car:",
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to fetch car details."

        });

    }

}


// =========================================================
// CREATE NEW CAR
// =========================================================
//
// POST /api/cars
//
// This route now requires authentication + host role.
//
// The authenticated host is available through:
//
// req.user
// =========================================================

async function createCar(
    req,
    res
) {

    try {

        const {

            make,
            model,
            year,
            category,
            seats,
            luggageCapacity,
            fuelType,
            transmission,
            city,
            state,
            dailyPrice,
            description

        } = req.body;


        // =================================================
        // AUTHENTICATED USER
        // =================================================

        const user =
            req.user;


        if (
            !user
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Authentication required."

            });

        }


        // =================================================
        // BASIC VALIDATION
        // =================================================

        if (
            !make ||
            !model ||
            !year ||
            !category ||
            !seats ||
            !luggageCapacity ||
            !fuelType ||
            !transmission ||
            !city ||
            !state ||
            dailyPrice === undefined
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please provide all required vehicle details."

            });

        }


        // =================================================
        // NUMERIC VALIDATION
        // =================================================

        const numericYear =
            Number(
                year
            );


        const numericSeats =
            Number(
                seats
            );


        const numericLuggageCapacity =
            Number(
                luggageCapacity
            );


        const numericDailyPrice =
            Number(
                dailyPrice
            );


        if (
            !Number.isFinite(
                numericYear
            ) ||
            numericYear < 1900
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please provide a valid vehicle year."

            });

        }


        if (
            !Number.isFinite(
                numericSeats
            ) ||
            numericSeats < 1
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please provide a valid number of seats."

            });

        }


        if (
            !Number.isFinite(
                numericLuggageCapacity
            ) ||
            numericLuggageCapacity < 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please provide a valid luggage capacity."

            });

        }


        if (
            !Number.isFinite(
                numericDailyPrice
            ) ||
            numericDailyPrice < 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please provide a valid daily rental price."

            });

        }


        // =================================================
        // UPLOADED FILES
        // =================================================

        const uploadedFiles =
            req.files || [];


        const imagePaths =
            uploadedFiles.map(
                (file) => {

                    return (
                        `/uploads/cars/${file.filename}`
                    );

                }
            );


        // =================================================
        // MAIN IMAGE
        // =================================================

        const mainImage =
            imagePaths.length > 0
                ? imagePaths[0]
                : "";


        // =================================================
        // UNIQUE CAR ID
        // =================================================

        const carId =
            "CAR" +
            Date.now();


        // =================================================
        // CREATE CAR
        // =================================================

        const car =
            await Car.create({

                carId,

                // -----------------------------------------
                // HOST OWNER
                // -----------------------------------------

                ownerId:
                    user._id,

                // -----------------------------------------
                // VEHICLE
                // -----------------------------------------

                make:
                    String(
                        make
                    ).trim(),

                model:
                    String(
                        model
                    ).trim(),

                year:
                    numericYear,

                category:
                    String(
                        category
                    ).trim(),

                seats:
                    numericSeats,

                luggageCapacity:
                    numericLuggageCapacity,

                fuelType:
                    String(
                        fuelType
                    ).trim(),

                transmission:
                    String(
                        transmission
                    ).trim(),

                // -----------------------------------------
                // LOCATION
                // -----------------------------------------

                city:
                    String(
                        city
                    ).trim(),

                state:
                    String(
                        state
                    ).trim(),

                // -----------------------------------------
                // PRICE
                // -----------------------------------------

                dailyPrice:
                    numericDailyPrice,

                // -----------------------------------------
                // DESCRIPTION
                // -----------------------------------------

                description:
                    description
                        ? String(
                            description
                        ).trim()
                        : "",

                // -----------------------------------------
                // IMAGES
                // -----------------------------------------

                images:
                    imagePaths,

                mainImage,

                // -----------------------------------------
                // DEFAULT VALUES
                // -----------------------------------------

                status:
                    "available",

                rating:
                    0,

                totalTrips:
                    0

            });


        // =================================================
        // SUCCESS
        // =================================================

        return res.status(201).json({

            success: true,

            message:
                "Car registered successfully.",

            data:
                car

        });


    } catch (error) {

        console.error(
            "Error creating car:",
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to register car.",

            error:
                error.message

        });

    }

}


// =========================================================
// GET HOST'S CARS
// =========================================================
//
// GET /api/cars/host/my-cars
//
// Requires:
//
// authenticateUser
// requireHost
//
// Returns only the vehicles owned by the logged-in host.
// =========================================================

async function getHostCars(
    req,
    res
) {

    try {

        // =================================================
        // AUTHENTICATED HOST
        // =================================================

        const ownerId =
            req.user._id;


        // =================================================
        // FIND HOST VEHICLES
        // =================================================

        const cars =
            await Car.find({

                ownerId

            }).sort({

                createdAt:
                    -1

            });


        // =================================================
        // RESPONSE
        // =================================================

        return res.json({

            success: true,

            count:
                cars.length,

            data:
                cars

        });


    } catch (error) {

        console.error(
            "Error fetching host vehicles:",
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to fetch your vehicles."

        });

    }

}


/* =========================================================
   UPDATE HOST VEHICLE STATUS
========================================================= */

async function updateHostCarStatus(
    req,
    res
) {

    try {

        const carId =
            req.params.carId;


        const {
            status
        } =
            req.body;


        /* -------------------------------------------------
           VALID STATUS
        ------------------------------------------------- */

        const allowedStatuses = [

            "available",

            "unavailable",

            "archived"

        ];


        if (
            !allowedStatuses.includes(
                status
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid vehicle status."

            });

        }


        /* -------------------------------------------------
           FIND VEHICLE BELONGING TO HOST
        ------------------------------------------------- */

        const car =
            await Car.findOne({

                carId,

                ownerId:
                    req.user._id

            });


        if (
            !car
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Vehicle not found in your inventory."

            });

        }


        /* -------------------------------------------------
           UPDATE STATUS
        ------------------------------------------------- */

        car.status =
            status;


        await car.save();


        /* -------------------------------------------------
           RESPONSE
        ------------------------------------------------- */

        return res.json({

            success: true,

            message:
                status === "archived"

                    ? "Vehicle archived successfully."

                    : status === "available"

                        ? "Vehicle is now available."

                        : "Vehicle marked as unavailable.",

            data:
                car

        });


    } catch (error) {

        console.error(
            "Error updating host vehicle status:",
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to update vehicle status."

        });

    }

}

/* =========================================================
   UPDATE HOST VEHICLE
========================================================= */

async function updateHostCar(
    req,
    res
) {

    try {

        const carId =
            req.params.carId;


        const {
            make,
            model,
            year,
            category,
            seats,
            luggageCapacity,
            fuelType,
            transmission,
            city,
            state,
            dailyPrice,
            description
        } = req.body;


        /* -------------------------------------------------
           AUTHENTICATED HOST
        ------------------------------------------------- */

        const ownerId =
            req.user._id;


        /* -------------------------------------------------
           FIND VEHICLE BELONGING TO THIS HOST
        ------------------------------------------------- */

        const car =
            await Car.findOne({

                carId,

                ownerId

            });


        if (
            !car
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Vehicle not found in your inventory."

            });

        }


        /* -------------------------------------------------
           UPDATE ONLY PROVIDED VALUES
        ------------------------------------------------- */

        if (
            make !== undefined
        ) {

            car.make =
                String(
                    make
                ).trim();

        }


        if (
            model !== undefined
        ) {

            car.model =
                String(
                    model
                ).trim();

        }


        if (
            year !== undefined
        ) {

            const numericYear =
                Number(
                    year
                );


            if (
                !Number.isFinite(
                    numericYear
                ) ||
                numericYear < 1900
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please provide a valid vehicle year."

                });

            }


            car.year =
                numericYear;

        }


        if (
            category !== undefined
        ) {

            car.category =
                String(
                    category
                ).trim();

        }


        if (
            seats !== undefined
        ) {

            const numericSeats =
                Number(
                    seats
                );


            if (
                !Number.isFinite(
                    numericSeats
                ) ||
                numericSeats < 1
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please provide a valid number of seats."

                });

            }


            car.seats =
                numericSeats;

        }


        if (
            luggageCapacity !== undefined
        ) {

            const numericLuggage =
                Number(
                    luggageCapacity
                );


            if (
                !Number.isFinite(
                    numericLuggage
                ) ||
                numericLuggage < 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please provide a valid luggage capacity."

                });

            }


            car.luggageCapacity =
                numericLuggage;

        }


        if (
            fuelType !== undefined
        ) {

            car.fuelType =
                String(
                    fuelType
                ).trim();

        }


        if (
            transmission !== undefined
        ) {

            car.transmission =
                String(
                    transmission
                ).trim();

        }


        if (
            city !== undefined
        ) {

            car.city =
                String(
                    city
                ).trim();

        }


        if (
            state !== undefined
        ) {

            car.state =
                String(
                    state
                ).trim();

        }


        if (
            dailyPrice !== undefined
        ) {

            const numericPrice =
                Number(
                    dailyPrice
                );


            if (
                !Number.isFinite(
                    numericPrice
                ) ||
                numericPrice < 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please provide a valid daily rental price."

                });

            }


            car.dailyPrice =
                numericPrice;

        }


        if (
            description !== undefined
        ) {

            car.description =
                String(
                    description
                ).trim();

        }


        /* -------------------------------------------------
           SAVE
        ------------------------------------------------- */

        await car.save();


        /* -------------------------------------------------
           RESPONSE
        ------------------------------------------------- */

        return res.json({

            success: true,

            message:
                "Vehicle updated successfully.",

            data:
                car

        });


    } catch (error) {

        console.error(
            "Error updating host vehicle:",
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to update vehicle."

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
// EXPORTS
// =========================================================

module.exports = {

    getAvailableCars,

    getCarById,

    createCar,

    getHostCars,

    updateHostCarStatus,

    updateHostCar

};