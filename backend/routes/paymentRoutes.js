const express =
    require("express");


const {
    createPaymentOrder,
    verifyPayment
} =
    require("../controllers/paymentController");


const {
    authenticateUser
} =
    require("../middleware/authMiddleware");


const router =
    express.Router();


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