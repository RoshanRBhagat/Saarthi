const mongoose = require("mongoose");
require("dotenv").config();

const Car = require("../models/Car");

const car = {
    carId: "CAR001",

    make: "Mahindra",
    model: "XUV700",

    year: 2025,

    category: "suv",

    seats: 7,

    luggageCapacity: 4,

    fuelType: "petrol",

    transmission: "automatic",

    features: [
        "Large luggage space",
        "Cruise control",
        "Touchscreen",
        "Climate control"
    ],

    images: [
        "https://placehold.co/800x500?text=XUV700+Front",
        "https://placehold.co/800x500?text=XUV700+Side",
        "https://placehold.co/800x500?text=XUV700+Interior"
    ],

    mainImage:
        "https://placehold.co/800x500?text=XUV700+Front",

    city: "Nagpur",

    state: "Maharashtra",

    dailyPrice: 2400,

    rating: 4.8,

    totalTrips: 126,

    status: "available",

    description:
        "Comfortable 7-seater SUV suitable for long road trips."
};


async function addCar() {

    try {

        await mongoose.connect(
            process.env.MONGODB_URI
        );

        console.log(
            "Connected to MongoDB."
        );


        const existingCar =
            await Car.findOne({
                carId: car.carId
            });


        if (existingCar) {

            console.log(
                "CAR001 already exists."
            );

        } else {

            await Car.create(car);

            console.log(
                "CAR001 added successfully."
            );

        }


        await mongoose.disconnect();

        console.log(
            "Disconnected from MongoDB."
        );

    } catch (error) {

        console.error(
            "Error adding car:",
            error.message
        );

    }

}


addCar();