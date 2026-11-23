const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const authUiPath = path.resolve(__dirname, "../../frontend/js/core/auth-ui.js");
const authUiSource = fs.readFileSync(authUiPath, "utf8");
const authPagePaths = [
    path.resolve(__dirname, "../../frontend/auth.html"),
    path.resolve(__dirname, "../../frontend/frontend/auth.html")
];
const authPageScript = fs.readFileSync(path.resolve(__dirname, "../../frontend/js/pages/auth.js"), "utf8");

function loadAuthUi(user) {
    const context = vm.createContext({
        document: {
            addEventListener() {},
            createElement() {
                return { classList: { add() {} }, dataset: {} };
            }
        },
        localStorage: {
            getItem(key) {
                if (key === "saarthiToken") return "test-token";
                if (key === "saarthiUser") return JSON.stringify(user);
                return null;
            }
        }
    });

    vm.runInContext(authUiSource, context, { filename: authUiPath });
    return context;
}

test("signed-in drivers get a Driver Portal navigation link", () => {
    const context = loadAuthUi({ role: "driver", name: "Test Driver" });
    context.createAccountMenu = () => {};
    const links = [];
    const nav = {
        querySelectorAll() { return []; },
        querySelector() { return null; },
        appendChild(link) { links.push(link); }
    };

    context.addLoggedInUI(nav);

    assert.deepEqual(
        links.map(({ href, textContent }) => ({ href, textContent })),
        [{ href: "driver.html", textContent: "Driver Portal" }]
    );
});

test("signed-in navigation removes the static Log In link", () => {
    const context = loadAuthUi({ role: "customer", name: "Test Customer" });
    context.createAccountMenu = () => {};
    let removed = false;
    const loginLink = { remove() { removed = true; } };
    const nav = {
        querySelectorAll(selector) {
            assert.equal(selector, 'a[href*="auth.html"]');
            return [loginLink];
        },
        querySelector() { return null; },
        appendChild() {}
    };

    context.addLoggedInUI(nav);

    assert.equal(removed, true);
});

test("account menu role labels distinguish drivers and administrators", () => {
    const context = loadAuthUi({ role: "customer" });
    assert.equal(context.getRoleLabel("driver"), "Driver");
    assert.equal(context.getRoleLabel("admin"), "Administrator");
    assert.equal(context.getRoleLabel("customer"), "Customer");
});

test("registration offers driver accounts and honors the driver signup link", () => {
    for (const authPagePath of authPagePaths) {
        assert.match(
            fs.readFileSync(authPagePath, "utf8"),
            /<option\s+value=["']driver["']>\s*Driver\s*<\/option>/i,
            `${path.relative(path.resolve(__dirname, "../../frontend"), authPagePath)} is missing driver signup.`
        );
    }
    assert.match(authPageScript, /\["customer",\s*"host",\s*"driver"\]\.includes\(requestedRole\)/);
    const driverPage = fs.readFileSync(path.resolve(__dirname, "../../frontend/driver.html"), "utf8");
    const driverScript = fs.readFileSync(path.resolve(__dirname, "../../frontend/js/pages/driver.js"), "utf8");
    assert.match(driverScript, /mode=register&role=driver/);
    assert.match(driverPage, /id="apply"/);
});

test("driver assignments expose inspection upload links that return control to the host", () => {
    const frontendRoot = path.resolve(__dirname, "../../frontend");
    const driverScript = fs.readFileSync(path.join(frontendRoot, "js/pages/driver.js"), "utf8");
    const inspectionScript = fs.readFileSync(path.join(frontendRoot, "js/pages/booking-inspection.js"), "utf8");
    const driverRoutes = fs.readFileSync(path.resolve(__dirname, "../routes/driverRoutes.js"), "utf8");
    const bookingRoutes = fs.readFileSync(path.resolve(__dirname, "../routes/bookingRoutes.js"), "utf8");

    assert.match(driverScript, /canUploadInspection && booking\.status === "confirmed"/);
    assert.match(driverScript, /phase=pickup&source=driver/);
    assert.match(driverScript, /phase=return&source=driver/);
    assert.match(inspectionScript, /\/api\/drivers\/booking\/\$\{encodeURIComponent\(bookingId\)\}\/inspection\/\$\{phase\}/);
    assert.match(inspectionScript, /host will review the inspection and confirm the handover/i);
    assert.match(driverRoutes, /post\("\/booking\/:bookingId\/inspection\/:phase", authenticateUser, saveBookingInspection\)/);
    assert.match(bookingRoutes, /router\.patch\([\s\S]*?"\/host\/:bookingId\/pickup"[\s\S]*?requireHost/);
    assert.match(bookingRoutes, /router\.patch\([\s\S]*?"\/host\/:bookingId\/return"[\s\S]*?requireHost/);
});
