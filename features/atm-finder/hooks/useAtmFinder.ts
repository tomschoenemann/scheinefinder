"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { displayAddress } from "@/lib/atms/address";
import {
  atmsInsideViewport,
  countBankingGroups,
  filterAtms,
  getInstitutionOptions,
  prepareAtmResults,
} from "@/lib/atms/collection";
import { DEFAULT_LOCATION } from "@/lib/atms/constants";
import { hasViewportMoved } from "@/lib/atms/geo";
import type {
  Atm,
  BankingGroup,
  Locality,
  Point,
  SearchViewport,
  ViewportBounds,
} from "@/lib/atms/types";
import { fetchAtms, geocodePlace, reverseGeocode } from "../client-api";
import type { OpenFilter } from "../components/FiltersPanel";

type MobileView = "sidebar" | "map";

export function useAtmFinder() {
  const [center, setCenter] = useState<Point>(DEFAULT_LOCATION);
  const [zoom, setZoom] = useState(15);
  const [query, setQuery] = useState("");
  const [locationLabel, setLocationLabel] = useState("Standort wird ermittelt");
  const [atms, setAtms] = useState<Atm[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isMapDetailExpanded, setIsMapDetailExpanded] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [pendingViewport, setPendingViewport] = useState<SearchViewport | null>(null);
  const [searchedViewport, setSearchedViewport] = useState<SearchViewport | null>(null);
  const [bankingGroups, setBankingGroups] = useState<BankingGroup[]>([]);
  const [institutions, setInstitutions] = useState<string[]>([]);
  const [resolvedLocalities, setResolvedLocalities] = useState<Record<string, Locality>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>("sidebar");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [openFilter, setOpenFilter] = useState<OpenFilter>(null);

  const requestId = useRef(0);
  const lastSearchPoint = useRef<Point>(DEFAULT_LOCATION);
  const lastLoadedBounds = useRef<ViewportBounds | null>(null);
  const filterContainerRef = useRef<HTMLDivElement>(null);

  const loadAtms = useCallback(async (
    point: Point,
    bounds?: ViewportBounds,
    radiusMeters?: number,
    existingRequestId?: number,
  ) => {
    const currentRequest = existingRequestId ?? ++requestId.current;
    lastSearchPoint.current = point;
    lastLoadedBounds.current = bounds ?? null;
    setSearchedViewport(bounds ? { center: point, bounds } : null);
    setPendingViewport(null);

    try {
      const records = await fetchAtms(point, bounds, radiusMeters);
      if (currentRequest !== requestId.current) return;

      const results = prepareAtmResults(point, records);
      setAtms(results);
      setSelectedId(results[0]?.id ?? null);
      setIsMapDetailExpanded(Boolean(results.length));
    } catch {
      if (currentRequest !== requestId.current) return;
      setAtms([]);
      setSelectedId(null);
      setIsMapDetailExpanded(false);
    }
  }, []);

  const locateUser = useCallback((fallbackToDefault = false) => {
    const locationRequestId = ++requestId.current;
    const loadDefaultLocation = () => {
      if (locationRequestId !== requestId.current) return;
      setCenter(DEFAULT_LOCATION);
      setZoom(15);
      setLocationLabel("Berlin Mitte");
      setAtms([]);
      setSelectedId(null);
      setIsLocating(false);
      void loadAtms(DEFAULT_LOCATION, undefined, undefined, locationRequestId);
    };

    if (!navigator.geolocation) {
      if (fallbackToDefault) loadDefaultLocation();
      return;
    }

    setIsLocating(true);
    setLocationLabel("Standort wird ermittelt");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      if (locationRequestId !== requestId.current) return;
      const point = { lat: coords.latitude, lon: coords.longitude };
      setCenter(point);
      setZoom(15);
      setLocationLabel("Dein Standort");
      setAtms([]);
      setSelectedId(null);
      setIsLocating(false);
      void loadAtms(point, undefined, undefined, locationRequestId);
    }, () => {
      if (locationRequestId !== requestId.current) return;
      if (fallbackToDefault) {
        loadDefaultLocation();
      } else {
        setIsLocating(false);
        setLocationLabel("Standort nicht verfügbar");
      }
    }, {
      enableHighAccuracy: true,
      maximumAge: 300_000,
      timeout: 10_000,
    });
  }, [loadAtms]);

  const handleSearch = useCallback<React.FormEventHandler<HTMLFormElement>>(async (event) => {
    event.preventDefault();
    const searchTerm = query.trim();
    if (!searchTerm) return;

    const searchRequestId = ++requestId.current;
    try {
      const result = await geocodePlace(searchTerm);
      if (searchRequestId !== requestId.current) return;

      setCenter(result.point);
      setZoom(15);
      setLocationLabel(result.label);
      setQuery("");
      setAtms([]);
      setSelectedId(null);
      await loadAtms(result.point, undefined, 10_000, searchRequestId);
    } catch {
      // The existing interface has no status surface; keep the current map unchanged.
    }
  }, [loadAtms, query]);

  useEffect(() => {
    const initialize = window.setTimeout(() => {
      setNow(new Date());
      if (window.matchMedia("(max-width: 760px)").matches) setFiltersExpanded(true);
      locateUser(true);
    }, 0);
    const clock = window.setInterval(() => setNow(new Date()), 60_000);
    return () => {
      window.clearTimeout(initialize);
      window.clearInterval(clock);
    };
  }, [locateUser]);

  useEffect(() => {
    const closeFilters = (event: PointerEvent) => {
      if (!filterContainerRef.current?.contains(event.target as Node)) setOpenFilter(null);
    };
    document.addEventListener("pointerdown", closeFilters);
    return () => document.removeEventListener("pointerdown", closeFilters);
  }, []);

  const selectAtm = useCallback((id: string) => {
    const atm = atms.find((item) => item.id === id);
    if (!atm) return;

    lastSearchPoint.current = atm;
    setPendingViewport(null);
    setSelectedId(id);
    setIsMapDetailExpanded(true);
    setCenter({ lat: atm.lat, lon: atm.lon });
    setZoom((currentZoom) => Math.max(currentZoom, 16));
    setMobileView("map");
    document.querySelector(`[data-atm-id="${CSS.escape(id)}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [atms]);

  const handleViewportChange = useCallback((viewport: SearchViewport) => {
    setPendingViewport(
      hasViewportMoved(viewport, lastLoadedBounds.current, lastSearchPoint.current)
        ? viewport
        : null,
    );
  }, []);

  const searchCurrentViewport = useCallback(() => {
    if (!pendingViewport) return;
    setCenter(pendingViewport.center);
    setLocationLabel("Aktueller Kartenausschnitt");
    setAtms([]);
    setSelectedId(null);
    void loadAtms(pendingViewport.center, pendingViewport.bounds);
  }, [loadAtms, pendingViewport]);

  const viewportAtms = useMemo(
    () => atmsInsideViewport(atms, searchedViewport),
    [atms, searchedViewport],
  );
  const groupCounts = useMemo(() => countBankingGroups(viewportAtms), [viewportAtms]);
  const institutionOptions = useMemo(
    () => getInstitutionOptions(viewportAtms),
    [viewportAtms],
  );
  const matchingAtms = useMemo(
    () => filterAtms(viewportAtms, bankingGroups, institutions),
    [viewportAtms, bankingGroups, institutions],
  );
  const effectiveSelectedId = matchingAtms.some((atm) => atm.id === selectedId)
    ? selectedId
    : matchingAtms[0]?.id ?? null;
  const selectedAtm = matchingAtms.find((atm) => atm.id === effectiveSelectedId);
  const resolvedLocality = selectedAtm ? resolvedLocalities[selectedAtm.id] : undefined;

  useEffect(() => {
    if (!selectedAtm
      || !displayAddress(selectedAtm.address)
      || (selectedAtm.postalCode && selectedAtm.city)
      || resolvedLocality !== undefined) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const locality = await reverseGeocode(selectedAtm, controller.signal);
        setResolvedLocalities((current) => ({ ...current, [selectedAtm.id]: locality }));
      } catch {
        if (!controller.signal.aborted) {
          setResolvedLocalities((current) => ({
            ...current,
            [selectedAtm.id]: { postalCode: "", city: "" },
          }));
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [resolvedLocality, selectedAtm]);

  const isSelectedLocalityLoading = Boolean(
    selectedAtm
    && displayAddress(selectedAtm.address)
    && (!selectedAtm.postalCode || !selectedAtm.city)
    && resolvedLocality === undefined,
  );

  return {
    center,
    zoom,
    query,
    locationLabel,
    isLocating,
    pendingViewport,
    bankingGroups,
    institutions,
    sidebarCollapsed,
    mobileView,
    filtersExpanded,
    openFilter,
    isMapDetailExpanded,
    now,
    matchingAtms,
    effectiveSelectedId,
    selectedAtm,
    resolvedLocality,
    isSelectedLocalityLoading,
    groupCounts,
    institutionOptions,
    filterContainerRef,
    setCenter,
    setZoom,
    setQuery,
    setBankingGroups,
    setInstitutions,
    setSidebarCollapsed,
    setMobileView,
    setFiltersExpanded,
    setOpenFilter,
    setIsMapDetailExpanded,
    locateUser,
    handleSearch,
    selectAtm,
    handleViewportChange,
    searchCurrentViewport,
  };
}
