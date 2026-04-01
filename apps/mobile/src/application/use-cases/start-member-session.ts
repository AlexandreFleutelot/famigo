import type { Member } from "@famigo/domain";

import { createApplicationError } from "../errors";
import type { AppSessionGateway, MembersGateway } from "../ports";
import { executeUseCase, type UseCaseResult } from "../result";
import type { AppSessionContext } from "../session";

export interface StartMemberSessionInput {
  memberId: string;
}

export interface StartMemberSessionData {
  member: Member;
  session: AppSessionContext;
}

export interface StartMemberSessionDependencies {
  membersGateway: MembersGateway;
  appSessionGateway: AppSessionGateway;
}

export function createStartMemberSessionUseCase(dependencies: StartMemberSessionDependencies) {
  return (input: StartMemberSessionInput): Promise<UseCaseResult<StartMemberSessionData>> =>
    executeUseCase(async () => {
      const currentSession = await dependencies.appSessionGateway.read();

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

      const members = await dependencies.membersGateway.listFamilyMembers(
        currentSession.selectedFamilyId
      );
      const member = members.find((candidate) => candidate.id === input.memberId);

      if (member === undefined) {
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

      await dependencies.appSessionGateway.save(session);

      return {
        member,
        session,
      };
    });
}
