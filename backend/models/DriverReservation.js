const mongoose = require("mongoose");

const driverReservationSchema = new mongoose.Schema({
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", required: true, index: true },
    dateKey: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    bookingId: { type: String, required: true, index: true },
    claimId: { type: String, required: true, index: true },
    state: { type: String, enum: ["creating", "active"], default: "creating" },
    expiresAt: { type: Date, default: null }
}, { timestamps: true });

driverReservationSchema.index({ driverId: 1, dateKey: 1 }, { unique: true });
driverReservationSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, partialFilterExpression: { state: "creating" } }
);

module.exports = mongoose.model("DriverReservation", driverReservationSchema);
