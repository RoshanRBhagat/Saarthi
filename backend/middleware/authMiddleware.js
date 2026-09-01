const jwt = require("jsonwebtoken");
const User = require("../models/User");


// =========================================================
// AUTHENTICATION MIDDLEWARE
// =========================================================
//
// Reads:
//
// Authorization: Bearer <JWT>
//
// Verifies the token and loads the user.
// =========================================================

async function authenticateUser(
    req,
    res,
    next
) {

    try {

        /* -------------------------------------------------
           GET AUTHORIZATION HEADER
        ------------------------------------------------- */

        const authHeader =
            req.headers.authorization;


        if (
            !authHeader ||
            !authHeader.startsWith(
                "Bearer "
            )
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Authentication required. Please log in."

            });

        }


        /* -------------------------------------------------
           EXTRACT TOKEN
        ------------------------------------------------- */

        const token =
            authHeader.substring(
                7
            ).trim();


        if (
            !token
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Authentication token is missing."

            });

        }


        /* -------------------------------------------------
           VERIFY JWT
        ------------------------------------------------- */

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );


        if (
            !decoded ||
            !decoded.userId
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid authentication token."

            });

        }


        /* -------------------------------------------------
           LOAD USER
        ------------------------------------------------- */

        const user =
            await User.findById(
                decoded.userId
            ).select(
                "-password"
            );


        if (
            !user
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "User account no longer exists."

            });

        }


        /* -------------------------------------------------
           CHECK ACCOUNT STATUS
        ------------------------------------------------- */

        if (
            user.status !==
            "active"
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "Your account has been blocked."

            });

        }


        /* -------------------------------------------------
           ATTACH USER TO REQUEST
        ------------------------------------------------- */

        req.user =
            user;


        /* -------------------------------------------------
           CONTINUE
        ------------------------------------------------- */

        next();

    } catch (error) {

        console.error(
            "Authentication error:",
            error.message
        );


        return res.status(401).json({

            success: false,

            message:
                "Invalid or expired authentication token."

        });

    }

}

/* =========================================================
   REQUIRE HOST
========================================================= */

function requireHost(
    req,
    res,
    next
) {

    if (
        !req.user ||
        req.user.role !== "host"
    ) {

        return res.status(403).json({

            success: false,

            message:
                "Host access is required."

        });

    }


    next();

}


// =========================================================
// EXPORT
// =========================================================

module.exports = {

    authenticateUser,

    requireHost

};