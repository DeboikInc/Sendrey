const { register } = require("../../config/metrics");
const express = require('express');
const router = express.Router();

router.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

module.exports = router;