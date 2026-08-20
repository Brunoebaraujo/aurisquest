import type { CatalogItem } from "@/components/cosmetics/ItemCard";
import type { Rarity } from "@/components/cosmetics/Rarity";
import type { Equipment } from "@/components/cosmetics/EquippedAvatar";
import { inferEquipmentId } from "@/avatar-system/renderer/equipment-resolver";

export type AvatarCatalog = CatalogItem & { category: string };

export type DashboardCosmetics = {
  equipment?: {
    avatar_id?: string | null;
    helmet_item_id?: string | null;
    armor_item_id?: string | null;
    weapon_item_id?: string | null;
    pet_item_id?: string | null;
    aura_item_id?: string | null;
    frame_item_id?: string | null;
    favorite_badge_id?: string | null;
  } | null;
  unlocked_avatars: { avatar_id: string }[];
  unlocked_items: { item_id: string }[];
  avatars_catalog: AvatarCatalog[];
  items_catalog: CatalogItem[];
};

export function buildEquipment(d: DashboardCosmetics): Equipment {
  const e = d.equipment ?? {};
  const av = d.avatars_catalog.find(a => a.id === e.avatar_id);
  const find = (id?: string | null) => (id ? d.items_catalog.find(i => i.id === id) : undefined);
  const toEq = (kind: "helmet"|"armor"|"weapon"|"pet", it?: CatalogItem) => (it ? { image_url: it.image_url, rarity: it.rarity as Rarity, name: it.name, catalogId: it.id, equipmentId: inferEquipmentId(kind,it.name,it.image_url) } : null);
  return {
    avatar: av ? { image_url: av.image_url, rarity: av.rarity as Rarity, name: av.name, catalogId: av.id, equipmentId: inferEquipmentId("avatar",av.name,av.image_url) } : null,
    helmet: toEq("helmet",find(e.helmet_item_id)),
    armor: toEq("armor",find(e.armor_item_id)),
    weapon: toEq("weapon",find(e.weapon_item_id)),
    pet: toEq("pet",find(e.pet_item_id)),
    aura: find(e.aura_item_id) ? { image_url: find(e.aura_item_id)!.image_url, rarity: find(e.aura_item_id)!.rarity as Rarity, name: find(e.aura_item_id)!.name, catalogId: find(e.aura_item_id)!.id } : null,
    frame: find(e.frame_item_id) ? { image_url: find(e.frame_item_id)!.image_url, rarity: find(e.frame_item_id)!.rarity as Rarity, name: find(e.frame_item_id)!.name, catalogId: find(e.frame_item_id)!.id } : null,
  };
}

export const SLOT_TO_COL: Record<string, keyof NonNullable<DashboardCosmetics["equipment"]>> = {
  elmo: "helmet_item_id",
  armadura: "armor_item_id",
  arma: "weapon_item_id",
  pet: "pet_item_id",
  aura: "aura_item_id",
  moldura: "frame_item_id",
  badge: "favorite_badge_id",
};
