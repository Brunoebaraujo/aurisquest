import type { Equipment } from "@/components/cosmetics/EquippedAvatar";
import { avatarKeyFromEquipment } from "./avatar-layout-registry";

const headshots: Record<string, string> = {
  gael: "https://rydwbkvkokwqpcpfwvcy.supabase.co/storage/v1/object/public/avatars-catalog/humano_v2_menino_pardo.png",
  maya: "/avatar-assets/maya_headshot_v1.png",
};

export function getAvatarHeadshotUrl(equipment: Equipment): string | undefined {
  const avatarKey = avatarKeyFromEquipment(equipment);
  return avatarKey ? headshots[avatarKey] : undefined;
}
