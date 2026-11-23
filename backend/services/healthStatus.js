function getHealthStatus(databaseReadyState, uploadStorageWritable = true) {
    const ready = databaseReadyState === 1 && uploadStorageWritable === true;
    return {
        httpStatus: ready ? 200 : 503,
        body: {
            success: ready,
            status: ready ? "ok" : "degraded",
            dependencies: {
                database: databaseReadyState === 1 ? "connected" : "unavailable",
                uploadStorage: uploadStorageWritable ? "writable" : "unavailable"
            }
        }
    };
}

module.exports = { getHealthStatus };
