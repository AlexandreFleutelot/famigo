import { getPointBalance } from "@famigo/domain";

import { getRewards as getRewardsRepository } from "../../data/repositories/shop.repository";
import { getPointTransactions as getPointTransactionsRepository } from "../../data/repositories/points.repository";
import { executeUseCase, type UseCaseResult } from "../result";

export interface LoadShopInput {
  familyId: string;
  memberId: string;
}

export interface LoadShopData {
  items: ReadonlyArray<import("@famigo/domain").ShopItem>;
  ledgerEntries: ReadonlyArray<import("@famigo/domain").PointLedgerEntry>;
  balance: number;
}

export interface LoadShopDependencies {
  getRewards?: typeof getRewardsRepository;
  getPointTransactions?: typeof getPointTransactionsRepository;
}

export function createLoadShopUseCase(dependencies: LoadShopDependencies = {}) {
  const {
    getRewards = getRewardsRepository,
    getPointTransactions = getPointTransactionsRepository,
  } = dependencies;

  return (input: LoadShopInput): Promise<UseCaseResult<LoadShopData>> =>
    executeUseCase(async () => {
      const [items, ledgerEntries] = await Promise.all([
        getRewards(input.familyId),
        getPointTransactions(input.memberId),
      ]);

      return {
        items,
        ledgerEntries,
        balance: getPointBalance(ledgerEntries, input.memberId),
      };
    });
}
