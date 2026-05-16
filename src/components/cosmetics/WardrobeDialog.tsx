import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ItemCard, type CatalogItem } from "@/components/cosmetics/ItemCard";
import { type DashboardCosmetics } from "@/lib/cosmetics";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CATEGORIES: { key: string; label: string }[] = [
  { key: "avatar", label: "Avatar" },
  { key: "elmo", label: "Elmo" },
  { key: "armadura", label: "Armadura" },
  { key: "arma", label: "Arma" },
  { key: "pet", label: "Pet" },
  { key: "aura", label: "Aura" },
  { key: "moldura", label: "Moldura" },
  { key: "badge", label: "Badge" },
];

const SLOT_COL: Record<string, string> = {
  avatar: "avatar_id",
  elmo: "helmet_item_id", armadura: "armor_item_id", arma: "weapon_item_id",
  pet: "pet_item_id", aura: "aura_item_id", moldura: "frame_item_id", badge: "favorite_badge_id",
};

export function WardrobeDialog({
  open, onOpenChange, data, token, onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: DashboardCosmetics;
  token: string | null;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const unlockedAv = useMemo(() => new Set(data.unlocked_avatars.map(a => a.avatar_id)), [data.unlocked_avatars]);
  const unlockedIt = useMemo(() => new Set(data.unlocked_items.map(i => i.item_id)), [data.unlocked_items]);
  const eq = data.equipment ?? ({} as any);

  const handleEquip = async (slot: string, item_id: string | null) => {
    if (!token) { toast.error("Sessão inválida"); return; }
    setBusy(true);
    const { error } = await supabase.functions.invoke("equip-cosmetic", { body: { token, slot, item_id } });
    setBusy(false);
    if (error) { toast.error(error.message ?? "Erro"); return; }
    toast.success("Equipado! ✨");
    onChanged();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Guarda-roupa</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="avatar">
          <TabsList className="flex flex-wrap h-auto">
            {CATEGORIES.map(c => <TabsTrigger key={c.key} value={c.key}>{c.label}</TabsTrigger>)}
          </TabsList>

          <TabsContent value="avatar" className="mt-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {data.avatars_catalog.map(a => {
                const unlocked = unlockedAv.has(a.id);
                const equipped = eq.avatar_id === a.id;
                return (
                  <ItemCard
                    key={a.id}
                    item={a as unknown as CatalogItem}
                    unlocked={unlocked}
                    equipped={equipped}
                    onClick={() => unlocked && !busy && handleEquip("avatar", a.id)}
                  />
                );
              })}
            </div>
          </TabsContent>

          {CATEGORIES.filter(c => c.key !== "avatar").map(c => {
            const items = data.items_catalog.filter(i => (i as any).category === c.key);
            const colKey = SLOT_COL[c.key];
            return (
              <TabsContent key={c.key} value={c.key} className="mt-4">
                <div className="flex justify-end mb-3">
                  <Button size="sm" variant="ghost" disabled={busy || !eq[colKey]} onClick={() => handleEquip(c.key, null)}>
                    Desequipar
                  </Button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {items.map(it => {
                    const unlocked = unlockedIt.has(it.id);
                    const equipped = eq[colKey] === it.id;
                    return (
                      <ItemCard
                        key={it.id}
                        item={it}
                        unlocked={unlocked}
                        equipped={equipped}
                        onClick={() => unlocked && !busy && handleEquip(c.key, it.id)}
                      />
                    );
                  })}
                  {items.length === 0 && <p className="text-sm text-muted-foreground col-span-full">Nada por aqui ainda.</p>}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
