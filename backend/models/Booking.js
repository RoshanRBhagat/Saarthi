const mongoose = require("mongoose");


/* =========================================================
   VEHICLE INSPECTION PHOTO SCHEMAS
========================================================= */

const inspectionPhotoSchema = new mongoose.Schema(
    {
        angle: {
            type: String,
            enum: [
                "front",
                "front-left",
                "left",
                "rear-left",
                "rear",
                "rear-right",
                "right",
                "front-right"
            ],
            required: true
        },
        path: {
            type: String,
            required: true
        },
        capturedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        _id: false
    }
);

const vehicleInspectionSchema = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: ["pending", "uploading", "completed"],
            default: "pending"
        },
        uploadLeaseToken: {
            type: String,
            default: ""
        },
        uploadLeaseExpiresAt: {
            type: Date,
            default: null
        },
        photos: {
            type: [inspectionPhotoSchema],
            default: []
        },
        completedAt: {
            type: Date,
            default: null
        },
        completedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        notes: {
            type: String,
            default: "",
            trim: true
        },
        aiAnalysis: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },
        aiAnalyzedAt: {
            type: Date,
            default: null
        }
    },
    {
        _id: false
    }
);


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
               COUPON / DISCOUNT SNAPSHOT
            --------------------------------------------- */

            subtotalAmount: {
                type: Number,
                default: 0,
                min: 0
            },

            discountAmount: {
                type: Number,
                default: 0,
                min: 0
            },

            couponCode: {
                type: String,
                default: "",
                trim: true,
                uppercase: true,
                maxlength: 32
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
               PICKUP / VEHICLE HANDOVER
            --------------------------------------------- */

            pickupStatus: {

                type: String,

                enum: [

                    "pending",

                    "confirmed"

                ],

                default: "pending"

            },


            pickupConfirmedAt: {

                type: Date,

                default: null

            },


            pickupNotes: {

                type: String,

                default: "",

                trim: true

            },


            /* ---------------------------------------------
               RETURN / VEHICLE HANDOVER
            --------------------------------------------- */

            returnStatus: {

                type: String,

                enum: [

                    "pending",

                    "confirmed"

                ],

                default: "pending"

            },


            returnConfirmedAt: {

                type: Date,

                default: null

            },


            returnNotes: {

                type: String,

                default: "",

                trim: true

            },


            /* ---------------------------------------------
               PICKUP / RETURN VEHICLE INSPECTIONS
            --------------------------------------------- */

            pickupInspection: {

                type: vehicleInspectionSchema,

                default: () => ({
                    status: "pending",
                    photos: []
                })

            },


            returnInspection: {

                type: vehicleInspectionSchema,

                default: () => ({
                    status: "pending",
                    photos: []
                })

            },


            /* ---------------------------------------------
               PAYMENT STATUS
            --------------------------------------------- */

            paymentStatus: {

                type: String,

                enum: [

                    "pending",

                    "paid",

                    "partially_refunded",

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

            refundStatus: {
                type: String,
                enum: ["none", "pending_review", "processing", "processed", "partially_processed", "rejected", "failed"],
                default: "none"
            },

            refundReason: {
                type: String,
                default: "",
                trim: true,
                maxlength: 500
            },

            refundRequestedAt: {
                type: Date,
                default: null
            },

            refundRequestedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                default: null
            },

            refundAmountPaise: {
                type: Number,
                default: 0,
                min: 0
            },

            refundedAmountPaise: {
                type: Number,
                default: 0,
                min: 0
            },

            refundId: {
                type: String,
                default: "",
                trim: true
            },

            refundReceipt: {
                type: String,
                default: "",
                trim: true,
                maxlength: 40
            },

            refundAttemptStartedAt: {
                type: Date,
                default: null
            },

            refundProcessedAt: {
                type: Date,
                default: null
            },

            refundProcessedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                default: null
            },

            refundAdminNote: {
                type: String,
                default: "",
                trim: true,
                maxlength: 500
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
