const token = localStorage.getItem("saarthiToken");
const message = document.getElementById("message");
const assignments = document.getElementById("assignments");
const licenseExpiryInput = document.querySelector('[name="licenseExpiry"]');
licenseExpiryInput.min = getIndiaTodayDateInputValue();
const profileStatus = document.createElement("p");
profileStatus.setAttribute("role", "status");
document.getElementById("apply").after(profileStatus);

async function loadProfile() {
    try {
        const result = await api("/api/drivers/me");
        const d = result.data;
        const licenseExpiry = d?.licenseExpiry ? new Date(d.licenseExpiry).toISOString().slice(0, 10) : "";
        const licenseExpired = Boolean(licenseExpiry && licenseExpiry < getIndiaTodayDateInputValue());
        profileStatus.textContent = d
            ? `Application status: ${d.status.replaceAll("_", " ")} · ${d.city}${d.status === "suspended" ? " · You cannot receive assignments while suspended." : licenseExpired ? " · Your license has expired; update your details and resubmit for review before taking inspections." : ""}`
            : "No application submitted yet.";
        if (d) {
            document.querySelector('[name="licenseNumber"]').value = d.licenseNumber || "";
            document.querySelector('[name="licenseExpiry"]').value = d.licenseExpiry ? new Date(d.licenseExpiry).toISOString().slice(0, 10) : "";
            document.querySelector('[name="city"]').value = d.city || "";
        }
    } catch (error) { profileStatus.textContent = error.message; }
}

async function api(url, options = {}) {
    if (!token) throw new Error("Please log in before using the driver portal.");
    const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || "Request failed.");
    return result;
}

document.getElementById("apply").addEventListener("submit", async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
        const result = await api("/api/drivers/apply", { method: "POST", body: JSON.stringify(Object.fromEntries(form)) });
        message.textContent = result.message;
        await loadProfile();
    } catch (error) { message.textContent = error.message; }
});

document.getElementById("load").addEventListener("click", async () => {
    assignments.textContent = "Loading…";
    try {
        const result = await api("/api/drivers/assignments");
        assignments.replaceChildren(...(result.data.length ? result.data.map(renderAssignment) : [document.createTextNode("No assigned bookings yet.")]));
    } catch (error) { assignments.textContent = error.message; }
});

if (token) {
    loadProfile();
    document.getElementById("load").click();
} else {
    const returnUrl = `${window.location.pathname}${window.location.search}`;
    const signupLink = document.createElement("a");
    signupLink.href = `auth.html?mode=register&role=driver&returnUrl=${encodeURIComponent(returnUrl)}`;
    signupLink.textContent = "Create a driver account";
    const loginLink = document.createElement("a");
    loginLink.href = `auth.html?returnUrl=${encodeURIComponent(returnUrl)}`;
    loginLink.textContent = "Sign in";
    profileStatus.replaceChildren(
        document.createTextNode("Sign in or create a driver account to apply and manage assignments. "),
        signupLink,
        document.createTextNode(" · "),
        loginLink
    );
    assignments.textContent = "Sign in to see bookings assigned to you.";
}

function escapeText(value) { const node = document.createElement("span"); node.textContent = String(value ?? ""); return node.innerHTML; }

function renderAssignment(booking) {
    const card = document.createElement("article");
    card.className = "driver-row";
    const host = booking.car?.host || {};
    const phone = String(host.phone || "");
    const safeHostPhone = /^[0-9+ -]{7,20}$/.test(phone) ? phone : "";
    const pickupAvailable = booking.canUploadInspection && booking.status === "confirmed" && booking.pickupStatus !== "confirmed" &&
        booking.pickupInspectionStatus !== "completed" && !["pending_review", "processing", "failed"].includes(booking.refundStatus);
    const returnAvailable = booking.canUploadInspection && booking.status === "confirmed" && booking.pickupStatus === "confirmed" &&
        booking.returnStatus !== "confirmed" && booking.returnInspectionStatus !== "completed" &&
        !["pending_review", "processing", "failed"].includes(booking.refundStatus);
    card.innerHTML = `
        <strong>${escapeText(booking.bookingId)} · ${escapeText(booking.car?.make || "Car")} ${escapeText(booking.car?.model || "")}</strong>
        <p>Customer: ${escapeText(booking.customerName || "Customer")} · ${escapeText(booking.customerPhone || "")}</p>
        <p>Pickup: ${formatDate(booking.pickupDate)} · Return: ${formatDate(booking.returnDate)}</p>
        <p>Vehicle city: ${escapeText(booking.car?.city || "Not provided")}</p>
        ${booking.car?.handoverInstructions ? `<p class="driver-handover-instructions"><strong>Host pickup instructions:</strong> ${escapeText(booking.car.handoverInstructions)}</p>` : ""}
        <p>Handover contact: ${escapeText(host.name || "Host")}${safeHostPhone ? ` · <a href="tel:${escapeText(safeHostPhone)}">${escapeText(safeHostPhone)}</a>` : " · Confirm pickup instructions with the host before travel."}</p>
        <span>Booking: ${escapeText(booking.status)} · Pickup: ${escapeText(booking.pickupStatus || "pending")} · Return: ${escapeText(booking.returnStatus || "pending")}</span>
        ${booking.pickupInspectionStatus === "completed" && booking.pickupStatus !== "confirmed" ? `<p role="status">Pickup photos submitted. Waiting for the host to confirm handover.</p>` : ""}
        ${booking.returnInspectionStatus === "completed" && booking.returnStatus !== "confirmed" ? `<p role="status">Return photos submitted. Waiting for the host to confirm vehicle return.</p>` : ""}
        <div class="driver-inspection-actions">
            ${pickupAvailable ? `<a class="driver-inspection-action" href="booking-inspection.html?bookingId=${encodeURIComponent(booking.bookingId)}&phase=pickup&source=driver">Start pickup inspection</a>` : ""}
            ${returnAvailable ? `<a class="driver-inspection-action" href="booking-inspection.html?bookingId=${encodeURIComponent(booking.bookingId)}&phase=return&source=driver">Start return inspection</a>` : ""}
        </div>
    `;
    return card;
}

function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString("en-IN");
}

function getIndiaTodayDateInputValue() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());
    const part = type => parts.find(item => item.type === type).value;
    return `${part("year")}-${part("month")}-${part("day")}`;
}
