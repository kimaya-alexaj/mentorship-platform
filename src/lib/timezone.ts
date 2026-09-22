// Converts recurring weekly slots between a user's local wall-clock time
// and the UTC (day_of_week, time) pair stored in availability rows (see
// CLAUDE.md: "store all times in UTC").
//
// The conversion samples the IANA zone's UTC offset once (at "now" when
// going local -> UTC, or at the reconstructed instant when going
// UTC -> local) and applies it to a fixed reference week. That's exact
// for the offset it samples, but a slot's stored UTC time can drift by
// an hour once the real calendar crosses a DST transition the sample
// didn't account for. Acceptable for an MVP; see the comment on the
// availability table in supabase/migrations for the same caveat.

export type WeeklyTime = { dayOfWeek: number; time: string }; // time: "HH:MM"

// 2024-01-07 is a Sunday, so Date.UTC(2024, 0, 7 + dayOfWeek, ...) lands
// on the right weekday for dayOfWeek 0 (Sun) through 6 (Sat).
const REFERENCE_YEAR = 2024;
const REFERENCE_MONTH = 0;
const REFERENCE_SUNDAY = 7;

function parseTime(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(":").map(Number);
  return { hour, minute };
}

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// (local wall time) - (UTC time), in minutes, for `timeZone` at `instant`.
function getOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtcMs = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  return (asUtcMs - instant.getTime()) / 60_000;
}

export function localWeeklySlotToUtc(
  slot: WeeklyTime,
  timeZone: string
): WeeklyTime {
  const { hour, minute } = parseTime(slot.time);
  const offsetMinutes = getOffsetMinutes(new Date(), timeZone);

  const anchorMs = Date.UTC(
    REFERENCE_YEAR,
    REFERENCE_MONTH,
    REFERENCE_SUNDAY + slot.dayOfWeek,
    hour,
    minute
  );
  // UTC = local - offset, since offset is defined as (local - UTC).
  const utcMs = anchorMs - offsetMinutes * 60_000;
  const utcDate = new Date(utcMs);

  return {
    dayOfWeek: utcDate.getUTCDay(),
    time: formatTime(utcDate.getUTCHours(), utcDate.getUTCMinutes()),
  };
}

export function utcWeeklySlotToLocal(
  slot: WeeklyTime,
  timeZone: string
): WeeklyTime {
  const { hour, minute } = parseTime(slot.time);
  const anchorMs = Date.UTC(
    REFERENCE_YEAR,
    REFERENCE_MONTH,
    REFERENCE_SUNDAY + slot.dayOfWeek,
    hour,
    minute
  );
  const offsetMinutes = getOffsetMinutes(new Date(anchorMs), timeZone);
  // local = UTC + offset.
  const localMs = anchorMs + offsetMinutes * 60_000;
  const localDate = new Date(localMs);

  return {
    dayOfWeek: localDate.getUTCDay(),
    time: formatTime(localDate.getUTCHours(), localDate.getUTCMinutes()),
  };
}

export const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

let cachedTimezones: string[] | null = null;

export function listTimezones(): string[] {
  if (!cachedTimezones) {
    cachedTimezones = Intl.supportedValuesOf("timeZone");
  }
  return cachedTimezones;
}
