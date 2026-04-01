import type { Family } from "@famigo/domain";

import type { FamiliesGateway } from "../ports";
import { executeUseCase, type UseCaseResult } from "../result";

export interface GetFamiliesData {
  families: ReadonlyArray<Family>;
}

export interface GetFamiliesDependencies {
  familiesGateway: FamiliesGateway;
}

export function createGetFamiliesUseCase(dependencies: GetFamiliesDependencies) {
  return (): Promise<UseCaseResult<GetFamiliesData>> =>
    executeUseCase(async () => ({
      families: await dependencies.familiesGateway.listFamilies(),
    }));
}
