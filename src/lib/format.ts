export const formatBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

export const formatAuris = (n: number) => (n ?? 0).toLocaleString("pt-BR");
export const aurisLabel = (n: number) => `${formatAuris(n)} ${n === 1 ? "Auri" : "Auris"}`;

export const aurisToBRL = (auris: number, aurisPerReal: number) => {
  const rate = Math.max(1, aurisPerReal || 1);
  return Math.round((auris / rate) * 100); // cents
};
