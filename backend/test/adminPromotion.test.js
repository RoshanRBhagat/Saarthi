const test = require("node:test");
const assert = require("node:assert/strict");
const { promoteExistingUser } = require("../services/adminPromotion");

test("admin promotion normalizes email and atomically changes only the existing role", async () => {
    let lookup;
    let update;
    const account = { _id: "user-1", role: "host", status: "active" };
    const User = {
        findOne(filter) {
            lookup = filter;
            return { select: async () => account };
        },
        findOneAndUpdate(filter, changes, options) {
            update = { filter, changes, options };
            return { select: async () => ({ _id: "user-1", name: "Existing host", email: "host@example.test", role: "admin" }) };
        }
    };

    const result = await promoteExistingUser(User, "  HOST@Example.Test ");
    assert.equal(lookup.email, "host@example.test");
    assert.deepEqual(update.filter, { _id: "user-1", role: "host" });
    assert.deepEqual(update.changes, { $set: { role: "admin" } });
    assert.equal(update.options.returnDocument, "after");
    assert.equal(update.options.runValidators, true);
    assert.equal(result.status, "promoted");
    assert.equal(result.user.role, "admin");
});

test("admin promotion will not create accounts or overwrite existing admin roles", async () => {
    let updateCalled = false;
    const makeUserModel = account => ({
        findOne() { return { select: async () => account }; },
        findOneAndUpdate() { updateCalled = true; throw new Error("Should not update this account."); }
    });

    assert.equal((await promoteExistingUser(makeUserModel(null), "missing@example.test")).status, "not_found");
    assert.equal((await promoteExistingUser(makeUserModel({ _id: "admin-1", role: "admin" }), "admin@example.test")).status, "already_admin");
    assert.equal((await promoteExistingUser(makeUserModel({ _id: "user-2", role: "customer" }), "not-an-email")).status, "invalid_email");
    assert.equal(updateCalled, false);
    assert.equal((await promoteExistingUser(makeUserModel({ _id: "blocked-1", role: "customer", status: "blocked" }), "blocked@example.test")).status, "inactive");
});
