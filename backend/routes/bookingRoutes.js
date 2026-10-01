const express =
    require("express");


const {
    checkAvailability,
    createBooking,
    getCustomerBookings,
    cancelCustomerBooking,
    getHostBookings,
    updateHostBookingStatus,
    confirmPickup,
    confirmReturn
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
   CANCEL MY BOOKING
========================================================= */

router.patch(
    "/my/:bookingId/cancel",
    authenticateUser,
    cancelCustomerBooking
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
   CONFIRM VEHICLE PICKUP
========================================================= */

router.patch(
    "/host/:bookingId/pickup",
    authenticateUser,
    requireHost,
    confirmPickup
);


/* =========================================================
   CONFIRM VEHICLE RETURN
========================================================= */

router.patch(
    "/host/:bookingId/return",
    authenticateUser,
    requireHost,
    confirmReturn
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