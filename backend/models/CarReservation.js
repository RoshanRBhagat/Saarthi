const mongoose = require("mongoose");

const carReservationSchema = new mongoose.Schema({
    carId: { type: String, required: true, trim: true },
    dateKey: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    bookingId: { type: String, required: true, index: true },
    state: { type: String, enum: ["creating", "active"], default: "creating" },
    expiresAt: { type: Date, default: null }
}, { timestamps: true });

carReservationSchema.index({ carId: 1, dateKey: 1 }, { unique: true });
carReservationSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, partialFilterExpression: { state: "creating" } }
);

module.exports = mongoose.model("CarReservation", carReservationSchema);
