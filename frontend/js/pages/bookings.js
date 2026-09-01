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


    /* =====================================================
       BOOKING STATUS
    ===================================================== */

    const status =
        booking.status ||
        "pending";


    /* =====================================================
       PAYMENT STATUS
    ===================================================== */

    const paymentStatus =
        booking.paymentStatus ||
        "pending";


    const rentalStatus =
        booking.rentalStatus ||
        status;

    /* =====================================================
       DATES
    ===================================================== */

    const pickupDate =
        formatDate(
            booking.pickupDate
        );


    const returnDate =
        formatDate(
            booking.returnDate
        );


    /* =====================================================
       PRICING
    ===================================================== */

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


    /* =====================================================
       DRIVER
    ===================================================== */

    const driverRequired =
        booking.driverRequired ===
        true;


    /* =====================================================
       CARD HTML
    ===================================================== */

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

            <span
                class="booking-rental-status ${escapeHTML(
                    rentalStatus
                )}"
            >
                ${
                    rentalStatus === "upcoming"
                        ? "Upcoming"
                        : rentalStatus === "active"
                            ? "Active"
                            : rentalStatus === "completed"
                                ? "Completed"
                                : rentalStatus
                }
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


        <!-- Driver information -->

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

            <span>

                ${
                    driverRequired
                        ? "Driver requested"
                        : "Self-drive booking"
                }

            </span>

        </div>


        <!-- Customer actions -->

        ${
            [
                "pending",
                "confirmed"
            ].includes(status)
                ? `

                    <div
                        class="customer-booking-actions"
                    >

                        <button
                            type="button"
                            class="customer-cancel-btn"
                        >

                            <i
                                class="fa-solid fa-xmark"
                            ></i>

                            Cancel Booking

                        </button>

                    </div>

                `
                : ""
        }


        <!-- Payment action -->

        ${
            status === "confirmed" &&
            paymentStatus !== "paid"
                ? `

                    <div
                        class="customer-payment-actions"
                    >

                        <button
                            type="button"
                            class="customer-pay-btn"
                        >

                            <i
                                class="fa-solid fa-credit-card"
                            ></i>

                            Pay Now

                        </button>

                    </div>

                `
                : ""
        }


        <!-- Paid status -->

        ${
            paymentStatus === "paid"
                ? `

                    <div
                        class="customer-payment-status paid"
                    >

                        <i
                            class="fa-solid fa-circle-check"
                        ></i>

                        Payment completed

                    </div>

                `
                : ""
        }

    `;


    /* =====================================================
       ADD CARD TO PAGE
    ===================================================== */

    bookingsGrid.appendChild(
        card
    );


    /* =====================================================
       PAY NOW BUTTON
    ===================================================== */

    const payButton =
        card.querySelector(
            ".customer-pay-btn"
        );


    if (
        payButton
    ) {

        payButton.addEventListener(
            "click",
            async () => {

                await startPayment(
                    booking.bookingId,
                    booking.totalAmount,
                    payButton
                );

            }
        );

    }


    /* =====================================================
       CANCEL BOOKING BUTTON
    ===================================================== */

    const cancelButton =
        card.querySelector(
            ".customer-cancel-btn"
        );


    if (
        cancelButton
    ) {

        cancelButton.addEventListener(
            "click",
            async () => {

                await cancelCustomerBooking(
                    booking.bookingId,
                    cancelButton
                );

            }
        );

    }

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

/* =========================================================
   CANCEL CUSTOMER BOOKING
========================================================= */

async function cancelCustomerBooking(
    bookingId,
    button
) {

    const confirmed =
        window.confirm(
            "Are you sure you want to cancel this booking?"
        );


    if (
        !confirmed
    ) {

        return;

    }


    try {

        /* -------------------------------------------------
           LOADING STATE
        ------------------------------------------------- */

        button.disabled =
            true;


        button.innerHTML = `

            <i
                class="fa-solid fa-spinner fa-spin"
            ></i>

            Cancelling...

        `;


        /* -------------------------------------------------
           REQUEST
        ------------------------------------------------- */

        const response =
            await fetch(
                `/api/bookings/my/${encodeURIComponent(
                    bookingId
                )}/cancel`,
                {

                    method:
                        "PATCH",

                    headers: {

                        "Authorization":
                            `Bearer ${token}`

                    }

                }
            );


        const result =
            await response.json();


        /* -------------------------------------------------
           AUTH ERROR
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
                `auth.html?returnUrl=${encodeURIComponent(
                    window.location.href
                )}`;


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
                "Unable to cancel booking."
            );

        }


        /* -------------------------------------------------
           SUCCESS
        ------------------------------------------------- */

        alert(
            "Booking cancelled successfully."
        );


        /* -------------------------------------------------
           RELOAD BOOKINGS
        ------------------------------------------------- */

        window.location.reload();


    } catch (error) {

        console.error(
            "Cancel booking error:",
            error
        );


        alert(
            error.message ||
            "Unable to cancel booking."
        );


        /* -------------------------------------------------
           RESTORE BUTTON
        ------------------------------------------------- */

        button.disabled =
            false;


        button.innerHTML = `

            <i
                class="fa-solid fa-xmark"
            ></i>

            Cancel Booking

        `;

    }

}

/* =========================================================
   START RAZORPAY PAYMENT
========================================================= */

async function startPayment(
    bookingId,
    totalAmount,
    button
) {

    try {

        button.disabled =
            true;


        button.innerHTML = `

            <i
                class="fa-solid fa-spinner fa-spin"
            ></i>

            Preparing payment...

        `;


        /* -------------------------------------------------
           CREATE RAZORPAY ORDER
        ------------------------------------------------- */

        const response =
            await fetch(
                "/api/payments/create-order",
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

                            bookingId

                        })

                }
            );


        const result =
            await response.json();


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
                `auth.html?returnUrl=${encodeURIComponent(
                    window.location.href
                )}`;


            return;

        }


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Unable to start payment."
            );

        }


        const {
            orderId,
            amount,
            currency,
            keyId
        } =
            result.data;


        /* -------------------------------------------------
           RAZORPAY CHECKOUT
        ------------------------------------------------- */

        if (
            typeof Razorpay ===
            "undefined"
        ) {

            throw new Error(
                "Razorpay Checkout failed to load."
            );

        }


        const options = {

            key:
                keyId,

            amount:
                amount,

            currency:
                currency,

            name:
                "Saarthi",

            description:
                `Car booking ${bookingId}`,

            order_id:
                orderId,


            prefill: {

                name:
                    saarthiUser?.name ||
                    "",

                email:
                    saarthiUser?.email ||
                    ""

            },


            theme: {

                color:
                    "#2563eb"

            },


            handler:
                async function (
                    paymentResponse
                ) {

                    console.log(
                        "Razorpay payment response:",
                        paymentResponse
                    );


                    try {

                        button.disabled =
                            true;


                        button.innerHTML = `

                            <i
                                class="fa-solid fa-spinner fa-spin"
                            ></i>

                            Verifying payment...

                        `;


                        /* ---------------------------------------------
                        SEND PAYMENT TO BACKEND
                        --------------------------------------------- */

                        const verifyResponse =
                            await fetch(
                                "/api/payments/verify",
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

                                            bookingId,

                                            razorpay_payment_id:
                                                paymentResponse
                                                    .razorpay_payment_id,

                                            razorpay_order_id:
                                                paymentResponse
                                                    .razorpay_order_id,

                                            razorpay_signature:
                                                paymentResponse
                                                    .razorpay_signature

                                        })

                                }
                            );


                        const verifyResult =
                            await verifyResponse.json();


                        /* ---------------------------------------------
                        AUTH ERROR
                        --------------------------------------------- */

                        if (
                            verifyResponse.status ===
                            401
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


                        /* ---------------------------------------------
                        VERIFICATION ERROR
                        --------------------------------------------- */

                        if (
                            !verifyResponse.ok ||
                            !verifyResult.success
                        ) {

                            throw new Error(
                                verifyResult.message ||
                                "Payment verification failed."
                            );

                        }


                        /* ---------------------------------------------
                        VERIFIED
                        --------------------------------------------- */

                        alert(
                            "Payment successful and verified."
                        );


                        window.location.reload();


                    } catch (error) {

                        console.error(
                            "Payment verification error:",
                            error
                        );


                        alert(
                            error.message ||
                            "Payment was completed but verification failed."
                        );


                        button.disabled =
                            false;


                        button.innerHTML = `

                            <i
                                class="fa-solid fa-credit-card"
                            ></i>

                            Pay Now

                        `;

                    }

                },

        };


        const razorpay =
            new Razorpay(
                options
            );


        razorpay.on(
            "payment.failed",
            function (
                response
            ) {

                console.error(
                    "Razorpay payment failed:",
                    response
                );


                alert(
                    "Payment failed. Please try again."
                );


                button.disabled =
                    false;


                button.innerHTML = `

                    <i
                        class="fa-solid fa-credit-card"
                    ></i>

                    Pay Now

                `;

            }
        );


        razorpay.open();


    } catch (error) {

        console.error(
            "Payment initialization error:",
            error
        );


        alert(
            error.message ||
            "Unable to start payment."
        );


        button.disabled =
            false;


        button.innerHTML = `

            <i
                class="fa-solid fa-credit-card"
            ></i>

            Pay Now

        `;

    }

}