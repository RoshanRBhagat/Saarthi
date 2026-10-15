const Booking = require("../models/Booking");
const Car = require("../models/Car");

const REQUIRED_ANGLES = [
    "front",
    "front-left",
    "left",
    "rear-left",
    "rear",
    "rear-right",
    "right",
    "front-right"
];


function requireCompletedInspection(phase) {
    return async function (req, res, next) {
        try {
            const booking = await Booking.findOne({
                bookingId: req.params.bookingId
            });

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: "Booking not found."
                });
            }

            const ownedCar = await Car.findOne({
                carId: booking.carId,
                ownerId: req.user._id
            }).select("carId");

            if (!ownedCar) {
                return res.status(403).json({
                    success: false,
                    message:
                        "You are not authorized to update this booking."
                });
            }

            const field =
                phase === "pickup"
                    ? "pickupInspection"
                    : "returnInspection";

            const inspection = booking[field];

            const photos = Array.isArray(inspection?.photos)
                ? inspection.photos
                : [];

            const angles = photos.map(photo => photo.angle);

            const allAnglesPresent =
                photos.length === 8 &&
                new Set(angles).size === 8 &&
                REQUIRED_ANGLES.every(
                    angle => angles.includes(angle)
                );

            if (
                inspection?.status !== "completed" ||
                !allAnglesPresent
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        `Upload all 8 required ${phase} inspection photos before confirming.`
                });
            }

            if (
                phase === "return" &&
                booking.pickupStatus !== "confirmed"
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Pickup must be confirmed before return."
                });
            }

            next();
        } catch (error) {
            console.error(
                "Inspection validation error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to validate the vehicle inspection."
            });
        }
    };
}

module.exports = {
    requireCompletedInspection
};