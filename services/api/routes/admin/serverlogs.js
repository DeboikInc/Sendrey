const { register } = require("../../config/metrics");
const express = require('express');
const router = express.Router();

function computePercentilesFromBuckets(buckets, sumCount) {
    const p = (target) => {
        const threshold = sumCount * target;
        const bucket = buckets.find(b => b.count >= threshold);
        return bucket ? bucket.le : buckets[buckets.length - 1]?.le ?? null;
    };
    return { p50: p(0.5), p90: p(0.9), p95: p(0.95), p99: p(0.99) };
}

router.get("/server-logs", async (req, res, next) => {
    try {
        const metrics = await register.getMetricsAsJSON();
        const histogram = metrics.find(m => m.name === "http_request_duration_seconds");

        if (!histogram) {
            return res.status(200).json({ success: true, data: { routes: [] } });
        }

        const byRoute = {};
        for (const sample of histogram.values) {
            if (sample.metricName !== "http_request_duration_seconds_bucket") continue;
            const route = sample.labels.route;
            byRoute[route] = byRoute[route] || [];
            byRoute[route].push({
                le: sample.labels.le === "+Inf" ? Infinity : Number(sample.labels.le),
                count: sample.value,
            });
        }

        const result = Object.entries(byRoute).map(([route, buckets]) => {
            buckets.sort((a, b) => a.le - b.le);
            const totalCount = buckets[buckets.length - 1]?.count || 0;
            const { p50, p90, p95, p99 } = computePercentilesFromBuckets(buckets, totalCount);
            return {
                route,
                requestCount: totalCount,
                p50Ms: p50 != null ? p50 * 1000 : null,
                p90Ms: p90 != null ? p90 * 1000 : null,
                p95Ms: p95 != null ? p95 * 1000 : null,
                p99Ms: p99 != null ? p99 * 1000 : null,
            };
        });

        return res.status(200).json({ success: true, data: { routes: result } });
    } catch (err) {
        next(err); 
    }
});

module.exports = router;