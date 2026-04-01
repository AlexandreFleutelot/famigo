import {
  getRewards as getRewardsRepository,
  purchaseReward as purchaseRewardRepository,
} from "../../data/repositories/shop.repository";
import { createApplicationError } from "../errors";
import { executeUseCase, type UseCaseResult } from "../result";

export interface BuyRewardInput {
  familyId: string;
  memberId: string;
  rewardId: string;
  purchasedAt: string;
}

export interface BuyRewardData {
  item: import("@famigo/domain").ShopItem;
  purchaseId: string;
  pointTransactionId: string;
  auditEventId: string;
  purchasedAt: string;
  resultingBalance: number;
}

export interface BuyRewardDependencies {
  getRewards?: typeof getRewardsRepository;
  purchaseReward?: typeof purchaseRewardRepository;
}

export function createBuyRewardUseCase(dependencies: BuyRewardDependencies = {}) {
  const {
    getRewards = getRewardsRepository,
    purchaseReward = purchaseRewardRepository,
  } = dependencies;

  return (input: BuyRewardInput): Promise<UseCaseResult<BuyRewardData>> =>
    executeUseCase(async () => {
      const items = await getRewards(input.familyId);

      const item = items.find((candidate) => candidate.id === input.rewardId);

      if (item === undefined) {
        throw createApplicationError({
          code: "SHOP_ITEM_NOT_FOUND",
          kind: "domain",
          message: "Le cadeau selectionne est introuvable.",
        });
      }

      const receipt = await purchaseReward({
        familyId: input.familyId,
        memberId: input.memberId,
        rewardId: input.rewardId,
        purchasedAt: input.purchasedAt,
      });

      return {
        item,
        purchaseId: receipt.purchaseId,
        pointTransactionId: receipt.pointTransactionId,
        auditEventId: receipt.auditEventId,
        purchasedAt: receipt.purchasedAt,
        resultingBalance: receipt.resultingBalance,
      };
    });
}
