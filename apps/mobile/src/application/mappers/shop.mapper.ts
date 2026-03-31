import type { PointLedgerEntry, ShopItem } from "@famigo/domain";

import type { PointTransaction } from "../../data/repositories/points.repository";
import type { RewardRecord } from "../../data/repositories/shop.repository";

export function mapRewardRecordToDomain(record: RewardRecord, familyId: string): ShopItem {
  return {
    id: record.id,
    familyId,
    name: record.name,
    imageUrl: record.image_url,
    cost: record.cost,
    active: record.active,
  };
}

export function mapPointTransactionToDomain(
  record: PointTransaction
): PointLedgerEntry {
  return {
    id: record.id,
    familyId: record.family_id,
    memberId: record.member_id,
    type: record.type,
    pointsDelta: record.amount,
    occurredAt: record.occurred_at,
    referenceId: record.reward_purchase_id ?? record.daily_point_allocation_id ?? undefined,
  };
}
