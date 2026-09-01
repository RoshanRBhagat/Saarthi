/* =========================================================
   SAARTHI - SHARED AUTH UI
========================================================= */


/* =========================================================
   AUTH DATA
========================================================= */

const saarthiToken =
    localStorage.getItem(
        "saarthiToken"
    );


const saarthiUserRaw =
    localStorage.getItem(
        "saarthiUser"
    );


let saarthiUser = null;


try {

    if (
        saarthiUserRaw
    ) {

        saarthiUser =
            JSON.parse(
                saarthiUserRaw
            );

    }

} catch (error) {

    console.error(
        "Invalid stored Saarthi user:",
        error
    );


    localStorage.removeItem(
        "saarthiUser"
    );

}


/* =========================================================
   INITIALIZE NAVIGATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeAuthUI
);


function initializeAuthUI() {

    updateNavigation();

}


/* =========================================================
   FIND NAVIGATION
========================================================= */

function updateNavigation() {

    const navLinks =
        document.querySelector(
            ".nav-links"
        );


    if (
        !navLinks
    ) {

        return;

    }


    /* -----------------------------------------------------
       Remove previous dynamic auth UI
    ----------------------------------------------------- */

    navLinks
        .querySelectorAll(
            ".auth-ui-dynamic"
        )
        .forEach(
            element => {

                element.remove();

            }
        );


    /* -----------------------------------------------------
       LOGGED OUT
    ----------------------------------------------------- */

    if (
        !saarthiToken ||
        !saarthiUser
    ) {

        addLoggedOutUI(
            navLinks
        );


        return;

    }


    /* -----------------------------------------------------
       LOGGED IN
    ----------------------------------------------------- */

    addLoggedInUI(
        navLinks
    );

}


/* =========================================================
   LOGGED OUT UI
========================================================= */

function addLoggedOutUI(
    navLinks
) {

    const loginLink =
        document.createElement(
            "a"
        );


    loginLink.href =
        `auth.html?returnUrl=${encodeURIComponent(
            window.location.pathname +
            window.location.search
        )}`;


    loginLink.className =
        "btn-primary auth-ui-dynamic";


    loginLink.textContent =
        "Log In";


    navLinks.appendChild(
        loginLink
    );

}


/* =========================================================
   LOGGED IN UI
========================================================= */

function addLoggedInUI(
    navLinks
) {

    /* -----------------------------------------------------
       CUSTOMER
    ----------------------------------------------------- */

    if (
        saarthiUser.role ===
        "customer"
    ) {

        addNavigationLink(
            navLinks,
            "bookings.html",
            "My Bookings"
        );

    }


    /* -----------------------------------------------------
       HOST
    ----------------------------------------------------- */

    if (
        saarthiUser.role ===
        "host"
    ) {

        addNavigationLink(
            navLinks,
            "host-dashboard.html",
            "Host Dashboard"
        );

    }


    /* -----------------------------------------------------
       ACCOUNT MENU
    ----------------------------------------------------- */

    createAccountMenu(
        navLinks
    );

}


/* =========================================================
   ADD NAVIGATION LINK
========================================================= */

function addNavigationLink(
    navLinks,
    href,
    label
) {

    const existing =
        navLinks.querySelector(
            `a[href="${href}"]`
        );


    if (
        existing
    ) {

        existing.classList.add(
            "auth-ui-dynamic"
        );


        existing.dataset.authUi =
            "true";


        return;

    }


    const link =
        document.createElement(
            "a"
        );


    link.href =
        href;


    link.textContent =
        label;


    link.className =
        "auth-ui-dynamic";


    navLinks.appendChild(
        link
    );

}


/* =========================================================
   ACCOUNT MENU
========================================================= */

function createAccountMenu(
    navLinks
) {

    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "account-menu auth-ui-dynamic";


    /* -----------------------------------------------------
       Account button
    ----------------------------------------------------- */

    const accountButton =
        document.createElement(
            "button"
        );


    accountButton.type =
        "button";


    accountButton.className =
        "account-menu-button";


    const displayName =
        saarthiUser.name ||
        "Account";


    const roleLabel =
        saarthiUser.role ===
            "host"
            ? "Host"
            : "Customer";


    accountButton.innerHTML = `

        <span class="account-avatar">

            ${escapeHTML(
                getInitial(
                    displayName
                )
            )}

        </span>


        <span class="account-name">

            ${escapeHTML(
                displayName
            )}

        </span>


        <i
            class="fa-solid fa-chevron-down account-chevron"
        ></i>

    `;


    /* -----------------------------------------------------
       Dropdown
    ----------------------------------------------------- */

    const dropdown =
        document.createElement(
            "div"
        );


    dropdown.className =
        "account-dropdown";


    dropdown.innerHTML = `

        <div
            class="account-dropdown-header"
        >

            <strong>
                ${escapeHTML(
                    displayName
                )}
            </strong>


            <span>
                ${roleLabel}
            </span>

        </div>


        <div
            class="account-dropdown-divider"
        ></div>


        <a
            href="profile.html"
            class="account-dropdown-link"
        >

            <i
                class="fa-solid fa-user"
            ></i>

            My Profile

        </a>


        ${
            saarthiUser.role === "customer"

                ? `

                    <a
                        href="bookings.html"
                        class="account-dropdown-link"
                    >

                        <i
                            class="fa-solid fa-calendar-check"
                        ></i>

                        My Bookings

                    </a>

                `

                : `

                    <a
                        href="host-dashboard.html"
                        class="account-dropdown-link"
                    >

                        <i
                            class="fa-solid fa-chart-line"
                        ></i>

                        Host Dashboard

                    </a>

                    <a
                        href="host.html"
                        class="account-dropdown-link"
                    >

                        <i
                            class="fa-solid fa-car"
                        ></i>

                        Add Vehicle

                    </a>

                `
        }


        <div
            class="account-dropdown-divider"
        ></div>


        <button
            type="button"
            class="account-dropdown-link logout-link"
            id="saarthiLogoutBtn"
        >

            <i
                class="fa-solid fa-right-from-bracket"
            ></i>

            Logout

        </button>

    `;


    wrapper.appendChild(
        accountButton
    );


    wrapper.appendChild(
        dropdown
    );


    navLinks.appendChild(
        wrapper
    );


    /* -----------------------------------------------------
       Toggle dropdown
    ----------------------------------------------------- */

    accountButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            wrapper.classList.toggle(
                "open"
            );

        }
    );


    /* -----------------------------------------------------
       Close when clicking outside
    ----------------------------------------------------- */

    document.addEventListener(
        "click",
        () => {

            wrapper.classList.remove(
                "open"
            );

        }
    );


    /* -----------------------------------------------------
       Logout
    ----------------------------------------------------- */

    const logoutButton =
        dropdown.querySelector(
            "#saarthiLogoutBtn"
        );


    logoutButton.addEventListener(
        "click",
        logoutUser
    );

}


/* =========================================================
   LOGOUT
========================================================= */

function logoutUser() {

    localStorage.removeItem(
        "saarthiToken"
    );


    localStorage.removeItem(
        "saarthiUser"
    );


    window.location.href =
        "index.html";

}


/* =========================================================
   GET INITIAL
========================================================= */

function getInitial(
    name
) {

    const cleaned =
        String(
            name || ""
        ).trim();


    if (
        !cleaned
    ) {

        return "?";

    }


    return cleaned
        .charAt(0)
        .toUpperCase();

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