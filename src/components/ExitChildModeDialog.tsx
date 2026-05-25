import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { setActiveProfileDirect } from "@/hooks/useActiveProfile";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export const ExitChildModeDialog = ({ open, onOpenChange }: Props) => {
  const { profile } = useAuth();
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!profile?.email || !password) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password,
      });
      if (error) {
        toast.error("Senha incorreta");
        return;
      }
      // Limpa tokens da criança e marca perfil ativo como respondente
      localStorage.removeItem("jk_child_token");
      localStorage.removeItem("jk_child");
      localStorage.removeItem("jk_child_preview");
      localStorage.removeItem("aq_shared_mode");
      setActiveProfileDirect(null);
      onOpenChange(false);
      setPassword("");
      nav("/app/quem-entra", { replace: true });
    } catch (e) {
      toast.error("Erro ao validar senha");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Sair do modo criança</DialogTitle>
          <DialogDescription className="text-center">
            Digite a senha do responsável para voltar ao painel.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="parent-pwd">Senha do responsável</Label>
          <Input
            id="parent-pwd"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="••••••••"
          />
          <p className="text-xs text-muted-foreground">
            Conta: <span className="font-medium">{profile?.email}</span>
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={busy || !password}>
            {busy ? "Validando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExitChildModeDialog;
