import type { Member } from "@famigo/domain";

import { createApplicationError } from "../errors";
import type { AppSessionGateway, MembersGateway } from "../ports";
import { executeUseCase, type UseCaseResult } from "../result";
import type { AppSessionContext } from "../session";

export interface GetMembersForSelectedFamilyData {
  familyId: string;
  members: ReadonlyArray<Member>;
  session: AppSessionContext;
}

export interface GetMembersForSelectedFamilyDependencies {
  membersGateway: MembersGateway;
  appSessionGateway: AppSessionGateway;
}

export function createGetMembersForSelectedFamilyUseCase(
  dependencies: GetMembersForSelectedFamilyDependencies
) {
  return (): Promise<UseCaseResult<GetMembersForSelectedFamilyData>> =>
    executeUseCase(async () => {
      const session = await dependencies.appSessionGateway.read();

      if (session?.selectedFamilyId === null || session?.selectedFamilyId === undefined) {
        throw createApplicationError({
          code: "FAMILY_NOT_SELECTED",
          kind: "domain",
          message: "Aucune famille n'est selectionnee.",
        });
      }

      return {
        familyId: session.selectedFamilyId,
        members: await dependencies.membersGateway.listFamilyMembers(session.selectedFamilyId),
        session,
      };
    });
}
