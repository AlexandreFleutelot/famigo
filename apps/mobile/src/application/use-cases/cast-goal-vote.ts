import type { FamilyGoal } from "@famigo/domain";

import { createApplicationError } from "../errors";
import type { GoalsGateway } from "../ports";
import { executeUseCase, type UseCaseResult } from "../result";

export interface CastGoalVoteInput {
  familyId: string;
  memberId: string;
  goalId: string;
  dayKey: string;
  createdAt: string;
}

export interface CastGoalVoteData {
  goal: FamilyGoal;
  voteId: string;
  voteAuditEventId: string;
  goalReachedAuditEventId: string | null;
  reachedTarget: boolean;
  totalVotes: number;
}

export interface CastGoalVoteDependencies {
  goalsGateway: GoalsGateway;
}

export function createCastGoalVoteUseCase(dependencies: CastGoalVoteDependencies) {
  return (input: CastGoalVoteInput): Promise<UseCaseResult<CastGoalVoteData>> =>
    executeUseCase(async () => {
      const goals = await dependencies.goalsGateway.listGoals(input.familyId);
      const goal = goals.find((candidate) => candidate.id === input.goalId);

      if (goal === undefined) {
        throw createApplicationError({
          code: "GOAL_NOT_FOUND",
          kind: "domain",
          message: "L'objectif selectionne est introuvable.",
        });
      }

      const receipt = await dependencies.goalsGateway.castGoalVote({
        familyId: input.familyId,
        memberId: input.memberId,
        goalId: input.goalId,
        dayKey: input.dayKey,
      });

      return {
        goal: {
          ...goal,
          status: receipt.goalStatus,
          promisedAt: receipt.reachedTarget ? input.createdAt : goal.promisedAt,
        },
        voteId: receipt.voteId,
        voteAuditEventId: receipt.voteAuditEventId,
        goalReachedAuditEventId: receipt.goalReachedAuditEventId,
        reachedTarget: receipt.reachedTarget,
        totalVotes: receipt.totalVotes,
      };
    });
}
