import type { Point, ViewportBounds } from "./types";

const MIN_RADIUS_METERS = 500;
const MAX_RADIUS_METERS = 20_000;
const MAX_LATITUDE_SPAN = 2;
const MAX_LONGITUDE_SPAN = 3;

export type AtmSearchQuery = {
  center: Point;
  bounds?: ViewportBounds;
  radiusMeters: number;
};

export type QueryValidationResult =
  | { ok: true; value: AtmSearchQuery }
  | { ok: false; error: string };

function readNumber(parameters: URLSearchParams, name: string) {
  const value = parameters.get(name);
  return value === null || value.trim() === "" ? Number.NaN : Number(value);
}

function isValidPoint(point: Point) {
  return Number.isFinite(point.lat)
    && Number.isFinite(point.lon)
    && point.lat >= -90
    && point.lat <= 90
    && point.lon >= -180
    && point.lon <= 180;
}

function readBounds(parameters: URLSearchParams): ViewportBounds | null {
  const names = ["south", "west", "north", "east"] as const;
  if (!names.every((name) => parameters.has(name))) return null;

  return {
    south: readNumber(parameters, "south"),
    west: readNumber(parameters, "west"),
    north: readNumber(parameters, "north"),
    east: readNumber(parameters, "east"),
  };
}

function isValidBounds(bounds: ViewportBounds) {
  return Number.isFinite(bounds.south)
    && Number.isFinite(bounds.west)
    && Number.isFinite(bounds.north)
    && Number.isFinite(bounds.east)
    && bounds.south >= -90
    && bounds.north <= 90
    && bounds.west >= -180
    && bounds.east <= 180
    && bounds.south < bounds.north
    && bounds.west < bounds.east;
}

export function parseAtmSearchQuery(parameters: URLSearchParams): QueryValidationResult {
  const center = {
    lat: readNumber(parameters, "lat"),
    lon: readNumber(parameters, "lon"),
  };
  if (!isValidPoint(center)) {
    return { ok: false, error: "Ungültige Koordinaten" };
  }

  const hasAnyBounds = ["south", "west", "north", "east"].some((name) =>
    parameters.has(name)
  );
  const bounds = readBounds(parameters);
  if (hasAnyBounds && !bounds) {
    return { ok: false, error: "Unvollständiger Kartenausschnitt" };
  }
  if (bounds && !isValidBounds(bounds)) {
    return { ok: false, error: "Ungültiger Kartenausschnitt" };
  }
  if (bounds
    && (bounds.north - bounds.south > MAX_LATITUDE_SPAN
      || bounds.east - bounds.west > MAX_LONGITUDE_SPAN)) {
    return { ok: false, error: "Kartenausschnitt ist zu groß" };
  }

  const hasRadius = parameters.has("radius");
  const radiusMeters = hasRadius ? readNumber(parameters, "radius") : 5000;
  if (!Number.isFinite(radiusMeters)
    || radiusMeters < MIN_RADIUS_METERS
    || radiusMeters > MAX_RADIUS_METERS) {
    return { ok: false, error: "Ungültiger Suchradius" };
  }

  return { ok: true, value: { center, bounds: bounds ?? undefined, radiusMeters } };
}
