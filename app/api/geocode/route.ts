import {
  normalizeGermanPlaceQuery,
  parseGeocodedPlace,
} from "@/lib/atms/geocoding";
import { jsonError, PUBLIC_DAY_CACHE } from "@/lib/http/responses";

const MAX_QUERY_LENGTH = 200;

export async function GET(request: Request) {
  const query = normalizeGermanPlaceQuery(
    new URL(request.url).searchParams.get("q") ?? "",
  );
  if (!query || query.length > MAX_QUERY_LENGTH) {
    return jsonError("Ungültiger Suchbegriff", 400);
  }

  const parameters = new URLSearchParams({
    format: "jsonv2",
    limit: "1",
    "accept-language": "de",
    countrycodes: "de",
    addressdetails: "1",
    q: query,
  });

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${parameters}`, {
      headers: { "User-Agent": "Scheinefinder/1.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) throw new Error("Nominatim request failed");

    const result = parseGeocodedPlace(await response.json());
    if (!result) return jsonError("Ort wurde in Deutschland nicht gefunden", 404);
    return Response.json(result, { headers: PUBLIC_DAY_CACHE });
  } catch {
    return jsonError("Die Suche ist gerade nicht erreichbar", 502);
  }
}
