import { assertDomain } from "./errors";
import type { HistoryEvent, Member, SessionContext } from "./types";

export interface SelectMemberSessionInput {
  familyId: string;
  memberId: string;
  pin: string;
  members: ReadonlyArray<Member>;
  now: string;
  historyEventId: string;
}

export interface SelectMemberSessionResult {
  session: SessionContext;
  historyEvent: HistoryEvent;
}

export function selectMemberSession(input: SelectMemberSessionInput): SelectMemberSessionResult {
  assertDomain(/^\d{4}$/.test(input.pin), "INVALID_PIN_FORMAT", "Le PIN doit contenir 4 chiffres.");

  const member = input.members.find((candidate) => candidate.id === input.memberId);

  assertDomain(member !== undefined, "MEMBER_NOT_FOUND", "Le membre selectionne est introuvable.");
  assertDomain(
    member.familyId === input.familyId,
    "MEMBER_FAMILY_MISMATCH",
    "Le membre ne correspond pas a la famille attendue."
  );
  assertDomain(member.pin === input.pin, "INVALID_PIN", "Le PIN est invalide.");

  const session: SessionContext = {
    familyId: input.familyId,
    memberId: member.id,
    startedAt: input.now,
  };

  return {
    session,
    historyEvent: {
      id: input.historyEventId,
      familyId: input.familyId,
      type: "member_session_started",
      occurredAt: input.now,
      actorMemberId: member.id,
      metadata: {
        memberId: member.id,
      },
    },
  };
}
