/* =========================================================
   Saarthi Host Location Selector

   Uses the existing CITY_DATABASE from cities.js.

   Flow:

   State
      ↓
   City

   The city dropdown stays disabled until
   the user selects a state.
   ========================================================= */


document.addEventListener(
    "DOMContentLoaded",
    () => {


        /* =================================================
           GET ELEMENTS
        ================================================= */

        const stateSelect =
            document.getElementById(
                "state"
            );


        const citySelect =
            document.getElementById(
                "city"
            );


        if (
            !stateSelect ||
            !citySelect
        ) {

            console.error(
                "State or city dropdown not found."
            );

            return;

        }


        /* =================================================
           CHECK CITY DATABASE
        ================================================= */

        if (
            typeof CITY_DATABASE ===
            "undefined"
        ) {

            console.error(
                "CITY_DATABASE was not loaded. Make sure cities.js is loaded before host-location.js."
            );

            return;

        }


        /* =================================================
           NORMALIZE STATE NAME
        ================================================= */

        function normalizeState(
            state
        ) {

            const normalized =
                String(state)
                    .trim()
                    .toLowerCase();


            const stateMap = {

                "andhra pradesh":
                    "Andhra Pradesh",

                "andhra pradesh ":
                    "Andhra Pradesh",

                "gujrat":
                    "Gujarat",

                "hariyana":
                    "Haryana",

                "maharastra":
                    "Maharashtra",

                "rajastan":
                    "Rajasthan",

                "tamil nadu":
                    "Tamil Nadu",

                "tamil nadu ":
                    "Tamil Nadu",

                "orissa":
                    "Odisha",

                "pondicherry":
                    "Puducherry"

            };


            return (
                stateMap[normalized] ||
                String(state).trim()
            );

        }


        /* =================================================
           CREATE CLEAN LOCATION DATA
        ================================================= */

        const locations =
            CITY_DATABASE
                .map(
                    (item) => ({

                        city:
                            String(
                                item.city
                            ).trim(),

                        state:
                            normalizeState(
                                item.state
                            )

                    })
                )
                .filter(
                    (item) => {

                        return (
                            item.city &&
                            item.state
                        );

                    }
                );


        /* =================================================
           GET UNIQUE STATES
        ================================================= */

        const states =
            [
                ...new Set(
                    locations.map(
                        item =>
                            item.state
                    )
                )
            ]
            .sort(
                (a, b) =>
                    a.localeCompare(
                        b
                    )
            );


        /* =================================================
           FILL STATE DROPDOWN
        ================================================= */

        states.forEach(
            (state) => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    state;


                option.textContent =
                    state;


                stateSelect.appendChild(
                    option
                );

            }
        );


        /* =================================================
           STATE CHANGE
        ================================================= */

        stateSelect.addEventListener(
            "change",
            () => {

                const selectedState =
                    stateSelect.value;


                /*
                    Clear city dropdown.
                */

                citySelect.innerHTML =
                    "";


                /*
                    No state selected.
                */

                if (
                    !selectedState
                ) {

                    citySelect.disabled =
                        true;


                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value = "";

                    option.textContent =
                        "Select state first";

                    option.selected =
                        true;


                    citySelect.appendChild(
                        option
                    );


                    return;

                }


                /*
                    Find only cities that
                    belong to selected state.
                */

                const cities =
                    locations
                        .filter(
                            item =>
                                item.state ===
                                selectedState
                        )
                        .map(
                            item =>
                                item.city
                        );


                /*
                    Remove duplicate city names.
                */

                const uniqueCities =
                    [
                        ...new Set(cities)
                    ]
                    .sort(
                        (a, b) =>
                            a.localeCompare(
                                b
                            )
                    );


                /*
                    Add default option.
                */

                const defaultOption =
                    document.createElement(
                        "option"
                    );


                defaultOption.value =
                    "";

                defaultOption.textContent =
                    "Select City";

                defaultOption.selected =
                    true;

                defaultOption.disabled =
                    true;


                citySelect.appendChild(
                    defaultOption
                );


                /*
                    Add state-specific cities.
                */

                uniqueCities.forEach(
                    (city) => {

                        const option =
                            document.createElement(
                                "option"
                            );


                        option.value =
                            city;


                        option.textContent =
                            city;


                        citySelect.appendChild(
                            option
                        );

                    }
                );


                /*
                    Enable city dropdown.
                */

                citySelect.disabled =
                    false;

            }
        );


        /* =================================================
           INITIAL STATE
        ================================================= */

        citySelect.disabled =
            true;

    }
);