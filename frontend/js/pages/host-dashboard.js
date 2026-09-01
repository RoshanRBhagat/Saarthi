/* =========================================================
   SAARTHI - HOST DASHBOARD
========================================================= */


/* =========================================================
   DOM ELEMENTS
========================================================= */

/* ---------- Dashboard ---------- */

const dashboardLoading =
    document.getElementById(
        "dashboardLoading"
    );


const dashboardError =
    document.getElementById(
        "dashboardError"
    );


const dashboardContent =
    document.getElementById(
        "dashboardContent"
    );


const welcomeMessage =
    document.getElementById(
        "welcomeMessage"
    );


/* ---------- Stats ---------- */

const vehicleCount =
    document.getElementById(
        "vehicleCount"
    );


const activeVehicleCount =
    document.getElementById(
        "activeVehicleCount"
    );


const pendingBookingCount =
    document.getElementById(
        "pendingBookingCount"
    );


const confirmedBookingCount =
    document.getElementById(
        "confirmedBookingCount"
    );


const earningsAmount =
    document.getElementById(
        "earningsAmount"
    );


/* ---------- Vehicles ---------- */

const vehicleSummary =
    document.getElementById(
        "vehicleSummary"
    );


const vehiclesGrid =
    document.getElementById(
        "vehiclesGrid"
    );


const noVehicles =
    document.getElementById(
        "noVehicles"
    );


/* ---------- Bookings ---------- */

const bookingSummary =
    document.getElementById(
        "bookingSummary"
    );


const bookingsGrid =
    document.getElementById(
        "bookingsGrid"
    );


const noBookings =
    document.getElementById(
        "noBookings"
    );


const noFilteredBookings =
    document.getElementById(
        "noFilteredBookings"
    );


/* ---------- Booking Filters ---------- */

const bookingFilterButtons =
    document.querySelectorAll(
        ".booking-filter"
    );


const allFilterCount =
    document.getElementById(
        "allFilterCount"
    );


const pendingFilterCount =
    document.getElementById(
        "pendingFilterCount"
    );


const confirmedFilterCount =
    document.getElementById(
        "confirmedFilterCount"
    );


const cancelledFilterCount =
    document.getElementById(
        "cancelledFilterCount"
    );


/* =========================================================
   PAGE STATE
========================================================= */

let allBookings = [];

let currentBookingFilter =
    "all";


/* =========================================================
   AUTHENTICATION
========================================================= */

const token =
    localStorage.getItem(
        "saarthiToken"
    );


const storedUser =
    localStorage.getItem(
        "saarthiUser"
    );


/* =========================================================
   REQUIRE LOGGED-IN HOST
========================================================= */

if (
    !token
) {

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

            /* ---------------------------------------------
               HOST NAME
            --------------------------------------------- */

            if (
                user.name
            ) {

                welcomeMessage.textContent =
                    `Welcome back, ${user.name}. Manage your vehicles and bookings from here.`;

            }


            /* ---------------------------------------------
               LOAD DASHBOARD
            --------------------------------------------- */

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

        /* -------------------------------------------------
           Fetch vehicles and bookings together
        ------------------------------------------------- */

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
           Authentication failure
        ------------------------------------------------- */

        if (
            carsResponse.status === 401 ||
            carsResponse.status === 403 ||
            bookingsResponse.status === 401 ||
            bookingsResponse.status === 403
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
           Parse responses
        ------------------------------------------------- */

        const carsResult =
            await carsResponse.json();


        const bookingsResult =
            await bookingsResponse.json();


        /* -------------------------------------------------
           Validate vehicle response
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
           Validate booking response
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
           Normalize data
        ------------------------------------------------- */

        const cars =
            Array.isArray(
                carsResult.data
            )
                ? carsResult.data
                : [];


        allBookings =
            Array.isArray(
                bookingsResult.data
            )
                ? bookingsResult.data
                : [];


        /* -------------------------------------------------
           Render dashboard
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
           Show dashboard
        ------------------------------------------------- */

        dashboardLoading.classList.add(
            "hidden"
        );


        dashboardContent.classList.remove(
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

    /* -----------------------------------------------------
       Vehicles
    ----------------------------------------------------- */

    const totalVehicles =
        cars.length;


    const activeVehicles =
        cars.filter(
            car =>
                car.status ===
                "available"
        ).length;


    /* -----------------------------------------------------
       Bookings
    ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       Booking value
       
       Cancelled bookings are not included.
    ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       Update DOM
    ----------------------------------------------------- */

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
       No bookings at all
    ----------------------------------------------------- */

    if (
        allBookings.length === 0
    ) {

        noBookings.classList.remove(
            "hidden"
        );


        return;

    }


    /* -----------------------------------------------------
       Apply selected filter
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
       No bookings for selected filter
    ----------------------------------------------------- */

    if (
        filteredBookings.length === 0
    ) {

        noFilteredBookings.classList.remove(
            "hidden"
        );


        return;

    }


    /* -----------------------------------------------------
       Render
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
        cars.length === 0
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


    /* -----------------------------------------------------
       STATUS
    ----------------------------------------------------- */

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
        vehicleStatus === "available"
            ? "unavailable"
            : "available";


    const statusButtonText =
        vehicleStatus === "archived"
            ? "Restore Vehicle"
            : vehicleStatus === "available"
                ? "Make Unavailable"
                : "Make Available";


    const statusButtonIcon =
        vehicleStatus === "archived"
            ? "fa-rotate-left"
            : vehicleStatus === "available"
                ? "fa-pause"
                : "fa-play";


    const statusButtonClass =
        vehicleStatus === "archived"
            ? "make-available"
            : vehicleStatus === "available"
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
                        vehicleStatus === "archived"
                            ? "archived"
                            : vehicleStatus !== "available"
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


                <!-- AVAILABLE / UNAVAILABLE / RESTORE -->

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
                    vehicleStatus !== "archived"

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


        /* -------------------------------------------------
           AUTH ERROR
        ------------------------------------------------- */

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            handleAuthFailure();

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
                "Unable to update vehicle status."
            );

        }


        /* -------------------------------------------------
           REFRESH DASHBOARD
        ------------------------------------------------- */

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


        /* -------------------------------------------------
           AUTH ERROR
        ------------------------------------------------- */

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            handleAuthFailure();

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
                "Unable to archive vehicle."
            );

        }


        /* -------------------------------------------------
           REFRESH
        ------------------------------------------------- */

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
   RENDER BOOKINGS
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


    const car =
        booking.car ||
        {};


    const carName =
        `${car.make || "Vehicle"} ${
            car.model || ""
        }`.trim();


    const status =
        booking.status ||
        "pending";


    const paymentStatus =
        booking.paymentStatus ||
        "pending";


    const driverRequired =
        booking.driverRequired ===
        true;


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

            <span
                class="host-booking-status ${
                    status === "cancelled"
                        ? "cancelled"
                        : ""
                }"
            >

                ${escapeHTML(
                    status
                )}

            </span>

        </div>


        <!-- BOOKING INFO -->

        <div
            class="host-booking-info"
        >

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


        <!-- PENDING ACTIONS -->

        ${
            status === "pending"

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

                : ""
        }

    `;


    /* =====================================================
       BOOKING ACTION BUTTONS
    ===================================================== */

    const actionButtons =
        card.querySelectorAll(
            ".booking-action-btn"
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
                        newStatus
                    );

                }
            );

        }
    );


    bookingsGrid.appendChild(
        card
    );

}


/* =========================================================
   UPDATE BOOKING STATUS
========================================================= */

async function updateBookingStatus(
    bookingId,
    status
) {

    const actionText =
        status === "confirmed"
            ? "confirm"
            : "cancel";


    const confirmed =
        window.confirm(
            `Are you sure you want to ${actionText} this booking?`
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


        /* -------------------------------------------------
           AUTH ERROR
        ------------------------------------------------- */

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            handleAuthFailure();

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
                "Unable to update booking."
            );

        }


        /* -------------------------------------------------
           REFRESH
        ------------------------------------------------- */

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