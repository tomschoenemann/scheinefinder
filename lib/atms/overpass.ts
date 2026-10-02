import "server-only";

import type { AtmRecord } from "./types";

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const OVERPASS_ENDPOINTS = [
  "https://ovp.dresel.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

function cleanText(value: unknown, maxLength = 200) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength)
    : "";
}

async function queryOverpass(query: string) {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "Scheinefinder/1.0",
        },
        body: new URLSearchParams({ data: query }),
        cache: "no-store",
        signal: AbortSignal.timeout(7000),
      });
      if (!response.ok) continue;

      const payload = await response.json() as unknown;
      if (payload && typeof payload === "object") {
        const elements = (payload as { elements?: unknown }).elements;
        if (Array.isArray(elements)) return elements as OverpassElement[];
      }
    } catch {
      // Public Overpass instances can be busy; try the next configured endpoint.
    }
  }

  throw new Error("No Overpass instance available");
}

function elementToAtm(value: unknown): AtmRecord | null {
  if (!value || typeof value !== "object") return null;
  const element = value as OverpassElement;
  if (!["node", "way", "relation"].includes(element.type)) return null;
  if (!Number.isFinite(element.id)) return null;
  const coordinates = element.type === "node"
    ? { lat: element.lat, lon: element.lon }
    : element.center;
  if (!coordinates
    || typeof coordinates.lat !== "number"
    || typeof coordinates.lon !== "number"
    || !Number.isFinite(coordinates.lat)
    || !Number.isFinite(coordinates.lon)) {
    return null;
  }

  const tags = element.tags ?? {};
  if (tags.cash_out === "no" || tags.cash_in === "only") return null;
  const isAtmOrBank = tags.amenity === "atm" || tags.amenity === "bank";
  const explicitAtmOperator = tags["atm:brand"] || tags["atm:operator"] || tags["atm:name"];
  const operator = cleanText(
    explicitAtmOperator || (isAtmOrBank ? tags.brand || tags.operator || tags.name : undefined),
  ) || "Geldautomat";
  const streetAddress = [cleanText(tags["addr:street"]), cleanText(tags["addr:housenumber"], 40)]
    .filter(Boolean)
    .join(" ");

  return {
    id: `${element.type}-${element.id}`,
    lat: coordinates.lat,
    lon: coordinates.lon,
    name: operator,
    operator,
    address: cleanText(tags["addr:full"]) || streetAddress || cleanText(tags["addr:place"]),
    postalCode: cleanText(tags["addr:postcode"], 20) || undefined,
    city: cleanText(tags["addr:city"] || tags["addr:town"] || tags["addr:village"] || tags["addr:municipality"], 120) || undefined,
    openingHours: cleanText(tags["opening_hours:atm"] || tags.opening_hours, 500) || undefined,
    source: "osm",
  };
}

export async function findOsmAtms(searchArea: string) {
  const query = `[out:json][timeout:8];(
    nwr${searchArea}["amenity"="atm"];
    nwr${searchArea}["atm"="yes"];
  );out center tags;`;
  const elements = await queryOverpass(query);
  return elements.flatMap((element) => {
    const atm = elementToAtm(element);
    return atm ? [atm] : [];
  });
}
