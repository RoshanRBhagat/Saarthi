const mongoose = require("mongoose");


/* =========================================================
   USER SCHEMA
========================================================= */

const userSchema =
    new mongoose.Schema(

        {

            /* ---------------------------------------------
               FULL NAME
            --------------------------------------------- */

            name: {

                type: String,

                required: true,

                trim: true

            },


            /* ---------------------------------------------
               EMAIL
            --------------------------------------------- */

            email: {

                type: String,

                required: true,

                unique: true,

                trim: true,

                lowercase: true

            },


            /* ---------------------------------------------
               PHONE
            --------------------------------------------- */

            phone: {

                type: String,

                required: true,

                unique: true,

                trim: true

            },


            /* ---------------------------------------------
               PASSWORD
               
               Stored as a bcrypt hash, never plain text.
            --------------------------------------------- */

            password: {

                type: String,

                required: true,

                minlength: 6

            },


            /* ---------------------------------------------
               USER ROLE
            --------------------------------------------- */

            role: {

                type: String,

                enum: [
                    "customer",
                    "host",
                    "admin"
                ],

                default: "customer"

            },


            /* ---------------------------------------------
               ACCOUNT STATUS
            --------------------------------------------- */

            status: {

                type: String,

                enum: [
                    "active",
                    "blocked"
                ],

                default: "active"

            }

        },

        {

            timestamps: true

        }

    );


/* =========================================================
   EXPORT
========================================================= */

module.exports =
    mongoose.model(
        "User",
        userSchema
    );