import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const SAMPLE_ACTIVITIES = [
  { name: "Escovar os dentes", description: "De manhã e à noite", reward_amount_cents: 50, category: "Higiene", frequency_hint: "diaria" },
  { name: "Arrumar a cama", description: "Logo ao acordar", reward_amount_cents: 100, category: "Casa", frequency_hint: "diaria" },
  { name: "Fazer a lição de casa", description: "Sem reclamar 😉", reward_amount_cents: 200, category: "Estudos", frequency_hint: "diaria" },
  { name: "Guardar os brinquedos", description: "Antes de dormir", reward_amount_cents: 100, category: "Casa", frequency_hint: "diaria" },
  { name: "Ajudar na cozinha", description: "Lavar louça ou pôr a mesa", reward_amount_cents: 150, category: "Casa", frequency_hint: "semanal" },
];

const SAMPLE_CHILDREN = ["Lucas", "Sofia"];

const Onboarding = () => {
  const { user, refreshProfile } = useAuth();
  const nav = useNavigate();
  const [familyName, setFamilyName] = useState("");
  const [child1, setChild1] = useState(SAMPLE_CHILDREN[0]);
  const [child2, setChild2] = useState(SAMPLE_CHILDREN[1]);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!familyName.trim()) { toast.error("Dê um nome para sua família"); return; }
    setBusy(true);

    // 1. Cria família
    const { data: fam, error: famErr } = await supabase
      .from("families")
      .insert({ name: familyName.trim(), created_by: user.id })
      .select()
      .single();
    if (famErr || !fam) { setBusy(false); toast.error("Erro ao criar família: " + famErr?.message); return; }

    // 2. Vincula profile
    const { error: profErr } = await supabase
      .from("profiles")
      .update({ family_id: fam.id })
      .eq("id", user.id);
    if (profErr) { setBusy(false); toast.error("Erro: " + profErr.message); return; }

    // 3. Cria crianças de exemplo
    const kids = [child1, child2].filter(c => c.trim()).map(name => ({
      family_id: fam.id,
      name: name.trim(),
      active: true,
    }));
    if (kids.length) await supabase.from("children").insert(kids);

    // 4. Cria atividades de exemplo
    const acts = SAMPLE_ACTIVITIES.map(a => ({ ...a, family_id: fam.id, active: true }));
    await supabase.from("activities").insert(acts);

    await refreshProfile();
    setBusy(false);
    toast.success("Tudo pronto! Boas-vindas à Jornada Kids 🎉");
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
            <h2 className="text-3xl font-display font-bold mb-2">Vamos começar!</h2>
            <p className="text-muted-foreground flex items-center justify-center gap-1">
              <Sparkles className="w-4 h-4" /> Conte um pouco sobre sua família
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fam">Nome da família</Label>
              <Input id="fam" value={familyName} onChange={e => setFamilyName(e.target.value)} placeholder="Ex: Família Silva" required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="c1">Primeira criança</Label>
                <Input id="c1" value={child1} onChange={e => setChild1(e.target.value)} placeholder="Nome" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c2">Segunda criança (opcional)</Label>
                <Input id="c2" value={child2} onChange={e => setChild2(e.target.value)} placeholder="Nome" />
              </div>
            </div>

            <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
              ✨ Vamos criar para você 5 atividades de exemplo (escovar dentes, arrumar cama, lição de casa…). Você pode editar depois.
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
              {busy ? "Preparando tudo..." : "Criar minha família"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
