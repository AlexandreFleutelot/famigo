import type { Family, Member } from "@famigo/domain";

import type { AppSessionGateway, FamiliesGateway, MembersGateway } from "../ports";
import { executeUseCase, type UseCaseResult } from "../result";
import type { AppSessionContext } from "../session";

export interface RestoreSessionData {
  family: Family | null;
  member: Member | null;
  session: AppSessionContext | null;
}

export interface RestoreSessionDependencies {
  familiesGateway: FamiliesGateway;
  membersGateway: MembersGateway;
  appSessionGateway: AppSessionGateway;
}

export function createRestoreSessionUseCase(dependencies: RestoreSessionDependencies) {
  return (): Promise<UseCaseResult<RestoreSessionData>> =>
    executeUseCase(async () => {
      const storedSession = await dependencies.appSessionGateway.read();

      if (storedSession === null || storedSession.selectedFamilyId === null) {
        return {
          family: null,
          member: null,
          session: null,
        };
      }

      const family = await dependencies.familiesGateway.getFamilyById(
        storedSession.selectedFamilyId
      );

      if (family === null) {
        await dependencies.appSessionGateway.clear();

        return {
          family: null,
          member: null,
          session: null,
        };
      }

      if (storedSession.selectedMemberId === null) {
        return {
          family,
          member: null,
          session: storedSession,
        };
      }

      const members = await dependencies.membersGateway.listFamilyMembers(family.id);
      const member = members.find((candidate) => candidate.id === storedSession.selectedMemberId);

      if (member !== undefined) {
        return {
          family,
          member,
          session: storedSession,
        };
      }

      const normalizedSession: AppSessionContext = {
        selectedFamilyId: family.id,
        selectedMemberId: null,
      };

      await dependencies.appSessionGateway.save(normalizedSession);

      return {
        family,
        member: null,
        session: normalizedSession,
      };
    });
}
