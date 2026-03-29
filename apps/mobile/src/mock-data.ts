import {
  type Family,
  type FamilyGoal,
  type HistoryEvent,
  type Member,
  type PointLedgerEntry,
  type ShopItem,
  createGoal,
} from "@famigo/domain";

const familyId = "family-famigo";

export const mockFamily: Family = {
  id: familyId,
  name: "Famille Martin",
};

export const mockMembers: Member[] = [
  {
    id: "member-parent-alice",
    familyId,
    displayName: "Alice",
    role: "parent",
    pin: "1234",
  },
  {
    id: "member-parent-thomas",
    familyId,
    displayName: "Thomas",
    role: "parent",
    pin: "5678",
  },
  {
    id: "member-child-lina",
    familyId,
    displayName: "Lina",
    role: "child",
    pin: "2468",
  },
  {
    id: "member-child-noe",
    familyId,
    displayName: "Noe",
    role: "child",
    pin: "1357",
  },
];

export const mockShopItems: ShopItem[] = [
  {
    id: "shop-cinema",
    familyId,
    name: "Place de cinema",
    imageUrl: "cinema",
    cost: 4,
    active: true,
  },
  {
    id: "shop-cookie",
    familyId,
    name: "Cookie maison",
    imageUrl: "cookie",
    cost: 2,
    active: true,
  },
  {
    id: "shop-picnic",
    familyId,
    name: "Pique-nique du dimanche",
    imageUrl: "picnic",
    cost: 6,
    active: true,
  },
];

export const mockLedgerEntries: PointLedgerEntry[] = [
  {
    id: "ledger-1",
    familyId,
    memberId: "member-parent-alice",
    type: "daily_points_received",
    pointsDelta: 7,
    occurredAt: "2026-03-28T20:00:00.000Z",
  },
  {
    id: "ledger-2",
    familyId,
    memberId: "member-parent-thomas",
    type: "daily_points_received",
    pointsDelta: 3,
    occurredAt: "2026-03-28T20:00:00.000Z",
  },
  {
    id: "ledger-3",
    familyId,
    memberId: "member-child-lina",
    type: "daily_points_received",
    pointsDelta: 5,
    occurredAt: "2026-03-28T20:00:00.000Z",
  },
  {
    id: "ledger-4",
    familyId,
    memberId: "member-child-noe",
    type: "daily_points_received",
    pointsDelta: 4,
    occurredAt: "2026-03-28T20:00:00.000Z",
  },
];

export const mockGoals: FamilyGoal[] = [
  createGoal({
    id: "goal-1",
    familyId,
    title: "Soiree jeux de societe",
    targetVoteCount: 3,
    createdByMemberId: "member-parent-alice",
    members: mockMembers,
  }),
  {
    ...createGoal({
      id: "goal-2",
      familyId,
      title: "Sortie au parc",
      targetVoteCount: 2,
      createdByMemberId: "member-parent-thomas",
      members: mockMembers,
    }),
    status: "promised",
    promisedAt: "2026-03-28T18:00:00.000Z",
  },
];

export const mockHistoryEvents: HistoryEvent[] = [
  {
    id: "history-seed-1",
    familyId,
    type: "goal_reached",
    occurredAt: "2026-03-28T18:00:00.000Z",
    actorMemberId: "member-parent-thomas",
    metadata: {
      goalId: "goal-2",
      targetVoteCount: 2,
    },
  },
  {
    id: "history-seed-2",
    familyId,
    type: "shop_purchase_made",
    occurredAt: "2026-03-28T19:00:00.000Z",
    actorMemberId: "member-child-lina",
    metadata: {
      purchaseId: "purchase-seed-1",
      shopItemId: "shop-cookie",
      cost: 2,
    },
  },
];

export const initialDayKey = "2026-03-29";
