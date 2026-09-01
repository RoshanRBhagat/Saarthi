const express =
    require("express");


const {
    checkAvailability,
    createBooking,
    getCustomerBookings,
    getHostBookings,
    updateHostBookingStatus
} =
    require(
        "../controllers/bookingController"
    );


const {
    authenticateUser,
    requireHost
} =
    require(
        "../middleware/authMiddleware"
    );


const router =
    express.Router();


/* =========================================================
   MY BOOKINGS
========================================================= */

router.get(
    "/my",
    authenticateUser,
    getCustomerBookings
);


/* =========================================================
   HOST BOOKINGS
========================================================= */

router.get(
    "/host",
    authenticateUser,
    requireHost,
    getHostBookings
);


/* =========================================================
   UPDATE HOST BOOKING STATUS
========================================================= */

router.patch(
    "/host/:bookingId/status",
    authenticateUser,
    requireHost,
    updateHostBookingStatus
);


/* =========================================================
   CHECK CAR AVAILABILITY
========================================================= */

router.get(
    "/availability/:carId",
    checkAvailability
);


/* =========================================================
   CREATE BOOKING
========================================================= */

router.post(
    "/",
    authenticateUser,
    createBooking
);


module.exports =
    router;