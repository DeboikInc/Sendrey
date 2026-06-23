
let cachedConfig = null;
let fetchPromise = null;

const PRICING_CONFIG_URL = `${process.env.REACT_APP_API_URL}/pricing/pricing-config`;

export async function getPricingConfig({ forceRefresh = false } = {}) {
  if (cachedConfig && !forceRefresh) return cachedConfig;

  if (!fetchPromise) {
    fetchPromise = fetch(PRICING_CONFIG_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Pricing config fetch failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        cachedConfig = data;
        return data;
      })
      .finally(() => {
        fetchPromise = null;
      });
  }
  return fetchPromise;
}

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

const calculateDeliveryFee = (distanceInMeters, fleetType, config) => {
  const fleet = fleetType?.toLowerCase();

  if (fleet === 'pedestrian') {
    const tier = config.pedestrianTiers.find((t) => distanceInMeters <= t.maxDistanceMeters);
    if (!tier) return null;
    return tier.fee;
  }

  const rule = config.fleetRules[fleet] || config.fleetRules.default;
  return Math.round(rule.baseFee + rule.ratePerKm * (distanceInMeters / 1000));
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

// Now async — must be awaited since it needs the fetched config
export const computeDeliveryFee = async (serviceType, midCoords, deliveryCoords, fleetType) => {
  const { distanceInMeters, legs, error } = calculateRouteDistance(
    serviceType, midCoords, deliveryCoords, fleetType
  );

  if (error) return { distanceInMeters: 0, deliveryFee: 0, legs, error };

  const config = await getPricingConfig();
  const fleet = fleetType?.toLowerCase();
  const fee = calculateDeliveryFee(distanceInMeters, fleet, config);

  if (fee === null) {
    return { distanceInMeters: 0, deliveryFee: 0, legs, error: 'PEDESTRIAN_TOO_FAR' };
  }

  const platformFeePercentage = fleet === 'pedestrian'
    ? config.platformFeePercentagePedestrian
    : config.platformFeePercentage;

  const runnerShare = 1 - platformFeePercentage;

  const platformCut = Math.round(fee * platformFeePercentage);
  const runnerCut = Math.round(fee * runnerShare);

  return {
    distanceInMeters: Math.round(distanceInMeters),
    deliveryFee: fee,
    platformFee: platformCut,
    runnerEarnings: runnerCut,
    legs,
    error: null,
  };
};

export const formatNaira = (amount) =>
  `₦${Math.round(amount).toLocaleString('en-NG')}`;