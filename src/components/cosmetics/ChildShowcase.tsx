import { RarityFrame, RarityBadge, type Rarity } from "./Rarity";
import type { Equipment } from "./EquippedAvatar";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

function titleFor(level: number) {
  if (level >= 50) return "Lenda";
  if (level >= 25) return "Herói";
  if (level >= 10) return "Explorador";
  return "Aventureiro Iniciante";
}

function SlotCard({
  label, item, className,
}: { label: string; item?: { image_url: string; rarity: Rarity; name?: string } | null; className?: string }) {
  if (!item) {
    return (
      <div className={cn("flex flex-col items-center gap-1 opacity-50", className)}>
        <div className="text-[10px] font-bold tracking-widest text-accent">{label}</div>
        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground">
          —
        </div>
      </div>
    );
  }
  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="text-[10px] font-bold tracking-widest text-accent uppercase">{label}</div>
      <RarityFrame rarity={item.rarity} rounded="rounded-xl">
        <div className="w-20 h-20 bg-gradient-to-br from-muted to-background flex items-center justify-center overflow-hidden">
          <img src={item.image_url} alt={item.name ?? label} className="w-full h-full object-contain p-1" />
        </div>
      </RarityFrame>
      <RarityBadge rarity={item.rarity} />
    </div>
  );
}

export function ChildShowcase({
  name,
  level,
  equipment,
}: {
  name: string;
  level: number;
  equipment: Equipment;
}) {
  const frameRarity = equipment.frame?.rarity ?? equipment.avatar?.rarity ?? "comum";
  return (
    <div className="relative rounded-3xl bg-gradient-to-b from-primary/10 via-background to-secondary/5 border shadow-card p-6 md:p-10">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-10 items-center">
        {/* Left column: armor */}
        <div className="flex md:justify-end justify-center">
          <SlotCard label="Armadura" item={equipment.armor} />
        </div>

        {/* Center: helmet on top, avatar, name, weapon&pet stacked on right */}
        <div className="flex flex-col items-center gap-3">
          <SlotCard label="Elmo" item={equipment.helmet} />

          <div className="relative">
            {/* Aura behind */}
            {equipment.aura && (
              <img
                src={equipment.aura.image_url}
                alt=""
                className="absolute inset-0 w-full h-full object-contain animate-pulse pointer-events-none"
                style={{ transform: "scale(1.3)" }}
              />
            )}
            <RarityFrame rarity={frameRarity} rounded="rounded-[3rem]" className="relative">
              <div className="w-[220px] h-[260px] md:w-[260px] md:h-[300px] rounded-[2.5rem] bg-gradient-to-br from-primary/15 to-secondary/10 flex items-center justify-center overflow-hidden">
                {equipment.avatar ? (
                  <img src={equipment.avatar.image_url} alt={equipment.avatar.name ?? name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-display font-bold text-primary text-7xl">{name[0]?.toUpperCase()}</span>
                )}
              </div>
            </RarityFrame>
            {/* Level badge */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-reward shadow-reward flex flex-col items-center justify-center text-accent-foreground border-2 border-background">
                <Sparkles className="w-3 h-3" />
                <div className="font-display font-bold text-lg leading-none">{level}</div>
              </div>
            </div>
          </div>

          <div className="mt-5 text-center bg-card rounded-2xl border shadow-soft px-6 py-3 min-w-[220px]">
            <div className="font-display font-bold text-2xl uppercase tracking-wide">{name}</div>
            <div className="text-sm text-muted-foreground">{titleFor(level)}</div>
          </div>
        </div>

        {/* Right column: weapon + pet */}
        <div className="flex md:flex-col flex-row md:items-start justify-center md:justify-start gap-6">
          <SlotCard label="Arma" item={equipment.weapon} />
          <SlotCard label="Pet" item={equipment.pet} />
        </div>
      </div>
    </div>
  );
}
