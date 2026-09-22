import type { Database } from "@/lib/types/database";

type AvailabilityRow = Database["public"]["Tables"]["availability"]["Row"];

// Both sides are already stored in UTC (day_of_week + HH:MM:SS), so
// "timezone overlap" between two people reduces to plain interval
// overlap on matching days -- no timezone math needed at query time,
// only when the slots were first saved (see src/lib/timezone.ts).
export function slotsOverlap(a: AvailabilityRow, b: AvailabilityRow): boolean {
  return (
    a.day_of_week === b.day_of_week &&
    a.start_time_utc < b.end_time_utc &&
    b.start_time_utc < a.end_time_utc
  );
}

export function hasAnyOverlap(
  mine: AvailabilityRow[],
  theirs: AvailabilityRow[]
): boolean {
  return mine.some((a) => theirs.some((b) => slotsOverlap(a, b)));
}
