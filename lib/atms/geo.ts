import type { Point, SearchViewport, ViewportBounds } from "./types";

const EARTH_RADIUS_KM = 6371;

function toRadians(value: number) {
  return value * Math.PI / 180;
}

export function distanceKm(a: Point, b: Point) {
  const latitudeDelta = toRadians(b.lat - a.lat);
  const longitudeDelta = toRadians(b.lon - a.lon);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(a.lat))
      * Math.cos(toRadians(b.lat))
      * Math.sin(longitudeDelta / 2) ** 2;

  return EARTH_RADIUS_KM * 2
    * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function distanceMeters(a: Point, b: Point) {
  return distanceKm(a, b) * 1000;
}

export function formatDistance(distance: number) {
  return distance < 1
    ? `${Math.max(10, Math.round(distance * 100)) * 10} m`
    : `${distance.toFixed(1).replace(".", ",")} km`;
}

export function isPointInsideBounds(point: Point, bounds: ViewportBounds) {
  return point.lat >= bounds.south
    && point.lat <= bounds.north
    && point.lon >= bounds.west
    && point.lon <= bounds.east;
}

export function hasViewportMoved(
  viewport: SearchViewport,
  loadedBounds: ViewportBounds | null,
  lastSearchPoint: Point,
) {
  if (!loadedBounds) {
    return distanceKm(lastSearchPoint, viewport.center) >= 0.2;
  }

  const latitudeSpan = Math.max(0.000001, viewport.bounds.north - viewport.bounds.south);
  const longitudeSpan = Math.max(0.000001, viewport.bounds.east - viewport.bounds.west);

  return Math.abs(viewport.bounds.south - loadedBounds.south) > latitudeSpan * 0.08
    || Math.abs(viewport.bounds.north - loadedBounds.north) > latitudeSpan * 0.08
    || Math.abs(viewport.bounds.west - loadedBounds.west) > longitudeSpan * 0.08
    || Math.abs(viewport.bounds.east - loadedBounds.east) > longitudeSpan * 0.08;
}
