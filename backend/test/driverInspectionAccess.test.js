const test = require("node:test");
const assert = require("node:assert/strict");

const Car = require("../models/Car");
const Driver = require("../models/Driver");
const { isAuthorizedInspector } = require("../controllers/bookingInspectionController");

test("vehicle host can upload inspection evidence for their own booking", async () => {
    const originalCarFindOne = Car.findOne;
    const originalDriverFindOne = Driver.findOne;
    Car.findOne = query => ({ select: async () => query.ownerId === "host-1" ? { carId: "CAR-1" } : null });
    Driver.findOne = () => { throw new Error("Host authorization should not need a driver lookup."); };

    try {
        assert.equal(await isAuthorizedInspector("host-1", {
            carId: "CAR-1", driverRequired: true, driverId: "driver-1"
        }), true);
    } finally {
        Car.findOne = originalCarFindOne;
        Driver.findOne = originalDriverFindOne;
    }
});

test("only an active, unexpired driver assigned to a driver booking can upload inspection evidence", async () => {
    const originalCarFindOne = Car.findOne;
    const originalDriverFindOne = Driver.findOne;
    const driver = { _id: "driver-1" };
    Car.findOne = () => ({ select: async () => null });
    Driver.findOne = query => {
        assert.equal(query.userId, "user-1");
        assert.equal(query.status, "active");
        assert.ok(query.licenseExpiry.$gte instanceof Date);
        return { select: () => ({ lean: async () => driver }) };
    };

    try {
        assert.equal(await isAuthorizedInspector("user-1", {
            carId: "CAR-1", driverRequired: true, driverId: "driver-1"
        }), true);
        assert.equal(await isAuthorizedInspector("user-1", {
            carId: "CAR-1", driverRequired: true, driverId: "driver-2"
        }), false);
        assert.equal(await isAuthorizedInspector("user-1", {
            carId: "CAR-1", driverRequired: false, driverId: "driver-1"
        }), false);
    } finally {
        Car.findOne = originalCarFindOne;
        Driver.findOne = originalDriverFindOne;
    }
});
