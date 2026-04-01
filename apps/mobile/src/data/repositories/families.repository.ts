import type { Family } from "@famigo/domain";

import { supabase } from "../supabase/client";

interface FamilyRow {
  id: string;
  name: string;
}

const FAMILY_COLUMNS = "id, name";

function mapFamilyRow(row: FamilyRow): Family {
  return {
    id: row.id,
    name: row.name,
  };
}

export async function getFamilies(): Promise<ReadonlyArray<Family>> {
  const { data, error } = await supabase.from("families").select(FAMILY_COLUMNS).order("name");

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapFamilyRow);
}

export async function getFamilyById(familyId: string): Promise<Family | null> {
  const { data, error } = await supabase
    .from("families")
    .select(FAMILY_COLUMNS)
    .eq("id", familyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapFamilyRow(data) : null;
}
