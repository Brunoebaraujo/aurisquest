import type { Equipment, EquippedItem } from "@/components/cosmetics/EquippedAvatar";
import type { AvatarLayer } from "../composer/composer.types";

const normalize = (value = "") => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
const identityText = (item?: EquippedItem) => normalize([item?.name, item?.image_url].filter(Boolean).join(" "));

export function inferEquipmentId(kind: "avatar" | "helmet" | "armor" | "weapon" | "pet", name?: string, imageUrl?: string): string | undefined {
  const value = normalize(`${name ?? ""} ${imageUrl ?? ""}`);
  if (kind === "avatar" && value.includes("gael")) return "gael";
  if (!value.includes("guardian") && !value.includes("guardiao")) return undefined;
  if (kind === "helmet" && (value.includes("helmet") || value.includes("elmo"))) return "helmet_guardian_blue";
  if (kind === "armor" && (value.includes("armor") || value.includes("armadura"))) return "armor_guardian_blue";
  if (kind === "weapon" && (value.includes("sword") || value.includes("espada"))) return "sword_guardian_blue";
  if (kind === "pet" && (value.includes("fox") || value.includes("raposa"))) return "pet_guardian_fox";
  return undefined;
}

export const isGaelEquipment = (equipment: Equipment) => equipment.avatar?.equipmentId === "gael" || identityText(equipment.avatar).includes("gael");

export function isLayerEquipped(layer: AvatarLayer, equipment: Equipment): boolean {
  if (!layer.visible) return false;
  if (layer.type === "avatarBase") return isGaelEquipment(equipment);
  if (["armor", "belt", "boots", "shield"].includes(layer.type)) return equipment.armor?.equipmentId === "armor_guardian_blue";
  if (layer.type === "weapon" || layer.type === "occlusionMask") return equipment.weapon?.equipmentId === "sword_guardian_blue";
  if (layer.type === "helmetScene") return equipment.helmet?.equipmentId === "helmet_guardian_blue";
  if (layer.type === "pet") return equipment.pet?.equipmentId === "pet_guardian_fox";
  return false;
}
