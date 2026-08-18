import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AuriIcon } from "@/components/AuriIcon";
import { formatAuris } from "@/lib/format";
import { Link } from "react-router-dom";
import { RewardFormDialog, CATEGORY_LABELS, type RewardRow } from "@/components/rewards/RewardFormDialog";

const RewardCatalog = () => {
  const { profile } = useAuth();
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RewardRow | null>(null);

  const load = async () => {
    if (!profile?.family_id) return;
    const { data } = await supabase.from("rewards").select("*").eq("family_id", profile.family_id).order("auris_cost");
    setRewards((data ?? []) as any);
  };
  useEffect(() => { load(); }, [profile?.family_id]);

  const toggle = async (r: RewardRow) => {
    const { error } = await supabase.from("rewards").update({ active: !r.active }).eq("id", r.id);
    if (error) toast.error(error.message); else load();
  };

  const remove = async (r: RewardRow) => {
    if (!confirm(`Apagar "${r.name}"? Resgates já registrados serão preservados.`)) return;
    const { error } = await supabase.from("rewards").delete().eq("id", r.id);
    if (error) toast.error(error.message); else { toast.success("Apagada"); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to="/app/pagamentos" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1">
            <ArrowLeft className="w-3 h-3" /> Voltar para Mercador
          </Link>
          <h2 className="text-2xl font-display font-bold">Catálogo do Mercador</h2>
          <p className="text-muted-foreground text-sm">Crie as recompensas que as crianças poderão resgatar com seus Auris.</p>
        </div>
        <Button variant="hero" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="w-4 h-4" /> Nova recompensa
        </Button>
      </div>

      {rewards.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Você ainda não criou nenhuma recompensa. Comece criando a primeira!
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rewards.map(r => (
          <Card key={r.id} className={`border-0 shadow-card rounded-2xl ${r.active ? "" : "opacity-60"}`}>
            <CardContent className="p-5 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-display font-bold leading-tight">{r.name}</div>
                  <Badge variant="secondary" className="mt-1 text-[10px]">{CATEGORY_LABELS[r.category]}</Badge>
                </div>
                <div className="text-right font-display font-bold inline-flex items-center gap-1 whitespace-nowrap">
                  <AuriIcon size={16} />{formatAuris(r.auris_cost)}
                </div>
              </div>
              {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
              <div className="flex items-center gap-1 pt-1">
                <Button variant="ghost" size="sm" onClick={() => { setEditing(r); setOpen(true); }}>
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toggle(r)}>
                  {r.active ? <><EyeOff className="w-3.5 h-3.5" /> Desativar</> : <><Eye className="w-3.5 h-3.5" /> Ativar</>}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(r)} className="text-destructive ml-auto">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <RewardFormDialog open={open} onOpenChange={setOpen} reward={editing} onSaved={load} />
    </div>
  );
};

export default RewardCatalog;
