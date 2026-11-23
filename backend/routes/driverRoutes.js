const router = require("express").Router();
const { authenticateUser, requireHost, requireAdmin } = require("../middleware/authMiddleware");
const { apply, getAssignments, getMyProfile, listPending, listForAdmin, listActive, review, assign, unassign } = require("../controllers/driverController");
const { saveBookingInspection } = require("../controllers/bookingInspectionController");

router.post("/apply", authenticateUser, apply);
router.get("/me", authenticateUser, getMyProfile);
router.get("/assignments", authenticateUser, getAssignments);
router.post("/booking/:bookingId/inspection/:phase", authenticateUser, saveBookingInspection);
router.get("/pending", authenticateUser, requireAdmin, listPending);
router.get("/admin", authenticateUser, requireAdmin, listForAdmin);
router.get("/active", authenticateUser, requireHost, listActive);
router.patch("/:driverId/review", authenticateUser, requireAdmin, review);
router.patch("/booking/:bookingId/assign", authenticateUser, requireHost, assign);
router.delete("/booking/:bookingId/assign", authenticateUser, requireHost, unassign);

module.exports = router;
