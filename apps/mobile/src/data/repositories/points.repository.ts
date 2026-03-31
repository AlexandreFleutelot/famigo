import { supabase } from "../supabase/client";

export type PointTransactionType = "daily_points_received" | "shop_purchase";

export interface PointTransaction {
  id: string;
  family_id: string;
  member_id: string;
  amount: number;
  type: PointTransactionType;
  daily_point_allocation_id: string | null;
  reward_purchase_id: string | null;
  occurred_at: string;
  created_at: string;
}

const POINT_TRANSACTION_COLUMNS =
  "id, family_id, member_id, amount:points_delta, type, occurred_at, created_at, daily_point_allocation_id, reward_purchase_id";

export async function getPointTransactions(memberId: string): Promise<PointTransaction[]> {
  const { data, error } = await supabase
    .from("point_transactions")
    .select(POINT_TRANSACTION_COLUMNS)
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}
