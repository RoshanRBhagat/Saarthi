/* =========================================================
   SAARTHI - BOOKING VEHICLE INSPECTION
   Eight-angle pickup and return photo capture
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const params = new URLSearchParams(window.location.search);

    const bookingId = params.get("bookingId");
    const phase = params.get("phase");
    const token = localStorage.getItem("saarthiToken");

    const angles = [
        "front",
        "front-left",
        "left",
        "rear-left",
        "rear",
        "rear-right",
        "right",
        "front-right"
    ];

    const images = new Map();

    const pageTitle = document.getElementById("pageTitle");
    const pageDescription = document.getElementById("pageDescription");
    const bookingReference = document.getElementById("bookingReference");
    const photoProgress = document.getElementById("photoProgress");
    const progressBar = document.getElementById("progressBar");
    const saveButton = document.getElementById("saveInspectionBtn");
    const inspectionNotes = document.getElementById("inspectionNotes");
    const inspectionError = document.getElementById("inspectionError");
    const inspectionSuccess = document.getElementById("inspectionSuccess");
    const dashboardLink = document.getElementById("dashboardLink");

    const MAX_FILE_BYTES = 5 * 1024 * 1024;
    const MAX_COMPRESSED_BYTES = 1.25 * 1024 * 1024;

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];


    /* ---------------------------------------------------------
       INITIALIZE
    --------------------------------------------------------- */

    if (!token) {
        window.location.href =
            `auth.html?returnUrl=${encodeURIComponent(window.location.href)}`;
        return;
    }

    if (
        !bookingId ||
        !/^[a-zA-Z0-9_-]+$/.test(bookingId) ||
        !["pickup", "return"].includes(phase)
    ) {
        showError("Invalid booking inspection link.");
        saveButton.disabled = true;
        return;
    }

    bookingReference.textContent = bookingId;

    if (phase === "pickup") {
        pageTitle.textContent = "Pickup Inspection";
        pageDescription.textContent =
            "Record the vehicle's condition before handing it over to the customer.";
    } else {
        pageTitle.textContent = "Return Inspection";
        pageDescription.textContent =
            "Record the vehicle's condition after it is returned by the customer.";
    }

    dashboardLink.href = "host-dashboard.html";


    /* ---------------------------------------------------------
       IMAGE INPUTS
    --------------------------------------------------------- */

    document.querySelectorAll("[data-angle]").forEach(input => {
        input.addEventListener("change", async () => {
            clearMessages();

            const file = input.files?.[0];
            const angle = input.dataset.angle;

            if (!file) {
                return;
            }

            try {
                if (!allowedTypes.includes(file.type)) {
                    throw new Error(
                        "Use a JPG, PNG or WebP photo."
                    );
                }

                if (file.size > MAX_FILE_BYTES) {
                    throw new Error(
                        "The selected photo must be 5 MB or smaller."
                    );
                }

                const dataUrl = await compressImage(file);

                images.set(angle, {
                    angle,
                    dataUrl
                });

                renderPreview(angle, dataUrl);
                updateProgress();

            } catch (error) {
                input.value = "";
                images.delete(angle);
                renderEmptyPreview(angle);
                updateProgress();
                showError(error.message);
            }
        });
    });


    /* ---------------------------------------------------------
       COMPRESS PHOTO TO JPEG
    --------------------------------------------------------- */

    async function compressImage(file) {
        const sourceUrl = await readFile(file);

        const image = await loadImage(sourceUrl);

        let dataUrl = drawCompressed(image, 1280, 0.72);

        if (estimateBytes(dataUrl) > MAX_COMPRESSED_BYTES) {
            dataUrl = drawCompressed(image, 960, 0.50);
        }

        if (estimateBytes(dataUrl) > MAX_COMPRESSED_BYTES) {
            throw new Error(
                "This photo is still too large after compression. Please choose another photo."
            );
        }

        return dataUrl;
    }


    function readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => resolve(reader.result);

            reader.onerror = () => reject(
                new Error("Unable to read the selected photo.")
            );

            reader.readAsDataURL(file);
        });
    }


    function loadImage(source) {
        return new Promise((resolve, reject) => {
            const image = new Image();

            image.onload = () => resolve(image);

            image.onerror = () => reject(
                new Error("Unable to process this photo.")
            );

            image.src = source;
        });
    }


    function drawCompressed(image, maxDimension, quality) {
        let width = image.width;
        let height = image.height;

        const longestSide = Math.max(width, height);

        if (longestSide > maxDimension) {
            const scale = maxDimension / longestSide;
            width = Math.round(width * scale);
            height = Math.round(height * scale);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        if (!context) {
            throw new Error("Unable to process the photo in this browser.");
        }

        context.drawImage(image, 0, 0, width, height);

        return canvas.toDataURL("image/jpeg", quality);
    }


    function estimateBytes(dataUrl) {
        const encoded = dataUrl.split(",")[1] || "";
        return Math.floor(encoded.length * 3 / 4);
    }


    /* ---------------------------------------------------------
       PREVIEWS
    --------------------------------------------------------- */

    function renderPreview(angle, dataUrl) {
        const card = document.querySelector(
            `[data-angle-card="${angle}"]`
        );

        if (!card) {
            return;
        }

        const preview = card.querySelector(".photo-preview");
        const buttonLabel = card.querySelector(".photo-button span");

        preview.innerHTML = `
            <img src="${dataUrl}" alt="${escapeHTML(angle)} inspection photo">
            <div class="photo-status">
                <i class="fa-solid fa-circle-check"></i>
                Photo ready
            </div>
            <div class="replace-hint">Select the button above to replace this photo.</div>
        `;

        preview.classList.remove("hidden");
        card.classList.add("photo-ready");

        if (buttonLabel) {
            buttonLabel.textContent = "Replace photo";
        }
    }


    function renderEmptyPreview(angle) {
        const card = document.querySelector(
            `[data-angle-card="${angle}"]`
        );

        if (!card) {
            return;
        }

        const preview = card.querySelector(".photo-preview");
        const buttonLabel = card.querySelector(".photo-button span");

        preview.innerHTML = "";
        preview.classList.add("hidden");
        card.classList.remove("photo-ready");

        if (buttonLabel) {
            buttonLabel.textContent = "Select photo";
        }
    }


    function updateProgress() {
        const count = images.size;

        photoProgress.textContent =
            `${count} of 8 completed`;

        progressBar.style.width =
            `${(count / angles.length) * 100}%`;

        saveButton.disabled =
            count !== angles.length;
    }


    /* ---------------------------------------------------------
       SAVE INSPECTION
    --------------------------------------------------------- */

    saveButton.addEventListener("click", async () => {
        clearMessages();

        if (images.size !== angles.length) {
            showError("Upload a photo for all eight angles before continuing.");
            return;
        }

        const photos = angles.map(angle => images.get(angle));

        if (photos.some(photo => !photo?.dataUrl)) {
            showError("One or more inspection photos are missing.");
            return;
        }

        const totalBytes = photos.reduce(
            (total, photo) => total + estimateBytes(photo.dataUrl),
            0
        );

        if (totalBytes > 9 * 1024 * 1024) {
            showError(
                "The combined photos are too large. Replace the largest photos with clearer, smaller images."
            );
            return;
        }

        const confirmed = window.confirm(
            phase === "pickup"
                ? "Save these eight photos as the vehicle's BEFORE-rental condition?"
                : "Save these eight photos as the vehicle's AFTER-rental condition?"
        );

        if (!confirmed) {
            return;
        }

        saveButton.disabled = true;
        saveButton.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Saving inspection photos...
        `;

        try {
            const response = await fetch(
                `/api/bookings/host/${encodeURIComponent(bookingId)}/inspection/${phase}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        photos,
                        notes: inspectionNotes.value.trim()
                    })
                }
            );

            let result;

            try {
                result = await response.json();
            } catch {
                throw new Error(
                    "The server returned an invalid response."
                );
            }

            if (
                response.status === 401 ||
                response.status === 403
            ) {
                localStorage.removeItem("saarthiToken");
                localStorage.removeItem("saarthiUser");

                window.location.href =
                    `auth.html?returnUrl=${encodeURIComponent(window.location.href)}`;

                return;
            }

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    "Unable to save inspection photos."
                );
            }

            inspectionSuccess.textContent =
                `${phase === "pickup" ? "Pickup" : "Return"} inspection saved successfully. ` +
                "Return to the Host Dashboard to continue the booking.";

            inspectionSuccess.classList.remove("hidden");

            saveButton.innerHTML = `
                <i class="fa-solid fa-circle-check"></i>
                Inspection Saved
            `;

            dashboardLink.textContent =
                "Continue to Host Dashboard";

            dashboardLink.classList.add("saved-link");

            // Stop accidental duplicate submission.
            document.querySelectorAll("[data-angle]").forEach(input => {
                input.disabled = true;
            });

        } catch (error) {
            console.error("Inspection upload error:", error);
            showError(error.message || "Unable to save inspection photos.");

            saveButton.disabled = false;
            saveButton.innerHTML = `
                <i class="fa-solid fa-cloud-arrow-up"></i>
                Save 8 Inspection Photos
            `;

        } finally {
            if (images.size === angles.length &&
                !inspectionSuccess.classList.contains("hidden")) {
                saveButton.disabled = true;
            }
        }
    });


    /* ---------------------------------------------------------
       MESSAGES / ESCAPING
    --------------------------------------------------------- */

    function showError(message) {
        inspectionError.textContent = message;
        inspectionError.classList.remove("hidden");
    }


    function clearMessages() {
        inspectionError.textContent = "";
        inspectionError.classList.add("hidden");

        inspectionSuccess.textContent = "";
        inspectionSuccess.classList.add("hidden");
    }


    function escapeHTML(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }


    // The Save button only becomes active once all eight photos exist.
    updateProgress();
});