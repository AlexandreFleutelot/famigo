import { assertDomain } from "./errors";
import { getPointBalance } from "./ledger";
import type { HistoryEvent, PointLedgerEntry, Purchase, ShopItem } from "./types";

export interface PurchaseShopItemInput {
  id: string;
  buyerMemberId: string;
  familyId: string;
  item: ShopItem;
  existingLedgerEntries: ReadonlyArray<PointLedgerEntry>;
  purchasedAt: string;
  ledgerEntryId: string;
  historyEventId: string;
}

export interface PurchaseShopItemResult {
  purchase: Purchase;
  ledgerEntry: PointLedgerEntry;
  historyEvent: HistoryEvent;
  resultingBalance: number;
}

export function purchaseShopItem(input: PurchaseShopItemInput): PurchaseShopItemResult {
  assertDomain(
    input.item.familyId === input.familyId,
    "SHOP_ITEM_FAMILY_MISMATCH",
    "Le cadeau n'appartient pas a la famille."
  );
  assertDomain(
    input.item.active,
    "SHOP_ITEM_INACTIVE",
    "Le cadeau selectionne n'est pas disponible."
  );
  assertDomain(
    Number.isInteger(input.item.cost) && input.item.cost > 0,
    "INVALID_SHOP_ITEM_COST",
    "Le cout du cadeau doit etre un entier positif."
  );

  const balanceBeforePurchase = getPointBalance(input.existingLedgerEntries, input.buyerMemberId);
  assertDomain(
    balanceBeforePurchase >= input.item.cost,
    "INSUFFICIENT_BALANCE",
    "Le solde est insuffisant pour realiser cet achat."
  );

  const purchase: Purchase = {
    id: input.id,
    familyId: input.familyId,
    memberId: input.buyerMemberId,
    shopItemId: input.item.id,
    costSnapshot: input.item.cost,
    purchasedAt: input.purchasedAt,
  };

  const ledgerEntry: PointLedgerEntry = {
    id: input.ledgerEntryId,
    familyId: input.familyId,
    memberId: input.buyerMemberId,
    type: "shop_purchase",
    pointsDelta: -input.item.cost,
    occurredAt: input.purchasedAt,
    referenceId: purchase.id,
  };

  return {
    purchase,
    ledgerEntry,
    historyEvent: {
      id: input.historyEventId,
      familyId: input.familyId,
      type: "shop_purchase_made",
      occurredAt: input.purchasedAt,
      actorMemberId: input.buyerMemberId,
      metadata: {
        purchaseId: purchase.id,
        shopItemId: input.item.id,
        cost: input.item.cost,
      },
    },
    resultingBalance: balanceBeforePurchase - input.item.cost,
  };
}
