/**
 * Geographic distance utilities.
 * Used by RouteWizard to auto-estimate km/min between stands from lat/lng.
 */

const EARTH_RADIUS_KM = 6371;

/** Average intercity bus speed (km/h) — used for duration estimation */
export const AVG_INTERCITY_SPEED_KMH = 50;
export const MINUTES_PER_KM = 60 / AVG_INTERCITY_SPEED_KMH; // 1.2

/**
 * Great-circle distance between two lat/lng points (Haversine formula).
 * Returns distance in kilometers. Returns 0 if coordinates are invalid.
 */
export function haversineKm(
  lat1: number | null | undefined,
  lng1: number | null | undefined,
  lat2: number | null | undefined,
  lng2: number | null | undefined
): number {
  if (
    typeof lat1 !== 'number' || typeof lng1 !== 'number' ||
    typeof lat2 !== 'number' || typeof lng2 !== 'number' ||
    isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)
  ) {
    return 0;
  }

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.asin(Math.sqrt(a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Estimate duration in minutes for a given distance.
 * Rounded to nearest minute. Minimum 1 minute for any non-zero distance.
 */
export function estimateMinutes(distanceKm: number): number {
  if (distanceKm <= 0) return 0;
  return Math.max(1, Math.round(distanceKm * MINUTES_PER_KM));
}
