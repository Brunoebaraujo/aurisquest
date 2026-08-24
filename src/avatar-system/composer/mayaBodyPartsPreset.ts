import rawMayaLayout from "../layouts/maya-guardian-v1.json";
import type { AlphaBounds, AvatarComposition, AvatarLayer } from "./composer.types";
import { makeTransform } from "./composer.utils";

const production = rawMayaLayout as AvatarComposition;
const existing = (id: string) => ({ ...production.layers.find(layer => layer.id === id)!, transform: { ...production.layers.find(layer => layer.id === id)!.transform } });

const alignmentBase: AvatarLayer = {
  id: "avatar-base", name: "Maya Base (gabarito — ocultar no resultado)", type: "avatarBase", placementType: "body", zIndex: -10, locked: false, visible: false,
  source: "/avatar-assets/maya_avatar_base_v1.png", sourceKind: "project", sourceFileName: "maya_avatar_base_v1.png", assetKey: "maya_avatar_base_v1", missing: false,
  transform: makeTransform(), nativeWidth: 1024, nativeHeight: 1536, trimBounds: { x: 245, y: 84, width: 521, height: 1304 },
};

const rightHandMask: AvatarLayer = {
  id: "right-hand-mask", name: "Mão Direita da Maya", type: "occlusionMask", placementType: "body", equipmentId: "staff_guardian_pink", zIndex: 60, locked: false, visible: false,
  source: "/avatar-assets/maya_right_hand_front_mask.png", sourceKind: "project", sourceFileName: "maya_right_hand_front_mask.png", assetKey: "maya_right_hand_front_mask", missing: false,
  transform: makeTransform(), nativeWidth: 1024, nativeHeight: 1536, trimBounds: { x: 177, y: 625, width: 130, height: 145 },
};

function bodyPart(id: string, name: string, fileName: string, trimBounds: AlphaBounds, zIndex: number): AvatarLayer {
  return {
    id, name, type: "generic", placementType: "body", zIndex, locked: false, visible: true,
    source: `/avatar-assets/${fileName}`, sourceKind: "project", sourceFileName: fileName,
    assetKey: fileName.replace(/\.png$/, ""), missing: false, transform: makeTransform(),
    nativeWidth: 1024, nativeHeight: 1536, trimBounds,
  };
}

export const createMayaBodyPartsPreset = (): AvatarComposition => ({
  schemaVersion: 1,
  avatarStandard: "auris-avatar-standard-v1",
  avatarId: "maya",
  presetId: "maya-body-parts-lab-v1",
  presetName: "Maya — Laboratório de Partes v1",
  canvas: { width: 1024, height: 1536 },
  layers: [
    { ...existing("staff"), zIndex: -20 },
    alignmentBase,
    bodyPart("torso-base", "Torso Base", "maya_torso_base_v1.png", { x: 350, y: 345, width: 325, height: 446 }, 0),
    bodyPart("right-arm-base", "Braço Direito Base", "maya_right_arm_base_v1.png", { x: 263, y: 390, width: 183, height: 396 }, 1),
    bodyPart("left-arm-base", "Braço Esquerdo Base", "maya_left_arm_base_v1.png", { x: 580, y: 392, width: 171, height: 399 }, 2),
    bodyPart("hips-base", "Quadril Base", "maya_hips_base_v1.png", { x: 377, y: 720, width: 267, height: 136 }, 3),
    bodyPart("right-leg-base", "Perna Direita Base", "maya_right_leg_base_v1.png", { x: 324, y: 760, width: 197, height: 506 }, 4),
    bodyPart("left-leg-base", "Perna Esquerda Base", "maya_left_leg_base_v1.png", { x: 505, y: 760, width: 199, height: 506 }, 5),
    bodyPart("right-shoe-base", "Calçado Direito Base", "maya_right_shoe_base_v1.png", { x: 264, y: 1215, width: 151, height: 173 }, 6),
    bodyPart("left-shoe-base", "Calçado Esquerdo Base", "maya_left_shoe_base_v1.png", { x: 613, y: 1215, width: 148, height: 173 }, 7),
    { ...existing("armor"), zIndex: 20 },
    { ...existing("head-neck-front"), zIndex: 30, locked: false },
    { ...existing("tiara"), zIndex: 40 },
    bodyPart("right-hand-base", "Mão Direita Base", "maya_right_hand_base_v1.png", { x: 245, y: 735, width: 91, height: 143 }, 50),
    bodyPart("left-hand-base", "Mão Esquerda Base", "maya_left_hand_base_v1.png", { x: 680, y: 735, width: 86, height: 143 }, 51),
    rightHandMask,
  ],
});
