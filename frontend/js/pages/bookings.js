/* =========================================================
   SAARTHI - MY BOOKINGS
========================================================= */


/* =========================================================
   ELEMENTS
========================================================= */

const loading =
    document.getElementById(
        "loading"
    );


const errorBox =
    document.getElementById(
        "error"
    );


const emptyBox =
    document.getElementById(
        "empty"
    );


const bookingsSection =
    document.getElementById(
        "bookingsSection"
    );


const bookingsGrid =
    document.getElementById(
        "bookingsGrid"
    );


const bookingCount =
    document.getElementById(
        "bookingCount"
    );


const welcomeMessage =
    document.getElementById(
        "welcomeMessage"
    );


/* =========================================================
   CHECK LOGIN
========================================================= */

const token =
    localStorage.getItem(
        "saarthiToken"
    );


const storedUser =
    localStorage.getItem(
        "saarthiUser"
    );


if (
    !token
) {

    window.location.href =
        "auth.html";

} else {

    loadMyBookings();

}


/* =========================================================
   LOAD MY BOOKINGS
========================================================= */

async function loadMyBookings() {

    /* -----------------------------------------------------
       User information
    ----------------------------------------------------- */

    if (
        storedUser
    ) {

        try {

            const user =
                JSON.parse(
                    storedUser
                );


            if (
                user.name
            ) {

                welcomeMessage.textContent =
                    `Welcome back, ${user.name}. Here are your Saarthi reservations.`;

            }

        } catch (
            error
        ) {

            console.error(
                "Unable to read stored user:",
                error
            );

        }

    }


    try {

        /* -------------------------------------------------
           Request
        ------------------------------------------------- */

        const response =
            await fetch(
                "/api/bookings/my",
                {

                    method:
                        "GET",

                    headers: {

                        "Authorization":
                            `Bearer ${token}`

                    }

                }
            );


        const result =
            await response.json();


        /* -------------------------------------------------
           Authentication failure
        ------------------------------------------------- */

        if (
            response.status === 401
        ) {

            localStorage.removeItem(
                "saarthiToken"
            );

            localStorage.removeItem(
                "saarthiUser"
            );


            window.location.href =
                "auth.html";


            return;

        }


        /* -------------------------------------------------
           API ERROR
        ------------------------------------------------- */

        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Unable to load your bookings."
            );

        }


        /* -------------------------------------------------
           NO BOOKINGS
        ------------------------------------------------- */

        if (
            !Array.isArray(
                result.data
            ) ||
            result.data.length === 0
        ) {

            loading.classList.add(
                "hidden"
            );


            emptyBox.classList.remove(
                "hidden"
            );


            return;

        }


        /* -------------------------------------------------
           COUNT
        ------------------------------------------------- */

        bookingCount.textContent =
            `${result.count} ${
                result.count === 1
                    ? "booking"
                    : "bookings"
            }`;


        /* -------------------------------------------------
           RENDER
        ------------------------------------------------- */

        result.data.forEach(
            renderBooking
        );


        loading.classList.add(
            "hidden"
        );


        bookingsSection.classList.remove(
            "hidden"
        );


    } catch (error) {

        console.error(
            "My bookings error:",
            error
        );


        loading.classList.add(
            "hidden"
        );


        errorBox.textContent =
            error.message;


        errorBox.classList.remove(
            "hidden"
        );

    }

}


/* =========================================================
   RENDER BOOKING
========================================================= */

function renderBooking(
    booking
) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "booking-card";


    /* =====================================================
       BOOKING STATUS
    ===================================================== */

    const status =
        booking.status ||
        "pending";


    /* =====================================================
       PAYMENT STATUS
    ===================================================== */

    const paymentStatus =
        booking.paymentStatus ||
        "pending";

    const refundStatus = booking.refundStatus || "none";


    const rentalStatus =
        booking.rentalStatus ||
        status;

    /* =====================================================
       DATES
    ===================================================== */

    const pickupDate =
        formatDate(
            booking.pickupDate
        );


    const returnDate =
        formatDate(
            booking.returnDate
        );


    /* =====================================================
       PRICING
    ===================================================== */

    const totalDays =
        Number(
            booking.totalDays || 0
        );


    const dailyPrice =
        Number(
            booking.dailyPrice || 0
        );


    const totalAmount =
        Number(
            booking.totalAmount || 0
        );

    const subtotalAmount = Number(booking.subtotalAmount ?? totalAmount);
    const discountAmount = Math.max(0, Number(booking.discountAmount || 0));
    const couponCode = String(booking.couponCode || "");


    /* =====================================================
       DRIVER
    ===================================================== */

    const driverRequired =
        booking.driverRequired ===
        true;


    /* =====================================================
       CARD HTML
    ===================================================== */

    card.innerHTML = `

        <div
            class="booking-card-header"
        >

            <div>

                <h3>
                    ${escapeHTML(
                        booking.carId
                    )}
                </h3>


                <div
                    class="booking-id"
                >

                    Booking ID:
                    ${escapeHTML(
                        booking.bookingId
                    )}

                </div>

            </div>


            <span
                class="booking-status ${escapeHTML(
                    status
                )}"
            >
                ${escapeHTML(
                    status
                )}
            </span>

            <span
                class="booking-rental-status ${escapeHTML(
                    rentalStatus
                )}"
            >
                ${
                    rentalStatus === "upcoming"
                        ? "Upcoming"
                        : rentalStatus === "active"
                            ? "Active"
                            : rentalStatus === "completed"
                                ? "Completed"
                                : rentalStatus
                }
            </span>

        </div>


        <div
            class="booking-details"
        >

            <div
                class="booking-detail-row"
            >

                <span>
                    Pickup
                </span>

                <strong>
                    ${pickupDate}
                </strong>

            </div>


            <div
                class="booking-detail-row"
            >

                <span>
                    Return
                </span>

                <strong>
                    ${returnDate}
                </strong>

            </div>


            <div
                class="booking-detail-row"
            >

                <span>
                    Rental duration
                </span>

                <strong>

                    ${totalDays}

                    ${
                        totalDays === 1
                            ? "day"
                            : "days"
                    }

                </strong>

            </div>


            <div
                class="booking-detail-row"
            >

                <span>
                    Daily price
                </span>

                <strong>
                    ₹${dailyPrice.toLocaleString(
                        "en-IN"
                    )}
                </strong>

            </div>


            ${
                discountAmount > 0
                    ? `
                        <div class="booking-detail-row">
                            <span>Rental subtotal</span>
                            <strong>₹${subtotalAmount.toLocaleString("en-IN")}</strong>
                        </div>
                        <div class="booking-detail-row booking-coupon-discount-row">
                            <span>Coupon ${escapeHTML(couponCode)}</span>
                            <strong>−₹${discountAmount.toLocaleString("en-IN")}</strong>
                        </div>
                    `
                    : ""
            }

            <div
                class="booking-detail-row booking-total-row"
            >

                <span>
                    Total amount
                </span>

                <strong>
                    ₹${totalAmount.toLocaleString(
                        "en-IN"
                    )}
                </strong>

            </div>

        </div>


        ${booking.handoverInstructions ? `
            <div class="booking-handover-instructions">
                <strong>Pickup instructions from the host</strong>
                <p>${escapeHTML(booking.handoverInstructions)}</p>
            </div>
        ` : ""}


        <!-- Driver information -->

        <div
            class="booking-driver"
        >

            <i
                class="fa-solid ${
                    driverRequired
                        ? "fa-user-check"
                        : "fa-user"
                }"
            ></i>

            <span>

                ${
                    driverRequired
                        ? (booking.assignedDriver?.userId?.name ? `Driver assigned: ${escapeHTML(booking.assignedDriver.userId.name)} · ${escapeHTML(booking.assignedDriver.userId.phone || "Contact details unavailable")}` : "Driver requested · awaiting host assignment")
                        : "Self-drive booking"
                }

            </span>

        </div>


        <!-- Customer inspection photos -->

        ${renderCustomerInspectionSection(booking)}


        <!-- Customer actions -->

        ${
            [
                "pending",
                "confirmed"
            ].includes(status) &&
            !["pending_review", "processing", "failed"].includes(refundStatus)
                ? `

                    <div
                        class="customer-booking-actions"
                    >

                        <button
                            type="button"
                            class="customer-cancel-btn"
                        >

                            <i
                                class="fa-solid fa-xmark"
                            ></i>

                            ${paymentStatus === "paid" ? "Request Cancellation & Refund" : "Cancel Booking"}

                        </button>

                    </div>

                `
                : ""
        }

        ${["pending_review", "processing"].includes(refundStatus) ? `
            <div class="customer-payment-status" role="status">
                <i class="fa-solid fa-hourglass-half" aria-hidden="true"></i>
                ${refundStatus === "processing" ? "Refund processing; the booking remains active until completion." : "Cancellation and refund request is awaiting administrator review."}
            </div>
        ` : refundStatus === "rejected" ? `
            <div class="customer-payment-status" role="status">Refund request was rejected. The booking remains active.</div>
        ` : refundStatus === "failed" ? `
            <div class="customer-payment-status" role="status">Refund needs administrator attention. The booking remains active.</div>
        ` : ""}


        <!-- Payment action -->

        ${
            status === "confirmed" &&
            paymentStatus !== "paid"
                ? `

                    <div
                        class="customer-payment-actions"
                    >

                        <button
                            type="button"
                            class="customer-pay-btn"
                        >

                            <i
                                class="fa-solid fa-credit-card"
                            ></i>

                            Pay Now

                        </button>

                    </div>

                `
                : ""
        }


        <!-- Paid status -->

        ${
            paymentStatus === "paid"
                ? `

                    <div
                        class="customer-payment-status paid"
                    >

                        <i
                            class="fa-solid fa-circle-check"
                        ></i>

                        Payment completed

                    </div>

                `
                : ""
        }

        ${["refunded", "partially_refunded"].includes(paymentStatus) ? `
            <div class="customer-payment-status paid" role="status">
                <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
                ${paymentStatus === "refunded" ? "Refund completed" : "Partial refund completed"} · ₹${(Number(booking.refundedAmountPaise || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
        ` : ""}

    `;


    /* =====================================================
       ADD CARD TO PAGE
    ===================================================== */

    bookingsGrid.appendChild(
        card
    );

    setupCustomerInspectionPhotoPanels(card);


    /* =====================================================
       PAY NOW BUTTON
    ===================================================== */

    const payButton =
        card.querySelector(
            ".customer-pay-btn"
        );


    if (
        payButton
    ) {

        payButton.addEventListener(
            "click",
            async () => {

                await startPayment(
                    booking.bookingId,
                    booking.totalAmount,
                    payButton
                );

            }
        );

    }


    /* =====================================================
       CANCEL BOOKING BUTTON
    ===================================================== */

    const cancelButton =
        card.querySelector(
            ".customer-cancel-btn"
        );


    if (
        cancelButton
    ) {

        cancelButton.addEventListener(
            "click",
            async () => {

                await cancelCustomerBooking(
                    booking.bookingId,
                    cancelButton,
                    paymentStatus === "paid"
                );

            }
        );

    }

}


/* =========================================================
   CUSTOMER INSPECTION PHOTOS
========================================================= */

const inspectionPhotoObjectUrls = [];

window.addEventListener("beforeunload", () => {
    inspectionPhotoObjectUrls.forEach(url => URL.revokeObjectURL(url));
});

function renderCustomerInspectionSection(booking) {
    return `
        <section class="customer-inspection-section" aria-label="Vehicle inspection photos">
            <div class="customer-inspection-heading">
                <h4><i class="fa-solid fa-camera-retro" aria-hidden="true"></i> Vehicle inspection photos</h4>
                <p>View the photos recorded by the host at pickup and return.</p>
            </div>
            ${renderCustomerInspectionPanel(booking, "pickup", booking.pickupInspection)}
            ${renderCustomerInspectionPanel(booking, "return", booking.returnInspection)}
        </section>
    `;
}

function renderCustomerInspectionPanel(booking, phase, inspection) {
    const label = phase === "pickup" ? "Pickup inspection" : "Return inspection";
    const photos = Array.isArray(inspection?.photos) ? inspection.photos : [];
    const completed = inspection?.status === "completed" && photos.length > 0;

    if (!completed) {
        const waitMessage = phase === "pickup"
            ? "Pickup photos will appear here after the host completes the pickup inspection."
            : "Return photos will appear here after the host completes the return inspection.";
        return `
            <div class="customer-inspection-unavailable">
                <span>${escapeHTML(label)}</span>
                <p>${waitMessage}</p>
            </div>
        `;
    }

    const safePhotos = photos.filter(photo => INSPECTION_ANGLE_LABELS[photo?.angle]);
    const notes = String(inspection.notes || "").trim();

    return `
        <details class="customer-inspection-panel" data-inspection-phase="${phase}">
            <summary>
                <span class="customer-inspection-summary-label">
                    <i class="fa-solid ${phase === "pickup" ? "fa-car-side" : "fa-flag-checkered"}" aria-hidden="true"></i>
                    ${escapeHTML(label)}
                </span>
                <span class="customer-inspection-count">${safePhotos.length} photo${safePhotos.length === 1 ? "" : "s"}</span>
            </summary>
            <div class="customer-inspection-panel-body">
                <p class="customer-inspection-date">Completed ${escapeHTML(formatDate(inspection.completedAt))}</p>
                <div class="customer-inspection-photo-grid">
                    ${safePhotos.map(photo => `
                        <figure class="customer-inspection-photo-card">
                            <button
                                type="button"
                                class="customer-inspection-photo-frame customer-inspection-photo-open"
                                aria-label="Open ${escapeHTML(INSPECTION_ANGLE_LABELS[photo.angle])} photo in full-screen viewer"
                                disabled
                            >
                                <img
                                    alt="${escapeHTML(INSPECTION_ANGLE_LABELS[photo.angle])} vehicle inspection photo"
                                    data-inspection-photo="true"
                                    data-booking-id="${escapeHTML(booking.bookingId)}"
                                    data-phase="${phase}"
                                    data-angle="${escapeHTML(photo.angle)}"
                                    hidden
                                >
                                <div class="customer-inspection-photo-placeholder" role="status">Open this section to load photo</div>
                                <span class="customer-inspection-photo-zoom-hint" aria-hidden="true"><i class="fa-solid fa-expand"></i></span>
                            </button>
                            <figcaption>${escapeHTML(INSPECTION_ANGLE_LABELS[photo.angle])}</figcaption>
                        </figure>
                    `).join("")}
                </div>
                ${notes ? `<p class="customer-inspection-notes"><strong>Host notes:</strong> ${escapeHTML(notes)}</p>` : ""}
            </div>
        </details>
    `;
}

const INSPECTION_ANGLE_LABELS = Object.freeze({
    "front": "Front",
    "front-left": "Front left",
    "left": "Left side",
    "rear-left": "Rear left",
    "rear": "Rear",
    "rear-right": "Rear right",
    "right": "Right side",
    "front-right": "Front right"
});

function setupCustomerInspectionPhotoPanels(card) {
    card.querySelectorAll(".customer-inspection-panel").forEach(panel => {
        panel.addEventListener("toggle", () => {
            if (panel.open) {
                loadCustomerInspectionPhotos(panel);
            }
        });

        panel.addEventListener("click", event => {
            const photoButton = event.target.closest(".customer-inspection-photo-open");
            if (!photoButton || photoButton.disabled) return;
            openCustomerInspectionGallery(panel, photoButton);
        });
    });
}

let customerInspectionLightbox = null;
let customerInspectionGalleryState = null;
let customerInspectionLastFocusedElement = null;

function ensureCustomerInspectionLightbox() {
    if (customerInspectionLightbox) return customerInspectionLightbox;

    const modal = document.createElement("div");
    modal.className = "customer-inspection-lightbox";
    modal.hidden = true;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Vehicle inspection photo viewer");
    modal.innerHTML = `
        <div class="customer-inspection-lightbox-backdrop" data-lightbox-close="true"></div>
        <div class="customer-inspection-lightbox-shell">
            <header class="customer-inspection-lightbox-header">
                <div class="customer-inspection-lightbox-heading">
                    <strong class="customer-inspection-lightbox-title">Pickup inspection</strong>
                    <span class="customer-inspection-lightbox-counter" aria-live="polite">1 / 8</span>
                </div>
                <button type="button" class="customer-inspection-lightbox-close" aria-label="Close photo viewer">
                    <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                </button>
            </header>
            <div class="customer-inspection-lightbox-stage">
                <button type="button" class="customer-inspection-lightbox-nav customer-inspection-lightbox-prev" aria-label="Previous photo">
                    <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
                </button>
                <div class="customer-inspection-lightbox-image-wrap">
                    <img class="customer-inspection-lightbox-image" alt="Vehicle inspection photo" draggable="false">
                    <div class="customer-inspection-lightbox-caption" aria-live="polite">Front</div>
                </div>
                <button type="button" class="customer-inspection-lightbox-nav customer-inspection-lightbox-next" aria-label="Next photo">
                    <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
                </button>
            </div>
            <footer class="customer-inspection-lightbox-footer">
                <span>Swipe to browse on mobile</span>
                <span class="customer-inspection-lightbox-key-hint">Use ← and → to navigate · Esc to close</span>
            </footer>
        </div>
    `;

    document.body.appendChild(modal);
    customerInspectionLightbox = modal;

    modal.querySelector(".customer-inspection-lightbox-close").addEventListener("click", closeCustomerInspectionGallery);
    modal.querySelector(".customer-inspection-lightbox-prev").addEventListener("click", () => moveCustomerInspectionGallery(-1));
    modal.querySelector(".customer-inspection-lightbox-next").addEventListener("click", () => moveCustomerInspectionGallery(1));
    modal.addEventListener("click", event => {
        if (event.target === modal || event.target?.dataset?.lightboxClose === "true") {
            closeCustomerInspectionGallery();
        }
    });

    const stage = modal.querySelector(".customer-inspection-lightbox-stage");
    let touchStartX = null;
    let touchStartY = null;
    stage.addEventListener("touchstart", event => {
        if (!event.changedTouches?.length) return;
        touchStartX = event.changedTouches[0].clientX;
        touchStartY = event.changedTouches[0].clientY;
    }, { passive: true });
    stage.addEventListener("touchend", event => {
        if (touchStartX === null || !event.changedTouches?.length) return;
        const deltaX = event.changedTouches[0].clientX - touchStartX;
        const deltaY = event.changedTouches[0].clientY - touchStartY;
        touchStartX = null;
        touchStartY = null;
        if (Math.abs(deltaX) >= 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
            moveCustomerInspectionGallery(deltaX < 0 ? 1 : -1);
        }
    }, { passive: true });

    document.addEventListener("keydown", event => {
        if (!customerInspectionGalleryState || customerInspectionLightbox?.hidden) return;
        if (event.key === "Escape") {
            event.preventDefault();
            closeCustomerInspectionGallery();
        } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            moveCustomerInspectionGallery(-1);
        } else if (event.key === "ArrowRight") {
            event.preventDefault();
            moveCustomerInspectionGallery(1);
        } else if (event.key === "Tab") {
            // Keep keyboard focus within the modal while it is open.
            const focusable = Array.from(modal.querySelectorAll("button:not([disabled]):not([hidden])"));
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    });

    return modal;
}

function openCustomerInspectionGallery(panel, photoButton) {
    const modal = ensureCustomerInspectionLightbox();
    const photos = Array.from(panel.querySelectorAll('img[data-inspection-photo="true"][data-loaded="true"]'))
        .filter(img => !img.hidden && img.src)
        .map(img => ({
            src: img.src,
            angle: img.dataset.angle,
            label: INSPECTION_ANGLE_LABELS[img.dataset.angle] || "Vehicle photo",
            alt: img.alt || "Vehicle inspection photo"
        }));

    if (!photos.length) return;

    const clickedImage = photoButton.querySelector('img[data-inspection-photo="true"]');
    const clickedIndex = photos.findIndex(photo => photo.src === clickedImage?.src);
    const phase = panel.dataset.inspectionPhase === "return" ? "Return inspection" : "Pickup inspection";

    customerInspectionLastFocusedElement = photoButton;
    customerInspectionGalleryState = {
        photos,
        index: Math.max(0, clickedIndex),
        title: phase
    };

    modal.querySelector(".customer-inspection-lightbox-title").textContent = phase;
    modal.hidden = false;
    document.body.classList.add("customer-inspection-lightbox-open");
    renderCustomerInspectionGalleryImage();
    modal.querySelector(".customer-inspection-lightbox-close").focus();
}

function moveCustomerInspectionGallery(step) {
    if (!customerInspectionGalleryState?.photos?.length) return;
    const total = customerInspectionGalleryState.photos.length;
    customerInspectionGalleryState.index = (customerInspectionGalleryState.index + step + total) % total;
    renderCustomerInspectionGalleryImage();
}

function renderCustomerInspectionGalleryImage() {
    if (!customerInspectionGalleryState || !customerInspectionLightbox) return;
    const { photos, index, title } = customerInspectionGalleryState;
    const photo = photos[index];
    customerInspectionLightbox.querySelector(".customer-inspection-lightbox-title").textContent = title;
    customerInspectionLightbox.querySelector(".customer-inspection-lightbox-counter").textContent = `${index + 1} / ${photos.length}`;
    customerInspectionLightbox.querySelector(".customer-inspection-lightbox-image").src = photo.src;
    customerInspectionLightbox.querySelector(".customer-inspection-lightbox-image").alt = `${photo.label} ${title.toLowerCase()} photo`;
    customerInspectionLightbox.querySelector(".customer-inspection-lightbox-caption").textContent = photo.label;
    const navButtons = customerInspectionLightbox.querySelectorAll(".customer-inspection-lightbox-nav");
    navButtons.forEach(button => { button.hidden = photos.length < 2; });
}

function closeCustomerInspectionGallery() {
    if (!customerInspectionLightbox || customerInspectionLightbox.hidden) return;
    customerInspectionLightbox.hidden = true;
    document.body.classList.remove("customer-inspection-lightbox-open");
    customerInspectionGalleryState = null;
    if (customerInspectionLastFocusedElement?.isConnected) {
        customerInspectionLastFocusedElement.focus();
    }
    customerInspectionLastFocusedElement = null;
}

async function loadCustomerInspectionPhotos(panel) {
    const images = Array.from(
        panel.querySelectorAll('img[data-inspection-photo="true"]')
    ).filter(img => img.dataset.loaded !== "true" && img.dataset.loading !== "true");

    if (!images.length) return;

    await Promise.all(images.map(async img => {
        img.dataset.loading = "true";
        const placeholder = img.parentElement.querySelector(".customer-inspection-photo-placeholder");
        const bookingId = img.dataset.bookingId;
        const phase = img.dataset.phase;
        const angle = img.dataset.angle;

        try {
            const response = await fetch(
                `/api/bookings/my/${encodeURIComponent(bookingId)}/inspection-photo/${encodeURIComponent(phase)}/${encodeURIComponent(angle)}`,
                {
                    method: "GET",
                    headers: { "Authorization": `Bearer ${token}` }
                }
            );

            if (response.status === 401) {
                localStorage.removeItem("saarthiToken");
                localStorage.removeItem("saarthiUser");
                window.location.href = `auth.html?returnUrl=${encodeURIComponent(window.location.href)}`;
                return;
            }

            if (!response.ok) {
                throw new Error(response.status === 403
                    ? "You are not authorized to view this photo."
                    : "Photo is currently unavailable.");
            }

            const blob = await response.blob();
            if (!blob.type.startsWith("image/")) {
                throw new Error("The server returned an invalid image.");
            }

            const objectUrl = URL.createObjectURL(blob);
            inspectionPhotoObjectUrls.push(objectUrl);
            img.src = objectUrl;
            img.hidden = false;
            img.dataset.loaded = "true";
            const openButton = img.closest(".customer-inspection-photo-open");
            if (openButton) openButton.disabled = false;
            if (placeholder) placeholder.hidden = true;
        } catch (error) {
            console.error("Unable to load customer inspection photo:", error);
            if (placeholder) placeholder.textContent = error.message || "Unable to load photo.";
            img.dataset.error = "true";
        } finally {
            delete img.dataset.loading;
        }
    }));
}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
    dateValue
) {

    if (
        !dateValue
    ) {

        return "—";

    }


    const date =
        new Date(
            dateValue
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "—";

    }


    return date.toLocaleDateString(
        "en-IN",
        {

            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric"

        }
    );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    return String(
        value
    )

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}

/* =========================================================
   CANCEL CUSTOMER BOOKING
========================================================= */

async function cancelCustomerBooking(
    bookingId,
    button,
    requestRefund
) {

    const confirmed =
        window.confirm(
            requestRefund
                ? "Send a cancellation and refund request for administrator review? Your booking will remain active until a refund is processed."
                : "Are you sure you want to cancel this booking?"
        );


    if (
        !confirmed
    ) {

        return;

    }


    try {

        /* -------------------------------------------------
           LOADING STATE
        ------------------------------------------------- */

        button.disabled =
            true;


        button.innerHTML = `

            <i
                class="fa-solid fa-spinner fa-spin"
            ></i>

            Cancelling...

        `;


        /* -------------------------------------------------
           REQUEST
        ------------------------------------------------- */

        const response =
            await fetch(
                `/api/bookings/my/${encodeURIComponent(
                    bookingId
                )}/cancel`,
                {

                    method:
                        "PATCH",

                    headers: {

                        "Authorization":
                            `Bearer ${token}`

                    }

                }
            );


        const result =
            await response.json();


        /* -------------------------------------------------
           AUTH ERROR
        ------------------------------------------------- */

        if (
            response.status === 401
        ) {

            localStorage.removeItem(
                "saarthiToken"
            );


            localStorage.removeItem(
                "saarthiUser"
            );


            window.location.href =
                `auth.html?returnUrl=${encodeURIComponent(
                    window.location.href
                )}`;


            return;

        }


        /* -------------------------------------------------
           API ERROR
        ------------------------------------------------- */

        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Unable to cancel booking."
            );

        }


        /* -------------------------------------------------
           SUCCESS
        ------------------------------------------------- */

        alert(
            result.message || "Booking cancelled successfully."
        );


        /* -------------------------------------------------
           RELOAD BOOKINGS
        ------------------------------------------------- */

        window.location.reload();


    } catch (error) {

        console.error(
            "Cancel booking error:",
            error
        );


        alert(
            error.message ||
            "Unable to cancel booking."
        );


        /* -------------------------------------------------
           RESTORE BUTTON
        ------------------------------------------------- */

        button.disabled =
            false;


        button.innerHTML = `

            <i
                class="fa-solid fa-xmark"
            ></i>

            Cancel Booking

        `;

    }

}

/* =========================================================
   START RAZORPAY PAYMENT
========================================================= */

async function startPayment(
    bookingId,
    totalAmount,
    button
) {

    try {

        button.disabled =
            true;


        button.innerHTML = `

            <i
                class="fa-solid fa-spinner fa-spin"
            ></i>

            Preparing payment...

        `;


        /* -------------------------------------------------
           CREATE RAZORPAY ORDER
        ------------------------------------------------- */

        const response =
            await fetch(
                "/api/payments/create-order",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`

                    },

                    body:
                        JSON.stringify({

                            bookingId

                        })

                }
            );


        const result =
            await response.json();


        if (
            response.status === 401
        ) {

            localStorage.removeItem(
                "saarthiToken"
            );


            localStorage.removeItem(
                "saarthiUser"
            );


            window.location.href =
                `auth.html?returnUrl=${encodeURIComponent(
                    window.location.href
                )}`;


            return;

        }


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Unable to start payment."
            );

        }


        const {
            orderId,
            amount,
            currency,
            keyId
        } =
            result.data;


        /* -------------------------------------------------
           RAZORPAY CHECKOUT
        ------------------------------------------------- */

        if (
            typeof Razorpay ===
            "undefined"
        ) {

            throw new Error(
                "Razorpay Checkout failed to load."
            );

        }


        const options = {

            key:
                keyId,

            amount:
                amount,

            currency:
                currency,

            name:
                "Saarthi",

            description:
                `Car booking ${bookingId}`,

            order_id:
                orderId,


            prefill: {

                name:
                    saarthiUser?.name ||
                    "",

                email:
                    saarthiUser?.email ||
                    ""

            },


            theme: {

                color:
                    "#2563eb"

            },


            handler:
                async function (
                    paymentResponse
                ) {

                    console.log(
                        "Razorpay payment response:",
                        paymentResponse
                    );


                    try {

                        button.disabled =
                            true;


                        button.innerHTML = `

                            <i
                                class="fa-solid fa-spinner fa-spin"
                            ></i>

                            Verifying payment...

                        `;


                        /* ---------------------------------------------
                        SEND PAYMENT TO BACKEND
                        --------------------------------------------- */

                        const verifyResponse =
                            await fetch(
                                "/api/payments/verify",
                                {

                                    method:
                                        "POST",

                                    headers: {

                                        "Content-Type":
                                            "application/json",

                                        "Authorization":
                                            `Bearer ${token}`

                                    },

                                    body:
                                        JSON.stringify({

                                            bookingId,

                                            razorpay_payment_id:
                                                paymentResponse
                                                    .razorpay_payment_id,

                                            razorpay_order_id:
                                                paymentResponse
                                                    .razorpay_order_id,

                                            razorpay_signature:
                                                paymentResponse
                                                    .razorpay_signature

                                        })

                                }
                            );


                        const verifyResult =
                            await verifyResponse.json();


                        /* ---------------------------------------------
                        AUTH ERROR
                        --------------------------------------------- */

                        if (
                            verifyResponse.status ===
                            401
                        ) {

                            localStorage.removeItem(
                                "saarthiToken"
                            );


                            localStorage.removeItem(
                                "saarthiUser"
                            );


                            window.location.href =
                                `auth.html?returnUrl=${encodeURIComponent(
                                    window.location.href
                                )}`;


                            return;

                        }


                        /* ---------------------------------------------
                        VERIFICATION ERROR
                        --------------------------------------------- */

                        if (
                            !verifyResponse.ok ||
                            !verifyResult.success
                        ) {

                            throw new Error(
                                verifyResult.message ||
                                "Payment verification failed."
                            );

                        }


                        /* ---------------------------------------------
                        VERIFIED
                        --------------------------------------------- */

                        alert(
                            "Payment successful and verified."
                        );


                        window.location.reload();


                    } catch (error) {

                        console.error(
                            "Payment verification error:",
                            error
                        );


                        alert(
                            error.message ||
                            "Payment was completed but verification failed."
                        );


                        button.disabled =
                            false;


                        button.innerHTML = `

                            <i
                                class="fa-solid fa-credit-card"
                            ></i>

                            Pay Now

                        `;

                    }

                },

        };


        const razorpay =
            new Razorpay(
                options
            );


        razorpay.on(
            "payment.failed",
            function (
                response
            ) {

                console.error(
                    "Razorpay payment failed:",
                    response
                );


                alert(
                    "Payment failed. Please try again."
                );


                button.disabled =
                    false;


                button.innerHTML = `

                    <i
                        class="fa-solid fa-credit-card"
                    ></i>

                    Pay Now

                `;

            }
        );


        razorpay.open();


    } catch (error) {

        console.error(
            "Payment initialization error:",
            error
        );


        alert(
            error.message ||
            "Unable to start payment."
        );


        button.disabled =
            false;


        button.innerHTML = `

            <i
                class="fa-solid fa-credit-card"
            ></i>

            Pay Now

        `;

    }

}
