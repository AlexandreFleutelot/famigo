import type { Family } from "@famigo/domain";

import type { FamilyRecord } from "../../data/repositories/families.repository";

export function mapFamilyRecordToDomain(record: FamilyRecord): Family {
  return {
    id: record.id,
    name: record.name,
  };
}
