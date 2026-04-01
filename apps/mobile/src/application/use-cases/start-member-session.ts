import type { Member } from "@famigo/domain";

import { getMemberById as getMemberByIdRepository } from "../../data/repositories/members.repository";
import { createApplicationError } from "../errors";
import { executeUseCase, type UseCaseResult } from "../result";
import type { AppSessionContext, AppSessionGateway } from "../session";

export interface StartMemberSessionInput {
  memberId: string;
}

export interface StartMemberSessionData {
  member: Member;
  session: AppSessionContext;
}

export interface StartMemberSessionDependencies {
  appSessionGateway: AppSessionGateway;
  getMemberById?: typeof getMemberByIdRepository;
}

export function createStartMemberSessionUseCase(dependencies: StartMemberSessionDependencies) {
  const { appSessionGateway, getMemberById = getMemberByIdRepository } = dependencies;

  return (input: StartMemberSessionInput): Promise<UseCaseResult<StartMemberSessionData>> =>
    executeUseCase(async () => {
      const currentSession = await appSessionGateway.read();

      if (
        currentSession?.selectedFamilyId === null ||
        currentSession?.selectedFamilyId === undefined
      ) {
        throw createApplicationError({
          code: "FAMILY_NOT_SELECTED",
          kind: "domain",
          message: "Aucune famille n'est selectionnee.",
        });
      }

      const member = await getMemberById(input.memberId);

      if (member === null || member.familyId !== currentSession.selectedFamilyId) {
        throw createApplicationError({
          code: "MEMBER_NOT_FOUND",
          kind: "domain",
          message: "Le membre selectionne est introuvable dans la famille courante.",
        });
      }

      const session: AppSessionContext = {
        selectedFamilyId: currentSession.selectedFamilyId,
        selectedMemberId: member.id,
      };

      await appSessionGateway.save(session);

      return {
        member,
        session,
      };
    });
}
