import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Equipment } from "@/components/cosmetics/EquippedAvatar";
import type { Rarity } from "@/components/cosmetics/Rarity";

type AvatarRow = { id: string; name: string; image_url: string; rarity: Rarity };
type ItemRow = { id: string; name: string; category: string; image_url: string; rarity: Rarity };
type EquipRow = {
  child_id: string;
  avatar_id: string | null;
  helmet_item_id: string | null;
  armor_item_id: string | null;
  weapon_item_id: string | null;
  pet_item_id: string | null;
  aura_item_id: string | null;
  frame_item_id: string | null;
};

export type FamilyCosmeticsMap = Record<string, { equipment: Equipment; level?: number }>;

export function useFamilyCosmetics(childIds: string[]) {
  const [map, setMap] = useState<FamilyCosmeticsMap>({});

  useEffect(() => {
    if (childIds.length === 0) { setMap({}); return; }
    let cancelled = false;
    (async () => {
      const [eqRes, avRes, itRes] = await Promise.all([
        supabase.from("child_equipment").select("*").in("child_id", childIds),
        supabase.from("avatars").select("id, name, image_url, rarity"),
        supabase.from("cosmetic_items").select("id, name, category, image_url, rarity"),
      ]);
      if (cancelled) return;
      const avs = new Map<string, AvatarRow>((avRes.data ?? []).map((a: any) => [a.id, a]));
      const its = new Map<string, ItemRow>((itRes.data ?? []).map((i: any) => [i.id, i]));
      const toItem = (id: string | null) => {
        if (!id) return null;
        const it = its.get(id); if (!it) return null;
        return { image_url: it.image_url, rarity: it.rarity, name: it.name };
      };
      const out: FamilyCosmeticsMap = {};
      (eqRes.data ?? []).forEach((e: EquipRow) => {
        const av = e.avatar_id ? avs.get(e.avatar_id) : null;
        out[e.child_id] = {
          equipment: {
            avatar: av ? { image_url: av.image_url, rarity: av.rarity, name: av.name } : null,
            helmet: toItem(e.helmet_item_id),
            armor: toItem(e.armor_item_id),
            weapon: toItem(e.weapon_item_id),
            pet: toItem(e.pet_item_id),
            aura: toItem(e.aura_item_id),
            frame: toItem(e.frame_item_id),
          },
        };
      });
      setMap(out);
    })();
    return () => { cancelled = true; };
  }, [childIds.join(",")]);

  return map;
}
