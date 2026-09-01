const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");


// =========================================================
// JWT SECRET
// =========================================================

const JWT_SECRET =
    process.env.JWT_SECRET;


// =========================================================
// REGISTER USER
// POST /api/auth/register
// =========================================================

async function registerUser(req, res) {

    try {

        const {
            name,
            email,
            phone,
            password,
            role
        } = req.body;


        // =================================================
        // VALIDATION
        // =================================================

        if (
            !name ||
            !email ||
            !phone ||
            !password
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Name, email, phone and password are required."

            });

        }


        if (
            String(password).length < 6
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Password must contain at least 6 characters."

            });

        }


        if (
            !/^[0-9]{10}$/.test(
                String(phone).trim()
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter a valid 10-digit mobile number."

            });

        }


        // =================================================
        // NORMALIZE
        // =================================================

        const normalizedEmail =
            String(
                email
            )
            .trim()
            .toLowerCase();


        const normalizedPhone =
            String(
                phone
            ).trim();


        // =================================================
        // CHECK EXISTING USER
        // =================================================

        const existingUser =
            await User.findOne({

                $or: [

                    {
                        email:
                            normalizedEmail
                    },

                    {
                        phone:
                            normalizedPhone
                    }

                ]

            });


        if (
            existingUser
        ) {

            let message =
                "An account already exists.";


            if (
                existingUser.email ===
                normalizedEmail
            ) {

                message =
                    "An account with this email already exists.";

            } else if (
                existingUser.phone ===
                normalizedPhone
            ) {

                message =
                    "An account with this mobile number already exists.";

            }


            return res.status(409).json({

                success: false,

                message

            });

        }


        // =================================================
        // HASH PASSWORD
        // =================================================

        const hashedPassword =
            await bcrypt.hash(
                password,
                12
            );


        // =================================================
        // ROLE
        // =================================================
        //
        // Public registration must never be allowed
        // to create an admin account.
        //
        // For now users can register as customer or host.
        // =================================================

        const userRole =
            role === "host"
                ? "host"
                : "customer";


        // =================================================
        // CREATE USER
        // =================================================

        const user =
            await User.create({

                name:
                    String(
                        name
                    ).trim(),

                email:
                    normalizedEmail,

                phone:
                    normalizedPhone,

                password:
                    hashedPassword,

                role:
                    userRole,

                status:
                    "active"

            });


        // =================================================
        // CREATE JWT
        // =================================================

        if (
            !JWT_SECRET
        ) {

            console.error(
                "JWT_SECRET is not configured."
            );


            return res.status(500).json({

                success: false,

                message:
                    "Server authentication configuration is incomplete."

            });

        }


        const token =
            jwt.sign(

                {
                    userId:
                        user._id.toString(),

                    role:
                        user.role

                },

                JWT_SECRET,

                {
                    expiresIn:
                        "7d"
                }

            );


        // =================================================
        // RESPONSE
        // =================================================

        return res.status(201).json({

            success: true,

            message:
                "Account created successfully.",

            token,

            user: {

                id:
                    user._id,

                name:
                    user.name,

                email:
                    user.email,

                phone:
                    user.phone,

                role:
                    user.role

            }

        });


    } catch (error) {

        console.error(
            "Registration error:",
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to create account."

        });

    }

}


// =========================================================
// LOGIN USER
// POST /api/auth/login
// =========================================================

async function loginUser(req, res) {

    try {

        const {
            email,
            password
        } = req.body;


        // =================================================
        // VALIDATION
        // =================================================

        if (
            !email ||
            !password
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Email and password are required."

            });

        }


        // =================================================
        // NORMALIZE EMAIL
        // =================================================

        const normalizedEmail =
            String(
                email
            )
            .trim()
            .toLowerCase();


        // =================================================
        // FIND USER
        // =================================================

        const user =
            await User.findOne({

                email:
                    normalizedEmail

            });


        if (
            !user
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password."

            });

        }


        // =================================================
        // CHECK ACCOUNT
        // =================================================

        if (
            user.status !==
            "active"
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "This account has been blocked."

            });

        }


        // =================================================
        // VERIFY PASSWORD
        // =================================================

        const passwordMatches =
            await bcrypt.compare(
                password,
                user.password
            );


        if (
            !passwordMatches
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password."

            });

        }


        // =================================================
        // JWT SECRET
        // =================================================

        if (
            !JWT_SECRET
        ) {

            console.error(
                "JWT_SECRET is not configured."
            );


            return res.status(500).json({

                success: false,

                message:
                    "Server authentication configuration is incomplete."

            });

        }


        // =================================================
        // CREATE TOKEN
        // =================================================

        const token =
            jwt.sign(

                {
                    userId:
                        user._id.toString(),

                    role:
                        user.role

                },

                JWT_SECRET,

                {
                    expiresIn:
                        "7d"
                }

            );


        // =================================================
        // RESPONSE
        // =================================================

        return res.json({

            success: true,

            message:
                "Login successful.",

            token,

            user: {

                id:
                    user._id,

                name:
                    user.name,

                email:
                    user.email,

                phone:
                    user.phone,

                role:
                    user.role

            }

        });


    } catch (error) {

        console.error(
            "Login error:",
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to log in."

        });

    }

}


// =========================================================
// EXPORT
// =========================================================

module.exports = {

    registerUser,

    loginUser

};