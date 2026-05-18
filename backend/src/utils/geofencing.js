/**
 * Geofencing utility using the Haversine formula.
 * Calculates distance between two GPS coordinates on Earth.
 */

const EARTH_RADIUS_KM = 6371;
const DEFAULT_MAX_GPS_ACCURACY_METERS = 150;
const DEFAULT_BOUNDARY_BUFFER_METERS = 75;

/**
 * Convert degrees to radians.
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate the distance in kilometers between two GPS points
 * using the Haversine formula.
 *
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers (rounded to 2 decimal places)
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return distance;
}

/**
 * Calculate delivery fee based on distance.
 *
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} baseFee - Base delivery fee (default ₱30)
 * @param {number} perKmFee - Fee per kilometer (default ₱10/km)
 * @returns {number} Total delivery fee
 */
export function calculateDeliveryFee(distanceKm, baseFee = 30, perKmFee = 10) {
  return Math.round((baseFee + distanceKm * perKmFee) * 100) / 100;
}

/**
 * Check if a location is within the delivery radius.
 *
 * @param {number} customerLat - Customer latitude
 * @param {number} customerLon - Customer longitude
 * @param {number} storeLat - Store latitude
 * @param {number} storeLon - Store longitude
 * @param {number} radiusKm - Max delivery radius in km
 * @returns {{ isWithinRadius: boolean, distanceKm: number, deliveryFee: number }}
 */
export function validateDeliveryLocation(
  customerLat,
  customerLon,
  storeLat,
  storeLon,
  radiusKm = 5,
  baseFee = 30,
  perKmFee = 10,
  accuracyMeters = null,
  options = {}
) {
  const distanceKm = calculateDistance(customerLat, customerLon, storeLat, storeLon);
  const gpsAccuracyMeters =
    typeof accuracyMeters === "number" && Number.isFinite(accuracyMeters) ? accuracyMeters : null;
  const maxGpsAccuracyMeters =
    options.maxGpsAccuracyMeters || DEFAULT_MAX_GPS_ACCURACY_METERS;
  const boundaryBufferMeters =
    options.boundaryBufferMeters || DEFAULT_BOUNDARY_BUFFER_METERS;
  const effectiveRadiusKm = radiusKm + boundaryBufferMeters / 1000;
  const uncertaintyKm = gpsAccuracyMeters ? gpsAccuracyMeters / 1000 : 0;

  let decision = "WITHIN_RADIUS";
  let reason = null;

  if (gpsAccuracyMeters && gpsAccuracyMeters > maxGpsAccuracyMeters) {
    decision = "UNCERTAIN";
    reason = "GPS accuracy is too low. Please retry location detection outdoors or near a window.";
  } else if (distanceKm <= effectiveRadiusKm) {
    decision = "WITHIN_RADIUS";
  } else if (gpsAccuracyMeters && distanceKm - uncertaintyKm <= effectiveRadiusKm) {
    decision = "UNCERTAIN";
    reason = "You are very close to the delivery boundary. Please retry for a more accurate GPS fix.";
  } else {
    decision = "OUTSIDE_RADIUS";
    reason = "Your current location is outside the store's delivery area.";
  }

  const isWithinRadius = decision === "WITHIN_RADIUS";
  const deliveryFee = isWithinRadius ? calculateDeliveryFee(distanceKm, baseFee, perKmFee) : 0;

  return {
    isWithinRadius,
    decision,
    reason,
    distanceKm: Math.round(distanceKm * 1000) / 1000,
    displayDistanceKm: Math.round(distanceKm * 100) / 100,
    deliveryFee,
    accuracyMeters: gpsAccuracyMeters,
    effectiveRadiusKm: Math.round(effectiveRadiusKm * 1000) / 1000,
    maxGpsAccuracyMeters,
    uncertaintyKm: Math.round(uncertaintyKm * 1000) / 1000
  };
}
