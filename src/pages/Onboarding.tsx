import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, PartyPopper, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Kid = { name: string; age: string };

const Onboarding = () => {
  const { user, profile, refreshProfile } = useAuth();
  const nav = useNavigate();
  const fromInvite = !!profile?.family_id; // veio de convite aceito → só cadastra filhos
  const [familyName, setFamilyName] = useState("");
  const [kids, setKids] = useState<Kid[]>([{ name: "", age: "" }]);
  const [busy, setBusy] = useState(false);

  const addKid = () => setKids([...kids, { name: "", age: "" }]);
  const removeKid = (i: number) => setKids(kids.filter((_, idx) => idx !== i));
  const updateKid = (i: number, k: keyof Kid, v: string) => {
    const next = [...kids]; next[i] = { ...next[i], [k]: v }; setKids(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);

    let familyId = profile?.family_id ?? null;

    if (!fromInvite) {
      if (!familyName.trim()) { setBusy(false); toast.error("Dê um nome para sua família"); return; }
      const { data: fam, error: famErr } = await supabase
        .from("families").insert({ name: familyName.trim(), created_by: user.id }).select().single();
      if (famErr || !fam) { setBusy(false); toast.error("Erro ao criar família: " + famErr?.message); return; }
      familyId = fam.id;
      const { error: profileErr } = await supabase.from("profiles").update({ family_id: familyId }).eq("id", user.id);
      if (profileErr) {
        setBusy(false);
        toast.error("Não foi possível vincular sua família: " + profileErr.message);
        return;
      }
      // The database trigger creates the five default activities exactly once.
      // Do not duplicate them client-side or silently report success if the seed failed.
      const { count: activityCount, error: activitiesErr } = await supabase
        .from("activities").select("id", { count: "exact", head: true }).eq("family_id", familyId);
      if (activitiesErr || !activityCount) {
        setBusy(false);
        toast.error("Família criada, mas as atividades iniciais não foram carregadas. Verifique a configuração do banco de dados.");
        await refreshProfile();
        nav("/app/activities");
        return;
      }
    }

    // Crianças
    const validKids = kids.map(k => ({ name: k.name.trim() })).filter(k => k.name);
    if (validKids.length && familyId) {
      await supabase.from("children").insert(validKids.map(k => ({ family_id: familyId!, name: k.name, active: true })));
    }

    await refreshProfile();
    setBusy(false);
    toast.success("Tudo pronto! 🎉");
    nav("/app");
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-xl shadow-card border-0 rounded-3xl">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-warm shadow-reward mb-3">
              <PartyPopper className="w-7 h-7 text-secondary-foreground" />
            </div>
            <h2 className="text-3xl font-display font-bold mb-2">
              {fromInvite ? "Cadastre seus filhos" : "Vamos começar!"}
            </h2>
            <p className="text-muted-foreground flex items-center justify-center gap-1">
              <Sparkles className="w-4 h-4" />
              {fromInvite ? "Adicione as crianças da família" : "Conte um pouco sobre sua família"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!fromInvite && (
              <div className="space-y-2">
                <Label htmlFor="fam">Nome da família</Label>
                <Input id="fam" value={familyName} onChange={e => setFamilyName(e.target.value)} placeholder="Ex: Família Silva" required />
              </div>
            )}

            <div className="space-y-3">
              <Label>Crianças</Label>
              {kids.map((k, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Input value={k.name} onChange={e => updateKid(i, "name", e.target.value)} placeholder="Nome" />
                  </div>
                  <div className="w-24 space-y-1">
                    <Input value={k.age} onChange={e => updateKid(i, "age", e.target.value)} placeholder="Idade" type="number" min={0} max={20} />
                  </div>
                  {kids.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeKid(i)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addKid}>
                <Plus className="w-4 h-4 mr-1" />Adicionar criança
              </Button>
            </div>

            {!fromInvite && (
              <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
                ✨ Sua família começará com 5 atividades padrão. Você poderá editar ou excluir qualquer uma delas.
              </div>
            )}

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
              {busy ? "Salvando..." : fromInvite ? "Concluir" : "Criar minha família"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
