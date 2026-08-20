import { cn } from "@/lib/utils";

export type Rarity = "comum" | "raro" | "epico" | "lendario";

export const RARITY_LABEL: Record<Rarity, string> = {
  comum: "Comum",
  raro: "Raro",
  epico: "Épico",
  lendario: "Lendário",
};

export const rarityClass = (r: Rarity) => `rarity-${r}`;

export function RarityBadge({ rarity, className }: { rarity: Rarity; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white",
        className,
      )}
      style={{ background: `hsl(var(--rarity-${rarity}))` }}
    >
      {RARITY_LABEL[rarity]}
    </span>
  );
}

export function RarityFrame({
  rarity,
  children,
  className,
  rounded = "rounded-2xl",
}: {
  rarity: Rarity;
  children: React.ReactNode;
  className?: string;
  rounded?: string;
}) {
  return (
    <div className={cn(rarityClass(rarity), "rarity-frame", rounded, "p-1 bg-card", className)}>
      <div className={cn(rounded, "w-full h-full overflow-hidden")}>{children}</div>
    </div>
  );
}
