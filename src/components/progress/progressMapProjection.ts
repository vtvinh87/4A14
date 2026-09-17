export type ProgressMapPoint = {
  latitude: number;
  longitude: number;
};

export type ProgressMapViewport = {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
};

export const PROGRESS_MAP_VIEWPORT: ProgressMapViewport = {
  minLatitude: 6.7,
  maxLatitude: 23.5,
  minLongitude: 102.1,
  maxLongitude: 118.0,
};

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function projectProgressMapPoint(
  point: ProgressMapPoint,
  viewport: ProgressMapViewport = PROGRESS_MAP_VIEWPORT,
): { left: number; top: number } {
  const longitudeSpan = viewport.maxLongitude - viewport.minLongitude;
  const latitudeSpan = viewport.maxLatitude - viewport.minLatitude;
  const left = longitudeSpan === 0 ? 0 : ((point.longitude - viewport.minLongitude) / longitudeSpan) * 100;
  const top = latitudeSpan === 0 ? 0 : ((viewport.maxLatitude - point.latitude) / latitudeSpan) * 100;
  return { left: clampPercent(left), top: clampPercent(top) };
}
