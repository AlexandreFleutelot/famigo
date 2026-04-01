import type { DailyPointAllocation as DomainDailyPointAllocation } from "@famigo/domain";

import { supabase } from "../supabase/client";

export interface DailyPointAllocation {
  id: string;
  family_id: string;
  date: string;
  giver_member_id: string;
  status: "draft" | "finalized";
  finalized_at: string | null;
}

export interface DailyPointAllocationLine {
  allocation_id: string;
  receiver_member_id: string;
  points: number;
}

interface PendingPointLineRow {
  points: number;
}

export interface FinalizeDailyAllocationResult {
  success: boolean;
  error?: string;
}

const DAILY_POINT_ALLOCATION_COLUMNS =
  "id, family_id, date:day_key, giver_member_id, status, finalized_at";
const DAILY_POINT_ALLOCATION_LINE_COLUMNS = "allocation_id, receiver_member_id, points";

function mapDomainAllocation(params: {
  allocation: DailyPointAllocation;
  lines: ReadonlyArray<DailyPointAllocationLine>;
}): DomainDailyPointAllocation {
  return {
    id: params.allocation.id,
    familyId: params.allocation.family_id,
    dayKey: params.allocation.date,
    giverMemberId: params.allocation.giver_member_id,
    status: params.allocation.status,
    finalizedAt: params.allocation.finalized_at ?? undefined,
    lines: params.lines.map((line) => ({
      receiverMemberId: line.receiver_member_id,
      points: line.points,
    })),
  };
}

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

export async function getDailyAllocationForMember(input: {
  familyId: string;
  giverMemberId: string;
  dayKey: string;
}): Promise<DomainDailyPointAllocation | null> {
  const { data, error } = await supabase
    .from("daily_point_allocations")
    .select(DAILY_POINT_ALLOCATION_COLUMNS)
    .eq("family_id", input.familyId)
    .eq("giver_member_id", input.giverMemberId)
    .eq("day_key", input.dayKey)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data === null) {
    return null;
  }

  const { data: lines, error: linesError } = await supabase
    .from("daily_point_allocation_lines")
    .select(DAILY_POINT_ALLOCATION_LINE_COLUMNS)
    .eq("allocation_id", data.id)
    .order("receiver_member_id", { ascending: true });

  if (linesError) {
    throw linesError;
  }

  return mapDomainAllocation({
    allocation: data,
    lines: lines ?? [],
  });
}

export async function getPendingPointsForMember(input: {
  familyId: string;
  memberId: string;
  dayKey: string;
}): Promise<number> {
  const { data, error } = await supabase
    .from("daily_point_allocation_lines")
    .select("points, daily_point_allocations!inner(family_id, day_key, status)")
    .eq("receiver_member_id", input.memberId)
    .eq("daily_point_allocations.family_id", input.familyId)
    .eq("daily_point_allocations.day_key", input.dayKey)
    .eq("daily_point_allocations.status", "draft");

  if (error) {
    throw error;
  }

  return (data as ReadonlyArray<PendingPointLineRow> | null)?.reduce(
    (sum, line) => sum + line.points,
    0
  ) ?? 0;
}

export async function saveDailyAllocationDraft(input: {
  familyId: string;
  giverMemberId: string;
  dayKey: string;
  lines: ReadonlyArray<{ receiverMemberId: string; points: number }>;
}): Promise<DomainDailyPointAllocation> {
  const existingAllocation = await getDailyAllocationForMember(input);

  if (existingAllocation?.status === "finalized") {
    throw new Error("ALLOCATION_ALREADY_FINALIZED");
  }

  let allocationId = existingAllocation?.id ?? null;

  if (allocationId === null) {
    const { data: createdAllocation, error: createError } = await supabase
      .from("daily_point_allocations")
      .insert({
        family_id: input.familyId,
        day_key: input.dayKey,
        giver_member_id: input.giverMemberId,
        status: "draft",
      })
      .select(DAILY_POINT_ALLOCATION_COLUMNS)
      .single();

    if (createError) {
      throw createError;
    }

    allocationId = createdAllocation.id;
  }

  const { error: deleteLinesError } = await supabase
    .from("daily_point_allocation_lines")
    .delete()
    .eq("allocation_id", allocationId);

  if (deleteLinesError) {
    throw deleteLinesError;
  }

  if (input.lines.length > 0) {
    const { error: insertLinesError } = await supabase
      .from("daily_point_allocation_lines")
      .insert(
        input.lines.map((line) => ({
          allocation_id: allocationId,
          family_id: input.familyId,
          receiver_member_id: line.receiverMemberId,
          points: line.points,
        }))
      );

    if (insertLinesError) {
      throw insertLinesError;
    }
  }

  const savedAllocation = await getDailyAllocationForMember(input);

  if (savedAllocation === null) {
    throw new Error("ALLOCATION_NOT_FOUND");
  }

  return savedAllocation;
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
