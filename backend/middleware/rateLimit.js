function createRateLimiter({ windowMs, max, message = "Too many requests. Please wait before trying again.", maxTrackedClients = 10_000, now = Date.now }) {
    if (!Number.isSafeInteger(windowMs) || windowMs < 1 || !Number.isSafeInteger(max) || max < 1) {
        throw new TypeError("Rate limiter windowMs and max must be positive integers.");
    }

    const clients = new Map();
    const cleanupIntervalMs = Math.min(windowMs, 60_000);
    let lastCleanup = 0;

    return function rateLimit(req, res, next) {
        const currentTime = now();
        if (currentTime - lastCleanup >= cleanupIntervalMs) {
            for (const [key, bucket] of clients) {
                if (bucket.resetAt <= currentTime) clients.delete(key);
            }
            lastCleanup = currentTime;
        }

        const clientKey = String(req.ip || req.socket?.remoteAddress || "unknown");
        let bucket = clients.get(clientKey);
        if (!bucket || bucket.resetAt <= currentTime) {
            if (clients.size >= maxTrackedClients) {
                const oldestKey = clients.keys().next().value;
                if (oldestKey !== undefined) clients.delete(oldestKey);
            }
            bucket = { count: 0, resetAt: currentTime + windowMs };
            clients.set(clientKey, bucket);
        }

        bucket.count += 1;
        const remaining = Math.max(0, max - bucket.count);
        const resetSeconds = Math.max(1, Math.ceil((bucket.resetAt - currentTime) / 1000));
        res.setHeader("RateLimit-Limit", String(max));
        res.setHeader("RateLimit-Remaining", String(remaining));
        res.setHeader("RateLimit-Reset", String(resetSeconds));

        if (bucket.count > max) {
            res.setHeader("Retry-After", String(resetSeconds));
            return res.status(429).json({ success: false, message });
        }

        return next();
    };
}

module.exports = { createRateLimiter };
