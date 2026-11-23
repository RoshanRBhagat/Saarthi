const multer = require("multer");
const path = require("path");
const fs = require("fs/promises");
const { getCarUploadsDir } = require("../services/storagePaths");

function isAllowedCarImage(file) {
    const extension = path.extname(String(file?.originalname || "")).toLowerCase();
    const mimeType = String(file?.mimetype || "").toLowerCase();
    if ([".jpg", ".jpeg"].includes(extension)) {
        return mimeType === "image/jpeg" || mimeType === "image/jpg";
    }
    return extension === ".png" && mimeType === "image/png";
}


// =========================================================
// UPLOAD DIRECTORY
// =========================================================

// =========================================================
// STORAGE CONFIGURATION
// =========================================================

const storage =
    multer.diskStorage({

        destination: (
            req,
            file,
            cb
        ) => {
            const uploadDirectory = getCarUploadsDir();
            fs.mkdir(uploadDirectory, { recursive: true })
                .then(() => cb(null, uploadDirectory))
                .catch(cb);
        },


        filename: (
            req,
            file,
            cb
        ) => {

            /*
                Create a unique filename.

                Example:

                car-1725263821-123456789.jpg
            */

            const uniqueName =
                `car-${Date.now()}-${Math.round(
                    Math.random() * 1e9
                )}${path.extname(file.originalname).toLowerCase()}`;


            cb(
                null,
                uniqueName
            );

        }

    });


// =========================================================
// FILE FILTER
// =========================================================

const fileFilter =
    (
        req,
        file,
        cb
    ) => {

        if (isAllowedCarImage(file)) {

            cb(
                null,
                true
            );

        } else {

            cb(
                new Error(
                    "Only JPG, JPEG, and PNG images are allowed."
                )
            );

        }

    };


// =========================================================
// MULTER CONFIGURATION
// =========================================================

const upload =
    multer({

        storage,

        fileFilter,

        limits: {

            /*
                Maximum 8 images
            */

            files: 8,

            /*
                Maximum 5 MB per image
            */

            fileSize:
                5 * 1024 * 1024

        }

    });


module.exports = upload;
module.exports.isAllowedCarImage = isAllowedCarImage;
