const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const frontendRoot = path.resolve(__dirname, "../../frontend");

function findHtmlFiles(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const absolutePath = path.join(directory, entry.name);
        if (entry.isDirectory()) return findHtmlFiles(absolutePath);
        return entry.isFile() && entry.name.toLowerCase().endsWith(".html") ? [absolutePath] : [];
    });
}

function findJavaScriptFiles(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const absolutePath = path.join(directory, entry.name);
        if (entry.isDirectory()) return findJavaScriptFiles(absolutePath);
        return entry.isFile() && entry.name.toLowerCase().endsWith(".js") ? [absolutePath] : [];
    });
}

function findCssFiles(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const absolutePath = path.join(directory, entry.name);
        if (entry.isDirectory()) return findCssFiles(absolutePath);
        return entry.isFile() && entry.name.toLowerCase().endsWith(".css") ? [absolutePath] : [];
    });
}

function extractCssRules(stylesheet, selector) {
    const rules = [];
    const selectorPattern = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rulePattern = new RegExp(`(?:^|})\\s*${selectorPattern}\\s*\\{([^}]*)\\}`, "gim");

    for (const match of stylesheet.matchAll(rulePattern)) rules.push(match[1]);
    return rules;
}

test("every Saarthi HTML page opts into mobile viewport and shared responsive rules", () => {
    const pages = findHtmlFiles(frontendRoot);
    assert.ok(pages.length >= 14, `Expected the frontend pages to be present; found ${pages.length}.`);

    for (const pagePath of pages) {
        const html = fs.readFileSync(pagePath, "utf8");
        const relativePage = path.relative(frontendRoot, pagePath);
        assert.match(html, /<meta\s+name=["']viewport["']/i, `${relativePage} is missing viewport metadata.`);

        const responsiveLink = [...html.matchAll(/<link\b[^>]*>/gi)]
            .map(match => match[0])
            .find(tag => /rel=["']stylesheet["']/i.test(tag) && /href=["'][^"']*responsive\.css["']/i.test(tag));
        assert.ok(responsiveLink, `${relativePage} is missing the shared responsive stylesheet.`);

        const href = responsiveLink.match(/href=["']([^"']*responsive\.css)["']/i)[1];
        const stylesheetPath = path.resolve(path.dirname(pagePath), href);
        assert.ok(fs.existsSync(stylesheetPath), `${relativePage} references a missing ${href}.`);
        const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
        assert.match(stylesheet, /@media\s*\(max-width:/i, `${href} has no small-screen rules.`);
        const bodyRule = stylesheet.match(/(?:^|\})\s*body\s*\{([^}]*)\}/im);
        assert.ok(bodyRule, `${href} must define the page body width.`);
        assert.match(bodyRule[1], /min-width:\s*0(?:px)?\s*;/i, `${href} forces a minimum page width that can overflow narrow screens.`);
    }
});

test("duplicated frontend entry points use the same responsive stylesheet", () => {
    const primary = fs.readFileSync(path.join(frontendRoot, "css/responsive.css"), "utf8");
    const duplicate = fs.readFileSync(path.join(frontendRoot, "frontend/css/responsive.css"), "utf8");
    assert.equal(duplicate, primary, "The duplicate frontend path must receive the same responsive fixes.");
});

test("no Saarthi stylesheet forces the page body wider than a narrow viewport", () => {
    const stylesheets = findCssFiles(frontendRoot);
    for (const stylesheetPath of stylesheets) {
        const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
        for (const bodyRule of extractCssRules(stylesheet, "body")) {
            const forcedMinimum = bodyRule.match(/min-width\s*:\s*([^;!]+)\s*;?/i)?.[1]?.trim();
            if (!forcedMinimum) continue;

            const isSafeMinimum = /^(?:0(?:px)?|0\s*\/\*[^]*?\*\/)$/i.test(forcedMinimum);
            assert.ok(isSafeMinimum, `${path.relative(frontendRoot, stylesheetPath)} sets body min-width to ${forcedMinimum}.`);
        }
    }
});

test("damage analysis button fits narrow phone layouts", () => {
    const stylesheet = fs.readFileSync(path.join(frontendRoot, "css/damage-detection.css"), "utf8");
    assert.match(
        stylesheet,
        /@media\s*\(max-width:\s*560px\)[\s\S]*?\.analyze-btn\s*\{[^}]*width:\s*100%[^}]*min-width:\s*0/i
    );
});

test("host dashboard booking filters remain visible as a two-column phone grid", () => {
    const stylesheet = fs.readFileSync(path.join(frontendRoot, "css/host-dashboard.css"), "utf8");
    const filtersRule = stylesheet.match(/\.booking-filters\s*\{([^}]*)\}/gi)
        ?.map(rule => rule.slice(rule.indexOf("{") + 1, -1))
        .find(rule => /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/i.test(rule)) || "";
    assert.match(filtersRule, /display:\s*grid/i);
    assert.match(filtersRule, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/i);
    assert.doesNotMatch(filtersRule, /overflow-x:\s*auto/i);
});

test("vehicle inspection uses one photo card per row on narrow phones", () => {
    const stylesheet = fs.readFileSync(path.join(frontendRoot, "css/booking-inspection.css"), "utf8");
    const hasNarrowSingleColumnRule = /@media\s*\(max-width:\s*420px\)[\s\S]*?\.angle-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/i.test(stylesheet);
    assert.ok(hasNarrowSingleColumnRule, "Inspection photo cards should have room for camera controls on narrow phones.");
});

test("homepage and AI planner use the accessible shared mobile navigation", () => {
    const mobileNav = fs.readFileSync(path.join(frontendRoot, "js/core/mobile-nav.js"), "utf8");
    assert.match(mobileNav, /querySelectorAll\("\[data-mobile-nav\]"\)/);

    for (const page of ["index.html", "frontend/index.html", "ai-trip-planner.html"]) {
        const html = fs.readFileSync(path.join(frontendRoot, page), "utf8");
        assert.match(html, /<nav\b[^>]*\bdata-mobile-nav/i, `${page} must opt in to mobile navigation.`);
        assert.match(html, /data-mobile-nav-toggle/i, `${page} needs an accessible menu toggle.`);
        assert.match(html, /aria-controls=["']([^"']+)["'][\s\S]*?id=["']\1["']/i, `${page} toggle must point at its menu.`);
        assert.match(html, /js\/core\/mobile-nav\.js/i, `${page} must load the shared navigation behavior.`);
    }

    const plannerStyles = fs.readFileSync(path.join(frontendRoot, "css/ai-trip-planner.css"), "utf8");
    assert.doesNotMatch(plannerStyles, /\.nav-links\s+a:not\(\.btn-primary\)\s*\{\s*display:\s*none/i);
});

test("legacy home and damage pages keep navigation links available on phones", () => {
    for (const [page, stylesheetName, breakpoint] of [
        ["frontend/index.html", "index.css", 768],
        ["index.html", "index.css", 768],
        ["damage-detection.html", "damage-detection.css", 560],
        ["frontend/damage-detection.html", "damage-detection.css", 560]
    ]) {
        const stylesheet = fs.readFileSync(path.join(frontendRoot, "css", stylesheetName), "utf8");
        const expected = new RegExp(`@media\\s*\\(max-width:\\s*${breakpoint}px\\)[\\s\\S]*?\\.nav-links\\s*\\{\\s*display:\\s*flex`, "i");
        assert.match(stylesheet, expected, `${page} should retain its navigation links on small screens.`);
    }
});

test("every HTML input, select, and textarea has an accessible name", () => {
    const pages = findHtmlFiles(frontendRoot);
    const controls = /<(input|select|textarea)\b[^>]*>/gi;

    for (const pagePath of pages) {
        const html = fs.readFileSync(pagePath, "utf8");
        const relativePage = path.relative(frontendRoot, pagePath);

        for (const match of html.matchAll(controls)) {
            const tag = match[0];
            const controlId = tag.match(/\bid=["']([^"']+)/i)?.[1];
            const hasAriaName = /\baria-label=["'][^"']+|\baria-labelledby=["'][^"']+/i.test(tag);
            const hasExplicitLabel = controlId && new RegExp(`<label\\b[^>]*\\bfor=["']${controlId}["']`, "i").test(html);
            const before = html.slice(Math.max(0, match.index - 200), match.index);
            const hasWrappingLabel = /<label\b[^>]*>[\s\S]*$/i.test(before) && !/<\/label>[^<]*$/i.test(before);
            const hasTitle = /\btitle=["'][^"']+/i.test(tag);
            assert.ok(
                hasAriaName || hasExplicitLabel || hasWrappingLabel || hasTitle,
                `${relativePage} contains an unlabeled ${match[1]} control${controlId ? ` (#${controlId})` : ""}.`
            );
        }
    }
});

test("static and JavaScript-generated images provide alternative text", () => {
    const sources = [...findHtmlFiles(frontendRoot), ...findJavaScriptFiles(frontendRoot)];
    const imageTags = /<img\b[^>]*>/gi;

    for (const sourcePath of sources) {
        const source = fs.readFileSync(sourcePath, "utf8");
        const relativeSource = path.relative(frontendRoot, sourcePath);

        for (const match of source.matchAll(imageTags)) {
            assert.match(
                match[0],
                /\balt\s*=\s*["'][^"']*["']/i,
                `${relativeSource} contains an image without an alt attribute.`
            );
        }
    }
});

test("local links between Saarthi pages point to existing HTML files", () => {
    const pages = findHtmlFiles(frontendRoot);

    for (const pagePath of pages) {
        const html = fs.readFileSync(pagePath, "utf8");
        const relativePage = path.relative(frontendRoot, pagePath);
        const localPageLinks = [...html.matchAll(/\bhref=["']([^"']+\.html(?:[?#][^"']*)?)["']/gi)];

        for (const match of localPageLinks) {
            const href = match[1].split(/[?#]/)[0];
            if (/^https?:\/\//i.test(href)) continue;
            const target = href.startsWith("/")
                ? path.resolve(frontendRoot, `.${href}`)
                : path.resolve(path.dirname(pagePath), decodeURIComponent(href));
            assert.ok(fs.existsSync(target), `${relativePage} links to missing page ${href}.`);
        }
    }
});

test("local scripts, stylesheets, and images referenced by pages exist", () => {
    const pages = findHtmlFiles(frontendRoot);
    const assetExtension = /\.(?:js|css|png|jpe?g|webp|svg|ico|woff2?|ttf)$/i;

    for (const pagePath of pages) {
        const html = fs.readFileSync(pagePath, "utf8");
        const relativePage = path.relative(frontendRoot, pagePath);

        for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
            const reference = match[1];
            if (reference.includes("://") || /^(?:data:|mailto:|tel:|javascript:|#)/i.test(reference)) continue;

            const localPath = decodeURIComponent(reference.split(/[?#]/)[0]);
            if (!assetExtension.test(localPath)) continue;

            const assetPath = localPath.startsWith("/")
                ? path.resolve(frontendRoot, `.${localPath}`)
                : path.resolve(path.dirname(pagePath), localPath);
            assert.ok(fs.existsSync(assetPath), `${relativePage} references missing asset ${reference}.`);
        }
    }
});

test("all frontend JavaScript files parse successfully", () => {
    const scripts = findJavaScriptFiles(frontendRoot);
    assert.ok(scripts.length > 0, "No frontend JavaScript files were found.");

    for (const scriptPath of scripts) {
        const result = spawnSync(process.execPath, ["--check", scriptPath], { encoding: "utf8" });
        assert.equal(result.status, 0, `${path.relative(frontendRoot, scriptPath)} failed syntax checking:\n${result.stderr}`);
    }
});

test("vehicle inspection photo controls name the vehicle angle", () => {
    const inspectionPages = findHtmlFiles(frontendRoot).filter(file => path.basename(file) === "booking-inspection.html");
    assert.ok(inspectionPages.length > 0);
    for (const pagePath of inspectionPages) {
        const html = fs.readFileSync(pagePath, "utf8");
        const photoInputs = [...html.matchAll(/<input\b(?=[^>]*\btype=["']file["'])[^>]*>/gi)];
        assert.equal(photoInputs.length, 8, `${path.relative(frontendRoot, pagePath)} should contain eight angle inputs.`);
        for (const input of photoInputs) {
            assert.match(input[0], /\baria-label=["'][^"']+view inspection photo["']/i);
        }
    }
});

test("booking creation success page clearly directs customers to complete payment", () => {
    const html = fs.readFileSync(path.join(frontendRoot, "booking-success.html"), "utf8");
    assert.match(html, /Payment is still pending/i);
    assert.match(html, /href=["']bookings\.html["'][^>]*>[\s\S]*?Open My Bookings to Pay/i);
});
