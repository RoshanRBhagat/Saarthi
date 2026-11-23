function hasRazorpayTestCredentials(environment = process.env) {
    const keyId = String(environment.RAZORPAY_KEY_ID || "").trim();
    const keySecret = String(environment.RAZORPAY_KEY_SECRET || "").trim();
    return /^rzp_test_[a-z0-9]+$/i.test(keyId) && Boolean(keySecret);
}

function getRazorpayTestPublicKey(environment = process.env) {
    return hasRazorpayTestCredentials(environment)
        ? String(environment.RAZORPAY_KEY_ID).trim()
        : null;
}

module.exports = { hasRazorpayTestCredentials, getRazorpayTestPublicKey };
