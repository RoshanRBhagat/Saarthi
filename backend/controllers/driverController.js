const Driver = require("../models/Driver");
const Booking = require("../models/Booking");
const Car = require("../models/Car");
const { parseDateOnly, getIndiaTodayStartUtc, isTodayOrFutureIndia } = require("../services/bookingValidation");
const {
    createDriverDateReservations,
    activateDriverDateReservations,
    releaseDriverDateReservations
} = require("../services/driverReservationService");

function serializeDriverAssignment(booking, car) {
    return {
        bookingId: booking.bookingId,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        pickupDate: booking.pickupDate,
        returnDate: booking.returnDate,
        status: booking.status,
        refundStatus: booking.refundStatus,
        pickupStatus: booking.pickupStatus,
        returnStatus: booking.returnStatus,
        pickupInspectionStatus: booking.pickupInspectionStatus || "pending",
        returnInspectionStatus: booking.returnInspectionStatus || "pending",
        canUploadInspection: Boolean(booking.canUploadInspection),
        car: car
            ? {
                make: car.make,
                model: car.model,
                city: car.city,
                handoverInstructions: canViewHandoverInstructions(booking) ? car.handoverInstructions || "" : "",
                host: car.ownerId
                    ? { name: car.ownerId.name, phone: car.ownerId.phone }
                    : null
            }
            : null
    };
}

function canViewHandoverInstructions(booking) {
    return Boolean(
        booking &&
        ["confirmed", "completed"].includes(booking.status) &&
        booking.paymentStatus === "paid" &&
        !["pending_review", "processing", "failed"].includes(booking.refundStatus)
    );
}

async function apply(req, res) {
    try {
        const existing = await Driver.findOne({ userId: req.user._id });
        const { licenseNumber, licenseExpiry, city } = req.body;
        const expiry = parseDateOnly(licenseExpiry);
        const normalizedLicense = String(licenseNumber || "").trim().toUpperCase();
        const normalizedCity = String(city || "").trim();
        if (
            !normalizedLicense || normalizedLicense.length > 30 ||
            !normalizedCity || normalizedCity.length > 80 ||
            !expiry || !isTodayOrFutureIndia(expiry)
        ) {
            return res.status(400).json({ success: false, message: "Provide a valid license number, an unexpired license date, and city." });
        }

        if (existing?.status === "active") {
            const sameDetails = existing.licenseNumber === normalizedLicense &&
                existing.city === normalizedCity &&
                new Date(existing.licenseExpiry).getTime() === expiry.getTime();
            if (sameDetails) {
                return res.json({
                    success: true,
                    message: "Your approved driver profile is already up to date.",
                    data: existing
                });
            }
        }

        const driver = await Driver.findOneAndUpdate(
            { userId: req.user._id },
            { $set: { licenseNumber: normalizedLicense, licenseExpiry: expiry, city: normalizedCity, status: "pending_review", reviewedAt: null } },
            { returnDocument: "after", upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );
        return res.status(200).json({
            success: true,
            message: existing
                ? "Your updated driver details were submitted for admin review. You can still see your existing assignments while they are reviewed."
                : "Driver application submitted for review.",
            data: driver
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Unable to submit driver application." });
    }
}

async function getAssignments(req, res) {
    try {
        const driver = await Driver.findOne({ userId: req.user._id });
        if (!driver || driver.status === "suspended") return res.status(403).json({ success: false, message: "An approved driver profile is required to view assignments." });
        const bookings = await Booking.find({ driverId: driver._id, driverRequired: true })
            .select("bookingId customerName customerPhone pickupDate returnDate status paymentStatus refundStatus pickupStatus returnStatus pickupInspection.status returnInspection.status carId")
            .sort({ pickupDate: 1 })
            .lean();
        const cars = await Car.find({ carId: { $in: bookings.map(b => b.carId) } })
            .select("carId make model city ownerId +handoverInstructions")
            .populate("ownerId", "name phone")
            .lean();
        const carMap = new Map(cars.map(car => [car.carId, car]));
        return res.json({
            success: true,
            count: bookings.length,
            driver: { name: req.user.name, phone: req.user.phone },
            data: bookings.map(booking => serializeDriverAssignment({
                ...booking,
                pickupInspectionStatus: booking.pickupInspection?.status,
                returnInspectionStatus: booking.returnInspection?.status,
                canUploadInspection: driver.status === "active" && isTodayOrFutureIndia(driver.licenseExpiry)
            }, carMap.get(booking.carId)))
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Unable to load driver assignments." });
    }
}

async function getMyProfile(req, res) {
    try {
        const driver = await Driver.findOne({ userId: req.user._id }).select("licenseNumber licenseExpiry city status reviewedAt").lean();
        return res.json({ success: true, data: driver });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Unable to load driver profile." });
    }
}

async function listPending(req, res) {
    try {
    const rows = await Driver.find({ status: "pending_review" }).populate("userId", "name email phone").sort({ createdAt: 1 });
    return res.json({ success: true, data: rows });
    } catch (error) { return res.status(500).json({ success: false, message: "Unable to load applications." }); }
}

async function listForAdmin(req, res) {
    try {
        const rows = await Driver.find({})
            .populate("userId", "name email phone")
            .sort({ status: 1, createdAt: -1 });
        return res.json({ success: true, count: rows.length, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Unable to load driver profiles." });
    }
}

async function listActive(req, res) {
    try {
    const rows = await Driver.find({ status: "active", licenseExpiry: { $gte: getIndiaTodayStartUtc() } })
        .select("userId city status")
        .populate("userId", "name phone")
        .sort({ "userId.name": 1 });
    return res.json({ success: true, data: rows });
    } catch (error) { return res.status(500).json({ success: false, message: "Unable to load drivers." }); }
}

async function review(req, res) {
    try {
    const { status } = req.body;
    if (!["active", "suspended"].includes(status)) return res.status(400).json({ success: false, message: "Choose active or suspended." });
    const driver = await Driver.findById(req.params.driverId);
    if (!driver) return res.status(404).json({ success: false, message: "Driver profile not found." });
    if (status === "active" && !isTodayOrFutureIndia(driver.licenseExpiry)) {
        return res.status(409).json({ success: false, message: "This application cannot be approved because the driving license has expired." });
    }
    driver.status = status;
    driver.reviewedAt = new Date();
    await driver.save();
    return res.json({ success: true, data: driver });
    } catch (error) { return res.status(500).json({ success: false, message: "Unable to update driver review." }); }
}

async function assign(req, res) {
    try {
    const { driverId } = req.body;
    const cars = await Car.find({ ownerId: req.user._id }).select("carId");
    const booking = await Booking.findOne({ bookingId: req.params.bookingId, carId: { $in: cars.map(car => car.carId) } });
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found for your vehicles." });
    if (!booking.driverRequired || booking.status !== "confirmed" || booking.paymentStatus !== "paid") return res.status(400).json({ success: false, message: "Only confirmed, paid bookings that requested a driver can be assigned." });
    if (["pending_review", "processing", "failed"].includes(booking.refundStatus)) return res.status(409).json({ success: false, message: "Driver assignment is paused while cancellation and refund are under review." });
    if (booking.pickupStatus === "confirmed" || booking.status === "cancelled") return res.status(400).json({ success: false, message: "This booking can no longer be assigned." });
    const driver = await Driver.findOne({ _id: driverId, status: "active" });
    if (!driver) return res.status(400).json({ success: false, message: "Select an approved driver." });
    if (!isTodayOrFutureIndia(driver.licenseExpiry)) return res.status(400).json({ success: false, message: "This driver's license has expired." });
    if (String(booking.driverId || "") === String(driver._id)) {
        await activateDriverDateReservations(booking.bookingId, driver._id);
        return res.json({ success: true, message: "This driver is already assigned.", data: { driverId: driver._id } });
    }

    const conflict = await Booking.findOne({
        _id: { $ne: booking._id },
        driverId: driver._id,
        status: "confirmed",
        pickupDate: { $lte: booking.returnDate },
        returnDate: { $gte: booking.pickupDate }
    });
    if (conflict) return res.status(409).json({ success: false, message: "This driver is already assigned to an overlapping booking." });

    const reservation = await createDriverDateReservations({
        driverId: driver._id,
        bookingId: booking.bookingId,
        pickupDate: booking.pickupDate,
        returnDate: booking.returnDate
    });
    if (!reservation.ok) {
        const message = reservation.reason === "duration"
            ? "This booking duration is outside the supported driver scheduling range."
            : "This driver was assigned to another overlapping booking. Refresh and choose another driver.";
        return res.status(reservation.reason === "duration" ? 400 : 409).json({ success: false, message });
    }

    const previousDriverId = booking.driverId || null;
    const updatedBooking = await Booking.findOneAndUpdate({
        _id: booking._id,
        driverId: previousDriverId,
        driverRequired: true,
        status: "confirmed",
        paymentStatus: "paid",
        pickupStatus: { $ne: "confirmed" },
        refundStatus: { $nin: ["pending_review", "processing", "failed"] }
    }, { $set: { driverId: driver._id } }, { returnDocument: "after" });

    if (!updatedBooking) {
        await releaseDriverDateReservations(booking.bookingId, driver._id, reservation.claimId).catch(error => {
            console.error("Unable to release uncommitted driver dates:", error.message);
        });
        return res.status(409).json({ success: false, message: "This booking changed while the driver was being assigned. Refresh and try again." });
    }

    await activateDriverDateReservations(booking.bookingId, driver._id, reservation.claimId);
    if (previousDriverId) {
        await releaseDriverDateReservations(booking.bookingId, previousDriverId).catch(error => {
            console.error("Unable to release the previous driver dates:", error.message);
        });
    }
    return res.json({ success: true, message: "Driver assigned.", data: { driverId: driver._id } });
    } catch (error) { return res.status(500).json({ success: false, message: "Unable to assign driver." }); }
}

async function unassign(req, res) {
    try {
    const cars = await Car.find({ ownerId: req.user._id }).select("carId");
    const booking = await Booking.findOne({ bookingId: req.params.bookingId, carId: { $in: cars.map(car => car.carId) } });
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found for your vehicles." });
    if (booking.pickupStatus === "confirmed" || booking.status === "cancelled" || booking.status === "completed") return res.status(400).json({ success: false, message: "This driver assignment can no longer be changed." });
    const driverId = booking.driverId || null;
    const updatedBooking = await Booking.findOneAndUpdate({
        _id: booking._id,
        driverId,
        pickupStatus: { $ne: "confirmed" },
        status: { $nin: ["cancelled", "completed"] }
    }, { $set: { driverId: null } }, { returnDocument: "after" });
    if (!updatedBooking) return res.status(409).json({ success: false, message: "This booking changed while the driver was being removed. Refresh and try again." });
    await releaseDriverDateReservations(booking.bookingId, driverId).catch(error => {
        console.error("Unable to release removed driver dates:", error.message);
    });
    return res.json({ success: true, message: "Driver assignment removed." });
    } catch (error) { return res.status(500).json({ success: false, message: "Unable to remove driver assignment." }); }
}

module.exports = { apply, getAssignments, getMyProfile, listPending, listForAdmin, listActive, review, assign, unassign, serializeDriverAssignment };
