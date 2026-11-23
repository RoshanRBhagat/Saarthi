const crypto = require("crypto");
const DriverReservation = require("../models/DriverReservation");
const Booking = require("../models/Booking");
const { getDateKeys } = require("./carReservationService");

const RESERVATION_SETUP_LEASE_MS = 10 * 60 * 1000;

async function createDriverDateReservations({ driverId, bookingId, pickupDate, returnDate }) {
    const dateKeys = getDateKeys(pickupDate, returnDate);
    if (!dateKeys) return { ok: false, reason: "duration" };

    const claimId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + RESERVATION_SETUP_LEASE_MS);
    try {
        await DriverReservation.insertMany(dateKeys.map(dateKey => ({
            driverId,
            dateKey,
            bookingId,
            claimId,
            state: "creating",
            expiresAt
        })), { ordered: false });
        return { ok: true, claimId };
    } catch (error) {
        await DriverReservation.deleteMany({ bookingId, driverId, claimId, state: "creating" }).catch(() => {});
        const duplicate = error.code === 11000 || error.writeErrors?.some(item => item.code === 11000);
        if (duplicate) return { ok: false, reason: "unavailable" };
        throw error;
    }
}

async function activateDriverDateReservations(bookingId, driverId, claimId = null) {
    if (!bookingId || !driverId) return;
    const filter = { bookingId, driverId, state: "creating" };
    if (claimId) filter.claimId = claimId;
    await DriverReservation.updateMany(
        filter,
        { $set: { state: "active" }, $unset: { expiresAt: 1 } }
    );
}

async function releaseDriverDateReservations(bookingId, driverId, claimId = null) {
    const bookingIds = Array.isArray(bookingId) ? bookingId.filter(Boolean) : [bookingId].filter(Boolean);
    if (bookingIds.length === 0) return;
    const filter = { bookingId: { $in: bookingIds } };
    if (driverId) filter.driverId = driverId;
    if (claimId) filter.claimId = claimId;
    await DriverReservation.deleteMany(filter);
}

async function reconcileDriverDateReservations() {
    const reservations = await DriverReservation.find({ state: "creating" })
        .select("bookingId driverId claimId state")
        .lean();
    if (reservations.length === 0) return { activated: 0, released: 0 };

    const bookingIds = [...new Set(reservations.map(reservation => reservation.bookingId))];
    const bookings = await Booking.find({ bookingId: { $in: bookingIds } })
        .select("bookingId driverId status")
        .lean();
    const bookingMap = new Map(bookings.map(booking => [booking.bookingId, booking]));
    let activated = 0;
    let released = 0;
    const processed = new Set();

    for (const reservation of reservations) {
        const key = reservation.claimId;
        if (processed.has(key)) continue;
        processed.add(key);
        const booking = bookingMap.get(reservation.bookingId);
        const activeBooking = booking && ["pending", "confirmed"].includes(booking.status);
        if (!activeBooking || String(booking.driverId || "") !== String(reservation.driverId)) {
            await releaseDriverDateReservations(reservation.bookingId, reservation.driverId, reservation.claimId);
            released += 1;
        } else {
            await activateDriverDateReservations(reservation.bookingId, reservation.driverId, reservation.claimId);
            activated += 1;
        }
    }

    return { activated, released };
}

module.exports = {
    createDriverDateReservations,
    activateDriverDateReservations,
    releaseDriverDateReservations,
    reconcileDriverDateReservations
};
