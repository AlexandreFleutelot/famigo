import type { Member } from "@famigo/domain";

import { getFamilyMembers as getFamilyMembersRepository } from "../../data/repositories/members.repository";
import { createApplicationError } from "../errors";
import { executeUseCase, type UseCaseResult } from "../result";
import type { AppSessionContext, AppSessionGateway } from "../session";

export interface GetMembersForSelectedFamilyData {
  familyId: string;
  members: ReadonlyArray<Member>;
  session: AppSessionContext;
}

export interface GetMembersForSelectedFamilyDependencies {
  appSessionGateway: AppSessionGateway;
  getFamilyMembers?: typeof getFamilyMembersRepository;
}

export function createGetMembersForSelectedFamilyUseCase(
  dependencies: GetMembersForSelectedFamilyDependencies
) {
  const { appSessionGateway, getFamilyMembers = getFamilyMembersRepository } = dependencies;

  return (): Promise<UseCaseResult<GetMembersForSelectedFamilyData>> =>
    executeUseCase(async () => {
      const session = await appSessionGateway.read();

      if (session?.selectedFamilyId === null || session?.selectedFamilyId === undefined) {
        throw createApplicationError({
          code: "FAMILY_NOT_SELECTED",
          kind: "domain",
          message: "Aucune famille n'est selectionnee.",
        });
      }

      return {
        familyId: session.selectedFamilyId,
        members: await getFamilyMembers(session.selectedFamilyId),
        session,
      };
    });
}
