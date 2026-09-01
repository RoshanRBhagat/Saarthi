/* =========================================================
   Saarthi Homepage - index.js

   Handles:
   - City autocomplete
   - City + state dropdown
   - Keyboard navigation
========================================================= */


const locationInput =
    document.getElementById("locationInput");

const locationDropdown =
    document.getElementById("locationDropdown");


let filteredCities = [];

let activeIndex = -1;


/* =========================================================
   NORMALIZE TEXT
========================================================= */

function normalize(value) {

    return value
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

}


/* =========================================================
   DISPLAY CITY SUGGESTIONS
========================================================= */

function showSuggestions() {

    locationDropdown.innerHTML = "";


    /* No results */

    if (filteredCities.length === 0) {

        locationDropdown.classList.remove("show");

        return;

    }


    /* Create each city option */

    filteredCities.forEach((item, index) => {

        const option =
            document.createElement("button");


        option.type = "button";

        option.className =
            "location-option";


        option.dataset.index =
            index;


        option.innerHTML = `

            <i class="fa-solid fa-location-dot"></i>

            <span class="location-option-text">

                <span class="location-option-city">
                    ${item.city}
                </span>

                <span class="location-option-state">
                    ${item.state}
                </span>

            </span>

        `;


        /* Select city */

        option.addEventListener(
            "mousedown",
            (event) => {

                /*
                    Prevent input blur before
                    the click event happens.
                */

                event.preventDefault();

            }
        );


        option.addEventListener(
            "click",
            () => {

                locationInput.value =
                    `${item.city}, ${item.state}`;


                /*
                    Store selected values.

                    These will be useful later when
                    we connect the search to cars.html.
                */

                locationInput.dataset.city =
                    item.city;

                locationInput.dataset.state =
                    item.state;


                closeDropdown();

            }
        );


        locationDropdown.appendChild(option);

    });


    locationDropdown.classList.add("show");

}


/* =========================================================
   CLOSE DROPDOWN
========================================================= */

function closeDropdown() {

    locationDropdown.classList.remove("show");

    activeIndex = -1;

}


/* =========================================================
   SEARCH CITY DATABASE
========================================================= */

function searchCities(value) {

    const query = normalize(value);

    activeIndex = -1;

    // Hide dropdown when input is empty
    if (!query) {

        filteredCities = [];

        closeDropdown();

        return;
    }

    // Search the complete city database
    filteredCities = CITY_DATABASE.filter((item) => {

        const city = normalize(item.city);
        const state = normalize(item.state);

        return (
            city.includes(query) ||
            state.includes(query)
        );

    });

    showSuggestions();
}

/* =========================================================
   INPUT EVENT
========================================================= */

locationInput.addEventListener(
    "input",
    () => {

        /*
            User is typing again, so remove
            previously selected city data.
        */

        delete locationInput.dataset.city;

        delete locationInput.dataset.state;


        searchCities(
            locationInput.value
        );

    }
);


/* =========================================================
   FOCUS EVENT
========================================================= */

locationInput.addEventListener(
    "focus",
    () => {

        if (locationInput.value.trim()) {

            searchCities(
                locationInput.value
            );

        }

    }
);


/* =========================================================
   KEYBOARD NAVIGATION
========================================================= */

locationInput.addEventListener(
    "keydown",
    (event) => {

        const options =
            locationDropdown.querySelectorAll(
                ".location-option"
            );


        /*
            Nothing to navigate.
        */

        if (
            !locationDropdown.classList.contains("show") ||
            options.length === 0
        ) {

            return;

        }


        /* Arrow Down */

        if (event.key === "ArrowDown") {

            event.preventDefault();

            activeIndex =
                (activeIndex + 1) % options.length;

        }


        /* Arrow Up */

        if (event.key === "ArrowUp") {

            event.preventDefault();

            activeIndex =
                activeIndex <= 0
                    ? options.length - 1
                    : activeIndex - 1;

        }


        /* Enter */

        if (
            event.key === "Enter" &&
            activeIndex >= 0
        ) {

            event.preventDefault();

            options[activeIndex].click();

            return;

        }


        /* Escape */

        if (event.key === "Escape") {

            closeDropdown();

            return;

        }


        /*
            Highlight active city.
        */

        options.forEach(
            (option, index) => {

                option.classList.toggle(
                    "active",
                    index === activeIndex
                );

            }
        );

    }
);


/* =========================================================
   CLOSE WHEN CLICKING OUTSIDE
========================================================= */

document.addEventListener(
    "click",
    (event) => {

        if (
            !event.target.closest(
                ".location-field"
            )
        ) {

            closeDropdown();

        }

    }
);