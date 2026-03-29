import { assertDomain } from "./errors";
import type { FamilyGoal, GoalVote, HistoryEvent, Member } from "./types";

export interface CastGoalVoteInput {
  id: string;
  familyId: string;
  dayKey: string;
  memberId: string;
  goal: FamilyGoal;
  existingVotes: ReadonlyArray<GoalVote>;
  members: ReadonlyArray<Member>;
  createdAt: string;
  voteHistoryEventId: string;
  goalReachedHistoryEventId: string;
}

export interface CastGoalVoteResult {
  vote: GoalVote;
  goal: FamilyGoal;
  historyEvents: ReadonlyArray<HistoryEvent>;
  reachedTarget: boolean;
}

export function createGoal(input: {
  id: string;
  familyId: string;
  title: string;
  targetVoteCount: number;
  createdByMemberId: string;
  members: ReadonlyArray<Member>;
}): FamilyGoal {
  const creator = input.members.find((member) => member.id === input.createdByMemberId);

  assertDomain(creator !== undefined, "GOAL_CREATOR_NOT_FOUND", "Le createur de l'objectif est introuvable.");
  assertDomain(creator.familyId === input.familyId, "GOAL_CREATOR_FAMILY_MISMATCH", "Le createur n'appartient pas a la famille.");
  assertDomain(creator.role === "parent", "GOAL_PARENT_ROLE_REQUIRED", "Seul un parent peut gerer les objectifs.");
  assertDomain(
    Number.isInteger(input.targetVoteCount) && input.targetVoteCount > 0,
    "INVALID_GOAL_TARGET",
    "La cible de vote doit etre un entier positif."
  );

  return {
    id: input.id,
    familyId: input.familyId,
    title: input.title,
    targetVoteCount: input.targetVoteCount,
    status: "active",
    createdByMemberId: input.createdByMemberId,
  };
}

export function castGoalVote(input: CastGoalVoteInput): CastGoalVoteResult {
  assertDomain(input.goal.familyId === input.familyId, "GOAL_FAMILY_MISMATCH", "L'objectif n'appartient pas a la famille.");
  assertDomain(input.goal.status === "active", "GOAL_NOT_ACTIVE", "Seul un objectif actif peut recevoir un vote.");

  const member = input.members.find((candidate) => candidate.id === input.memberId);

  assertDomain(member !== undefined, "VOTER_NOT_FOUND", "Le membre votant est introuvable.");
  assertDomain(member.familyId === input.familyId, "VOTER_FAMILY_MISMATCH", "Le votant n'appartient pas a la famille.");

  const hasAlreadyVoted = input.existingVotes.some(
    (vote) => vote.familyId === input.familyId && vote.memberId === input.memberId && vote.dayKey === input.dayKey
  );

  assertDomain(
    !hasAlreadyVoted,
    "DAILY_VOTE_ALREADY_RECORDED",
    "Un membre ne peut voter qu'une seule fois par jour."
  );

  const vote: GoalVote = {
    id: input.id,
    familyId: input.familyId,
    dayKey: input.dayKey,
    memberId: input.memberId,
    familyGoalId: input.goal.id,
    createdAt: input.createdAt,
  };

  const allVotesForGoal = input.existingVotes.filter((existingVote) => existingVote.familyGoalId === input.goal.id);
  const totalVotes = allVotesForGoal.length + 1;
  const reachedTarget = totalVotes >= input.goal.targetVoteCount;

  const historyEvents: HistoryEvent[] = [
    {
      id: input.voteHistoryEventId,
      familyId: input.familyId,
      type: "goal_vote_recorded",
      occurredAt: input.createdAt,
      actorMemberId: input.memberId,
      metadata: {
        goalId: input.goal.id,
        dayKey: input.dayKey,
      },
    },
  ];

  const goal = reachedTarget
    ? {
        ...input.goal,
        status: "promised" as const,
        promisedAt: input.createdAt,
      }
    : input.goal;

  if (reachedTarget) {
    historyEvents.push({
      id: input.goalReachedHistoryEventId,
      familyId: input.familyId,
      type: "goal_reached",
      occurredAt: input.createdAt,
      actorMemberId: input.memberId,
      metadata: {
        goalId: input.goal.id,
        targetVoteCount: input.goal.targetVoteCount,
      },
    });
  }

  return {
    vote,
    goal,
    historyEvents,
    reachedTarget,
  };
}
