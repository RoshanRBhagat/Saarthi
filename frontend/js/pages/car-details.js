/* =========================================================
   SAARTHI - CAR DETAILS
========================================================= */


/* =========================================================
   DOM ELEMENTS
========================================================= */

/* ---------- Main page ---------- */

const loading =
    document.getElementById("loading");


const errorBox =
    document.getElementById("error");


const carDetails =
    document.getElementById("carDetails");


/* ---------- Gallery ---------- */

const mainCarImage =
    document.getElementById("mainCarImage");


const imageThumbnails =
    document.getElementById("imageThumbnails");


const previousImage =
    document.getElementById("previousImage");


const nextImage =
    document.getElementById("nextImage");


/* ---------- Car information ---------- */

const carCategory =
    document.getElementById("carCategory");


const carName =
    document.getElementById("carName");


const carLocation =
    document.getElementById("carLocation");


const carPrice =
    document.getElementById("carPrice");


const carRating =
    document.getElementById("carRating");


const carSpecs =
    document.getElementById("carSpecs");


const carFeatures =
    document.getElementById("carFeatures");


const featuresSection =
    document.getElementById("featuresSection");


const carDescription =
    document.getElementById("carDescription");


/* ---------- Availability ---------- */

const bookingPrice =
    document.getElementById("bookingPrice");


const pickupDateInput =
    document.getElementById("pickupDate");


const returnDateInput =
    document.getElementById("returnDate");


const checkAvailabilityBtn =
    document.getElementById(
        "checkAvailabilityBtn"
    );


const availabilityResult =
    document.getElementById(
        "availabilityResult"
    );


const bookNowBtn =
    document.getElementById(
        "bookNowBtn"
    );


/* ---------- Booking form ---------- */

const bookingFormSection =
    document.getElementById(
        "bookingFormSection"
    );


const customerNameInput =
    document.getElementById(
        "customerName"
    );


const customerPhoneInput =
    document.getElementById(
        "customerPhone"
    );


const customerEmailInput =
    document.getElementById(
        "customerEmail"
    );


const driverRequiredInput =
    document.getElementById(
        "driverRequired"
    );


const summaryPickupDate =
    document.getElementById(
        "summaryPickupDate"
    );


const summaryReturnDate =
    document.getElementById(
        "summaryReturnDate"
    );


const summaryTotalDays =
    document.getElementById(
        "summaryTotalDays"
    );


const summaryTotalAmount =
    document.getElementById(
        "summaryTotalAmount"
    );


const confirmBookingBtn =
    document.getElementById(
        "confirmBookingBtn"
    );


const bookingError =
    document.getElementById(
        "bookingError"
    );


/* =========================================================
   URL
========================================================= */

const urlParams =
    new URLSearchParams(
        window.location.search
    );


const carId =
    urlParams.get("carId");


/* =========================================================
   PAGE STATE
========================================================= */

let currentCar =
    null;


let images =
    [];


let currentImageIndex =
    0;


let currentDailyPrice =
    0;


/* =========================================================
   LOAD CAR
========================================================= */

async function loadCar() {

    if (!carId) {

        showPageError(
            "No car was selected."
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
                "Unable to load car details."
            );

        }


        currentCar =
            result.data;


        renderCarDetails(
            currentCar
        );


    } catch (error) {

        console.error(
            "Error loading car:",
            error
        );


        showPageError(
            error.message
        );

    }

}


/* =========================================================
   RENDER CAR DETAILS
========================================================= */

function renderCarDetails(
    car
) {

    loading.classList.add(
        "hidden"
    );


    errorBox.classList.add(
        "hidden"
    );


    carDetails.classList.remove(
        "hidden"
    );


    /* -----------------------------------------------------
       CATEGORY
    ----------------------------------------------------- */

    carCategory.textContent =
        car.category ||
        "Car";


    /* -----------------------------------------------------
       NAME
    ----------------------------------------------------- */

    carName.textContent =
        `${car.make || ""} ${
            car.model || ""
        }`.trim();


    /* -----------------------------------------------------
       LOCATION
    ----------------------------------------------------- */

    carLocation.querySelector(
        "span"
    ).textContent =
        `${car.city || ""}, ${
            car.state || ""
        }`;


    /* -----------------------------------------------------
       PRICE
    ----------------------------------------------------- */

    currentDailyPrice =
        Number(
            car.dailyPrice || 0
        );


    const formattedPrice =
        `₹${currentDailyPrice.toLocaleString(
            "en-IN"
        )}`;


    carPrice.textContent =
        formattedPrice;


    bookingPrice.textContent =
        formattedPrice;


    /* -----------------------------------------------------
       RATING
    ----------------------------------------------------- */

    const rating =
        Number(
            car.rating || 0
        ).toFixed(1);


    const trips =
        Number(
            car.totalTrips || 0
        );


    carRating.innerHTML = `

        <i
            class="fa-solid fa-star"
        ></i>

        <span>
            ${rating}
        </span>

        <span>
            ·
        </span>

        <span>
            ${trips} trips
        </span>

    `;


    /* -----------------------------------------------------
       IMAGES
    ----------------------------------------------------- */

    buildImageList(
        car
    );


    renderGallery();


    /* -----------------------------------------------------
       SPECIFICATIONS
    ----------------------------------------------------- */

    carSpecs.innerHTML = `

        ${createSpec(
            "Make",
            car.make
        )}

        ${createSpec(
            "Model",
            car.model
        )}

        ${createSpec(
            "Year",
            car.year
        )}

        ${createSpec(
            "Seats",
            `${car.seats || 0} seats`
        )}

        ${createSpec(
            "Luggage",
            `${car.luggageCapacity || 0} bags`
        )}

        ${createSpec(
            "Fuel",
            car.fuelType
        )}

        ${createSpec(
            "Transmission",
            car.transmission
        )}

    `;


    /* -----------------------------------------------------
       FEATURES
    ----------------------------------------------------- */

    const features =
        Array.isArray(
            car.features
        )
            ? car.features
            : [];


    if (
        features.length === 0
    ) {

        featuresSection.classList.add(
            "hidden"
        );

    } else {

        featuresSection.classList.remove(
            "hidden"
        );


        carFeatures.innerHTML =
            features
                .map(
                    feature => `

                        <div
                            class="detail-feature"
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

    }


    /* -----------------------------------------------------
       DESCRIPTION
    ----------------------------------------------------- */

    carDescription.textContent =
        car.description &&
        car.description.trim()
            ? car.description
            : "No description has been provided for this vehicle yet.";


    /* -----------------------------------------------------
       RESET BOOKING UI
    ----------------------------------------------------- */

    availabilityResult.classList.add(
        "hidden"
    );


    bookNowBtn.classList.add(
        "hidden"
    );


    bookingFormSection.classList.add(
        "hidden"
    );


    bookingError.classList.add(
        "hidden"
    );

}


/* =========================================================
   BUILD IMAGE LIST
========================================================= */

function buildImageList(
    car
) {

    images = [];


    if (
        Array.isArray(
            car.images
        )
    ) {

        images =
            car.images.filter(
                image =>
                    typeof image ===
                        "string" &&
                    image.trim() !== ""
            );

    }


    if (
        car.mainImage &&
        typeof car.mainImage ===
            "string"
    ) {

        if (
            !images.includes(
                car.mainImage
            )
        ) {

            images.unshift(
                car.mainImage
            );

        }

    }


    images =
        [
            ...new Set(
                images
            )
        ];


    currentImageIndex =
        0;

}


/* =========================================================
   CREATE SPECIFICATION
========================================================= */

function createSpec(
    label,
    value
) {

    return `

        <div
            class="spec-item"
        >

            <span
                class="spec-label"
            >
                ${escapeHTML(
                    label
                )}
            </span>

            <span
                class="spec-value"
            >
                ${escapeHTML(
                    value ??
                    "Not specified"
                )}
            </span>

        </div>

    `;

}


/* =========================================================
   RENDER GALLERY
========================================================= */

function renderGallery() {

    imageThumbnails.innerHTML =
        "";


    if (
        images.length === 0
    ) {

        mainCarImage.removeAttribute(
            "src"
        );


        mainCarImage.alt =
            "No vehicle image available";


        previousImage.style.display =
            "none";


        nextImage.style.display =
            "none";


        return;

    }


    images.forEach(
        (
            image,
            index
        ) => {

            const thumbnail =
                document.createElement(
                    "button"
                );


            thumbnail.type =
                "button";


            thumbnail.className =
                "details-thumbnail";


            if (
                index === 0
            ) {

                thumbnail.classList.add(
                    "active"
                );

            }


            thumbnail.innerHTML = `

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

            `;


            thumbnail.addEventListener(
                "click",
                () => {

                    showImage(
                        index
                    );

                }
            );


            imageThumbnails.appendChild(
                thumbnail
            );

        }
    );


    showImage(
        0
    );


    if (
        images.length <= 1
    ) {

        previousImage.style.display =
            "none";


        nextImage.style.display =
            "none";

    } else {

        previousImage.style.display =
            "grid";


        nextImage.style.display =
            "grid";

    }

}


/* =========================================================
   SHOW IMAGE
========================================================= */

function showImage(
    index
) {

    if (
        images.length === 0
    ) {

        return;

    }


    currentImageIndex =
        (
            index +
            images.length
        ) %
        images.length;


    mainCarImage.src =
        getImageUrl(
            images[
                currentImageIndex
            ]
        );


    mainCarImage.alt =
        `${currentCar?.make || "Car"} ${
            currentCar?.model || ""
        } image ${
            currentImageIndex + 1
        }`;


    const thumbnails =
        imageThumbnails.querySelectorAll(
            ".details-thumbnail"
        );


    thumbnails.forEach(
        (
            thumbnail,
            thumbnailIndex
        ) => {

            thumbnail.classList.toggle(
                "active",
                thumbnailIndex ===
                    currentImageIndex
            );

        }
    );

}


/* =========================================================
   PREVIOUS IMAGE
========================================================= */

if (
    previousImage
) {

    previousImage.addEventListener(
        "click",
        () => {

            showImage(
                currentImageIndex -
                1
            );

        }
    );

}


/* =========================================================
   NEXT IMAGE
========================================================= */

if (
    nextImage
) {

    nextImage.addEventListener(
        "click",
        () => {

            showImage(
                currentImageIndex +
                1
            );

        }
    );

}


/* =========================================================
   CHECK AVAILABILITY
========================================================= */

if (
    checkAvailabilityBtn
) {

    checkAvailabilityBtn.addEventListener(
        "click",
        checkCarAvailability
    );

}


async function checkCarAvailability() {

    const pickupDate =
        pickupDateInput.value;


    const returnDate =
        returnDateInput.value;


    /* -----------------------------------------------------
       VALIDATION
    ----------------------------------------------------- */

    if (
        !pickupDate
    ) {

        showAvailabilityError(
            "Please select a pickup date."
        );


        pickupDateInput.focus();


        return;

    }


    if (
        !returnDate
    ) {

        showAvailabilityError(
            "Please select a return date."
        );


        returnDateInput.focus();


        return;

    }


    if (
        returnDate <
        pickupDate
    ) {

        showAvailabilityError(
            "Return date cannot be before the pickup date."
        );


        return;

    }


    if (
        !carId
    ) {

        showAvailabilityError(
            "Car information is missing."
        );


        return;

    }


    /* -----------------------------------------------------
       LOADING STATE
    ----------------------------------------------------- */

    checkAvailabilityBtn.disabled =
        true;


    checkAvailabilityBtn.innerHTML = `

        <i
            class="fa-solid fa-spinner fa-spin"
        ></i>

        Checking...

    `;


    availabilityResult.classList.add(
        "hidden"
    );


    bookNowBtn.classList.add(
        "hidden"
    );


    bookingFormSection.classList.add(
        "hidden"
    );


    try {

        const apiUrl =
            `/api/bookings/availability/${encodeURIComponent(
                carId
            )}` +
            `?pickupDate=${encodeURIComponent(
                pickupDate
            )}` +
            `&returnDate=${encodeURIComponent(
                returnDate
            )}`;


        console.log(
            "Checking availability:",
            apiUrl
        );


        const controller =
            new AbortController();


        const timeout =
            setTimeout(
                () => {

                    controller.abort();

                },
                10000
            );


        const response =
            await fetch(
                apiUrl,
                {

                    method:
                        "GET",

                    signal:
                        controller.signal,

                    cache:
                        "no-store"

                }
            );


        clearTimeout(
            timeout
        );


        const contentType =
            response.headers.get(
                "content-type"
            ) || "";


        let result;


        if (
            contentType.includes(
                "application/json"
            )
        ) {

            result =
                await response.json();

        } else {

            const text =
                await response.text();


            throw new Error(
                text ||
                "Server returned an invalid response."
            );

        }


        console.log(
            "Availability response:",
            result
        );


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Unable to check availability."
            );

        }


        /* =================================================
           AVAILABLE
        ================================================= */

        if (
            result.available === true
        ) {

            const totalDays =
                calculateRentalDays(
                    pickupDate,
                    returnDate
                );


            const dailyPrice =
                Number(
                    result.car?.dailyPrice ??
                    currentDailyPrice ??
                    0
                );


            const totalAmount =
                totalDays *
                dailyPrice;


            availabilityResult.innerHTML = `

                <div
                    class="availability-success"
                >

                    <i
                        class="fa-solid fa-circle-check"
                    ></i>

                    <div>

                        <strong>
                            Car available
                        </strong>

                        <span>
                            Your selected dates are available.
                        </span>

                    </div>

                </div>


                <div
                    class="booking-total"
                >

                    <div>

                        <span>

                            ${totalDays}

                            ${
                                totalDays === 1
                                    ? "day"
                                    : "days"
                            }

                        </span>


                        <strong>

                            ₹${totalAmount.toLocaleString(
                                "en-IN"
                            )}

                        </strong>

                    </div>

                </div>

            `;


            availabilityResult.classList.remove(
                "hidden"
            );


            /* -------------------------------------------------
               Store selected booking data
            ------------------------------------------------- */

            bookNowBtn.dataset.pickupDate =
                pickupDate;


            bookNowBtn.dataset.returnDate =
                returnDate;


            bookNowBtn.dataset.totalDays =
                String(
                    totalDays
                );


            bookNowBtn.dataset.totalAmount =
                String(
                    totalAmount
                );


            bookNowBtn.classList.remove(
                "hidden"
            );

        } else {

            showAvailabilityError(
                result.message ||
                "This car is not available for the selected dates."
            );

        }


    } catch (error) {

        console.error(
            "Availability request failed:",
            error
        );


        if (
            error.name ===
            "AbortError"
        ) {

            showAvailabilityError(
                "The availability check timed out. Please try again."
            );

        } else {

            showAvailabilityError(
                error.message ||
                "Unable to check availability."
            );

        }

    } finally {

        checkAvailabilityBtn.disabled =
            false;


        checkAvailabilityBtn.innerHTML = `

            <i
                class="fa-solid fa-calendar-check"
            ></i>

            Check Availability

        `;

    }

}


/* =========================================================
   CALCULATE RENTAL DAYS
========================================================= */

function calculateRentalDays(
    pickupDate,
    returnDate
) {

    const start =
        new Date(
            `${pickupDate}T00:00:00`
        );


    const end =
        new Date(
            `${returnDate}T00:00:00`
        );


    const milliseconds =
        end.getTime() -
        start.getTime();


    return (
        Math.floor(
            milliseconds /
            (
                1000 *
                60 *
                60 *
                24
            )
        ) + 1
    );

}


/* =========================================================
   BOOK NOW
========================================================= */

if (
    bookNowBtn
) {

    bookNowBtn.addEventListener(
        "click",
        showBookingForm
    );

}


function showBookingForm() {

    const pickupDate =
        pickupDateInput.value;


    const returnDate =
        returnDateInput.value;


    if (
        !pickupDate ||
        !returnDate
    ) {

        showAvailabilityError(
            "Please select your rental dates first."
        );


        return;

    }


    const totalDays =
        calculateRentalDays(
            pickupDate,
            returnDate
        );


    const totalAmount =
        totalDays *
        currentDailyPrice;


    summaryPickupDate.textContent =
        formatDisplayDate(
            pickupDate
        );


    summaryReturnDate.textContent =
        formatDisplayDate(
            returnDate
        );


    summaryTotalDays.textContent =
        `${totalDays} ${
            totalDays === 1
                ? "day"
                : "days"
        }`;


    summaryTotalAmount.textContent =
        `₹${totalAmount.toLocaleString(
            "en-IN"
        )}`;


    bookingError.classList.add(
        "hidden"
    );


    bookingFormSection.classList.remove(
        "hidden"
    );


    bookingFormSection.scrollIntoView({

        behavior:
            "smooth",

        block:
            "start"

    });

}


/* =========================================================
   CONFIRM BOOKING
========================================================= */

if (
    confirmBookingBtn
) {

    confirmBookingBtn.addEventListener(
        "click",
        confirmBooking
    );

}


async function confirmBooking() {

    /* -----------------------------------------------------
       GET AUTH TOKEN
    ----------------------------------------------------- */

    const token =
        localStorage.getItem(
            "saarthiToken"
        );


    if (
        !token
    ) {

        alert(
            "Please log in before confirming your booking."
        );


        const returnUrl =
            window.location.href;


        window.location.href =
            `auth.html?returnUrl=${encodeURIComponent(
                returnUrl
            )}`;


        return;

    }


    /* -----------------------------------------------------
       GET FORM VALUES
    ----------------------------------------------------- */

    const customerName =
        customerNameInput.value.trim();


    const customerPhone =
        customerPhoneInput.value.trim();


    const customerEmail =
        customerEmailInput.value.trim();


    const driverRequired =
        driverRequiredInput.checked;


    const pickupDate =
        pickupDateInput.value;


    const returnDate =
        returnDateInput.value;


    /* -----------------------------------------------------
       VALIDATE NAME
    ----------------------------------------------------- */

    if (
        !customerName
    ) {

        showBookingError(
            "Please enter your full name."
        );


        customerNameInput.focus();


        return;

    }


    /* -----------------------------------------------------
       VALIDATE PHONE
    ----------------------------------------------------- */

    if (
        !/^[0-9]{10}$/.test(
            customerPhone
        )
    ) {

        showBookingError(
            "Please enter a valid 10-digit mobile number."
        );


        customerPhoneInput.focus();


        return;

    }


    /* -----------------------------------------------------
       VALIDATE EMAIL
    ----------------------------------------------------- */

    if (
        customerEmail &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            customerEmail
        )
    ) {

        showBookingError(
            "Please enter a valid email address."
        );


        customerEmailInput.focus();


        return;

    }


    /* -----------------------------------------------------
       VALIDATE DATES
    ----------------------------------------------------- */

    if (
        !pickupDate ||
        !returnDate
    ) {

        showBookingError(
            "Please select your pickup and return dates."
        );


        return;

    }


    if (
        returnDate <
        pickupDate
    ) {

        showBookingError(
            "Return date cannot be before the pickup date."
        );


        return;

    }


    /* -----------------------------------------------------
       LOADING STATE
    ----------------------------------------------------- */

    confirmBookingBtn.disabled =
        true;


    confirmBookingBtn.innerHTML = `

        <i
            class="fa-solid fa-spinner fa-spin"
        ></i>

        Confirming booking...

    `;


    bookingError.classList.add(
        "hidden"
    );


    try {

        /* -------------------------------------------------
           CREATE BOOKING
        ------------------------------------------------- */

        const response =
            await fetch(
                "/api/bookings",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`

                    },

                    body:
                        JSON.stringify({

                            carId,

                            customerName,

                            customerPhone,

                            customerEmail,

                            pickupDate,

                            returnDate,

                            driverRequired

                        })

                }
            );


        const result =
            await response.json();


        /* -------------------------------------------------
           AUTHENTICATION EXPIRED
        ------------------------------------------------- */

        if (
            response.status ===
            401
        ) {

            localStorage.removeItem(
                "saarthiToken"
            );


            localStorage.removeItem(
                "saarthiUser"
            );


            alert(
                "Your session has expired. Please log in again."
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
                "Unable to create booking."
            );

        }


        /* -------------------------------------------------
           SUCCESS
        ------------------------------------------------- */

        const bookingId =
            result.data?.bookingId;


        if (
            !bookingId
        ) {

            throw new Error(
                "Booking was created but no booking ID was returned."
            );

        }


        window.location.href =
            `booking-success.html?bookingId=${encodeURIComponent(
                bookingId
            )}`;


    } catch (error) {

        console.error(
            "Booking error:",
            error
        );


        showBookingError(
            error.message ||
            "Unable to create booking."
        );


    } finally {

        confirmBookingBtn.disabled =
            false;


        confirmBookingBtn.innerHTML = `

            <i
                class="fa-solid fa-circle-check"
            ></i>

            Confirm Booking

        `;

    }

}


/* =========================================================
   SHOW AVAILABILITY ERROR
========================================================= */

function showAvailabilityError(
    message
) {

    availabilityResult.innerHTML = `

        <div
            class="availability-error"
        >

            <i
                class="fa-solid fa-circle-xmark"
            ></i>

            <span>
                ${escapeHTML(
                    message
                )}
            </span>

        </div>

    `;


    availabilityResult.classList.remove(
        "hidden"
    );


    bookNowBtn.classList.add(
        "hidden"
    );


    bookingFormSection.classList.add(
        "hidden"
    );

}




/* =========================================================
   SHOW BOOKING ERROR
========================================================= */

function showBookingError(
    message
) {

    bookingError.textContent =
        message;


    bookingError.classList.remove(
        "hidden"
    );

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDisplayDate(
    dateString
) {

    const date =
        new Date(
            `${dateString}T00:00:00`
        );


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


/* =========================================================
   START
========================================================= */

loadCar();