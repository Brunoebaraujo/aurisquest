export type AurisPayment = { child_id: string; auris_redeemed: number | null };
export type AurisRedemption = { child_id: string; auris_cost: number | null; status: string; legacy_payment_id?: string | null };

export const isDebitedRedemption = (redemption: AurisRedemption) =>
  !redemption.legacy_payment_id && (redemption.status === "aprovado" || redemption.status === "concluido");

export function spentAurisByChild(payments: AurisPayment[], redemptions: AurisRedemption[]) {
  const spent = new Map<string, number>();
  for (const payment of payments) spent.set(payment.child_id, (spent.get(payment.child_id) ?? 0) + (payment.auris_redeemed ?? 0));
  for (const redemption of redemptions) if (isDebitedRedemption(redemption)) spent.set(redemption.child_id, (spent.get(redemption.child_id) ?? 0) + (redemption.auris_cost ?? 0));
  return spent;
}
