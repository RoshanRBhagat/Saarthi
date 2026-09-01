/* =========================================================
   SAARTHI - MY BOOKINGS
========================================================= */


/* =========================================================
   ELEMENTS
========================================================= */

const loading =
    document.getElementById(
        "loading"
    );


const errorBox =
    document.getElementById(
        "error"
    );


const emptyBox =
    document.getElementById(
        "empty"
    );


const bookingsSection =
    document.getElementById(
        "bookingsSection"
    );


const bookingsGrid =
    document.getElementById(
        "bookingsGrid"
    );


const bookingCount =
    document.getElementById(
        "bookingCount"
    );


const welcomeMessage =
    document.getElementById(
        "welcomeMessage"
    );


/* =========================================================
   CHECK LOGIN
========================================================= */

const token =
    localStorage.getItem(
        "saarthiToken"
    );


const storedUser =
    localStorage.getItem(
        "saarthiUser"
    );


if (
    !token
) {

    window.location.href =
        "auth.html";

} else {

    loadMyBookings();

}


/* =========================================================
   LOAD MY BOOKINGS
========================================================= */

async function loadMyBookings() {

    /* -----------------------------------------------------
       User information
    ----------------------------------------------------- */

    if (
        storedUser
    ) {

        try {

            const user =
                JSON.parse(
                    storedUser
                );


            if (
                user.name
            ) {

                welcomeMessage.textContent =
                    `Welcome back, ${user.name}. Here are your Saarthi reservations.`;

            }

        } catch (
            error
        ) {

            console.error(
                "Unable to read stored user:",
                error
            );

        }

    }


    try {

        /* -------------------------------------------------
           Request
        ------------------------------------------------- */

        const response =
            await fetch(
                "/api/bookings/my",
                {

                    method:
                        "GET",

                    headers: {

                        "Authorization":
                            `Bearer ${token}`

                    }

                }
            );


        const result =
            await response.json();


        /* -------------------------------------------------
           Authentication failure
        ------------------------------------------------- */

        if (
            response.status === 401
        ) {

            localStorage.removeItem(
                "saarthiToken"
            );

            localStorage.removeItem(
                "saarthiUser"
            );


            window.location.href =
                "auth.html";


            return;

        }


        /* -------------------------------------------------
           API ERROR
        ------------------------------------------------- */

        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Unable to load your bookings."
            );

        }


        /* -------------------------------------------------
           NO BOOKINGS
        ------------------------------------------------- */

        if (
            !Array.isArray(
                result.data
            ) ||
            result.data.length === 0
        ) {

            loading.classList.add(
                "hidden"
            );


            emptyBox.classList.remove(
                "hidden"
            );


            return;

        }


        /* -------------------------------------------------
           COUNT
        ------------------------------------------------- */

        bookingCount.textContent =
            `${result.count} ${
                result.count === 1
                    ? "booking"
                    : "bookings"
            }`;


        /* -------------------------------------------------
           RENDER
        ------------------------------------------------- */

        result.data.forEach(
            renderBooking
        );


        loading.classList.add(
            "hidden"
        );


        bookingsSection.classList.remove(
            "hidden"
        );


    } catch (error) {

        console.error(
            "My bookings error:",
            error
        );


        loading.classList.add(
            "hidden"
        );


        errorBox.textContent =
            error.message;


        errorBox.classList.remove(
            "hidden"
        );

    }

}


/* =========================================================
   RENDER BOOKING
========================================================= */

function renderBooking(
    booking
) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "booking-card";


    const status =
        booking.status ||
        "pending";


    const pickupDate =
        formatDate(
            booking.pickupDate
        );


    const returnDate =
        formatDate(
            booking.returnDate
        );


    const totalDays =
        Number(
            booking.totalDays || 0
        );


    const dailyPrice =
        Number(
            booking.dailyPrice || 0
        );


    const totalAmount =
        Number(
            booking.totalAmount || 0
        );


    const driverRequired =
        booking.driverRequired ===
        true;


    card.innerHTML = `

        <div
            class="booking-card-header"
        >

            <div>

                <h3>
                    ${escapeHTML(
                        booking.carId
                    )}
                </h3>


                <div
                    class="booking-id"
                >

                    Booking ID:
                    ${escapeHTML(
                        booking.bookingId
                    )}

                </div>

            </div>


            <span
                class="booking-status ${escapeHTML(
                    status
                )}"
            >

                ${escapeHTML(
                    status
                )}

            </span>

        </div>


        <div
            class="booking-details"
        >

            <div
                class="booking-detail-row"
            >

                <span>
                    Pickup
                </span>

                <strong>
                    ${pickupDate}
                </strong>

            </div>


            <div
                class="booking-detail-row"
            >

                <span>
                    Return
                </span>

                <strong>
                    ${returnDate}
                </strong>

            </div>


            <div
                class="booking-detail-row"
            >

                <span>
                    Rental duration
                </span>

                <strong>

                    ${totalDays}
                    ${
                        totalDays === 1
                            ? "day"
                            : "days"
                    }

                </strong>

            </div>


            <div
                class="booking-detail-row"
            >

                <span>
                    Daily price
                </span>

                <strong>
                    ₹${dailyPrice.toLocaleString(
                        "en-IN"
                    )}
                </strong>

            </div>


            <div
                class="booking-detail-row booking-total-row"
            >

                <span>
                    Total amount
                </span>

                <strong>
                    ₹${totalAmount.toLocaleString(
                        "en-IN"
                    )}
                </strong>

            </div>

        </div>


        <div
            class="booking-driver"
        >

            <i
                class="fa-solid ${
                    driverRequired
                        ? "fa-user-check"
                        : "fa-user"
                }"
            ></i>


            ${
                driverRequired
                    ? "Driver requested"
                    : "Self-drive booking"
            }

        </div>

    `;


    bookingsGrid.appendChild(
        card
    );

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
    dateValue
) {

    if (
        !dateValue
    ) {

        return "—";

    }


    const date =
        new Date(
            dateValue
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "—";

    }


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