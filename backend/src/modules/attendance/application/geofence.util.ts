export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface GeofenceConfig {
  latitude: number;
  longitude: number;
  allowedRadius: number;
}

export interface GeofenceResult {
  isConfigured: boolean;
  distance: number | null;
  inside: boolean;
  accuracyWarning: boolean;
}

export const GPS_ACCURACY_WARNING = 30;

export function evaluateGeofence(
  config: GeofenceConfig | null,
  lat: number | null | undefined,
  lng: number | null | undefined,
  accuracy: number | null | undefined,
): GeofenceResult {
  if (!config || lat == null || lng == null) {
    return { isConfigured: false, distance: null, inside: true, accuracyWarning: false };
  }

  const distance = haversineDistance(lat, lng, config.latitude, config.longitude);
  const inside = distance <= config.allowedRadius;
  const accuracyWarning = accuracy != null && accuracy > GPS_ACCURACY_WARNING;

  return { isConfigured: true, distance, inside, accuracyWarning };
}
