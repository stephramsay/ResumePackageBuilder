export const DEFAULT_GA_MEASUREMENT_ID = "G-GW00L7PRZH";

export function resolveGaMeasurementId(value = process.env.GA_MEASUREMENT_ID) {
  return normalizeGaMeasurementId(value || DEFAULT_GA_MEASUREMENT_ID);
}

export function normalizeGaMeasurementId(measurementId) {
  const value = String(measurementId ?? "").trim();
  if (!value) return "";
  return /^[A-Za-z0-9_-]+$/.test(value) ? value : "";
}
