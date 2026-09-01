/* =========================================================
   SAARTHI - CARS.JS
   ---------------------------------------------------------
   Customer car search + AI recommendations
   ========================================================= */


/* =========================================================
   DOM ELEMENTS
========================================================= */

const stateInput =
    document.getElementById("stateInput");


const cityInput =
    document.getElementById("cityInput");


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
   AI RECOMMENDATION ELEMENTS
========================================================= */

const aiResultsSection =
    document.getElementById(
        "aiResultsSection"
    );


const aiRecommendationsGrid =
    document.getElementById(
        "aiRecommendationsGrid"
    );


const aiResultsSummary =
    document.getElementById(
        "aiResultsSummary"
    );


const aiPreferenceSummary =
    document.getElementById(
        "aiPreferenceSummary"
    );


const aiPreferenceButtons =
    document.querySelectorAll(
        ".ai-preference"
    );


let selectedAiPreferences = [];


/* =========================================================
   AI PREFERENCE SELECTION
========================================================= */

aiPreferenceButtons.forEach(
    (button) => {

        button.addEventListener(
            "click",
            () => {

                const preference =
                    button.dataset.preference;


                if (
                    selectedAiPreferences.includes(
                        preference
                    )
                ) {

                    selectedAiPreferences =
                        selectedAiPreferences.filter(
                            item =>
                                item !==
                                preference
                        );


                    button.classList.remove(
                        "selected"
                    );

                } else {

                    selectedAiPreferences.push(
                        preference
                    );


                    button.classList.add(
                        "selected"
                    );

                }


                updatePreferenceSummary();

            }
        );

    }
);


/* =========================================================
   UPDATE PREFERENCE SUMMARY
========================================================= */

function updatePreferenceSummary() {

    if (
        selectedAiPreferences.length === 0
    ) {

        aiPreferenceSummary.textContent =
            "No preference selected";

        return;

    }


    aiPreferenceSummary.textContent =
        selectedAiPreferences.join(
            " + "
        );

}


/* =========================================================
   FETCH FILTERED CARS
========================================================= */

async function fetchCars() {

    /* -----------------------------------------------------
       SHOW LOADING
    ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       BUILD QUERY
    ----------------------------------------------------- */

    const params =
        new URLSearchParams();


    const state =
        stateInput
            ? stateInput.value
            : "";


    const city =
        cityInput
            ? cityInput.value
            : "";


    const travelers =
        travelersInput
            ? travelersInput.value
            : "";


    const maxPrice =
        maxPriceInput
            ? maxPriceInput.value
            : "";


    /* -----------------------------------------------------
       STATE
    ----------------------------------------------------- */

    if (
        state
    ) {

        params.set(
            "state",
            state
        );

    }


    /* -----------------------------------------------------
       CITY
    ----------------------------------------------------- */

    if (
        city
    ) {

        params.set(
            "city",
            city
        );

    }


    /* -----------------------------------------------------
       TRAVELERS
    ----------------------------------------------------- */

    if (
        travelers
    ) {

        params.set(
            "travelers",
            travelers
        );

    }


    /* -----------------------------------------------------
       MAX PRICE
    ----------------------------------------------------- */

    if (
        maxPrice
    ) {

        params.set(
            "maxPrice",
            maxPrice
        );

    }


    try {

        /* -------------------------------------------------
           REQUEST
        ------------------------------------------------- */

        const queryString =
            params.toString();


        const url =
            queryString
                ? `/api/cars?${queryString}`
                : "/api/cars";


        const response =
            await fetch(
                url
            );


        const result =
            await response.json();


        /* -------------------------------------------------
           API ERROR
        ------------------------------------------------- */

        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Unable to load cars."
            );

        }


        /* -------------------------------------------------
           NO RESULTS
        ------------------------------------------------- */

        if (
            !Array.isArray(
                result.data
            ) ||
            result.data.length === 0
        ) {

            emptyBox.classList.remove(
                "hidden"
            );


            resultSummary.textContent =
                "No cars match your current preferences.";


            return;

        }


        /* -------------------------------------------------
           RESULT COUNT
        ------------------------------------------------- */

        resultSummary.textContent =
            `${result.count} car${
                result.count === 1
                    ? ""
                    : "s"
            } match your search.`;


        /* -------------------------------------------------
           RENDER
        ------------------------------------------------- */

        result.data.forEach(
            renderCar
        );


    } catch (error) {

        console.error(
            "Error loading cars:",
            error
        );


        errorBox.textContent =
            error.message;


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
   RENDER NORMAL CAR
========================================================= */

function renderCar(
    car
) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "car-card";


    /* =====================================================
       IMAGE LIST
    ===================================================== */

    let images = [];


    if (
        Array.isArray(
            car.images
        )
    ) {

        images =
            car.images.filter(
                image =>
                    typeof image === "string" &&
                    image.trim() !== ""
            );

    }


    /*
        Make sure mainImage is included.
    */

    if (
        car.mainImage &&
        typeof car.mainImage === "string" &&
        !images.includes(
            car.mainImage
        )
    ) {

        images.unshift(
            car.mainImage
        );

    }


    images =
        [
            ...new Set(
                images
            )
        ];


    /* =====================================================
       IMAGE HTML
    ===================================================== */

    let imageHTML =
        "";


    if (
        images.length > 0
    ) {

        imageHTML = `

            <div class="car-gallery">

                <div class="car-main-image">

                    <img
                        src="${escapeHTML(
                            getImageUrl(
                                images[0]
                            )
                        )}"
                        alt="${escapeHTML(
                            `${car.make || ""} ${car.model || ""}`
                        )}"
                        class="main-car-photo"
                    >


                    <button
                        type="button"
                        class="gallery-prev"
                        aria-label="Previous image"
                    >

                        <i
                            class="fa-solid fa-chevron-left"
                        ></i>

                    </button>


                    <button
                        type="button"
                        class="gallery-next"
                        aria-label="Next image"
                    >

                        <i
                            class="fa-solid fa-chevron-right"
                        ></i>

                    </button>

                </div>


                <div class="car-thumbnails">

                    ${images
                        .map(
                            (
                                image,
                                index
                            ) => `

                                <button
                                    type="button"
                                    class="car-thumbnail ${
                                        index === 0
                                            ? "active"
                                            : ""
                                    }"
                                    data-index="${index}"
                                    aria-label="View image ${
                                        index + 1
                                    }"
                                >

                                    <img
                                        src="${escapeHTML(
                                            getImageUrl(
                                                image
                                            )
                                        )}"
                                        alt="Car image ${
                                            index + 1
                                        }"
                                    >

                                </button>

                            `
                        )
                        .join("")}

                </div>

            </div>

        `;

    } else {

        imageHTML = `

            <div class="car-gallery">

                <div class="car-main-image">

                    <div
                        class="car-image-placeholder"
                    >

                        <i
                            class="fa-solid fa-car-side"
                        ></i>

                    </div>

                </div>

            </div>

        `;

    }


    /* =====================================================
       FEATURES
    ===================================================== */

    const features =
        Array.isArray(
            car.features
        )
            ? car.features.slice(
                0,
                3
            )
            : [];


    let featureHTML =
        features
            .map(
                feature => `

                    <div
                        class="car-feature"
                    >

                        <i
                            class="fa-solid fa-check"
                        ></i>

                        <span>
                            ${escapeHTML(
                                feature
                            )}
                        </span>

                    </div>

                `
            )
            .join("");


    if (
        !featureHTML
    ) {

        featureHTML = `

            <div
                class="car-feature"
            >

                <i
                    class="fa-solid fa-check"
                ></i>

                <span>
                    Verified Saarthi vehicle
                </span>

            </div>

        `;

    }


    /* =====================================================
       CARD HTML
    ===================================================== */

    card.innerHTML = `

        <div class="car-image">

            ${imageHTML}

        </div>


        <div class="car-content">


            <!-- NAME + PRICE -->

            <div class="car-top">

                <div>

                    <div class="car-name">

                        ${escapeHTML(
                            car.make ||
                            ""
                        )}

                        ${escapeHTML(
                            car.model ||
                            ""
                        )}

                    </div>


                    <div class="car-rating">

                        <i
                            class="fa-solid fa-star"
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
                        ).toLocaleString(
                            "en-IN"
                        )}

                    </strong>

                    <span>
                        per day
                    </span>

                </div>

            </div>


            <!-- SPECIFICATIONS -->

            <div class="car-meta">

                <span class="meta-pill">

                    ${Number(
                        car.seats || 0
                    )}

                    seats

                </span>


                <span class="meta-pill">

                    ${escapeHTML(
                        car.transmission ||
                        ""
                    )}

                </span>


                <span class="meta-pill">

                    ${escapeHTML(
                        car.fuelType ||
                        ""
                    )}

                </span>


                <span class="meta-pill">

                    ${escapeHTML(
                        car.category ||
                        ""
                    )}

                </span>

            </div>


            <!-- FEATURES -->

            <div class="car-features">

                ${featureHTML}

            </div>


            <!-- LOCATION + BUTTON -->

            <div class="car-actions">

                <span class="car-location">

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
       GALLERY SETUP
    ===================================================== */

    if (
        images.length > 0
    ) {

        setupGallery(
            card,
            images
        );

    }


    /* =====================================================
       VIEW DETAILS
    ===================================================== */

    const viewButton =
        card.querySelector(
            ".view-btn"
        );


    if (
        viewButton
    ) {

        viewButton.addEventListener(
            "click",
            () => {

                viewCar(
                    car.carId
                );

            }
        );

    }


    /* =====================================================
       ADD CARD
    ===================================================== */

    carGrid.appendChild(
        card
    );

}


/* =========================================================
   SETUP GALLERY
========================================================= */

function setupGallery(
    card,
    images
) {

    const mainImage =
        card.querySelector(
            ".main-car-photo"
        );


    const thumbnails =
        Array.from(
            card.querySelectorAll(
                ".car-thumbnail"
            )
        );


    const previousButton =
        card.querySelector(
            ".gallery-prev"
        );


    const nextButton =
        card.querySelector(
            ".gallery-next"
        );


    if (
        !mainImage ||
        images.length === 0
    ) {

        return;

    }


    let currentIndex =
        0;


    /* =====================================================
       SHOW IMAGE
    ===================================================== */

    function showImage(
        index
    ) {

        currentIndex =
            (
                index +
                images.length
            ) %
            images.length;


        mainImage.src =
            getImageUrl(
                images[
                    currentIndex
                ]
            );


        thumbnails.forEach(
            (
                thumbnail,
                thumbnailIndex
            ) => {

                thumbnail.classList.toggle(
                    "active",
                    thumbnailIndex ===
                        currentIndex
                );

            }
        );

    }


    /* =====================================================
       THUMBNAILS
    ===================================================== */

    thumbnails.forEach(
        (
            thumbnail,
            index
        ) => {

            thumbnail.addEventListener(
                "click",
                () => {

                    showImage(
                        index
                    );

                }
            );

        }
    );


    /* =====================================================
       PREVIOUS
    ===================================================== */

    if (
        previousButton
    ) {

        previousButton.addEventListener(
            "click",
            () => {

                showImage(
                    currentIndex -
                    1
                );

            }
        );

    }


    /* =====================================================
       NEXT
    ===================================================== */

    if (
        nextButton
    ) {

        nextButton.addEventListener(
            "click",
            () => {

                showImage(
                    currentIndex +
                    1
                );

            }
        );

    }


    /* =====================================================
       SINGLE IMAGE
    ===================================================== */

    if (
        images.length <= 1
    ) {

        if (
            previousButton
        ) {

            previousButton.style.display =
                "none";

        }


        if (
            nextButton
        ) {

            nextButton.style.display =
                "none";

        }

    }

}


/* =========================================================
   AUTOMATIC AI RECOMMENDATION
========================================================= */

async function getAiRecommendationsAutomatically() {

    const state =
        stateInput
            ? stateInput.value
            : "";


    const city =
        cityInput
            ? cityInput.value
            : "";


    const travelers =
        travelersInput
            ? Number(
                travelersInput.value
            )
            : 0;


    const budget =
        maxPriceInput
            ? Number(
                maxPriceInput.value
            )
            : 0;


    /* =====================================================
       RESET RESULTS
    ===================================================== */

    aiResultsSection.classList.add(
        "hidden"
    );


    aiRecommendationsGrid.innerHTML =
        "";


    /* =====================================================
       REQUIRED LOCATION
    ===================================================== */

    if (
        !state ||
        !city ||
        !travelers
    ) {

        return;

    }


    /* =====================================================
       BUDGET REQUIRED FOR AI
    ===================================================== */

    if (
        !budget ||
        budget <= 0
    ) {

        return;

    }


    /* =====================================================
       SHOW AI SECTION
    ===================================================== */

    aiResultsSection.classList.remove(
        "hidden"
    );


    aiResultsSummary.textContent =
        "Saarthi AI is finding the best matches for you...";


    aiRecommendationsGrid.innerHTML = `

        <div class="ai-loading">

            <i
                class="fa-solid fa-spinner fa-spin"
            ></i>

            <span>
                Analysing your preferences...
            </span>

        </div>

    `;


    /* =====================================================
       API REQUEST
    ===================================================== */

    try {

        const response =
            await fetch(
                "/api/recommendations/cars",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            state,

                            city,

                            travelers,

                            budget,

                            preferences:
                                selectedAiPreferences

                        })

                }
            );


        const result =
            await response.json();


        /* =================================================
           ERROR
        ================================================= */

        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Unable to generate recommendations."
            );

        }


        /* =================================================
           NO RECOMMENDATIONS
        ================================================= */

        if (
            !Array.isArray(
                result.data
            ) ||
            result.data.length === 0
        ) {

            aiResultsSummary.textContent =
                "No AI recommendations are available for these preferences.";


            aiRecommendationsGrid.innerHTML =
                "";


            return;

        }


        /* =================================================
           SHOW RESULTS
        ================================================= */

        aiResultsSummary.textContent =
            `${result.count} AI-ranked match${
                result.count === 1
                    ? ""
                    : "es"
            } based on your preferences.`;


        aiRecommendationsGrid.innerHTML =
            "";


        result.data.forEach(
            renderAiRecommendation
        );


    } catch (
        error
    ) {

        console.error(
            "Automatic AI recommendation error:",
            error
        );


        aiResultsSection.classList.add(
            "hidden"
        );

    }

}


/* =========================================================
   RENDER AI RECOMMENDATION
========================================================= */

function renderAiRecommendation(
    recommendation
) {

    const car =
        recommendation.car;


    if (
        !car
    ) {

        return;

    }


    const score =
        Number(
            recommendation.matchScore || 0
        );


    const reasons =
        Array.isArray(
            recommendation.reasons
        )
            ? recommendation.reasons
            : [];


    const card =
        document.createElement(
            "article"
        );


    card.className =
        "ai-car-card";


    /* =====================================================
       IMAGE
    ===================================================== */

    let image =
        car.mainImage || "";


    if (
        !image &&
        Array.isArray(
            car.images
        ) &&
        car.images.length > 0
    ) {

        image =
            car.images[0];

    }


    let imageHTML;


    if (
        image
    ) {

        imageHTML = `

            <div class="ai-car-image">

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

        `;

    } else {

        imageHTML = `

            <div class="ai-car-image">

                <div
                    class="car-image-placeholder"
                >

                    <i
                        class="fa-solid fa-car-side"
                    ></i>

                </div>

            </div>

        `;

    }


    /* =====================================================
       REASONS
    ===================================================== */

    const reasonsHTML =
        reasons.length > 0

            ? reasons
                .map(
                    reason => `

                        <div
                            class="ai-reason"
                        >

                            <i
                                class="fa-solid fa-check"
                            ></i>

                            <span>
                                ${escapeHTML(
                                    reason
                                )}
                            </span>

                        </div>

                    `
                )
                .join("")

            : `

                <div
                    class="ai-reason"
                >

                    <i
                        class="fa-solid fa-check"
                    ></i>

                    <span>
                        Strong match for your trip requirements.
                    </span>

                </div>

            `;


    /* =====================================================
       CARD
    ===================================================== */

    card.innerHTML = `

        ${imageHTML}


        <div class="ai-car-content">


            <div class="ai-car-top">

                <div>

                    <div class="ai-car-name">

                        ${escapeHTML(
                            car.make ||
                            ""
                        )}

                        ${escapeHTML(
                            car.model ||
                            ""
                        )}

                    </div>


                    <div class="ai-car-price">

                        ₹${Number(
                            car.dailyPrice || 0
                        ).toLocaleString(
                            "en-IN"
                        )}

                        / day

                    </div>


                    <div class="ai-car-location">

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

                </div>


                <span
                    class="ai-match-score"
                >

                    ${score}% match

                </span>

            </div>


            <!-- SPECIFICATIONS -->

            <div
                class="car-meta"
                style="margin-top: 14px;"
            >

                <span class="meta-pill">

                    ${Number(
                        car.seats || 0
                    )}

                    seats

                </span>


                <span class="meta-pill">

                    ${escapeHTML(
                        car.transmission ||
                        ""
                    )}

                </span>


                <span class="meta-pill">

                    ${escapeHTML(
                        car.fuelType ||
                        ""
                    )}

                </span>


                <span class="meta-pill">

                    ${escapeHTML(
                        car.category ||
                        ""
                    )}

                </span>

            </div>


            <!-- WHY -->

            <div class="ai-reasons">

                <div class="ai-reasons-title">

                    Why we recommend it

                </div>


                ${reasonsHTML}

            </div>


            <!-- DETAILS -->

            <button
                type="button"
                class="ai-car-details-btn"
            >

                View details

            </button>

        </div>

    `;


    /* =====================================================
       VIEW DETAILS
    ===================================================== */

    const detailsButton =
        card.querySelector(
            ".ai-car-details-btn"
        );


    if (
        detailsButton
    ) {

        detailsButton.addEventListener(
            "click",
            () => {

                viewCar(
                    car.carId
                );

            }
        );

    }


    /* =====================================================
       ADD CARD
    ===================================================== */

    aiRecommendationsGrid.appendChild(
        card
    );

}


/* =========================================================
   COMBINED SEARCH
========================================================= */

async function handleSearch() {

    /*
        First get the normal matching inventory.
    */

    await fetchCars();


    /*
        Then automatically generate AI recommendations
        from that same customer search.
    */

    await getAiRecommendationsAutomatically();


    /*
        Move the customer to the results.
    */

    if (
        !aiResultsSection.classList.contains(
            "hidden"
        )
    ) {

        aiResultsSection.scrollIntoView({

            behavior:
                "smooth",

            block:
                "start"

        });

    } else {

        carGrid.scrollIntoView({

            behavior:
                "smooth",

            block:
                "start"

        });

    }

}


/* =========================================================
   VIEW CAR DETAILS
========================================================= */

function viewCar(
    carId
) {

    if (
        !carId
    ) {

        console.error(
            "Car ID is missing."
        );

        return;

    }


    window.location.href =
        `car-details.html?carId=${encodeURIComponent(
            carId
        )}`;

}


/* =========================================================
   IMAGE URL HELPER
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


/* =========================================================
   SEARCH BUTTON
========================================================= */

searchCarsBtn.addEventListener(
    "click",
    handleSearch
);


/* =========================================================
   INITIAL PAGE STATE
========================================================= */

resultSummary.textContent =
    "Select your preferences and search for cars.";