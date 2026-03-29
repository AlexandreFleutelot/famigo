import { describe, expect, it } from "vitest";

import { DomainError, purchaseShopItem } from "../src";
import type { PointLedgerEntry, ShopItem } from "../src";

const shopItem: ShopItem = {
  id: "shop-1",
  familyId: "family-1",
  name: "Cinema",
  imageUrl: "https://example.test/cinema.png",
  cost: 4,
  active: true,
};

describe("purchaseShopItem", () => {
  it("debite immediatement le solde reel", () => {
    const existingLedgerEntries: PointLedgerEntry[] = [
      {
        id: "ledger-before",
        familyId: "family-1",
        memberId: "member-1",
        type: "daily_points_received",
        pointsDelta: 6,
        occurredAt: "2026-03-28T21:00:00.000Z",
      },
    ];

    const result = purchaseShopItem({
      id: "purchase-1",
      buyerMemberId: "member-1",
      familyId: "family-1",
      item: shopItem,
      existingLedgerEntries,
      purchasedAt: "2026-03-29T10:00:00.000Z",
      ledgerEntryId: "ledger-1",
      historyEventId: "history-1",
    });

    expect(result.ledgerEntry.pointsDelta).toBe(-4);
    expect(result.resultingBalance).toBe(2);
    expect(result.historyEvent.type).toBe("shop_purchase_made");
  });

  it("refuse un achat si le solde reel est insuffisant", () => {
    const existingLedgerEntries: PointLedgerEntry[] = [
      {
        id: "ledger-before",
        familyId: "family-1",
        memberId: "member-1",
        type: "daily_points_received",
        pointsDelta: 3,
        occurredAt: "2026-03-28T21:00:00.000Z",
      },
    ];

    expect(() =>
      purchaseShopItem({
        id: "purchase-1",
        buyerMemberId: "member-1",
        familyId: "family-1",
        item: shopItem,
        existingLedgerEntries,
        purchasedAt: "2026-03-29T10:00:00.000Z",
        ledgerEntryId: "ledger-1",
        historyEventId: "history-1",
      })
    ).toThrowError(DomainError);
  });
});
