import { AvatarComposition, AvatarLayerType, PlacementType } from "./composer.types";
import { makeTransform } from "./composer.utils";

const expected: Array<[string,string,AvatarLayerType,PlacementType,number,boolean]> = [
  ["avatar-base","Gael Base","avatarBase","body",0,true], ["boots-left","Blue Guardian Boots — Left","boots","body",10,false],
  ["boots-right","Blue Guardian Boots — Right","boots","body",11,false], ["armor","Guardian Blue Armor","armor","body",20,false],
  ["belt","Guardian Blue Belt","belt","body",30,false], ["weapon","Guardian Blue Sword","weapon","body",40,false],
  ["right-hand-mask","Right Hand Front Mask","occlusionMask","body",50,true], ["shield","Guardian Blue Shield","shield","body",60,false],
  ["pet","Guardian Fox","pet","scene",70,false], ["helmet-scene","Guardian Helmet (Scene)","helmetScene","scene",80,false],
];
const assetKeys: Record<string,string> = { "avatar-base":"gael_avatar_base_v1", "boots-left":"boots_guardian_blue_avatar_v1", "boots-right":"boots_guardian_blue_avatar_v1", armor:"armor_guardian_blue_avatar_v1", belt:"belt_guardian_blue_avatar_v1", weapon:"sword_guardian_blue_avatar_v1", "right-hand-mask":"right_hand_front_mask", shield:"shield_guardian_blue_avatar_v1", pet:"pet_guardian_fox_scene_v1", "helmet-scene":"helmet_guardian_blue_inventory_v1" };
export const createGaelPreset = (): AvatarComposition => ({ schemaVersion: 1, avatarStandard: "auris-avatar-standard-v1", avatarId: "gael", presetId: "gael-guardian-v1", presetName: "Gael Guardian Test Set v1", canvas: { width: 1024, height: 1536 }, layers: expected.map(([id,name,type,placementType,zIndex,locked]) => ({ id,name,type,placementType,zIndex,locked,visible:true,source:"",sourceKind:"local",sourceFileName:`${assetKeys[id]}.png`,assetKey:assetKeys[id],missing:true,warning:"No PNG assigned",equipmentId:id.startsWith("boots") ? "boots_guardian_blue" : undefined,renderPartId:id.startsWith("boots") ? id.split("-")[1] : undefined,groupId:id.startsWith("boots") ? "boots_guardian_blue" : undefined,sourceRegion:id==="boots-left"?{x:0,y:0,width:512,height:1536}:id==="boots-right"?{x:512,y:0,width:512,height:1536}:undefined,transform:makeTransform() })) });
