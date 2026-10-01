/* =========================================================
   Saarthi Homepage
   Smart car search + location autocomplete
========================================================= */

(() => {

    "use strict";


    /* =====================================================
       DOM ELEMENTS
    ===================================================== */

    const locationInput =
        document.getElementById("locationInput");

    const locationDropdown =
        document.getElementById("locationDropdown");

    const clearLocationBtn =
        document.getElementById("clearLocationBtn");

    const pickupDateInput =
        document.getElementById("pickupDateInput");

    const returnDateInput =
        document.getElementById("returnDateInput");

    const travelersInput =
        document.getElementById("travelersInput");

    const tripVibeInput =
        document.getElementById("tripVibeInput");

    const searchForm =
        document.getElementById("carSearchForm");

    const findCarsBtn =
        document.getElementById("findCarsBtn");


    /* =====================================================
       SAFETY CHECK
    ===================================================== */

    if (
        !locationInput ||
        !locationDropdown ||
        !clearLocationBtn ||
        !pickupDateInput ||
        !returnDateInput ||
        !travelersInput ||
        !tripVibeInput ||
        !searchForm ||
        !findCarsBtn
    ) {

        console.error(
            "Saarthi homepage: required elements are missing."
        );

        return;

    }


    /* =====================================================
       STATE
    ===================================================== */

    let filteredCities = [];

    let activeIndex = -1;


    /* =====================================================
       DATE HELPERS
    ===================================================== */

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


    /* =====================================================
       SET MINIMUM PICKUP DATE
    ===================================================== */

    function setupDateInputs() {

        const today =
            getTodayDateString();


        pickupDateInput.min =
            today;


        returnDateInput.min =
            today;

    }


    /* =====================================================
       UPDATE RETURN DATE MINIMUM
    ===================================================== */

    function updateReturnDateMinimum() {

        const pickupDate =
            pickupDateInput.value;


        if (!pickupDate) {

            returnDateInput.min =
                getTodayDateString();

            return;

        }


        returnDateInput.min =
            pickupDate;

    }


    /* =====================================================
       TEXT NORMALIZATION
    ===================================================== */

    function normalizeText(value) {

        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .trim();

    }


    /* =====================================================
       CITY DATABASE
    ===================================================== */

    function getCityDatabase() {

        if (
            typeof CITY_DATABASE === "undefined" ||
            !Array.isArray(CITY_DATABASE)
        ) {

            console.error(
                "Saarthi homepage: CITY_DATABASE is unavailable."
            );

            return [];

        }


        return CITY_DATABASE;

    }


    /* =====================================================
       CREATE CITY SUGGESTION
    ===================================================== */

    function createSuggestion(
        cityRecord,
        index
    ) {

        const button =
            document.createElement("button");


        button.type =
            "button";


        button.className =
            "location-option";


        button.dataset.index =
            String(index);


        button.setAttribute(
            "role",
            "option"
        );


        button.setAttribute(
            "aria-selected",
            "false"
        );


        /* ---------------------------------------------
           Icon
        --------------------------------------------- */

        const icon =
            document.createElement("i");


        icon.className =
            "fa-solid fa-location-dot";


        icon.setAttribute(
            "aria-hidden",
            "true"
        );


        /* ---------------------------------------------
           Text wrapper
        --------------------------------------------- */

        const textWrapper =
            document.createElement("span");


        textWrapper.className =
            "location-option-text";


        /* ---------------------------------------------
           City
        --------------------------------------------- */

        const city =
            document.createElement("span");


        city.className =
            "location-option-city";


        city.textContent =
            cityRecord.city;


        /* ---------------------------------------------
           State
        --------------------------------------------- */

        const state =
            document.createElement("span");


        state.className =
            "location-option-state";


        state.textContent =
            cityRecord.state;


        /* ---------------------------------------------
           Build
        --------------------------------------------- */

        textWrapper.appendChild(
            city
        );

        textWrapper.appendChild(
            state
        );


        button.appendChild(
            icon
        );

        button.appendChild(
            textWrapper
        );


        /* ---------------------------------------------
           Prevent blur before click
        --------------------------------------------- */

        button.addEventListener(
            "mousedown",
            event => {

                event.preventDefault();

            }
        );


        /* ---------------------------------------------
           Selection
        --------------------------------------------- */

        button.addEventListener(
            "click",
            () => {

                selectCity(index);

            }
        );


        return button;

    }


    /* =====================================================
       RENDER LOCATION SUGGESTIONS
    ===================================================== */

    function renderSuggestions(query) {

        const normalizedQuery =
            normalizeText(query);


        locationDropdown.innerHTML =
            "";


        activeIndex =
            -1;


        /* ---------------------------------------------
           Empty query
        --------------------------------------------- */

        if (!normalizedQuery) {

            filteredCities =
                [];

            closeSuggestions();

            return;

        }


        /* ---------------------------------------------
           Filter database
        --------------------------------------------- */

        const database =
            getCityDatabase();


        filteredCities =
            database
                .filter(item => {

                    const city =
                        normalizeText(
                            item.city
                        );

                    const state =
                        normalizeText(
                            item.state
                        );


                    return (
                        city.includes(
                            normalizedQuery
                        ) ||
                        state.includes(
                            normalizedQuery
                        )
                    );

                })
                .slice(
                    0,
                    10
                );


        /* ---------------------------------------------
           No match
        --------------------------------------------- */

        if (
            filteredCities.length === 0
        ) {

            closeSuggestions();

            return;

        }


        /* ---------------------------------------------
           Render
        --------------------------------------------- */

        filteredCities.forEach(
            (
                cityRecord,
                index
            ) => {

                locationDropdown.appendChild(
                    createSuggestion(
                        cityRecord,
                        index
                    )
                );

            }
        );


        locationDropdown.classList.add(
            "show"
        );


        locationInput.setAttribute(
            "aria-expanded",
            "true"
        );

    }


    /* =====================================================
       CLOSE LOCATION DROPDOWN
    ===================================================== */

    function closeSuggestions() {

        locationDropdown.classList.remove(
            "show"
        );


        locationInput.setAttribute(
            "aria-expanded",
            "false"
        );


        activeIndex =
            -1;

    }


    /* =====================================================
       SELECT LOCATION
    ===================================================== */

    function selectCity(index) {

        const selected =
            filteredCities[index];


        if (!selected) {

            return;

        }


        locationInput.value =
            `${selected.city}, ${selected.state}`;


        locationInput.dataset.city =
            selected.city;


        locationInput.dataset.state =
            selected.state;


        clearLocationBtn.classList.remove(
            "hidden"
        );


        closeSuggestions();

    }


    /* =====================================================
       CLEAR LOCATION
    ===================================================== */

    function clearLocation() {

        locationInput.value =
            "";


        delete locationInput.dataset.city;

        delete locationInput.dataset.state;


        clearLocationBtn.classList.add(
            "hidden"
        );


        filteredCities =
            [];


        closeSuggestions();


        locationInput.focus();

    }


    /* =====================================================
       UPDATE ACTIVE SUGGESTION
    ===================================================== */

    function updateActiveSuggestion() {

        const options =
            locationDropdown.querySelectorAll(
                ".location-option"
            );


        options.forEach(
            (
                option,
                index
            ) => {

                const active =
                    index === activeIndex;


                option.classList.toggle(
                    "active",
                    active
                );


                option.setAttribute(
                    "aria-selected",
                    String(active)
                );

            }
        );


        const activeOption =
            options[activeIndex];


        if (activeOption) {

            activeOption.scrollIntoView({
                block: "nearest"
            });

        }

    }


    /* =====================================================
       LOCATION INPUT
    ===================================================== */

    locationInput.addEventListener(
        "input",
        event => {

            const value =
                event.target.value.trim();


            /* -----------------------------------------
               Previous selected location becomes invalid
            ----------------------------------------- */

            delete locationInput.dataset.city;

            delete locationInput.dataset.state;


            /* -----------------------------------------
               Clear button
            ----------------------------------------- */

            if (value) {

                clearLocationBtn.classList.remove(
                    "hidden"
                );

            } else {

                clearLocationBtn.classList.add(
                    "hidden"
                );

            }


            /* -----------------------------------------
               Suggestions
            ----------------------------------------- */

            renderSuggestions(
                event.target.value
            );

        }
    );


    /* =====================================================
       LOCATION FOCUS
    ===================================================== */

    locationInput.addEventListener(
        "focus",
        () => {

            if (
                locationInput.value.trim()
            ) {

                renderSuggestions(
                    locationInput.value
                );

            }

        }
    );


    /* =====================================================
       LOCATION KEYBOARD CONTROLS
    ===================================================== */

    locationInput.addEventListener(
        "keydown",
        event => {

            const dropdownOpen =
                locationDropdown.classList.contains(
                    "show"
                );


            if (!dropdownOpen) {

                return;

            }


            /* -----------------------------------------
               Arrow Down
            ----------------------------------------- */

            if (
                event.key === "ArrowDown"
            ) {

                event.preventDefault();


                if (
                    filteredCities.length === 0
                ) {

                    return;

                }


                activeIndex =
                    (
                        activeIndex + 1
                    ) %
                    filteredCities.length;


                updateActiveSuggestion();

                return;

            }


            /* -----------------------------------------
               Arrow Up
            ----------------------------------------- */

            if (
                event.key === "ArrowUp"
            ) {

                event.preventDefault();


                if (
                    filteredCities.length === 0
                ) {

                    return;

                }


                activeIndex =
                    activeIndex <= 0
                        ? filteredCities.length - 1
                        : activeIndex - 1;


                updateActiveSuggestion();

                return;

            }


            /* -----------------------------------------
               Enter
            ----------------------------------------- */

            if (
                event.key === "Enter" &&
                activeIndex >= 0
            ) {

                event.preventDefault();


                selectCity(
                    activeIndex
                );


                return;

            }


            /* -----------------------------------------
               Escape
            ----------------------------------------- */

            if (
                event.key === "Escape"
            ) {

                closeSuggestions();

            }

        }
    );


    /* =====================================================
       CLEAR LOCATION BUTTON
    ===================================================== */

    clearLocationBtn.addEventListener(
        "click",
        clearLocation
    );


    /* =====================================================
       PICKUP DATE CHANGE
    ===================================================== */

    pickupDateInput.addEventListener(
        "change",
        () => {

            updateReturnDateMinimum();


            if (
                returnDateInput.value &&
                returnDateInput.value <
                    pickupDateInput.value
            ) {

                returnDateInput.value =
                    "";

            }

        }
    );


    /* =====================================================
       OUTSIDE CLICK
    ===================================================== */

    document.addEventListener(
        "click",
        event => {

            if (
                !event.target.closest(
                    ".location-field"
                )
            ) {

                closeSuggestions();

            }

        }
    );


    /* =====================================================
       SEARCH VALIDATION
    ===================================================== */

    function validateSearch() {

        /* ---------------------------------------------
           Location
        --------------------------------------------- */

        const city =
            locationInput.dataset.city;


        const state =
            locationInput.dataset.state;


        if (
            !city ||
            !state
        ) {

            locationInput.focus();

            renderSuggestions(
                locationInput.value
            );

            return false;

        }


        /* ---------------------------------------------
           Pickup date
        --------------------------------------------- */

        const pickupDate =
            pickupDateInput.value;


        if (!pickupDate) {

            alert(
                "Please select a pickup date."
            );

            pickupDateInput.focus();

            return false;

        }


        /* ---------------------------------------------
           Return date
        --------------------------------------------- */

        const returnDate =
            returnDateInput.value;


        if (!returnDate) {

            alert(
                "Please select a return date."
            );

            returnDateInput.focus();

            return false;

        }


        /* ---------------------------------------------
           Pickup cannot be in the past
        --------------------------------------------- */

        const today =
            getTodayDateString();


        if (
            pickupDate < today
        ) {

            alert(
                "Pickup date cannot be in the past."
            );

            pickupDateInput.focus();

            return false;

        }


        /* ---------------------------------------------
           Return cannot be before pickup
        --------------------------------------------- */

        if (
            returnDate < pickupDate
        ) {

            alert(
                "Return date must be on or after the pickup date."
            );

            returnDateInput.focus();

            return false;

        }


        /* ---------------------------------------------
           Return must be after pickup
        --------------------------------------------- */

        if (
            returnDate === pickupDate
        ) {

            alert(
                "Pickup and return dates cannot be the same."
            );

            returnDateInput.focus();

            return false;

        }


        return true;

    }


    /* =====================================================
       SEARCH SUBMIT
    ===================================================== */

    searchForm.addEventListener(
        "submit",
        event => {

            event.preventDefault();


            /* -----------------------------------------
               Validate
            ----------------------------------------- */

            if (
                !validateSearch()
            ) {

                return;

            }


            /* -----------------------------------------
               Get values
            ----------------------------------------- */

            const city =
                locationInput.dataset.city;


            const startDate =
                pickupDateInput.value;


            const endDate =
                returnDateInput.value;


            const travelers =
                travelersInput.value;


            const tripVibe =
                tripVibeInput.value.trim();


            /* -----------------------------------------
               Build query
            ----------------------------------------- */

            const params =
                new URLSearchParams();


            params.set(
                "city",
                city
            );


            params.set(
                "startDate",
                startDate
            );


            params.set(
                "endDate",
                endDate
            );


            if (travelers) {

                params.set(
                    "travelers",
                    travelers
                );

            }


            if (tripVibe) {

                params.set(
                    "tripVibe",
                    tripVibe
                );

            }


            /* -----------------------------------------
               Loading state
            ----------------------------------------- */

            findCarsBtn.disabled =
                true;


            const buttonText =
                findCarsBtn.querySelector(
                    "span"
                );


            if (buttonText) {

                buttonText.textContent =
                    "Finding Cars...";

            }


            /* -----------------------------------------
               Navigate
            ----------------------------------------- */

            window.location.href =
                `cars.html?${params.toString()}`;

        }
    );


    /* =====================================================
       INITIALIZE
    ===================================================== */

    setupDateInputs();

    updateReturnDateMinimum();

    clearLocationBtn.classList.add(
        "hidden"
    );

})();