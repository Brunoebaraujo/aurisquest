import { supabase } from "@/integrations/supabase/client";
import type { AvatarComposition, AvatarLayer } from "./composer.types";
import { exportableComposition } from "./composer.utils";

const key = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const categoryFor = (layer: AvatarLayer) => layer.inventoryCategory ?? (["armor", "belt", "boots", "shield"].includes(layer.type) ? "armadura" : layer.type === "weapon" || layer.type === "occlusionMask" ? "arma" : layer.type === "helmetScene" ? "elmo" : layer.type === "pet" ? "pet" : undefined);

export async function publishComposition(input: AvatarComposition): Promise<AvatarComposition> {
  const composition = exportableComposition(input);
  if (!composition.avatarId || !composition.avatarName?.trim() || !composition.presetName.trim()) throw new Error("Informe nome do set, nome do avatar e chave do avatar.");
  const equipment = composition.layers.filter(layer => layer.equipmentId);
  const unnamedKey = [...new Set(equipment.map(layer => layer.equipmentId!))].find(equipmentId => !equipment.some(layer => layer.equipmentId === equipmentId && layer.inventoryName?.trim()));
  if (unnamedKey) throw new Error(`Nomeie o item de inventário “${unnamedKey}”.`);
  if (composition.layers.some(layer => layer.missing || !layer.source)) throw new Error("Recarregue os assets ausentes antes de publicar.");

  const uploaded = new Map<string, string>();
  const layers: AvatarLayer[] = [];
  for (const layer of composition.layers) {
    let source = uploaded.get(layer.source) ?? layer.source;
    if (!uploaded.has(layer.source) && (layer.sourceKind === "local" || layer.source.startsWith("blob:"))) {
      const response = await fetch(layer.source); if (!response.ok) throw new Error(`Não foi possível ler ${layer.name}.`);
      const blob = await response.blob();
      const fileName = `${key(layer.equipmentId ?? "corpo")}/${key(layer.sourceFileName ?? layer.name)}.png`.replace(/\.png\.png$/, ".png");
      const path = `${composition.avatarId}/${fileName}`;
      const { error } = await supabase.storage.from("avatar-assets").upload(path, blob, { upsert: true, contentType: "image/png" });
      if (error) throw error;
      source = supabase.storage.from("avatar-assets").getPublicUrl(path).data.publicUrl;
      uploaded.set(layer.source, source);
    }
    layers.push({ ...layer, source, sourceKind: "project", missing: false, warning: undefined });
  }
  const itemMetadata = new Map<string, Pick<AvatarLayer, "inventoryName" | "inventoryCategory" | "inventoryRarity">>();
  for (const layer of layers) if (layer.equipmentId && layer.inventoryName?.trim()) itemMetadata.set(layer.equipmentId, layer);
  const normalizedLayers = layers.map(layer => layer.equipmentId ? { ...layer, ...itemMetadata.get(layer.equipmentId) } : layer);
  const published = { ...composition, layers: normalizedLayers };
  const avatarImage = layers.find(layer => layer.type === "avatarBase")?.source ?? layers.find(layer => !layer.equipmentId)?.source ?? layers[0]?.source;
  if (!avatarImage) throw new Error("O set precisa ter ao menos um asset.");

  const avatars = supabase.from("avatars") as any;
  const { error: avatarError } = await avatars.upsert({ name: composition.avatarName.trim(), description: `Avatar modular — ${composition.presetName}`, category: "humano", image_url: avatarImage, rarity: "comum", unlock_rule_type: "manual", unlock_threshold: 0, sort_order: 999, active: true, avatar_key: composition.avatarId }, { onConflict: "avatar_key" });
  if (avatarError) throw avatarError;

  const groups = new Map<string, AvatarLayer[]>();
  for (const layer of normalizedLayers) if (layer.equipmentId) groups.set(layer.equipmentId, [...(groups.get(layer.equipmentId) ?? []), layer]);
  const items = supabase.from("cosmetic_items") as any;
  for (const [equipmentId, members] of groups) {
    const representative = members.find(member => member.inventoryName && member.type !== "occlusionMask") ?? members.find(member => member.inventoryName) ?? members[0];
    const category = categoryFor(representative);
    if (!category || category === "avatar") continue;
    const { error } = await items.upsert({ name: representative.inventoryName!.trim(), description: `${representative.inventoryName} — ${composition.presetName}`, category, rarity: representative.inventoryRarity ?? "comum", image_url: representative.source, unlock_rule_type: "manual", unlock_threshold: 0, sort_order: 999, active: true, equipment_key: equipmentId }, { onConflict: "equipment_key" });
    if (error) throw error;
  }

  const { data: user } = await supabase.auth.getUser();
  const sets = supabase.from("avatar_render_sets" as never) as any;
  const { error: setError } = await sets.upsert({ avatar_key: composition.avatarId, name: composition.presetName, layout: published, published: true, created_by: user.user?.id, updated_at: new Date().toISOString() }, { onConflict: "avatar_key" });
  if (setError) throw setError;
  return published;
}
