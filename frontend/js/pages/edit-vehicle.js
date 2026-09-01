/* =========================================================
   SAARTHI - EDIT VEHICLE
========================================================= */


/* =========================================================
   DOM ELEMENTS
========================================================= */

const editLoading =
    document.getElementById("editLoading");


const editError =
    document.getElementById("editError");


const editContent =
    document.getElementById("editContent");


const editSubtitle =
    document.getElementById("editSubtitle");


const editVehicleForm =
    document.getElementById("editVehicleForm");


const carMakeInput =
    document.getElementById("carMake");


const carModelInput =
    document.getElementById("carModel");


const carYearInput =
    document.getElementById("carYear");


const carCategoryInput =
    document.getElementById("carCategory");


const carSeatsInput =
    document.getElementById("carSeats");


const luggageCapacityInput =
    document.getElementById("luggageCapacity");


const fuelTypeInput =
    document.getElementById("fuelType");


const transmissionInput =
    document.getElementById("transmission");


const stateInput =
    document.getElementById("state");


const cityInput =
    document.getElementById("city");


const dailyPriceInput =
    document.getElementById("dailyPrice");


const carDescriptionInput =
    document.getElementById("carDescription");


const saveVehicleBtn =
    document.getElementById("saveVehicleBtn");


const saveSuccess =
    document.getElementById("saveSuccess");


/* =========================================================
   URL PARAMETER
========================================================= */

const params =
    new URLSearchParams(
        window.location.search
    );


const carId =
    params.get("carId");


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
   REQUIRE HOST LOGIN
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

            loadVehicle();

        }

    } catch (error) {

        console.error(
            "Unable to read logged-in user:",
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
   LOAD VEHICLE
========================================================= */

async function loadVehicle() {

    if (!carId) {

        showError(
            "No vehicle was selected."
        );

        return;

    }


    try {

        const response =
            await fetch(
                `/api/cars/${encodeURIComponent(
                    carId
                )}`,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        const result =
            await response.json();


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Unable to load vehicle details."
            );

        }


        const car =
            result.data;


        if (!car) {

            throw new Error(
                "Vehicle information was not returned by the server."
            );

        }


        populateForm(
            car
        );


        editLoading.classList.add(
            "hidden"
        );


        editContent.classList.remove(
            "hidden"
        );


    } catch (error) {

        console.error(
            "Load vehicle error:",
            error
        );


        showError(
            error.message
        );

    }

}


/* =========================================================
   POPULATE FORM
========================================================= */

function populateForm(
    car
) {

    carMakeInput.value =
        car.make || "";


    carModelInput.value =
        car.model || "";


    carYearInput.value =
        car.year || "";


    carCategoryInput.value =
        car.category || "";


    carSeatsInput.value =
        String(
            car.seats || ""
        );


    luggageCapacityInput.value =
        String(
            car.luggageCapacity || ""
        );


    fuelTypeInput.value =
        car.fuelType || "";


    transmissionInput.value =
        car.transmission || "";


    dailyPriceInput.value =
        car.dailyPrice ?? "";


    carDescriptionInput.value =
        car.description || "";


    editSubtitle.textContent =
        `Editing ${
            car.make || ""
        } ${
            car.model || ""
        } · ${
            car.carId || ""
        }`;


    populateLocation(
        car.state || "",
        car.city || ""
    );

}


/* =========================================================
   LOCATION DATA
========================================================= */

function getLocationData() {

    /*
        Support the common global names used by the project.
    */

    if (
        typeof window.indianStatesAndCities !==
            "undefined"
    ) {

        return window.indianStatesAndCities;

    }


    if (
        typeof window.statesAndCities !==
            "undefined"
    ) {

        return window.statesAndCities;

    }


    return null;

}


/* =========================================================
   POPULATE LOCATION
========================================================= */

function populateLocation(
    savedState,
    savedCity
) {

    const locationData =
        getLocationData();


    /* -----------------------------------------------------
       No location data available
    ----------------------------------------------------- */

    if (
        !locationData
    ) {

        populateLocationFallback(
            savedState,
            savedCity
        );

        return;

    }


    /* -----------------------------------------------------
       Populate states
    ----------------------------------------------------- */

    stateInput.innerHTML = `

        <option
            value=""
            disabled
        >
            Select State
        </option>

    `;


    const states =
        getStateNames(
            locationData
        );


    states.forEach(
        stateName => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                stateName;


            option.textContent =
                stateName;


            stateInput.appendChild(
                option
            );

        }
    );


    /* -----------------------------------------------------
       Select saved state
    ----------------------------------------------------- */

    if (
        savedState &&
        states.includes(
            savedState
        )
    ) {

        stateInput.value =
            savedState;

    }


    /* -----------------------------------------------------
       Populate saved city
    ----------------------------------------------------- */

    populateCitiesForState(
        stateInput.value,
        savedCity
    );


    /* -----------------------------------------------------
       State change
    ----------------------------------------------------- */

    stateInput.addEventListener(
        "change",
        () => {

            populateCitiesForState(
                stateInput.value,
                ""
            );

        }
    );

}


/* =========================================================
   GET STATE NAMES
========================================================= */

function getStateNames(
    locationData
) {

    /* -----------------------------------------------------
       Object format:

       {
           Maharashtra: [...],
           Kerala: [...]
       }
    ----------------------------------------------------- */

    if (
        !Array.isArray(
            locationData
        ) &&
        typeof locationData ===
            "object"
    ) {

        return Object.keys(
            locationData
        );

    }


    /* -----------------------------------------------------
       Array format:

       [
           {
               state: "Maharashtra",
               cities: [...]
           }
       ]
    ----------------------------------------------------- */

    if (
        Array.isArray(
            locationData
        )
    ) {

        return locationData
            .map(
                entry =>
                    entry.state ||
                    entry.name ||
                    ""
            )
            .filter(
                Boolean
            );

    }


    return [];

}


/* =========================================================
   GET CITIES FOR STATE
========================================================= */

function getCitiesForState(
    locationData,
    stateName
) {

    if (
        !locationData ||
        !stateName
    ) {

        return [];

    }


    /* -----------------------------------------------------
       Object format
    ----------------------------------------------------- */

    if (
        !Array.isArray(
            locationData
        ) &&
        typeof locationData ===
            "object"
    ) {

        const cities =
            locationData[
                stateName
            ];


        return Array.isArray(
            cities
        )
            ? cities
            : [];

    }


    /* -----------------------------------------------------
       Array format
    ----------------------------------------------------- */

    if (
        Array.isArray(
            locationData
        )
    ) {

        const entry =
            locationData.find(
                item =>
                    (
                        item.state ||
                        item.name
                    ) ===
                    stateName
            );


        if (
            entry &&
            Array.isArray(
                entry.cities
            )
        ) {

            return entry.cities;

        }

    }


    return [];

}


/* =========================================================
   POPULATE CITIES
========================================================= */

function populateCitiesForState(
    stateName,
    selectedCity = ""
) {

    cityInput.innerHTML = `

        <option
            value=""
            selected
            disabled
        >
            ${
                stateName
                    ? "Select City"
                    : "Select state first"
            }
        </option>

    `;


    if (
        !stateName
    ) {

        cityInput.disabled =
            true;

        return;

    }


    const locationData =
        getLocationData();


    const cities =
        getCitiesForState(
            locationData,
            stateName
        );


    /* -----------------------------------------------------
       No cities found
    ----------------------------------------------------- */

    if (
        cities.length === 0
    ) {

        if (
            selectedCity
        ) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                selectedCity;


            option.textContent =
                selectedCity;


            option.selected =
                true;


            cityInput.appendChild(
                option
            );


            cityInput.disabled =
                false;

        } else {

            cityInput.disabled =
                true;

        }


        return;

    }


    /* -----------------------------------------------------
       Add cities
    ----------------------------------------------------- */

    cities.forEach(
        cityName => {

            /*
                Some datasets may contain objects rather
                than strings.
            */

            const city =
                typeof cityName ===
                    "string"
                    ? cityName
                    : (
                        cityName.city ||
                        cityName.name ||
                        ""
                    );


            if (
                !city
            ) {

                return;

            }


            const option =
                document.createElement(
                    "option"
                );


            option.value =
                city;


            option.textContent =
                city;


            if (
                city ===
                selectedCity
            ) {

                option.selected =
                    true;

            }


            cityInput.appendChild(
                option
            );

        }
    );


    cityInput.disabled =
        false;


    /*
        If the saved city wasn't found in the dataset,
        preserve it rather than silently replacing it.
    */

    if (
        selectedCity &&
        ![
            ...cityInput.options
        ].some(
            option =>
                option.value ===
                selectedCity
        )
    ) {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            selectedCity;


        option.textContent =
            selectedCity;


        option.selected =
            true;


        cityInput.appendChild(
            option
        );

    }

}


/* =========================================================
   FALLBACK LOCATION
========================================================= */

function populateLocationFallback(
    savedState,
    savedCity
) {

    stateInput.innerHTML = `

        <option
            value=""
            disabled
        >
            Select State
        </option>

    `;


    if (
        savedState
    ) {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            savedState;


        option.textContent =
            savedState;


        option.selected =
            true;


        stateInput.appendChild(
            option
        );

    }


    cityInput.innerHTML = `

        <option
            value=""
            disabled
        >
            ${
                savedState
                    ? "Select City"
                    : "Select state first"
            }
        </option>

    `;


    if (
        savedCity
    ) {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            savedCity;


        option.textContent =
            savedCity;


        option.selected =
            true;


        cityInput.appendChild(
            option
        );


        cityInput.disabled =
            false;

    } else {

        cityInput.disabled =
            true;

    }


    stateInput.addEventListener(
        "change",
        () => {

            /*
                Without a global location dataset,
                we cannot dynamically generate cities.
                Keep the city selector disabled rather
                than showing unrelated cities.
            */

            cityInput.innerHTML = `

                <option
                    value=""
                    selected
                    disabled
                >
                    Select City
                </option>

            `;


            cityInput.disabled =
                true;

        }
    );

}


/* =========================================================
   SAVE VEHICLE
========================================================= */

editVehicleForm.addEventListener(
    "submit",
    saveVehicle
);


async function saveVehicle(
    event
) {

    event.preventDefault();


    editError.classList.add(
        "hidden"
    );


    saveSuccess.classList.add(
        "hidden"
    );


    const currentToken =
        localStorage.getItem(
            "saarthiToken"
        );


    if (
        !currentToken
    ) {

        window.location.href =
            `auth.html?returnUrl=${encodeURIComponent(
                window.location.href
            )}`;


        return;

    }


    /* -----------------------------------------------------
       Validate location
    ----------------------------------------------------- */

    if (
        !stateInput.value
    ) {

        showInlineError(
            "Please select a state."
        );


        stateInput.focus();


        return;

    }


    if (
        !cityInput.value
    ) {

        showInlineError(
            "Please select a city."
        );


        cityInput.focus();


        return;

    }


    /* -----------------------------------------------------
       Validate price
    ----------------------------------------------------- */

    const dailyPrice =
        Number(
            dailyPriceInput.value
        );


    if (
        !Number.isFinite(
            dailyPrice
        ) ||
        dailyPrice < 0
    ) {

        showInlineError(
            "Please enter a valid daily rental price."
        );


        dailyPriceInput.focus();


        return;

    }


    /* -----------------------------------------------------
       BUTTON LOADING
    ----------------------------------------------------- */

    saveVehicleBtn.disabled =
        true;


    saveVehicleBtn.innerHTML = `

        <i
            class="fa-solid fa-spinner fa-spin"
        ></i>

        Saving...

    `;


    try {

        const body = {

            make:
                carMakeInput.value.trim(),

            model:
                carModelInput.value.trim(),

            year:
                Number(
                    carYearInput.value
                ),

            category:
                carCategoryInput.value,

            seats:
                Number(
                    carSeatsInput.value
                ),

            luggageCapacity:
                Number(
                    luggageCapacityInput.value
                ),

            fuelType:
                fuelTypeInput.value,

            transmission:
                transmissionInput.value,

            state:
                stateInput.value,

            city:
                cityInput.value,

            dailyPrice,

            description:
                carDescriptionInput.value.trim()

        };


        /* -------------------------------------------------
           UPDATE REQUEST
        ------------------------------------------------- */

        const response =
            await fetch(
                `/api/cars/host/${encodeURIComponent(
                    carId
                )}`,
                {

                    method:
                        "PATCH",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${currentToken}`

                    },

                    body:
                        JSON.stringify(
                            body
                        )

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
           OTHER API ERROR
        ------------------------------------------------- */

        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Unable to update vehicle."
            );

        }


        /* -------------------------------------------------
           SUCCESS
        ------------------------------------------------- */

        saveSuccess.classList.remove(
            "hidden"
        );


        editSubtitle.textContent =
            `Changes saved for ${
                result.data?.make ||
                body.make
            } ${
                result.data?.model ||
                body.model
            } · ${
                result.data?.carId ||
                carId
            }`;


        window.scrollTo({

            top:
                0,

            behavior:
                "smooth"

        });


    } catch (error) {

        console.error(
            "Save vehicle error:",
            error
        );


        showInlineError(
            error.message
        );

    } finally {

        saveVehicleBtn.disabled =
            false;


        saveVehicleBtn.innerHTML = `

            <i
                class="fa-solid fa-floppy-disk"
            ></i>

            Save Changes

        `;

    }

}


/* =========================================================
   SHOW ERROR
========================================================= */

function showInlineError(
    message
) {

    editError.textContent =
        message;


    editError.classList.remove(
        "hidden"
    );


    editError.scrollIntoView({

        behavior:
            "smooth",

        block:
            "center"

    });

}


/* =========================================================
   STARTUP
========================================================= */

console.log(
    "Saarthi Edit Vehicle loaded:",
    carId
);