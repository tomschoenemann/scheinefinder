"use client";

import * as maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { formatDistance } from "@/lib/atms/geo";
import type { Atm, Point, SearchViewport } from "@/lib/atms/types";
import { BankLogo } from "./BankLogo";
import { Icon } from "./Icon";

type MapViewProps = {
  center: Point;
  zoom: number;
  atms: Atm[];
  selectedId: string | null;
  onCenterChange: (point: Point) => void;
  onZoomChange: (zoom: number) => void;
  onViewportChange: (viewport: SearchViewport) => void;
  onInteractionStart: () => void;
  onSelect: (id: string) => void;
};

export function MapView({
  center,
  zoom,
  atms,
  selectedId,
  onCenterChange,
  onZoomChange,
  onViewportChange,
  onInteractionStart,
  onSelect,
}: MapViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const initialViewRef = useRef({ center, zoom });
  const callbacksRef = useRef({
    onCenterChange,
    onZoomChange,
    onViewportChange,
    onInteractionStart,
  });
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [viewportVersion, setViewportVersion] = useState(0);

  useEffect(() => {
    callbacksRef.current = {
      onCenterChange,
      onZoomChange,
      onViewportChange,
      onInteractionStart,
    };
  }, [onCenterChange, onZoomChange, onViewportChange, onInteractionStart]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const initialView = initialViewRef.current;
    maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
    const mapInstance = new maplibregl.Map({
      container,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [initialView.center.lon, initialView.center.lat],
      zoom: initialView.zoom,
      minZoom: 3,
      maxZoom: 19,
      attributionControl: false,
      canvasContextAttributes: {
        antialias: true,
        preserveDrawingBuffer: true,
        desynchronized: false,
      },
    });
    mapRef.current = mapInstance;
    setMap(mapInstance);
    mapInstance.scrollZoom.setWheelZoomRate(1 / 800);
    mapInstance.scrollZoom.setZoomRate(1 / 120);

    const root = rootRef.current;
    const forwardMarkerWheelToMap = (event: WheelEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest(".map-marker")) return;
      event.preventDefault();
      event.stopPropagation();
      mapInstance.getCanvas().dispatchEvent(new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: event.clientX,
        clientY: event.clientY,
        screenX: event.screenX,
        screenY: event.screenY,
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        deltaZ: event.deltaZ,
        deltaMode: event.deltaMode,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      }));
    };
    const collapseDetails = () => callbacksRef.current.onInteractionStart();
    const refreshMarkers = () => setViewportVersion((value) => value + 1);
    const publishViewport = () => {
      const nextCenter = mapInstance.getCenter();
      callbacksRef.current.onCenterChange({ lat: nextCenter.lat, lon: nextCenter.lng });
      callbacksRef.current.onZoomChange(mapInstance.getZoom());
      const bounds = mapInstance.getBounds();
      callbacksRef.current.onViewportChange({
        center: { lat: nextCenter.lat, lon: nextCenter.lng },
        bounds: {
          south: bounds.getSouth(),
          west: bounds.getWest(),
          north: bounds.getNorth(),
          east: bounds.getEast(),
        },
      });
    };
    const finishLoad = () => {
      refreshMarkers();
      publishViewport();
    };

    root?.addEventListener("wheel", forwardMarkerWheelToMap, { passive: false });
    container.addEventListener("wheel", collapseDetails, { passive: true });
    mapInstance.on("load", finishLoad);
    mapInstance.on("move", refreshMarkers);
    mapInstance.on("dragstart", collapseDetails);
    mapInstance.on("moveend", publishViewport);

    return () => {
      root?.removeEventListener("wheel", forwardMarkerWheelToMap);
      container.removeEventListener("wheel", collapseDetails);
      mapRef.current = null;
      mapInstance.remove();
    };
  }, []);

  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    const currentCenter = mapInstance.getCenter();
    const viewChanged = Math.abs(currentCenter.lat - center.lat) > 0.000001
      || Math.abs(currentCenter.lng - center.lon) > 0.000001
      || Math.abs(mapInstance.getZoom() - zoom) > 0.001;
    if (!viewChanged) return;

    const mobileSelectedOffset = selectedId
      && window.matchMedia("(max-width: 760px)").matches
      ? -mapInstance.getContainer().clientHeight / 4
      : 0;
    mapInstance.easeTo({
      center: [center.lon, center.lat],
      zoom,
      offset: [0, mobileSelectedOffset],
      duration: 450,
    });
  }, [center.lat, center.lon, selectedId, zoom]);

  return (
    <div
      className="map"
      ref={rootRef}
      data-viewport-version={viewportVersion}
      aria-label="OpenStreetMap-Karte mit Geldautomaten"
    >
      <div className="map-canvas" ref={containerRef} />
      {map && atms.map((atm) => {
        const point = map.project([atm.lon, atm.lat]);
        const canvas = map.getCanvas();
        const isOutsideMap = point.x < -60
          || point.x > canvas.clientWidth + 60
          || point.y < -60
          || point.y > canvas.clientHeight + 60;
        if (isOutsideMap) return null;

        return (
          <button
            key={atm.id}
            className={`map-marker ${selectedId === atm.id ? "selected" : ""}`}
            style={{ left: point.x, top: point.y }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onSelect(atm.id)}
            aria-label={`${atm.name}, ${formatDistance(atm.distance)}`}
          >
            <BankLogo name={atm.name} compact />
          </button>
        );
      })}
      <div className="map-actions">
        <button
          onClick={() => {
            callbacksRef.current.onInteractionStart();
            mapRef.current?.zoomIn({ duration: 300 });
          }}
          aria-label="Vergrößern"
        >
          <Icon name="plus" />
        </button>
        <button
          onClick={() => {
            callbacksRef.current.onInteractionStart();
            mapRef.current?.zoomOut({ duration: 300 });
          }}
          aria-label="Verkleinern"
        >
          <Icon name="minus" />
        </button>
      </div>
      <div className="attribution">
        © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>
        {" · "}
        <a href="https://openfreemap.org/" target="_blank" rel="noreferrer">OpenFreeMap</a>
      </div>
    </div>
  );
}
