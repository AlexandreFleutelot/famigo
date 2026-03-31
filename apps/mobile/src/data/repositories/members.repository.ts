import { supabase } from "../supabase/client";

export type MemberRole = "parent" | "child";

export interface MemberRecord {
  id: string;
  display_name: string;
  role: MemberRole;
  avatar_url: string | null;
}

const MEMBER_COLUMNS = "id, display_name, role, avatar_url";

export async function getFamilyMembers(familyId: string): Promise<MemberRecord[]> {
  const { data, error } = await supabase
    .from("members")
    .select(MEMBER_COLUMNS)
    .eq("family_id", familyId)
    .order("display_name", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getMemberById(memberId: string): Promise<MemberRecord | null> {
  const { data, error } = await supabase
    .from("members")
    .select(MEMBER_COLUMNS)
    .eq("id", memberId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
}
