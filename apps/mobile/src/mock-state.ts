import {
  type DailyPointAllocation,
  DomainError,
  type Family,
  type FamilyGoal,
  type GoalVote,
  type HistoryEvent,
  type Member,
  type PointLedgerEntry,
  type SessionContext,
  type ShopItem,
  castGoalVote,
  createDailyPointAllocation,
  createGoal,
  finalizeDailyPointAllocation,
  getPointBalance,
  getRemainingDailyPoints,
  purchaseShopItem,
  replaceDailyPointAllocationLines,
  selectMemberSession,
  sortHistoryEvents,
} from "@famigo/domain";

import {
  initialDayKey,
  mockFamily,
  mockGoals,
  mockHistoryEvents,
  mockLedgerEntries,
  mockMembers,
  mockShopItems,
} from "./mock-data";

export interface MockAppState {
  family: Family;
  members: ReadonlyArray<Member>;
  session: SessionContext | null;
  currentDayKey: string;
  allocationsByMember: Record<string, DailyPointAllocation>;
  ledgerEntries: ReadonlyArray<PointLedgerEntry>;
  shopItems: ReadonlyArray<ShopItem>;
  goals: ReadonlyArray<FamilyGoal>;
  votes: ReadonlyArray<GoalVote>;
  historyEvents: ReadonlyArray<HistoryEvent>;
  idCounter: number;
}

export interface MutationResult {
  state: MockAppState;
  errorMessage?: string;
}

export function createInitialMockAppState(): MockAppState {
  return {
    family: mockFamily,
    members: mockMembers,
    session: null,
    currentDayKey: initialDayKey,
    allocationsByMember: {},
    ledgerEntries: mockLedgerEntries,
    shopItems: mockShopItems,
    goals: mockGoals,
    votes: [],
    historyEvents: mockHistoryEvents,
    idCounter: 100,
  };
}

export function loginWithPin(
  state: MockAppState,
  memberId: string,
  pin: string,
  now: string
): MutationResult {
  try {
    const nextState = cloneState(state);
    const sessionId = createId(nextState, "history-session");
    const result = selectMemberSession({
      familyId: nextState.family.id,
      memberId,
      pin,
      members: nextState.members,
      now,
      historyEventId: sessionId,
    });

    nextState.session = result.session;
    nextState.historyEvents = sortHistoryEvents([...nextState.historyEvents, result.historyEvent]);

    return { state: nextState };
  } catch (error) {
    return handleMutationError(state, error);
  }
}

export function logout(state: MockAppState): MockAppState {
  return {
    ...state,
    session: null,
  };
}

export function getCurrentMember(state: MockAppState): Member | null {
  if (state.session === null) {
    return null;
  }

  return state.members.find((member) => member.id === state.session?.memberId) ?? null;
}

export function getAllocationForMember(
  state: MockAppState,
  giverMemberId: string
): DailyPointAllocation {
  const existing = state.allocationsByMember[giverMemberId];

  if (existing !== undefined && existing.dayKey === state.currentDayKey) {
    return existing;
  }

  return createDailyPointAllocation({
    id: `allocation-${giverMemberId}-${state.currentDayKey}`,
    familyId: state.family.id,
    dayKey: state.currentDayKey,
    giverMemberId,
  });
}

export function updatePointAllocation(
  state: MockAppState,
  giverMemberId: string,
  receiverMemberId: string,
  nextPoints: number
): MutationResult {
  try {
    const nextState = cloneState(state);
    const allocation = getAllocationForMember(nextState, giverMemberId);
    const remainingLines = allocation.lines.filter(
      (line) => line.receiverMemberId !== receiverMemberId
    );
    const lines =
      nextPoints > 0
        ? [...remainingLines, { receiverMemberId, points: nextPoints }]
        : remainingLines;

    const updatedAllocation = replaceDailyPointAllocationLines(allocation, lines);

    nextState.allocationsByMember[giverMemberId] = updatedAllocation;

    return { state: nextState };
  } catch (error) {
    return handleMutationError(state, error);
  }
}

export function getAllocatedPointsForReceiver(
  state: MockAppState,
  giverMemberId: string,
  receiverMemberId: string
): number {
  const allocation = getAllocationForMember(state, giverMemberId);
  return allocation.lines.find((line) => line.receiverMemberId === receiverMemberId)?.points ?? 0;
}

export function getRemainingBudgetForMember(state: MockAppState, giverMemberId: string): number {
  return getRemainingDailyPoints(getAllocationForMember(state, giverMemberId));
}

export function getPendingPointsForMember(state: MockAppState, memberId: string): number {
  return Object.values(state.allocationsByMember)
    .filter((allocation) => allocation.dayKey === state.currentDayKey)
    .flatMap((allocation) => allocation.lines)
    .filter((line) => line.receiverMemberId === memberId)
    .reduce((sum, line) => sum + line.points, 0);
}

export function getBalanceForMember(state: MockAppState, memberId: string): number {
  return getPointBalance(state.ledgerEntries, memberId);
}

export function simulateEndOfDay(state: MockAppState, finalizedAt: string): MutationResult {
  try {
    const nextState = cloneState(state);
    const ledgerEntries: PointLedgerEntry[] = [...nextState.ledgerEntries];
    const historyEvents: HistoryEvent[] = [...nextState.historyEvents];

    for (const member of nextState.members) {
      const allocation = getAllocationForMember(nextState, member.id);
      const ledgerEntryIds = allocation.lines.map(() => createId(nextState, "ledger"));
      const historyEventIds = allocation.lines.map(() => createId(nextState, "history-points"));

      const result = finalizeDailyPointAllocation({
        allocation,
        finalizedAt,
        ledgerEntryIds,
        historyEventIds,
      });

      ledgerEntries.push(...result.ledgerEntries);
      historyEvents.push(...result.historyEvents);
    }

    nextState.ledgerEntries = ledgerEntries;
    nextState.historyEvents = sortHistoryEvents(historyEvents);
    nextState.allocationsByMember = {};
    nextState.currentDayKey = getNextDayKey(nextState.currentDayKey);

    return { state: nextState };
  } catch (error) {
    return handleMutationError(state, error);
  }
}

export function buyShopItem(
  state: MockAppState,
  buyerMemberId: string,
  itemId: string,
  purchasedAt: string
): MutationResult {
  try {
    const nextState = cloneState(state);
    const item = nextState.shopItems.find((candidate) => candidate.id === itemId);

    if (item === undefined) {
      throw new DomainError("SHOP_ITEM_NOT_FOUND", "Le cadeau selectionne est introuvable.");
    }

    const result = purchaseShopItem({
      id: createId(nextState, "purchase"),
      buyerMemberId,
      familyId: nextState.family.id,
      item,
      existingLedgerEntries: nextState.ledgerEntries,
      purchasedAt,
      ledgerEntryId: createId(nextState, "ledger"),
      historyEventId: createId(nextState, "history-purchase"),
    });

    nextState.ledgerEntries = [...nextState.ledgerEntries, result.ledgerEntry];
    nextState.historyEvents = sortHistoryEvents([...nextState.historyEvents, result.historyEvent]);

    return { state: nextState };
  } catch (error) {
    return handleMutationError(state, error);
  }
}

export function voteForGoal(
  state: MockAppState,
  memberId: string,
  goalId: string,
  createdAt: string
): MutationResult {
  try {
    const nextState = cloneState(state);
    const goal = nextState.goals.find((candidate) => candidate.id === goalId);

    if (goal === undefined) {
      throw new DomainError("GOAL_NOT_FOUND", "L'objectif selectionne est introuvable.");
    }

    const result = castGoalVote({
      id: createId(nextState, "vote"),
      familyId: nextState.family.id,
      dayKey: nextState.currentDayKey,
      memberId,
      goal,
      existingVotes: nextState.votes,
      members: nextState.members,
      createdAt,
      voteHistoryEventId: createId(nextState, "history-vote"),
      goalReachedHistoryEventId: createId(nextState, "history-goal"),
    });

    nextState.votes = [...nextState.votes, result.vote];
    nextState.goals = nextState.goals.map((candidate) =>
      candidate.id === result.goal.id ? result.goal : candidate
    );
    nextState.historyEvents = sortHistoryEvents([
      ...nextState.historyEvents,
      ...result.historyEvents,
    ]);

    return { state: nextState };
  } catch (error) {
    return handleMutationError(state, error);
  }
}

export function createFamilyGoal(
  state: MockAppState,
  creatorMemberId: string,
  title: string,
  targetVoteCount: number
): MutationResult {
  try {
    const nextState = cloneState(state);
    const goal = createGoal({
      id: createId(nextState, "goal"),
      familyId: nextState.family.id,
      title,
      targetVoteCount,
      createdByMemberId: creatorMemberId,
      members: nextState.members,
    });

    nextState.goals = [goal, ...nextState.goals];

    return { state: nextState };
  } catch (error) {
    return handleMutationError(state, error);
  }
}

export function hasMemberVotedToday(state: MockAppState, memberId: string): boolean {
  return state.votes.some(
    (vote) => vote.memberId === memberId && vote.dayKey === state.currentDayKey
  );
}

export function getGoalVoteCount(state: MockAppState, goalId: string): number {
  return state.votes.filter((vote) => vote.familyGoalId === goalId).length;
}

function cloneState(state: MockAppState): MockAppState {
  return {
    ...state,
    allocationsByMember: { ...state.allocationsByMember },
    ledgerEntries: [...state.ledgerEntries],
    goals: [...state.goals],
    votes: [...state.votes],
    historyEvents: [...state.historyEvents],
  };
}

function handleMutationError(state: MockAppState, error: unknown): MutationResult {
  if (error instanceof DomainError) {
    return {
      state,
      errorMessage: error.message,
    };
  }

  return {
    state,
    errorMessage: "Une erreur inattendue est survenue.",
  };
}

function createId(state: MockAppState, prefix: string): string {
  state.idCounter += 1;
  return `${prefix}-${state.idCounter}`;
}

function getNextDayKey(dayKey: string): string {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
