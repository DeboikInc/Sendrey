const client = require("prom-client");

const register = new client.Registry();
client.collectDefaultMetrics({ register }); // CPU, memory, event loop lag, GC — free extras

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  // buckets tuned for typical API latency — adjust to your traffic profile
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

register.registerMetric(httpRequestDuration);

module.exports = { register, httpRequestDuration };