const mongoose = require("mongoose");

const razorpayWebhookEventSchema = new mongoose.Schema({
    eventId: { type: String, required: true, trim: true },
    eventType: { type: String, required: true, trim: true },
    paymentId: { type: String, default: "", trim: true },
    orderId: { type: String, default: "", trim: true },
    outcome: { type: String, enum: ["processed", "ignored"], required: true },
    reason: { type: String, default: "", trim: true }
}, { timestamps: true });

razorpayWebhookEventSchema.index({ eventId: 1 }, { unique: true });

module.exports = mongoose.model("RazorpayWebhookEvent", razorpayWebhookEventSchema);
