"use client";

import { AtmDetail } from "./components/AtmDetail";
import { Icon } from "./components/Icon";
import { MapView } from "./components/MapView";
import { Sidebar } from "./components/Sidebar";
import { useAtmFinder } from "./hooks/useAtmFinder";

export function AtmFinder() {
  const finder = useAtmFinder();

  return (
    <main className={`app-shell ${finder.sidebarCollapsed ? "sidebar-is-collapsed" : ""} ${finder.mobileView === "map" ? "mobile-map-view" : "mobile-sidebar-view"}`}>
      <Sidebar
        collapsed={finder.sidebarCollapsed}
        query={finder.query}
        isLocating={finder.isLocating}
        atms={finder.matchingAtms}
        selectedId={finder.effectiveSelectedId}
        now={finder.now}
        filtersExpanded={finder.filtersExpanded}
        openFilter={finder.openFilter}
        bankingGroups={finder.bankingGroups}
        institutions={finder.institutions}
        groupCounts={finder.groupCounts}
        institutionOptions={finder.institutionOptions}
        filterContainerRef={finder.filterContainerRef}
        onQueryChange={finder.setQuery}
        onSearch={finder.handleSearch}
        onLocate={() => finder.locateUser(false)}
        onSelectAtm={finder.selectAtm}
        onFiltersExpandedChange={finder.setFiltersExpanded}
        onOpenFilterChange={finder.setOpenFilter}
        onBankingGroupsChange={finder.setBankingGroups}
        onInstitutionsChange={finder.setInstitutions}
      />
      <button
        className="sidebar-toggle-fab"
        type="button"
        onClick={() => {
          finder.setSidebarCollapsed(!finder.sidebarCollapsed);
          finder.setOpenFilter(null);
        }}
        aria-label={finder.sidebarCollapsed ? "Seitenleiste ausklappen" : "Seitenleiste einklappen"}
        aria-expanded={!finder.sidebarCollapsed}
      >
        <Icon name="chevron" size={18} />
      </button>
      <section className="map-panel">
        <button
          className="mobile-back-button"
          type="button"
          onClick={() => {
            finder.setMobileView("sidebar");
            finder.setOpenFilter(null);
          }}
          aria-label="Zurück zur Geldautomatenliste"
        >
          <Icon name="chevron" size={18} />
        </button>
        <MapView
          center={finder.center}
          zoom={finder.zoom}
          atms={finder.matchingAtms}
          selectedId={finder.effectiveSelectedId}
          onCenterChange={finder.setCenter}
          onZoomChange={finder.setZoom}
          onViewportChange={finder.handleViewportChange}
          onInteractionStart={() => finder.setIsMapDetailExpanded(false)}
          onSelect={finder.selectAtm}
        />
        <div className="map-topbar">
          {finder.pendingViewport ? (
            <button type="button" onClick={finder.searchCurrentViewport}>
              <Icon name="search" size={16} />
              <span className="map-topbar-label">Diesen Bereich suchen</span>
            </button>
          ) : (
            <span>
              <Icon name="pin" size={16} />
              <span className="map-topbar-label">{finder.locationLabel}</span>
            </span>
          )}
        </div>
        {finder.selectedAtm && (
          <AtmDetail
            atm={finder.selectedAtm}
            locality={finder.resolvedLocality}
            isLocalityLoading={finder.isSelectedLocalityLoading}
            expanded={finder.isMapDetailExpanded}
            now={finder.now}
            onExpandedChange={finder.setIsMapDetailExpanded}
          />
        )}
      </section>
    </main>
  );
}
