const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    licenseNumber: { type: String, required: true, trim: true, uppercase: true },
    licenseExpiry: { type: Date, required: true },
    city: { type: String, required: true, trim: true },
    status: { type: String, enum: ["pending_review", "active", "suspended"], default: "pending_review" },
    reviewedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model("Driver", driverSchema);
