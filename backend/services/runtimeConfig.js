const path = require("path");

const REQUIRED_PRODUCTION_VARIABLES = [
    "MONGODB_URI",
    "JWT_SECRET",
    "SAARTHI_UPLOAD_DIR",
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_WEBHOOK_SECRET",
    "GEMINI_API_KEY"
];

function getMissingProductionVariables(environment = process.env) {
    if (environment.NODE_ENV !== "production") return [];
    const missing = REQUIRED_PRODUCTION_VARIABLES.filter(name => !String(environment[name] || "").trim());
    const razorpayKeyId = String(environment.RAZORPAY_KEY_ID || "").trim();
    if (razorpayKeyId && !/^rzp_test_[a-z0-9]+$/i.test(razorpayKeyId)) {
        missing.push("RAZORPAY_KEY_ID (production currently accepts Test Mode keys only)");
    }
    const jwtSecret = String(environment.JWT_SECRET || "").trim();
    if (
        jwtSecret &&
        (Buffer.byteLength(jwtSecret, "utf8") < 32 ||
            /^(?:your[_ -]?jwt[_ -]?secret|change(?:me|[_ -]?me)|secret|password|development|placeholder|example)(?:$|[-_.])/i.test(jwtSecret) ||
            /^(.)\1{31,}$/.test(jwtSecret))
    ) {
        missing.push("JWT_SECRET (must be at least 32 bytes and not a placeholder)");
    }
    const uploadRoot = String(environment.SAARTHI_UPLOAD_DIR || "").trim();
    if (uploadRoot && !path.isAbsolute(uploadRoot)) {
        missing.push("SAARTHI_UPLOAD_DIR (must be an absolute persistent-volume path)");
    }
    return missing;
}

function getTrustProxyHops(environment = process.env) {
    const configured = String(environment.TRUST_PROXY_HOPS ?? "0").trim();
    if (!/^\d+$/.test(configured)) {
        throw new Error("TRUST_PROXY_HOPS must be a non-negative integer.");
    }
    const hops = Number(configured);
    if (!Number.isSafeInteger(hops) || hops > 10) {
        throw new Error("TRUST_PROXY_HOPS must be between 0 and 10.");
    }
    return hops;
}

module.exports = { REQUIRED_PRODUCTION_VARIABLES, getMissingProductionVariables, getTrustProxyHops };
