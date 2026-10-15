const fs = require("fs/promises");
const path = require("path");

const Booking = require("../models/Booking");
const Car = require("../models/Car");
const { compareBookingInspections } = require("../services/damageComparisonService");

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

const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 9 * 1024 * 1024;

function decodeImage(dataUrl) {
    const match = String(dataUrl || "").match(
        /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/i
    );

    if (!match) {
        throw new Error("Each photo must be a valid JPG, PNG or WebP image.");
    }

    const mimeType = match[1].toLowerCase();
    const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");

    if (!buffer.length) {
        throw new Error("An uploaded photo is empty.");
    }

    if (buffer.length > MAX_IMAGE_BYTES) {
        throw new Error("Each compressed photo must be 1.5 MB or smaller.");
    }

    const validSignature =
        (mimeType === "image/jpeg" && buffer.length >= 3 &&
            buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
        (mimeType === "image/png" && buffer.length >= 8 &&
            buffer.subarray(0, 8).equals(Buffer.from([
                0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
            ]))) ||
        (mimeType === "image/webp" && buffer.length >= 12 &&
            buffer.toString("ascii", 0, 4) === "RIFF" &&
            buffer.toString("ascii", 8, 12) === "WEBP");

    if (!validSignature) {
        throw new Error("The photo content does not match its image type.");
    }

    const extension = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp"
    }[mimeType];

    return { buffer, extension };
}

function validateBookingId(bookingId) {
    return typeof bookingId === "string" && /^[a-zA-Z0-9_-]+$/.test(bookingId);
}

async function savePhotoSetAtomically(bookingId, phase, decodedPhotos) {
    const bookingRoot = path.join(
        __dirname,
        "..",
        "uploads",
        "damage",
        bookingId
    );

    await fs.mkdir(bookingRoot, { recursive: true });

    const tempRoot = await fs.mkdtemp(
        path.join(bookingRoot, `${phase}-tmp-`)
    );

    const finalRoot = path.join(bookingRoot, phase);

    try {
        const savedPhotos = [];

        for (const photo of decodedPhotos) {
            const filename = `${photo.angle}.${photo.extension}`;
            await fs.writeFile(
                path.join(tempRoot, filename),
                photo.buffer,
                { flag: "wx" }
            );

            savedPhotos.push({
                angle: photo.angle,
                path: `/uploads/damage/${bookingId}/${phase}/${filename}`,
                capturedAt: new Date()
            });
        }

        // Replace a previous unconfirmed submission only after every new photo is written.
        await fs.rm(finalRoot, { recursive: true, force: true });
        await fs.rename(tempRoot, finalRoot);

        return savedPhotos;
    } catch (error) {
        await fs.rm(tempRoot, { recursive: true, force: true }).catch(() => {});
        throw error;
    }
}

async function saveBookingInspection(req, res) {
    try {
        const { bookingId, phase } = req.params;
        const { photos, notes = "" } = req.body || {};

        if (!validateBookingId(bookingId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking ID."
            });
        }

        if (!["pickup", "return"].includes(phase)) {
            return res.status(400).json({
                success: false,
                message: "Inspection phase must be pickup or return."
            });
        }

        if (!Array.isArray(photos) || photos.length !== REQUIRED_ANGLES.length) {
            return res.status(400).json({
                success: false,
                message: "Exactly 8 inspection photos are required."
            });
        }

        const receivedAngles = photos.map(photo => photo?.angle);
        if (
            new Set(receivedAngles).size !== REQUIRED_ANGLES.length ||
            !REQUIRED_ANGLES.every(angle => receivedAngles.includes(angle))
        ) {
            return res.status(400).json({
                success: false,
                message: "Upload one photo for each required vehicle angle."
            });
        }

        const decodedPhotos = photos.map(photo => ({
            angle: photo.angle,
            ...decodeImage(photo.dataUrl)
        }));

        const totalBytes = decodedPhotos.reduce(
            (total, photo) => total + photo.buffer.length,
            0
        );

        if (totalBytes > MAX_TOTAL_BYTES) {
            return res.status(413).json({
                success: false,
                message: "The combined inspection photos are too large. Please compress them and try again."
            });
        }

        const booking = await Booking.findOne({ bookingId });

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
                message: "You are not authorized to inspect this booking."
            });
        }

        if (booking.status !== "confirmed" || booking.paymentStatus !== "paid") {
            return res.status(409).json({
                success: false,
                message: "The booking must be confirmed and paid before inspection."
            });
        }

        if (phase === "pickup") {
            if (booking.pickupStatus === "confirmed") {
                return res.status(409).json({
                    success: false,
                    message: "Pickup has already been confirmed for this booking."
                });
            }
        } else {
            if (booking.pickupStatus !== "confirmed") {
                return res.status(409).json({
                    success: false,
                    message: "Complete pickup before starting the return inspection."
                });
            }

            if (booking.returnStatus === "confirmed") {
                return res.status(409).json({
                    success: false,
                    message: "Return has already been confirmed for this booking."
                });
            }
        }

        const savedPhotos = await savePhotoSetAtomically(
            bookingId,
            phase,
            decodedPhotos
        );

        const fieldName = phase === "pickup"
            ? "pickupInspection"
            : "returnInspection";

        booking[fieldName] = {
            status: "completed",
            photos: savedPhotos,
            completedAt: new Date(),
            completedBy: req.user._id,
            notes: String(notes).trim().slice(0, 1000),
            aiAnalysis: null,
            aiAnalyzedAt: null
        };

        // Persist evidence before making external AI calls.
        await booking.save();

        let analysis = null;
        let analysisError = null;

        if (phase === "return") {
            try {
                analysis = await compareBookingInspections({
                    bookingId,
                    pickupPhotos: booking.pickupInspection?.photos,
                    returnPhotos: booking.returnInspection?.photos
                });

                booking.returnInspection.aiAnalysis = analysis;
                booking.returnInspection.aiAnalyzedAt = new Date();
                booking.markModified("returnInspection.aiAnalysis");
                await booking.save();
            } catch (error) {
                analysisError = error.message || "AI comparison could not be completed.";
                console.error("AI return inspection analysis failed:", error);

                // Keep the saved return photos and expose the failure for a later retry.
                booking.returnInspection.aiAnalysis = {
                    status: "failed",
                    message: analysisError,
                    failedAt: new Date().toISOString()
                };
                booking.returnInspection.aiAnalyzedAt = null;
                booking.markModified("returnInspection.aiAnalysis");
                await booking.save().catch(saveError => {
                    console.error("Unable to save AI analysis error state:", saveError);
                });
            }
        }

        return res.json({
            success: true,
            message: phase === "pickup"
                ? "Pickup inspection photos saved. You can now confirm pickup."
                : analysis
                    ? "Return photos saved and AI damage comparison completed. Review the report on the Host Dashboard."
                    : "Return photos saved, but AI analysis did not complete. The photos are saved; you can retry by uploading the return inspection again before confirming return.",
            data: {
                bookingId,
                phase,
                status: "completed",
                photoCount: savedPhotos.length,
                photos: savedPhotos,
                analysis,
                analysisError
            }
        });
    } catch (error) {
        console.error("Booking inspection upload error:", error);

        if (error.code === "GEMINI_CONFIG_MISSING") {
            return res.status(503).json({
                success: false,
                message: "AI damage detection is not configured. Check GEMINI_API_KEY in backend/.env."
            });
        }

        if (/image|photo|booking ID|unsupported/i.test(error.message || "")) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message || "Unable to save inspection photos."
        });
    }
}

module.exports = {
    saveBookingInspection
};
