"use client";

import { displayAddressLines } from "@/lib/atms/address";
import { getOpeningStatus, openingHourDetails } from "@/lib/atms/opening-hours";
import type { Atm, Locality } from "@/lib/atms/types";
import { BankLogo } from "./BankLogo";
import { Icon } from "./Icon";

type AtmDetailProps = {
  atm: Atm;
  locality?: Locality;
  isLocalityLoading: boolean;
  expanded: boolean;
  now: Date | null;
  onExpandedChange: (expanded: boolean) => void;
};

export function AtmDetail({
  atm,
  locality,
  isLocalityLoading,
  expanded,
  now,
  onExpandedChange,
}: AtmDetailProps) {
  const address = displayAddressLines({
    ...atm,
    postalCode: atm.postalCode || locality?.postalCode,
    city: atm.city || locality?.city,
  });
  const openingStatus = now ? getOpeningStatus(atm.openingHours, now) : null;
  const openingDetails = openingHourDetails(atm.openingHours);

  return (
    <div className={`map-detail ${expanded ? "expanded" : ""}`}>
      <button
        type="button"
        className="map-detail-toggle"
        onClick={() => onExpandedChange(!expanded)}
        aria-expanded={expanded}
        aria-controls="selected-atm-details"
      >
        <span className="detail-icon">
          <BankLogo key={atm.id} name={atm.name} priority />
        </span>
        <span className="map-detail-summary">
          <small>AUSGEWÄHLTER GELDAUTOMAT</small>
          <strong>{atm.name}</strong>
          <span className={openingStatus ? (openingStatus.isOpen ? "is-open" : "is-closed") : undefined}>
            {openingStatus?.text || "Öffnungszeiten nicht verfügbar"}
          </span>
        </span>
        <span className="map-detail-chevron">
          <Icon name="chevron" size={18} />
        </span>
      </button>
      <div className="map-detail-route-panel">
        <span className="map-detail-route-heading">Route planen mit …</span>
        <div className="map-detail-routes">
          <a
            className="map-detail-route map-detail-route--apple"
            href={`https://maps.apple.com/?daddr=${atm.lat}%2C${atm.lon}&dirflg=d`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Route in Apple Maps öffnen"
          >
            <span className="route-service-icon route-service-icon--apple" aria-hidden />
            <span>Apple Maps</span>
          </a>
          <a
            className="map-detail-route map-detail-route--google"
            href={`https://www.google.com/maps/dir/?api=1&destination=${atm.lat}%2C${atm.lon}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Route in Google Maps öffnen"
          >
            <span className="route-service-icon route-service-icon--google" aria-hidden />
            <span>Google Maps</span>
          </a>
        </div>
      </div>
      <div
        id="selected-atm-details"
        className="map-detail-details-shell"
        aria-hidden={!expanded}
      >
        <div className="map-detail-details">
          <section className="map-detail-address">
            <b>Details</b>
            {address.street && <span>{address.street}</span>}
            {!address.street && !isLocalityLoading && <span>Adresse nicht verfügbar.</span>}
            {address.street && address.locality && <span>{address.locality}</span>}
            {address.street && !address.locality && isLocalityLoading && (
              <span>PLZ und Stadt werden geladen …</span>
            )}
            {address.street && !address.locality && !isLocalityLoading && (
              <span>PLZ und Stadt nicht verfügbar.</span>
            )}
          </section>
          <section className="map-detail-hours">
            <b>Öffnungszeiten</b>
            {openingDetails.length > 0 ? (
              <span className="hours-list">
                {openingDetails.map((line) => <span key={line}>{line}</span>)}
              </span>
            ) : <span>Nicht hinterlegt.</span>}
          </section>
        </div>
      </div>
    </div>
  );
}
