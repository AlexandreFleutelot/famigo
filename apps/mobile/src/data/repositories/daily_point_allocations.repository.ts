import { supabase } from "../supabase/client";

export interface DailyPointAllocation {
  id: string;
  family_id: string;
  date: string;
  finalized_at: string | null;
}

export interface FinalizeDailyAllocationResult {
  success: boolean;
  error?: string;
}

const DAILY_POINT_ALLOCATION_COLUMNS = "id, family_id, date:day_key, finalized_at";

export async function getDailyAllocations(
  familyId: string,
  date: string
): Promise<DailyPointAllocation[]> {
  const { data, error } = await supabase
    .from("daily_point_allocations")
    .select(DAILY_POINT_ALLOCATION_COLUMNS)
    .eq("family_id", familyId)
    .eq("day_key", date);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function finalizeDailyAllocation(
  allocationId: string
): Promise<FinalizeDailyAllocationResult> {
  const { error } = await supabase.rpc("finalize_daily_point_allocation", {
    p_allocation_id: allocationId,
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return { success: true };
}
