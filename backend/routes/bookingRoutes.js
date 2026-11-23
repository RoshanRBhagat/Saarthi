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
    saveBookingInspection,
    retryReturnDamageAnalysis
} = require("../controllers/bookingInspectionController");

const {
    getCustomerInspectionPhoto,
    getHostInspectionPhoto
} = require("../controllers/bookingInspectionPhotoController");

const {
    requireCompletedInspection
} = require("../middleware/inspectionMiddleware");

const { validateCoupon } =
    require("../controllers/couponController");

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

// Preview a coupon against the current car and rental dates.
// The discount is validated again when the booking is created.
router.post(
    "/validate-coupon",
    validateCoupon
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

// Securely stream an inspection photo to the customer who owns the booking.
// The underlying damage uploads are not publicly served.
router.get(
    "/my/:bookingId/inspection-photo/:phase/:angle",
    authenticateUser,
    getCustomerInspectionPhoto
);

// Hosts may review condition evidence only for bookings on their own vehicles.
router.get(
    "/host/:bookingId/inspection-photo/:phase/:angle",
    authenticateUser,
    requireHost,
    getHostInspectionPhoto
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

router.post(
    "/host/:bookingId/inspection/return/retry-analysis",
    authenticateUser,
    requireHost,
    retryReturnDamageAnalysis
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
