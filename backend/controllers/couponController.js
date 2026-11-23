const Car = require("../models/Car");
const { calculateCoupon, roundMoney } = require("../services/couponService");

function parseDateOnly(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return null;
    }

    return date;
}

async function validateCoupon(req, res) {
    try {
        const { carId, pickupDate, returnDate, couponCode } = req.body || {};

        if (!carId || !pickupDate || !returnDate || !String(couponCode || "").trim()) {
            return res.status(400).json({
                success: false,
                message: "Car, pickup date, return date, and coupon code are required."
            });
        }

        const pickup = parseDateOnly(pickupDate);
        const returned = parseDateOnly(returnDate);

        if (!pickup || !returned) {
            return res.status(400).json({
                success: false,
                message: "Please select valid pickup and return dates."
            });
        }

        if (returned < pickup) {
            return res.status(400).json({
                success: false,
                message: "Return date cannot be before pickup date."
            });
        }

        const car = await Car.findOne({ carId, status: "available" });

        if (!car) {
            return res.status(404).json({
                success: false,
                message: "Car not found or is not currently available."
            });
        }

        const totalDays = Math.floor((returned.getTime() - pickup.getTime()) / 86400000) + 1;
        const dailyPrice = Number(car.dailyPrice || 0);
        const subtotalAmount = roundMoney(totalDays * dailyPrice);

        if (!Number.isFinite(dailyPrice) || dailyPrice <= 0 || totalDays < 1) {
            return res.status(400).json({
                success: false,
                message: "Unable to calculate the rental amount for those dates."
            });
        }

        const pricing = calculateCoupon(couponCode, subtotalAmount);

        return res.json({
            success: true,
            message: `Coupon ${pricing.couponCode} applied successfully.`,
            data: {
                ...pricing,
                totalDays,
                dailyPrice
            }
        });
    } catch (error) {
        const message = error.message || "Unable to validate this coupon.";
        const expectedValidationError = /coupon|subtotal|rental amount|valid/i.test(message);

        return res.status(expectedValidationError ? 400 : 500).json({
            success: false,
            message: expectedValidationError ? message : "Unable to validate this coupon right now."
        });
    }
}

module.exports = { validateCoupon };
