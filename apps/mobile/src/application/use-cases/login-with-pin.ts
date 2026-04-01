import type { HistoryEvent, SessionContext } from "@famigo/domain";

import { getMemberAuthById as getMemberAuthByIdRepository } from "../../data/repositories/members.repository";
import { createApplicationError } from "../errors";
import { executeUseCase, type UseCaseResult } from "../result";

export interface LoginWithPinInput {
  familyId: string;
  memberId: string;
  pin: string;
  now: string;
  historyEventId: string;
}

export interface LoginWithPinData {
  session: SessionContext;
  historyEvent: HistoryEvent;
}

export interface PinVerifier {
  verify(input: { pin: string; pinHash: string }): Promise<boolean>;
}

export interface LoginWithPinDependencies {
  pinVerifier: PinVerifier;
  getMemberAuthById?: typeof getMemberAuthByIdRepository;
}

export function createLoginWithPinUseCase(dependencies: LoginWithPinDependencies) {
  const { pinVerifier, getMemberAuthById = getMemberAuthByIdRepository } = dependencies;

  return (input: LoginWithPinInput): Promise<UseCaseResult<LoginWithPinData>> =>
    executeUseCase(async () => {
      if (!/^\d{4}$/.test(input.pin)) {
        throw createApplicationError({
          code: "INVALID_PIN_FORMAT",
          kind: "domain",
          message: "Le PIN doit contenir 4 chiffres.",
        });
      }

      const member = await getMemberAuthById(input.memberId);

      if (member === null) {
        throw createApplicationError({
          code: "MEMBER_NOT_FOUND",
          kind: "domain",
          message: "Le membre selectionne est introuvable.",
        });
      }

      if (member.familyId !== input.familyId) {
        throw createApplicationError({
          code: "MEMBER_FAMILY_MISMATCH",
          kind: "domain",
          message: "Le membre ne correspond pas a la famille attendue.",
        });
      }

      // Temporary bridge: the database stores `pin_hash`, while the domain auth model still expects a clear PIN.
      const isValidPin = await pinVerifier.verify({
        pin: input.pin,
        pinHash: member.pinHash,
      });

      if (!isValidPin) {
        throw createApplicationError({
          code: "INVALID_PIN",
          kind: "domain",
          message: "Le PIN est invalide.",
        });
      }

      return {
        session: {
          familyId: input.familyId,
          memberId: member.id,
          startedAt: input.now,
        },
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
    });
}
