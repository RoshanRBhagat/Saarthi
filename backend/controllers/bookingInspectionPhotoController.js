const fs = require("fs/promises");
const { createReadStream } = require("fs");
const path = require("path");

const Booking = require("../models/Booking");
const Car = require("../models/Car");
const { getDamageUploadsDir, getLegacyDamageUploadsDir } = require("../services/storagePaths");

const ALLOWED_PHASES = new Set(["pickup", "return"]);
const ALLOWED_ANGLES = new Set([
    "front",
    "front-left",
    "left",
    "rear-left",
    "rear",
    "rear-right",
    "right",
    "front-right"
]);
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const BOOKING_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * Streams an inspection photo only to the customer who owns the booking.
 * Inspection uploads are intentionally not exposed through public static paths.
 */
function isValidInspectionPhotoRequest(bookingId, phase, angle) {
    return BOOKING_ID_PATTERN.test(String(bookingId || "")) &&
        ALLOWED_PHASES.has(phase) &&
        ALLOWED_ANGLES.has(angle);
}

async function streamInspectionPhoto(req, res, booking) {
    const { bookingId, phase, angle } = req.params;

    const inspection = phase === "pickup"
        ? booking.pickupInspection
        : booking.returnInspection;

    if (inspection?.status !== "completed") {
        return res.status(404).json({
            success: false,
            message: "These inspection photos are not available yet."
        });
    }

    const photo = Array.isArray(inspection.photos)
        ? inspection.photos.find(item => item.angle === angle)
        : null;

    if (!photo || typeof photo.path !== "string") {
        return res.status(404).json({
            success: false,
            message: "Inspection photo not found."
        });
    }

    const expectedPrefix = `/uploads/damage/${bookingId}/${phase}/`;
    if (!photo.path.startsWith(expectedPrefix)) {
        return res.status(404).json({
            success: false,
            message: "Inspection photo path is invalid."
        });
    }

    // The stored path must contain exactly one filename after the expected
    // booking/phase prefix. This avoids traversal and works across Windows/Linux.
    const filename = photo.path.slice(expectedPrefix.length);
    const extension = path.extname(filename).toLowerCase();
    if (
        !filename ||
        filename.includes("/") ||
        filename.includes("\\") ||
        path.basename(filename) !== filename ||
        !ALLOWED_EXTENSIONS.has(extension) ||
        filename.toLowerCase() !== `${angle}${extension}`.toLowerCase()
    ) {
        return res.status(404).json({
            success: false,
            message: "Inspection photo path is invalid."
        });
    }

    const uploadRoot = path.resolve(getDamageUploadsDir());
    let photoPath = path.resolve(uploadRoot, bookingId, phase, filename);
    if (!photoPath.startsWith(`${uploadRoot}${path.sep}`)) {
        return res.status(400).json({
            success: false,
            message: "Invalid inspection photo path."
        });
    }

    let stat;
    try {
        try { stat = await fs.stat(photoPath); }
        catch (error) {
            const legacyRoot = path.resolve(getLegacyDamageUploadsDir());
            const legacyPath = path.resolve(legacyRoot, bookingId, phase, filename);
            if (!legacyPath.startsWith(`${legacyRoot}${path.sep}`)) throw error;
            photoPath = legacyPath;
            stat = await fs.stat(photoPath);
        }
        if (!stat.isFile()) throw new Error("Not a file");
    } catch {
        return res.status(404).json({
            success: false,
            message: "Inspection photo file is missing from storage."
        });
    }

    res.set("Cache-Control", "private, no-store");
    res.set("X-Content-Type-Options", "nosniff");
    const contentTypes = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp"
    };
    res.set("Content-Type", contentTypes[extension]);
    res.set("Content-Length", String(stat.size));

    // Express sendFile can fail to resolve absolute Windows paths in some
    // deployments. The path has already been constrained to the booking's
    // approved upload directory, so stream that validated file directly.
    const photoStream = createReadStream(photoPath);
    photoStream.once("error", () => {
        if (!res.headersSent) {
            res.status(404).json({
                success: false,
                message: "Unable to read inspection photo."
            });
        } else {
            res.destroy();
        }
    });
    photoStream.pipe(res);
}

async function getCustomerInspectionPhoto(req, res) {
    try {
        const { bookingId, phase, angle } = req.params;

        if (!isValidInspectionPhotoRequest(bookingId, phase, angle)) {
            return res.status(400).json({
                success: false,
                message: "Invalid inspection photo request."
            });
        }

        const booking = await Booking.findOne({
            bookingId,
            userId: req.user._id
        }).select("bookingId userId pickupInspection returnInspection");

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found for this customer."
            });
        }

        return streamInspectionPhoto(req, res, booking);
    } catch (error) {
        console.error("Customer inspection photo error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to load inspection photo."
        });
    }
}

async function getHostInspectionPhoto(req, res) {
    try {
        const { bookingId, phase, angle } = req.params;
        if (!isValidInspectionPhotoRequest(bookingId, phase, angle)) {
            return res.status(400).json({
                success: false,
                message: "Invalid inspection photo request."
            });
        }

        const booking = await Booking.findOne({ bookingId })
            .select("bookingId carId pickupInspection returnInspection");
        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found." });
        }

        const ownedCar = await Car.findOne({
            carId: booking.carId,
            ownerId: req.user._id
        }).select("carId");
        if (!ownedCar) {
            return res.status(404).json({ success: false, message: "Inspection photo not found." });
        }

        return streamInspectionPhoto(req, res, booking);
    } catch (error) {
        console.error("Host inspection photo error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to load inspection photo."
        });
    }
}

module.exports = { getCustomerInspectionPhoto, getHostInspectionPhoto };
