/* =========================================================
   SAARTHI AI DAMAGE DETECTION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {


        /* =================================================
           DOM
        ================================================= */

        const beforeInput =
            document.getElementById(
                "beforeImage"
            );

        const afterInput =
            document.getElementById(
                "afterImage"
            );


        const beforePreview =
            document.getElementById(
                "beforePreview"
            );

        const afterPreview =
            document.getElementById(
                "afterPreview"
            );


        const beforePlaceholder =
            document.getElementById(
                "beforePlaceholder"
            );

        const afterPlaceholder =
            document.getElementById(
                "afterPlaceholder"
            );


        const removeBeforeBtn =
            document.getElementById(
                "removeBeforeBtn"
            );

        const removeAfterBtn =
            document.getElementById(
                "removeAfterBtn"
            );


        const analyzeBtn =
            document.getElementById(
                "analyzeDamageBtn"
            );


        const damageError =
            document.getElementById(
                "damageError"
            );


        const damageResults =
            document.getElementById(
                "damageResults"
            );


        const inspectionTime =
            document.getElementById(
                "inspectionTime"
            );


        let beforeDataUrl = "";
        let afterDataUrl = "";


        const MAX_FILE_SIZE =
            5 * 1024 * 1024;


        const ALLOWED_TYPES = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp"
        ];


        /* =================================================
           HELPERS
        ================================================= */

        function showError(message) {

            damageError.textContent =
                message;

            damageError.classList.remove(
                "hidden"
            );
        }


        function clearError() {

            damageError.textContent = "";

            damageError.classList.add(
                "hidden"
            );
        }


        function setButtonLoading(
            loading
        ) {

            if (loading) {

                analyzeBtn.dataset.originalHTML =
                    analyzeBtn.innerHTML;

                analyzeBtn.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    AI is analyzing photos...
                `;

                analyzeBtn.disabled = true;

            } else {

                analyzeBtn.innerHTML =
                    analyzeBtn.dataset.originalHTML ||
                    `
                    <i class="fa-solid fa-wand-magic-sparkles"></i>
                    Analyze Vehicle Damage
                    `;

                analyzeBtn.disabled = false;
            }
        }


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


        function formatConfidence(
            value
        ) {

            const number =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Number(value) || 0
                    )
                );

            return `${Math.round(number)}%`;
        }


        function getSeverityIcon(
            severity
        ) {

            switch (
                String(
                    severity || ""
                ).toLowerCase()
            ) {

                case "severe":
                    return "fa-triangle-exclamation";

                case "moderate":
                    return "fa-circle-exclamation";

                case "minor":
                    return "fa-screwdriver-wrench";

                default:
                    return "fa-circle-info";
            }
        }


        /* =================================================
           IMAGE PROCESSING
        ================================================= */

        function validateFile(file) {

            if (!file) {

                throw new Error(
                    "Please choose an image."
                );
            }


            if (
                !ALLOWED_TYPES.includes(
                    file.type
                )
            ) {

                throw new Error(
                    "Only JPG, PNG or WebP images are supported."
                );
            }


            if (
                file.size >
                MAX_FILE_SIZE
            ) {

                throw new Error(
                    "Each image must be 5 MB or smaller."
                );
            }
        }


        function compressImage(
            file
        ) {

            return new Promise(
                (
                    resolve,
                    reject
                ) => {

                    const reader =
                        new FileReader();


                    reader.onload =
                        event => {

                            const image =
                                new Image();


                            image.onload =
                                () => {

                                    const MAX_DIMENSION =
                                        1600;


                                    let width =
                                        image.width;

                                    let height =
                                        image.height;


                                    if (
                                        width >
                                        MAX_DIMENSION ||
                                        height >
                                        MAX_DIMENSION
                                    ) {

                                        if (
                                            width >
                                            height
                                        ) {

                                            height =
                                                Math.round(
                                                    height *
                                                    MAX_DIMENSION /
                                                    width
                                                );

                                            width =
                                                MAX_DIMENSION;

                                        } else {

                                            width =
                                                Math.round(
                                                    width *
                                                    MAX_DIMENSION /
                                                    height
                                                );

                                            height =
                                                MAX_DIMENSION;
                                        }
                                    }


                                    const canvas =
                                        document.createElement(
                                            "canvas"
                                        );


                                    canvas.width =
                                        width;

                                    canvas.height =
                                        height;


                                    const ctx =
                                        canvas.getContext(
                                            "2d"
                                        );


                                    ctx.drawImage(
                                        image,
                                        0,
                                        0,
                                        width,
                                        height
                                    );


                                    resolve(
                                        canvas.toDataURL(
                                            "image/jpeg",
                                            0.82
                                        )
                                    );
                                };


                            image.onerror =
                                () => {

                                    reject(
                                        new Error(
                                            "Unable to read the image."
                                        )
                                    );
                                };


                            image.src =
                                event.target.result;
                        };


                    reader.onerror =
                        () => {

                            reject(
                                new Error(
                                    "Unable to read the selected image."
                                )
                            );
                        };


                    reader.readAsDataURL(
                        file
                    );

                }
            );
        }


        /* =================================================
           PREVIEW
        ================================================= */

        async function handleImage(
            file,
            type
        ) {

            try {

                validateFile(file);


                const compressed =
                    await compressImage(
                        file
                    );


                if (
                    type === "before"
                ) {

                    beforeDataUrl =
                        compressed;

                    beforePreview.src =
                        compressed;

                    beforePreview.classList.remove(
                        "hidden"
                    );

                    beforePlaceholder.classList.add(
                        "hidden"
                    );

                    removeBeforeBtn.classList.remove(
                        "hidden"
                    );

                } else {

                    afterDataUrl =
                        compressed;

                    afterPreview.src =
                        compressed;

                    afterPreview.classList.remove(
                        "hidden"
                    );

                    afterPlaceholder.classList.add(
                        "hidden"
                    );

                    removeAfterBtn.classList.remove(
                        "hidden"
                    );
                }


                clearError();


            } catch (error) {

                showError(
                    error.message
                );
            }
        }


        /* =================================================
           FILE INPUTS
        ================================================= */

        beforeInput.addEventListener(
            "change",
            () => {

                const file =
                    beforeInput.files?.[0];

                if (file) {

                    handleImage(
                        file,
                        "before"
                    );
                }
            }
        );


        afterInput.addEventListener(
            "change",
            () => {

                const file =
                    afterInput.files?.[0];

                if (file) {

                    handleImage(
                        file,
                        "after"
                    );
                }
            }
        );


        /* =================================================
           REMOVE IMAGES
        ================================================= */

        removeBeforeBtn.addEventListener(
            "click",
            () => {

                beforeDataUrl = "";

                beforeInput.value = "";

                beforePreview.src = "";

                beforePreview.classList.add(
                    "hidden"
                );

                beforePlaceholder.classList.remove(
                    "hidden"
                );

                removeBeforeBtn.classList.add(
                    "hidden"
                );
            }
        );


        removeAfterBtn.addEventListener(
            "click",
            () => {

                afterDataUrl = "";

                afterInput.value = "";

                afterPreview.src = "";

                afterPreview.classList.add(
                    "hidden"
                );

                afterPlaceholder.classList.remove(
                    "hidden"
                );

                removeAfterBtn.classList.add(
                    "hidden"
                );
            }
        );


        /* =================================================
           RENDER OVERALL
        ================================================= */

        function renderOverall(
            assessment
        ) {

            const damageDetected =
                assessment?.damageDetected === true;


            const severity =
                String(
                    assessment?.severity ||
                    "none"
                );


            const icon =
                document.getElementById(
                    "overallIcon"
                );


            const heading =
                document.getElementById(
                    "overallSeverity"
                );


            const confidence =
                document.getElementById(
                    "overallConfidence"
                );


            const summary =
                document.getElementById(
                    "overallSummary"
                );


            if (damageDetected) {

                icon.innerHTML = `
                    <i class="fa-solid fa-triangle-exclamation"></i>
                `;

                icon.style.background =
                    "#fff1f2";

                icon.style.color =
                    "#b73e49";

            } else {

                icon.innerHTML = `
                    <i class="fa-solid fa-shield-check"></i>
                `;

                icon.style.background =
                    "#edf8f1";

                icon.style.color =
                    "#278555";
            }


            heading.textContent =
                damageDetected
                    ? `${severity.charAt(0).toUpperCase()}${severity.slice(1)} damage detected`
                    : "No new damage reliably detected";


            confidence.textContent =
                formatConfidence(
                    assessment?.confidence
                );


            summary.textContent =
                assessment?.summary ||
                "No overall summary was returned.";
        }


        /* =================================================
           VEHICLE MATCH
        ================================================= */

        function renderVehicleMatch(
            match
        ) {

            const status =
                document.getElementById(
                    "vehicleMatchStatus"
                );


            const confidence =
                document.getElementById(
                    "vehicleMatchConfidence"
                );


            const reason =
                document.getElementById(
                    "vehicleMatchReason"
                );


            const sameVehicle =
                match?.sameVehicleLikely === true;


            status.textContent =
                sameVehicle
                    ? "Same vehicle likely"
                    : "Vehicle match uncertain";


            confidence.textContent =
                formatConfidence(
                    match?.confidence
                );


            reason.textContent =
                match?.reason ||
                "No vehicle-match explanation was returned.";
        }


        /* =================================================
           CONDITIONS
        ================================================= */

        function renderConditions(
            beforeCondition,
            afterCondition
        ) {

            document.getElementById(
                "beforeCondition"
            ).textContent =
                beforeCondition?.summary ||
                "No before-condition summary returned.";


            document.getElementById(
                "afterCondition"
            ).textContent =
                afterCondition?.summary ||
                "No after-condition summary returned.";


            const issues =
                Array.isArray(
                    beforeCondition?.visibleExistingIssues
                )
                    ? beforeCondition.visibleExistingIssues
                    : [];


            const wrapper =
                document.getElementById(
                    "existingIssuesWrap"
                );


            const list =
                document.getElementById(
                    "existingIssues"
                );


            if (!issues.length) {

                wrapper.classList.add(
                    "hidden"
                );

                list.innerHTML = "";

                return;
            }


            wrapper.classList.remove(
                "hidden"
            );


            list.innerHTML =
                issues
                    .map(
                        issue =>
                            `<li>${escapeHTML(issue)}</li>`
                    )
                    .join("");
        }


        /* =================================================
           CHANGES
        ================================================= */

        function renderChanges(
            changes
        ) {

            const list =
                document.getElementById(
                    "changesList"
                );


            const count =
                document.getElementById(
                    "damageCount"
                );


            const validChanges =
                Array.isArray(changes)
                    ? changes.filter(
                        change =>
                            change &&
                            change.newDamageLikely !== false
                    )
                    : [];


            count.textContent =
                `${validChanges.length} ${
                    validChanges.length === 1
                        ? "change"
                        : "changes"
                }`;


            if (!validChanges.length) {

                list.innerHTML = `
                    <div class="no-damage">

                        <i class="fa-solid fa-circle-check"></i>

                        <h3>
                            No reliable new damage found
                        </h3>

                        <p>
                            Saarthi AI did not identify a
                            reliable new visible change between
                            the two images.
                        </p>

                    </div>
                `;

                return;
            }


            list.innerHTML =
                validChanges
                    .map(
                        change => {

                            const severity =
                                String(
                                    change.severity ||
                                    "minor"
                                );


                            return `
                                <article class="change-item">

                                    <div class="change-item-top">

                                        <div class="change-main">

                                            <div class="change-icon">

                                                <i class="fa-solid ${getSeverityIcon(
                                                    severity
                                                )}"></i>

                                            </div>

                                            <div>

                                                <strong>
                                                    ${escapeHTML(
                                                        change.area ||
                                                        "Vehicle area"
                                                    )}
                                                </strong>

                                                <div class="change-type">
                                                    ${escapeHTML(
                                                        change.type ||
                                                        "Visible change"
                                                    )}
                                                </div>

                                            </div>

                                        </div>


                                        <span class="severity-badge">

                                            ${escapeHTML(
                                                severity
                                            )}

                                        </span>

                                    </div>


                                    <p class="change-description">

                                        ${escapeHTML(
                                            change.description ||
                                            "Visible change detected."
                                        )}

                                    </p>


                                    <div class="change-meta">

                                        <span>
                                            Confidence:
                                            ${formatConfidence(
                                                change.confidence
                                            )}
                                        </span>

                                        <span>
                                            New damage likely:
                                            ${
                                                change.newDamageLikely === true
                                                    ? "Yes"
                                                    : "Uncertain"
                                            }
                                        </span>

                                    </div>

                                </article>
                            `;
                        }
                    )
                    .join("");
        }


        /* =================================================
           LIMITATIONS
        ================================================= */

        function renderLimitations(
            limitations
        ) {

            const card =
                document.getElementById(
                    "limitationsCard"
                );


            const list =
                document.getElementById(
                    "limitationsList"
                );


            const items =
                Array.isArray(limitations)
                    ? limitations.filter(Boolean)
                    : [];


            if (!items.length) {

                card.classList.add(
                    "hidden"
                );

                list.innerHTML = "";

                return;
            }


            card.classList.remove(
                "hidden"
            );


            list.innerHTML =
                items
                    .map(
                        item =>
                            `<li>${escapeHTML(item)}</li>`
                    )
                    .join("");
        }


        /* =================================================
           RENDER COMPLETE REPORT
        ================================================= */

        function renderReport(
            analysis
        ) {

            renderOverall(
                analysis?.overallAssessment
            );


            renderVehicleMatch(
                analysis?.vehicleMatch
            );


            renderConditions(
                analysis?.beforeCondition,
                analysis?.afterCondition
            );


            renderChanges(
                analysis?.changes
            );


            renderLimitations(
                analysis?.limitations
            );


            document.getElementById(
                "recommendedAction"
            ).textContent =
                analysis?.recommendedAction ||
                "No specific action was returned.";


            const now =
                new Date();


            inspectionTime.textContent =
                `Inspected ${now.toLocaleString(
                    "en-IN"
                )}`;


            damageResults.classList.remove(
                "hidden"
            );


            damageResults.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }


        /* =================================================
           ANALYZE
        ================================================= */

        analyzeBtn.addEventListener(
            "click",
            async () => {

                clearError();


                if (!beforeDataUrl) {

                    showError(
                        "Please upload the before-rental vehicle photo."
                    );

                    return;
                }


                if (!afterDataUrl) {

                    showError(
                        "Please upload the after-rental vehicle photo."
                    );

                    return;
                }


                setButtonLoading(
                    true
                );


                damageResults.classList.add(
                    "hidden"
                );


                try {

                    const response =
                        await fetch(
                            "/api/damage-detection/analyze",
                            {

                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify({

                                        beforeImage:
                                            beforeDataUrl,

                                        afterImage:
                                            afterDataUrl
                                    })
                            }
                        );


                    let result;


                    try {

                        result =
                            await response.json();

                    } catch (error) {

                        throw new Error(
                            "The damage detection server returned an invalid response."
                        );
                    }


                    if (
                        !response.ok ||
                        !result.success
                    ) {

                        throw new Error(
                            result.message ||
                            "Unable to analyze vehicle damage."
                        );
                    }


                    renderReport(
                        result.analysis
                    );


                } catch (error) {

                    console.error(
                        "Damage detection error:",
                        error
                    );


                    showError(
                        error.message ||
                        "Unable to analyze the vehicle right now."
                    );

                } finally {

                    setButtonLoading(
                        false
                    );
                }
            }
        );

    }
);