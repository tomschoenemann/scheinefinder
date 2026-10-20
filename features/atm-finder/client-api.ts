import type {
  AtmRecord,
  Locality,
  Point,
  ViewportBounds,
} from "@/lib/atms/types";

type GeocodedPlace = {
  point: Point;
  label: string;
};

const REQUEST_TIMEOUT_MS = 15_000;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  return response.json() as Promise<T>;
}

export async function fetchAtms(
  point: Point,
  bounds?: ViewportBounds,
  radiusMeters?: number,
) {
  const parameters = new URLSearchParams({
    lat: String(point.lat),
    lon: String(point.lon),
  });
  if (bounds) {
    parameters.set("south", String(bounds.south));
    parameters.set("west", String(bounds.west));
    parameters.set("north", String(bounds.north));
    parameters.set("east", String(bounds.east));
  } else if (radiusMeters) {
    parameters.set("radius", String(radiusMeters));
  }

  const result = await fetchJson<{ atms: AtmRecord[] }>(`/api/atms?${parameters}`);
  if (!Array.isArray(result.atms)) throw new Error("Invalid ATM response");
  return result.atms;
}

export function geocodePlace(query: string) {
  const parameters = new URLSearchParams({ q: query });
  return fetchJson<GeocodedPlace>(`/api/geocode?${parameters}`);
}

export function reverseGeocode(point: Point, signal: AbortSignal) {
  const parameters = new URLSearchParams({
    lat: String(point.lat),
    lon: String(point.lon),
  });
  return fetch(`/api/reverse-geocode?${parameters}`, { signal }).then(async (response) => {
    if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
    return response.json() as Promise<Locality>;
  });
}
