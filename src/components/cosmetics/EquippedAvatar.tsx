import { cn } from "@/lib/utils";
import { RarityFrame, type Rarity } from "./Rarity";
import { AvatarRenderer, canRenderModularAvatar } from "@/avatar-system/renderer/AvatarRenderer";

export type EquippedItem = { image_url: string; rarity: Rarity; name?: string; catalogId?: string; equipmentId?: string } | null;

export type Equipment = {
  avatar?: EquippedItem;
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
  variant = "circle",
}: {
  equipment: Equipment;
  size?: number;
  className?: string;
  fallbackName?: string;
  variant?: "circle" | "portrait";
}) {
  const s = size;
  const itemSize = Math.round(s * 0.4);
  const frameRarity = equipment.frame?.rarity ?? equipment.avatar?.rarity ?? "comum";
  const modular = canRenderModularAvatar(equipment);
  const portrait = modular && variant === "portrait";
  const height = portrait ? Math.round(s * 1.5) : s;
  const rounded = portrait ? "rounded-[2rem]" : "rounded-full";

  return (
    <div
      className={cn("relative", className)}
      data-avatar-variant={portrait ? "portrait" : "circle"}
      style={{ width: s, height }}
    >
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
      <RarityFrame rarity={frameRarity} rounded={rounded} className="relative w-full h-full">
        <div className={cn("w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center", rounded, modular ? "overflow-visible" : "overflow-hidden")}>
          {modular ? (
            <AvatarRenderer
              equipment={equipment}
              label={equipment.avatar?.name ?? "Avatar de Gael"}
              surface={portrait ? "portrait" : "badge"}
            />
          ) : equipment.avatar ? (
            <img src={equipment.avatar.image_url} alt={equipment.avatar.name ?? "Avatar"} className="w-full h-full object-cover" />
          ) : (
            <span className="font-display font-bold text-primary" style={{ fontSize: s * 0.35 }}>
              {fallbackName?.[0]?.toUpperCase() ?? "?"}
            </span>
          )}
        </div>
      </RarityFrame>

      {/* Slot overlays */}
      {!modular && equipment.helmet && (
        <img
          src={equipment.helmet.image_url}
          alt=""
          className="absolute object-contain drop-shadow-md"
          style={{ width: itemSize, height: itemSize, top: -itemSize * 0.35, left: "50%", transform: "translateX(-50%)" }}
        />
      )}
      {!modular && equipment.armor && (
        <img
          src={equipment.armor.image_url}
          alt=""
          className="absolute object-contain drop-shadow-md"
          style={{ width: itemSize, height: itemSize, bottom: -itemSize * 0.1, left: -itemSize * 0.15 }}
        />
      )}
      {!modular && equipment.weapon && (
        <img
          src={equipment.weapon.image_url}
          alt=""
          className="absolute object-contain drop-shadow-md"
          style={{ width: itemSize, height: itemSize, top: s * 0.25, right: -itemSize * 0.25 }}
        />
      )}
      {!modular && equipment.pet && (
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
