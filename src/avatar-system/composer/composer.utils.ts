import { AURIS_AVATAR_STANDARD_V1, normalizePoint } from "../standards/avatar-standard-v1";
import { AvatarComposition, AvatarLayer, LAYER_TYPES } from "./composer.types";

export const makeTransform = (x = 0, y = 0) => ({ x, y, ...normalizePoint(x, y), scaleX: 1, scaleY: 1, rotation: 0, opacity: 1 });
export const syncNormalized = (layer: AvatarLayer): AvatarLayer => ({ ...layer, transform: { ...layer.transform, ...normalizePoint(layer.transform.x, layer.transform.y) } });
export const sortLayers = (layers: AvatarLayer[]) => [...layers].sort((a, b) => a.zIndex - b.zIndex);
export const reindexLayers = (layers: AvatarLayer[]) => layers.map((layer, index) => ({ ...layer, zIndex: index * 10 }));
export const uid = () => globalThis.crypto?.randomUUID?.() ?? `layer-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const createLayer = (partial: Partial<AvatarLayer> & Pick<AvatarLayer, "name" | "type" | "source">): AvatarLayer => ({
  id: uid(), placementType: partial.type === "pet" || partial.type === "helmetScene" ? "scene" : "body",
  transform: makeTransform(), zIndex: 0, visible: true, locked: false, sourceKind: "local", ...partial,
});

export const exportableComposition = (composition: AvatarComposition): AvatarComposition => ({
  ...composition,
  canvas: { width: 1024, height: 1536 },
  layers: sortLayers(composition.layers).map(({ warning: _warning, ...layer }) => syncNormalized(layer)),
});
export const serializeComposition = (composition: AvatarComposition) => JSON.stringify(exportableComposition(composition), null, 2);

export function parseComposition(input: string): AvatarComposition {
  let value: unknown;
  try { value = JSON.parse(input); } catch { throw new Error("JSON inválido."); }
  const data = value as AvatarComposition;
  if (!data || data.schemaVersion !== 1) throw new Error("Versão de schema não suportada.");
  if (data.avatarStandard !== AURIS_AVATAR_STANDARD_V1.id || data.canvas?.width !== 1024 || data.canvas?.height !== 1536) throw new Error("Canvas/standard incompatível.");
  if (!Array.isArray(data.layers)) throw new Error("A lista de layers é obrigatória.");
  const ids = new Set<string>();
  for (const layer of data.layers) {
    if (!layer?.id || ids.has(layer.id)) throw new Error(`Layer ID ausente ou duplicado: ${layer?.id ?? "?"}`);
    ids.add(layer.id);
    if (!LAYER_TYPES.includes(layer.type)) throw new Error(`Tipo de layer inválido: ${layer.type}`);
    if (!layer.transform || !Number.isFinite(layer.transform.x) || !Number.isFinite(layer.transform.y)) throw new Error(`Transform inválido em ${layer.id}.`);
  }
  return exportableComposition(data);
}

export function splitLayer(leftSource: AvatarLayer): AvatarLayer[] {
  const width = leftSource.nativeWidth ?? 1024;
  const height = leftSource.nativeHeight ?? 1536;
  const groupId = leftSource.equipmentId ?? leftSource.groupId ?? `group-${leftSource.id}`;
  return [
    { ...leftSource, id: uid(), name: `${leftSource.name} — Left`, groupId, renderPartId: "left", crop: { x: 0, y: 0, width: width / 2, height } },
    { ...leftSource, id: uid(), name: `${leftSource.name} — Right`, groupId, renderPartId: "right", crop: { x: width / 2, y: 0, width: width / 2, height }, transform: { ...leftSource.transform, x: leftSource.transform.x + width / 2, ...normalizePoint(leftSource.transform.x + width / 2, leftSource.transform.y) } },
  ];
}

export async function inspectPng(file: File): Promise<{ source: string; width: number; height: number; trimBounds: { x: number; y: number; width: number; height: number }; warning?: string }> {
  if (file.type !== "image/png") throw new Error("Somente arquivos PNG são suportados.");
  const source = URL.createObjectURL(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error("PNG corrompido ou ilegível.")); img.src = source; });
  const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Não foi possível inspecionar o PNG.");
  context.drawImage(image, 0, 0); const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1, hasPartialAlpha = false;
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) { const alpha = pixels[(y * canvas.width + x) * 4 + 3]; if (alpha > 8) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); } if (alpha < 255) hasPartialAlpha = true; }
  if (maxX < 0) throw new Error("O PNG não possui pixels visíveis.");
  const warnings = [!hasPartialAlpha ? "PNG sem transparência detectável." : "", (canvas.width !== 1024 || canvas.height !== 1536) ? `Dimensão nativa ${canvas.width}×${canvas.height}; ajuste escala/posição conforme necessário.` : ""].filter(Boolean);
  return { source, width: canvas.width, height: canvas.height, trimBounds: { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }, warning: warnings.join(" ") || undefined };
}
