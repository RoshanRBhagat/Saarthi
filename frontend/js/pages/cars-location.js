/* =========================================================
   SAARTHI CUSTOMER LOCATION SELECTOR

   State
      ↓
   City

   Uses the existing CITY_DATABASE
   from cities.js.
   ========================================================= */


document.addEventListener(
    "DOMContentLoaded",
    () => {


        /* =================================================
           ELEMENTS
        ================================================= */

        const stateSelect =
            document.getElementById(
                "stateInput"
            );


        const citySelect =
            document.getElementById(
                "cityInput"
            );


        if (
            !stateSelect ||
            !citySelect
        ) {

            console.error(
                "Customer state/city selectors were not found."
            );

            return;

        }


        /* =================================================
           CHECK DATABASE
        ================================================= */

        if (
            typeof CITY_DATABASE ===
            "undefined"
        ) {

            console.error(
                "CITY_DATABASE was not loaded. Make sure cities.js is loaded before cars-location.js."
            );

            return;

        }


        /* =================================================
           NORMALIZE STATE NAMES
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
           CLEAN LOCATION DATA
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
           POPULATE STATES
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


                citySelect.innerHTML =
                    "";


                /* -------------------------------------------
                   No state selected
                ------------------------------------------- */

                if (
                    !selectedState
                ) {

                    citySelect.disabled =
                        true;


                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        "";

                    option.textContent =
                        "Select state first";

                    option.selected =
                        true;


                    citySelect.appendChild(
                        option
                    );


                    return;

                }


                /* -------------------------------------------
                   Get cities for selected state
                ------------------------------------------- */

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


                /* -------------------------------------------
                   Remove duplicates
                ------------------------------------------- */

                const uniqueCities =
                    [
                        ...new Set(
                            cities
                        )
                    ]

                    .sort(
                        (a, b) =>
                            a.localeCompare(
                                b
                            )
                    );


                /* -------------------------------------------
                   Default option
                ------------------------------------------- */

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


                /* -------------------------------------------
                   Add cities
                ------------------------------------------- */

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