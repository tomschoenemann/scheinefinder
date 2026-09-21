import type { BankingGroup, Point } from "./types";

export const DEFAULT_LOCATION: Point = { lat: 52.5208, lon: 13.4095 };

export const BANKING_GROUPS: ReadonlyArray<{
  value: BankingGroup;
  label: string;
}> = [
  { value: "cash-group", label: "Cash Group" },
  { value: "cashpool", label: "CashPool" },
  { value: "service-network", label: "BankCard ServiceNetz" },
  { value: "sparkassen", label: "Sparkassen" },
  { value: "independent", label: "Drittanbieter" },
  { value: "other", label: "Sonstige" },
];

export const MAX_RESULTS = 120;
export const DUPLICATE_DISTANCE_KM = 0.035;
