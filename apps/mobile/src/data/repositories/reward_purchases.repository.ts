import { supabase } from "../supabase/client";

export interface RewardPurchase {
  id: string;
  member_id: string;
  reward_id: string;
  cost: number;
  created_at: string;
}

const REWARD_PURCHASE_COLUMNS = "id, member_id, reward_id, cost:cost_snapshot, created_at";

export async function getRewardPurchases(memberId: string): Promise<RewardPurchase[]> {
  const { data, error } = await supabase
    .from("reward_purchases")
    .select(REWARD_PURCHASE_COLUMNS)
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}
