const PLATFORM_FEE_PERCENTAGE = 0.40 || parseFloat(process.env.PLATFORM_FEE_PERCENTAGE);
const RUNNER_SHARE = 1 - PLATFORM_FEE_PERCENTAGE;
const RUNNER_DEFAULT_METERS = 1000;

const BASE_FEE = 1000;

const PLATFORM_FEE_PERCENTAGE_FOR_PEDESTRIAN = 0.30
const RUNNER_SHARE_PEDESTRIAN = 1 - PLATFORM_FEE_PERCENTAGE_FOR_PEDESTRIAN;

const PAYSTACK_FEE_PERCENT = 0.01;
const PAYSTACK_FEE_CAP = 300;

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

const calculateDeliveryFee = (distanceInMeters, fleetType) => {
  const fleet = fleetType?.toLowerCase();

  if (fleet === 'pedestrian') {
    return distanceInMeters <= 500 ? 750 : 1500;
  }

  if (fleet === 'bike' || fleet === 'cycling') {
    return Math.round(BASE_FEE + 200 * (distanceInMeters / 1000));
  }

  if (fleet === 'car' || fleet === 'van') {
    return Math.round(BASE_FEE + 400 * (distanceInMeters / 1000));
  }

  // fallback
  return Math.round(BASE_FEE + 400 * (distanceInMeters / 1000));
};

const calculateFeeSplit = (deliveryFee, fleetType) => {
  const fleet = fleetType?.toLowerCase();

  const platformFeePercentage = fleet === 'pedestrian'
    ? PLATFORM_FEE_PERCENTAGE_FOR_PEDESTRIAN
    : PLATFORM_FEE_PERCENTAGE;

  const runnerSharePercentage = fleet === 'pedestrian'
    ? RUNNER_SHARE_PEDESTRIAN
    : RUNNER_SHARE;

  const platformFee = Math.round(deliveryFee * platformFeePercentage);
  const runnerPayout = Math.round(deliveryFee * runnerSharePercentage);
  const providerFee = Math.min(Math.round(deliveryFee * PAYSTACK_FEE_PERCENT), PAYSTACK_FEE_CAP);
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

const computeDeliveryFeeFromDocs = (serviceType, user, fleetType) => {
  const { distanceInMeters, legs, error } = calculateRouteDistance(serviceType, user, fleetType);

  if (error) {
    console.warn(`[pricing] computeDeliveryFeeFromDocs — ${error}. Delivery fee defaulting to 0.`);
    return { distanceInMeters: 0, deliveryFee: 0, platformFee: 0, runnerPayout: 0, legs: legs || {}, error };
  }

  const deliveryFee = calculateDeliveryFee(distanceInMeters, fleetType);
  const split = calculateFeeSplit(deliveryFee, fleetType);

  return {
    distanceInMeters: Math.round(distanceInMeters),
    ...split,
    legs,
    error: null,
  };
};

module.exports = {
  PLATFORM_FEE_PERCENTAGE,
  RUNNER_SHARE,
  PAYSTACK_FEE_PERCENT,
  PAYSTACK_FEE_CAP,
  BASE_FEE,

  haversineDistance,
  calculateDeliveryFee,
  calculateFeeSplit,
  calculateRouteDistance,
  computeDeliveryFeeFromDocs,
};