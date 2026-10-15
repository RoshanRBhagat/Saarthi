const express = require("express");
const router = express.Router();

const {
    checkAvailability,
    createBooking,
    getCustomerBookings,
    getHostBookings,
    updateHostBookingStatus,
    cancelCustomerBooking,
    confirmPickup,
    confirmReturn
} = require("../controllers/bookingController");

const {
    saveBookingInspection
} = require("../controllers/bookingInspectionController");

const {
    requireCompletedInspection
} = require("../middleware/inspectionMiddleware");

const {
    authenticateUser,
    requireHost
} = require("../middleware/authMiddleware");


/* =========================================================
   PUBLIC / CUSTOMER BOOKING ROUTES
========================================================= */

// Check vehicle availability
router.get(
    "/availability/:carId",
    checkAvailability
);

// Create a booking
router.post(
    "/",
    authenticateUser,
    createBooking
);

// Get logged-in customer's bookings
router.get(
    "/my",
    authenticateUser,
    getCustomerBookings
);

// Cancel a customer's booking
router.patch(
    "/my/:bookingId/cancel",
    authenticateUser,
    cancelCustomerBooking
);


/* =========================================================
   HOST BOOKING ROUTES
========================================================= */

// Get bookings for the logged-in host
router.get(
    "/host",
    authenticateUser,
    requireHost,
    getHostBookings
);

// Update booking status
router.patch(
    "/host/:bookingId/status",
    authenticateUser,
    requireHost,
    updateHostBookingStatus
);


/* =========================================================
   VEHICLE CONDITION INSPECTION
========================================================= */

// Upload the 8 pickup or return inspection photos
router.post(
    "/host/:bookingId/inspection/:phase",
    authenticateUser,
    requireHost,
    saveBookingInspection
);


/* =========================================================
   PICKUP CONFIRMATION
   Requires all 8 pickup inspection photos
========================================================= */

router.patch(
    "/host/:bookingId/pickup",
    authenticateUser,
    requireHost,
    requireCompletedInspection("pickup"),
    confirmPickup
);


/* =========================================================
   RETURN CONFIRMATION
   Requires all 8 return inspection photos
========================================================= */

router.patch(
    "/host/:bookingId/return",
    authenticateUser,
    requireHost,
    requireCompletedInspection("return"),
    confirmReturn
);


module.exports = router;