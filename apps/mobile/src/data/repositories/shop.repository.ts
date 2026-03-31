import { supabase } from "../supabase/client";

export interface RewardRecord {
  id: string;
  name: string;
  image_url: string;
  cost: number;
  active: boolean;
}

export interface PurchaseRewardInput {
  familyId: string;
  memberId: string;
  rewardId: string;
  purchasedAt?: string;
}

export interface PurchaseRewardResult {
  purchaseId: string;
  pointTransactionId: string;
  auditEventId: string;
  memberId: string;
  rewardId: string;
  cost: number;
  purchasedAt: string;
  resultingBalance: number;
}

const REWARD_COLUMNS = "id, name, image_url, cost, active";

export async function getRewards(familyId: string): Promise<RewardRecord[]> {
  const { data, error } = await supabase
    .from("rewards")
    .select(REWARD_COLUMNS)
    .eq("family_id", familyId)
    .order("active", { ascending: false })
    .order("cost", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function purchaseReward(input: PurchaseRewardInput): Promise<PurchaseRewardResult> {
  const { data, error } = await supabase.rpc("purchase_reward", {
    p_family_id: input.familyId,
    p_member_id: input.memberId,
    p_reward_id: input.rewardId,
    p_purchased_at: input.purchasedAt,
  });

  if (error) {
    throw error;
  }

  return data as PurchaseRewardResult;
}
