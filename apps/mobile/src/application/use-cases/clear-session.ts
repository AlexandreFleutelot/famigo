import { executeUseCase, type UseCaseResult } from "../result";
import type { AppSessionGateway } from "../session";

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
