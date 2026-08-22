const { httpRequestDuration } = require("../config/metrics");

function metricsMiddleware(req, res, next) {
  const end = httpRequestDuration.startTimer();

  res.on("finish", () => {
    // req.route?.path gives the matched route pattern (e.g. /orders/:id),
    // NOT req.originalUrl, or you'll get a separate label per order ID and blow up cardinality
    const route = req.route?.path
      ? (req.baseUrl || "") + req.route.path
      : "unmatched";

    end({
      method: req.method,
      route,
      status_code: res.statusCode,
    });
  });

  next();
}

module.exports = metricsMiddleware;