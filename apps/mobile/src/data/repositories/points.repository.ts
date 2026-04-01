import type { PointLedgerEntry } from "@famigo/domain";

import { supabase } from "../supabase/client";

interface PointTransactionRow {
  id: string;
  family_id: string;
  member_id: string;
  points_delta: number;
  type: PointLedgerEntry["type"];
  daily_point_allocation_id: string | null;
  reward_purchase_id: string | null;
  occurred_at: string;
}

const POINT_TRANSACTION_COLUMNS =
  "id, family_id, member_id, points_delta, type, occurred_at, daily_point_allocation_id, reward_purchase_id";

function mapPointTransactionRow(row: PointTransactionRow): PointLedgerEntry {
  return {
    id: row.id,
    familyId: row.family_id,
    memberId: row.member_id,
    type: row.type,
    pointsDelta: row.points_delta,
    occurredAt: row.occurred_at,
    referenceId: row.reward_purchase_id ?? row.daily_point_allocation_id ?? undefined,
  };
}

export async function getPointTransactions(
  memberId: string
): Promise<ReadonlyArray<PointLedgerEntry>> {
  const { data, error } = await supabase
    .from("point_transactions")
    .select(POINT_TRANSACTION_COLUMNS)
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapPointTransactionRow);
}
