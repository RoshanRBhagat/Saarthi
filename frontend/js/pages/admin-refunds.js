"use strict";

const statusNode = document.getElementById("refundStatus");
const listNode = document.getElementById("refundList");
const token = localStorage.getItem("saarthiToken");

async function loadRefunds() {
    if (!token) {
        statusNode.textContent = "Sign in with an administrator account to review refunds.";
        return;
    }
    try {
        const response = await fetch("/api/payments/refunds/pending", {
            headers: { Authorization: `Bearer ${token}` }
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Unable to load refund requests.");
        const rows = Array.isArray(result.data) ? result.data : [];
        statusNode.textContent = `${rows.length} refund request(s) need attention.`;
        listNode.replaceChildren(...rows.map(renderRefundCard));
        if (!rows.length) listNode.textContent = "There are no refund requests to review.";
    } catch (error) {
        statusNode.textContent = error.message;
    }
}

function renderRefundCard(refund) {
    const card = document.createElement("article");
    card.className = "refund-card";
    const totalRupees = Math.max(0, Number(refund.totalAmount) || 0);
    const state = refund.refundStatus || "pending_review";
    const pickup = formatDate(refund.pickupDate);
    const returnDate = formatDate(refund.returnDate);
    const processing = state === "processing";
    const failed = state === "failed";
    const alreadyCancelled = refund.status === "cancelled";

    card.innerHTML = `
        <span class="refund-state">${escapeHtml(state.replaceAll("_", " "))}</span>
        <h2>${escapeHtml(refund.customerName || "Customer")} · ${escapeHtml(refund.carId || "Vehicle")}</h2>
        <p>Booking ${escapeHtml(refund.bookingId)} · ${escapeHtml(pickup)} to ${escapeHtml(returnDate)}</p>
        ${alreadyCancelled ? `<p class="refund-reason"><strong>Booking status:</strong> Cancelled. A payment arrived after cancellation and must be resolved with a refund.</p>` : ""}
        <p>Contact: ${escapeHtml(refund.customerEmail || "No email")} · ${escapeHtml(refund.customerPhone || "No phone")}</p>
        <p>Paid total: <strong>${formatRupees(totalRupees)}</strong> · Previously refunded: <strong>${formatRupees((Number(refund.refundedAmountPaise) || 0) / 100)}</strong></p>
        <p class="refund-reason"><strong>Customer reason:</strong> ${escapeHtml(refund.refundReason || "No reason provided")}</p>
        ${processing ? `<div class="refund-actions"><button type="button" class="refund-refresh" data-action="refresh">Refresh provider status</button></div><p>Do not submit another refund while this payment is processing.</p>` : `
            <div class="refund-controls">
                <label>Refund amount (₹)<input class="refund-amount" type="number" min="0.01" max="${totalRupees.toFixed(2)}" step="0.01" value="${totalRupees.toFixed(2)}" inputmode="decimal"></label>
                <label>Administrator note<textarea class="refund-note" maxlength="500" placeholder="Reason for this decision"></textarea></label>
            </div>
            <div class="refund-actions">
                <button type="button" class="refund-process" data-action="refund">${failed ? "Verify and retry refund" : "Approve and refund"}</button>
                ${failed || alreadyCancelled ? "" : `<button type="button" class="refund-reject" data-action="reject">Reject request</button>`}
            </div>
            ${failed ? `<p>Before retrying, the system checks the previous provider refund status to avoid a duplicate.</p>` : ""}
        `}
    `;

    card.addEventListener("click", event => handleRefundAction(event, refund, card));
    return card;
}

async function handleRefundAction(event, refund, card) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "reject" && !window.confirm("Reject this cancellation and refund request? The booking stays active.")) return;
    if (action === "refund" && !window.confirm("Submit the selected refund amount to Razorpay? Confirm the amount and Saarthi policy before proceeding.")) return;

    const amount = Number(card.querySelector(".refund-amount")?.value);
    const amountPaise = Math.round(amount * 100);
    const totalPaise = Math.round(Number(refund.totalAmount) * 100);
    if (action === "refund" && (!Number.isSafeInteger(amountPaise) || amountPaise < 1 || amountPaise > totalPaise)) {
        statusNode.textContent = "Enter a valid refund amount within the paid total.";
        return;
    }

    button.disabled = true;
    statusNode.textContent = action === "refresh" ? "Checking Razorpay refund status…" : "Updating refund request…";
    try {
        const endpoint = action === "refresh"
            ? `/api/payments/refunds/${encodeURIComponent(refund.bookingId)}/refresh`
            : `/api/payments/refunds/${encodeURIComponent(refund.bookingId)}/review`;
        const response = await fetch(endpoint, {
            method: action === "refresh" ? "POST" : "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            ...(action === "refresh" ? {} : {
                body: JSON.stringify({
                    decision: action,
                    amountPaise: action === "refund" ? amountPaise : undefined,
                    note: card.querySelector(".refund-note")?.value || ""
                })
            })
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Unable to update refund request.");
        statusNode.textContent = result.message;
        await loadRefunds();
    } catch (error) {
        statusNode.textContent = error.message;
        button.disabled = false;
    }
}

function formatRupees(value) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
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

loadRefunds();
