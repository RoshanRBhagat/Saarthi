const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { getUploadsRoot } = require("./storagePaths");

async function isUploadStorageWritable(root = getUploadsRoot()) {
    try {
        await fs.access(root);
        for (const folder of ["cars", "damage"]) {
            const directory = path.join(root, folder);
            // A freshly mounted persistent volume starts empty. Initialize the
            // app-owned subdirectories while still requiring the volume root
            // itself to exist (so a missing mount is reported as unhealthy).
            await fs.mkdir(directory, { recursive: true });
            const probePath = path.join(directory, `.saarthi-health-${process.pid}-${crypto.randomUUID()}`);
            try {
                await fs.writeFile(probePath, "ok", { flag: "wx" });
            } finally {
                await fs.rm(probePath, { force: true });
            }
        }
        return true;
    } catch {
        return false;
    }
}

module.exports = { isUploadStorageWritable };
