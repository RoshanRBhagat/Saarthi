/* =========================================================
   Saarthi Cars

   Reads homepage search parameters and loads cars
========================================================= */

"use strict";


/* =========================================================
   DOM ELEMENTS
========================================================= */

const cityInput =
    document.getElementById("cityInput");

const startDateInput =
    document.getElementById("startDateInput");

const endDateInput =
    document.getElementById("endDateInput");

const travelersInput =
    document.getElementById("travelersInput");

const maxPriceInput =
    document.getElementById("maxPriceInput");

const searchCarsBtn =
    document.getElementById("searchCarsBtn");


const carGrid =
    document.getElementById("carGrid");

const loading =
    document.getElementById("loading");

const errorBox =
    document.getElementById("error");

const emptyBox =
    document.getElementById("empty");

const resultSummary =
    document.getElementById("resultSummary");


/* =========================================================
   STATE
========================================================= */

let tripVibe =
    "";


/* =========================================================
   DATE HELPERS
========================================================= */

function getTodayDateString() {

    const today =
        new Date();


    const year =
        today.getFullYear();


    const month =
        String(
            today.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            today.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${day}`;

}


/* =========================================================
   SET DATE RESTRICTIONS
========================================================= */

function setupDateInputs() {

    const today =
        getTodayDateString();


    startDateInput.min =
        today;


    endDateInput.min =
        today;

}


/* =========================================================
   UPDATE RETURN DATE MIN
========================================================= */

function updateReturnDateMinimum() {

    const startDate =
        startDateInput.value;


    if (startDate) {

        endDateInput.min =
            startDate;

    } else {

        endDateInput.min =
            getTodayDateString();

    }

}


/* =========================================================
   READ HOMEPAGE PARAMETERS
========================================================= */

function loadSearchParameters() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    /* ---------------------------------------------
       City
    --------------------------------------------- */

    const city =
        params.get("city");


    if (city) {

        cityInput.value =
            city;

    }


    /* ---------------------------------------------
       Pickup date
    --------------------------------------------- */

    const startDate =
        params.get("startDate");


    if (startDate) {

        startDateInput.value =
            startDate;

    }


    /* ---------------------------------------------
       Return date
    --------------------------------------------- */

    const endDate =
        params.get("endDate");


    if (endDate) {

        endDateInput.value =
            endDate;

    }


    /* ---------------------------------------------
       Travelers
    --------------------------------------------- */

    const travelers =
        params.get("travelers");


    if (travelers) {

        travelersInput.value =
            travelers;

    }


    /* ---------------------------------------------
       Trip vibe
    --------------------------------------------- */

    tripVibe =
        params.get("tripVibe") || "";


    updateReturnDateMinimum();

}


/* =========================================================
   VALIDATE DATE FILTERS
========================================================= */

function validateDates() {

    const startDate =
        startDateInput.value;

    const endDate =
        endDateInput.value;


    /* ---------------------------------------------
       Nothing entered
    --------------------------------------------- */

    if (
        !startDate &&
        !endDate
    ) {

        return true;

    }


    /* ---------------------------------------------
       Pickup missing
    --------------------------------------------- */

    if (!startDate) {

        showError(
            "Please select a pickup date."
        );

        startDateInput.focus();

        return false;

    }


    /* ---------------------------------------------
       Return missing
    --------------------------------------------- */

    if (!endDate) {

        showError(
            "Please select a return date."
        );

        endDateInput.focus();

        return false;

    }


    /* ---------------------------------------------
       Pickup in past
    --------------------------------------------- */

    if (
        startDate <
        getTodayDateString()
    ) {

        showError(
            "Pickup date cannot be in the past."
        );

        startDateInput.focus();

        return false;

    }


    /* ---------------------------------------------
       Return before pickup
    --------------------------------------------- */

    if (
        endDate <
        startDate
    ) {

        showError(
            "Return date must be on or after the pickup date."
        );

        endDateInput.focus();

        return false;

    }


    /* ---------------------------------------------
       Same day
    --------------------------------------------- */

    if (
        endDate ===
        startDate
    ) {

        showError(
            "Pickup and return dates cannot be the same."
        );

        endDateInput.focus();

        return false;

    }


    return true;

}


/* =========================================================
   BUILD API QUERY
========================================================= */

function buildQueryParameters() {

    const params =
        new URLSearchParams();


    const city =
        cityInput.value.trim();


    const startDate =
        startDateInput.value;


    const endDate =
        endDateInput.value;


    const travelers =
        travelersInput.value;


    const maxPrice =
        maxPriceInput.value.trim();


    /* ---------------------------------------------
       City
    --------------------------------------------- */

    if (city) {

        params.set(
            "city",
            city
        );

    }


    /* ---------------------------------------------
       Pickup date
    --------------------------------------------- */

    if (startDate) {

        params.set(
            "startDate",
            startDate
        );

    }


    /* ---------------------------------------------
       Return date
    --------------------------------------------- */

    if (endDate) {

        params.set(
            "endDate",
            endDate
        );

    }


    /* ---------------------------------------------
       Travelers
    --------------------------------------------- */

    if (travelers) {

        params.set(
            "travelers",
            travelers
        );

    }


    /* ---------------------------------------------
       Max price
    --------------------------------------------- */

    if (maxPrice) {

        params.set(
            "maxPrice",
            maxPrice
        );

    }


    return params;

}


/* =========================================================
   FETCH CARS
========================================================= */

async function fetchCars() {

    /* ---------------------------------------------
       Validate dates
    --------------------------------------------- */

    if (
        !validateDates()
    ) {

        return;

    }


    /* ---------------------------------------------
       Loading state
    --------------------------------------------- */

    loading.classList.remove(
        "hidden"
    );


    errorBox.classList.add(
        "hidden"
    );


    emptyBox.classList.add(
        "hidden"
    );


    carGrid.innerHTML =
        "";


    /* ---------------------------------------------
       Build request
    --------------------------------------------- */

    const params =
        buildQueryParameters();


    try {

        const response =
            await fetch(
                `/api/cars?${params.toString()}`
            );


        const result =
            await response.json();


        /* -----------------------------------------
           API error
        ----------------------------------------- */

        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Unable to load cars."
            );

        }


        /* -----------------------------------------
           No results
        ----------------------------------------- */

        if (
            !Array.isArray(result.data) ||
            result.data.length === 0
        ) {

            emptyBox.classList.remove(
                "hidden"
            );


            resultSummary.textContent =
                buildEmptyMessage();


            return;

        }


        /* -----------------------------------------
           Result summary
        ----------------------------------------- */

        resultSummary.textContent =
            buildResultSummary(
                result.count
            );


        /* -----------------------------------------
           Render cars
        ----------------------------------------- */

        result.data.forEach(
            renderCar
        );


    } catch (error) {

        console.error(
            "Error loading cars:",
            error
        );


        errorBox.textContent =
            error.message ||
            "Unable to load cars.";


        errorBox.classList.remove(
            "hidden"
        );


    } finally {

        loading.classList.add(
            "hidden"
        );

    }

}


/* =========================================================
   RESULT SUMMARY
========================================================= */

function buildResultSummary(count) {

    const city =
        cityInput.value.trim();


    let message =
        `${count} car${count === 1 ? "" : "s"} available on Saarthi`;


    if (city) {

        message +=
            ` in ${city}`;

    }


    if (
        startDateInput.value &&
        endDateInput.value
    ) {

        message +=
            ` for your selected dates`;

    }


    message +=
        ".";


    return message;

}


/* =========================================================
   EMPTY RESULT MESSAGE
========================================================= */

function buildEmptyMessage() {

    const city =
        cityInput.value.trim();


    if (city) {

        return (
            `No cars found in ${city} for your selected filters.`
        );

    }


    return (
        "No cars match your current filters."
    );

}


/* =========================================================
   SHOW ERROR
========================================================= */

function showError(message) {

    errorBox.textContent =
        message;


    errorBox.classList.remove(
        "hidden"
    );

}


/* =========================================================
   RENDER SINGLE CAR
========================================================= */

function renderCar(car) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "car-card";


    /* =====================================================
       IMAGE
    ===================================================== */

    let imageHTML;


    if (
        car.mainImage &&
        typeof car.mainImage === "string" &&
        car.mainImage.trim() !== ""
    ) {

        imageHTML = `
            <img
                src="${escapeHTML(car.mainImage)}"
                alt="${escapeHTML(car.make)} ${escapeHTML(car.model)}"
                onerror="this.style.display='none'; this.nextElementSibling.classList.remove('hidden');"
            >

            <div class="car-image-placeholder hidden">
                <i class="fa-solid fa-car-side"></i>
            </div>
        `;

    } else {

        imageHTML = `
            <div class="car-image-placeholder">
                <i class="fa-solid fa-car-side"></i>
            </div>
        `;

    }


    /* =====================================================
       FEATURES
    ===================================================== */

    const features =
        Array.isArray(car.features)
            ? car.features.slice(
                0,
                3
            )
            : [];


    const featureHTML =
        features
            .map(
                feature => `
                    <div class="car-feature">

                        <i
                            class="fa-solid fa-check"
                            aria-hidden="true"
                        ></i>

                        <span>
                            ${escapeHTML(feature)}
                        </span>

                    </div>
                `
            )
            .join("");


    /* =====================================================
       CARD HTML
    ===================================================== */

    card.innerHTML = `

        <div class="car-image">

            ${imageHTML}

        </div>


        <div class="car-content">


            <div class="car-top">


                <div>


                    <div class="car-name">

                        ${escapeHTML(
                            car.make || "Vehicle"
                        )}

                        ${escapeHTML(
                            car.model || ""
                        )}

                    </div>


                    <div class="car-rating">

                        <i
                            class="fa-solid fa-star"
                            aria-hidden="true"
                        ></i>

                        ${Number(
                            car.rating || 0
                        ).toFixed(1)}

                        ·

                        ${Number(
                            car.totalTrips || 0
                        )}

                        trips

                    </div>


                </div>


                <div class="car-price">

                    <strong>

                        ₹${Number(
                            car.dailyPrice || 0
                        ).toLocaleString("en-IN")}

                    </strong>


                    <span>
                        per day
                    </span>

                </div>


            </div>


            <div class="car-meta">


                <span class="meta-pill">

                    ${escapeHTML(
                        car.seats ?? "-"
                    )}

                    seats

                </span>


                <span class="meta-pill">

                    ${escapeHTML(
                        car.transmission || "-"
                    )}

                </span>


                <span class="meta-pill">

                    ${escapeHTML(
                        car.fuelType || "-"
                    )}

                </span>


                <span class="meta-pill">

                    ${escapeHTML(
                        car.category || "-"
                    )}

                </span>


            </div>


            <div class="car-features">

                ${
                    featureHTML ||
                    `
                        <div class="car-feature">

                            <i
                                class="fa-solid fa-check"
                                aria-hidden="true"
                            ></i>

                            <span>
                                Verified Saarthi vehicle
                            </span>

                        </div>
                    `
                }

            </div>


            <div class="car-actions">


                <span class="car-location">

                    <i
                        class="fa-solid fa-location-dot"
                        aria-hidden="true"
                    ></i>

                    ${escapeHTML(
                        car.city || ""
                    )}

                    ${
                        car.state
                            ? `, ${escapeHTML(car.state)}`
                            : ""
                    }

                </span>


                <button
                    class="view-btn"
                    type="button"
                >
                    View details
                </button>


            </div>


        </div>

    `;


    /* =====================================================
       VIEW DETAILS
    ===================================================== */

    const viewButton =
        card.querySelector(
            ".view-btn"
        );


    if (viewButton) {

        viewButton.addEventListener(
            "click",
            () => {

                if (!car.carId) {

                    alert(
                        "Unable to open vehicle details."
                    );

                    return;

                }


                window.location.href =
                    `car-details.html?carId=${encodeURIComponent(car.carId)}`;

            }
        );

    }


    /* =====================================================
       ADD CARD TO PAGE
    ===================================================== */

    carGrid.appendChild(
        card
    );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    return String(
        value ?? ""
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
   DATE EVENTS
========================================================= */

startDateInput.addEventListener(
    "change",
    () => {

        updateReturnDateMinimum();


        if (
            endDateInput.value &&
            endDateInput.value <
                startDateInput.value
        ) {

            endDateInput.value =
                "";

        }

    }
);


/* =========================================================
   SEARCH BUTTON
========================================================= */

searchCarsBtn.addEventListener(
    "click",
    fetchCars
);


/* =========================================================
   ENTER KEY SUPPORT
========================================================= */

[
    cityInput,
    maxPriceInput
].forEach(
    input => {

        input.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter"
                ) {

                    event.preventDefault();

                    fetchCars();

                }

            }
        );

    }
);


/* =========================================================
   INITIALIZE
========================================================= */

setupDateInputs();

loadSearchParameters();

fetchCars();