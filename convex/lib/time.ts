import { Temporal } from "@js-temporal/polyfill";

export function nowEpochMs(): number {
  return Temporal.Now.instant().epochMilliseconds;
}
