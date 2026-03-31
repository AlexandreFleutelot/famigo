import { DomainError, purchaseShopItem } from "@famigo/domain";

import { createApplicationError } from "../errors";
import type { ShopGateway } from "../ports";
import { executeUseCase, type UseCaseResult } from "../result";

export interface BuyRewardInput {
  familyId: string;
  memberId: string;
  rewardId: string;
  purchasedAt: string;
  purchaseId: string;
  ledgerEntryId: string;
  historyEventId: string;
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
  shopGateway: ShopGateway;
}

export function createBuyRewardUseCase(dependencies: BuyRewardDependencies) {
  return (input: BuyRewardInput): Promise<UseCaseResult<BuyRewardData>> =>
    executeUseCase(async () => {
      const [items, ledgerEntries] = await Promise.all([
        dependencies.shopGateway.listRewards(input.familyId),
        dependencies.shopGateway.listPointLedgerEntries(input.memberId),
      ]);

      const item = items.find((candidate) => candidate.id === input.rewardId);

      if (item === undefined) {
        throw createApplicationError({
          code: "SHOP_ITEM_NOT_FOUND",
          kind: "domain",
          message: "Le cadeau selectionne est introuvable.",
        });
      }

      try {
        purchaseShopItem({
          id: input.purchaseId,
          buyerMemberId: input.memberId,
          familyId: input.familyId,
          item,
          existingLedgerEntries: ledgerEntries,
          purchasedAt: input.purchasedAt,
          ledgerEntryId: input.ledgerEntryId,
          historyEventId: input.historyEventId,
        });
      } catch (error) {
        if (error instanceof DomainError) {
          throw error;
        }

        throw createApplicationError({
          code: "SHOP_PURCHASE_PREFLIGHT_FAILED",
          kind: "configuration",
          message: "La validation locale de l'achat a echoue.",
          cause: error,
        });
      }

      const receipt = await dependencies.shopGateway.purchaseReward({
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
