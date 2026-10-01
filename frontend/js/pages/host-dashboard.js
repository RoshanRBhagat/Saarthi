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


    /* -----------------------------------------------------
       PICKUP ACTION CONDITION
    ----------------------------------------------------- */

    const canConfirmPickup =
        status === "confirmed" &&
        paymentStatus === "paid" &&
        rentalStatus === "active" &&
        !pickupConfirmed;


    /* -----------------------------------------------------
       RETURN ACTION CONDITION
    ----------------------------------------------------- */

    const canConfirmReturn =
        status === "confirmed" &&
        paymentStatus === "paid" &&
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


        <!-- BOOKING ACTIONS -->

        ${
            status ===
            "pending"

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

    `;


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
                        newStatus
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


    if (
        pickupButton
    ) {

        pickupButton.addEventListener(
            "click",
            async () => {

                await confirmPickup(
                    booking.bookingId
                );

            }
        );

    }


    /* =====================================================
       RETURN BUTTON
    ===================================================== */

    const returnButton =
        card.querySelector(
            '[data-handover-action="return"]'
        );


    if (
        returnButton
    ) {

        returnButton.addEventListener(
            "click",
            async () => {

                await confirmReturn(
                    booking.bookingId
                );

            }
        );

    }


    /* =====================================================
       ADD CARD
    ===================================================== */

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
        status ===
        "confirmed"

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