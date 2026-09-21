type OpeningInterval = {
  start: number;
  end: number;
};

type ParsedSchedule = {
  alwaysOpen: boolean;
  days: Map<number, OpeningInterval[]>;
};

export type OpeningStatus = {
  text: string;
  isOpen: boolean;
};

const OSM_DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
const GERMAN_DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;
const ENGLISH_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_RANGE_PATTERN = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/g;
const DAY_EXPRESSION_PATTERN = /^((?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?(?:,(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?)*)\s+/i;

function formatOpeningHours(value?: string) {
  if (!value) return null;
  if (value === "24/7") return "24 Stunden geöffnet";

  return value
    .replace(/\bmo\b/gi, "Mo")
    .replace(/\btu\b/gi, "Di")
    .replace(/\bwe\b/gi, "Mi")
    .replace(/\bth\b/gi, "Do")
    .replace(/\bfr\b/gi, "Fr")
    .replace(/\bsa\b/gi, "Sa")
    .replace(/\bsu\b/gi, "So")
    .replace(/;/g, " · ")
    .replace(/\s+/g, " ")
    .trim();
}

function findDayIndex(dayName: string) {
  return OSM_DAYS.findIndex((day) => day.toLowerCase() === dayName.toLowerCase());
}

function parseSelectedDays(dayExpression?: string) {
  const selectedDays = new Set<number>();
  if (!dayExpression) {
    for (let day = 0; day < OSM_DAYS.length; day += 1) selectedDays.add(day);
    return selectedDays;
  }

  for (const expressionPart of dayExpression.split(",")) {
    const [fromName, toName] = expressionPart.split("-");
    const from = findDayIndex(fromName);
    const to = toName ? findDayIndex(toName) : from;
    if (from < 0 || to < 0) continue;

    for (let offset = 0; offset < OSM_DAYS.length; offset += 1) {
      const day = (from + offset) % OSM_DAYS.length;
      selectedDays.add(day);
      if (day === to) break;
    }
  }

  return selectedDays;
}

export function parseOpeningHours(value?: string): ParsedSchedule | null {
  if (!value) return null;
  if (value.trim() === "24/7") return { alwaysOpen: true, days: new Map() };

  const days = new Map<number, OpeningInterval[]>();
  const primarySchedule = value.split("||")[0];
  for (const rawRule of primarySchedule.split(";")) {
    const rule = rawRule.replace(/["']/g, "").trim();
    if (!rule || /\boff\b/i.test(rule)) continue;

    const dayExpression = rule.match(DAY_EXPRESSION_PATTERN)?.[1];
    const intervals = [...rule.matchAll(TIME_RANGE_PATTERN)].map((match) => ({
      start: Number(match[1]) * 60 + Number(match[2]),
      end: Number(match[3]) * 60 + Number(match[4]),
    }));

    for (const day of parseSelectedDays(dayExpression)) {
      days.set(day, [...(days.get(day) ?? []), ...intervals]);
    }
  }

  return days.size ? { alwaysOpen: false, days } : null;
}

function berlinClock(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value.slice(0, 3) ?? "Mon";
  const day = ENGLISH_DAYS.indexOf(weekday);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);

  return { day: Math.max(0, day), minutes: hour * 60 + minute };
}

function clockLabel(minutes: number) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

export function getOpeningStatus(
  value: string | undefined,
  now: Date,
): OpeningStatus | null {
  const schedule = parseOpeningHours(value);
  if (!schedule) return null;
  if (schedule.alwaysOpen) return { text: "Durchgehend geöffnet", isOpen: true };

  const current = berlinClock(now);
  const today = schedule.days.get(current.day) ?? [];
  const previousDay = (current.day + 6) % 7;
  const previousOvernight = (schedule.days.get(previousDay) ?? []).find(
    (interval) => interval.end < interval.start && current.minutes < interval.end,
  );
  const activeInterval = today.find((interval) => interval.end > interval.start
    ? current.minutes >= interval.start && current.minutes < interval.end
    : current.minutes >= interval.start);
  const openInterval = activeInterval ?? previousOvernight;

  if (openInterval) {
    return { text: `Bis ${clockLabel(openInterval.end)} Uhr geöffnet`, isOpen: true };
  }

  for (let offset = 0; offset <= 7; offset += 1) {
    const day = (current.day + offset) % 7;
    const nextInterval = (schedule.days.get(day) ?? [])
      .filter((interval) => offset > 0 || interval.start > current.minutes)
      .sort((a, b) => a.start - b.start)[0];
    if (!nextInterval) continue;

    const prefix = offset === 0 ? "" : offset === 1 ? "Morgen " : `${GERMAN_DAYS[day]} `;
    return {
      text: `Geschlossen · ${prefix}ab ${clockLabel(nextInterval.start)} Uhr geöffnet`,
      isOpen: false,
    };
  }

  return { text: "Geschlossen", isOpen: false };
}

export function openingHourDetails(value?: string) {
  if (!value) return [];
  if (value.trim() === "24/7") return ["Täglich · 24 Stunden geöffnet"];

  return value.split("||")[0].split(";").flatMap((rule) => {
    const formattedRule = formatOpeningHours(rule)
      ?.replace(/(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/g, "$1–$2")
      .trim();
    if (!formattedRule) return [];
    return [/^(Mo|Di|Mi|Do|Fr|Sa|So)/.test(formattedRule)
      ? formattedRule
      : `Täglich ${formattedRule}`];
  });
}
