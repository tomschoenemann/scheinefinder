export type Point = {
  lat: number;
  lon: number;
};

export type ViewportBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type SearchViewport = {
  center: Point;
  bounds: ViewportBounds;
};

export type AtmRecord = Point & {
  id: string;
  name: string;
  address: string;
  operator?: string;
  postalCode?: string;
  city?: string;
  openingHours?: string;
  source?: "custom" | "osm";
};

export type Atm = AtmRecord & {
  distance: number;
};

export type Locality = {
  postalCode: string;
  city: string;
};

export type BankingGroup =
  | "cash-group"
  | "cashpool"
  | "service-network"
  | "sparkassen"
  | "independent"
  | "other";

export type BankIdentity = {
  code: string;
  variant: string;
  logoFile?: string;
};
