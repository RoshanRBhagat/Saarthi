/* =========================================================
   Saarthi Host Form - host-form.js

   Current features:
   - State → City selection is handled by host-location.js
   - Multiple image selection
   - Image previews
   - Add more images without removing previous images
   - Remove individual images
   - Image validation
   - Submit vehicle details + actual image files
     to POST /api/cars
   ========================================================= */


document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       ELEMENTS
    ===================================================== */

    const form =
        document.querySelector(".host-form");

    const imageInput =
        document.getElementById("carImages");

    const imagePreview =
        document.getElementById("imagePreview");


    /* =====================================================
       IMAGE SETTINGS
    ===================================================== */

    const MIN_IMAGES = 3;

    const MAX_IMAGES = 8;

    const MAX_FILE_SIZE =
        5 * 1024 * 1024; // 5 MB


    const ALLOWED_TYPES = [
        "image/jpeg",
        "image/jpg",
        "image/png"
    ];


    /* =====================================================
       SELECTED FILES
    ===================================================== */

    let selectedFiles = [];


    /* =====================================================
       FILE KEY
    ===================================================== */

    function fileKey(file) {

        return [
            file.name,
            file.size,
            file.lastModified
        ].join("|");

    }


    /* =====================================================
       VALIDATE IMAGE
    ===================================================== */

    function isAllowedFile(file) {

        return (
            ALLOWED_TYPES.includes(
                file.type
            ) &&
            file.size <=
                MAX_FILE_SIZE
        );

    }


    /* =====================================================
       SYNC FILE INPUT
    ===================================================== */

    function syncInputFiles() {

        if (!imageInput) {
            return;
        }


        const dataTransfer =
            new DataTransfer();


        selectedFiles.forEach(
            (file) => {

                dataTransfer.items.add(
                    file
                );

            }
        );


        imageInput.files =
            dataTransfer.files;

    }


    /* =====================================================
       RENDER IMAGE PREVIEWS
    ===================================================== */

    function renderPreviews() {

        if (!imagePreview) {
            return;
        }


        imagePreview.innerHTML =
            "";


        selectedFiles.forEach(
            (file, index) => {

                const reader =
                    new FileReader();


                reader.onload =
                    (event) => {

                        const card =
                            document.createElement(
                                "div"
                            );


                        card.className =
                            "preview-card";


                        card.innerHTML = `

                            <div
                                class="preview-image-wrap"
                            >

                                <img
                                    src="${event.target.result}"
                                    alt="Vehicle image ${index + 1}"
                                >

                                <button
                                    type="button"
                                    class="remove-image-btn"
                                    aria-label="Remove image"
                                >

                                    <i
                                        class="fa-solid fa-xmark"
                                    ></i>

                                </button>

                            </div>


                            <span
                                title="${escapeHTML(file.name)}"
                            >

                                ${escapeHTML(file.name)}

                            </span>

                        `;


                        card
                            .querySelector(
                                ".remove-image-btn"
                            )
                            .addEventListener(
                                "click",
                                () => {

                                    selectedFiles.splice(
                                        index,
                                        1
                                    );


                                    syncInputFiles();

                                    renderPreviews();

                                }
                            );


                        imagePreview.appendChild(
                            card
                        );

                    };


                reader.readAsDataURL(
                    file
                );

            }
        );

    }


    /* =====================================================
       IMAGE SELECTION
    ===================================================== */

    if (imageInput) {

        imageInput.addEventListener(
            "change",
            () => {

                const newlySelected =
                    Array.from(
                        imageInput.files
                    );


                for (
                    const file of newlySelected
                ) {


                    /* -------------------------------------
                       File type
                    ------------------------------------- */

                    if (
                        !ALLOWED_TYPES.includes(
                            file.type
                        )
                    ) {

                        alert(
                            `${file.name} is not a supported image type.`
                        );

                        continue;

                    }


                    /* -------------------------------------
                       File size
                    ------------------------------------- */

                    if (
                        file.size >
                        MAX_FILE_SIZE
                    ) {

                        alert(
                            `${file.name} is larger than 5 MB.`
                        );

                        continue;

                    }


                    /* -------------------------------------
                       Duplicate check
                    ------------------------------------- */

                    const duplicate =
                        selectedFiles.some(
                            (existingFile) => {

                                return (
                                    fileKey(
                                        existingFile
                                    ) ===
                                    fileKey(file)
                                );

                            }
                        );


                    if (duplicate) {

                        continue;

                    }


                    /* -------------------------------------
                       Maximum number of images
                    ------------------------------------- */

                    if (
                        selectedFiles.length >=
                        MAX_IMAGES
                    ) {

                        alert(
                            `You can upload a maximum of ${MAX_IMAGES} images.`
                        );

                        break;

                    }


                    /* -------------------------------------
                       Add image
                    ------------------------------------- */

                    selectedFiles.push(
                        file
                    );

                }


                syncInputFiles();

                renderPreviews();

            }
        );

    }


    /* =====================================================
       FORM SUBMISSION
    ===================================================== */

    if (form) {

        form.addEventListener(
            "submit",
            async (event) => {

                /*
                    Stop normal HTML submission.
                */

                event.preventDefault();


                /* =========================================
                   IMAGE VALIDATION
                   ========================================= */

                if (
                    selectedFiles.length <
                    MIN_IMAGES
                ) {

                    alert(
                        `Please upload at least ${MIN_IMAGES} vehicle photos.`
                    );

                    return;

                }


                const invalidFile =
                    selectedFiles.find(
                        (file) =>
                            !isAllowedFile(file)
                    );


                if (invalidFile) {

                    alert(
                        `${invalidFile.name} is not a valid vehicle image.`
                    );

                    return;

                }


                /* =========================================
                   GET FORM VALUES
                   ========================================= */

                const firstName =
                    document
                        .getElementById(
                            "firstName"
                        )
                        .value
                        .trim();


                const lastName =
                    document
                        .getElementById(
                            "lastName"
                        )
                        .value
                        .trim();


                const mobileNumber =
                    document
                        .getElementById(
                            "mobileNumber"
                        )
                        .value
                        .trim();


                const email =
                    document
                        .getElementById(
                            "email"
                        )
                        .value
                        .trim();


                const make =
                    document
                        .getElementById(
                            "carMake"
                        )
                        .value
                        .trim();


                const model =
                    document
                        .getElementById(
                            "carModel"
                        )
                        .value
                        .trim();


                const year =
                    document
                        .getElementById(
                            "carYear"
                        )
                        .value;


                const category =
                    document
                        .getElementById(
                            "carCategory"
                        )
                        .value;


                const seats =
                    document
                        .getElementById(
                            "carSeats"
                        )
                        .value;


                const luggageCapacity =
                    document
                        .getElementById(
                            "luggageCapacity"
                        )
                        .value;


                const fuelType =
                    document
                        .getElementById(
                            "fuelType"
                        )
                        .value;


                const transmission =
                    document
                        .getElementById(
                            "transmission"
                        )
                        .value;


                const dailyPrice =
                    document
                        .getElementById(
                            "dailyPrice"
                        )
                        .value;


                const description =
                    document
                        .getElementById(
                            "carDescription"
                        )
                        .value
                        .trim();


                const city =
                    document
                        .getElementById(
                            "city"
                        )
                        .value;


                const state =
                    document
                        .getElementById(
                            "state"
                        )
                        .value;


                /* =========================================
                   BASIC VALIDATION
                   ========================================= */

                if (!firstName) {

                    alert(
                        "Please enter your first name."
                    );

                    return;

                }


                if (!lastName) {

                    alert(
                        "Please enter your last name."
                    );

                    return;

                }


                if (!mobileNumber) {

                    alert(
                        "Please enter your mobile number."
                    );

                    return;

                }


                if (!email) {

                    alert(
                        "Please enter your email address."
                    );

                    return;

                }


                if (!city) {

                    alert(
                        "Please select a city."
                    );

                    return;

                }


                if (!state) {

                    alert(
                        "Please select a state."
                    );

                    return;

                }


                /* =========================================
                   CREATE FORMDATA
                   ========================================= */

                const formData =
                    new FormData();


                /*
                    Vehicle information
                */

                formData.append(
                    "make",
                    make
                );

                formData.append(
                    "model",
                    model
                );

                formData.append(
                    "year",
                    year
                );

                formData.append(
                    "category",
                    category
                );

                formData.append(
                    "seats",
                    seats
                );

                formData.append(
                    "luggageCapacity",
                    luggageCapacity
                );

                formData.append(
                    "fuelType",
                    fuelType
                );

                formData.append(
                    "transmission",
                    transmission
                );

                formData.append(
                    "city",
                    city
                );

                formData.append(
                    "state",
                    state
                );

                formData.append(
                    "dailyPrice",
                    dailyPrice
                );

                formData.append(
                    "description",
                    description
                );


                /*
                    Host information.

                    We are not storing these in Car.js yet.
                    They are included because the host is the
                    person submitting the vehicle.

                    We will connect this to Host.js later.
                */

                formData.append(
                    "firstName",
                    firstName
                );

                formData.append(
                    "lastName",
                    lastName
                );

                formData.append(
                    "mobileNumber",
                    mobileNumber
                );

                formData.append(
                    "email",
                    email
                );


                /*
                    Actual image files.

                    IMPORTANT:
                    "carImages" must match:

                    upload.array("carImages", 8)

                    in carRoutes.js.
                */

                selectedFiles.forEach(
                    (file) => {

                        formData.append(
                            "carImages",
                            file
                        );

                    }
                );


                /* =========================================
                   SUBMIT BUTTON
                   ========================================= */

                const submitButton =
                    form.querySelector(
                        ".btn-submit"
                    );


                const originalText =
                    submitButton.textContent;


                submitButton.disabled =
                    true;


                submitButton.textContent =
                    "Uploading vehicle...";


                /* =========================================
                   SEND TO BACKEND
                   ========================================= */

                try {

                    const token =
                        localStorage.getItem(
                            "saarthiToken"
                        );


                    if (!token) {

                        alert(
                            "Please log in as a host before registering your car."
                        );

                        window.location.href =
                            "auth.html?returnUrl=/host.html";

                        return;

                    }


                    const response =
                        await fetch(
                            "/api/cars",
                            {

                                method:
                                    "POST",

                                headers: {

                                    "Authorization":
                                        `Bearer ${token}`

                                },

                                body:
                                    formData

                            }
                        );



                    const result =
                        await response.json();


                    /* =====================================
                       BACKEND ERROR
                       ===================================== */

                    if (
                        !response.ok ||
                        !result.success
                    ) {

                        throw new Error(
                            result.message ||
                            "Unable to register vehicle."
                        );

                    }


                    /* =====================================
                       SUCCESS
                       ===================================== */

                    alert(
                        `Car registered successfully!\n\nCar ID: ${result.data.carId}`
                    );


                    console.log(
                        "Registered Saarthi car:",
                        result.data
                    );


                    /* =====================================
                       RESET FORM
                       ===================================== */

                    form.reset();


                    selectedFiles =
                        [];


                    syncInputFiles();

                    renderPreviews();


                } catch (error) {

                    console.error(
                        "Car registration error:",
                        error
                    );


                    alert(
                        error.message
                    );

                } finally {

                    submitButton.disabled =
                        false;


                    submitButton.textContent =
                        originalText;

                }

            }
        );

    }


    /* =====================================================
       ESCAPE HTML
       ===================================================== */

    function escapeHTML(value) {

        return String(value)

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

});