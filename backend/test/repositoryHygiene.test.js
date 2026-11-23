const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..", "..");

test("local uploads and backend credentials stay out of Git and container builds", () => {
    const gitIgnore = fs.readFileSync(path.join(projectRoot, ".gitignore"), "utf8");
    const dockerIgnore = fs.readFileSync(path.join(projectRoot, ".dockerignore"), "utf8");

    assert.match(gitIgnore, /^\.env\s*$/m, "Git should ignore local environment files.");
    assert.match(gitIgnore, /^backend\/uploads\/?\s*$/m, "Git should ignore uploaded vehicle and inspection files.");
    assert.match(dockerIgnore, /^backend\/\.env\s*$/m, "Container builds should exclude backend credentials.");
    assert.match(dockerIgnore, /^backend\/uploads\s*$/m, "Container builds should use the configured persistent upload volume.");
});
