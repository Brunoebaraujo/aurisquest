import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Sparkles, Lock, Trophy } from "lucide-react";
import { ItemCard, type CatalogItem } from "@/components/cosmetics/ItemCard";
import { type DashboardCosmetics } from "@/lib/cosmetics";
import { type Rarity } from "@/components/cosmetics/Rarity";

const CATS: { key: string; label: string }[] = [
  { key: "todos", label: "Tudo" },
  { key: "avatar", label: "Avatares" },
  { key: "elmo", label: "Elmos" },
  { key: "armadura", label: "Armaduras" },
  { key: "arma", label: "Armas" },
  { key: "pet", label: "Pets" },
  { key: "aura", label: "Auras" },
  { key: "moldura", label: "Molduras" },
  { key: "badge", label: "Badges" },
];

const RARITIES: { key: Rarity | "todas"; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "comum", label: "Comum" },
  { key: "raro", label: "Raro" },
  { key: "epico", label: "Épico" },
  { key: "lendario", label: "Lendário" },
];

type Combined = CatalogItem & { category: string; isAvatar: boolean };

export function ChildInventoryDialog({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: DashboardCosmetics;
}) {
  const [cat, setCat] = useState<string>("todos");
  const [rarity, setRarity] = useState<Rarity | "todas">("todas");
  const [status, setStatus] = useState<"todos" | "desbloqueados" | "bloqueados">("todos");
  const [search, setSearch] = useState("");

  const unlockedAv = useMemo(() => new Set(data.unlocked_avatars.map(a => a.avatar_id)), [data.unlocked_avatars]);
  const unlockedIt = useMemo(() => new Set(data.unlocked_items.map(i => i.item_id)), [data.unlocked_items]);

  const all: Combined[] = useMemo(() => [
    ...data.avatars_catalog.map(a => ({ ...(a as unknown as CatalogItem), category: "avatar", isAvatar: true })),
    ...data.items_catalog.map(i => ({ ...(i as CatalogItem), category: (i as any).category, isAvatar: false })),
  ], [data]);

  const isUnlocked = (it: Combined) => it.isAvatar ? unlockedAv.has(it.id) : unlockedIt.has(it.id);

  const filtered = useMemo(() => {
    return all.filter(it => {
      if (cat !== "todos" && it.category !== cat) return false;
      if (rarity !== "todas" && it.rarity !== rarity) return false;
      const ok = isUnlocked(it);
      if (status === "desbloqueados" && !ok) return false;
      if (status === "bloqueados" && ok) return false;
      if (search.trim() && !it.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [all, cat, rarity, status, search, unlockedAv, unlockedIt]);

  const stats = useMemo(() => {
    const total = all.length;
    const unlocked = all.filter(isUnlocked).length;
    const byRarity = (r: Rarity) => {
      const arr = all.filter(it => it.rarity === r);
      return { total: arr.length, unlocked: arr.filter(isUnlocked).length };
    };
    return {
      total, unlocked,
      pct: total > 0 ? Math.round((unlocked / total) * 100) : 0,
      comum: byRarity("comum"),
      raro: byRarity("raro"),
      epico: byRarity("epico"),
      lendario: byRarity("lendario"),
    };
  }, [all, unlockedAv, unlockedIt]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <Trophy className="w-6 h-6 text-accent" /> Meu Inventário
          </DialogTitle>
        </DialogHeader>

        {/* Stats */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-4 border border-border">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Coleção completa
              </div>
              <div className="font-display text-3xl font-bold">
                {stats.unlocked} <span className="text-base text-muted-foreground font-normal">de {stats.total}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Progresso</div>
              <div className="font-display text-2xl font-bold text-primary">{stats.pct}%</div>
            </div>
          </div>
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${stats.pct}%` }} />
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3 text-[11px]">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">Comum {stats.comum.unlocked}/{stats.comum.total}</Badge>
            <Badge variant="outline" className="bg-sky-500/10 text-sky-700 border-sky-500/30">Raro {stats.raro.unlocked}/{stats.raro.total}</Badge>
            <Badge variant="outline" className="bg-violet-500/10 text-violet-700 border-violet-500/30">Épico {stats.epico.unlocked}/{stats.epico.total}</Badge>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">Lendário {stats.lendario.unlocked}/{stats.lendario.total}</Badge>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-3 mt-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar item..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {CATS.map(c => (
              <Button
                key={c.key}
                size="sm"
                variant={cat === c.key ? "default" : "outline"}
                className="h-7 px-3 text-xs rounded-full"
                onClick={() => setCat(c.key)}
              >
                {c.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex flex-wrap gap-1.5">
              {RARITIES.map(r => (
                <Button
                  key={r.key}
                  size="sm"
                  variant={rarity === r.key ? "secondary" : "ghost"}
                  className="h-7 px-3 text-xs rounded-full"
                  onClick={() => setRarity(r.key as any)}
                >
                  {r.label}
                </Button>
              ))}
            </div>
            <Tabs value={status} onValueChange={(v) => setStatus(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="todos" className="text-xs">Todos</TabsTrigger>
                <TabsTrigger value="desbloqueados" className="text-xs">Desbloqueados</TabsTrigger>
                <TabsTrigger value="bloqueados" className="text-xs">Bloqueados</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Grid */}
        <div className="mt-4">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Lock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum item com esses filtros.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {filtered.map(it => (
                <ItemCard
                  key={`${it.isAvatar ? "av" : "it"}-${it.id}`}
                  item={it}
                  unlocked={isUnlocked(it)}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
