import type { HistoryEvent } from "./types";

export function sortHistoryEvents(
  events: ReadonlyArray<HistoryEvent>
): ReadonlyArray<HistoryEvent> {
  return [...events].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}
