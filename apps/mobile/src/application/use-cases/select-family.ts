import type { Family } from "@famigo/domain";

import { createApplicationError } from "../errors";
import type { AppSessionGateway, FamiliesGateway } from "../ports";
import { executeUseCase, type UseCaseResult } from "../result";
import type { AppSessionContext } from "../session";

export interface SelectFamilyInput {
  familyId: string;
}

export interface SelectFamilyData {
  family: Family;
  session: AppSessionContext;
}

export interface SelectFamilyDependencies {
  familiesGateway: FamiliesGateway;
  appSessionGateway: AppSessionGateway;
}

export function createSelectFamilyUseCase(dependencies: SelectFamilyDependencies) {
  return (input: SelectFamilyInput): Promise<UseCaseResult<SelectFamilyData>> =>
    executeUseCase(async () => {
      const family = await dependencies.familiesGateway.getFamilyById(input.familyId);

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

      await dependencies.appSessionGateway.save(session);

      return {
        family,
        session,
      };
    });
}
