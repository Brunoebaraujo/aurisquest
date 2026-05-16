import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ItemCard, type CatalogItem } from "@/components/cosmetics/ItemCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AvatarRow = CatalogItem & { category: string };
type ItemRow = CatalogItem & { category: string };

const CATEGORIES: { key: string; label: string; col: string }[] = [
  { key: "avatar",   label: "Avatar",   col: "avatar_id" },
  { key: "elmo",     label: "Elmo",     col: "helmet_item_id" },
  { key: "armadura", label: "Armadura", col: "armor_item_id" },
  { key: "arma",     label: "Arma",     col: "weapon_item_id" },
  { key: "pet",      label: "Pet",      col: "pet_item_id" },
  { key: "aura",     label: "Aura",     col: "aura_item_id" },
];

export function ParentWardrobeDialog({
  open, onOpenChange, childId, childName, onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  childId: string | null;
  childName?: string;
  onChanged?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [avatars, setAvatars] = useState<AvatarRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [unlockedItems, setUnlockedItems] = useState<Set<string>>(new Set());
  const [eq, setEq] = useState<Record<string, string | null>>({});

  const load = async () => {
    if (!childId) return;
    const [av, it, ui, eqr] = await Promise.all([
      supabase.from("avatars").select("*").eq("active", true).eq("category", "humano").eq("rarity", "comum").order("sort_order"),
      supabase.from("cosmetic_items").select("*").eq("active", true).eq("rarity", "comum").order("sort_order"),
      supabase.from("child_unlocked_items").select("item_id").eq("child_id", childId),
      supabase.from("child_equipment").select("*").eq("child_id", childId).maybeSingle(),
    ]);
    setAvatars((av.data ?? []) as AvatarRow[]);
    setItems((it.data ?? []) as ItemRow[]);
    setUnlockedItems(new Set((ui.data ?? []).map((r: any) => r.item_id)));
    setEq((eqr.data ?? {}) as any);
  };

  useEffect(() => { if (open) load(); }, [open, childId]);

  const handleEquip = async (slot: string, item_id: string | null) => {
    if (!childId) return;
    setBusy(true);
    const { error } = await supabase.functions.invoke("parent-equip-cosmetic", { body: { child_id: childId, slot, item_id } });
    setBusy(false);
    if (error) { toast.error(error.message ?? "Erro"); return; }
    toast.success("Equipado! ✨");
    await load();
    onChanged?.();
  };

  const itemsByCat = useMemo(() => {
    const m: Record<string, ItemRow[]> = {};
    items.forEach(i => { (m[i.category] ??= []).push(i); });
    return m;
  }, [items]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            Editar visual {childName ? `— ${childName}` : ""}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Como responsável, você pode escolher qualquer avatar humano comum, e os itens comuns que a criança já desbloqueou.
          </p>
        </DialogHeader>
        <Tabs defaultValue="avatar">
          <TabsList className="flex flex-wrap h-auto">
            {CATEGORIES.map(c => <TabsTrigger key={c.key} value={c.key}>{c.label}</TabsTrigger>)}
          </TabsList>

          <TabsContent value="avatar" className="mt-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {avatars.map(a => (
                <ItemCard
                  key={a.id}
                  item={a}
                  unlocked={true}
                  equipped={eq.avatar_id === a.id}
                  onClick={() => !busy && handleEquip("avatar", a.id)}
                />
              ))}
              {avatars.length === 0 && <p className="text-sm text-muted-foreground col-span-full">Nenhum avatar comum disponível.</p>}
            </div>
          </TabsContent>

          {CATEGORIES.filter(c => c.key !== "avatar").map(c => {
            const list = itemsByCat[c.key] ?? [];
            const currentlyEquipped = (eq as any)[c.col];
            return (
              <TabsContent key={c.key} value={c.key} className="mt-4">
                <div className="flex justify-end mb-3">
                  <Button size="sm" variant="ghost" disabled={busy || !currentlyEquipped} onClick={() => handleEquip(c.key, null)}>
                    Desequipar
                  </Button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {list.map(it => {
                    const unlocked = unlockedItems.has(it.id);
                    return (
                      <ItemCard
                        key={it.id}
                        item={it}
                        unlocked={unlocked}
                        equipped={currentlyEquipped === it.id}
                        onClick={() => unlocked && !busy && handleEquip(c.key, it.id)}
                      />
                    );
                  })}
                  {list.length === 0 && <p className="text-sm text-muted-foreground col-span-full">Sem itens comuns nesta categoria.</p>}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
