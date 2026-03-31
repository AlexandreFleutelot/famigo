import { supabase } from "../supabase/client";

export interface Reward {
  id: string;
  family_id: string;
  name: string;
  image_url: string;
  cost: number;
  active: boolean;
}

export interface CreateRewardInput {
  family_id: string;
  name: string;
  image_url: string;
  cost: number;
  active?: boolean;
}

export interface UpdateRewardInput {
  family_id?: string;
  name?: string;
  image_url?: string;
  cost?: number;
  active?: boolean;
}

const REWARD_COLUMNS = "id, family_id, name, image_url, cost, active";

export async function createReward(input: CreateRewardInput): Promise<Reward> {
  const { data, error } = await supabase
    .from("rewards")
    .insert({
      family_id: input.family_id,
      name: input.name,
      image_url: input.image_url,
      cost: input.cost,
      active: input.active ?? true,
    })
    .select(REWARD_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateReward(rewardId: string, input: UpdateRewardInput): Promise<Reward> {
  const { data, error } = await supabase
    .from("rewards")
    .update(input)
    .eq("id", rewardId)
    .select(REWARD_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return data;
}
