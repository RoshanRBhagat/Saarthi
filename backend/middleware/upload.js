const multer = require("multer");
const path = require("path");
const fs = require("fs");


// =========================================================
// UPLOAD DIRECTORY
// =========================================================

const uploadDirectory =
    path.join(
        __dirname,
        "..",
        "uploads",
        "cars"
    );


// =========================================================
// MAKE SURE DIRECTORY EXISTS
// =========================================================

if (!fs.existsSync(uploadDirectory)) {

    fs.mkdirSync(
        uploadDirectory,
        {
            recursive: true
        }
    );

}


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

            cb(
                null,
                uploadDirectory
            );

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
                )}${path.extname(file.originalname)}`;


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

        const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png"
        ];


        if (
            allowedTypes.includes(
                file.mimetype
            )
        ) {

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