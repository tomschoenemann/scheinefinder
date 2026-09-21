import type { AtmRecord } from "./types";

export function displayAddress(value?: string) {
  const address = value?.trim();
  return address && address.toLocaleLowerCase("de") !== "adresse nicht hinterlegt"
    ? address
    : null;
}

export function displayAddressLines(
  atm: Pick<AtmRecord, "address" | "postalCode" | "city">,
) {
  const addressParts = (displayAddress(atm.address) ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const explicitLocality = [atm.postalCode?.trim(), atm.city?.trim()]
    .filter(Boolean)
    .join(" ");

  return {
    street: addressParts[0] ?? "",
    locality: explicitLocality || addressParts.slice(1).join(", "),
  };
}
