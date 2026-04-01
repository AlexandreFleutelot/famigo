import type { Family } from "@famigo/domain";

import { getFamilies as getFamiliesRepository } from "../../data/repositories/families.repository";
import { executeUseCase, type UseCaseResult } from "../result";

export interface GetFamiliesData {
  families: ReadonlyArray<Family>;
}

export interface GetFamiliesDependencies {
  getFamilies?: typeof getFamiliesRepository;
}

export function createGetFamiliesUseCase(dependencies: GetFamiliesDependencies = {}) {
  const { getFamilies = getFamiliesRepository } = dependencies;

  return (): Promise<UseCaseResult<GetFamiliesData>> =>
    executeUseCase(async () => ({
      families: await getFamilies(),
    }));
}
