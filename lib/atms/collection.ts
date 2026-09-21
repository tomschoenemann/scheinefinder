import { BANKING_GROUPS, DUPLICATE_DISTANCE_KM, MAX_RESULTS } from "./constants";
import { bankKey, getBankingGroups, institutionName } from "./banks";
import { distanceKm, isPointInsideBounds } from "./geo";
import type {
  Atm,
  AtmRecord,
  BankingGroup,
  Point,
  SearchViewport,
} from "./types";

export function addDistances(origin: Point, atms: ReadonlyArray<AtmRecord>): Atm[] {
  return atms
    .map((atm) => ({ ...atm, distance: distanceKm(origin, atm) }))
    .sort((a, b) => a.distance - b.distance);
}

export function removeDuplicateAtms<T extends AtmRecord>(
  atms: ReadonlyArray<T>,
  duplicateDistanceKm = DUPLICATE_DISTANCE_KM,
): T[] {
  const bucketSizeDegrees = 0.001;
  const spatialBuckets = new Map<string, T[]>();
  const acceptedIds = new Set<string>();
  const uniqueAtms: T[] = [];

  for (const atm of atms) {
    if (acceptedIds.has(atm.id)) continue;
    const institutionKey = bankKey(atm);
    const latitudeBucket = Math.floor(atm.lat / bucketSizeDegrees);
    const longitudeBucket = Math.floor(atm.lon / bucketSizeDegrees);
    const latitudeBucketRange = Math.max(
      1,
      Math.ceil(duplicateDistanceKm / (111.32 * bucketSizeDegrees)),
    );
    const longitudeKmPerDegree = Math.max(
      0.001,
      111.32 * Math.cos(atm.lat * Math.PI / 180),
    );
    const longitudeBucketRange = Math.max(
      1,
      Math.ceil(duplicateDistanceKm / (longitudeKmPerDegree * bucketSizeDegrees)),
    );
    const nearbyAtms: T[] = [];
    for (let latitudeOffset = -latitudeBucketRange; latitudeOffset <= latitudeBucketRange; latitudeOffset += 1) {
      for (let longitudeOffset = -longitudeBucketRange; longitudeOffset <= longitudeBucketRange; longitudeOffset += 1) {
        const key = `${institutionKey}:${latitudeBucket + latitudeOffset}:${longitudeBucket + longitudeOffset}`;
        nearbyAtms.push(...(spatialBuckets.get(key) ?? []));
      }
    }
    if (nearbyAtms.some((candidate) => distanceKm(candidate, atm) < duplicateDistanceKm)) {
      continue;
    }

    acceptedIds.add(atm.id);
    const ownBucketKey = `${institutionKey}:${latitudeBucket}:${longitudeBucket}`;
    spatialBuckets.set(ownBucketKey, [...(spatialBuckets.get(ownBucketKey) ?? []), atm]);
    uniqueAtms.push(atm);
  }

  return uniqueAtms;
}

export function prepareAtmResults(origin: Point, atms: ReadonlyArray<AtmRecord>) {
  return removeDuplicateAtms(addDistances(origin, atms)).slice(0, MAX_RESULTS);
}

export function atmsInsideViewport(atms: ReadonlyArray<Atm>, viewport: SearchViewport | null) {
  return viewport ? atms.filter((atm) => isPointInsideBounds(atm, viewport.bounds)) : [...atms];
}

export function countBankingGroups(atms: ReadonlyArray<Atm>) {
  const counts = new Map<BankingGroup, number>(
    BANKING_GROUPS.map((group) => [group.value, 0]),
  );
  for (const atm of atms) {
    for (const group of getBankingGroups(atm)) {
      counts.set(group, (counts.get(group) ?? 0) + 1);
    }
  }
  return counts;
}

export function getInstitutionOptions(atms: ReadonlyArray<Atm>) {
  const counts = new Map<string, number>();
  for (const atm of atms) {
    const name = institutionName(atm);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "de"));
}

export function filterAtms(
  atms: ReadonlyArray<Atm>,
  bankingGroups: ReadonlyArray<BankingGroup>,
  institutions: ReadonlyArray<string>,
) {
  return atms.filter((atm) =>
    (!bankingGroups.length
      || getBankingGroups(atm).some((group) => bankingGroups.includes(group)))
    && (!institutions.length || institutions.includes(institutionName(atm)))
  );
}
