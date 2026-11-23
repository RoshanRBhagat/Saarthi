const CarReservation = require("../models/CarReservation");
const Booking = require("../models/Booking");

const MAX_RENTAL_DAYS = 365;
const RESERVATION_SETUP_LEASE_MS = 10 * 60 * 1000;

function getDateKeys(pickupDate, returnDate) {
    const start = Date.UTC(pickupDate.getUTCFullYear(), pickupDate.getUTCMonth(), pickupDate.getUTCDate());
    const end = Date.UTC(returnDate.getUTCFullYear(), returnDate.getUTCMonth(), returnDate.getUTCDate());
    const dayCount = Math.floor((end - start) / 86400000) + 1;
    if (dayCount < 1 || dayCount > MAX_RENTAL_DAYS) return null;
    return Array.from({ length: dayCount }, (_, index) =>
        new Date(start + index * 86400000).toISOString().slice(0, 10)
    );
}

async function createCarDateReservations({ carId, bookingId, pickupDate, returnDate }) {
    const dateKeys = getDateKeys(pickupDate, returnDate);
    if (!dateKeys) return { ok: false, reason: "duration" };

    const expiresAt = new Date(Date.now() + RESERVATION_SETUP_LEASE_MS);
    try {
        await CarReservation.insertMany(dateKeys.map(dateKey => ({
            carId,
            dateKey,
            bookingId,
            state: "creating",
            expiresAt
        })), { ordered: false });
        return { ok: true };
    } catch (error) {
        await CarReservation.deleteMany({ bookingId }).catch(() => {});
        const duplicate = error.code === 11000 || error.writeErrors?.some(item => item.code === 11000);
        if (duplicate) return { ok: false, reason: "unavailable" };
        throw error;
    }
}

async function activateCarDateReservations(bookingId) {
    const bookingIds = Array.isArray(bookingId) ? bookingId.filter(Boolean) : [bookingId].filter(Boolean);
    if (bookingIds.length === 0) return;
    await CarReservation.updateMany(
        { bookingId: { $in: bookingIds }, state: "creating" },
        { $set: { state: "active" }, $unset: { expiresAt: 1 } }
    );
}

/**
 * Recover date holds when a booking write succeeded but activation failed.
 * Unmatched "creating" holds are left for the TTL index because they may
 * belong to a request that has not finished creating its booking yet.
 */
async function reconcileCarDateReservations() {
    const creatingBookingIds = await CarReservation.distinct("bookingId", { state: "creating" });
    if (creatingBookingIds.length === 0) return { activated: 0, released: 0 };

    const bookings = await Booking.find({ bookingId: { $in: creatingBookingIds } })
        .select("bookingId status")
        .lean();
    const activeBookingIds = bookings
        .filter(booking => ["pending", "confirmed"].includes(booking.status))
        .map(booking => booking.bookingId);
    const terminalBookingIds = bookings
        .filter(booking => ["cancelled", "completed"].includes(booking.status))
        .map(booking => booking.bookingId);

    if (activeBookingIds.length > 0) {
        await CarReservation.updateMany(
            { bookingId: { $in: activeBookingIds }, state: "creating" },
            { $set: { state: "active" }, $unset: { expiresAt: 1 } }
        );
    }
    if (terminalBookingIds.length > 0) {
        await releaseCarDateReservations(terminalBookingIds);
    }

    return { activated: activeBookingIds.length, released: terminalBookingIds.length };
}

async function releaseCarDateReservations(bookingId) {
    const bookingIds = Array.isArray(bookingId) ? bookingId.filter(Boolean) : [bookingId].filter(Boolean);
    if (bookingIds.length === 0) return;
    await CarReservation.deleteMany({ bookingId: { $in: bookingIds } });
}

async function hasReservedDates(carId, pickupDate, returnDate) {
    const dateKeys = getDateKeys(pickupDate, returnDate);
    if (!dateKeys) return true;
    return Boolean(await CarReservation.exists({ carId, dateKey: { $in: dateKeys } }));
}

module.exports = {
    MAX_RENTAL_DAYS,
    getDateKeys,
    createCarDateReservations,
    activateCarDateReservations,
    reconcileCarDateReservations,
    releaseCarDateReservations,
    hasReservedDates
};
