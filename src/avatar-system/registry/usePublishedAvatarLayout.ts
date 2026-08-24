import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Equipment } from "@/components/cosmetics/EquippedAvatar";
import type { AvatarComposition } from "../composer/composer.types";
import { avatarKeyFromEquipment, getAvatarLayout, registerAvatarLayout } from "./avatar-layout-registry";

const fetched = new Set<string>();

export function usePublishedAvatarLayout(equipment: Equipment) {
  const avatarKey = avatarKeyFromEquipment(equipment);
  const [layout, setLayout] = useState<AvatarComposition | null>(() => getAvatarLayout(equipment));
  useEffect(() => {
    setLayout(getAvatarLayout(equipment));
    if (!avatarKey || fetched.has(avatarKey)) return;
    fetched.add(avatarKey);
    (supabase.from("avatar_render_sets" as never) as any).select("layout").eq("avatar_key", avatarKey).eq("published", true).maybeSingle()
      .then(({ data }: { data?: { layout?: AvatarComposition } | null }) => {
        if (!data?.layout) return;
        registerAvatarLayout(data.layout);
        setLayout(data.layout);
      })
      .catch(() => fetched.delete(avatarKey));
  }, [avatarKey, equipment]);
  return layout;
}
