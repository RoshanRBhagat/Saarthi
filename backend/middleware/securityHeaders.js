function setSecurityHeaders(req, res, next) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(self), geolocation=(self), microphone=()");
    return next();
}

function preventApiCaching(req, res, next) {
    res.setHeader("Cache-Control", "no-store");
    return next();
}

module.exports = { setSecurityHeaders, preventApiCaching };
