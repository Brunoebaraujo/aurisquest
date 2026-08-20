import type { Equipment } from "@/components/cosmetics/EquippedAvatar";
import type { AvatarComposition } from "../composer/composer.types";
import rawGaelGuardianLayout from "../layouts/gael-guardian-v1.json";

const layouts: Record<string, AvatarComposition> = {
  gael: rawGaelGuardianLayout as AvatarComposition,
};

export function avatarKeyFromEquipment(equipment: Equipment): string | undefined {
  if (equipment.avatar?.equipmentId) return equipment.avatar.equipmentId;
  const identity = `${equipment.avatar?.name ?? ""} ${equipment.avatar?.image_url ?? ""}`.toLowerCase();
  return identity.includes("gael") ? "gael" : undefined;
}

export function getAvatarLayout(equipment: Equipment): AvatarComposition | null {
  const avatarKey = avatarKeyFromEquipment(equipment);
  return avatarKey ? layouts[avatarKey] ?? null : null;
}

export const gaelGuardianLayout = layouts.gael;
