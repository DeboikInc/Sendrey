const { getPricingConfig } = require('../services/pricingService');

const haversineDistance = (a, b) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6_371_000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const calculateDeliveryFee = (distanceInMeters, fleetType, config) => {
  const fleet = fleetType?.toLowerCase();

  if (fleet === 'pedestrian') {
    // pedestrianTiers must be sorted ascending by maxDistanceMeters
    const tier = config.pedestrianTiers.find((t) => distanceInMeters <= t.maxDistanceMeters);
    if (!tier) return null; // caller treats null as PEDESTRIAN_TOO_FAR
    return tier.fee;
  }

  const rule = config.fleetRules[fleet] || config.fleetRules.default;
  return Math.round(rule.baseFee + rule.ratePerKm * (distanceInMeters / 1000));
};

const calculateFeeSplit = (deliveryFee, fleetType, config) => {
  const fleet = fleetType?.toLowerCase();

  const platformFeePercentage = fleet === 'pedestrian'
    ? config.platformFeePercentagePedestrian
    : config.platformFeePercentage;

  const runnerSharePercentage = 1 - platformFeePercentage;

  const platformFee = Math.round(deliveryFee * platformFeePercentage);
  const runnerPayout = Math.round(deliveryFee * runnerSharePercentage);
  const providerFee = Math.min(
    Math.round(deliveryFee * config.paystackFeePercent),
    config.paystackFeeCap
  );
  const netPlatformFee = platformFee - providerFee;

  return { deliveryFee, platformFee, runnerPayout, providerFee, netPlatformFee };
};

const calculateRouteDistance = (serviceType, user, fleetType) => {
  const deliveryCoords = (() => {
    const dc = user.currentRequest?.deliveryCoordinates;
    if (dc?.lat != null && dc?.lng != null) {
      return { lat: Number(dc.lat), lng: Number(dc.lng) };
    }
    return null;
  })();

  const isErrand = serviceType === 'run-errand';
  const isPickup = serviceType === 'pick-up';

  let midCoords = null;

  if (isErrand) {
    const mc = user.currentRequest?.marketCoordinates;
    if (mc?.lat != null && mc?.lng != null) {
      midCoords = { lat: Number(mc.lat), lng: Number(mc.lng) };
    }
  } else if (isPickup) {
    const pc = user.currentRequest?.pickupCoordinates;
    if (pc?.lat != null && pc?.lng != null) {
      midCoords = { lat: Number(pc.lat), lng: Number(pc.lng) };
    }
  }

  if (!midCoords) {
    const label = isErrand ? 'market' : 'pickup';
    return { distanceInMeters: 0, legs: {}, error: `${label} coordinates unavailable on user request` };
  }
  if (!deliveryCoords) {
    return { distanceInMeters: 0, legs: {}, error: 'Delivery (user) location unavailable' };
  }

  const fleet = fleetType?.toLowerCase();
  const leg1 = fleet === 'pedestrian' ? 0 : 1000;
  const leg2 = haversineDistance(midCoords, deliveryCoords);
  const total = leg1 + leg2;

  if (fleet === 'pedestrian' && total > 1000) {
    return {
      distanceInMeters: total,
      legs: { runnerToMid: Math.round(leg1), midToDelivery: Math.round(leg2) },
      error: 'PEDESTRIAN_TOO_FAR',
    };
  }

  return {
    distanceInMeters: total,
    legs: {
      runnerToMid: leg1,
      midToDelivery: Math.round(leg2),
      midCoords,
      deliveryCoords,
    },
    error: null,
  };
};

const computeDeliveryFeeFromDocs = async (serviceType, user, fleetType) => {
  const { distanceInMeters, legs, error } = calculateRouteDistance(serviceType, user, fleetType);

  if (error) {
    console.warn(`[pricing] computeDeliveryFeeFromDocs — ${error}. Delivery fee defaulting to 0.`);
    return { distanceInMeters: 0, deliveryFee: 0, platformFee: 0, runnerPayout: 0, legs: legs || {}, error };
  }

  const config = await getPricingConfig();
  const deliveryFee = calculateDeliveryFee(distanceInMeters, fleetType, config);

  if (deliveryFee === null) {
    console.warn('[pricing] computeDeliveryFeeFromDocs — PEDESTRIAN_TOO_FAR. Delivery fee defaulting to 0.');
    return { distanceInMeters: 0, deliveryFee: 0, platformFee: 0, runnerPayout: 0, legs: legs || {}, error: 'PEDESTRIAN_TOO_FAR' };
  }

  const split = calculateFeeSplit(deliveryFee, fleetType, config);

  return {
    distanceInMeters: Math.round(distanceInMeters),
    ...split,
    legs,
    error: null,
  };
};

module.exports = {
  haversineDistance,
  calculateDeliveryFee,
  calculateFeeSplit,
  calculateRouteDistance,
  computeDeliveryFeeFromDocs,
};