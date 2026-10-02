import customAtmData from "@/data/custom-atms.json";
import { removeDuplicateAtms } from "@/lib/atms/collection";
import { distanceMeters, isPointInsideBounds } from "@/lib/atms/geo";
import { findOsmAtms } from "@/lib/atms/overpass";
import { parseAtmSearchQuery } from "@/lib/atms/search-query";
import type { AtmRecord } from "@/lib/atms/types";
import { jsonError, PUBLIC_SHORT_CACHE } from "@/lib/http/responses";

type CustomAtm = Omit<AtmRecord, "source">;

export async function GET(request: Request) {
  const searchQuery = parseAtmSearchQuery(new URL(request.url).searchParams);
  if (!searchQuery.ok) return jsonError(searchQuery.error, 400);

  const { center, bounds, radiusMeters } = searchQuery.value;
  const searchArea = bounds
    ? `(${bounds.south},${bounds.west},${bounds.north},${bounds.east})`
    : `(around:${radiusMeters},${center.lat},${center.lon})`;

  try {
    const osmAtms = await findOsmAtms(searchArea);
    const customAtms = (customAtmData.atms as CustomAtm[])
      .filter((atm) => bounds
        ? isPointInsideBounds(atm, bounds)
        : distanceMeters(center, atm) <= radiusMeters)
      .map((atm): AtmRecord => ({ ...atm, source: "custom" }));

    return Response.json(
      { atms: removeDuplicateAtms([...customAtms, ...osmAtms]) },
      { headers: PUBLIC_SHORT_CACHE },
    );
  } catch {
    return jsonError("Automatendaten konnten gerade nicht geladen werden", 503);
  }
}
