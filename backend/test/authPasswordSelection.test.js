const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");

const originalJwtSecret = process.env.JWT_SECRET;
process.env.JWT_SECRET = "unit-test-jwt-secret";

const User = require("../models/User");
const { loginUser } = require("../controllers/authController");

test("password hashes are excluded from ordinary user queries by default", () => {
    assert.equal(User.schema.path("password").options.select, false);
});

test("login explicitly selects the password hash and never returns it to the client", async () => {
    const originalFindOne = User.findOne;
    const user = {
        _id: "user-password-test",
        name: "Test User",
        email: "test@example.test",
        phone: "7000000000",
        password: await bcrypt.hash("test-password", 4),
        role: "customer",
        status: "active"
    };
    let selectedFields;
    User.findOne = filter => {
        assert.deepEqual(filter, { email: "test@example.test" });
        return {
            select(fields) {
                selectedFields = fields;
                return Promise.resolve(user);
            }
        };
    };

    try {
        const response = {
            statusCode: 200,
            body: null,
            status(code) { this.statusCode = code; return this; },
            json(body) { this.body = body; return this; }
        };
        await loginUser({ body: { email: " TEST@Example.Test ", password: "test-password" } }, response);

        assert.equal(selectedFields, "+password");
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.success, true);
        assert.equal(response.body.user.email, user.email);
        assert.equal(Object.hasOwn(response.body.user, "password"), false);
        assert.ok(response.body.token);
    } finally {
        User.findOne = originalFindOne;
        if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = originalJwtSecret;
    }
});
