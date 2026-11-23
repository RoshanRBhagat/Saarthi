const test = require("node:test");
const assert = require("node:assert/strict");
const { hasRazorpayTestCredentials, getRazorpayTestPublicKey } = require("../services/razorpayMode");

test("Razorpay client configuration accepts only complete Test Mode credentials", () => {
    assert.equal(hasRazorpayTestCredentials({ RAZORPAY_KEY_ID: "rzp_test_example123", RAZORPAY_KEY_SECRET: "test-secret" }), true);
    assert.equal(getRazorpayTestPublicKey({ RAZORPAY_KEY_ID: "rzp_test_example123", RAZORPAY_KEY_SECRET: "test-secret" }), "rzp_test_example123");
    assert.equal(hasRazorpayTestCredentials({ RAZORPAY_KEY_ID: "rzp_live_example123", RAZORPAY_KEY_SECRET: "live-secret" }), false);
    assert.equal(getRazorpayTestPublicKey({ RAZORPAY_KEY_ID: "rzp_live_example123", RAZORPAY_KEY_SECRET: "live-secret" }), null);
    assert.equal(hasRazorpayTestCredentials({ RAZORPAY_KEY_ID: "rzp_test_example123", RAZORPAY_KEY_SECRET: " " }), false);
});
