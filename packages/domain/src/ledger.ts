import type { PointLedgerEntry } from "./types";

export function getPointBalance(
  entries: ReadonlyArray<PointLedgerEntry>,
  memberId: string
): number {
  return entries
    .filter((entry) => entry.memberId === memberId)
    .reduce((sum, entry) => sum + entry.pointsDelta, 0);
}
