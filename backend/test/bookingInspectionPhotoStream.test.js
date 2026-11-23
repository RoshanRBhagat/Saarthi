const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { PassThrough } = require("node:stream");
const { finished } = require("node:stream/promises");

const uploadRoot = fs.mkdtempSync(path.join(os.tmpdir(), "saarthi-photo-stream-"));
process.env.SAARTHI_UPLOAD_DIR = uploadRoot;

const Booking = require("../models/Booking");
const { getCustomerInspectionPhoto } = require("../controllers/bookingInspectionPhotoController");

test("customer inspection photo endpoint streams a private stored image", async t => {
    t.after(() => fs.rmSync(uploadRoot, { recursive: true, force: true }));

    const bookingId = "BOOK-STREAM-TEST";
    const photoBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const photoDirectory = path.join(uploadRoot, "damage", bookingId, "pickup");
    fs.mkdirSync(photoDirectory, { recursive: true });
    fs.writeFileSync(path.join(photoDirectory, "front.jpg"), photoBytes);

    const originalFindOne = Booking.findOne;
    Booking.findOne = query => {
        assert.deepEqual(query, { bookingId, userId: "customer-1" });
        return {
            select: async () => ({
                bookingId,
                userId: "customer-1",
                pickupInspection: {
                    status: "completed",
                    photos: [{ angle: "front", path: `/uploads/damage/${bookingId}/pickup/front.jpg` }]
                }
            })
        };
    };

    const response = new PassThrough();
    const headers = {};
    const responseChunks = [];
    response.on("data", chunk => responseChunks.push(chunk));
    response.set = (name, value) => { headers[name.toLowerCase()] = value; return response; };
    response.status = code => { response.statusCode = code; return response; };
    response.json = body => { response.body = body; response.end(JSON.stringify(body)); return response; };

    try {
        const responseDone = finished(response);
        await getCustomerInspectionPhoto({
            params: { bookingId, phase: "pickup", angle: "front" },
            user: { _id: "customer-1" }
        }, response);
        await responseDone;

        assert.equal(response.statusCode, undefined);
        assert.equal(headers["content-type"], "image/jpeg");
        assert.equal(headers["content-length"], String(photoBytes.length));
        assert.equal(headers["cache-control"], "private, no-store");
        assert.equal(headers["x-content-type-options"], "nosniff");
        assert.deepEqual(Buffer.concat(responseChunks), photoBytes);
    } finally {
        Booking.findOne = originalFindOne;
    }
});
