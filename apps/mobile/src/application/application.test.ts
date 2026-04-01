import { describe, expect, it, vi } from "vitest";

import type { Family, FamilyGoal, Member, PointLedgerEntry, ShopItem } from "@famigo/domain";

import { ApplicationError } from "./errors";
import { createMemoryAppSessionGateway } from "./session";
import type { AuditEvent } from "../data/repositories/audit_events.repository";
import { createBuyRewardUseCase } from "./use-cases/buy-reward";
import { createCastGoalVoteUseCase } from "./use-cases/cast-goal-vote";
import { createClearSessionUseCase } from "./use-cases/clear-session";
import { createFinalizeDailyPointsUseCase } from "./use-cases/finalize-daily-points";
import { createGetFamiliesUseCase } from "./use-cases/get-families";
import { createGetMembersForSelectedFamilyUseCase } from "./use-cases/get-members-for-selected-family";
import { createLoadDailyPointsUseCase } from "./use-cases/load-daily-points";
import { createLoadPendingPointsUseCase } from "./use-cases/load-pending-points";
import { createLoadHistoryUseCase } from "./use-cases/load-history";
import { createLoadShopUseCase } from "./use-cases/load-shop";
import { createLoginWithPinUseCase, type PinVerifier } from "./use-cases/login-with-pin";
import { createRestoreSessionUseCase } from "./use-cases/restore-session";
import { createSaveDailyPointsUseCase } from "./use-cases/save-daily-points";
import { createSelectFamilyUseCase } from "./use-cases/select-family";
import { createStartMemberSessionUseCase } from "./use-cases/start-member-session";

const familyId = "family-1";
const memberId = "member-1";

describe("application use cases", () => {
  it("lists available families", async () => {
    const getFamilies = vi.fn(
      async (): Promise<ReadonlyArray<Family>> => [{ id: familyId, name: "Famille Martin" }]
    );

    const useCase = createGetFamiliesUseCase({ getFamilies });
    const result = await useCase();

    expect(result).toEqual({
      ok: true,
      data: {
        families: [{ id: familyId, name: "Famille Martin" }],
      },
    });
  });

  it("selects a family, loads its members, and starts a simple member session", async () => {
    const family: Family = { id: familyId, name: "Famille Martin" };
    const member: Member = {
      id: memberId,
      familyId,
      displayName: "Alice",
      role: "parent",
      pin: "",
    };
    const getFamilyById = vi.fn(async () => family);
    const getFamilyMembers = vi.fn(async (): Promise<ReadonlyArray<Member>> => [member]);
    const getMemberById = vi.fn(async () => member);
    const appSessionGateway = createMemoryAppSessionGateway();

    const selectFamily = createSelectFamilyUseCase({
      appSessionGateway,
      getFamilyById,
    });
    const getMembersForSelectedFamily = createGetMembersForSelectedFamilyUseCase({
      appSessionGateway,
      getFamilyMembers,
    });
    const startMemberSession = createStartMemberSessionUseCase({
      appSessionGateway,
      getMemberById,
    });

    const selectedFamily = await selectFamily({ familyId });
    const members = await getMembersForSelectedFamily();
    const startedSession = await startMemberSession({ memberId });

    expect(selectedFamily).toEqual({
      ok: true,
      data: {
        family,
        session: {
          selectedFamilyId: familyId,
          selectedMemberId: null,
        },
      },
    });
    expect(members).toEqual({
      ok: true,
      data: {
        familyId,
        members: [member],
        session: {
          selectedFamilyId: familyId,
          selectedMemberId: null,
        },
      },
    });
    expect(startedSession).toEqual({
      ok: true,
      data: {
        member,
        session: {
          selectedFamilyId: familyId,
          selectedMemberId: memberId,
        },
      },
    });
  });

  it("restores a stored family selection and drops a stale member selection", async () => {
    const getFamilyById = vi.fn(async () => ({ id: familyId, name: "Famille Martin" }));
    const getMemberById = vi.fn(async () => null);
    const appSessionGateway = createMemoryAppSessionGateway({
      selectedFamilyId: familyId,
      selectedMemberId: "missing-member",
    });

    const restoreSession = createRestoreSessionUseCase({
      appSessionGateway,
      getFamilyById,
      getMemberById,
    });

    const result = await restoreSession();

    expect(result).toEqual({
      ok: true,
      data: {
        family: { id: familyId, name: "Famille Martin" },
        member: null,
        session: {
          selectedFamilyId: familyId,
          selectedMemberId: null,
        },
      },
    });
    await expect(appSessionGateway.read()).resolves.toEqual({
      selectedFamilyId: familyId,
      selectedMemberId: null,
    });
  });

  it("clears the stored app session", async () => {
    const appSessionGateway = createMemoryAppSessionGateway({
      selectedFamilyId: familyId,
      selectedMemberId: memberId,
    });
    const clearSession = createClearSessionUseCase({ appSessionGateway });

    const result = await clearSession();

    expect(result).toEqual({
      ok: true,
      data: {
        cleared: true,
      },
    });
    await expect(appSessionGateway.read()).resolves.toBeNull();
  });

  it("loads the shop with a computed balance", async () => {
    const getRewards = vi.fn(
      async (): Promise<ReadonlyArray<ShopItem>> => [
        {
          id: "reward-1",
          familyId,
          name: "Cinema",
          imageUrl: "cinema",
          cost: 4,
          active: true,
        },
      ]
    );
    const getPointTransactions = vi.fn(
      async (): Promise<ReadonlyArray<PointLedgerEntry>> => [
        {
          id: "ledger-1",
          familyId,
          memberId,
          type: "daily_points_received",
          pointsDelta: 7,
          occurredAt: "2026-03-31T18:00:00.000Z",
        },
        {
          id: "ledger-2",
          familyId,
          memberId,
          type: "shop_purchase",
          pointsDelta: -2,
          occurredAt: "2026-03-31T19:00:00.000Z",
        },
      ]
    );

    const loadShop = createLoadShopUseCase({ getRewards, getPointTransactions });
    const result = await loadShop({ familyId, memberId });

    expect(result).toEqual({
      ok: true,
      data: {
        items: [
          {
            id: "reward-1",
            familyId,
            name: "Cinema",
            imageUrl: "cinema",
            cost: 4,
            active: true,
          },
        ],
        ledgerEntries: [
          {
            id: "ledger-1",
            familyId,
            memberId,
            type: "daily_points_received",
            pointsDelta: 7,
            occurredAt: "2026-03-31T18:00:00.000Z",
          },
          {
            id: "ledger-2",
            familyId,
            memberId,
            type: "shop_purchase",
            pointsDelta: -2,
            occurredAt: "2026-03-31T19:00:00.000Z",
          },
        ],
        balance: 5,
      },
    });
  });

  it("loads the shared history from backend audit events", async () => {
    const auditEvents: ReadonlyArray<AuditEvent> = [
        {
          id: "audit-1",
          familyId,
          type: "shop_purchase_made" as const,
          occurredAt: "2026-03-31T20:00:00.000Z",
          actorMemberId: memberId,
          subjectMemberId: memberId,
          metadata: {
            purchaseId: "purchase-1",
            rewardId: "reward-1",
            cost: 2,
          },
        },
        {
          id: "audit-2",
          familyId,
          type: "member_session_started" as const,
          occurredAt: "2026-03-31T18:00:00.000Z",
          actorMemberId: memberId,
          metadata: {},
        },
        {
          id: "audit-3",
          familyId,
          type: "goal_vote_recorded" as const,
          occurredAt: "2026-03-31T19:00:00.000Z",
          actorMemberId: memberId,
          metadata: {
            goalId: "goal-1",
            dayKey: "2026-03-31",
          },
        },
      ];
    const getAuditEvents = vi.fn(async () => auditEvents);

    const loadHistory = createLoadHistoryUseCase({ getAuditEvents });
    const result = await loadHistory({ familyId });

    expect(result).toEqual({
      ok: true,
      data: {
        events: [
          {
            id: "audit-1",
            familyId,
            type: "shop_purchase_made",
            occurredAt: "2026-03-31T20:00:00.000Z",
            actorMemberId: memberId,
            subjectMemberId: memberId,
            metadata: {
              purchaseId: "purchase-1",
              rewardId: "reward-1",
              cost: 2,
            },
          },
          {
            id: "audit-3",
            familyId,
            type: "goal_vote_recorded",
            occurredAt: "2026-03-31T19:00:00.000Z",
            actorMemberId: memberId,
            metadata: {
              goalId: "goal-1",
              dayKey: "2026-03-31",
            },
          },
        ],
      },
    });
  });

  it("loads the current daily allocation for the connected member", async () => {
    const member: Member = {
      id: memberId,
      familyId,
      displayName: "Alice",
      role: "parent",
      pin: "",
    };
    const sibling: Member = {
      id: "member-2",
      familyId,
      displayName: "Bob",
      role: "child",
      pin: "",
    };
    const getFamilyMembers = vi.fn(async (): Promise<ReadonlyArray<Member>> => [member, sibling]);
    const getDailyAllocationForMember = vi.fn(async () => ({
      id: "allocation-1",
      familyId,
      dayKey: "2026-03-31",
      giverMemberId: memberId,
      status: "draft" as const,
      lines: [{ receiverMemberId: "member-2", points: 3 }],
    }));

    const loadDailyPoints = createLoadDailyPointsUseCase({
      getFamilyMembers,
      getDailyAllocationForMember,
    });
    const result = await loadDailyPoints({
      familyId,
      memberId,
      dayKey: "2026-03-31",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        allocation: {
          id: "allocation-1",
          familyId,
          dayKey: "2026-03-31",
          giverMemberId: memberId,
          status: "draft",
          lines: [{ receiverMemberId: "member-2", points: 3 }],
        },
        members: [member, sibling],
        allocatedPoints: 3,
        remainingPoints: 2,
      },
    });
  });

  it("loads the real pending points for the connected member", async () => {
    const getPendingPointsForMember = vi.fn(async () => 4);

    const loadPendingPoints = createLoadPendingPointsUseCase({
      getPendingPointsForMember,
    });
    const result = await loadPendingPoints({
      familyId,
      memberId,
      dayKey: "2026-03-31",
    });

    expect(getPendingPointsForMember).toHaveBeenCalledWith({
      familyId,
      memberId,
      dayKey: "2026-03-31",
    });
    expect(result).toEqual({
      ok: true,
      data: {
        pendingPoints: 4,
      },
    });
  });

  it("saves a daily point draft with domain validation before persistence", async () => {
    const getDailyAllocationForMember = vi.fn(async () => null);
    const saveDailyAllocationDraft = vi.fn(async () => ({
      id: "allocation-1",
      familyId,
      dayKey: "2026-03-31",
      giverMemberId: memberId,
      status: "draft" as const,
      lines: [{ receiverMemberId: "member-2", points: 4 }],
    }));

    const saveDailyPoints = createSaveDailyPointsUseCase({
      getDailyAllocationForMember,
      saveDailyAllocationDraft,
    });
    const result = await saveDailyPoints({
      familyId,
      memberId,
      dayKey: "2026-03-31",
      lines: [{ receiverMemberId: "member-2", points: 4 }],
    });

    expect(saveDailyAllocationDraft).toHaveBeenCalledWith({
      familyId,
      giverMemberId: memberId,
      dayKey: "2026-03-31",
      lines: [{ receiverMemberId: "member-2", points: 4 }],
    });
    expect(result).toEqual({
      ok: true,
      data: {
        allocation: {
          id: "allocation-1",
          familyId,
          dayKey: "2026-03-31",
          giverMemberId: memberId,
          status: "draft",
          lines: [{ receiverMemberId: "member-2", points: 4 }],
        },
        allocatedPoints: 4,
        remainingPoints: 1,
      },
    });
  });

  it("finalizes daily points through the rpc and reloads local projections", async () => {
    const finalizeDailyAllocation = vi.fn(async () => ({
      success: true,
    }));
    const getDailyAllocationForMember = vi.fn(async () => ({
      id: "allocation-1",
      familyId,
      dayKey: "2026-03-31",
      giverMemberId: memberId,
      status: "finalized" as const,
      finalizedAt: "2026-03-31T21:00:00.000Z",
      lines: [{ receiverMemberId: "member-2", points: 5 }],
    }));
    const getPendingPointsForMember = vi.fn(async () => 1);
    const getPointTransactions = vi.fn(
      async (): Promise<ReadonlyArray<PointLedgerEntry>> => [
        {
          id: "ledger-1",
          familyId,
          memberId,
          type: "daily_points_received",
          pointsDelta: 3,
          occurredAt: "2026-03-31T18:00:00.000Z",
        },
      ]
    );

    const finalizeDailyPoints = createFinalizeDailyPointsUseCase({
      finalizeDailyAllocation,
      getDailyAllocationForMember,
      getPendingPointsForMember,
      getPointTransactions,
    });
    const result = await finalizeDailyPoints({
      allocationId: "allocation-1",
      familyId,
      memberId,
      dayKey: "2026-03-31",
    });

    expect(finalizeDailyAllocation).toHaveBeenCalledWith("allocation-1");
    expect(getDailyAllocationForMember).toHaveBeenCalledWith({
      familyId,
      giverMemberId: memberId,
      dayKey: "2026-03-31",
    });
    expect(getPendingPointsForMember).toHaveBeenCalledWith({
      familyId,
      memberId,
      dayKey: "2026-03-31",
    });
    expect(getPointTransactions).toHaveBeenCalledWith(memberId);
    expect(result).toEqual({
      ok: true,
      data: {
        allocation: {
          id: "allocation-1",
          familyId,
          dayKey: "2026-03-31",
          giverMemberId: memberId,
          status: "finalized",
          finalizedAt: "2026-03-31T21:00:00.000Z",
          lines: [{ receiverMemberId: "member-2", points: 5 }],
        },
        pendingPoints: 1,
        ledgerEntries: [
          {
            id: "ledger-1",
            familyId,
            memberId,
            type: "daily_points_received",
            pointsDelta: 3,
            occurredAt: "2026-03-31T18:00:00.000Z",
          },
        ],
      },
    });
  });

  it("prevalidates and buys a reward through the repository", async () => {
    const getRewards = vi.fn(
      async (): Promise<ReadonlyArray<ShopItem>> => [
        {
          id: "reward-1",
          familyId,
          name: "Cinema",
          imageUrl: "cinema",
          cost: 4,
          active: true,
        },
      ]
    );
    const purchaseReward = vi.fn(async () => ({
      purchaseId: "purchase-1",
      pointTransactionId: "pt-1",
      auditEventId: "audit-1",
      memberId,
      rewardId: "reward-1",
      cost: 4,
      purchasedAt: "2026-03-31T20:00:00.000Z",
      resultingBalance: 2,
    }));

    const buyReward = createBuyRewardUseCase({
      getRewards,
      purchaseReward,
    });
    const result = await buyReward({
      familyId,
      memberId,
      rewardId: "reward-1",
      purchasedAt: "2026-03-31T20:00:00.000Z",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        item: {
          id: "reward-1",
          familyId,
          name: "Cinema",
          imageUrl: "cinema",
          cost: 4,
          active: true,
        },
        purchaseId: "purchase-1",
        pointTransactionId: "pt-1",
        auditEventId: "audit-1",
        purchasedAt: "2026-03-31T20:00:00.000Z",
        resultingBalance: 2,
      },
    });
  });

  it("authenticates a member through a pin verifier that works with pin_hash", async () => {
    const getMemberAuthById = vi.fn(async () => ({
      id: memberId,
      familyId,
      displayName: "Alice",
      role: "parent" as const,
      pinHash: "hashed-pin",
      avatarUrl: undefined,
    }));
    const pinVerifier: PinVerifier = {
      verify: vi.fn(async ({ pin, pinHash }) => pin === "1234" && pinHash === "hashed-pin"),
    };

    const loginWithPin = createLoginWithPinUseCase({
      pinVerifier,
      getMemberAuthById,
    });
    const result = await loginWithPin({
      familyId,
      memberId,
      pin: "1234",
      now: "2026-03-31T20:00:00.000Z",
      historyEventId: "history-1",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        session: {
          familyId,
          memberId,
          startedAt: "2026-03-31T20:00:00.000Z",
        },
        historyEvent: {
          id: "history-1",
          familyId,
          type: "member_session_started",
          occurredAt: "2026-03-31T20:00:00.000Z",
          actorMemberId: memberId,
          metadata: {
            memberId,
          },
        },
      },
    });
  });

  it("returns a domain-shaped error when the pin is invalid", async () => {
    const getMemberAuthById = vi.fn(async () => ({
      id: memberId,
      familyId,
      displayName: "Alice",
      role: "parent" as const,
      pinHash: "hashed-pin",
    }));
    const pinVerifier: PinVerifier = {
      verify: vi.fn(async () => false),
    };

    const loginWithPin = createLoginWithPinUseCase({
      pinVerifier,
      getMemberAuthById,
    });
    const result = await loginWithPin({
      familyId,
      memberId,
      pin: "1234",
      now: "2026-03-31T20:00:00.000Z",
      historyEventId: "history-1",
    });

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.error).toBeInstanceOf(ApplicationError);
    expect(result.error.code).toBe("INVALID_PIN");
  });

  it("maps the goal vote receipt back to a domain goal", async () => {
    const getActiveGoals = vi.fn(
      async (): Promise<ReadonlyArray<FamilyGoal>> => [
        {
          id: "goal-1",
          familyId,
          title: "Soiree jeux",
          targetVoteCount: 3,
          status: "active",
          createdByMemberId: "parent-1",
        },
      ]
    );
    const castVote = vi.fn(async () => ({
      voteId: "vote-1",
      voteAuditEventId: "audit-vote-1",
      goalReachedAuditEventId: "audit-goal-1",
      familyGoalId: "goal-1",
      memberId,
      dayKey: "2026-03-31",
      goalStatus: "promised" as const,
      reachedTarget: true,
      totalVotes: 3,
    }));

    const castGoalVote = createCastGoalVoteUseCase({ getActiveGoals, castVote });
    const result = await castGoalVote({
      familyId,
      memberId,
      goalId: "goal-1",
      dayKey: "2026-03-31",
      createdAt: "2026-03-31T20:00:00.000Z",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        goal: {
          id: "goal-1",
          familyId,
          title: "Soiree jeux",
          targetVoteCount: 3,
          status: "promised",
          createdByMemberId: "parent-1",
          promisedAt: "2026-03-31T20:00:00.000Z",
        },
        voteId: "vote-1",
        voteAuditEventId: "audit-vote-1",
        goalReachedAuditEventId: "audit-goal-1",
        reachedTarget: true,
        totalVotes: 3,
      },
    });
  });
});
