import { cn } from "@/lib/utils";
import { RarityFrame, type Rarity } from "./Rarity";

export type EquippedItem = { image_url: string; rarity: Rarity; name?: string } | null;

export type Equipment = {
  avatar?: { image_url: string; rarity: Rarity; name?: string } | null;
  helmet?: EquippedItem;
  armor?: EquippedItem;
  weapon?: EquippedItem;
  pet?: EquippedItem;
  aura?: EquippedItem;
  frame?: EquippedItem;
};

export function EquippedAvatar({
  equipment,
  size = 160,
  className,
  fallbackName,
}: {
  equipment: Equipment;
  size?: number;
  className?: string;
  fallbackName?: string;
}) {
  const s = size;
  const itemSize = Math.round(s * 0.4);
  const frameRarity = equipment.frame?.rarity ?? equipment.avatar?.rarity ?? "comum";

  return (
    <div className={cn("relative", className)} style={{ width: s, height: s }}>
      {/* Aura */}
      {equipment.aura && (
        <img
          src={equipment.aura.image_url}
          alt=""
          className="absolute inset-0 w-full h-full object-contain animate-bounce-soft pointer-events-none"
          style={{ transform: "scale(1.15)" }}
        />
      )}
      {/* Avatar with frame */}
      <RarityFrame rarity={frameRarity} rounded="rounded-full" className="relative w-full h-full">
        <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center overflow-hidden">
          {equipment.avatar ? (
            <img src={equipment.avatar.image_url} alt={equipment.avatar.name ?? "Avatar"} className="w-full h-full object-cover" />
          ) : (
            <span className="font-display font-bold text-primary" style={{ fontSize: s * 0.35 }}>
              {fallbackName?.[0]?.toUpperCase() ?? "?"}
            </span>
          )}
        </div>
      </RarityFrame>

      {/* Slot overlays */}
      {equipment.helmet && (
        <img
          src={equipment.helmet.image_url}
          alt=""
          className="absolute object-contain drop-shadow-md"
          style={{ width: itemSize, height: itemSize, top: -itemSize * 0.35, left: "50%", transform: "translateX(-50%)" }}
        />
      )}
      {equipment.armor && (
        <img
          src={equipment.armor.image_url}
          alt=""
          className="absolute object-contain drop-shadow-md"
          style={{ width: itemSize, height: itemSize, bottom: -itemSize * 0.1, left: -itemSize * 0.15 }}
        />
      )}
      {equipment.weapon && (
        <img
          src={equipment.weapon.image_url}
          alt=""
          className="absolute object-contain drop-shadow-md"
          style={{ width: itemSize, height: itemSize, top: s * 0.25, right: -itemSize * 0.25 }}
        />
      )}
      {equipment.pet && (
        <img
          src={equipment.pet.image_url}
          alt=""
          className="absolute object-contain drop-shadow-md animate-bounce-soft"
          style={{ width: itemSize * 0.9, height: itemSize * 0.9, bottom: -itemSize * 0.2, right: -itemSize * 0.1 }}
        />
      )}
    </div>
  );
}
