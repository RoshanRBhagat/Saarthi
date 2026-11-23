const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateCoupon } = require("../services/couponService");

test("percentage coupons normalize their code, round cents, and respect maximum discounts", () => {
    assert.deepEqual(calculateCoupon(" welcome10 ", 1234.56), {
        couponCode: "WELCOME10",
        description: "10% off your rental, up to ₹500",
        subtotalAmount: 1234.56,
        discountAmount: 123.46,
        totalAmount: 1111.1
    });
    assert.equal(calculateCoupon("WELCOME10", 10000).discountAmount, 500);
    assert.equal(calculateCoupon("TRIP15", 10000).discountAmount, 750);
});

test("flat coupons apply once and coupons enforce their minimum subtotal", () => {
    const pricing = calculateCoupon("SAARTHI200", 2000);
    assert.equal(pricing.discountAmount, 200);
    assert.equal(pricing.totalAmount, 1800);
    assert.throws(() => calculateCoupon("SAARTHI200", 1999.99), /requires a rental subtotal/i);
    assert.throws(() => calculateCoupon("TRIP15", 1499.99), /requires a rental subtotal/i);
    assert.throws(() => calculateCoupon("WELCOME10", 999.99), /requires a rental subtotal/i);
});

test("invalid coupon codes and invalid subtotals are rejected", () => {
    assert.throws(() => calculateCoupon("NOT-A-COUPON", 2000), /invalid coupon/i);
    assert.throws(() => calculateCoupon("X".repeat(33), 2000), /valid coupon/i);
    assert.throws(() => calculateCoupon("WELCOME10", Number.NaN), /subtotal is invalid/i);
    assert.throws(() => calculateCoupon("WELCOME10", -1), /subtotal is invalid/i);
});

test("empty coupon leaves the rounded subtotal unchanged", () => {
    assert.deepEqual(calculateCoupon("", 1234.567), {
        couponCode: "",
        description: "",
        subtotalAmount: 1234.57,
        discountAmount: 0,
        totalAmount: 1234.57
    });
});
