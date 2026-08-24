import { AURIS_AVATAR_STANDARD_V1, normalizePoint } from "../standards/avatar-standard-v1";
import { AlphaBounds, AvatarComposition, AvatarLayer, InspectedAsset, LAYER_TYPES } from "./composer.types";

export const makeTransform = (x = 0, y = 0) => ({ x, y, ...normalizePoint(x, y), scaleX: 1, scaleY: 1, rotation: 0, opacity: 1 });
export const syncNormalized = (layer: AvatarLayer): AvatarLayer => ({ ...layer, transform: { ...layer.transform, ...normalizePoint(layer.transform.x, layer.transform.y) } });
export const sortLayers = (layers: AvatarLayer[]) => [...layers].sort((a, b) => a.zIndex - b.zIndex);
export const reindexLayers = (layers: AvatarLayer[]) => layers.map((layer, index) => ({ ...layer, zIndex: index * 10 }));
export const uid = () => globalThis.crypto?.randomUUID?.() ?? `layer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const hasLoadedAsset = (layer?: AvatarLayer | null) => !!layer?.source && !layer.missing;

export const createLayer = (partial: Partial<AvatarLayer> & Pick<AvatarLayer, "name" | "type" | "source">): AvatarLayer => ({
  id: uid(), placementType: partial.type === "pet" || partial.type === "helmetScene" ? "scene" : "body",
  transform: makeTransform(), zIndex: 0, visible: true, locked: false, sourceKind: "local", ...partial,
});

export function attachAssetToLayer(layer: AvatarLayer, asset: InspectedAsset, trimBounds = asset.trimBounds): AvatarLayer {
  const dimensionChanged = !!layer.nativeWidth && !!layer.nativeHeight && (layer.nativeWidth !== asset.width || layer.nativeHeight !== asset.height);
  return {
    ...layer,
    source: asset.source,
    sourceKind: asset.sourceKind,
    sourceFileName: asset.fileName,
    nativeWidth: asset.width,
    nativeHeight: asset.height,
    trimBounds,
    missing: false,
    warning: [asset.warning, dimensionChanged ? `Dimensões alteradas de ${layer.nativeWidth}×${layer.nativeHeight} para ${asset.width}×${asset.height}; transform preservado.` : ""].filter(Boolean).join(" ") || undefined,
  };
}

export function bindAssetToComposition(composition: AvatarComposition, selectedId: string | null, asset: InspectedAsset, mode: "replace" | "new" | "bootPair", newLayerType: AvatarLayer["type"] = "generic"): AvatarComposition {
  if (mode === "new" || !selectedId) {
    return { ...composition, layers: [...composition.layers, createLayer({ name: asset.fileName.replace(/\.png$/i, ""), type: newLayerType, placementType: newLayerType === "pet" || newLayerType === "helmetScene" || newLayerType === "generic" ? "scene" : "body", source: asset.source, sourceKind: "local", sourceFileName: asset.fileName, nativeWidth: asset.width, nativeHeight: asset.height, trimBounds: asset.trimBounds, warning: asset.warning, zIndex: composition.layers.length * 10 })] };
  }
  const target = composition.layers.find(layer => layer.id === selectedId);
  if (!target) return bindAssetToComposition(composition, null, asset, "new", newLayerType);
  if (mode === "bootPair" && target.type === "boots" && target.equipmentId) {
    const half = asset.width / 2;
    const members = composition.layers.filter(layer => layer.type === "boots" && layer.equipmentId === target.equipmentId);
    const ensurePart = (part: "left" | "right", fallbackZ: number): AvatarLayer => {
      const existing = members.find(layer => layer.renderPartId === part);
      const base = existing ?? { ...target, id: uid(), name: `${target.name.replace(/\s+—\s+(Left|Right)$/i, "")} — ${part === "left" ? "Left" : "Right"}`, renderPartId: part, zIndex: fallbackZ };
      const region = { x: part === "left" ? 0 : half, y: 0, width: half, height: asset.height };
      const trim = part === "left" ? asset.leftTrimBounds : asset.rightTrimBounds;
      return { ...attachAssetToLayer(base, asset, trim ?? region), groupId: target.groupId ?? target.equipmentId, sourceRegion: region };
    };
    const left = ensurePart("left", target.zIndex);
    const right = ensurePart("right", target.zIndex + 1);
    return { ...composition, layers: [...composition.layers.filter(layer => !(layer.type === "boots" && layer.equipmentId === target.equipmentId)), left, right] };
  }
  return { ...composition, layers: composition.layers.map(layer => layer.id === selectedId ? attachAssetToLayer(layer, asset) : layer) };
}

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
    { ...leftSource, id: uid(), name: `${leftSource.name} — Left`, groupId, renderPartId: "left", sourceRegion: { x: 0, y: 0, width: width / 2, height }, trimBounds: intersectBounds(leftSource.trimBounds, { x: 0, y: 0, width: width / 2, height }) },
    { ...leftSource, id: uid(), name: `${leftSource.name} — Right`, groupId, renderPartId: "right", sourceRegion: { x: width / 2, y: 0, width: width / 2, height }, trimBounds: intersectBounds(leftSource.trimBounds, { x: width / 2, y: 0, width: width / 2, height }), transform: { ...leftSource.transform } },
  ];
}

export function alphaBoundsInRegion(pixels: Uint8ClampedArray, width: number, height: number, region: AlphaBounds, threshold = 8): AlphaBounds | undefined {
  let minX = region.x + region.width, minY = region.y + region.height, maxX = -1, maxY = -1;
  const endX = Math.min(width, region.x + region.width), endY = Math.min(height, region.y + region.height);
  for (let y = Math.max(0, region.y); y < endY; y++) for (let x = Math.max(0, region.x); x < endX; x++) if (pixels[(y * width + x) * 4 + 3] > threshold) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  return maxX < 0 ? undefined : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function intersectBounds(bounds: AlphaBounds | undefined, region: AlphaBounds): AlphaBounds {
  if (!bounds) return region;
  const x = Math.max(bounds.x, region.x), y = Math.max(bounds.y, region.y);
  const right = Math.min(bounds.x + bounds.width, region.x + region.width), bottom = Math.min(bounds.y + bounds.height, region.y + region.height);
  return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : region;
}

export async function inspectPng(file: File): Promise<InspectedAsset> {
  if (file.type !== "image/png") throw new Error("Somente arquivos PNG são suportados.");
  const source = URL.createObjectURL(file);
  let image: HTMLImageElement;
  try { image = await new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error("PNG corrompido ou ilegível.")); img.src = source; }); }
  catch (error) { URL.revokeObjectURL(source); throw error; }
  const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Não foi possível inspecionar o PNG.");
  context.drawImage(image, 0, 0); const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const trimBounds = alphaBoundsInRegion(pixels, canvas.width, canvas.height, { x: 0, y: 0, width: canvas.width, height: canvas.height });
  if (!trimBounds) { URL.revokeObjectURL(source); throw new Error("O PNG não possui pixels visíveis."); }
  let hasPartialAlpha = false; for (let index = 3; index < pixels.length; index += 4) if (pixels[index] < 255) { hasPartialAlpha = true; break; }
  const half = canvas.width / 2;
  const warnings = [!hasPartialAlpha ? "PNG sem transparência detectável." : "", (canvas.width !== 1024 || canvas.height !== 1536) ? `Dimensão nativa ${canvas.width}×${canvas.height}; ajuste escala/posição conforme necessário.` : ""].filter(Boolean);
  return { source, sourceKind: "local", fileName: file.name, width: canvas.width, height: canvas.height, trimBounds, leftTrimBounds: alphaBoundsInRegion(pixels, canvas.width, canvas.height, { x: 0, y: 0, width: half, height: canvas.height }), rightTrimBounds: alphaBoundsInRegion(pixels, canvas.width, canvas.height, { x: half, y: 0, width: half, height: canvas.height }), warning: warnings.join(" ") || undefined };
}
