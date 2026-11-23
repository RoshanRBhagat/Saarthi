/* =========================================================
   SAARTHI COUPON RULES
   Starter promotions are intentionally managed in code.
   Keep all price calculations on the server.
========================================================= */

const COUPONS = Object.freeze({
    WELCOME10: Object.freeze({
        type: "percentage",
        value: 10,
        maxDiscount: 500,
        minimumSubtotal: 1000,
        description: "10% off your rental, up to ₹500"
    }),
    SAARTHI200: Object.freeze({
        type: "flat",
        value: 200,
        minimumSubtotal: 2000,
        description: "₹200 off rentals of ₹2,000 or more"
    }),
    TRIP15: Object.freeze({
        type: "percentage",
        value: 15,
        maxDiscount: 750,
        minimumSubtotal: 1500,
        description: "15% off your rental, up to ₹750"
    })
});

function roundMoney(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function calculateCoupon(couponCode, subtotalAmount) {
    const subtotal = roundMoney(subtotalAmount);

    if (!Number.isFinite(subtotal) || subtotal < 0) {
        throw new Error("The rental subtotal is invalid.");
    }

    const normalizedCode = String(couponCode || "")
        .trim()
        .toUpperCase();

    if (!normalizedCode) {
        return {
            couponCode: "",
            description: "",
            subtotalAmount: subtotal,
            discountAmount: 0,
            totalAmount: subtotal
        };
    }

    if (normalizedCode.length > 32) {
        throw new Error("Please enter a valid coupon code.");
    }

    const coupon = COUPONS[normalizedCode];

    if (!coupon) {
        throw new Error("Invalid coupon code. Try WELCOME10, SAARTHI200, or TRIP15.");
    }

    if (subtotal < coupon.minimumSubtotal) {
        throw new Error(
            `${normalizedCode} requires a rental subtotal of at least ₹${coupon.minimumSubtotal.toLocaleString("en-IN")}.`
        );
    }

    let discountAmount = coupon.type === "flat"
        ? coupon.value
        : subtotal * coupon.value / 100;

    if (Number.isFinite(coupon.maxDiscount)) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    }

    discountAmount = roundMoney(Math.min(subtotal, discountAmount));
    const totalAmount = roundMoney(Math.max(0, subtotal - discountAmount));

    return {
        couponCode: normalizedCode,
        description: coupon.description,
        subtotalAmount: subtotal,
        discountAmount,
        totalAmount
    };
}

module.exports = {
    COUPONS,
    calculateCoupon,
    roundMoney
};
