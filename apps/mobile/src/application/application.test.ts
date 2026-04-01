import { describe, expect, it, vi } from "vitest";

import type { Family, FamilyGoal, Member, PointLedgerEntry, ShopItem } from "@famigo/domain";

import { ApplicationError } from "./errors";
import { createMemoryAppSessionGateway } from "./session";
import { createBuyRewardUseCase } from "./use-cases/buy-reward";
import { createCastGoalVoteUseCase } from "./use-cases/cast-goal-vote";
import { createClearSessionUseCase } from "./use-cases/clear-session";
import { createGetFamiliesUseCase } from "./use-cases/get-families";
import { createGetMembersForSelectedFamilyUseCase } from "./use-cases/get-members-for-selected-family";
import { createLoadShopUseCase } from "./use-cases/load-shop";
import { createLoginWithPinUseCase, type PinVerifier } from "./use-cases/login-with-pin";
import { createRestoreSessionUseCase } from "./use-cases/restore-session";
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
