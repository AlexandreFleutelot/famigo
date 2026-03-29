import { describe, expect, it } from "vitest";

import { DomainError, selectMemberSession } from "../src";
import type { Member } from "../src";

const members: Member[] = [
  {
    id: "member-parent",
    familyId: "family-1",
    displayName: "Alice",
    role: "parent",
    pin: "1234",
  },
  {
    id: "member-child",
    familyId: "family-1",
    displayName: "Lina",
    role: "child",
    pin: "4321",
  },
];

describe("selectMemberSession", () => {
  it("ouvre une session valide pour le membre selectionne", () => {
    const result = selectMemberSession({
      familyId: "family-1",
      memberId: "member-parent",
      pin: "1234",
      members,
      now: "2026-03-29T08:00:00.000Z",
      historyEventId: "history-1",
    });

    expect(result.session.memberId).toBe("member-parent");
    expect(result.historyEvent.type).toBe("member_session_started");
  });

  it("refuse un PIN invalide", () => {
    expect(() =>
      selectMemberSession({
        familyId: "family-1",
        memberId: "member-parent",
        pin: "0000",
        members,
        now: "2026-03-29T08:00:00.000Z",
        historyEventId: "history-1",
      })
    ).toThrowError(DomainError);
  });
});
