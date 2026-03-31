import type { Member } from "@famigo/domain";

import type {
  MemberAuthRecord,
  MemberRecord,
} from "../../data/repositories/members.repository";
import type { MemberAuthSnapshot } from "../ports";

export function mapMemberRecordToDomain(record: MemberRecord): Member {
  return {
    id: record.id,
    familyId: record.family_id,
    displayName: record.display_name,
    role: record.role,
    pin: "",
    avatarUrl: record.avatar_url ?? undefined,
  };
}

export function mapMemberAuthRecord(record: MemberAuthRecord): MemberAuthSnapshot {
  return {
    id: record.id,
    familyId: record.family_id,
    displayName: record.display_name,
    role: record.role,
    pinHash: record.pin_hash,
    avatarUrl: record.avatar_url ?? undefined,
  };
}
