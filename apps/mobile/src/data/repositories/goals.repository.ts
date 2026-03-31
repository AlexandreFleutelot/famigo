import { supabase } from "../supabase/client";

export type GoalStatus = "active" | "promised" | "archived";

export interface GoalRecord {
  id: string;
  family_id: string;
  title: string;
  target_vote_count: number;
  status: GoalStatus;
  created_by_member_id: string;
  promised_at: string | null;
  created_at: string;
}

export interface CastGoalVoteInput {
  familyId: string;
  memberId: string;
  goalId: string;
  dayKey: string;
}

export interface CastGoalVoteResult {
  voteId: string;
  voteAuditEventId: string;
  goalReachedAuditEventId: string | null;
  familyGoalId: string;
  memberId: string;
  dayKey: string;
  goalStatus: GoalStatus;
  reachedTarget: boolean;
  totalVotes: number;
}

const GOAL_COLUMNS =
  "id, family_id, title, target_vote_count, status, created_by_member_id, promised_at, created_at";

export async function getActiveGoals(familyId: string): Promise<GoalRecord[]> {
  const { data, error } = await supabase
    .from("family_goals")
    .select(GOAL_COLUMNS)
    .eq("family_id", familyId)
    .in("status", ["active", "promised"])
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function castVote(input: CastGoalVoteInput): Promise<CastGoalVoteResult> {
  const { data, error } = await supabase.rpc("cast_goal_vote", {
    p_family_id: input.familyId,
    p_member_id: input.memberId,
    p_family_goal_id: input.goalId,
    p_day_key: input.dayKey,
  });

  if (error) {
    throw error;
  }

  return data as CastGoalVoteResult;
}
