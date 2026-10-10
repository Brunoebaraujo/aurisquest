import type { Equipment } from "@/components/cosmetics/EquippedAvatar";
import type { AvatarComposition } from "../composer/composer.types";
import rawGaelGuardianLayout from "../layouts/gael-guardian-v1.json";
import rawMayaGuardianLayout from "../layouts/maya-guardian-v1.json";
import rawLorenzoBaseLayout from "../layouts/lorenzo-base-v1.json";

const layouts: Record<string, AvatarComposition> = {
  gael: rawGaelGuardianLayout as AvatarComposition,
  maya: rawMayaGuardianLayout as AvatarComposition,
  lorenzo: rawLorenzoBaseLayout as AvatarComposition,
};

export function registerAvatarLayout(layout: AvatarComposition) { layouts[layout.avatarId] = layout; }

export function avatarKeyFromEquipment(equipment: Equipment): string | undefined {
  if (equipment.avatar?.equipmentId) return equipment.avatar.equipmentId;
  const identity = `${equipment.avatar?.name ?? ""} ${equipment.avatar?.image_url ?? ""}`.toLowerCase();
  if (identity.includes("gael")) return "gael";
  if (identity.includes("maya")) return "maya";
  if (identity.includes("lorenzo")) return "lorenzo";
  return undefined;
}

export function getAvatarLayout(equipment: Equipment): AvatarComposition | null {
  const avatarKey = avatarKeyFromEquipment(equipment);
  return avatarKey ? layouts[avatarKey] ?? null : null;
}

export const gaelGuardianLayout = layouts.gael;
