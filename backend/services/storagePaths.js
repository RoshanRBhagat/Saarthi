const path = require("path");

const backendRoot = path.resolve(__dirname, "..");
const configuredRoot = process.env.SAARTHI_UPLOAD_DIR;

const uploadsRoot = configuredRoot
    ? path.resolve(backendRoot, configuredRoot)
    : path.join(backendRoot, "uploads");

function getUploadsRoot() {
    return uploadsRoot;
}

function getCarUploadsDir() {
    return path.join(uploadsRoot, "cars");
}

function getDamageUploadsDir() {
    return path.join(uploadsRoot, "damage");
}

function getLegacyUploadsRoot() {
    return path.join(backendRoot, "uploads");
}

function getLegacyDamageUploadsDir() {
    return path.join(getLegacyUploadsRoot(), "damage");
}

function getLegacyCarUploadsDir() {
    return path.join(getLegacyUploadsRoot(), "cars");
}

module.exports = {
    getUploadsRoot,
    getCarUploadsDir,
    getDamageUploadsDir,
    getLegacyUploadsRoot,
    getLegacyCarUploadsDir,
    getLegacyDamageUploadsDir
};
