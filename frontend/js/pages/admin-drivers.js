"use strict";

const statusNode = document.getElementById("status");
const listNode = document.getElementById("applications");
const token = localStorage.getItem("saarthiToken");

async function load() {
    if (!token) {
        showSignIn("Sign in with an administrator account to manage driver profiles.");
        return;
    }

    statusNode.textContent = "Loading driver profiles…";
    try {
        const response = await fetch("/api/drivers/admin", {
            headers: { Authorization: `Bearer ${token}` }
        });
        const result = await response.json();
        if (response.status === 401 || response.status === 403) {
            showSignIn(result.message || "Administrator access is required.");
            return;
        }
        if (!response.ok || !result.success) {
            throw new Error(result.message || "Unable to load driver profiles.");
        }

        const drivers = Array.isArray(result.data) ? result.data : [];
        const counts = drivers.reduce((totals, driver) => {
            const state = driver.status || "unknown";
            totals[state] = (totals[state] || 0) + 1;
            return totals;
        }, {});
        statusNode.textContent = `${drivers.length} driver profile(s) · ${counts.pending_review || 0} pending · ${counts.active || 0} active · ${counts.suspended || 0} suspended`;
        listNode.replaceChildren(...drivers.map(renderDriverCard));
        if (!drivers.length) listNode.textContent = "No driver profiles have been submitted.";
    } catch (error) {
        statusNode.textContent = error.message;
    }
}

function renderDriverCard(driver) {
    const card = document.createElement("article");
    card.className = "application";
    const user = driver.userId || {};
    const state = driver.status || "unknown";
    const created = formatDate(driver.createdAt);
    const expiry = formatDate(driver.licenseExpiry);
    const actions = state === "pending_review"
        ? `<button class="approve" data-status="active">Approve</button><button class="reject" data-status="suspended">Reject application</button>`
        : state === "active"
            ? `<button class="reject" data-status="suspended">Suspend driver</button>`
            : state === "suspended"
                ? `<button class="approve" data-status="active">Reactivate</button>`
                : "";

    card.innerHTML = `
        <span class="driver-state">${escapeHtml(state.replaceAll("_", " "))}</span>
        <h2>${escapeHtml(user.name || "Driver profile")}</h2>
        <p>${escapeHtml(user.email || "")} · ${escapeHtml(user.phone || "")}</p>
        <p>License: ${escapeHtml(driver.licenseNumber || "Not provided")} · expires ${escapeHtml(expiry)}</p>
        <p>Operating city: ${escapeHtml(driver.city || "Not provided")} · applied ${escapeHtml(created)}</p>
        <div class="driver-review-actions">${actions}</div>
    `;

    card.addEventListener("click", event => reviewDriver(event, driver, card));
    return card;
}

async function reviewDriver(event, driver, card) {
    const button = event.target.closest("button[data-status]");
    if (!button) return;
    const nextStatus = button.dataset.status;
    if (nextStatus === "suspended" && !window.confirm("Suspend this driver? They will no longer receive new assignments.")) return;

    button.disabled = true;
    statusNode.textContent = "Updating driver profile…";
    try {
        const response = await fetch(`/api/drivers/${encodeURIComponent(driver._id)}/review`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ status: nextStatus })
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Driver review failed.");
        await load();
    } catch (error) {
        statusNode.textContent = error.message;
        button.disabled = false;
    }
}

function showSignIn(message) {
    statusNode.replaceChildren(document.createTextNode(`${message} `));
    const link = document.createElement("a");
    const returnUrl = `${window.location.pathname}${window.location.search}`;
    link.href = `auth.html?returnUrl=${encodeURIComponent(returnUrl)}`;
    link.textContent = "Open sign in";
    statusNode.append(link);
}

function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString("en-IN");
}

function escapeHtml(value) {
    const node = document.createElement("span");
    node.textContent = String(value ?? "");
    return node.innerHTML;
}

load();
