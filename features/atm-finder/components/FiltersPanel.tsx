"use client";

import type { RefObject } from "react";
import { BANKING_GROUPS } from "@/lib/atms/constants";
import type { BankingGroup } from "@/lib/atms/types";
import { Icon } from "./Icon";

export type OpenFilter = "groups" | "institutions" | null;

type FiltersPanelProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  expanded: boolean;
  openFilter: OpenFilter;
  bankingGroups: BankingGroup[];
  institutions: string[];
  groupCounts: Map<BankingGroup, number>;
  institutionOptions: Array<{ name: string; count: number }>;
  onExpandedChange: (expanded: boolean) => void;
  onOpenFilterChange: (filter: OpenFilter) => void;
  onBankingGroupsChange: (groups: BankingGroup[]) => void;
  onInstitutionsChange: (institutions: string[]) => void;
};

function toggleSelection<T>(selection: T[], value: T) {
  return selection.includes(value)
    ? selection.filter((item) => item !== value)
    : [...selection, value];
}

export function FiltersPanel({
  containerRef,
  expanded,
  openFilter,
  bankingGroups,
  institutions,
  groupCounts,
  institutionOptions,
  onExpandedChange,
  onOpenFilterChange,
  onBankingGroupsChange,
  onInstitutionsChange,
}: FiltersPanelProps) {
  const sortedGroups = [...BANKING_GROUPS].sort((a, b) =>
    (groupCounts.get(b.value) ?? 0) - (groupCounts.get(a.value) ?? 0)
  );
  const groupSummary = bankingGroups.length === 0
    ? "Alle Verbünde"
    : bankingGroups.length === 1
      ? BANKING_GROUPS.find((group) => group.value === bankingGroups[0])?.label
      : `${bankingGroups.length} ausgewählt`;
  const institutionSummary = institutions.length === 0
    ? "Alle Institute"
    : institutions.length === 1
      ? institutions[0]
      : `${institutions.length} ausgewählt`;

  return (
    <div className={`filters-panel ${expanded ? "expanded" : ""}`} ref={containerRef}>
      <button
        type="button"
        className="filters-toggle"
        onClick={() => {
          onExpandedChange(!expanded);
          onOpenFilterChange(null);
        }}
        aria-expanded={expanded}
        aria-controls="sidebar-filters"
      >
        <span>Filter</span>
        <Icon name="chevron" size={16} />
      </button>
      <div id="sidebar-filters" className="filter-row" aria-hidden={!expanded}>
        <div className="filter-field">
          <span>Geldautomatenverbund</span>
          <div className={`filter-menu ${openFilter === "groups" ? "open" : ""}`}>
            <button
              type="button"
              className="filter-trigger"
              onClick={() => onOpenFilterChange(openFilter === "groups" ? null : "groups")}
              aria-expanded={openFilter === "groups"}
            >
              <span>{groupSummary}</span>
              <Icon name="chevron" size={14} />
            </button>
            <div className="filter-options" aria-hidden={openFilter !== "groups"}>
              <button
                type="button"
                onClick={() => {
                  onBankingGroupsChange([]);
                  onOpenFilterChange(null);
                }}
                className={!bankingGroups.length ? "selected" : ""}
              >
                Alle Verbünde
              </button>
              {sortedGroups.map((group) => {
                const count = groupCounts.get(group.value) ?? 0;
                return (
                  <label key={group.value} className={!count ? "disabled" : ""}>
                    <input
                      type="checkbox"
                      disabled={!count}
                      checked={bankingGroups.includes(group.value)}
                      onChange={() => onBankingGroupsChange(
                        toggleSelection(bankingGroups, group.value),
                      )}
                    />
                    <span>{group.label}</span>
                    <b>({count})</b>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <div className="filter-field">
          <span>Bankinstitut</span>
          <div className={`filter-menu ${openFilter === "institutions" ? "open" : ""}`}>
            <button
              type="button"
              className="filter-trigger"
              onClick={() => onOpenFilterChange(
                openFilter === "institutions" ? null : "institutions",
              )}
              aria-expanded={openFilter === "institutions"}
            >
              <span>{institutionSummary}</span>
              <Icon name="chevron" size={14} />
            </button>
            <div className="filter-options" aria-hidden={openFilter !== "institutions"}>
              <button
                type="button"
                onClick={() => {
                  onInstitutionsChange([]);
                  onOpenFilterChange(null);
                }}
                className={!institutions.length ? "selected" : ""}
              >
                Alle Institute
              </button>
              {institutionOptions.map(({ name, count }) => (
                <label key={name}>
                  <input
                    type="checkbox"
                    checked={institutions.includes(name)}
                    onChange={() => onInstitutionsChange(
                      toggleSelection(institutions, name),
                    )}
                  />
                  <span>{name}</span>
                  <b>({count})</b>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
