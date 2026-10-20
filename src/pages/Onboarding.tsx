import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2, Sparkles, Shield, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { AuriIcon } from "@/components/AuriIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const STEPS = ["Fundar o Reino", "Convocar os Heróis", "Definir as Quests", "Preparar o Tesouro", "Abrir os Portões"];
const RECOMMENDED = ["Arrumar a cama", "Escovar os dentes", "Organizar os brinquedos", "Realizar a tarefa escolar", "Praticar uma boa ação"];
const REWARD_OPTIONS = [
  { name: "Escolher o filme da noite", category: "experience", cost: 15, description: "Escolha o filme para assistir em família." },
  { name: "30 minutos de tempo de tela", category: "screen_time", cost: 20, description: "Tempo de tela adicional, conforme combinado com o responsável." },
  { name: "Escolher um passeio em família", category: "experience", cost: 30, description: "Escolha uma atividade simples para fazer juntos." },
] as const;

const Onboarding = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [familyName, setFamilyName] = useState("");
  const [kids, setKids] = useState([""]);
  const [missionEnabled, setMissionEnabled] = useState(true);
  const [rewardChoice, setRewardChoice] = useState(0);
  const [busy, setBusy] = useState(false);

  const next = () => {
    if (step === 0 && !familyName.trim()) { toast.error("Informe o nome do Reino."); return; }
    if (step === 1 && !kids.some(k => k.trim())) { toast.error("Adicione ao menos um herói."); return; }
    setStep(s => Math.min(4, s + 1));
  };

  const finish = async () => {
    if (!user || busy) return;
    const names = kids.map(k => k.trim()).filter(Boolean);
    if (!familyName.trim() || !names.length) { toast.error("Complete o nome do Reino e adicione um herói."); return; }
    setBusy(true);
    try {
      // The database seeds five activities upon family creation. Never insert duplicates here.
      let familyId = profile?.family_id;
      if (!familyId) {
        const { data: family, error: familyError } = await supabase.from("families")
          .insert({ name: familyName.trim(), created_by: user.id }).select("id").single();
        if (familyError || !family) throw familyError ?? new Error("Falha ao criar família.");
        familyId = family.id;
        const { error: linkError } = await supabase.from("profiles").update({ family_id: familyId }).eq("id", user.id);
        if (linkError) throw linkError;
      }

      const { data: existingChildren, error: childrenLoadError } = await supabase.from("children")
        .select("id, name").eq("family_id", familyId);
      if (childrenLoadError) throw childrenLoadError;
      const existingNames = new Set((existingChildren ?? []).map(c => c.name.trim().toLocaleLowerCase("pt-BR")));
      const missingNames = [...new Set(names)].filter(name => !existingNames.has(name.toLocaleLowerCase("pt-BR")));
      if (missingNames.length) {
        const { error } = await supabase.from("children").insert(missingNames.map(name => ({ family_id: familyId, name, active: true })));
        if (error) throw error;
      }
      const { data: allChildren, error: childrenError } = await supabase.from("children")
        .select("id").eq("family_id", familyId).eq("active", true);
      if (childrenError) throw childrenError;

      const { data: activities, error: activitiesError } = await supabase.from("activities")
        .select("id, name").eq("family_id", familyId);
      if (activitiesError) throw activitiesError;
      if (!activities?.length) throw new Error("As cinco atividades padrão não foram encontradas. Verifique a migração do banco.");

      // Mission is a distinct entity. Each child participates and earns only after approved submissions.
      if (missionEnabled) {
        let dentalActivity = activities.find(a => /escov|dente/i.test(a.name));
        if (!dentalActivity) {
          const { data: createdActivity, error: activityError } = await supabase.from("activities").insert({
            family_id: familyId, name: "Escovar os dentes", description: "Escovar os dentes como parte da rotina de higiene.",
            category: "Higiene", frequency_hint: "diaria", tier: "rotina", reward_auris: 1, active: true
          }).select("id, name").single();
          if (activityError) throw activityError;
          dentalActivity = createdActivity;
        }
        const { data: existingMission, error: missionLoadError } = await supabase.from("missions")
          .select("id").eq("family_id", familyId).eq("name", "Dentes Fortes").maybeSingle();
        if (missionLoadError) throw missionLoadError;
        let missionId = existingMission?.id;
        if (!missionId) {
          const { data: mission, error } = await supabase.from("missions").insert({
            family_id: familyId, activity_id: dentalActivity.id, name: "Dentes Fortes",
            description: "Escove os dentes por 7 dias seguidos. Cada conclusão conta após aprovação do responsável.",
            goal_type: "streak", goal_target: 7, bonus_auris: 5, bonus_amount_cents: 0,
            medal_url: null, active: true
          }).select("id").single();
          if (error || !mission) throw error ?? new Error("Não foi possível criar a missão.");
          missionId = mission.id;
        }
        const { data: existingParticipants, error: participantLoadError } = await supabase.from("mission_participants")
          .select("child_id").eq("family_id", familyId).eq("mission_id", missionId);
        if (participantLoadError) throw participantLoadError;
        const current = new Set((existingParticipants ?? []).map(p => p.child_id));
        const toAdd = (allChildren ?? []).filter(child => !current.has(child.id));
        if (toAdd.length) {
          const { error } = await supabase.from("mission_participants").insert(toAdd.map(child => ({
            family_id: familyId, mission_id: missionId, child_id: child.id
          })));
          if (error) throw error;
        }
      }

      const reward = REWARD_OPTIONS[rewardChoice];
      const { data: oldReward, error: rewardLoadError } = await supabase.from("rewards")
        .select("id").eq("family_id", familyId).eq("name", reward.name).maybeSingle();
      if (rewardLoadError) throw rewardLoadError;
      if (!oldReward) {
        const { error } = await supabase.from("rewards").insert({
          family_id: familyId, name: reward.name, description: reward.description,
          category: reward.category, auris_cost: reward.cost, active: true, created_by: user.id
        });
        if (error) throw error;
      }

      await refreshProfile();
      toast.success("Seu Reino está pronto! Configure as senhas dos heróis em Crianças.");
      navigate("/app/quem-entra", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha na criação do Reino. Tente novamente.");
      // On retry, use the existing family when the profile has already been linked.
      await refreshProfile();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-3 sm:p-6">
      <Card className="w-full max-w-xl shadow-card border-0 rounded-3xl">
        <CardContent className="p-5 sm:p-8 space-y-5">
          <div className="text-center space-y-2">
            <AuriIcon size={58} className="mx-auto" />
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Sparkles size={15} /> A primeira jornada do Guardião</div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold">{STEPS[step]}</h1>
            <div className="text-sm text-muted-foreground">Etapa {step + 1} de {STEPS.length}</div>
            <Progress value={(step + 1) * 20} />
          </div>

          {step === 0 && <div className="space-y-3">
            <p className="text-sm">Todo grande reino começa com um nome. Como vamos chamar sua família?</p>
            <Label htmlFor="kingdom">Nome da família</Label>
            <Input id="kingdom" maxLength={80} value={familyName} onChange={e => setFamilyName(e.target.value)} placeholder="Ex.: Família Sena" autoFocus />
          </div>}

          {step === 1 && <div className="space-y-3">
            <p className="text-sm">Quem serão os primeiros heróis deste reino? Use apenas o nome ou apelido.</p>
            {kids.map((name, index) => <div className="flex gap-2" key={index}>
              <Input aria-label={`Nome do herói ${index + 1}`} maxLength={60} placeholder="Nome do herói" value={name}
                onChange={e => setKids(values => values.map((v, i) => i === index ? e.target.value : v))} />
              {kids.length > 1 && <Button type="button" size="icon" variant="outline" aria-label="Remover herói" onClick={() => setKids(values => values.filter((_, i) => i !== index))}><Trash2 size={16} /></Button>}
            </div>)}
            <Button type="button" variant="outline" size="sm" onClick={() => setKids(values => [...values, ""])}><Plus size={16} /> Outro herói</Button>
            <p className="text-xs text-muted-foreground">As senhas individuais poderão ser definidas depois em Crianças.</p>
          </div>}

          {step === 2 && <div className="space-y-3">
            <p className="text-sm">Seu reino já começará com cinco atividades editáveis, sem precisar cadastrar cada uma.</p>
            <div className="rounded-xl bg-muted p-3 space-y-2">{RECOMMENDED.map(n => <div key={n} className="flex items-center gap-2 text-sm"><Check size={16} className="text-success" />{n}</div>)}</div>
            <p className="text-xs text-muted-foreground">A pontuação segue os níveis existentes do Auris Quest. Você poderá alterar ou excluir as atividades no painel.</p>
            <div className="border rounded-xl p-3 space-y-2">
              <label className="flex gap-3 items-center text-sm font-medium"><Checkbox checked={missionEnabled} onCheckedChange={value => setMissionEnabled(value === true)} /> Ativar missão inicial: Dentes Fortes</label>
              <p className="text-xs text-muted-foreground">Escovar os dentes durante 7 dias consecutivos. As conclusões precisam ser aprovadas. Ao cumprir a meta, cada participante recebe a medalha da missão e bônus Bronze de 5 Auris.</p>
              <p className="text-xs text-muted-foreground">Atividade = ação diária. Missão = sequência de conquistas. A missão é opcional e pode ser excluída depois.</p>
            </div>
          </div>}

          {step === 3 && <div className="space-y-3">
            <p className="text-sm">Os Auris conquistados podem ser trocados por recompensas. Escolha a primeira oferta do Mercador.</p>
            {REWARD_OPTIONS.map((reward, index) => <button type="button" key={reward.name}
              className={`w-full rounded-xl p-3 text-left border flex justify-between items-center gap-3 ${rewardChoice === index ? "border-primary bg-primary/5" : "border-border"}`}
              onClick={() => setRewardChoice(index)}>
              <span className="text-sm font-medium">{reward.name}</span><span className="flex items-center gap-1 text-xs shrink-0"><AuriIcon size={14} />{reward.cost}</span>
            </button>)}
            <p className="text-xs text-muted-foreground">Você poderá alterar os custos, criar novas ofertas e controlar os resgates no Mercador.</p>
          </div>}

          {step === 4 && <div className="space-y-4">
            <div className="rounded-2xl bg-muted p-4 space-y-3 text-sm">
              <div className="flex items-center gap-2"><Shield size={18} /> <strong>{familyName.trim()}</strong></div>
              <div><strong>Heróis:</strong> {kids.map(k => k.trim()).filter(Boolean).join(", ")}</div>
              <div><strong>Atividades:</strong> 5 sugestões iniciais</div>
              <div className="flex items-center gap-2"><Trophy size={16} /><strong>Missão:</strong> {missionEnabled ? "Dentes Fortes (7 dias)" : "Não ativada"}</div>
              <div><strong>Mercador:</strong> {REWARD_OPTIONS[rewardChoice].name}</div>
            </div>
            <p className="text-xs text-muted-foreground">Após abrir o Reino, configure a senha de acesso de cada criança em Crianças. Nenhum Auri é concedido automaticamente no cadastro.</p>
          </div>}

          <div className="flex gap-2 pt-2">
            {step > 0 && <Button type="button" variant="outline" disabled={busy} onClick={() => setStep(s => s - 1)}><ArrowLeft size={16} /> Voltar</Button>}
            {step < 4
              ? <Button type="button" variant="hero" className="flex-1" onClick={next}>Continuar <ArrowRight size={16} /></Button>
              : <Button type="button" variant="hero" className="flex-1" disabled={busy} onClick={finish}>{busy ? "Criando Reino..." : "Abrir os Portões"} <Sparkles size={16} /></Button>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
