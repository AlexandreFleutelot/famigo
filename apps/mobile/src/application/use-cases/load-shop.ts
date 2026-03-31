import { getPointBalance } from "@famigo/domain";

import type { ShopGateway } from "../ports";
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
  shopGateway: ShopGateway;
}

export function createLoadShopUseCase(dependencies: LoadShopDependencies) {
  return (input: LoadShopInput): Promise<UseCaseResult<LoadShopData>> =>
    executeUseCase(async () => {
      const [items, ledgerEntries] = await Promise.all([
        dependencies.shopGateway.listRewards(input.familyId),
        dependencies.shopGateway.listPointLedgerEntries(input.memberId),
      ]);

      return {
        items,
        ledgerEntries,
        balance: getPointBalance(ledgerEntries, input.memberId),
      };
    });
}
