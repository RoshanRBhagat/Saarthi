const test = require("node:test");
const assert = require("node:assert/strict");

function response() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
}

test("server payment handlers remain loadable without keys and return a clear 503", async () => {
    const savedKeyId = process.env.RAZORPAY_KEY_ID;
    const savedKeySecret = process.env.RAZORPAY_KEY_SECRET;
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;

    try {
        const { createPaymentOrder, verifyPayment } = require("../controllers/paymentController");
        const orderResponse = response();
        await createPaymentOrder({ body: { bookingId: "BOOK-TEST" }, user: { _id: "user-id" } }, orderResponse);
        assert.equal(orderResponse.statusCode, 503);
        assert.match(orderResponse.body.message, /not configured/);

        const verifyResponse = response();
        await verifyPayment({
            body: {
                bookingId: "BOOK-TEST",
                razorpay_payment_id: "pay-test",
                razorpay_order_id: "order-test",
                razorpay_signature: "signature-test"
            },
            user: { _id: "user-id" }
        }, verifyResponse);
        assert.equal(verifyResponse.statusCode, 503);

        const unauthorizedResponse = response();
        await createPaymentOrder({ body: { bookingId: "BOOK-TEST" } }, unauthorizedResponse);
        assert.equal(unauthorizedResponse.statusCode, 401);
    } finally {
        if (savedKeyId === undefined) delete process.env.RAZORPAY_KEY_ID;
        else process.env.RAZORPAY_KEY_ID = savedKeyId;
        if (savedKeySecret === undefined) delete process.env.RAZORPAY_KEY_SECRET;
        else process.env.RAZORPAY_KEY_SECRET = savedKeySecret;
    }
});
