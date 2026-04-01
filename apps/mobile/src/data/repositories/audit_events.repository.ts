import type { HistoryEventType } from "@famigo/domain";

import { supabase } from "../supabase/client";

export interface AuditEvent {
  id: string;
  familyId: string;
  type: HistoryEventType;
  occurredAt: string;
  actorMemberId?: string;
  subjectMemberId?: string;
  metadata: Record<string, string | number | boolean | null>;
}

interface AuditEventRow {
  id: string;
  family_id: string;
  type: HistoryEventType;
  occurred_at: string;
  actor_member_id: string | null;
  subject_member_id: string | null;
  metadata: Record<string, string | number | boolean | null> | null;
}

const AUDIT_EVENT_COLUMNS =
  "id, family_id, type, occurred_at, actor_member_id, subject_member_id, metadata";

function mapAuditEventRow(row: AuditEventRow): AuditEvent {
  return {
    id: row.id,
    familyId: row.family_id,
    type: row.type,
    occurredAt: row.occurred_at,
    actorMemberId: row.actor_member_id ?? undefined,
    subjectMemberId: row.subject_member_id ?? undefined,
    metadata: row.metadata ?? {},
  };
}

export async function getAuditEvents(familyId: string): Promise<ReadonlyArray<AuditEvent>> {
  const { data, error } = await supabase
    .from("audit_events")
    .select(AUDIT_EVENT_COLUMNS)
    .eq("family_id", familyId)
    .order("occurred_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapAuditEventRow);
}
