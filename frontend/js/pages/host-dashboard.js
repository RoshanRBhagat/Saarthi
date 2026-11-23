/* =========================================================
   SAARTHI - HOST DASHBOARD
========================================================= */

const dashboardLoading =
    document.getElementById("dashboardLoading");

const dashboardError =
    document.getElementById("dashboardError");

const dashboardContent =
    document.getElementById("dashboardContent");

const welcomeMessage =
    document.getElementById("welcomeMessage");


/* =========================================================
   STATS
========================================================= */

const vehicleCount =
    document.getElementById("vehicleCount");

const activeVehicleCount =
    document.getElementById("activeVehicleCount");

const pendingBookingCount =
    document.getElementById("pendingBookingCount");

const confirmedBookingCount =
    document.getElementById("confirmedBookingCount");

const earningsAmount =
    document.getElementById("earningsAmount");


/* =========================================================
   VEHICLES
========================================================= */

const vehicleSummary =
    document.getElementById("vehicleSummary");

const vehiclesGrid =
    document.getElementById("vehiclesGrid");

const noVehicles =
    document.getElementById("noVehicles");


/* =========================================================
   BOOKINGS
========================================================= */

const bookingSummary =
    document.getElementById("bookingSummary");

const bookingsGrid =
    document.getElementById("bookingsGrid");

const noBookings =
    document.getElementById("noBookings");

const noFilteredBookings =
    document.getElementById("noFilteredBookings");


/* =========================================================
   BOOKING FILTERS
========================================================= */

const bookingFilterButtons =
    document.querySelectorAll(".booking-filter");

const allFilterCount =
    document.getElementById("allFilterCount");

const pendingFilterCount =
    document.getElementById("pendingFilterCount");

const confirmedFilterCount =
    document.getElementById("confirmedFilterCount");

const cancelledFilterCount =
    document.getElementById("cancelledFilterCount");


/* =========================================================
   PAGE STATE
========================================================= */

let allBookings = [];

let allCars = [];

let currentBookingFilter = "all";


/* =========================================================
   AUTHENTICATION
========================================================= */

const token =
    localStorage.getItem("saarthiToken");

const storedUser =
    localStorage.getItem("saarthiUser");


/* =========================================================
   REQUIRE LOGGED-IN HOST
========================================================= */

if (!token) {

    window.location.href =
        `auth.html?returnUrl=${encodeURIComponent(
            window.location.href
        )}`;

} else {

    try {

        const user =
            JSON.parse(
                storedUser || "{}"
            );


        if (
            user.role !== "host"
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

        } else {

            if (
                user.name
            ) {

                welcomeMessage.textContent =
                    `Welcome back, ${user.name}. Manage your vehicles and bookings from here.`;

            }


            loadDashboard();

        }

    } catch (error) {

        console.error(
            "Invalid stored user:",
            error
        );


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

    }

}


/* =========================================================
   BOOKING FILTER BUTTONS
========================================================= */

bookingFilterButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                const status =
                    button.dataset.status;


                currentBookingFilter =
                    status;


                bookingFilterButtons.forEach(
                    filterButton => {

                        filterButton.classList.toggle(
                            "active",
                            filterButton ===
                                button
                        );

                    }
                );


                renderFilteredBookings();

            }
        );

    }
);


/* =========================================================
   LOAD DASHBOARD
========================================================= */

async function loadDashboard() {

    try {

        const [
            carsResponse,
            bookingsResponse
        ] = await Promise.all([

            fetch(
                "/api/cars/host/my-cars",
                {
                    method:
                        "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    },

                    cache:
                        "no-store"
                }
            ),


            fetch(
                "/api/bookings/host",
                {
                    method:
                        "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    },

                    cache:
                        "no-store"
                }
            )

        ]);


        /* -------------------------------------------------
           AUTHENTICATION FAILURE
        ------------------------------------------------- */

        if (
            carsResponse.status === 401 ||
            carsResponse.status === 403 ||
            bookingsResponse.status === 401 ||
            bookingsResponse.status === 403
        ) {

            handleAuthFailure();

            return;

        }


        /* -------------------------------------------------
           PARSE RESPONSES
        ------------------------------------------------- */

        const carsResult =
            await carsResponse.json();


        const bookingsResult =
            await bookingsResponse.json();


        /* -------------------------------------------------
           VALIDATE VEHICLE RESPONSE
        ------------------------------------------------- */

        if (
            !carsResponse.ok ||
            !carsResult.success
        ) {

            throw new Error(
                carsResult.message ||
                "Unable to load your vehicles."
            );

        }


        /* -------------------------------------------------
           VALIDATE BOOKING RESPONSE
        ------------------------------------------------- */

        if (
            !bookingsResponse.ok ||
            !bookingsResult.success
        ) {

            throw new Error(
                bookingsResult.message ||
                "Unable to load your bookings."
            );

        }


        /* -------------------------------------------------
           NORMALIZE DATA
        ------------------------------------------------- */

        const cars =
            Array.isArray(
                carsResult.data
            )
                ? carsResult.data
                : [];


        /*
            IMPORTANT:
            Keep all cars available so booking cards can
            resolve their vehicle name using booking.carId.
        */

        allCars =
            cars;


        allBookings =
            Array.isArray(
                bookingsResult.data
            )
                ? bookingsResult.data
                : [];


        /* -------------------------------------------------
           RENDER
        ------------------------------------------------- */

        renderStats(
            cars,
            allBookings
        );


        renderVehicles(
            cars
        );


        updateBookingFilterCounts();


        renderFilteredBookings();


        /* -------------------------------------------------
           SHOW DASHBOARD
        ------------------------------------------------- */

        dashboardLoading.classList.add(
            "hidden"
        );


        dashboardContent.classList.remove(
            "hidden"
        );


        dashboardError.classList.add(
            "hidden"
        );


    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );


        dashboardLoading.classList.add(
            "hidden"
        );


        dashboardError.textContent =
            error.message ||
            "Unable to load your dashboard.";


        dashboardError.classList.remove(
            "hidden"
        );

    }

}


/* =========================================================
   RENDER STATS
========================================================= */

function renderStats(
    cars,
    bookings
) {

    const totalVehicles =
        cars.length;


    /*
        Your Car model uses "available" as the active
        marketplace status.
    */

    const activeVehicles =
        cars.filter(
            car =>
                car.status ===
                "available"
        ).length;


    const pendingBookings =
        bookings.filter(
            booking =>
                booking.status ===
                "pending"
        ).length;


    const confirmedBookings =
        bookings.filter(
            booking =>
                booking.status ===
                "confirmed"
        ).length;


    /*
        Booking value excludes cancelled bookings.
    */

    const totalValue =
        bookings
            .filter(
                booking =>
                    booking.status !==
                    "cancelled"
            )
            .reduce(
                (
                    total,
                    booking
                ) => {

                    return (
                        total +
                        Number(
                            booking.totalAmount ||
                            0
                        )
                    );

                },
                0
            );


    vehicleCount.textContent =
        totalVehicles;


    activeVehicleCount.textContent =
        activeVehicles;


    pendingBookingCount.textContent =
        pendingBookings;


    confirmedBookingCount.textContent =
        confirmedBookings;


    earningsAmount.textContent =
        `₹${totalValue.toLocaleString(
            "en-IN"
        )}`;


    vehicleSummary.textContent =
        `${totalVehicles} ${
            totalVehicles === 1
                ? "vehicle"
                : "vehicles"
        }`;


    bookingSummary.textContent =
        `${bookings.length} ${
            bookings.length === 1
                ? "booking"
                : "bookings"
        }`;

}


/* =========================================================
   UPDATE BOOKING FILTER COUNTS
========================================================= */

function updateBookingFilterCounts() {

    const pending =
        allBookings.filter(
            booking =>
                booking.status ===
                "pending"
        ).length;


    const confirmed =
        allBookings.filter(
            booking =>
                booking.status ===
                "confirmed"
        ).length;


    const cancelled =
        allBookings.filter(
            booking =>
                booking.status ===
                "cancelled"
        ).length;


    allFilterCount.textContent =
        allBookings.length;


    pendingFilterCount.textContent =
        pending;


    confirmedFilterCount.textContent =
        confirmed;


    cancelledFilterCount.textContent =
        cancelled;

}


/* =========================================================
   RENDER FILTERED BOOKINGS
========================================================= */

function renderFilteredBookings() {

    bookingsGrid.innerHTML =
        "";


    noBookings.classList.add(
        "hidden"
    );


    noFilteredBookings.classList.add(
        "hidden"
    );


    /* -----------------------------------------------------
       NO BOOKINGS
    ----------------------------------------------------- */

    if (
        allBookings.length ===
        0
    ) {

        noBookings.classList.remove(
            "hidden"
        );

        return;

    }


    /* -----------------------------------------------------
       APPLY FILTER
    ----------------------------------------------------- */

    let filteredBookings =
        allBookings;


    if (
        currentBookingFilter !==
        "all"
    ) {

        filteredBookings =
            allBookings.filter(
                booking =>
                    booking.status ===
                    currentBookingFilter
            );

    }


    /* -----------------------------------------------------
       NO BOOKINGS FOR FILTER
    ----------------------------------------------------- */

    if (
        filteredBookings.length ===
        0
    ) {

        noFilteredBookings.classList.remove(
            "hidden"
        );

        return;

    }


    /* -----------------------------------------------------
       RENDER
    ----------------------------------------------------- */

    filteredBookings.forEach(
        renderBooking
    );

}


/* =========================================================
   RENDER VEHICLES
========================================================= */

function renderVehicles(
    cars
) {

    vehiclesGrid.innerHTML =
        "";


    if (
        cars.length ===
        0
    ) {

        noVehicles.classList.remove(
            "hidden"
        );

        return;

    }


    noVehicles.classList.add(
        "hidden"
    );


    cars.forEach(
        renderVehicle
    );

}


/* =========================================================
   RENDER VEHICLE
========================================================= */

function renderVehicle(
    car
) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "host-vehicle-card";


    const vehicleStatus =
        car.status ||
        "unknown";


    /* -----------------------------------------------------
       IMAGE
    ----------------------------------------------------- */

    const image =
        car.mainImage ||
        (
            Array.isArray(
                car.images
            ) &&
            car.images.length > 0
                ? car.images[0]
                : ""
        );


    const imageHTML =
        image

            ? `

                <div
                    class="host-vehicle-image"
                >

                    <img
                        src="${escapeHTML(
                            getImageUrl(
                                image
                            )
                        )}"
                        alt="${escapeHTML(
                            `${car.make || ""} ${car.model || ""}`
                        )}"
                    >

                </div>

              `

            : `

                <div
                    class="host-vehicle-image"
                >

                    <div
                        class="host-vehicle-placeholder"
                    >

                        <i
                            class="fa-solid fa-car-side"
                        ></i>

                    </div>

                </div>

              `;


    /* -----------------------------------------------------
       STATUS BUTTON
    ----------------------------------------------------- */

    const nextStatus =
        vehicleStatus ===
        "available"

            ? "unavailable"

            : "available";


    const statusButtonText =
        vehicleStatus ===
        "archived"

            ? "Restore Vehicle"

            : vehicleStatus ===
              "available"

                ? "Make Unavailable"

                : "Make Available";


    const statusButtonIcon =
        vehicleStatus ===
        "archived"

            ? "fa-rotate-left"

            : vehicleStatus ===
              "available"

                ? "fa-pause"

                : "fa-play";


    const statusButtonClass =
        vehicleStatus ===
        "archived"

            ? "make-available"

            : vehicleStatus ===
              "available"

                ? "make-unavailable"

                : "make-available";


    /* -----------------------------------------------------
       CARD HTML
    ----------------------------------------------------- */

    card.innerHTML = `

        ${imageHTML}


        <div
            class="host-vehicle-content"
        >


            <!-- VEHICLE HEADER -->

            <div
                class="host-vehicle-top"
            >

                <div>

                    <div
                        class="host-vehicle-name"
                    >

                        ${escapeHTML(
                            car.make ||
                            ""
                        )}

                        ${escapeHTML(
                            car.model ||
                            ""
                        )}

                    </div>


                    <div
                        class="host-vehicle-id"
                    >

                        ${escapeHTML(
                            car.carId ||
                            ""
                        )}

                    </div>

                </div>


                <!-- STATUS -->

                <span
                    class="vehicle-status ${
                        vehicleStatus ===
                        "archived"

                            ? "archived"

                            : vehicleStatus !==
                              "available"

                                ? "unavailable"

                                : ""
                    }"
                >

                    ${escapeHTML(
                        vehicleStatus
                    )}

                </span>

            </div>


            <!-- LOCATION -->

            <div
                class="host-vehicle-location"
            >

                <i
                    class="fa-solid fa-location-dot"
                ></i>


                ${escapeHTML(
                    car.city ||
                    ""
                )},


                ${escapeHTML(
                    car.state ||
                    ""
                )}

            </div>


            <!-- VEHICLE META -->

            <div
                class="host-vehicle-meta"
            >

                <span
                    class="host-meta-pill"
                >

                    ${Number(
                        car.seats ||
                        0
                    )}

                    seats

                </span>


                <span
                    class="host-meta-pill"
                >

                    ${escapeHTML(
                        car.transmission ||
                        ""
                    )}

                </span>


                <span
                    class="host-meta-pill"
                >

                    ${escapeHTML(
                        car.fuelType ||
                        ""
                    )}

                </span>


                <span
                    class="host-meta-pill"
                >

                    ${escapeHTML(
                        car.category ||
                        ""
                    )}

                </span>

            </div>


            <!-- PRICE -->

            <div
                class="host-vehicle-price"
            >

                <strong>

                    ₹${Number(
                        car.dailyPrice ||
                        0
                    ).toLocaleString(
                        "en-IN"
                    )}

                </strong>


                <span>

                    / day

                </span>

            </div>


            <!-- ACTIONS -->

            <div
                class="host-vehicle-actions"
            >

                <!-- EDIT -->

                <a
                    href="edit-vehicle.html?carId=${encodeURIComponent(
                        car.carId
                    )}"
                    class="vehicle-edit-btn"
                >

                    <i
                        class="fa-solid fa-pen-to-square"
                    ></i>

                    Edit Vehicle

                </a>


                <!-- STATUS -->

                <button
                    type="button"
                    class="vehicle-status-btn ${statusButtonClass}"
                    data-car-id="${escapeHTML(
                        car.carId
                    )}"
                    data-status="${nextStatus}"
                >

                    <i
                        class="fa-solid ${statusButtonIcon}"
                    ></i>

                    ${statusButtonText}

                </button>


                <!-- ARCHIVE -->

                ${
                    vehicleStatus !==
                    "archived"

                        ? `

                            <button
                                type="button"
                                class="vehicle-archive-btn"
                                data-car-id="${escapeHTML(
                                    car.carId
                                )}"
                            >

                                <i
                                    class="fa-solid fa-box-archive"
                                ></i>

                                Archive Vehicle

                            </button>

                          `

                        : ""
                }

            </div>

        </div>

    `;


    /* =====================================================
       STATUS BUTTON
    ===================================================== */

    const statusButton =
        card.querySelector(
            ".vehicle-status-btn"
        );


    if (
        statusButton
    ) {

        statusButton.addEventListener(
            "click",
            async () => {

                const selectedCarId =
                    statusButton.dataset.carId;


                const selectedStatus =
                    statusButton.dataset.status;


                await updateVehicleStatus(
                    selectedCarId,
                    selectedStatus
                );

            }
        );

    }


    /* =====================================================
       ARCHIVE BUTTON
    ===================================================== */

    const archiveButton =
        card.querySelector(
            ".vehicle-archive-btn"
        );


    if (
        archiveButton
    ) {

        archiveButton.addEventListener(
            "click",
            async () => {

                const selectedCarId =
                    archiveButton.dataset.carId;


                await archiveVehicle(
                    selectedCarId
                );

            }
        );

    }


    /* =====================================================
       ADD CARD
    ===================================================== */

    vehiclesGrid.appendChild(
        card
    );

}


/* =========================================================
   UPDATE VEHICLE STATUS
========================================================= */

async function updateVehicleStatus(
    carId,
    status
) {

    const action =
        status === "available"

            ? "make this vehicle available"

            : "make this vehicle unavailable";


    const confirmed =
        window.confirm(
            `Are you sure you want to ${action}?`
        );


    if (
        !confirmed
    ) {

        return;

    }


    try {

        const response =
            await fetch(
                `/api/cars/host/${encodeURIComponent(
                    carId
                )}/status`,
                {

                    method:
                        "PATCH",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`

                    },

                    body:
                        JSON.stringify({
                            status
                        })

                }
            );


        const result =
            await response.json();


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            handleAuthFailure();

            return;

        }


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Unable to update vehicle status."
            );

        }


        await loadDashboard();


    } catch (error) {

        console.error(
            "Vehicle status update error:",
            error
        );


        alert(
            error.message ||
            "Unable to update vehicle status."
        );

    }

}


/* =========================================================
   ARCHIVE VEHICLE
========================================================= */

async function archiveVehicle(
    carId
) {

    const confirmed =
        window.confirm(
            "Are you sure you want to remove this vehicle from the marketplace? It will be archived and can be restored later."
        );


    if (
        !confirmed
    ) {

        return;

    }


    try {

        const response =
            await fetch(
                `/api/cars/host/${encodeURIComponent(
                    carId
                )}/status`,
                {

                    method:
                        "PATCH",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`

                    },

                    body:
                        JSON.stringify({

                            status:
                                "archived"

                        })

                }
            );


        const result =
            await response.json();


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            handleAuthFailure();

            return;

        }


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Unable to archive vehicle."
            );

        }


        await loadDashboard();


    } catch (error) {

        console.error(
            "Archive vehicle error:",
            error
        );


        alert(
            error.message ||
            "Unable to archive vehicle."
        );

    }

}


/* =========================================================
   PRIVATE HOST INSPECTION PHOTO REVIEW
========================================================= */

const hostInspectionPhotoObjectUrls = new Set();

window.addEventListener("pagehide", () => {
    hostInspectionPhotoObjectUrls.forEach(url => URL.revokeObjectURL(url));
    hostInspectionPhotoObjectUrls.clear();
});

async function loadHostInspectionGallery(gallery) {
    if (gallery.dataset.loaded === "true" || gallery.dataset.loading === "true") return;

    const bookingId = gallery.dataset.hostInspectionGallery;
    const phase = gallery.dataset.phase;
    const token = localStorage.getItem("saarthiToken");
    if (!token) return;

    gallery.dataset.loading = "true";
    const images = Array.from(gallery.querySelectorAll("img[data-host-inspection-photo]"));

    await Promise.all(images.map(async image => {
        if (!image.hidden) return;
        const message = image.parentElement.querySelector(".host-inspection-photo-message");
        try {
            const angle = image.dataset.hostInspectionPhoto;
            const response = await fetch(
                `/api/bookings/host/${encodeURIComponent(bookingId)}/inspection-photo/${phase}/${angle}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!response.ok) throw new Error("Photo unavailable");

            const url = URL.createObjectURL(await response.blob());
            hostInspectionPhotoObjectUrls.add(url);
            image.src = url;
            image.hidden = false;
            message.hidden = true;
        } catch {
            message.textContent = "Photo could not be loaded. Reopen this section to retry.";
        }
    }));

    gallery.dataset.loading = "false";
    gallery.dataset.loaded = images.every(image => !image.hidden) ? "true" : "false";
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
        "host-booking-card";


    /*
        First try booking.car.

        If that is missing, use allCars and match
        booking.carId with car.carId.

        This fixes the "Vehicle" title problem.
    */

    const car =
        booking.car ||

        allCars.find(
            vehicle =>
                vehicle.carId ===
                booking.carId
        ) ||

        {};


    const carName =
        `${car.make || "Vehicle"} ${
            car.model || ""
        }`.trim();


    /* -----------------------------------------------------
       BOOKING STATUS
    ----------------------------------------------------- */

    const status =
        booking.status ||
        "pending";


    /* -----------------------------------------------------
       PAYMENT STATUS
    ----------------------------------------------------- */

    const paymentStatus =
        booking.paymentStatus ||
        "pending";

    const refundStatus = booking.refundStatus || "none";
    const refundUnderReview = ["pending_review", "processing", "failed"].includes(refundStatus);


    /* -----------------------------------------------------
       RENTAL STATUS
    ----------------------------------------------------- */

    const rentalStatus =
        booking.rentalStatus ||
        booking.status;


    /* -----------------------------------------------------
       DRIVER
    ----------------------------------------------------- */

    const driverRequired =
        booking.driverRequired ===
        true;


    /* -----------------------------------------------------
       PICKUP / RETURN STATUS
    ----------------------------------------------------- */

    const pickupStatus =
        booking.pickupStatus ||
        "pending";


    const returnStatus =
        booking.returnStatus ||
        "pending";


    const pickupConfirmed =
        pickupStatus ===
        "confirmed";


    const returnConfirmed =
        returnStatus ===
        "confirmed";

    function hasEightInspectionPhotos(inspection) {
        const photos = Array.isArray(inspection?.photos)
            ? inspection.photos
            : [];

        const requiredAngles = [
            "front",
            "front-left",
            "left",
            "rear-left",
            "rear",
            "rear-right",
            "right",
            "front-right"
        ];

        const uploadedAngles = photos.map(photo => photo?.angle);

        return (
            inspection?.status === "completed" &&
            photos.length === requiredAngles.length &&
            new Set(uploadedAngles).size === requiredAngles.length &&
            requiredAngles.every(angle => uploadedAngles.includes(angle))
        );
    }

    const pickupInspectionComplete =
        hasEightInspectionPhotos(booking.pickupInspection);

    const returnInspectionComplete =
        hasEightInspectionPhotos(booking.returnInspection);

    const inspectionGalleryHTML = [
        { phase: "pickup", inspection: booking.pickupInspection },
        { phase: "return", inspection: booking.returnInspection }
    ].filter(({ inspection }) => hasEightInspectionPhotos(inspection))
        .map(({ phase }) => `
            <details class="host-inspection-gallery" data-host-inspection-gallery="${escapeHTML(booking.bookingId)}" data-phase="${phase}">
                <summary>Review ${phase} condition photos</summary>
                <div class="host-inspection-photo-grid">
                    ${[
                        "front", "front-left", "left", "rear-left",
                        "rear", "rear-right", "right", "front-right"
                    ].map(angle => `
                        <figure>
                            <div class="host-inspection-photo-frame">
                                <span class="host-inspection-photo-message">Open this section to load photo</span>
                                <img alt="${phase} inspection photo: ${angle}" data-host-inspection-photo="${angle}" hidden>
                            </div>
                            <figcaption>${angle.replaceAll("-", " ")}</figcaption>
                        </figure>
                    `).join("")}
                </div>
            </details>
        `).join("");


    /* -----------------------------------------------------
       AI DAMAGE REPORT (generated after return inspection)
    ----------------------------------------------------- */

    const returnDamageReport =
        booking.returnInspection?.aiAnalysis || null;

    const returnDamageReportStatus =
        returnDamageReport?.status || "";

    const returnDamageChanges =
        Array.isArray(returnDamageReport?.changes)
            ? returnDamageReport.changes
            : [];

    const returnDamageReportHTML =
        returnDamageReportStatus === "completed" &&
        returnDamageReport?.overallAssessment
            ? `
                <section style="margin-top:16px;padding:16px;border:1px solid #dbe5f2;border-radius:14px;background:#f8fbff;">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
                        <strong style="font-size:14px;color:#20314a;">
                            <i class="fa-solid fa-shield-halved"></i>
                            AI Return Damage Report
                        </strong>
                        <span style="font-size:12px;font-weight:800;color:${returnDamageReport.overallAssessment.damageDetected ? '#a43a43' : '#267348'};">
                            ${returnDamageReport.overallAssessment.damageDetected ? 'Possible damage found' : 'No reliable new damage found'}
                        </span>
                    </div>
                    <p style="margin:10px 0 6px;font-size:13px;line-height:1.6;color:#4d5e75;">
                        ${escapeHTML(returnDamageReport.overallAssessment.summary || 'Review the inspection report manually.')}
                    </p>
                    <div style="font-size:12px;color:#687991;margin-bottom:10px;">
                        Severity: <strong>${escapeHTML(returnDamageReport.overallAssessment.severity || 'not assessed')}</strong>
                        &nbsp;·&nbsp; Confidence: <strong>${Math.max(0, Math.min(100, Number(returnDamageReport.overallAssessment.confidence) || 0))}%</strong>
                        &nbsp;·&nbsp; Vehicle match: <strong>${Math.max(0, Math.min(100, Number(returnDamageReport.vehicleMatch?.confidence) || 0))}%</strong>
                    </div>
                    ${returnDamageChanges.length
                        ? `<div style="display:grid;gap:8px;">
                            ${returnDamageChanges.map(change => `
                                <div style="padding:10px 12px;border-radius:10px;background:#fff;border:1px solid #e6ebf3;">
                                    <div style="font-size:12px;font-weight:800;color:#27364d;">
                                        ${escapeHTML(change.angle || 'Vehicle')} · ${escapeHTML(change.area || 'Area not specified')}
                                    </div>
                                    <div style="margin-top:3px;font-size:12px;color:#6c7a8f;">
                                        ${escapeHTML(change.type || 'Visible change')} — ${escapeHTML(change.severity || 'unrated')} · ${Math.max(0, Math.min(100, Number(change.confidence) || 0))}% confidence
                                    </div>
                                    <p style="margin:5px 0 0;font-size:12px;line-height:1.5;color:#52627a;">${escapeHTML(change.description || '')}</p>
                                </div>
                            `).join('')}
                        </div>`
                        : '<p style="margin:8px 0 0;font-size:12px;color:#267348;">No individual new-damage findings were returned.</p>'}
                    <p style="margin:12px 0 0;font-size:11px;line-height:1.5;color:#8490a2;">
                        AI output is an inspection aid, not a legal or insurance determination. Review photos manually.
                    </p>
                </section>
            `
            : returnDamageReportStatus === "failed"
                ? `
                    <section style="margin-top:16px;padding:14px;border:1px solid #f0dfb7;border-radius:12px;background:#fffaf0;color:#79623b;font-size:12px;line-height:1.6;">
                        <strong><i class="fa-solid fa-circle-exclamation"></i> AI comparison did not complete.</strong>
                        ${escapeHTML(returnDamageReport.message || 'The original photos remain saved. Retry the comparison against the same evidence.')}
                        <button type="button" class="booking-action-btn confirm" data-retry-damage-analysis="${escapeHTML(booking.bookingId)}" style="margin-top:10px;">Retry AI comparison</button>
                    </section>
                `
                : "";

    /* -----------------------------------------------------
       PICKUP ACTION CONDITION
    ----------------------------------------------------- */

    const canConfirmPickup =
        status === "confirmed" &&
        paymentStatus === "paid" &&
        rentalStatus === "active" &&
        !refundUnderReview &&
        !pickupConfirmed;


    /* -----------------------------------------------------
       RETURN ACTION CONDITION
    ----------------------------------------------------- */

    const canConfirmReturn =
        status === "confirmed" &&
        paymentStatus === "paid" &&
        !refundUnderReview &&
        pickupConfirmed &&
        !returnConfirmed;


    /* -----------------------------------------------------
       CARD HTML
    ----------------------------------------------------- */

    card.innerHTML = `

        <!-- BOOKING HEADER -->

        <div
            class="host-booking-header"
        >

            <div>

                <div
                    class="host-booking-car"
                >

                    ${escapeHTML(
                        carName
                    )}

                </div>


                <div
                    class="host-booking-id"
                >

                    Booking ID:

                    ${escapeHTML(
                        booking.bookingId ||
                        ""
                    )}

                </div>

            </div>


            <!-- STATUS -->

            <div
                class="host-booking-status-group"
            >

                <span
                    class="host-booking-status ${
                        status ===
                        "cancelled"
                            ? "cancelled"
                            : ""
                    }"
                >

                    ${escapeHTML(
                        status
                    )}

                </span>


                <span
                    class="host-rental-status ${escapeHTML(
                        rentalStatus
                    )}"
                >

                    ${
                        rentalStatus ===
                        "upcoming"

                            ? "Upcoming"

                            : rentalStatus ===
                              "active"

                                ? "Active"

                                : rentalStatus ===
                                  "completed"

                                    ? "Completed"

                                    : rentalStatus ===
                                      "cancelled"

                                        ? "Cancelled"

                                        : rentalStatus
                    }

                </span>

            </div>

        </div>


        <!-- BOOKING INFO -->

        <div
            class="host-booking-info"
        >

            <!-- CUSTOMER -->

            <div
                class="host-booking-row"
            >

                <span>
                    Customer
                </span>

                <strong>

                    ${escapeHTML(
                        booking.customerName ||
                        "—"
                    )}

                </strong>

            </div>


            <!-- PHONE -->

            <div
                class="host-booking-row"
            >

                <span>
                    Phone
                </span>

                <strong>

                    ${escapeHTML(
                        booking.customerPhone ||
                        "—"
                    )}

                </strong>

            </div>


            <!-- EMAIL -->

            <div
                class="host-booking-row"
            >

                <span>
                    Email
                </span>

                <strong>

                    ${escapeHTML(
                        booking.customerEmail ||
                        "—"
                    )}

                </strong>

            </div>


            <!-- PICKUP -->

            <div
                class="host-booking-row"
            >

                <span>
                    Pickup
                </span>

                <strong>

                    ${formatDate(
                        booking.pickupDate
                    )}

                </strong>

            </div>


            <!-- RETURN -->

            <div
                class="host-booking-row"
            >

                <span>
                    Return
                </span>

                <strong>

                    ${formatDate(
                        booking.returnDate
                    )}

                </strong>

            </div>


            <!-- DURATION -->

            <div
                class="host-booking-row"
            >

                <span>
                    Duration
                </span>

                <strong>

                    ${Number(
                        booking.totalDays ||
                        0
                    )}

                    ${

                        Number(
                            booking.totalDays ||
                            0
                        ) === 1

                            ? "day"

                            : "days"

                    }

                </strong>

            </div>


            <!-- PAYMENT -->

            <div
                class="host-booking-row"
            >

                <span>
                    Payment
                </span>

                <strong>

                    ${escapeHTML(
                        paymentStatus
                    )}

                </strong>

            </div>


            <!-- PAYMENT ID -->

            ${
                booking.paymentId

                    ? `

                        <div
                            class="host-booking-row"
                        >

                            <span>
                                Payment ID
                            </span>

                            <strong>

                                ${escapeHTML(
                                    booking.paymentId
                                )}

                            </strong>

                        </div>

                      `

                    : ""
            }


            <!-- PICKUP STATUS -->

            <div
                class="host-booking-row"
            >

                <span>
                    Pickup status
                </span>

                <strong>

                    ${
                        pickupConfirmed
                            ? "Confirmed"
                            : "Pending"
                    }

                </strong>

            </div>


            <!-- RETURN STATUS -->

            <div
                class="host-booking-row"
            >

                <span>
                    Return status
                </span>

                <strong>

                    ${
                        returnConfirmed
                            ? "Confirmed"
                            : "Pending"
                    }

                </strong>

            </div>


            <!-- PICKUP CONFIRMED DATE -->

            ${
                booking.pickupConfirmedAt

                    ? `

                        <div
                            class="host-booking-row"
                        >

                            <span>
                                Pickup confirmed
                            </span>

                            <strong>

                                ${formatDate(
                                    booking.pickupConfirmedAt
                                )}

                            </strong>

                        </div>

                      `

                    : ""
            }


            <!-- RETURN CONFIRMED DATE -->

            ${
                booking.returnConfirmedAt

                    ? `

                        <div
                            class="host-booking-row"
                        >

                            <span>
                                Return confirmed
                            </span>

                            <strong>

                                ${formatDate(
                                    booking.returnConfirmedAt
                                )}

                            </strong>

                        </div>

                      `

                    : ""
            }


            <!-- BOOKING VALUE -->

            <div
                class="host-booking-row total"
            >

                <span>
                    Booking value
                </span>

                <strong>

                    ₹${Number(
                        booking.totalAmount ||
                        0
                    ).toLocaleString(
                        "en-IN"
                    )}

                </strong>

            </div>

        </div>


        <!-- DRIVER -->

        <div
            class="driver-badge"
        >

            <i
                class="fa-solid ${
                    driverRequired
                        ? "fa-user-check"
                        : "fa-car"
                }"
            ></i>


            ${
                driverRequired

                    ? "Customer requested a driver."

                    : "Self-drive booking."
            }

        </div>

        ${refundUnderReview ? `<div class="host-booking-refund-status" role="status">${refundStatus === "processing" ? "Refund is processing; pickup is paused until it completes." : refundStatus === "failed" ? "Refund processing failed and needs administrator attention." : "Customer cancellation and refund request is awaiting administrator review."}</div>` : refundStatus === "rejected" ? `<div class="host-booking-refund-status" role="status">Refund request was rejected; the booking remains active.</div>` : ""}

        ${driverRequired && status === "confirmed" && paymentStatus === "paid" && !refundUnderReview ? `<div class="host-booking-actions"><select class="driver-select" aria-label="Select an approved driver"><option value="">Loading approved drivers…</option></select><button type="button" class="booking-action-btn confirm assign-driver-btn">${booking.driverId ? "Change driver" : "Assign driver"}</button>${booking.driverId ? `<button type="button" class="booking-action-btn cancel remove-driver-btn">Remove assignment</button>` : ""}</div>` : booking.driverId ? `<div class="driver-badge">Driver assigned</div>` : ""}


        <!-- BOOKING ACTIONS -->

        ${
            status ===
            "pending" && !refundUnderReview

                ? `

                    <div
                        class="host-booking-actions"
                    >

                        <button
                            type="button"
                            class="booking-action-btn confirm"
                            data-action="confirmed"
                        >

                            <i
                                class="fa-solid fa-check"
                            ></i>

                            Confirm

                        </button>


                        <button
                            type="button"
                            class="booking-action-btn cancel"
                            data-action="cancelled"
                        >

                            <i
                                class="fa-solid fa-xmark"
                            ></i>

                            Cancel

                        </button>

                    </div>

                  `


                : status ===
                  "confirmed" &&
                  canConfirmPickup

                    ? `

                        <div
                            class="host-booking-actions"
                        >

                            <button
                                type="button"
                                class="booking-action-btn confirm booking-pickup-btn"
                                data-handover-action="pickup"
                            >

                                <i
                                    class="fa-solid fa-key"
                                ></i>

                                Confirm Pickup

                            </button>

                        </div>

                      `


                    : status ===
                      "confirmed" &&
                      canConfirmReturn

                        ? `

                            <div
                                class="host-booking-actions"
                            >

                                <button
                                    type="button"
                                    class="booking-action-btn confirm booking-return-btn"
                                    data-handover-action="return"
                                >

                                    <i
                                        class="fa-solid fa-arrow-rotate-left"
                                    ></i>

                                    Confirm Return

                                </button>

                            </div>

                          `


                        : ""

        }

        ${inspectionGalleryHTML}

        ${returnDamageReportHTML}

    `;


    // Make each action clear about whether photos or confirmation are next.
    const pickupActionButton = card.querySelector(
        '[data-handover-action="pickup"]'
    );

    if (pickupActionButton && !pickupInspectionComplete) {
        pickupActionButton.innerHTML = `
            <i class="fa-solid fa-camera"></i>
            Start Pickup Inspection
        `;
    }

    const returnActionButton = card.querySelector(
        '[data-handover-action="return"]'
    );

    if (returnActionButton && !returnInspectionComplete) {
        returnActionButton.innerHTML = `
            <i class="fa-solid fa-camera"></i>
            Start Return Inspection
        `;
    }


    /* =====================================================
       NORMAL BOOKING ACTIONS
    ===================================================== */

    const actionButtons =
        card.querySelectorAll(
            ".booking-action-btn[data-action]"
        );


    actionButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                async () => {

                    const newStatus =
                        button.dataset.action;


                    await updateBookingStatus(
                        booking.bookingId,
                        newStatus,
                        paymentStatus === "paid"
                    );

                }
            );

        }
    );


    /* =====================================================
       PICKUP BUTTON
    ===================================================== */

    const pickupButton =
        card.querySelector(
            '[data-handover-action="pickup"]'
        );


    if (pickupButton) {
        pickupButton.addEventListener("click", async () => {
            if (!pickupInspectionComplete) {
                window.location.href =
                    `booking-inspection.html?bookingId=${encodeURIComponent(
                        booking.bookingId
                    )}&phase=pickup`;
                return;
            }

            await confirmPickup(booking.bookingId);
        });
    }


    /* =====================================================
       RETURN BUTTON
    ===================================================== */

    const returnButton =
        card.querySelector(
            '[data-handover-action="return"]'
        );


    if (returnButton) {
        returnButton.addEventListener("click", async () => {
            if (!returnInspectionComplete) {
                window.location.href =
                    `booking-inspection.html?bookingId=${encodeURIComponent(
                        booking.bookingId
                    )}&phase=return`;
                return;
            }

            await confirmReturn(booking.bookingId);
        });
    }


    /* =====================================================
       ADD CARD
    ===================================================== */

    bookingsGrid.appendChild(
        card
    );

    card.querySelectorAll("[data-host-inspection-gallery]").forEach(gallery => {
        gallery.addEventListener("toggle", () => {
            if (gallery.open) loadHostInspectionGallery(gallery);
        });
    });

    const driverSelect = card.querySelector(".driver-select");
    if (driverSelect) {
        fetch("/api/drivers/active", { headers: { Authorization: `Bearer ${localStorage.getItem("saarthiToken")}` } })
            .then(response => response.json())
            .then(result => { driverSelect.innerHTML = `<option value="">Choose driver</option>${(result.data || []).map(d => `<option value="${escapeHTML(d._id)}" ${String(d._id) === String(booking.driverId) ? "selected" : ""}>${escapeHTML(d.userId?.name || "Driver")} · ${escapeHTML(d.userId?.phone || "")} · ${escapeHTML(d.city)}</option>`).join("")}`; })
            .catch(() => { driverSelect.innerHTML = `<option value="">Could not load drivers</option>`; });
        card.querySelector(".assign-driver-btn").addEventListener("click", async () => {
            if (!driverSelect.value) return alert("Choose an approved driver first.");
            const response = await fetch(`/api/drivers/booking/${encodeURIComponent(booking.bookingId)}/assign`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("saarthiToken")}` }, body: JSON.stringify({ driverId: driverSelect.value }) });
            const result = await response.json();
            if (!response.ok || !result.success) return alert(result.message || "Could not assign driver.");
            window.location.reload();
        });
    }
    const removeDriverButton = card.querySelector(".remove-driver-btn");
    if (removeDriverButton) removeDriverButton.addEventListener("click", async () => {
        const response = await fetch(`/api/drivers/booking/${encodeURIComponent(booking.bookingId)}/assign`, { method: "DELETE", headers: { Authorization: `Bearer ${localStorage.getItem("saarthiToken")}` } });
        const result = await response.json();
        if (!response.ok || !result.success) return alert(result.message || "Could not remove assignment.");
        window.location.reload();
    });

    const retryDamageButton = card.querySelector("[data-retry-damage-analysis]");
    if (retryDamageButton) retryDamageButton.addEventListener("click", async () => {
        retryDamageButton.disabled = true;
        retryDamageButton.textContent = "Retrying AI comparison…";
        try {
            const response = await fetch(`/api/bookings/host/${encodeURIComponent(booking.bookingId)}/inspection/return/retry-analysis`, {
                method: "POST",
                headers: { Authorization: `Bearer ${localStorage.getItem("saarthiToken")}` }
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || "Unable to retry AI comparison.");
            window.location.reload();
        } catch (error) {
            alert(error.message);
            retryDamageButton.disabled = false;
            retryDamageButton.textContent = "Retry AI comparison";
        }
    });

}
/* =========================================================*/

/* =========================================================
   UPDATE BOOKING STATUS
========================================================= */

async function updateBookingStatus(
    bookingId,
    status,
    isPaidBooking
) {

    const actionText =
        status ===
        "confirmed"

            ? "confirm"

            : "cancel";


    const confirmed =
        window.confirm(
            status === "cancelled" && isPaidBooking
                ? "Send a cancellation and refund request to the administrator? The booking remains active while the request is reviewed."
                : `Are you sure you want to ${actionText} this booking?`
        );


    if (
        !confirmed
    ) {

        return;

    }


    try {

        const response =
            await fetch(
                `/api/bookings/host/${encodeURIComponent(
                    bookingId
                )}/status`,
                {

                    method:
                        "PATCH",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`

                    },

                    body:
                        JSON.stringify({

                            status

                        })

                }
            );


        const result =
            await response.json();


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            handleAuthFailure();

            return;

        }


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Unable to update booking."
            );

        }


        if (result.cancellationRequested) alert(result.message);
        await loadDashboard();


    } catch (error) {

        console.error(
            "Booking status update error:",
            error
        );


        alert(
            error.message ||
            "Unable to update booking."
        );

    }

}


/* =========================================================
   CONFIRM PICKUP
========================================================= */

async function confirmPickup(
    bookingId
) {

    const notes =
        window.prompt(
            "Pickup notes (optional):",
            ""
        );


    if (
        notes === null
    ) {

        return;

    }


    const confirmed =
        window.confirm(
            "Confirm that the vehicle has been handed over to the customer?"
        );


    if (
        !confirmed
    ) {

        return;

    }


    try {

        const response =
            await fetch(
                `/api/bookings/host/${encodeURIComponent(
                    bookingId
                )}/pickup`,
                {

                    method:
                        "PATCH",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`

                    },

                    body:
                        JSON.stringify({

                            notes

                        })

                }
            );


        const result =
            await response.json();


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            handleAuthFailure();

            return;

        }


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Unable to confirm vehicle pickup."
            );

        }


        await loadDashboard();


    } catch (error) {

        console.error(
            "Pickup confirmation error:",
            error
        );


        alert(
            error.message ||
            "Unable to confirm vehicle pickup."
        );

    }

}


/* =========================================================
   CONFIRM RETURN
========================================================= */

async function confirmReturn(
    bookingId
) {

    const notes =
        window.prompt(
            "Return notes (optional):",
            ""
        );


    if (
        notes === null
    ) {

        return;

    }


    const confirmed =
        window.confirm(
            "Confirm that the vehicle has been returned by the customer?"
        );


    if (
        !confirmed
    ) {

        return;

    }


    try {

        const response =
            await fetch(
                `/api/bookings/host/${encodeURIComponent(
                    bookingId
                )}/return`,
                {

                    method:
                        "PATCH",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`

                    },

                    body:
                        JSON.stringify({

                            notes

                        })

                }
            );


        const result =
            await response.json();


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            handleAuthFailure();

            return;

        }


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Unable to confirm vehicle return."
            );

        }


        await loadDashboard();


    } catch (error) {

        console.error(
            "Return confirmation error:",
            error
        );


        alert(
            error.message ||
            "Unable to confirm vehicle return."
        );

    }

}


/* =========================================================
   AUTH FAILURE
========================================================= */

function handleAuthFailure() {

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

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
    value
) {

    if (
        !value
    ) {

        return "—";

    }


    const date =
        new Date(
            value
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
   IMAGE URL
========================================================= */

function getImageUrl(
    imagePath
) {

    if (
        !imagePath
    ) {

        return "";

    }


    if (
        imagePath.startsWith(
            "http://"
        ) ||
        imagePath.startsWith(
            "https://"
        )
    ) {

        return imagePath;

    }


    if (
        imagePath.startsWith(
            "/"
        )
    ) {

        return imagePath;

    }


    return `/${imagePath}`;

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
