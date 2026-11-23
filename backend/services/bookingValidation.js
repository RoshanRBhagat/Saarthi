function parseDateOnly(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) return null;
    return date;
}

function parseDriverRequest(value) {
    if (value === undefined) return false;
    if (typeof value !== "boolean") return null;
    return value;
}

function getIndiaTodayStartUtc(now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(now);
    return new Date(Date.UTC(
        Number(parts.find(part => part.type === "year").value),
        Number(parts.find(part => part.type === "month").value) - 1,
        Number(parts.find(part => part.type === "day").value)
    ));
}

function isTodayOrFutureIndia(date, now = new Date()) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false;
    return date.getTime() >= getIndiaTodayStartUtc(now).getTime();
}

module.exports = { parseDateOnly, parseDriverRequest, getIndiaTodayStartUtc, isTodayOrFutureIndia };
