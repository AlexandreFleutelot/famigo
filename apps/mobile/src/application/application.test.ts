import { describe, expect, it, vi } from "vitest";

import type { Family, FamilyGoal, Member, PointLedgerEntry, ShopItem } from "@famigo/domain";

import { ApplicationError } from "./errors";
import type {
  FamiliesGateway,
  GoalsGateway,
  MembersGateway,
  PinVerifier,
  ShopGateway,
} from "./ports";
import { createMemoryAppSessionGateway } from "./session";
import { createBuyRewardUseCase } from "./use-cases/buy-reward";
import { createCastGoalVoteUseCase } from "./use-cases/cast-goal-vote";
import { createClearSessionUseCase } from "./use-cases/clear-session";
import { createGetFamiliesUseCase } from "./use-cases/get-families";
import { createGetMembersForSelectedFamilyUseCase } from "./use-cases/get-members-for-selected-family";
import { createLoadShopUseCase } from "./use-cases/load-shop";
import { createLoginWithPinUseCase } from "./use-cases/login-with-pin";
import { createRestoreSessionUseCase } from "./use-cases/restore-session";
import { createSelectFamilyUseCase } from "./use-cases/select-family";
import { createStartMemberSessionUseCase } from "./use-cases/start-member-session";

const familyId = "family-1";
const memberId = "member-1";

describe("application use cases", () => {
  it("lists available families", async () => {
    const familiesGateway: FamiliesGateway = {
      listFamilies: vi.fn(
        async (): Promise<ReadonlyArray<Family>> => [{ id: familyId, name: "Famille Martin" }]
      ),
      getFamilyById: vi.fn(),
    };

    const getFamilies = createGetFamiliesUseCase({ familiesGateway });
    const result = await getFamilies();

    expect(result).toEqual({
      ok: true,
      data: {
        families: [{ id: familyId, name: "Famille Martin" }],
      },
    });
  });

  it("selects a family, loads its members, and starts a simple member session", async () => {
    const familiesGateway: FamiliesGateway = {
      listFamilies: vi.fn(),
      getFamilyById: vi.fn(async () => ({ id: familyId, name: "Famille Martin" })),
    };
    const membersGateway: MembersGateway = {
      listFamilyMembers: vi.fn(
        async (): Promise<ReadonlyArray<Member>> => [
          {
            id: memberId,
            familyId,
            displayName: "Alice",
            role: "parent",
            pin: "",
          },
        ]
      ),
      getMemberAuthSnapshot: vi.fn(),
    };
    const appSessionGateway = createMemoryAppSessionGateway();

    const selectFamily = createSelectFamilyUseCase({
      familiesGateway,
      appSessionGateway,
    });
    const getMembersForSelectedFamily = createGetMembersForSelectedFamilyUseCase({
      membersGateway,
      appSessionGateway,
    });
    const startMemberSession = createStartMemberSessionUseCase({
      membersGateway,
      appSessionGateway,
    });

    const selectedFamily = await selectFamily({ familyId });
    const members = await getMembersForSelectedFamily();
    const startedSession = await startMemberSession({ memberId });

    expect(selectedFamily).toEqual({
      ok: true,
      data: {
        family: { id: familyId, name: "Famille Martin" },
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
        members: [
          {
            id: memberId,
            familyId,
            displayName: "Alice",
            role: "parent",
            pin: "",
          },
        ],
        session: {
          selectedFamilyId: familyId,
          selectedMemberId: null,
        },
      },
    });
    expect(startedSession).toEqual({
      ok: true,
      data: {
        member: {
          id: memberId,
          familyId,
          displayName: "Alice",
          role: "parent",
          pin: "",
        },
        session: {
          selectedFamilyId: familyId,
          selectedMemberId: memberId,
        },
      },
    });
  });

  it("restores a stored family selection and drops a stale member selection", async () => {
    const familiesGateway: FamiliesGateway = {
      listFamilies: vi.fn(),
      getFamilyById: vi.fn(async () => ({ id: familyId, name: "Famille Martin" })),
    };
    const membersGateway: MembersGateway = {
      listFamilyMembers: vi.fn(async (): Promise<ReadonlyArray<Member>> => []),
      getMemberAuthSnapshot: vi.fn(),
    };
    const appSessionGateway = createMemoryAppSessionGateway({
      selectedFamilyId: familyId,
      selectedMemberId: "missing-member",
    });

    const restoreSession = createRestoreSessionUseCase({
      familiesGateway,
      membersGateway,
      appSessionGateway,
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
    const shopGateway: ShopGateway = {
      listRewards: vi.fn(
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
      ),
      listPointLedgerEntries: vi.fn(
        async (): Promise<ReadonlyArray<PointLedgerEntry>> => [
          {
            id: "ledger-1",
            familyId,
            memberId,
            type: "daily_points_received" as const,
            pointsDelta: 7,
            occurredAt: "2026-03-31T18:00:00.000Z",
          },
          {
            id: "ledger-2",
            familyId,
            memberId,
            type: "shop_purchase" as const,
            pointsDelta: -2,
            occurredAt: "2026-03-31T19:00:00.000Z",
          },
        ]
      ),
      purchaseReward: vi.fn(),
    };

    const loadShop = createLoadShopUseCase({ shopGateway });
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

  it("prevalidates and buys a reward through the gateway", async () => {
    const shopGateway: ShopGateway = {
      listRewards: vi.fn(async () => [
        {
          id: "reward-1",
          familyId,
          name: "Cinema",
          imageUrl: "cinema",
          cost: 4,
          active: true,
        },
      ]),
      listPointLedgerEntries: vi.fn(async () => [
        {
          id: "ledger-1",
          familyId,
          memberId,
          type: "daily_points_received" as const,
          pointsDelta: 6,
          occurredAt: "2026-03-31T18:00:00.000Z",
        },
      ]),
      purchaseReward: vi.fn(async () => ({
        purchaseId: "purchase-1",
        pointTransactionId: "pt-1",
        auditEventId: "audit-1",
        memberId,
        rewardId: "reward-1",
        cost: 4,
        purchasedAt: "2026-03-31T20:00:00.000Z",
        resultingBalance: 2,
      })),
    };

    const buyReward = createBuyRewardUseCase({ shopGateway });
    const result = await buyReward({
      familyId,
      memberId,
      rewardId: "reward-1",
      purchasedAt: "2026-03-31T20:00:00.000Z",
      purchaseId: "local-purchase-id",
      ledgerEntryId: "local-ledger-id",
      historyEventId: "local-history-id",
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
    const membersGateway: MembersGateway = {
      listFamilyMembers: vi.fn(async (): Promise<ReadonlyArray<Member>> => []),
      getMemberAuthSnapshot: vi.fn(async () => ({
        id: memberId,
        familyId,
        displayName: "Alice",
        role: "parent" as const,
        pinHash: "hashed-pin",
        avatarUrl: undefined,
      })),
    };
    const pinVerifier: PinVerifier = {
      verify: vi.fn(async ({ pin, pinHash }) => pin === "1234" && pinHash === "hashed-pin"),
    };

    const loginWithPin = createLoginWithPinUseCase({
      membersGateway,
      pinVerifier,
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
    const membersGateway: MembersGateway = {
      listFamilyMembers: vi.fn(async (): Promise<ReadonlyArray<Member>> => []),
      getMemberAuthSnapshot: vi.fn(async () => ({
        id: memberId,
        familyId,
        displayName: "Alice",
        role: "parent" as const,
        pinHash: "hashed-pin",
      })),
    };
    const pinVerifier: PinVerifier = {
      verify: vi.fn(async () => false),
    };

    const loginWithPin = createLoginWithPinUseCase({
      membersGateway,
      pinVerifier,
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
    const goalsGateway: GoalsGateway = {
      listGoals: vi.fn(
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
      ),
      castGoalVote: vi.fn(async () => ({
        voteId: "vote-1",
        voteAuditEventId: "audit-vote-1",
        goalReachedAuditEventId: "audit-goal-1",
        familyGoalId: "goal-1",
        memberId,
        dayKey: "2026-03-31",
        goalStatus: "promised" as const,
        reachedTarget: true,
        totalVotes: 3,
      })),
    };

    const castGoalVote = createCastGoalVoteUseCase({ goalsGateway });
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
