export const LAYER_TYPES = ["avatarBase", "armor", "belt", "boots", "weapon", "shield", "helmetScene", "pet", "occlusionMask", "generic"] as const;
export type AvatarLayerType = (typeof LAYER_TYPES)[number];
export type PlacementType = "body" | "scene";

export interface AlphaBounds { x: number; y: number; width: number; height: number }
export interface LayerTransform {
  x: number; y: number; xNormalized: number; yNormalized: number;
  scaleX: number; scaleY: number; rotation: number; opacity: number;
}
export interface AvatarLayer {
  id: string; name: string; type: AvatarLayerType; placementType: PlacementType;
  equipmentId?: string; renderPartId?: string; groupId?: string; assetKey?: string;
  source: string; sourceKind?: "project" | "local"; sourceFileName?: string; nativeWidth?: number; nativeHeight?: number;
  trimBounds?: AlphaBounds; transform: LayerTransform; zIndex: number; visible: boolean;
  locked: boolean; missing?: boolean; warning?: string; anchorAssociation?: string;
  inventoryName?: string; inventoryCategory?: "avatar" | "elmo" | "armadura" | "arma" | "pet"; inventoryRarity?: "comum" | "raro" | "epico" | "lendario";
  crop?: AlphaBounds; sourceRegion?: AlphaBounds;
}

export interface InspectedAsset {
  source: string; sourceKind: "local"; fileName: string; width: number; height: number;
  trimBounds: AlphaBounds; leftTrimBounds?: AlphaBounds; rightTrimBounds?: AlphaBounds; warning?: string;
}
export interface AvatarComposition {
  schemaVersion: 1; avatarStandard: "auris-avatar-standard-v1"; avatarId: string;
  avatarName?: string; presetId: string; presetName: string; canvas: { width: 1024; height: 1536 };
  layers: AvatarLayer[];
}
export interface StoredPreset { id: string; name: string; composition: AvatarComposition; updatedAt: string }
