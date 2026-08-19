import { AvatarComposition, AvatarLayerType, PlacementType } from "./composer.types";
import { makeTransform } from "./composer.utils";

const expected: Array<[string,string,AvatarLayerType,PlacementType,number,boolean]> = [
  ["avatar-base","Gael Base","avatarBase","body",0,true], ["boots-left","Blue Guardian Boots — Left","boots","body",10,false],
  ["boots-right","Blue Guardian Boots — Right","boots","body",11,false], ["armor","Guardian Blue Armor","armor","body",20,false],
  ["belt","Guardian Blue Belt","belt","body",30,false], ["weapon","Guardian Blue Sword","weapon","body",40,false],
  ["right-hand-mask","Right Hand Front Mask","occlusionMask","body",50,true], ["shield","Guardian Blue Shield","shield","body",60,false],
  ["pet","Guardian Fox","pet","scene",70,false], ["helmet-scene","Guardian Helmet (Scene)","helmetScene","scene",80,false],
];
const sources: Record<string,string> = { "avatar-base":"/avatar-assets/gael_avatar_base_v1.png", "boots-left":"/avatar-assets/boots_guardian_blue_avatar_v1.png", "boots-right":"/avatar-assets/boots_guardian_blue_avatar_v1.png", armor:"/avatar-assets/armor_guardian_blue_avatar_v1.png", belt:"/avatar-assets/belt_guardian_blue_avatar_v1.png", weapon:"/avatar-assets/sword_guardian_blue_avatar_v1.png", "right-hand-mask":"/avatar-assets/right_hand_front_mask.png", shield:"/avatar-assets/shield_guardian_blue_avatar_v1.png", pet:"/avatar-assets/pet_guardian_fox_scene_v1.png", "helmet-scene":"/avatar-assets/helmet_guardian_blue_inventory_v1.png" };
export const createGaelPreset = (): AvatarComposition => ({ schemaVersion: 1, avatarStandard: "auris-avatar-standard-v1", avatarId: "gael", presetId: "gael-guardian-v1", presetName: "Gael Guardian Test Set v1", canvas: { width: 1024, height: 1536 }, layers: expected.map(([id,name,type,placementType,zIndex,locked]) => ({ id,name,type,placementType,zIndex,locked,visible:true,source:sources[id],sourceKind:"project",missing:false,equipmentId:id.startsWith("boots") ? "boots_guardian_blue" : undefined,renderPartId:id.startsWith("boots") ? id.split("-")[1] : undefined,groupId:id.startsWith("boots") ? "boots_guardian_blue" : undefined,transform:makeTransform() })) });
