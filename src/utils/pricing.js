export const BASE_FEE = 1000;

export const PLATFORM_FEE_PERCENTAGE = 0.57;
export const RUNNER_SHARE = 1 - PLATFORM_FEE_PERCENTAGE;

export const haversineDistance = (a, b) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6_371_000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

/**
 * car, van  — ₦1,000 base + ₦500/km
 * bike/cycling — ₦1,000 base + ₦300/km
 * pedestrian  — ₦1,500 flat for ≤1 km
 *               ₦750 for ≤500 m
 */
const calculateDeliveryFee = (distanceInMeters, fleetType) => {
  const fleet = fleetType?.toLowerCase();

  if (fleet === 'pedestrian') {
    return distanceInMeters <= 500 ? 750 : 1500;
  }

  if (fleet === 'bike' || fleet === 'cycling') {
    return Math.round(BASE_FEE + 300 * (distanceInMeters / 1000));
  }

  if (fleet === 'car' || fleet === 'van') {
    return Math.round(BASE_FEE + 500 * (distanceInMeters / 1000));
  }

  // fallback — unknown fleet type defaults to car rate
  return Math.round(BASE_FEE + 500 * (distanceInMeters / 1000));
};

export const calculateRouteDistance = (serviceType, midCoords, deliveryCoords, fleetType) => {
  if (!midCoords) return {
    distanceInMeters: 0, legs: {},
    error: `${serviceType === 'run-errand' ? 'Market' : 'Pick-up'} coordinates unavailable`,
  };
  if (!deliveryCoords) return {
    distanceInMeters: 0, legs: {},
    error: 'Delivery location unavailable',
  };

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
    legs: { runnerToMid: Math.round(leg1), midToDelivery: Math.round(leg2) },
    error: null,
  };
};

export const computeDeliveryFee = (serviceType, midCoords, deliveryCoords, fleetType) => {
  const { distanceInMeters, legs, error } = calculateRouteDistance(
    serviceType, midCoords, deliveryCoords, fleetType
  );

  if (error) return { distanceInMeters: 0, deliveryFee: 0, legs, error };

  return {
    distanceInMeters: Math.round(distanceInMeters),
    deliveryFee: calculateDeliveryFee(distanceInMeters, fleetType),
    legs,
    error: null,
  };
};

export const formatNaira = (amount) =>
  `₦${Math.round(amount).toLocaleString('en-NG')}`;

// car, van - 1000 base + 500 per km
//  bike, cycling - 1000 + 300 per km
// pedestrian, 1500 for whole del(1km), half price for half distance, 750 naira for 500m below 