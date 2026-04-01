import type { Family } from "@famigo/domain";

import { getFamilyById as getFamilyByIdRepository } from "../../data/repositories/families.repository";
import { createApplicationError } from "../errors";
import { executeUseCase, type UseCaseResult } from "../result";
import type { AppSessionContext, AppSessionGateway } from "../session";

export interface SelectFamilyInput {
  familyId: string;
}

export interface SelectFamilyData {
  family: Family;
  session: AppSessionContext;
}

export interface SelectFamilyDependencies {
  appSessionGateway: AppSessionGateway;
  getFamilyById?: typeof getFamilyByIdRepository;
}

export function createSelectFamilyUseCase(dependencies: SelectFamilyDependencies) {
  const { appSessionGateway, getFamilyById = getFamilyByIdRepository } = dependencies;

  return (input: SelectFamilyInput): Promise<UseCaseResult<SelectFamilyData>> =>
    executeUseCase(async () => {
      const family = await getFamilyById(input.familyId);

      if (family === null) {
        throw createApplicationError({
          code: "FAMILY_NOT_FOUND",
          kind: "domain",
          message: "La famille selectionnee est introuvable.",
        });
      }

      const session: AppSessionContext = {
        selectedFamilyId: family.id,
        selectedMemberId: null,
      };

      await appSessionGateway.save(session);

      return {
        family,
        session,
      };
    });
}
