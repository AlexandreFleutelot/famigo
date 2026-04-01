import type { FamilyGoal } from "@famigo/domain";

import { getActiveGoals as getActiveGoalsRepository } from "../../data/repositories/goals.repository";
import { executeUseCase, type UseCaseResult } from "../result";

export interface LoadGoalsInput {
  familyId: string;
}

export interface LoadGoalsData {
  goals: ReadonlyArray<FamilyGoal>;
}

export interface LoadGoalsDependencies {
  getActiveGoals?: typeof getActiveGoalsRepository;
}

export function createLoadGoalsUseCase(dependencies: LoadGoalsDependencies = {}) {
  const { getActiveGoals = getActiveGoalsRepository } = dependencies;

  return (input: LoadGoalsInput): Promise<UseCaseResult<LoadGoalsData>> =>
    executeUseCase(async () => ({
      goals: await getActiveGoals(input.familyId),
    }));
}
