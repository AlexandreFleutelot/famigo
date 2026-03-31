import type { FamilyGoal } from "@famigo/domain";

import type { GoalsGateway } from "../ports";
import { executeUseCase, type UseCaseResult } from "../result";

export interface LoadGoalsInput {
  familyId: string;
}

export interface LoadGoalsData {
  goals: ReadonlyArray<FamilyGoal>;
}

export interface LoadGoalsDependencies {
  goalsGateway: GoalsGateway;
}

export function createLoadGoalsUseCase(dependencies: LoadGoalsDependencies) {
  return (input: LoadGoalsInput): Promise<UseCaseResult<LoadGoalsData>> =>
    executeUseCase(async () => ({
      goals: await dependencies.goalsGateway.listGoals(input.familyId),
    }));
}
