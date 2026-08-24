import type { Equipment, EquippedItem } from "@/components/cosmetics/EquippedAvatar";
import type { AvatarLayer } from "../composer/composer.types";

export type AvatarRenderSurface = "badge" | "portrait" | "characterScene";
export type WardrobeSlot = "avatar" | "elmo" | "armadura" | "arma" | "pet";

const normalize = (value = "") => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
const identityText = (item?: EquippedItem) => normalize([item?.name, item?.image_url].filter(Boolean).join(" "));

export function inferEquipmentId(kind: "avatar" | "helmet" | "armor" | "weapon" | "pet", name?: string, imageUrl?: string): string | undefined {
  const value = normalize(`${name ?? ""} ${imageUrl ?? ""}`);
  if (kind === "avatar" && value.includes("gael")) return "gael";
  if (kind === "avatar" && value.includes("maya")) return "maya";
  if (kind === "helmet" && (value.includes("tiara") || value.includes("coroa"))) return "tiara_guardian_pink";
  if (kind === "armor" && (value.includes("rosa") || value.includes("pink") || value.includes("coracao") || value.includes("heart"))) return "armor_guardian_pink";
  if (kind === "weapon" && (value.includes("cajado") || value.includes("staff"))) return "staff_guardian_pink";
  if (!value.includes("guardian") && !value.includes("guardiao")) return undefined;
  if (kind === "helmet" && (value.includes("helmet") || value.includes("elmo"))) return "helmet_guardian_blue";
  if (kind === "armor" && (value.includes("armor") || value.includes("armadura"))) return "armor_guardian_blue";
  if (kind === "weapon" && (value.includes("sword") || value.includes("espada"))) return "sword_guardian_blue";
  if (kind === "pet" && (value.includes("fox") || value.includes("raposa"))) return "pet_guardian_fox";
  return undefined;
}

export const isGaelEquipment = (equipment: Equipment) => equipment.avatar?.equipmentId === "gael" || identityText(equipment.avatar).includes("gael");
export const isMayaEquipment = (equipment: Equipment) => equipment.avatar?.equipmentId === "maya" || identityText(equipment.avatar).includes("maya");

export function isLayerEquipped(layer: AvatarLayer, equipment: Equipment): boolean {
  if (!layer.visible) return false;
  if (layer.type === "avatarBase") return true;
  if (!layer.equipmentId) {
    if (layer.type === "generic") return true;
    if (isGaelEquipment(equipment) && ["armor", "belt", "boots", "shield"].includes(layer.type)) return equipment.armor?.equipmentId === "armor_guardian_blue";
    if (isGaelEquipment(equipment) && (layer.type === "weapon" || layer.type === "occlusionMask")) return equipment.weapon?.equipmentId === "sword_guardian_blue";
    if (isGaelEquipment(equipment) && layer.type === "helmetScene") return equipment.helmet?.equipmentId === "helmet_guardian_blue";
    if (isGaelEquipment(equipment) && layer.type === "pet") return equipment.pet?.equipmentId === "pet_guardian_fox";
    return false;
  }
  if (["armor", "belt", "boots", "shield"].includes(layer.type) || layer.inventoryCategory === "armadura") return equipment.armor?.equipmentId === layer.equipmentId || (isGaelEquipment(equipment) && equipment.armor?.equipmentId === "armor_guardian_blue" && layer.equipmentId.endsWith("_guardian_blue"));
  if (layer.type === "weapon" || layer.type === "occlusionMask" || layer.inventoryCategory === "arma") return equipment.weapon?.equipmentId === layer.equipmentId;
  if (layer.type === "helmetScene" || layer.inventoryCategory === "elmo") return equipment.helmet?.equipmentId === layer.equipmentId;
  if (layer.type === "pet" || layer.inventoryCategory === "pet") return equipment.pet?.equipmentId === layer.equipmentId;
  return false;
}

export function isLayerVisibleOnSurface(layer: AvatarLayer, equipment: Equipment, surface: AvatarRenderSurface): boolean {
  if (!isLayerEquipped(layer, equipment)) return false;
  if (surface === "badge") return layer.type === "avatarBase";
  if (surface === "characterScene") return layer.type !== "helmetScene" || layer.placementType === "body";
  return true;
}

export function wardrobeSlotForLayer(layer: AvatarLayer): WardrobeSlot | null {
  if (layer.type === "avatarBase") return "avatar";
  if (["armor", "belt", "boots", "shield"].includes(layer.type)) return "armadura";
  if (layer.type === "weapon") return "arma";
  if (layer.type === "helmetScene") return "elmo";
  if (layer.type === "pet") return "pet";
  return null;
}
