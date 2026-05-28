import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dice5, Sparkles, Feather } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SIDE_QUEST_CATEGORIES, ALL_CATEGORIES, pickRandomCategory, pickRandomReward, type SideQuestCategory } from "@/lib/sideQuests";
import { AuriIcon } from "@/components/AuriIcon";
import { getTodayQuestDate } from "@/lib/sideQuestDailyLimit";

type ChildOpt = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: ChildOpt[];
  blockedChildIds?: Set<string>;
  defaultChildId?: string | null;
  onCreated?: () => void;
};

export const CreateSideQuestDialog = ({ open, onOpenChange, children, blockedChildIds = new Set(), defaultChildId, onCreated }: Props) => {
  const { user, profile } = useAuth();
  const [childId, setChildId] = useState<string>(defaultChildId ?? children.find(c => !blockedChildIds.has(c.id))?.id ?? "");
  const [category, setCategory] = useState<SideQuestCategory>(() => pickRandomCategory());
  const [missionKey, setMissionKey] = useState<string>("");
  const [reward, setReward] = useState<number>(() => pickRandomReward());
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setChildId(defaultChildId ?? children.find(c => !blockedChildIds.has(c.id))?.id ?? "");
      const c = pickRandomCategory();
      setCategory(c);
      setMissionKey("");
      setReward(pickRandomReward());
      setComment("");
    }
  }, [open, defaultChildId, children, blockedChildIds]);

  const cat = SIDE_QUEST_CATEGORIES[category];
  const selectedMission = useMemo(() => cat.missions.find(m => m.key === missionKey), [cat, missionKey]);
  const selectedChild = children.find(c => c.id === childId);
  const selectedChildBlocked = !!childId && blockedChildIds.has(childId);

  const reroll = () => {
    const others = ALL_CATEGORIES.filter(c => c !== category);
    setCategory(others[Math.floor(Math.random() * others.length)]);
    setMissionKey("");
  };

  const submit = async () => {
    if (!user || !profile?.family_id) { toast.error("Sessão inválida."); return; }
    if (!childId) { toast.error("Escolha uma criança."); return; }
    if (selectedChildBlocked) { toast.error(`${selectedChild?.name ?? "Essa criança"} já tem uma SideQuest hoje.`); return; }
    if (!selectedMission) { toast.error("Escolha uma missão."); return; }
    setBusy(true);
    try {
      const todayQuestDate = getTodayQuestDate();
      const sideQuestsQuery = supabase.from("side_quests") as any;
      const { data: existingToday, error: checkError } = await sideQuestsQuery
        .select("id")
        .eq("family_id", profile.family_id)
        .eq("child_id", childId)
        .eq("quest_date", todayQuestDate)
        .limit(1);
      if (checkError) { toast.error(checkError.message); return; }
      if ((existingToday?.length ?? 0) > 0) {
        toast.error(`${selectedChild?.name ?? "Essa criança"} já tem uma SideQuest hoje.`);
        return;
      }

      const { error } = await sideQuestsQuery.insert({
        family_id: profile.family_id,
        child_id: childId,
        created_by: user.id,
        quest_date: todayQuestDate,
        category,
        mission_key: selectedMission.key,
        title: selectedMission.title,
        reward_auris: reward,
        parent_comment: comment.trim() || null,
      });
      if (error) {
        if (error.code === "23505") {
          toast.error(`${selectedChild?.name ?? "Essa criança"} já tem uma SideQuest hoje.`);
        } else {
          toast.error(error.message);
        }
        return;
      }
      toast.success("SideQuest criada! ✨");
      onOpenChange(false);
      onCreated?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Feather className="w-5 h-5 text-amber-500" /> Criar SideQuest do Dia
          </DialogTitle>
          <DialogDescription>
            Escolha uma missão especial e inspire a criança com até 3 Auris.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {children.length > 1 && (
            <div>
              <Label className="text-xs">Para qual criança?</Label>
              <Select value={childId} onValueChange={setChildId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {children.map(c => (
                    <SelectItem key={c.id} value={c.id} disabled={blockedChildIds.has(c.id)}>
                      {c.name}{blockedChildIds.has(c.id) ? " (already has today's SideQuest)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedChildBlocked && (
                <p className="mt-1 text-xs text-muted-foreground">{selectedChild?.name ?? "Essa criança"} já recebeu a SideQuest de hoje.</p>
              )}
            </div>
          )}

          {/* Categoria sorteada */}
          <div className={`rounded-2xl bg-gradient-to-br ${cat.gradient} ring-2 ${cat.ring} p-4 flex items-center gap-4`}>
            <div className="text-5xl">{cat.emoji}</div>
            <div className="flex-1">
              <div className="text-[11px] uppercase font-bold tracking-wide text-amber-800">Categoria do dia</div>
              <div className="font-display font-bold text-xl">{cat.label}</div>
            </div>
            <Button variant="outline" size="sm" onClick={reroll} className="rounded-full">
              <Dice5 className="w-4 h-4 mr-1" /> Sortear
            </Button>
          </div>

          {/* Missões sugeridas */}
          <div className="space-y-2">
            <Label className="text-xs">Escolha uma missão</Label>
            <div className="grid gap-2">
              {cat.missions.map(m => {
                const selected = m.key === missionKey;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMissionKey(m.key)}
                    className={`text-left p-3 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                      selected ? `${cat.ring} ring-2 border-transparent bg-gradient-to-r ${cat.gradient}` : "border-border hover:border-primary/40 bg-card"
                    }`}
                  >
                    <div className="text-2xl">{m.emoji}</div>
                    <div className="font-medium flex-1">{m.title}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recompensa */}
          <div className="flex items-center justify-between rounded-2xl bg-gradient-reward text-accent-foreground px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span className="font-display font-bold">Recompensa</span>
            </div>
            <div className="font-display font-bold text-lg inline-flex items-center gap-1">
              +<AuriIcon size={16} /> {reward} Auris
            </div>
          </div>

          {/* Comentário opcional */}
          <div>
            <Label className="text-xs">Recado para a criança (opcional)</Label>
            <Textarea
              maxLength={80}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Deixe um recado para a criança... (opcional)"
              className="resize-none"
              rows={2}
            />
            <div className="text-[10px] text-right text-muted-foreground">{comment.length}/80</div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={submit} disabled={busy || !missionKey || !childId || selectedChildBlocked} className="bg-gradient-primary">
            Confirmar missão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSideQuestDialog;
