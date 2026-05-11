import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ICON_LIBRARY } from "@/lib/iconLibrary";
import { ActivityIcon } from "./ActivityIcon";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  familyId: string;
  iconKey?: string | null;
  iconUrl?: string | null;
  onChange: (val: { icon_key: string | null; icon_url: string | null }) => void;
};

export const ActivityIconPicker = ({ familyId, iconKey, iconUrl, onChange }: Props) => {
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ICON_LIBRARY;
    return ICON_LIBRARY.filter(i => i.label.toLowerCase().includes(q) || i.key.includes(q));
  }, [search]);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Use uma imagem"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Máx 2MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${familyId}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("activity-icons").upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const url = supabase.storage.from("activity-icons").getPublicUrl(path).data.publicUrl;
      onChange({ icon_key: null, icon_url: url });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar");
    } finally {
      setUploading(false);
    }
  };

  const tab = iconUrl ? "custom" : "library";

  return (
    <div className="space-y-2">
      <Label>Ícone da atividade</Label>
      <div className="flex items-center gap-3 mb-2">
        <ActivityIcon iconKey={iconKey} iconUrl={iconUrl} size={48} framed />
        {(iconKey || iconUrl) && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ icon_key: null, icon_url: null })}>
            <X className="w-3 h-3" /> Remover
          </Button>
        )}
      </div>
      <Tabs defaultValue={tab} className="w-full">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="library">Biblioteca</TabsTrigger>
          <TabsTrigger value="custom">Personalizado</TabsTrigger>
        </TabsList>
        <TabsContent value="library" className="space-y-2 mt-3">
          <Input
            placeholder="Buscar ícone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto p-1">
            {filtered.map(i => (
              <button
                key={i.key}
                type="button"
                title={i.label}
                onClick={() => onChange({ icon_key: i.key, icon_url: null })}
                className={cn(
                  "rounded-xl border-2 p-2 flex items-center justify-center bg-card transition-bounce hover:border-primary",
                  iconKey === i.key && !iconUrl ? "border-primary shadow-soft scale-105" : "border-border",
                )}
              >
                <img src={i.src} alt={i.label} width={48} height={48} loading="lazy" className="object-contain" />
              </button>
            ))}
            {filtered.length === 0 && <p className="text-xs text-muted-foreground col-span-full text-center py-4">Nenhum ícone encontrado</p>}
          </div>
        </TabsContent>
        <TabsContent value="custom" className="space-y-2 mt-3">
          <Label className="flex items-center gap-2 text-sm"><Upload className="w-4 h-4" /> Enviar imagem (PNG/JPG, máx 2MB)</Label>
          <Input type="file" accept="image/*" disabled={uploading}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
          <p className="text-[11px] text-muted-foreground">Ideal: imagem quadrada, fundo transparente.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ActivityIconPicker;
