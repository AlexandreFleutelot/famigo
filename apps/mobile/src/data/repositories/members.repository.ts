import type { Member } from "@famigo/domain";

import { supabase } from "../supabase/client";

export type MemberRole = "parent" | "child";

interface MemberRow {
  id: string;
  family_id: string;
  display_name: string;
  role: MemberRole;
  avatar_url: string | null;
}

interface MemberAuthRow extends MemberRow {
  pin_hash: string;
}

export interface MemberAuth {
  id: string;
  familyId: string;
  displayName: string;
  role: Member["role"];
  pinHash: string;
  avatarUrl?: string;
}

const MEMBER_COLUMNS = "id, family_id, display_name, role, avatar_url";
const MEMBER_AUTH_COLUMNS = `${MEMBER_COLUMNS}, pin_hash`;

function mapMemberRow(row: MemberRow): Member {
  return {
    id: row.id,
    familyId: row.family_id,
    displayName: row.display_name,
    role: row.role,
    pin: "",
    avatarUrl: row.avatar_url ?? undefined,
  };
}

function mapMemberAuthRow(row: MemberAuthRow): MemberAuth {
  return {
    id: row.id,
    familyId: row.family_id,
    displayName: row.display_name,
    role: row.role,
    pinHash: row.pin_hash,
    avatarUrl: row.avatar_url ?? undefined,
  };
}

export async function getFamilyMembers(familyId: string): Promise<ReadonlyArray<Member>> {
  const { data, error } = await supabase
    .from("members")
    .select(MEMBER_COLUMNS)
    .eq("family_id", familyId)
    .order("display_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapMemberRow);
}

export async function getMemberById(memberId: string): Promise<Member | null> {
  const { data, error } = await supabase
    .from("members")
    .select(MEMBER_COLUMNS)
    .eq("id", memberId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapMemberRow(data) : null;
}

export async function getMemberAuthById(memberId: string): Promise<MemberAuth | null> {
  const { data, error } = await supabase
    .from("members")
    .select(MEMBER_AUTH_COLUMNS)
    .eq("id", memberId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapMemberAuthRow(data) : null;
}
