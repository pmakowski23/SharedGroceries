import { Temporal } from "@js-temporal/polyfill";

export type PlainDate = Temporal.PlainDate;

export function todayPlainDate(): PlainDate {
  return Temporal.Now.plainDateISO();
}

export function nowEpochMs(): number {
  return Temporal.Now.instant().epochMilliseconds;
}

export function getWeekStart(date: PlainDate): PlainDate {
  return date.subtract({ days: date.dayOfWeek - 1 });
}

export function formatDateKey(date: PlainDate): string {
  return date.toString();
}

export function addDays(date: PlainDate, days: number): PlainDate {
  return date.add({ days });
}

export function formatMonthDay(date: PlainDate): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
  });
}
