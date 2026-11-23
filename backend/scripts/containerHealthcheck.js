async function isApplicationHealthy(fetchImplementation = fetch, port = process.env.PORT || "5000") {
    try {
        const response = await fetchImplementation(`http://127.0.0.1:${port}/api/health`, {
            signal: AbortSignal.timeout(5000)
        });
        return response.ok;
    } catch {
        return false;
    }
}

if (require.main === module) {
    isApplicationHealthy().then(healthy => {
        process.exitCode = healthy ? 0 : 1;
    });
}

module.exports = { isApplicationHealthy };
