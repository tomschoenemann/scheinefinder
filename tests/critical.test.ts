import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { displayAddress, displayAddressLines } from "../lib/atms/address";
import { getBankIdentity, getBankingGroups, institutionName } from "../lib/atms/banks";
import {
  filterAtms,
  prepareAtmResults,
  removeDuplicateAtms,
} from "../lib/atms/collection";
import {
  normalizeGermanPlaceQuery,
  parseGeocodedPlace,
  parseLocality,
} from "../lib/atms/geocoding";
import { distanceKm, formatDistance, hasViewportMoved } from "../lib/atms/geo";
import {
  getOpeningStatus,
  openingHourDetails,
  parseOpeningHours,
} from "../lib/atms/opening-hours";
import { parseAtmSearchQuery } from "../lib/atms/search-query";
import type { Atm, AtmRecord, SearchViewport } from "../lib/atms/types";

const berlin = { lat: 52.5208, lon: 13.4095 };

describe("geographic calculations", () => {
  it("calculates zero distance for the same point", () => {
    assert.equal(distanceKm(berlin, berlin), 0);
  });

  it("calculates a plausible distance between Berlin and Hamburg", () => {
    const distance = distanceKm(berlin, { lat: 53.5511, lon: 9.9937 });
    assert.ok(distance > 250 && distance < 260);
  });

  it("formats distances for the existing German UI", () => {
    assert.equal(formatDistance(0.154), "150 m");
    assert.equal(formatDistance(1.25), "1,3 km");
  });

  it("detects a meaningfully moved viewport", () => {
    const viewport: SearchViewport = {
      center: { lat: 52.53, lon: 13.42 },
      bounds: { south: 52.5, west: 13.39, north: 52.56, east: 13.45 },
    };
    assert.equal(hasViewportMoved(viewport, null, berlin), true);
    assert.equal(hasViewportMoved(viewport, viewport.bounds, berlin), false);
  });
});

describe("ATM collection operations", () => {
  const records: AtmRecord[] = [
    { id: "1", name: "Sparkasse", address: "A", lat: 52.52, lon: 13.4 },
    { id: "2", name: "Sparkasse", address: "B", lat: 52.5201, lon: 13.4001 },
    { id: "3", name: "Commerzbank", address: "C", lat: 52.5201, lon: 13.4001 },
  ];

  it("removes nearby duplicates for the same institution", () => {
    assert.deepEqual(removeDuplicateAtms(records).map((atm) => atm.id), ["1", "3"]);
  });

  it("sorts prepared results by distance", () => {
    const prepared = prepareAtmResults(berlin, [
      { id: "far", name: "A", address: "", lat: 52.6, lon: 13.4 },
      { id: "near", name: "B", address: "", lat: 52.521, lon: 13.4095 },
    ]);
    assert.deepEqual(prepared.map((atm) => atm.id), ["near", "far"]);
  });

  it("combines group and institution filters", () => {
    const atms = prepareAtmResults(berlin, records) as Atm[];
    assert.deepEqual(filterAtms(atms, ["sparkassen"], []).map((atm) => atm.id), ["2"]);
    assert.deepEqual(filterAtms(atms, [], ["Commerzbank"]).map((atm) => atm.id), ["3"]);
  });
});

describe("bank classification", () => {
  it("resolves known bank branding", () => {
    assert.deepEqual(getBankIdentity("Deutsche Bank Geldautomat"), {
      code: "DB",
      variant: "deutsche-bank",
      logoFile: "deutsche-bank.svg",
    });
  });

  it("creates a readable fallback abbreviation", () => {
    assert.equal(getBankIdentity("Meine Region Bank").code, "MR");
  });

  it("normalizes institution names and group memberships", () => {
    assert.equal(institutionName({ name: "Commerzbank AG" }), "Commerzbank");
    assert.deepEqual(getBankingGroups({ name: "Sparda-Bank" }), ["cashpool", "service-network"]);
  });
});

describe("opening hours", () => {
  it("parses weekday ranges", () => {
    const schedule = parseOpeningHours("Mo-Fr 08:00-18:00");
    assert.equal(schedule?.days.size, 5);
  });

  it("reports an open interval in Berlin time", () => {
    const mondayMorning = new Date("2026-11-09T09:00:00+01:00");
    assert.deepEqual(getOpeningStatus("Mo-Fr 08:00-18:00", mondayMorning), {
      text: "Bis 18:00 Uhr geöffnet",
      isOpen: true,
    });
  });

  it("handles intervals crossing midnight", () => {
    const saturdayNight = new Date("2026-11-14T01:00:00+01:00");
    assert.deepEqual(getOpeningStatus("Fr 22:00-02:00", saturdayNight), {
      text: "Bis 02:00 Uhr geöffnet",
      isOpen: true,
    });
  });

  it("formats detail rows without changing their meaning", () => {
    assert.deepEqual(openingHourDetails("Mo-Fr 08:00-18:00; Sa 09:00-13:00"), [
      "Mo-Fr 08:00–18:00",
      "Sa 09:00–13:00",
    ]);
  });
});

describe("request validation", () => {
  it("rejects missing coordinates", () => {
    const result = parseAtmSearchQuery(new URLSearchParams());
    assert.equal(result.ok, false);
  });

  it("accepts a bounded search", () => {
    const result = parseAtmSearchQuery(new URLSearchParams({
      lat: "52.52",
      lon: "13.4",
      south: "52.4",
      west: "13.2",
      north: "52.6",
      east: "13.6",
    }));
    assert.equal(result.ok, true);
  });

  it("rejects partial or excessively large bounds", () => {
    assert.equal(parseAtmSearchQuery(new URLSearchParams({
      lat: "52.52", lon: "13.4", south: "52.4",
    })).ok, false);
    assert.equal(parseAtmSearchQuery(new URLSearchParams({
      lat: "52.52", lon: "13.4", south: "40", west: "0", north: "55", east: "20",
    })).ok, false);
  });

  it("rejects an abusive radius", () => {
    const result = parseAtmSearchQuery(new URLSearchParams({
      lat: "52.52", lon: "13.4", radius: "1000000",
    }));
    assert.equal(result.ok, false);
  });
});

describe("external geocoding data", () => {
  it("normalizes postal codes for German search", () => {
    assert.equal(normalizeGermanPlaceQuery(" 10115 "), "10115, Deutschland");
  });

  it("accepts a valid German result and rejects foreign results", () => {
    const valid = parseGeocodedPlace([{
      lat: "52.52",
      lon: "13.4",
      display_name: "Berlin, Deutschland",
      address: { country_code: "de" },
    }]);
    assert.deepEqual(valid, { point: { lat: 52.52, lon: 13.4 }, label: "Berlin, Deutschland" });
    assert.equal(parseGeocodedPlace([{
      lat: "48.2",
      lon: "16.3",
      display_name: "Wien, Österreich",
      address: { country_code: "at" },
    }]), null);
  });

  it("reduces reverse-geocoding payloads to a safe locality DTO", () => {
    assert.deepEqual(parseLocality({
      address: { postcode: "10115", city: "Berlin", private: "ignored" },
      licence: "ignored",
    }), { postalCode: "10115", city: "Berlin" });
  });
});

describe("address presentation", () => {
  it("hides placeholder addresses", () => {
    assert.equal(displayAddress("Adresse nicht hinterlegt"), null);
  });

  it("prefers explicit postal code and city", () => {
    assert.deepEqual(displayAddressLines({
      address: "Alexanderplatz 1, 10178 Berlin",
      postalCode: "10178",
      city: "Berlin",
    }), { street: "Alexanderplatz 1", locality: "10178 Berlin" });
  });
});
