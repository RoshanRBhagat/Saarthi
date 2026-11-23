const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const Booking = require("../models/Booking");
const Car = require("../models/Car");
const Driver = require("../models/Driver");
const { compareBookingInspections } = require("../services/damageComparisonService");
const { getDamageUploadsDir } = require("../services/storagePaths");
const { replaceDirectory } = require("../services/atomicDirectory");
const { getIndiaTodayStartUtc } = require("../services/bookingValidation");

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
const INSPECTION_UPLOAD_LEASE_MS = 15 * 60 * 1000;

async function isAuthorizedInspector(userId, booking) {
    const ownedCar = await Car.findOne({
        carId: booking.carId,
        ownerId: userId
    }).select("carId");

    if (ownedCar) return true;
    if (!booking.driverRequired || !booking.driverId) return false;

    const driver = await Driver.findOne({
        userId,
        status: "active",
        licenseExpiry: { $gte: getIndiaTodayStartUtc() }
    }).select("_id").lean();

    return Boolean(driver && String(driver._id) === String(booking.driverId));
}

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
    const bookingRoot = path.join(getDamageUploadsDir(), bookingId);

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

        // Preserve the previous set until the fully written replacement is installed.
        await replaceDirectory(tempRoot, finalRoot);

        return savedPhotos;
    } catch (error) {
        await fs.rm(tempRoot, { recursive: true, force: true }).catch(() => {});
        throw error;
    }
}

async function saveBookingInspection(req, res) {
    let uploadClaim = null;
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

        let booking = await Booking.findOne({ bookingId });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found."
            });
        }

        if (!await isAuthorizedInspector(req.user._id, booking)) {
            return res.status(403).json({
                success: false,
                message: "Only this vehicle's host or its approved, assigned driver can upload inspection photos."
            });
        }

        if (booking.status !== "confirmed" || booking.paymentStatus !== "paid") {
            return res.status(409).json({
                success: false,
                message: "The booking must be confirmed and paid before inspection."
            });
        }

        if (["pending_review", "processing", "failed"].includes(booking.refundStatus)) {
            return res.status(409).json({
                success: false,
                message: "Inspection is paused while the cancellation and refund request is under review."
            });
        }

        if (phase === "pickup") {
            if (booking.pickupInspection?.status === "completed") {
                return res.status(409).json({
                    success: false,
                    message: "Pickup inspection photos are already saved. They cannot be replaced."
                });
            }
            if (booking.pickupStatus === "confirmed") {
                return res.status(409).json({
                    success: false,
                    message: "Pickup has already been confirmed for this booking."
                });
            }
        } else {
            if (booking.returnInspection?.status === "completed") {
                return res.status(409).json({
                    success: false,
                    message: "Return inspection photos are already saved. Retry the AI analysis separately if needed."
                });
            }
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

        const fieldName = phase === "pickup"
            ? "pickupInspection"
            : "returnInspection";
        const leaseToken = crypto.randomUUID();
        const now = new Date();
        const claimFilter = {
            bookingId,
            status: "confirmed",
            paymentStatus: "paid",
            [`${fieldName}.status`]: { $ne: "completed" },
            $or: [
                { [`${fieldName}.status`]: { $ne: "uploading" } },
                { [`${fieldName}.uploadLeaseExpiresAt`]: { $lte: now } }
            ]
        };

        if (phase === "pickup") {
            claimFilter.pickupStatus = { $ne: "confirmed" };
        } else {
            claimFilter.pickupStatus = "confirmed";
            claimFilter.returnStatus = { $ne: "confirmed" };
        }

        const claimedBooking = await Booking.findOneAndUpdate(
            claimFilter,
            {
                $set: {
                    [`${fieldName}.status`]: "uploading",
                    [`${fieldName}.uploadLeaseToken`]: leaseToken,
                    [`${fieldName}.uploadLeaseExpiresAt`]: new Date(now.getTime() + INSPECTION_UPLOAD_LEASE_MS)
                }
            },
            { returnDocument: "after", runValidators: true }
        );

        if (!claimedBooking) {
            return res.status(409).json({
                success: false,
                message: "An inspection upload is already in progress, was completed, or the booking is no longer eligible. Refresh and try again."
            });
        }

        booking = claimedBooking;
        uploadClaim = { bookingId: booking._id, fieldName, leaseToken };

        const savedPhotos = await savePhotoSetAtomically(
            bookingId,
            phase,
            decodedPhotos
        );

        // Persist evidence before making external AI calls, and only finalize the
        // inspection if this request still owns the MongoDB-backed upload lease.
        const completedAt = new Date();
        const finalizedBooking = await Booking.findOneAndUpdate(
            { _id: booking._id, [`${fieldName}.uploadLeaseToken`]: leaseToken },
            {
                $set: {
                    [`${fieldName}.status`]: "completed",
                    [`${fieldName}.photos`]: savedPhotos,
                    [`${fieldName}.completedAt`]: completedAt,
                    [`${fieldName}.completedBy`]: req.user._id,
                    [`${fieldName}.notes`]: String(notes).trim().slice(0, 1000),
                    [`${fieldName}.aiAnalysis`]: null,
                    [`${fieldName}.aiAnalyzedAt`]: null
                },
                $unset: {
                    [`${fieldName}.uploadLeaseToken`]: 1,
                    [`${fieldName}.uploadLeaseExpiresAt`]: 1
                }
            },
            { returnDocument: "after", runValidators: true }
        );

        if (!finalizedBooking) {
            throw new Error("The inspection upload lease expired. Please submit the photos again.");
        }

        booking = finalizedBooking;
        uploadClaim = null;

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
                : "Return photos saved, but AI analysis did not complete. The photos are saved; use Retry AI comparison to analyze the same evidence again.",
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
        if (uploadClaim) {
            const nestedPath = uploadClaim.fieldName;
            await Booking.updateOne(
                { _id: uploadClaim.bookingId, [`${nestedPath}.uploadLeaseToken`]: uploadClaim.leaseToken },
                {
                    $set: { [`${nestedPath}.status`]: "pending" },
                    $unset: {
                        [`${nestedPath}.uploadLeaseToken`]: 1,
                        [`${nestedPath}.uploadLeaseExpiresAt`]: 1
                    }
                }
            ).catch(releaseError => {
                console.error("Unable to release failed inspection upload claim:", releaseError.message);
            });
        }
        console.error("Booking inspection upload error:", error.message);

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
                message: "Unable to save inspection photos. Please try again."
        });
    }
}

async function retryReturnDamageAnalysis(req, res) {
    try {
        const bookingId = req.params.bookingId;
        if (!validateBookingId(bookingId)) return res.status(400).json({ success: false, message: "Invalid booking ID." });
        const booking = await Booking.findOne({ bookingId });
        if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });

        const ownedCar = await Car.findOne({ carId: booking.carId, ownerId: req.user._id }).select("carId");
        if (!ownedCar) return res.status(403).json({ success: false, message: "You are not authorized to analyze this booking." });
        if (
            booking.status !== "confirmed" || booking.paymentStatus !== "paid" ||
            booking.pickupStatus !== "confirmed" || booking.returnStatus === "confirmed" ||
            booking.returnInspection?.status !== "completed"
        ) {
            return res.status(409).json({ success: false, message: "A saved return inspection is required, and return must not yet be confirmed." });
        }

        try {
            const analysis = await compareBookingInspections({
                bookingId,
                pickupPhotos: booking.pickupInspection?.photos,
                returnPhotos: booking.returnInspection?.photos
            });
            booking.returnInspection.aiAnalysis = analysis;
            booking.returnInspection.aiAnalyzedAt = new Date();
            booking.markModified("returnInspection.aiAnalysis");
            await booking.save();
            return res.json({ success: true, message: "AI comparison completed.", data: { bookingId, analysis } });
        } catch (error) {
            booking.returnInspection.aiAnalysis = {
                status: "failed",
                message: error.message || "AI comparison could not be completed.",
                failedAt: new Date().toISOString()
            };
            booking.returnInspection.aiAnalyzedAt = null;
            booking.markModified("returnInspection.aiAnalysis");
            await booking.save();
            return res.status(503).json({ success: false, message: "AI comparison is still unavailable. Your original inspection photos remain saved." });
        }
    } catch (error) {
        console.error("Retry return damage analysis error:", error);
        return res.status(500).json({ success: false, message: "Unable to retry AI comparison." });
    }
}

module.exports = {
    saveBookingInspection,
    retryReturnDamageAnalysis,
    isAuthorizedInspector
};
