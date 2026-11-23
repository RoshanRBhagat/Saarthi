const fs = require("node:fs");
const path = require("node:path");

const baseUrl = (process.env.SMOKE_BASE_URL || "http://127.0.0.1:5000").replace(/\/$/, "");
const frontendRoot = path.resolve(__dirname, "..", "..", "frontend");

function findHtmlPages(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const absolutePath = path.join(directory, entry.name);
        if (entry.isDirectory()) return findHtmlPages(absolutePath);
        if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".html")) return [];
        return [path.relative(frontendRoot, absolutePath).split(path.sep).join("/")];
    });
}

const pageFiles = findHtmlPages(frontendRoot).sort();

let failures = 0;
const localAssetUrls = new Set();

async function request(route) {
    return fetch(new URL(route, `${baseUrl}/`), {
        signal: AbortSignal.timeout(7000),
        redirect: "manual"
    });
}

function report(ok, label, detail = "") {
    console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
    if (!ok) failures += 1;
}

async function checkPage(pageFile) {
    const route = pageFile === "index.html" ? "/" : `/${pageFile}`;
    try {
        const response = await request(route);
        if (!response.ok) {
            report(false, `GET ${route}`, `HTTP ${response.status}`);
            return;
        }

        const html = await response.text();
        const hasViewport = /<meta\b[^>]*name=["']viewport["']/i.test(html);
        const hasResponsiveStylesheet = /href=["'][^"']*css\/responsive\.css(?:\?[^"']*)?["']/i.test(html);
        const hasSecurityHeaders =
            response.headers.get("x-content-type-options") === "nosniff" &&
            response.headers.get("x-frame-options") === "DENY" &&
            Boolean(response.headers.get("referrer-policy"));
        collectLocalAssets(html, new URL(route, `${baseUrl}/`));
        const valid = hasViewport && hasResponsiveStylesheet && hasSecurityHeaders;
        const missing = [
            !hasViewport && "viewport metadata",
            !hasResponsiveStylesheet && "responsive stylesheet",
            !hasSecurityHeaders && "security headers"
        ].filter(Boolean).join(", ");
        report(valid, `GET ${route}`, valid
            ? `HTTP ${response.status}, responsive metadata and security headers present`
            : `HTTP ${response.status}, missing ${missing}`);
    } catch (error) {
        report(false, `GET ${route}`, error.name === "TimeoutError" ? "timed out" : "request failed");
    }
}

function collectLocalAssets(html, pageUrl) {
    for (const match of html.matchAll(/<(script|link|img)\b[^>]*>/gi)) {
        const tag = match[0];
        const tagName = match[1].toLowerCase();
        const attribute = tagName === "script" || tagName === "img" ? "src" : "href";
        if (tagName === "link" && !/rel=["'][^"']*\bstylesheet\b[^"']*["']/i.test(tag)) continue;

        const rawUrl = tag.match(new RegExp(`\\b${attribute}=["']([^"']+)["']`, "i"))?.[1];
        if (!rawUrl || /^(?:data:|blob:|javascript:|mailto:|tel:|#)/i.test(rawUrl)) continue;

        try {
            const assetUrl = new URL(rawUrl, pageUrl);
            if ((assetUrl.protocol === "http:" || assetUrl.protocol === "https:") && assetUrl.origin === pageUrl.origin) {
                assetUrl.hash = "";
                localAssetUrls.add(assetUrl.toString());
            }
        } catch {
            // Invalid local references are caught by the source-level frontend tests.
        }
    }
}

async function checkLocalAssets() {
    const urls = [...localAssetUrls];
    const results = await Promise.all(urls.map(async assetUrl => {
        try {
            const response = await request(assetUrl);
            return { path: new URL(assetUrl).pathname, status: response.status, ok: response.ok };
        } catch (error) {
            return {
                path: new URL(assetUrl).pathname,
                ok: false,
                error: error.name === "TimeoutError" ? "timed out" : "request failed"
            };
        }
    }));

    for (const result of results) {
        report(result.ok, `GET ${result.path}`, result.ok ? "HTTP 200" : result.error || `HTTP ${result.status}`);
    }
    console.log(`Checked ${urls.length} local script, stylesheet, and image reference(s).`);
}

async function checkJsonRoute(route, validate) {
    try {
        const response = await request(route);
        if (!response.ok) {
            report(false, `GET ${route}`, `HTTP ${response.status}`);
            return;
        }

        let body;
        try {
            body = await response.json();
        } catch {
            report(false, `GET ${route}`, "invalid JSON");
            return;
        }

        const valid = validate(body) && response.headers.get("cache-control")?.includes("no-store");
        report(valid, `GET ${route}`, valid
            ? `HTTP ${response.status}, valid and not cacheable`
            : "unexpected response shape or missing no-store header");
    } catch (error) {
        report(false, `GET ${route}`, error.name === "TimeoutError" ? "timed out" : "request failed");
    }
}

async function checkProtectedRoute(method, route) {
    try {
        const response = await fetch(new URL(route, `${baseUrl}/`), {
            method,
            signal: AbortSignal.timeout(7000),
            redirect: "manual"
        });
        const denied = response.status === 401 || response.status === 403;
        const doesNotCache = response.headers.get("cache-control")?.includes("no-store");
        report(denied && doesNotCache, `${method} ${route}`, denied && doesNotCache
            ? `HTTP ${response.status}, access denied and not cacheable`
            : `HTTP ${response.status}, ${doesNotCache ? "unexpected access" : "missing no-store header"}`);
    } catch (error) {
        report(false, `${method} ${route}`, error.name === "TimeoutError" ? "timed out" : "request failed");
    }
}

async function checkValidationRoute(method, route, expectedStatus, body = undefined) {
    const requestOptions = {
        method,
        signal: AbortSignal.timeout(7000),
        redirect: "manual"
    };
    if (body !== undefined) {
        requestOptions.headers = { "Content-Type": "application/json" };
        requestOptions.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(new URL(route, `${baseUrl}/`), requestOptions);
        const responseBody = await response.json().catch(() => null);
        const valid = response.status === expectedStatus &&
            responseBody?.success === false &&
            typeof responseBody.message === "string" &&
            response.headers.get("cache-control")?.includes("no-store");
        report(valid, `${method} ${route}`, valid
            ? `HTTP ${response.status}, expected validation response and not cacheable`
            : `HTTP ${response.status}, unexpected response or missing no-store header`);
    } catch (error) {
        report(false, `${method} ${route}`, error.name === "TimeoutError" ? "timed out" : "request failed");
    }
}

async function checkRecommendationApi() {
    try {
        const inventoryResponse = await request("/api/cars");
        if (!inventoryResponse.ok) {
            report(false, "POST /api/recommendations/cars", "could not load public inventory");
            return;
        }

        let inventoryBody;
        try {
            inventoryBody = await inventoryResponse.json();
        } catch {
            report(false, "POST /api/recommendations/cars", "public inventory returned invalid JSON");
            return;
        }

        const inventory = Array.isArray(inventoryBody.data)
            ? inventoryBody.data
            : Array.isArray(inventoryBody.cars)
                ? inventoryBody.cars
                : [];
        const sampleCar = inventory.find(car => typeof car.city === "string" && car.city.trim());
        if (!sampleCar) {
            report(true, "POST /api/recommendations/cars", "skipped because no public vehicle has a city");
            return;
        }

        const response = await fetch(new URL("/api/recommendations/cars", `${baseUrl}/`), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                city: sampleCar.city,
                ...(sampleCar.state ? { state: sampleCar.state } : {}),
                travelers: 1,
                budget: Math.max(Number(sampleCar.dailyPrice) || 0, 1),
                preferences: []
            }),
            signal: AbortSignal.timeout(7000),
            redirect: "manual"
        });

        if (!response.ok) {
            report(false, "POST /api/recommendations/cars", `HTTP ${response.status}`);
            return;
        }

        let body;
        try {
            body = await response.json();
        } catch {
            report(false, "POST /api/recommendations/cars", "invalid JSON");
            return;
        }

        const valid = body.success === true &&
            Array.isArray(body.data) &&
            body.data.length > 0 &&
            response.headers.get("cache-control")?.includes("no-store");
        report(valid, "POST /api/recommendations/cars", valid
            ? `HTTP ${response.status}, recommendations found for listed inventory`
            : "unexpected response shape");
    } catch (error) {
        report(false, "POST /api/recommendations/cars", error.name === "TimeoutError" ? "timed out" : "request failed");
    }
}

async function checkPageAsset() {
    try {
        const response = await request("/css/responsive.css");
        report(response.ok, "GET /css/responsive.css", `HTTP ${response.status}`);
    } catch (error) {
        report(false, "GET /css/responsive.css", error.name === "TimeoutError" ? "timed out" : "request failed");
    }
}

async function main() {
    if (pageFiles.length === 0) {
        console.error(`No frontend HTML pages found under ${frontendRoot}.`);
        process.exitCode = 1;
        return;
    }

    console.log(`Checking Saarthi at ${baseUrl}`);
    for (const pageFile of pageFiles) await checkPage(pageFile);
    await checkLocalAssets();

    await checkJsonRoute("/api/health", body =>
        body.success === true &&
        body.status === "ok" &&
        body.dependencies?.database === "connected" &&
        body.dependencies?.uploadStorage === "writable");
    await checkJsonRoute("/api/cars", body =>
        body.success === true &&
        (Array.isArray(body.data) || Array.isArray(body.cars)));
    await checkRecommendationApi();
    await checkPageAsset();

    await checkValidationRoute("GET", "/api/cars/__saarthi-smoke-nonexistent__", 404);
    await checkValidationRoute("GET", "/api/bookings/availability/smoke-car", 400);
    await checkValidationRoute("POST", "/api/bookings/validate-coupon", 400, {});

    const protectedRoutes = [
        ["POST", "/api/cars"],
        ["GET", "/api/cars/host/my-cars"],
        ["PATCH", "/api/cars/host/smoke-car/status"],
        ["PATCH", "/api/cars/host/smoke-car"],
        ["POST", "/api/bookings"],
        ["GET", "/api/bookings/my"],
        ["GET", "/api/bookings/my/smoke-booking/inspection-photo/pickup/front"],
        ["GET", "/api/bookings/host"],
        ["GET", "/api/bookings/host/smoke-booking/inspection-photo/pickup/front"],
        ["PATCH", "/api/bookings/my/smoke-booking/cancel"],
        ["PATCH", "/api/bookings/host/smoke-booking/status"],
        ["POST", "/api/bookings/host/smoke-booking/inspection/pickup"],
        ["POST", "/api/bookings/host/smoke-booking/inspection/return/retry-analysis"],
        ["PATCH", "/api/bookings/host/smoke-booking/pickup"],
        ["PATCH", "/api/bookings/host/smoke-booking/return"],
        ["POST", "/api/payments/create-order"],
        ["POST", "/api/payments/verify"],
        ["GET", "/api/payments/refunds/pending"],
        ["PATCH", "/api/payments/refunds/smoke-booking/review"],
        ["POST", "/api/payments/refunds/smoke-booking/refresh"],
        ["POST", "/api/drivers/apply"],
        ["GET", "/api/drivers/me"],
        ["GET", "/api/drivers/assignments"],
        ["POST", "/api/drivers/booking/smoke-booking/inspection/pickup"],
        ["GET", "/api/drivers/pending"],
        ["GET", "/api/drivers/admin"],
        ["GET", "/api/drivers/active"],
        ["PATCH", "/api/drivers/smoke-driver/review"],
        ["PATCH", "/api/drivers/booking/smoke-booking/assign"],
        ["DELETE", "/api/drivers/booking/smoke-booking/assign"]
    ];

    for (const [method, route] of protectedRoutes) {
        await checkProtectedRoute(method, route);
    }

    console.log(`${failures === 0 ? "Smoke check passed" : "Smoke check failed"}: ${failures} failure(s), ${pageFiles.length} page(s) checked.`);
    if (failures > 0) process.exitCode = 1;
}

main().catch(error => {
    console.error(`Smoke check could not complete (${error.name || "Error"}).`);
    process.exitCode = 1;
});
