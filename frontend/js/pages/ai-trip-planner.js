/* =========================================================
   SAARTHI AI TRIP PLANNER
   Frontend -> /api/ai-trip/plan
   Gemini-powered itinerary + live Saarthi vehicle inventory
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =========================================================
       DOM
    ========================================================= */

    const promptInput = document.getElementById("tripPrompt");
    const originInput = document.getElementById("origin");
    const destinationInput = document.getElementById("destination");
    const startDateInput = document.getElementById("startDate");
    const endDateInput = document.getElementById("endDate");
    const travelersInput = document.getElementById("travelers");
    const budgetInput = document.getElementById("budget");

    const generateBtn =
        document.getElementById("generateTripBtn");

    const resultsSection =
        document.getElementById("resultsSection");

    const selectedCount =
        document.getElementById("selectedCount");

    const tripTitle =
        document.getElementById("tripTitle");

    const tripSummary =
        document.getElementById("tripSummary");

    const durationStat =
        document.getElementById("durationStat");

    const travelersStat =
        document.getElementById("travelersStat");

    const estimatedStat =
        document.getElementById("estimatedStat");

    const itineraryList =
        document.getElementById("itineraryList");

    const recommendedCar =
        document.getElementById("recommendedCar");

    const carPrice =
        document.getElementById("carPrice");

    const rentalCost =
        document.getElementById("rentalCost");

    const fuelCost =
        document.getElementById("fuelCost");

    const tollCost =
        document.getElementById("tollCost");

    const activityCost =
        document.getElementById("activityCost");

    const totalCost =
        document.getElementById("totalCost");

    const budgetStatus =
        document.getElementById("budgetStatus");

    const editPlanBtn =
        document.getElementById("editPlanBtn");

    const modifyInput =
        document.getElementById("modifyInput");

    const modifyTripBtn =
        document.getElementById("modifyTripBtn");

    const toast =
        document.getElementById("toast");

    const toastMessage =
        document.getElementById("toastMessage");

    const viewCarBtn =
        document.getElementById("viewRecommendedCarBtn") ||
        document.querySelector(
            ".recommendation-card .secondary-btn"
        );

    const continueCarsBtn =
        document.getElementById("continueToCarsBtn") ||
        document.querySelector(".book-car-btn");

    const offerBtn =
        document.querySelector(".offer-card button");

    let selectedPreferences = [];
    let currentPlan = null;


    /* =========================================================
       HELPERS
    ========================================================= */

    function formatCurrency(amount) {
        return `₹${Math.round(
            Number(amount) || 0
        ).toLocaleString("en-IN")}`;
    }


    function formatDateForInput(date) {

        const year = date.getFullYear();

        const month = String(
            date.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            date.getDate()
        ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }


    function getTodayDateString() {
        return formatDateForInput(new Date());
    }


    function calculateDuration() {

        if (
            !startDateInput.value ||
            !endDateInput.value
        ) {
            return 0;
        }

        const start = new Date(
            `${startDateInput.value}T00:00:00`
        );

        const end = new Date(
            `${endDateInput.value}T00:00:00`
        );

        if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime())
        ) {
            return 0;
        }

        const days =
            Math.floor(
                (
                    end.getTime() -
                    start.getTime()
                ) /
                (1000 * 60 * 60 * 24)
            ) + 1;

        return Math.max(1, days);
    }


    function getSelectedPreferencesText() {

        return selectedPreferences.length
            ? selectedPreferences.join(" + ")
            : "Balanced";
    }


    function showToast(message) {

        if (!toast || !toastMessage) {
            return;
        }

        toastMessage.textContent = message;

        toast.classList.remove("hidden");

        window.clearTimeout(showToast.timer);

        showToast.timer = window.setTimeout(() => {
            toast.classList.add("hidden");
        }, 3500);
    }


    function setButtonLoading(button, text) {

        if (!button) {
            return;
        }

        button.dataset.originalHTML =
            button.innerHTML;

        button.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            ${escapeHTML(text)}
        `;

        button.disabled = true;
    }


    function resetButton(button) {

        if (!button) {
            return;
        }

        button.innerHTML =
            button.dataset.originalHTML ||
            button.innerHTML;

        button.disabled = false;
    }


    function setDefaultDates() {

        startDateInput.min =
            getTodayDateString();

        endDateInput.min =
            getTodayDateString();

        if (
            startDateInput.value &&
            endDateInput.value
        ) {
            return;
        }

        const today = new Date();

        const start = new Date(today);

        start.setDate(
            start.getDate() + 7
        );

        const end = new Date(start);

        end.setDate(
            end.getDate() + 2
        );

        startDateInput.value =
            formatDateForInput(start);

        endDateInput.value =
            formatDateForInput(end);
    }


    /* =========================================================
       FORM VALIDATION
    ========================================================= */

    function validateForm() {

        const origin =
            originInput.value.trim();

        const destination =
            destinationInput.value.trim();

        const startDate =
            startDateInput.value;

        const endDate =
            endDateInput.value;

        const travelers =
            Number(travelersInput.value);

        const budget =
            Number(budgetInput.value);

        if (!origin) {

            originInput.focus();

            showToast(
                "Please enter your starting location."
            );

            return false;
        }

        if (!destination) {

            destinationInput.focus();

            showToast(
                "Please enter a destination."
            );

            return false;
        }

        if (!startDate || !endDate) {

            showToast(
                "Please select your trip dates."
            );

            return false;
        }

        if (
            startDate <
            getTodayDateString()
        ) {

            startDateInput.focus();

            showToast(
                "Trip start date cannot be in the past."
            );

            return false;
        }

        if (endDate < startDate) {

            endDateInput.focus();

            showToast(
                "End date must be on or after the start date."
            );

            return false;
        }

        if (!travelers || travelers < 1) {

            travelersInput.focus();

            showToast(
                "Please select the number of travelers."
            );

            return false;
        }

        if (!budget || budget < 1000) {

            budgetInput.focus();

            showToast(
                "Please enter a valid trip budget."
            );

            return false;
        }

        return true;
    }


    /* =========================================================
       PREFERENCE PILLS
    ========================================================= */

    document
        .querySelectorAll(".preference-pill")
        .forEach(pill => {

            pill.addEventListener("click", () => {

                const preference =
                    pill.dataset.preference;

                if (!preference) {
                    return;
                }

                if (
                    selectedPreferences.includes(
                        preference
                    )
                ) {

                    selectedPreferences =
                        selectedPreferences.filter(
                            item =>
                                item !== preference
                        );

                    pill.classList.remove(
                        "selected"
                    );

                } else {

                    selectedPreferences.push(
                        preference
                    );

                    pill.classList.add(
                        "selected"
                    );
                }

                if (selectedCount) {

                    selectedCount.textContent =
                        `${selectedPreferences.length} selected`;
                }
            });
        });


    /* =========================================================
       PROMPT CHIPS
    ========================================================= */

    document
        .querySelectorAll(".prompt-chip")
        .forEach(chip => {

            chip.addEventListener("click", () => {

                promptInput.value =
                    chip.dataset.prompt || "";

            });
        });


    /* =========================================================
       BACKEND API
    ========================================================= */

    async function requestTripPlan({
        modification = "",
        previousPlan = null
    } = {}) {

        const payload = {

            prompt:
                promptInput.value.trim(),

            origin:
                originInput.value.trim(),

            destination:
                destinationInput.value.trim(),

            startDate:
                startDateInput.value,

            endDate:
                endDateInput.value,

            travelers:
                Number(
                    travelersInput.value
                ) || 0,

            budget:
                Number(
                    budgetInput.value
                ) || 0,

            preferences:
                selectedPreferences,

            modification,

            previousPlan
        };

        const response =
            await fetch(
                "/api/ai-trip/plan",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(payload)
                }
            );

        let result;

        try {

            result =
                await response.json();

        } catch (error) {

            throw new Error(
                "The AI planner returned an invalid server response."
            );
        }

        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Unable to generate the trip plan."
            );
        }

        return result;
    }


    /* =========================================================
       NEEDS MORE INFO
    ========================================================= */

    function handleNeedsInfo(result) {

        const questions =
            Array.isArray(
                result.followUpQuestions
            )
                ? result.followUpQuestions
                : [];

        if (!questions.length) {

            showToast(
                "A little more trip information is required."
            );

            return;
        }

        showToast(
            questions.join(" ")
        );

        promptInput.value =
            questions.join(" ");

        promptInput.focus();
    }


    /* =========================================================
       RENDER PLAN
    ========================================================= */

    function renderPlan(result) {

        const plan =
            result.plan;

        if (!plan) {

            throw new Error(
                "The AI planner returned no trip plan."
            );
        }

        currentPlan = plan;

        const trip =
            plan.trip || {};

        const vehicle =
            plan.vehicleRecommendation || {};

        const costs =
            plan.estimatedBudget || {};

        const interests =
            Array.isArray(trip.interests) &&
            trip.interests.length
                ? trip.interests.join(" + ")
                : getSelectedPreferencesText();


        /* -------------------------
           TITLE
        ------------------------- */

        tripTitle.textContent =
            plan.title ||
            `${trip.origin || ""} → ${trip.destination || ""}`;


        /* -------------------------
           SUMMARY
        ------------------------- */

        tripSummary.textContent =
            plan.summary ||
            `${trip.durationDays || calculateDuration()} days • ` +
            `${trip.travelers || travelersInput.value} travelers • ` +
            `${interests}`;


        /* -------------------------
           STATS
        ------------------------- */

        const duration =
            Number(
                trip.durationDays ||
                calculateDuration()
            );

        const travelers =
            Number(
                trip.travelers ||
                travelersInput.value
            );

        durationStat.textContent =
            `${duration} ${
                duration === 1
                    ? "day"
                    : "days"
            }`;

        travelersStat.textContent =
            `${travelers} ${
                travelers === 1
                    ? "traveler"
                    : "travelers"
            }`;

        estimatedStat.textContent =
            formatCurrency(
                costs.estimatedTotal
            );


        /* -------------------------
           VEHICLE
        ------------------------- */

        if (
            vehicle.carId &&
            vehicle.name
        ) {

            recommendedCar.textContent =
                vehicle.name;

            carPrice.textContent =
                `${formatCurrency(
                    vehicle.dailyPrice
                )}/day`;

        } else {

            recommendedCar.textContent =
                "No matching car found";

            carPrice.textContent =
                "No live match";
        }


        /* -------------------------
           COSTS
        ------------------------- */

        rentalCost.textContent =
            formatCurrency(
                costs.carRental
            );

        fuelCost.textContent =
            formatCurrency(
                costs.fuel
            );

        tollCost.textContent =
            formatCurrency(
                costs.tolls
            );


        const combinedActivities =
            Number(costs.food || 0) +
            Number(costs.activities || 0) +
            Number(costs.misc || 0);

        activityCost.textContent =
            formatCurrency(
                combinedActivities
            );

        totalCost.textContent =
            formatCurrency(
                costs.estimatedTotal
            );


        /* -------------------------
           ITINERARY
        ------------------------- */

        renderItinerary(
            plan.itinerary || []
        );


        /* -------------------------
           BUDGET
        ------------------------- */

        updateBudgetStatus(
            costs.estimatedTotal,
            costs.totalBudget,
            costs.budgetProvided
        );


        /* -------------------------
           SHOW RESULTS
        ------------------------- */

        if (resultsSection) {

            resultsSection.classList.remove(
                "hidden"
            );

            resultsSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }


        /* -------------------------
           STATUS MESSAGE
        ------------------------- */

        if (
            vehicle.carId &&
            vehicle.availabilityChecked === true
        ) {

            showToast(
                "AI plan generated with a live available Saarthi vehicle."
            );

        } else if (vehicle.carId) {

            showToast(
                "AI plan generated with a vehicle recommendation."
            );

        } else {

            showToast(
                "AI plan generated. No matching Saarthi vehicle was found."
            );
        }
    }


    /* =========================================================
       ITINERARY
    ========================================================= */

    function renderItinerary(days) {

        itineraryList.innerHTML = "";

        if (!days.length) {

            itineraryList.innerHTML = `
                <div class="empty-state">
                    No itinerary details were returned.
                </div>
            `;

            return;
        }

        days.forEach(day => {

            const dayElement =
                document.createElement("article");

            dayElement.className =
                "itinerary-day";


            /* DAY LABEL */

            const label =
                document.createElement("div");

            label.className =
                "day-label";

            label.innerHTML = `
                <div class="day-number">
                    ${escapeHTML(day.day)}
                </div>
                Day
            `;


            /* DAY CONTENT */

            const content =
                document.createElement("div");

            content.className =
                "day-content";

            content.innerHTML = `
                <h4>
                    ${escapeHTML(
                        day.title ||
                        `Day ${day.day}`
                    )}
                </h4>

                <p>
                    ${escapeHTML(
                        [
                            day.date,
                            day.area
                        ]
                            .filter(Boolean)
                            .join(" • ")
                    )}
                </p>

                <p>
                    ${escapeHTML(
                        day.travelNote || ""
                    )}
                </p>
            `;


            /* ACTIVITIES */

            const activities =
                Array.isArray(
                    day.activities
                )
                    ? day.activities
                    : [];

            activities.forEach(activity => {

                const timeline =
                    document.createElement("div");

                timeline.className =
                    "timeline-item";

                const estimatedCost =
                    Number(
                        activity.estimatedCost
                    ) || 0;

                const cost =
                    estimatedCost > 0
                        ? ` • ${formatCurrency(
                            estimatedCost
                        )}`
                        : "";

                timeline.innerHTML = `
                    <div class="timeline-time">
                        ${escapeHTML(
                            activity.time || ""
                        )}
                    </div>

                    <div class="timeline-text">

                        <strong>
                            ${escapeHTML(
                                activity.name ||
                                "Activity"
                            )}
                        </strong>

                        <span>
                            ${escapeHTML(
                                activity.description ||
                                ""
                            )}
                            ${escapeHTML(cost)}
                        </span>

                    </div>
                `;

                content.appendChild(
                    timeline
                );
            });


            dayElement.appendChild(label);

            dayElement.appendChild(content);

            itineraryList.appendChild(
                dayElement
            );
        });
    }


    /* =========================================================
       BUDGET STATUS
    ========================================================= */

    function updateBudgetStatus(
        total,
        budget,
        budgetProvided
    ) {

        if (
            !budgetProvided ||
            !Number(budget)
        ) {

            budgetStatus.classList.remove(
                "over"
            );

            budgetStatus.innerHTML = `
                <i class="fa-solid fa-circle-info"></i>
                Budget was not provided.
                This is an estimated trip cost.
            `;

            return;
        }

        const difference =
            Math.abs(
                Number(total) -
                Number(budget)
            );

        if (
            Number(total) <=
            Number(budget)
        ) {

            budgetStatus.classList.remove(
                "over"
            );

            budgetStatus.innerHTML = `
                <i class="fa-solid fa-circle-check"></i>
                You are ${formatCurrency(
                    difference
                )} under your budget.
            `;

        } else {

            budgetStatus.classList.add(
                "over"
            );

            budgetStatus.innerHTML = `
                <i class="fa-solid fa-triangle-exclamation"></i>
                This plan is ${formatCurrency(
                    difference
                )} over budget.
            `;
        }
    }


    /* =========================================================
       GENERATE PLAN
    ========================================================= */

    if (generateBtn) {

        generateBtn.addEventListener(
            "click",
            async () => {

                if (!validateForm()) {
                    return;
                }

                setButtonLoading(
                    generateBtn,
                    "Saarthi AI is planning..."
                );

                try {

                    const result =
                        await requestTripPlan();

                    if (
                        result.status ===
                        "needs_info"
                    ) {

                        handleNeedsInfo(
                            result
                        );

                        return;
                    }

                    renderPlan(
                        result
                    );

                } catch (error) {

                    console.error(
                        "AI trip planner error:",
                        error
                    );

                    showToast(
                        error.message ||
                        "Unable to generate your trip right now."
                    );

                } finally {

                    resetButton(
                        generateBtn
                    );
                }
            }
        );
    }


    /* =========================================================
       VIEW RECOMMENDED CAR
    ========================================================= */

    if (viewCarBtn) {

        viewCarBtn.addEventListener(
            "click",
            () => {

                const carId =
                    currentPlan
                        ?.vehicleRecommendation
                        ?.carId;

                if (!carId) {

                    showToast(
                        "No recommended Saarthi car is available."
                    );

                    return;
                }

                window.location.href =
                    `car-details.html?carId=${encodeURIComponent(
                        carId
                    )}`;
            }
        );
    }


    /* =========================================================
       CONTINUE TO CARS
    ========================================================= */

    if (continueCarsBtn) {

        continueCarsBtn.addEventListener(
            "click",
            () => {

                const params =
                    new URLSearchParams();

                const origin =
                    originInput.value.trim();

                if (origin) {

                    params.set(
                        "city",
                        origin
                            .split(",")[0]
                            .trim()
                    );
                }

                if (startDateInput.value) {

                    params.set(
                        "startDate",
                        startDateInput.value
                    );
                }

                if (endDateInput.value) {

                    params.set(
                        "endDate",
                        endDateInput.value
                    );
                }

                if (travelersInput.value) {

                    params.set(
                        "travelers",
                        travelersInput.value
                    );
                }

                if (
                    promptInput.value.trim()
                ) {

                    params.set(
                        "tripVibe",
                        promptInput.value.trim()
                    );
                }

                window.location.href =
                    `cars.html?${params.toString()}`;
            }
        );
    }


    /* =========================================================
       WEEKEND10 OFFER
    ========================================================= */

    if (offerBtn) {

        offerBtn.addEventListener(
            "click",
            () => {

                if (!currentPlan) {

                    showToast(
                        "Generate a trip before applying the offer."
                    );

                    return;
                }

                if (
                    currentPlan.couponApplied
                ) {

                    showToast(
                        "WEEKEND10 is already applied."
                    );

                    return;
                }

                const rental =
                    Number(
                        currentPlan
                            ?.estimatedBudget
                            ?.carRental
                    ) || 0;

                const discount =
                    Math.round(
                        rental * 0.10
                    );

                if (!discount) {

                    showToast(
                        "No eligible rental amount is available for this offer."
                    );

                    return;
                }

                currentPlan.couponApplied =
                    true;

                const discountedRental =
                    rental - discount;

                const originalTotal =
                    Number(
                        currentPlan
                            ?.estimatedBudget
                            ?.estimatedTotal
                    ) || 0;

                const discountedTotal =
                    originalTotal - discount;

                rentalCost.textContent =
                    formatCurrency(
                        discountedRental
                    );

                totalCost.textContent =
                    formatCurrency(
                        discountedTotal
                    );

                estimatedStat.textContent =
                    formatCurrency(
                        discountedTotal
                    );

                updateBudgetStatus(
                    discountedTotal,
                    currentPlan
                        ?.estimatedBudget
                        ?.totalBudget,
                    currentPlan
                        ?.estimatedBudget
                        ?.budgetProvided
                );

                showToast(
                    `WEEKEND10 applied. You saved ${formatCurrency(
                        discount
                    )}.`
                );
            }
        );
    }


    /* =========================================================
       EDIT PLAN
    ========================================================= */

    if (editPlanBtn) {

        editPlanBtn.addEventListener(
            "click",
            () => {

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

                promptInput.focus();
            }
        );
    }


    /* =========================================================
       MODIFY PLAN
       Calls Gemini again with previous plan.
    ========================================================= */

    if (modifyTripBtn) {

        modifyTripBtn.addEventListener(
            "click",
            async () => {

                const request =
                    modifyInput.value.trim();

                if (!request) {

                    modifyInput.focus();

                    showToast(
                        "Tell Saarthi what you want to change."
                    );

                    return;
                }

                if (!currentPlan) {

                    showToast(
                        "Generate a trip plan first."
                    );

                    return;
                }

                setButtonLoading(
                    modifyTripBtn,
                    "Updating plan..."
                );

                try {

                    const result =
                        await requestTripPlan({
                            modification:
                                request,
                            previousPlan:
                                currentPlan
                        });

                    if (
                        result.status ===
                        "needs_info"
                    ) {

                        handleNeedsInfo(
                            result
                        );

                        return;
                    }

                    renderPlan(
                        result
                    );

                    modifyInput.value =
                        "";

                    showToast(
                        "Saarthi AI updated your trip plan."
                    );

                } catch (error) {

                    console.error(
                        "Trip modification error:",
                        error
                    );

                    showToast(
                        error.message ||
                        "Unable to modify the trip plan."
                    );

                } finally {

                    resetButton(
                        modifyTripBtn
                    );
                }
            }
        );
    }


    /* =========================================================
       DATE INTERACTION
    ========================================================= */

    startDateInput.addEventListener(
        "change",
        () => {

            endDateInput.min =
                startDateInput.value;

            if (
                endDateInput.value <
                startDateInput.value
            ) {

                endDateInput.value =
                    startDateInput.value;
            }
        }
    );


    /* =========================================================
       INITIALIZE
    ========================================================= */

    setDefaultDates();

    const defaultPreferences = [
        "Nature",
        "Adventure"
    ];

    document
        .querySelectorAll(".preference-pill")
        .forEach(pill => {

            if (
                defaultPreferences.includes(
                    pill.dataset.preference
                )
            ) {

                pill.click();
            }
        });

});


/* =========================================================
   ESCAPE HTML
========================================================= */

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