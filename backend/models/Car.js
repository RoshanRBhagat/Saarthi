const mongoose = require("mongoose");

const carSchema = new mongoose.Schema(
    {
        // Unique ID for every car on the Saarthi platform
        carId: {
            type: String,
            required: true,
            unique: true
        },

        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // Basic car information
        make: {
            type: String,
            required: true
        },

        model: {
            type: String,
            required: true
        },

        year: {
            type: Number,
            required: true
        },

        // Type of vehicle
        category: {
            type: String,
            required: true,
            enum: [
                "hatchback",
                "sedan",
                "suv",
                "muv",
                "luxury",
                "ev"
            ]
        },

        // Passenger capacity
        seats: {
            type: Number,
            required: true
        },

        // Approximate luggage capacity
        luggageCapacity: {
            type: Number,
            required: true
        },

        // Fuel information
        fuelType: {
            type: String,
            required: true,
            enum: [
                "petrol",
                "diesel",
                "cng",
                "electric",
                "hybrid"
            ]
        },

        // Transmission type
        transmission: {
            type: String,
            required: true,
            enum: [
                "manual",
                "automatic"
            ]
        },

        // Car features
        features: {
            type: [String],
            default: []
        },

        // All images uploaded by the host
        images: {
            type: [String],
            default: []
        },

        // Main/cover image shown first to customers
        mainImage: {
            type: String,
            default: ""
        },

        // Location of the car
        city: {
            type: String,
            required: true
        },

        state: {
            type: String,
            required: true
        },

        // Rental price per day
        dailyPrice: {
            type: Number,
            required: true
        },

        // Customer rating
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },

        // Number of completed trips
        totalTrips: {
            type: Number,
            default: 0,
            min: 0
        },

        // Current vehicle status
        status: {

            type: String,

            enum: [
                "available",
                "unavailable",
                "archived"
            ],

            default: "available"

        },
        // Optional car description
        description: {
            type: String,
            default: ""
        }
    },

    {
        // Automatically creates createdAt and updatedAt
        timestamps: true
    }
);


// Indexes to make car searching faster
carSchema.index({
    city: 1,
    status: 1
});

carSchema.index({
    dailyPrice: 1
});

carSchema.index({
    seats: 1
});


// Create MongoDB model
const Car = mongoose.model("Car", carSchema);


// Export model
module.exports = Car;