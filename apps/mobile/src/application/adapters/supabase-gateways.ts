import type { Family, FamilyGoal, Member, PointLedgerEntry, ShopItem } from "@famigo/domain";

import { getFamilies, getFamilyById } from "../../data/repositories/families.repository";
import { castVote, getActiveGoals } from "../../data/repositories/goals.repository";
import { getFamilyMembers, getMemberAuthById } from "../../data/repositories/members.repository";
import { getPointTransactions } from "../../data/repositories/points.repository";
import { getRewards, purchaseReward } from "../../data/repositories/shop.repository";
import { mapFamilyRecordToDomain } from "../mappers/family.mapper";
import { mapGoalRecordToDomain } from "../mappers/goals.mapper";
import { mapMemberAuthRecord, mapMemberRecordToDomain } from "../mappers/member.mapper";
import { mapPointTransactionToDomain, mapRewardRecordToDomain } from "../mappers/shop.mapper";
import type {
  FamiliesGateway,
  GoalsGateway,
  MembersGateway,
  PurchaseRewardCommand,
  PurchaseRewardReceipt,
  ShopGateway,
} from "../ports";

export const supabaseFamiliesGateway: FamiliesGateway = {
  async listFamilies(): Promise<ReadonlyArray<Family>> {
    const records = await getFamilies();
    return records.map(mapFamilyRecordToDomain);
  },

  async getFamilyById(familyId: string): Promise<Family | null> {
    const record = await getFamilyById(familyId);
    return record ? mapFamilyRecordToDomain(record) : null;
  },
};

export const supabaseMembersGateway: MembersGateway = {
  async listFamilyMembers(familyId: string): Promise<ReadonlyArray<Member>> {
    const records = await getFamilyMembers(familyId);
    return records.map(mapMemberRecordToDomain);
  },

  async getMemberAuthSnapshot(memberId: string) {
    const record = await getMemberAuthById(memberId);
    return record ? mapMemberAuthRecord(record) : null;
  },
};

export const supabaseShopGateway: ShopGateway = {
  async listRewards(familyId: string): Promise<ReadonlyArray<ShopItem>> {
    const records = await getRewards(familyId);
    return records.map((record) => mapRewardRecordToDomain(record, familyId));
  },

  async listPointLedgerEntries(memberId: string): Promise<ReadonlyArray<PointLedgerEntry>> {
    const records = await getPointTransactions(memberId);

    return records.map(mapPointTransactionToDomain);
  },

  async purchaseReward(input: PurchaseRewardCommand): Promise<PurchaseRewardReceipt> {
    return purchaseReward({
      familyId: input.familyId,
      memberId: input.memberId,
      rewardId: input.rewardId,
      purchasedAt: input.purchasedAt,
    });
  },
};

export const supabaseGoalsGateway: GoalsGateway = {
  async listGoals(familyId: string): Promise<ReadonlyArray<FamilyGoal>> {
    const records = await getActiveGoals(familyId);
    return records.map(mapGoalRecordToDomain);
  },

  async castGoalVote(input) {
    return castVote({
      familyId: input.familyId,
      memberId: input.memberId,
      goalId: input.goalId,
      dayKey: input.dayKey,
    });
  },
};
