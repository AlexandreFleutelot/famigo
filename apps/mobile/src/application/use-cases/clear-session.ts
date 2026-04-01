import type { AppSessionGateway } from "../ports";
import { executeUseCase, type UseCaseResult } from "../result";

export interface ClearSessionData {
  cleared: true;
}

export interface ClearSessionDependencies {
  appSessionGateway: AppSessionGateway;
}

export function createClearSessionUseCase(dependencies: ClearSessionDependencies) {
  return (): Promise<UseCaseResult<ClearSessionData>> =>
    executeUseCase(async () => {
      await dependencies.appSessionGateway.clear();

      return {
        cleared: true,
      };
    });
}
