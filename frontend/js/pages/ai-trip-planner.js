/* =========================================================
   Saarthi AI Trip Planner - ai-trip-planner.js

   Phase 1:
   - Interactive planner form
   - Mock AI trip generation
   - Itinerary rendering
   - Car recommendation
   - Cost estimate
   - AI-style trip modification

   Later:
   Replace mock generation with an API request to the
   Saarthi backend / AI service.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const promptInput = document.getElementById("tripPrompt");
    const originInput = document.getElementById("origin");
    const destinationInput = document.getElementById("destination");
    const startDateInput = document.getElementById("startDate");
    const endDateInput = document.getElementById("endDate");
    const travelersInput = document.getElementById("travelers");
    const budgetInput = document.getElementById("budget");

    const generateBtn = document.getElementById("generateTripBtn");
    const resultsSection = document.getElementById("resultsSection");
    const selectedCount = document.getElementById("selectedCount");

    const tripTitle = document.getElementById("tripTitle");
    const tripSummary = document.getElementById("tripSummary");
    const durationStat = document.getElementById("durationStat");
    const travelersStat = document.getElementById("travelersStat");
    const estimatedStat = document.getElementById("estimatedStat");
    const itineraryList = document.getElementById("itineraryList");

    const recommendedCar = document.getElementById("recommendedCar");
    const carPrice = document.getElementById("carPrice");

    const rentalCost = document.getElementById("rentalCost");
    const fuelCost = document.getElementById("fuelCost");
    const tollCost = document.getElementById("tollCost");
    const activityCost = document.getElementById("activityCost");
    const totalCost = document.getElementById("totalCost");
    const budgetStatus = document.getElementById("budgetStatus");

    const editPlanBtn = document.getElementById("editPlanBtn");
    const modifyInput = document.getElementById("modifyInput");
    const modifyTripBtn = document.getElementById("modifyTripBtn");

    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");

    let selectedPreferences = [];
    let currentPlan = null;


    /* =========================================================
       DATE DEFAULTS
    ========================================================= */

    function setDefaultDates() {

        const today = new Date();

        const start = new Date(today);
        start.setDate(today.getDate() + 7);

        const end = new Date(start);
        end.setDate(start.getDate() + 2);

        startDateInput.value = formatDateForInput(start);
        endDateInput.value = formatDateForInput(end);

    }


    function formatDateForInput(date) {

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;

    }


    /* =========================================================
       HELPERS
    ========================================================= */

    function formatCurrency(amount) {

        return `₹${Number(amount).toLocaleString("en-IN")}`;

    }


    function calculateDuration() {

        if (!startDateInput.value || !endDateInput.value) {
            return 3;
        }

        const start = new Date(`${startDateInput.value}T00:00:00`);
        const end = new Date(`${endDateInput.value}T00:00:00`);

        const milliseconds = end - start;

        const days =
            Math.ceil(milliseconds / (1000 * 60 * 60 * 24)) + 1;

        return Math.max(1, days);

    }


    function showToast(message) {

        toastMessage.textContent = message;

        toast.classList.remove("hidden");

        window.clearTimeout(showToast.timer);

        showToast.timer = window.setTimeout(() => {

            toast.classList.add("hidden");

        }, 2600);

    }


    function getSelectedPreferencesText() {

        if (selectedPreferences.length === 0) {

            return "Balanced";

        }

        return selectedPreferences.join(" + ");

    }


    /* =========================================================
       PREFERENCE PILLS
    ========================================================= */

    document.querySelectorAll(".preference-pill").forEach((pill) => {

        pill.addEventListener("click", () => {

            const preference =
                pill.dataset.preference;


            if (selectedPreferences.includes(preference)) {

                selectedPreferences =
                    selectedPreferences.filter(
                        item => item !== preference
                    );

                pill.classList.remove("selected");

            } else {

                selectedPreferences.push(preference);

                pill.classList.add("selected");

            }


            selectedCount.textContent =
                `${selectedPreferences.length} selected`;

        });

    });


    /* =========================================================
       PROMPT SUGGESTIONS
    ========================================================= */

    document.querySelectorAll(".prompt-chip").forEach((chip) => {

        chip.addEventListener("click", () => {

            promptInput.value =
                chip.dataset.prompt;

        });

    });


    /* =========================================================
       MOCK AI GENERATION
    ========================================================= */

    function generateMockPlan() {

        const origin =
            originInput.value.trim() ||
            "Nagpur, Maharashtra";


        const destination =
            destinationInput.value.trim() ||
            "Pench National Park";


        const travelers =
            Number(travelersInput.value) || 4;


        const budget =
            Number(budgetInput.value) || 15000;


        const duration =
            calculateDuration();


        let car;
        let rental;


        /*
            Simple demo recommendation logic.

            Later this will be replaced by the real
            AI recommendation engine.
        */

        if (travelers <= 2) {

            car = "Hyundai Creta";
            rental = 4200;

        } else if (travelers <= 4) {

            car = "Mahindra XUV700";
            rental = 4800;

        } else {

            car = "Toyota Innova Crysta";
            rental = 6200;

        }


        const fuel =
            Math.max(
                2200,
                Math.round(duration * 1050)
            );


        const tolls =
            Math.max(
                900,
                Math.round(duration * 450)
            );


        const activities =
            Math.max(
                2200,
                Math.round(budget * 0.27)
            );


        const estimatedTotal =
            rental +
            fuel +
            tolls +
            activities;


        /* -----------------------------------------------------
           Demo itinerary templates
        ----------------------------------------------------- */

        const itineraryTemplates = [

            {
                title:
                    `${origin} → ${destination}`,

                summary:
                    "Travel, check-in, local exploration and a relaxed evening.",

                items: [

                    [
                        "08:00 AM",
                        "Departure",
                        `Start from ${origin} and begin the road journey.`
                    ],

                    [
                        "11:30 AM",
                        "Arrival & check-in",
                        `Reach ${destination} and settle in.`
                    ],

                    [
                        "01:00 PM",
                        "Lunch",
                        "Try a local restaurant or a highly rated regional dish."
                    ],

                    [
                        "03:00 PM",
                        "Main attraction",
                        "Explore one of the destination's signature experiences."
                    ],

                    [
                        "06:00 PM",
                        "Sunset & free time",
                        "Relax, take photos and explore at an easy pace."
                    ],

                    [
                        "08:00 PM",
                        "Dinner",
                        "Enjoy a local dinner and rest for the night."
                    ]

                ]

            },


            {

                title:
                    "Explore the destination",

                summary:
                    "A balanced day mixing nature, activities and downtime.",

                items: [

                    [
                        "07:30 AM",
                        "Breakfast",
                        "Start with a light breakfast before heading out."
                    ],

                    [
                        "09:00 AM",
                        "Nature experience",
                        "Visit a scenic spot, trail, park or viewpoint."
                    ],

                    [
                        "12:30 PM",
                        "Lunch break",
                        "Refuel and take some downtime."
                    ],

                    [
                        "02:30 PM",
                        "Adventure / sightseeing",
                        "Choose a hands-on activity based on your preferences."
                    ],

                    [
                        "05:30 PM",
                        "Scenic stop",
                        "Slow down at a viewpoint or peaceful outdoor location."
                    ],

                    [
                        "08:00 PM",
                        "Dinner",
                        "Return for dinner and an easy evening."
                    ]

                ]

            },


            {

                title:
                    "Final exploration → return",

                summary:
                    "Enjoy one final experience before heading back.",

                items: [

                    [
                        "08:00 AM",
                        "Breakfast & checkout",
                        "Finish breakfast and prepare for departure."
                    ],

                    [
                        "09:30 AM",
                        "Final stop",
                        "Visit one last nearby attraction or local market."
                    ],

                    [
                        "12:00 PM",
                        "Lunch",
                        "Have lunch before the return journey."
                    ],

                    [
                        "01:30 PM",
                        "Return journey",
                        `Depart ${destination} toward ${origin}.`
                    ],

                    [
                        "05:00 PM",
                        "Refresh break",
                        "Take a short break during the drive."
                    ],

                    [
                        "07:30 PM",
                        "Arrive",
                        `Reach ${origin} and complete your trip.`
                    ]

                ]

            }

        ];


        const itinerary = [];


        for (
            let index = 0;
            index < duration;
            index++
        ) {

            const template =
                itineraryTemplates[
                    index % itineraryTemplates.length
                ];


            itinerary.push({

                day: index + 1,

                title: template.title,

                summary: template.summary,

                items: template.items

            });

        }


        return {

            origin,

            destination,

            travelers,

            budget,

            duration,

            preferences:
                getSelectedPreferencesText(),

            car,

            rental,

            fuel,

            tolls,

            activities,

            total:
                estimatedTotal,

            itinerary

        };

    }


    /* =========================================================
       RENDER PLAN
    ========================================================= */

    function renderPlan(plan) {

        currentPlan = plan;


        tripTitle.textContent =
            `${plan.origin} → ${plan.destination}`;


        tripSummary.textContent =
            `${plan.duration} days • ` +
            `${plan.travelers} travelers • ` +
            `${plan.preferences} • ` +
            `planned around a ${formatCurrency(plan.budget)} budget`;


        durationStat.textContent =
            `${plan.duration} ${
                plan.duration === 1
                    ? "day"
                    : "days"
            }`;


        travelersStat.textContent =
            `${plan.travelers} ${
                plan.travelers === 1
                    ? "traveler"
                    : "travelers"
            }`;


        estimatedStat.textContent =
            formatCurrency(plan.total);


        recommendedCar.textContent =
            plan.car;


        carPrice.textContent =
            formatCurrency(plan.rental);


        rentalCost.textContent =
            formatCurrency(plan.rental);


        fuelCost.textContent =
            formatCurrency(plan.fuel);


        tollCost.textContent =
            formatCurrency(plan.tolls);


        activityCost.textContent =
            formatCurrency(plan.activities);


        totalCost.textContent =
            formatCurrency(plan.total);


        renderItinerary(
            plan.itinerary
        );


        updateBudgetStatus(
            plan.total,
            plan.budget
        );


        resultsSection.classList.remove(
            "hidden"
        );


        resultsSection.scrollIntoView({

            behavior: "smooth",

            block: "start"

        });

    }


    /* =========================================================
       RENDER ITINERARY
    ========================================================= */

    function renderItinerary(days) {

        itineraryList.innerHTML = "";


        days.forEach((day) => {

            const dayElement =
                document.createElement("article");


            dayElement.className =
                "itinerary-day";


            const label =
                document.createElement("div");


            label.className =
                "day-label";


            label.innerHTML = `
                <div class="day-number">
                    ${day.day}
                </div>
                Day
            `;


            const content =
                document.createElement("div");


            content.className =
                "day-content";


            content.innerHTML = `
                <h4>${day.title}</h4>
                <p>${day.summary}</p>
            `;


            day.items.forEach((item) => {

                const timeline =
                    document.createElement("div");


                timeline.className =
                    "timeline-item";


                timeline.innerHTML = `

                    <div class="timeline-time">
                        ${item[0]}
                    </div>

                    <div class="timeline-text">

                        <strong>
                            ${item[1]}
                        </strong>

                        <span>
                            ${item[2]}
                        </span>

                    </div>

                `;


                content.appendChild(
                    timeline
                );

            });


            dayElement.appendChild(
                label
            );


            dayElement.appendChild(
                content
            );


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
        budget
    ) {

        if (total <= budget) {

            budgetStatus.classList.remove(
                "over"
            );


            budgetStatus.innerHTML = `

                <i class="fa-solid fa-circle-check"></i>

                You are
                ${formatCurrency(budget - total)}
                under your budget.

            `;

        } else {

            budgetStatus.classList.add(
                "over"
            );


            budgetStatus.innerHTML = `

                <i class="fa-solid fa-triangle-exclamation"></i>

                This plan is
                ${formatCurrency(total - budget)}
                over budget.

            `;

        }

    }


    /* =========================================================
       GENERATE BUTTON
    ========================================================= */

    generateBtn.addEventListener(
        "click",
        () => {

            const destination =
                destinationInput.value.trim();


            if (!destination) {

                destinationInput.focus();

                showToast(
                    "Please enter a destination first."
                );

                return;

            }


            generateBtn.innerHTML = `

                <i class="fa-solid fa-spinner fa-spin"></i>

                Planning your trip...

            `;


            generateBtn.disabled = true;


            window.setTimeout(() => {

                const plan =
                    generateMockPlan();


                renderPlan(plan);


                generateBtn.innerHTML = `

                    <i class="fa-solid fa-wand-magic-sparkles"></i>

                    Generate My Trip

                `;


                generateBtn.disabled = false;


                showToast(
                    "Your personalized trip plan is ready."
                );

            }, 900);

        }
    );


    /* =========================================================
       EDIT PLAN
    ========================================================= */

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


    /* =========================================================
       MODIFY TRIP
    ========================================================= */

    modifyTripBtn.addEventListener(
        "click",
        () => {

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

                return;

            }


            const lowerRequest =
                request.toLowerCase();


            /*
                Demo modification logic.

                This will later be replaced with
                a real AI backend request.
            */

            if (
                lowerRequest.includes("relax") ||
                lowerRequest.includes("slow")
            ) {

                currentPlan.itinerary.forEach(
                    (day) => {

                        day.summary =
                            "A slower day with fewer activities and more downtime.";

                    }
                );


                renderItinerary(
                    currentPlan.itinerary
                );


                showToast(
                    "The itinerary has been made more relaxed."
                );

            }


            else if (
                lowerRequest.includes("budget") ||
                lowerRequest.includes("cheap") ||
                lowerRequest.includes("save")
            ) {

                currentPlan.activities =
                    Math.max(
                        1200,
                        Math.round(
                            currentPlan.activities * 0.75
                        )
                    );


                currentPlan.total =
                    currentPlan.rental +
                    currentPlan.fuel +
                    currentPlan.tolls +
                    currentPlan.activities;


                activityCost.textContent =
                    formatCurrency(
                        currentPlan.activities
                    );


                totalCost.textContent =
                    formatCurrency(
                        currentPlan.total
                    );


                estimatedStat.textContent =
                    formatCurrency(
                        currentPlan.total
                    );


                updateBudgetStatus(
                    currentPlan.total,
                    currentPlan.budget
                );


                showToast(
                    "Trip costs have been optimized."
                );

            }


            else {

                currentPlan.itinerary[0].summary =
                    `Updated based on your request: ${request}`;


                renderItinerary(
                    currentPlan.itinerary
                );


                showToast(
                    "Your trip plan has been updated."
                );

            }


            modifyInput.value = "";

        }
    );


    /* =========================================================
       INITIALIZE
    ========================================================= */

    setDefaultDates();


    /*
        Demo defaults:
        Nature + Adventure
    */

    document.querySelectorAll(
        '.preference-pill[data-preference="Nature"], ' +
        '.preference-pill[data-preference="Adventure"]'
    ).forEach((pill) => {

        pill.click();

    });

});