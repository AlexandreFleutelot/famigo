export const DAILY_POINT_BUDGET = 5;

export type Role = "parent" | "child";
export type GoalStatus = "active" | "promised" | "archived";
export type DailyAllocationStatus = "draft" | "finalized";
export type PointLedgerEntryType = "daily_points_received" | "shop_purchase";
export type HistoryEventType =
  | "member_session_started"
  | "points_given"
  | "shop_purchase_made"
  | "goal_vote_recorded"
  | "goal_reached";

export interface Family {
  id: string;
  name: string;
}

export interface Member {
  id: string;
  familyId: string;
  displayName: string;
  role: Role;
  pin: string;
  avatarUrl?: string;
}

export interface SessionContext {
  familyId: string;
  memberId: string;
  startedAt: string;
}

export interface DailyPointAllocationLine {
  receiverMemberId: string;
  points: number;
}

export interface DailyPointAllocation {
  id: string;
  familyId: string;
  dayKey: string;
  giverMemberId: string;
  status: DailyAllocationStatus;
  lines: ReadonlyArray<DailyPointAllocationLine>;
  finalizedAt?: string;
}

export interface PointLedgerEntry {
  id: string;
  familyId: string;
  memberId: string;
  type: PointLedgerEntryType;
  pointsDelta: number;
  occurredAt: string;
  dayKey?: string;
  referenceId?: string;
}

export interface ShopItem {
  id: string;
  familyId: string;
  name: string;
  imageUrl: string;
  cost: number;
  active: boolean;
}

export interface Purchase {
  id: string;
  familyId: string;
  memberId: string;
  shopItemId: string;
  costSnapshot: number;
  purchasedAt: string;
}

export interface FamilyGoal {
  id: string;
  familyId: string;
  title: string;
  targetVoteCount: number;
  status: GoalStatus;
  createdByMemberId: string;
  promisedAt?: string;
}

export interface GoalVote {
  id: string;
  familyId: string;
  dayKey: string;
  memberId: string;
  familyGoalId: string;
  createdAt: string;
}

export interface HistoryEvent {
  id: string;
  familyId: string;
  type: HistoryEventType;
  occurredAt: string;
  actorMemberId?: string;
  subjectMemberId?: string;
  metadata: Record<string, string | number | boolean | null>;
}

export interface RecordedEvent<TPayload> {
  event: TPayload;
  historyEvent: HistoryEvent;
}
