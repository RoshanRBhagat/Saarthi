const express =
    require("express");


const {
    createPaymentOrder
} =
    require(
        "../controllers/paymentController"
    );


const {
    authenticateUser
} =
    require(
        "../middleware/authMiddleware"
    );


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


module.exports =
    router;