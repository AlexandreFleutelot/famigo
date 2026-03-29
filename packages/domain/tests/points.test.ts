import { describe, expect, it } from "vitest";

import {
  DAILY_POINT_BUDGET,
  DomainError,
  createDailyPointAllocation,
  finalizeDailyPointAllocation,
  getRemainingDailyPoints,
  replaceDailyPointAllocationLines,
} from "../src";

describe("daily point allocation", () => {
  it("cree un brouillon avec le budget quotidien complet disponible", () => {
    const allocation = createDailyPointAllocation({
      id: "allocation-1",
      familyId: "family-1",
      dayKey: "2026-03-29",
      giverMemberId: "member-1",
    });

    expect(getRemainingDailyPoints(allocation)).toBe(DAILY_POINT_BUDGET);
  });

  it("permet de reallouer les points pendant la journee", () => {
    const initial = createDailyPointAllocation({
      id: "allocation-1",
      familyId: "family-1",
      dayKey: "2026-03-29",
      giverMemberId: "member-1",
    });

    const firstAllocation = replaceDailyPointAllocationLines(initial, [
      { receiverMemberId: "member-2", points: 2 },
      { receiverMemberId: "member-3", points: 1 },
    ]);
    const secondAllocation = replaceDailyPointAllocationLines(firstAllocation, [
      { receiverMemberId: "member-2", points: 4 },
      { receiverMemberId: "member-3", points: 1 },
    ]);

    expect(getRemainingDailyPoints(firstAllocation)).toBe(2);
    expect(getRemainingDailyPoints(secondAllocation)).toBe(0);
  });

  it("interdit l'auto-attribution", () => {
    const allocation = createDailyPointAllocation({
      id: "allocation-1",
      familyId: "family-1",
      dayKey: "2026-03-29",
      giverMemberId: "member-1",
    });

    expect(() =>
      replaceDailyPointAllocationLines(allocation, [{ receiverMemberId: "member-1", points: 1 }])
    ).toThrowError(DomainError);
  });

  it("interdit de depasser le budget quotidien", () => {
    const allocation = createDailyPointAllocation({
      id: "allocation-1",
      familyId: "family-1",
      dayKey: "2026-03-29",
      giverMemberId: "member-1",
    });

    expect(() =>
      replaceDailyPointAllocationLines(allocation, [
        { receiverMemberId: "member-2", points: 3 },
        { receiverMemberId: "member-3", points: 3 },
      ])
    ).toThrowError(DomainError);
  });

  it("finalise la journee, cree les gains reels et historise les dons", () => {
    const allocation = replaceDailyPointAllocationLines(
      createDailyPointAllocation({
        id: "allocation-1",
        familyId: "family-1",
        dayKey: "2026-03-29",
        giverMemberId: "member-1",
      }),
      [
        { receiverMemberId: "member-2", points: 3 },
        { receiverMemberId: "member-3", points: 1 },
      ]
    );

    const result = finalizeDailyPointAllocation({
      allocation,
      finalizedAt: "2026-03-29T21:00:00.000Z",
      ledgerEntryIds: ["ledger-1", "ledger-2"],
      historyEventIds: ["history-1", "history-2"],
    });

    expect(result.allocation.status).toBe("finalized");
    expect(result.ledgerEntries).toHaveLength(2);
    expect(result.ledgerEntries[0]?.pointsDelta).toBe(3);
    expect(result.historyEvents[0]?.type).toBe("points_given");
    expect(result.unallocatedPointsExpired).toBe(1);
  });
});
