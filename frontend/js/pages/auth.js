/* =========================================================
   SAARTHI AUTHENTICATION
========================================================= */


/* =========================================================
   ELEMENTS
========================================================= */

const loginForm =
    document.getElementById("loginForm");


const registerForm =
    document.getElementById("registerForm");


const switchAuthMode =
    document.getElementById("switchAuthMode");


const switchText =
    document.getElementById("switchText");


const authTitle =
    document.getElementById("authTitle");


const authSubtitle =
    document.getElementById("authSubtitle");


const loginBtn =
    document.getElementById("loginBtn");


const registerBtn =
    document.getElementById("registerBtn");


const loginError =
    document.getElementById("loginError");


const registerError =
    document.getElementById("registerError");


/* =========================================================
   LOGIN INPUTS
========================================================= */

const loginEmail =
    document.getElementById("loginEmail");


const loginPassword =
    document.getElementById("loginPassword");


/* =========================================================
   REGISTER INPUTS
========================================================= */

const registerName =
    document.getElementById("registerName");


const registerEmail =
    document.getElementById("registerEmail");


const registerPhone =
    document.getElementById("registerPhone");


const registerPassword =
    document.getElementById("registerPassword");


const registerRole =
    document.getElementById("registerRole");


/* =========================================================
   RETURN URL
========================================================= */

const authParams =
    new URLSearchParams(
        window.location.search
    );


const returnUrl =
    authParams.get(
        "returnUrl"
    );


/* =========================================================
   SAFE REDIRECT
========================================================= */

function redirectAfterAuth() {

    /*
        Only allow relative URLs belonging to Saarthi.

        This prevents a crafted returnUrl from sending
        the user to an external website.
    */

    if (
        returnUrl &&
        returnUrl.startsWith("/") &&
        !returnUrl.startsWith("//")
    ) {

        window.location.href =
            returnUrl;

        return;

    }


    /*
        Default destination
    */

    window.location.href =
        "cars.html";

}


/* =========================================================
   AUTH MODE
========================================================= */

let isLoginMode =
    true;


/* =========================================================
   SWITCH LOGIN / REGISTER
========================================================= */

switchAuthMode.addEventListener(
    "click",
    () => {

        isLoginMode =
            !isLoginMode;


        loginError.classList.add(
            "hidden"
        );


        registerError.classList.add(
            "hidden"
        );


        if (
            isLoginMode
        ) {

            loginForm.classList.remove(
                "hidden"
            );


            registerForm.classList.add(
                "hidden"
            );


            authTitle.textContent =
                "Welcome back";


            authSubtitle.textContent =
                "Log in to manage your bookings and trips.";


            switchText.textContent =
                "Don't have an account?";


            switchAuthMode.textContent =
                "Register";

        } else {

            loginForm.classList.add(
                "hidden"
            );


            registerForm.classList.remove(
                "hidden"
            );


            authTitle.textContent =
                "Create your Saarthi account";


            authSubtitle.textContent =
                "Join Saarthi to book cars and manage your trips.";


            switchText.textContent =
                "Already have an account?";


            switchAuthMode.textContent =
                "Log In";

        }

    }
);


/* =========================================================
   LOGIN
========================================================= */

loginForm.addEventListener(
    "submit",
    loginUser
);


async function loginUser(
    event
) {

    event.preventDefault();


    const email =
        loginEmail.value.trim();


    const password =
        loginPassword.value;


    loginError.classList.add(
        "hidden"
    );


    loginBtn.disabled =
        true;


    loginBtn.innerHTML = `

        <i
            class="fa-solid fa-spinner fa-spin"
        ></i>

        Logging in...

    `;


    try {

        const response =
            await fetch(
                "/api/auth/login",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            email,

                            password

                        })

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
                "Unable to log in."
            );

        }


        /* -------------------------------------------------
           STORE AUTHENTICATION
        ------------------------------------------------- */

        localStorage.setItem(
            "saarthiToken",
            result.token
        );


        localStorage.setItem(
            "saarthiUser",
            JSON.stringify(
                result.user
            )
        );


        /* -------------------------------------------------
           REDIRECT
        ------------------------------------------------- */

        redirectAfterAuth();


    } catch (error) {

        console.error(
            "Login error:",
            error
        );


        loginError.textContent =
            error.message;


        loginError.classList.remove(
            "hidden"
        );

    } finally {

        loginBtn.disabled =
            false;


        loginBtn.innerHTML = `

            <i
                class="fa-solid fa-right-to-bracket"
            ></i>

            Log In

        `;

    }

}


/* =========================================================
   REGISTER
========================================================= */

registerForm.addEventListener(
    "submit",
    registerUser
);


async function registerUser(
    event
) {

    event.preventDefault();


    const name =
        registerName.value.trim();


    const email =
        registerEmail.value.trim();


    const phone =
        registerPhone.value.trim();


    const password =
        registerPassword.value;


    const role =
        registerRole.value;


    registerError.classList.add(
        "hidden"
    );


    /* -----------------------------------------------------
       CLIENT VALIDATION
    ----------------------------------------------------- */

    if (
        !/^[0-9]{10}$/.test(
            phone
        )
    ) {

        showRegisterError(
            "Please enter a valid 10-digit mobile number."
        );

        return;

    }


    if (
        password.length < 6
    ) {

        showRegisterError(
            "Password must contain at least 6 characters."
        );

        return;

    }


    registerBtn.disabled =
        true;


    registerBtn.innerHTML = `

        <i
            class="fa-solid fa-spinner fa-spin"
        ></i>

        Creating account...

    `;


    try {

        const response =
            await fetch(
                "/api/auth/register",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            name,

                            email,

                            phone,

                            password,

                            role

                        })

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
                "Unable to create account."
            );

        }


        /* -------------------------------------------------
           STORE AUTHENTICATION
        ------------------------------------------------- */

        localStorage.setItem(
            "saarthiToken",
            result.token
        );


        localStorage.setItem(
            "saarthiUser",
            JSON.stringify(
                result.user
            )
        );


        /* -------------------------------------------------
           REDIRECT
        ------------------------------------------------- */

        redirectAfterAuth();


    } catch (error) {

        console.error(
            "Registration error:",
            error
        );


        showRegisterError(
            error.message
        );

    } finally {

        registerBtn.disabled =
            false;


        registerBtn.innerHTML = `

            <i
                class="fa-solid fa-user-plus"
            ></i>

            Create Account

        `;

    }

}


/* =========================================================
   REGISTER ERROR
========================================================= */

function showRegisterError(
    message
) {

    registerError.textContent =
        message;


    registerError.classList.remove(
        "hidden"
    );

}