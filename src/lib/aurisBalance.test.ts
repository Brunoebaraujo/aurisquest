import { describe, expect, it } from "vitest";
import { spentAurisByChild } from "./aurisBalance";

describe("Auris balance", () => {
  it("combines legacy payments and approved marketplace redemptions", () => {
    const spent = spentAurisByChild([{ child_id: "maya", auris_redeemed: 35 }], [
      { child_id: "maya", auris_cost: 10, status: "aprovado", legacy_payment_id: null },
      { child_id: "maya", auris_cost: 1, status: "concluido", legacy_payment_id: null },
      { child_id: "maya", auris_cost: 10, status: "aprovado", legacy_payment_id: null },
    ]);
    expect(spent.get("maya")).toBe(56);
  });

  it("ignores pending, refused and legacy-linked redemptions", () => {
    const spent = spentAurisByChild([{ child_id: "gael", auris_redeemed: 20 }], [
      { child_id: "gael", auris_cost: 20, status: "aprovado", legacy_payment_id: "payment-1" },
      { child_id: "gael", auris_cost: 5, status: "pendente", legacy_payment_id: null },
      { child_id: "gael", auris_cost: 7, status: "recusado", legacy_payment_id: null },
    ]);
    expect(spent.get("gael")).toBe(20);
  });
});
