import { supabase } from "../supabase/client";

export interface AuditEvent {
  id: string;
  family_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

const AUDIT_EVENT_COLUMNS = "id, family_id, event_type:type, payload:metadata, created_at";

export async function getAuditEvents(familyId: string): Promise<AuditEvent[]> {
  const { data, error } = await supabase
    .from("audit_events")
    .select(AUDIT_EVENT_COLUMNS)
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}
