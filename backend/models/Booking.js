const mongoose = require("mongoose");


/* =========================================================
   BOOKING SCHEMA
========================================================= */

const bookingSchema =
    new mongoose.Schema(

        {

            /* ---------------------------------------------
               UNIQUE BOOKING ID
            --------------------------------------------- */

            bookingId: {

                type: String,

                required: true,

                unique: true,

                trim: true

            },


            /* ---------------------------------------------
               CAR
            --------------------------------------------- */

            carId: {

                type: String,

                required: true,

                trim: true

            },


            /* ---------------------------------------------
               USER
               
               Authentication is not connected yet,
               so this remains optional for now.
            --------------------------------------------- */

            userId: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref: "User",

                default: null

            },


            /* ---------------------------------------------
               CUSTOMER DETAILS
            --------------------------------------------- */

            customerName: {

                type: String,

                required: true,

                trim: true

            },


            customerPhone: {

                type: String,

                required: true,

                trim: true

            },


            customerEmail: {

                type: String,

                default: "",

                trim: true,

                lowercase: true

            },


            /* ---------------------------------------------
               RENTAL DATES
            --------------------------------------------- */

            pickupDate: {

                type: Date,

                required: true

            },


            returnDate: {

                type: Date,

                required: true

            },


            totalDays: {

                type: Number,

                required: true,

                min: 1

            },


            /* ---------------------------------------------
               PRICE SNAPSHOT
            --------------------------------------------- */

            dailyPrice: {

                type: Number,

                required: true,

                min: 0

            },


            totalAmount: {

                type: Number,

                required: true,

                min: 0

            },


            /* ---------------------------------------------
               BOOKING STATUS
            --------------------------------------------- */

            status: {

                type: String,

                enum: [

                    "pending",

                    "confirmed",

                    "cancelled",

                    "completed"

                ],

                default: "pending"

            },


            /* ---------------------------------------------
               PAYMENT STATUS
            --------------------------------------------- */

            paymentStatus: {

                type: String,

                enum: [
                    "pending",
                    "paid",
                    "failed",
                    "refunded"
                ],

                default: "pending"

            },


            paymentId: {

                type: String,

                default: ""

            },


            paymentOrderId: {

                type: String,

                default: ""

            },


            paymentSignature: {

                type: String,

                default: ""

            },


            paidAt: {

                type: Date,

                default: null

            },


            /* ---------------------------------------------
               DRIVER-ON-DEMAND
            --------------------------------------------- */

            driverRequired: {

                type: Boolean,

                default: false

            },


            driverId: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref: "Driver",

                default: null

            }

        },

        {

            timestamps: true

        }

    );


/* =========================================================
   EXPORT MODEL
========================================================= */

module.exports =
    mongoose.model(
        "Booking",
        bookingSchema
    );