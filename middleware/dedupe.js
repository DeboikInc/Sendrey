
const pending = new Map();

const dedupe = (ttl = 3000, { skip = [] } = {}) => (req, res, next) => {
  if (skip.some(pattern => req.path.startsWith(pattern.replace(/:[^/]+/g, '')))) {
    return next();
  }

  const identifier = req.user?._id?.toString() || req.ip;
  const key = `${identifier}:${req.method}:${req.originalUrl}`;

  if (pending.has(key)) {
    return res.status(429).json({
      success: false,
      message: 'Duplicate request in progress. Please wait.',
    });
  }

  pending.set(key, true);
  const release = () => pending.delete(key);

  res.on('finish', release);
  res.on('close', release);
  setTimeout(release, ttl);

  next();
};

module.exports = dedupe;