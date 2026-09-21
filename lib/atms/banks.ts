import type { AtmRecord, BankIdentity, BankingGroup } from "./types";

type BankMatcher = BankIdentity & { match: ReadonlyArray<string> };

const KNOWN_BANKS: ReadonlyArray<BankMatcher> = [
  { match: ["sparkasse"], code: "S", variant: "sparkasse", logoFile: "sparkasse.svg" },
  { match: ["psd bank", "psd-bank", "psd"], code: "PSD", variant: "psd", logoFile: "psd-bank.png" },
  { match: ["volksbank", "raiffeisen", "vr bank", "vr-bank"], code: "VR", variant: "volksbank", logoFile: "volksbank.svg" },
  { match: ["deutsche bank"], code: "DB", variant: "deutsche-bank", logoFile: "deutsche-bank.svg" },
  { match: ["hypovereinsbank", "hypo vereinsbank", "unicredit"], code: "HVB", variant: "hypovereinsbank", logoFile: "hypovereinsbank.jpg" },
  { match: ["bw-bank", "bw bank", "bwbank", "baden-württembergische bank"], code: "BW", variant: "bw-bank", logoFile: "bw-bank.png" },
  { match: ["vietinbank", "vietin bank"], code: "VTB", variant: "vietinbank", logoFile: "vietinbank.png" },
  { match: ["national-bank", "national bank", "nationalbank"], code: "NB", variant: "national-bank", logoFile: "national-bank.gif" },
  { match: ["commerzbank"], code: "CB", variant: "commerzbank", logoFile: "commerzbank.png" },
  { match: ["postbank"], code: "PB", variant: "postbank", logoFile: "postbank.png" },
  { match: ["sparda"], code: "SB", variant: "sparda", logoFile: "sparda-bank.jpg" },
  { match: ["bbbank", "bb bank", "bb-bank"], code: "BB", variant: "bbbank", logoFile: "bbbank.png" },
  { match: ["reisebank"], code: "RB", variant: "reisebank", logoFile: "reisebank.jpg" },
  { match: ["santander", "openbank"], code: "SAN", variant: "santander", logoFile: "santander.png" },
  { match: ["targobank", "targo bank"], code: "T", variant: "targobank", logoFile: "targobank.webp" },
  { match: ["euronet"], code: "E", variant: "euronet", logoFile: "euronet.png" },
  { match: ["cash zone", "cashzone"], code: "CZ", variant: "cash-zone", logoFile: "cash-zone.png" },
  { match: ["ing"], code: "ING", variant: "ing", logoFile: "ing.webp" },
  { match: ["dkb", "deutsche kreditbank"], code: "DKB", variant: "dkb", logoFile: "dkb.png" },
  { match: ["n26"], code: "N26", variant: "n26", logoFile: "n26.svg" },
];

const CANONICAL_NAMES: Readonly<Record<string, string>> = {
  sparkasse: "Sparkasse",
  psd: "PSD Bank",
  volksbank: "Volksbank / Raiffeisenbank",
  sparda: "Sparda-Bank",
  "deutsche-bank": "Deutsche Bank",
  commerzbank: "Commerzbank",
  postbank: "Postbank",
  bbbank: "BBBank",
  reisebank: "Reisebank",
  santander: "Santander / Openbank",
  targobank: "TARGOBANK",
  euronet: "Euronet",
  "cash-zone": "Cashzone",
  ing: "ING",
  dkb: "DKB",
  hypovereinsbank: "HypoVereinsbank",
  "bw-bank": "BW-Bank",
  vietinbank: "VietinBank",
  "national-bank": "National-Bank",
  n26: "N26",
};

const GENERIC_NAME_PARTS = new Set(["bank", "geldautomat", "atm", "filiale"]);

export function getBankIdentity(name: string): BankIdentity {
  const normalizedName = name.toLocaleLowerCase("de");
  const knownBank = KNOWN_BANKS.find((bank) =>
    bank.match.some((term) => normalizedName.includes(term))
  );

  if (knownBank) {
    return {
      code: knownBank.code,
      variant: knownBank.variant,
      logoFile: knownBank.logoFile,
    };
  }

  const meaningfulWords = name
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word && !GENERIC_NAME_PARTS.has(word.toLocaleLowerCase("de")));
  const fallbackCode = meaningfulWords.length > 1
    ? meaningfulWords.slice(0, 2).map((word) => word[0]).join("")
    : meaningfulWords[0]?.slice(0, 2) || "ATM";

  return { code: fallbackCode.toLocaleUpperCase("de"), variant: "fallback" };
}

export function bankKey(atm: Pick<AtmRecord, "name" | "operator">) {
  return (atm.operator || atm.name)
    .toLocaleLowerCase("de")
    .replace(/[^a-z0-9äöüß]+/g, "");
}

export function institutionName(atm: Pick<AtmRecord, "name" | "operator">) {
  const rawName = (atm.operator || atm.name)
    .replace(/\s+-\s+geldautomat.*$/i, "")
    .replace(/\s+(?:eG|AG|GmbH(?:\s*&\s*Co\.\s*KG)?)$/i, "")
    .trim();
  const normalizedName = rawName
    .toLocaleLowerCase("de")
    .replace(/[.\-_]+/g, " ")
    .replace(/\s+/g, " ");

  if (/^ic\s*cash(?:\s+services)?$/.test(normalizedName)) return "IC Cash";
  if (/^bankhaus\s+(?:august\s+)?lenz$/.test(normalizedName)) return "Bankhaus Lenz";
  if (/^vöb(?:\s+zvd\s+bank)?$/.test(normalizedName)) return "VÖB";
  if (/^volkswagen\s+bank$/.test(normalizedName)) return "Volkswagen Bank";
  if (normalizedName.includes("hypovereinsbank") || normalizedName.includes("hypo vereinsbank")) {
    return "HypoVereinsbank";
  }

  return CANONICAL_NAMES[getBankIdentity(rawName).variant] ?? rawName;
}

export function getBankingGroups(
  atm: Pick<AtmRecord, "name" | "operator">,
): BankingGroup[] {
  const name = `${atm.name} ${atm.operator ?? ""}`.toLocaleLowerCase("de");
  if (["euronet", "cash zone", "cashzone", "ic cash", "iccash", "cardpoint", "cashpoint", "moneyserv"].some((term) => name.includes(term))) {
    return ["independent"];
  }
  if (name.includes("sparda")) return ["cashpool", "service-network"];
  if (["deutsche bank", "commerzbank", "postbank", "hypovereinsbank", "unicredit", "norisbank"].some((term) => name.includes(term))) {
    return ["cash-group"];
  }
  if (["targobank", "targo bank", "santander", "bbbank", "degussa bank", "südwestbank", "national-bank"].some((term) => name.includes(term))) {
    return ["cashpool"];
  }
  if (["volksbank", "raiffeisen", "vr bank", "psd bank"].some((term) => name.includes(term))) {
    return ["service-network"];
  }
  if (name.includes("sparkasse")) return ["sparkassen"];
  return ["other"];
}
