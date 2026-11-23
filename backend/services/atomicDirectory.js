const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

async function replaceDirectory(tempDirectory, finalDirectory) {
    const backupDirectory = path.join(
        path.dirname(finalDirectory),
        `${path.basename(finalDirectory)}.backup-${crypto.randomUUID()}`
    );
    let previousMoved = false;

    try {
        await fs.rename(finalDirectory, backupDirectory);
        previousMoved = true;
    } catch (error) {
        if (error.code !== "ENOENT") throw error;
    }

    try {
        await fs.rename(tempDirectory, finalDirectory);
    } catch (error) {
        if (previousMoved) {
            await fs.rename(backupDirectory, finalDirectory);
        }
        throw error;
    }

    if (previousMoved) {
        await fs.rm(backupDirectory, { recursive: true, force: true }).catch(() => {});
    }
}

module.exports = { replaceDirectory };
