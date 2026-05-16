import type { CatalogItem } from "@/components/cosmetics/ItemCard";
import type { Rarity } from "@/components/cosmetics/Rarity";
import type { Equipment } from "@/components/cosmetics/EquippedAvatar";

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
  const toEq = (it?: CatalogItem) => (it ? { image_url: it.image_url, rarity: it.rarity as Rarity, name: it.name } : null);
  return {
    avatar: av ? { image_url: av.image_url, rarity: av.rarity as Rarity, name: av.name } : null,
    helmet: toEq(find(e.helmet_item_id)),
    armor: toEq(find(e.armor_item_id)),
    weapon: toEq(find(e.weapon_item_id)),
    pet: toEq(find(e.pet_item_id)),
    aura: toEq(find(e.aura_item_id)),
    frame: toEq(find(e.frame_item_id)),
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
