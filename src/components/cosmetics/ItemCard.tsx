import { cn } from "@/lib/utils";
import { Lock, Check } from "lucide-react";
import { RarityBadge, RarityFrame, type Rarity } from "./Rarity";

export type CatalogItem = {
  id: string;
  name: string;
  description?: string | null;
  category?: string;
  rarity: Rarity;
  image_url: string;
  unlock_rule_type: string;
  unlock_threshold: number;
};

function unlockHint(t: string, n: number) {
  if (t === "starter") return "Inicial";
  if (t === "auris_total") return `${n} Auris totais`;
  if (t === "medalhas") return `${n} medalhas`;
  if (t === "streak") return `${n} dias seguidos`;
  if (t === "aprovacoes") return `${n} aprovações`;
  if (t === "atividade") return `${n}× uma atividade`;
  if (t === "categoria") return `${n}× por categoria`;
  if (t === "missao_grupo") return "Missão de grupo";
  return "Manual";
}

export function ItemCard({
  item,
  unlocked,
  equipped,
  onClick,
  size = 96,
}: {
  item: CatalogItem;
  unlocked: boolean;
  equipped?: boolean;
  onClick?: () => void;
  size?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex flex-col items-center gap-1 p-2 rounded-2xl transition-bounce hover:scale-105 disabled:cursor-not-allowed",
        equipped && "bg-primary/10",
      )}
    >
      <RarityFrame rarity={item.rarity} rounded="rounded-2xl">
        <div
          className="relative bg-gradient-to-br from-muted to-background flex items-center justify-center overflow-hidden"
          style={{ width: size, height: size }}
        >
          <img
            src={item.image_url}
            alt={item.name}
            className={cn("w-full h-full object-contain p-1", !unlocked && "grayscale opacity-30")}
          />
          {!unlocked && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/40">
              <Lock className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          {equipped && (
            <div className="absolute top-1 right-1 bg-success text-success-foreground rounded-full p-0.5">
              <Check className="w-3 h-3" />
            </div>
          )}
        </div>
      </RarityFrame>
      <div className="text-xs font-semibold text-center leading-tight max-w-[110px] truncate w-full">{item.name}</div>
      <RarityBadge rarity={item.rarity} />
      {!unlocked && (
        <div className="text-[10px] text-muted-foreground text-center">{unlockHint(item.unlock_rule_type, item.unlock_threshold)}</div>
      )}
    </button>
  );
}
