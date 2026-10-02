import type { Locality, Point } from "./types";

export type GeocodedPlace = {
  point: Point;
  label: string;
};

export function normalizeGermanPlaceQuery(query: string) {
  const normalizedQuery = query.trim().replace(/\s+/g, " ");
  return /^\d{5}$/.test(normalizedQuery)
    ? `${normalizedQuery}, Deutschland`
    : normalizedQuery;
}

export function parseGeocodedPlace(payload: unknown): GeocodedPlace | null {
  if (!Array.isArray(payload)) return null;
  const candidate = payload[0];
  if (!candidate || typeof candidate !== "object") return null;

  const result = candidate as Record<string, unknown>;
  const address = result.address && typeof result.address === "object"
    ? result.address as Record<string, unknown>
    : null;
  if (address?.country_code !== "de") return null;

  const lat = Number(result.lat);
  const lon = Number(result.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

  const displayName = typeof result.display_name === "string" ? result.display_name : "";
  return {
    point: { lat, lon },
    label: displayName.split(",").slice(0, 2).join(",").slice(0, 200),
  };
}

export function parseLocality(payload: unknown): Locality {
  if (!payload || typeof payload !== "object") return { postalCode: "", city: "" };
  const result = payload as Record<string, unknown>;
  const address = result.address && typeof result.address === "object"
    ? result.address as Record<string, unknown>
    : {};
  const city = [address.city, address.town, address.village, address.municipality]
    .find((value) => typeof value === "string");

  return {
    postalCode: typeof address.postcode === "string" ? address.postcode.slice(0, 20) : "",
    city: typeof city === "string" ? city.slice(0, 120) : "",
  };
}
