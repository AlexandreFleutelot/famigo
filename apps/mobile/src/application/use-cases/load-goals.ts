import type { FamilyGoal } from "@famigo/domain";

import {
  getActiveGoals as getActiveGoalsRepository,
  getGoalProgressSnapshot as getGoalProgressSnapshotRepository,
} from "../../data/repositories/goals.repository";
import { executeUseCase, type UseCaseResult } from "../result";

export interface LoadGoalsInput {
  familyId: string;
  memberId: string;
  dayKey: string;
}

export interface LoadGoalsData {
  goals: ReadonlyArray<FamilyGoal>;
  voteCountsByGoalId: Readonly<Record<string, number>>;
  hasMemberVotedToday: boolean;
}

export interface LoadGoalsDependencies {
  getActiveGoals?: typeof getActiveGoalsRepository;
  getGoalProgressSnapshot?: typeof getGoalProgressSnapshotRepository;
}

export function createLoadGoalsUseCase(dependencies: LoadGoalsDependencies = {}) {
  const {
    getActiveGoals = getActiveGoalsRepository,
    getGoalProgressSnapshot = getGoalProgressSnapshotRepository,
  } = dependencies;

  return (input: LoadGoalsInput): Promise<UseCaseResult<LoadGoalsData>> =>
    executeUseCase(async () => {
      const goals = await getActiveGoals(input.familyId);
      const progress = await getGoalProgressSnapshot({
        familyId: input.familyId,
        memberId: input.memberId,
        dayKey: input.dayKey,
        goalIds: goals.map((goal) => goal.id),
      });

      return {
        goals,
        voteCountsByGoalId: progress.voteCountsByGoalId,
        hasMemberVotedToday: progress.hasMemberVotedToday,
      };
    });
}
