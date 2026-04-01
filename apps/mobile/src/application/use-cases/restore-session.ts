import type { Family, Member } from "@famigo/domain";

import { getFamilyById as getFamilyByIdRepository } from "../../data/repositories/families.repository";
import { getMemberById as getMemberByIdRepository } from "../../data/repositories/members.repository";
import { executeUseCase, type UseCaseResult } from "../result";
import type { AppSessionContext, AppSessionGateway } from "../session";

export interface RestoreSessionData {
  family: Family | null;
  member: Member | null;
  session: AppSessionContext | null;
}

export interface RestoreSessionDependencies {
  appSessionGateway: AppSessionGateway;
  getFamilyById?: typeof getFamilyByIdRepository;
  getMemberById?: typeof getMemberByIdRepository;
}

export function createRestoreSessionUseCase(dependencies: RestoreSessionDependencies) {
  const {
    appSessionGateway,
    getFamilyById = getFamilyByIdRepository,
    getMemberById = getMemberByIdRepository,
  } = dependencies;

  return (): Promise<UseCaseResult<RestoreSessionData>> =>
    executeUseCase(async () => {
      const storedSession = await appSessionGateway.read();

      if (storedSession === null || storedSession.selectedFamilyId === null) {
        return {
          family: null,
          member: null,
          session: null,
        };
      }

      const family = await getFamilyById(storedSession.selectedFamilyId);

      if (family === null) {
        await appSessionGateway.clear();

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

      const member = await getMemberById(storedSession.selectedMemberId);

      if (member !== null && member.familyId === family.id) {
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

      await appSessionGateway.save(normalizedSession);

      return {
        family,
        member: null,
        session: normalizedSession,
      };
    });
}
