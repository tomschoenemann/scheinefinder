import { parseLocality } from "@/lib/atms/geocoding";
import { parseAtmSearchQuery } from "@/lib/atms/search-query";
import { jsonError, PUBLIC_DAY_CACHE } from "@/lib/http/responses";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = parseAtmSearchQuery(url.searchParams);
  if (!query.ok) return jsonError(query.error, 400);

  const { lat, lon } = query.value.center;
  const parameters = new URLSearchParams({
    format: "jsonv2",
    lat: String(lat),
    lon: String(lon),
    zoom: "18",
    addressdetails: "1",
    "accept-language": "de",
  });

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${parameters}`, {
      headers: { "User-Agent": "Scheinefinder/1.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) throw new Error("Nominatim request failed");
    return Response.json(parseLocality(await response.json()), {
      headers: PUBLIC_DAY_CACHE,
    });
  } catch {
    return jsonError("Adressdaten konnten gerade nicht geladen werden", 502);
  }
}
