/* Accessible mobile navigation toggle for the Saarthi homepage. */
(() => {
    const navbar = document.querySelector(".homepage-navbar");
    if (!navbar) return;

    const toggle = navbar.querySelector("[data-mobile-nav-toggle]");
    const menu = navbar.querySelector("#primaryNavLinks");
    const icon = toggle ? toggle.querySelector("i") : null;
    if (!toggle || !menu) return;

    const closeMenu = () => {
        menu.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open navigation menu");
        if (icon) {
            icon.classList.remove("fa-xmark");
            icon.classList.add("fa-bars");
        }
    };

    const openMenu = () => {
        menu.classList.add("is-open");
        toggle.setAttribute("aria-expanded", "true");
        toggle.setAttribute("aria-label", "Close navigation menu");
        if (icon) {
            icon.classList.remove("fa-bars");
            icon.classList.add("fa-xmark");
        }
    };

    toggle.addEventListener("click", () => {
        if (menu.classList.contains("is-open")) closeMenu();
        else openMenu();
    });

    menu.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", closeMenu);
    });

    document.addEventListener("click", (event) => {
        if (!navbar.contains(event.target)) closeMenu();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeMenu();
            toggle.focus();
        }
    });

    const desktopQuery = window.matchMedia("(min-width: 769px)");
    const handleDesktopChange = (event) => {
        if (event.matches) closeMenu();
    };
    if (desktopQuery.addEventListener) {
        desktopQuery.addEventListener("change", handleDesktopChange);
    } else if (desktopQuery.addListener) {
        desktopQuery.addListener(handleDesktopChange);
    }
})();
