import type { FamilyGoal, GoalStatus, Member, PointLedgerEntry, ShopItem } from "@famigo/domain";

export interface MemberAuthSnapshot {
  id: string;
  familyId: string;
  displayName: string;
  role: Member["role"];
  pinHash: string;
  avatarUrl?: string;
}

export interface MembersGateway {
  listFamilyMembers(familyId: string): Promise<ReadonlyArray<Member>>;
  getMemberAuthSnapshot(memberId: string): Promise<MemberAuthSnapshot | null>;
}

export interface PinVerifier {
  verify(input: { pin: string; pinHash: string }): Promise<boolean>;
}

export interface PurchaseRewardCommand {
  familyId: string;
  memberId: string;
  rewardId: string;
  purchasedAt?: string;
}

export interface PurchaseRewardReceipt {
  purchaseId: string;
  pointTransactionId: string;
  auditEventId: string;
  memberId: string;
  rewardId: string;
  cost: number;
  purchasedAt: string;
  resultingBalance: number;
}

export interface ShopGateway {
  listRewards(familyId: string): Promise<ReadonlyArray<ShopItem>>;
  listPointLedgerEntries(memberId: string): Promise<ReadonlyArray<PointLedgerEntry>>;
  purchaseReward(input: PurchaseRewardCommand): Promise<PurchaseRewardReceipt>;
}

export interface GoalVoteReceipt {
  voteId: string;
  voteAuditEventId: string;
  goalReachedAuditEventId: string | null;
  familyGoalId: string;
  memberId: string;
  dayKey: string;
  goalStatus: GoalStatus;
  reachedTarget: boolean;
  totalVotes: number;
}

export interface GoalsGateway {
  listGoals(familyId: string): Promise<ReadonlyArray<FamilyGoal>>;
  castGoalVote(input: {
    familyId: string;
    memberId: string;
    goalId: string;
    dayKey: string;
  }): Promise<GoalVoteReceipt>;
}
