import { supabase } from "../supabase/client";

export interface FamilyRecord {
  id: string;
  name: string;
}

const FAMILY_COLUMNS = "id, name";

export async function getFamilies(): Promise<FamilyRecord[]> {
  const { data, error } = await supabase.from("families").select(FAMILY_COLUMNS).order("name");

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getFamilyById(familyId: string): Promise<FamilyRecord | null> {
  const { data, error } = await supabase
    .from("families")
    .select(FAMILY_COLUMNS)
    .eq("id", familyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
}
