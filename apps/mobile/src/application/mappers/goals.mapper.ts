import type { FamilyGoal } from "@famigo/domain";

import type { GoalRecord } from "../../data/repositories/goals.repository";

export function mapGoalRecordToDomain(record: GoalRecord): FamilyGoal {
  return {
    id: record.id,
    familyId: record.family_id,
    title: record.title,
    targetVoteCount: record.target_vote_count,
    status: record.status,
    createdByMemberId: record.created_by_member_id,
    promisedAt: record.promised_at ?? undefined,
  };
}
