"use client";

import Image from "next/image";
import type { FormEventHandler, RefObject } from "react";
import { displayAddress } from "@/lib/atms/address";
import { formatDistance } from "@/lib/atms/geo";
import { getOpeningStatus } from "@/lib/atms/opening-hours";
import type { Atm, BankingGroup } from "@/lib/atms/types";
import { BankLogo } from "./BankLogo";
import { FiltersPanel, type OpenFilter } from "./FiltersPanel";
import { Icon } from "./Icon";

type SidebarProps = {
  collapsed: boolean;
  query: string;
  isLocating: boolean;
  atms: Atm[];
  selectedId: string | null;
  now: Date | null;
  filtersExpanded: boolean;
  openFilter: OpenFilter;
  bankingGroups: BankingGroup[];
  institutions: string[];
  groupCounts: Map<BankingGroup, number>;
  institutionOptions: Array<{ name: string; count: number }>;
  filterContainerRef: RefObject<HTMLDivElement | null>;
  onQueryChange: (query: string) => void;
  onSearch: FormEventHandler<HTMLFormElement>;
  onLocate: () => void;
  onSelectAtm: (id: string) => void;
  onFiltersExpandedChange: (expanded: boolean) => void;
  onOpenFilterChange: (filter: OpenFilter) => void;
  onBankingGroupsChange: (groups: BankingGroup[]) => void;
  onInstitutionsChange: (institutions: string[]) => void;
};

export function Sidebar({
  collapsed,
  query,
  isLocating,
  atms,
  selectedId,
  now,
  filtersExpanded,
  openFilter,
  bankingGroups,
  institutions,
  groupCounts,
  institutionOptions,
  filterContainerRef,
  onQueryChange,
  onSearch,
  onLocate,
  onSelectAtm,
  onFiltersExpandedChange,
  onOpenFilterChange,
  onBankingGroupsChange,
  onInstitutionsChange,
}: SidebarProps) {
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <header className="brand-row">
        <Image
          className="brand-wordmark"
          src="/brand/wordmark.svg"
          alt="Scheinefinder"
          width={230}
          height={40}
          priority
        />
        <Image
          className="brand-symbol"
          src="/brand/serif-pin-search.svg"
          alt=""
          width={40}
          height={40}
          priority
        />
        <button className="mobile-locate" onClick={onLocate} aria-label="Meinen Standort verwenden">
          <Icon name="locate" />
        </button>
      </header>
      <section className="search-section">
        <form className="search-box" onSubmit={onSearch}>
          <Icon name="search" size={21} />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Ort oder Adresse suchen"
            aria-label="Ort oder Adresse"
          />
          <button type="submit" aria-label="Suchen">
            <Icon name="chevron" size={18} />
          </button>
        </form>
        <button className="location-button" onClick={onLocate} disabled={isLocating}>
          <Icon name="locate" size={18} />
          {isLocating ? "Standort wird bestimmt …" : "Meinen Standort verwenden"}
        </button>
        <FiltersPanel
          containerRef={filterContainerRef}
          expanded={filtersExpanded}
          openFilter={openFilter}
          bankingGroups={bankingGroups}
          institutions={institutions}
          groupCounts={groupCounts}
          institutionOptions={institutionOptions}
          onExpandedChange={onFiltersExpandedChange}
          onOpenFilterChange={onOpenFilterChange}
          onBankingGroupsChange={onBankingGroupsChange}
          onInstitutionsChange={onInstitutionsChange}
        />
      </section>
      <section className="results-section">
        <div className="atm-list">
          {atms.map((atm) => {
            const address = displayAddress(atm.address);
            const openingStatus = now ? getOpeningStatus(atm.openingHours, now) : null;
            const hasMeta = Boolean(address || openingStatus);
            return (
              <button
                key={atm.id}
                data-atm-id={atm.id}
                className={`atm-card ${selectedId === atm.id ? "active" : ""} ${hasMeta ? "" : "no-meta"}`}
                onClick={() => onSelectAtm(atm.id)}
                aria-label={`${atm.name}, ${formatDistance(atm.distance)}`}
              >
                <span className="atm-index">
                  <BankLogo name={atm.name} />
                </span>
                <span className="atm-info">
                  <strong>{atm.name}</strong>
                  {address && <span>{address}</span>}
                  {openingStatus && (
                    <small className={openingStatus.isOpen ? "is-open" : "is-closed"}>
                      {openingStatus.text}
                    </small>
                  )}
                </span>
                <span className="atm-distance">
                  <b>{formatDistance(atm.distance)}</b>
                  <Icon name="chevron" size={17} />
                </span>
              </button>
            );
          })}
          <div className="results-heading">
            <h2>
              {atms.length === 0
                ? "Keine Treffer in diesem Suchradius. Bitte erhöhe den Suchradius."
                : `${atms.length} Treffer in diesem Suchradius.`}
            </h2>
          </div>
        </div>
      </section>
    </aside>
  );
}
