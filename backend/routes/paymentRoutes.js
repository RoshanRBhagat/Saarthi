const express =
    require("express");


const {
    createPaymentOrder,
    verifyPayment,
    handleRazorpayWebhook
} =
    require("../controllers/paymentController");


const { authenticateUser, requireAdmin } = require("../middleware/authMiddleware");
const { listRefundRequests, reviewRefundRequest, refreshRefundStatus } = require("../controllers/refundController");


const router =
    express.Router();

router.post("/webhook", handleRazorpayWebhook);

router.get("/refunds/pending", authenticateUser, requireAdmin, listRefundRequests);
router.patch("/refunds/:bookingId/review", authenticateUser, requireAdmin, reviewRefundRequest);
router.post("/refunds/:bookingId/refresh", authenticateUser, requireAdmin, refreshRefundStatus);


/* =========================================================
   CREATE PAYMENT ORDER
========================================================= */

router.post(
    "/create-order",
    authenticateUser,
    createPaymentOrder
);


/* =========================================================
   VERIFY PAYMENT
========================================================= */

router.post(
    "/verify",
    authenticateUser,
    verifyPayment
);


module.exports =
    router;
