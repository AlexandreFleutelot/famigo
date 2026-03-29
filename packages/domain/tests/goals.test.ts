import { describe, expect, it } from "vitest";

import { DomainError, castGoalVote, createGoal } from "../src";
import type { GoalVote, Member } from "../src";

const members: Member[] = [
  {
    id: "parent-1",
    familyId: "family-1",
    displayName: "Alice",
    role: "parent",
    pin: "1234",
  },
  {
    id: "child-1",
    familyId: "family-1",
    displayName: "Lina",
    role: "child",
    pin: "4321",
  },
  {
    id: "child-2",
    familyId: "family-1",
    displayName: "Noe",
    role: "child",
    pin: "9999",
  },
];

describe("goals", () => {
  it("autorise un parent a creer un objectif", () => {
    const goal = createGoal({
      id: "goal-1",
      familyId: "family-1",
      title: "Sortie velo",
      targetVoteCount: 2,
      createdByMemberId: "parent-1",
      members,
    });

    expect(goal.status).toBe("active");
  });

  it("refuse un second vote le meme jour pour le meme membre", () => {
    const goal = createGoal({
      id: "goal-1",
      familyId: "family-1",
      title: "Sortie velo",
      targetVoteCount: 2,
      createdByMemberId: "parent-1",
      members,
    });

    const existingVotes: GoalVote[] = [
      {
        id: "vote-1",
        familyId: "family-1",
        dayKey: "2026-03-29",
        memberId: "child-1",
        familyGoalId: "goal-1",
        createdAt: "2026-03-29T09:00:00.000Z",
      },
    ];

    expect(() =>
      castGoalVote({
        id: "vote-2",
        familyId: "family-1",
        dayKey: "2026-03-29",
        memberId: "child-1",
        goal,
        existingVotes,
        members,
        createdAt: "2026-03-29T10:00:00.000Z",
        voteHistoryEventId: "history-1",
        goalReachedHistoryEventId: "history-2",
      })
    ).toThrowError(DomainError);
  });

  it("passe un objectif en promesse et historise son atteinte quand la cible est atteinte", () => {
    const goal = createGoal({
      id: "goal-1",
      familyId: "family-1",
      title: "Sortie velo",
      targetVoteCount: 2,
      createdByMemberId: "parent-1",
      members,
    });

    const existingVotes: GoalVote[] = [
      {
        id: "vote-1",
        familyId: "family-1",
        dayKey: "2026-03-29",
        memberId: "child-1",
        familyGoalId: "goal-1",
        createdAt: "2026-03-29T09:00:00.000Z",
      },
    ];

    const result = castGoalVote({
      id: "vote-2",
      familyId: "family-1",
      dayKey: "2026-03-29",
      memberId: "child-2",
      goal,
      existingVotes,
      members,
      createdAt: "2026-03-29T10:00:00.000Z",
      voteHistoryEventId: "history-1",
      goalReachedHistoryEventId: "history-2",
    });

    expect(result.goal.status).toBe("promised");
    expect(result.reachedTarget).toBe(true);
    expect(result.historyEvents).toHaveLength(2);
    expect(result.historyEvents[1]?.type).toBe("goal_reached");
  });
});
