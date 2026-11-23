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

    // Authenticate before the host starts entering a listing. Redirecting only
    // after submit discarded the form fields and selected photo files.
    if (!localStorage.getItem("saarthiToken")) {
        window.location.replace("auth.html?returnUrl=%2Fhost.html");
        return;
    }

    let signedInUser = null;
    try {
        signedInUser = JSON.parse(localStorage.getItem("saarthiUser") || "null");
    } catch {
        localStorage.removeItem("saarthiUser");
    }

    if (signedInUser?.role !== "host") {
        if (form) {
            form.hidden = true;
            const notice = document.createElement("section");
            notice.className = "host-role-notice";
            notice.setAttribute("role", "alert");

            const heading = document.createElement("h2");
            heading.textContent = "A host account is required";
            const message = document.createElement("p");
            message.textContent = "Your current account cannot list vehicles. Sign out and choose the Host role when creating a host account.";
            const signOut = document.createElement("button");
            signOut.type = "button";
            signOut.textContent = "Sign out and continue";
            signOut.addEventListener("click", () => {
                localStorage.removeItem("saarthiToken");
                localStorage.removeItem("saarthiUser");
                window.location.href = "auth.html?mode=register&role=host&returnUrl=%2Fhost.html";
            });

            notice.append(heading, message, signOut);
            form.before(notice);
        }
        return;
    }

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

                const handoverInstructions =
                    document
                        .getElementById("handoverInstructions")
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

                formData.append(
                    "handoverInstructions",
                    handoverInstructions
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
