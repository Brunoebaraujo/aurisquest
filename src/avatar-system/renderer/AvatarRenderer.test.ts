import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { render } from "@testing-library/react";
import type { AvatarLayer } from "../composer/composer.types";
import { createGaelPreset } from "../composer/gaelPreset";
import { inferEquipmentId, isLayerEquipped } from "./equipment-resolver";
import { layerStyle } from "./AvatarRenderer";
import { AvatarRenderer } from "./AvatarRenderer";
import { EquippedAvatar } from "@/components/cosmetics/EquippedAvatar";

const equipment = { avatar:{image_url:"gael.png",name:"Gael",rarity:"comum" as const,equipmentId:"gael"}, armor:{image_url:"armor.png",name:"Guardian Blue Armor",rarity:"comum" as const,equipmentId:"armor_guardian_blue"}, weapon:{image_url:"sword.png",name:"Guardian Blue Sword",rarity:"comum" as const,equipmentId:"sword_guardian_blue"}, helmet:null, pet:null };

describe("AvatarRenderer production mapping",()=>{
  it("maps real catalog identities to composer equipment IDs",()=>{ expect(inferEquipmentId("avatar","Gael","/gael.png")).toBe("gael"); expect(inferEquipmentId("armor","Armadura Guardião Azul","/armor.png")).toBe("armor_guardian_blue"); expect(inferEquipmentId("weapon","Espada Guardian","/sword.png")).toBe("sword_guardian_blue"); });
  it("activates set render parts from equipped items",()=>{ const layers=createGaelPreset().layers.map(layer=>({...layer,visible:true})); expect(isLayerEquipped(layers.find(l=>l.type==="avatarBase")!,equipment)).toBe(true); expect(isLayerEquipped(layers.find(l=>l.type==="boots")!,equipment)).toBe(true); expect(isLayerEquipped(layers.find(l=>l.type==="pet")!,equipment)).toBe(false); });
  it("converts logical transforms to responsive percentages",()=>{ const layer={...createGaelPreset().layers[0],trimBounds:{x:100,y:200,width:400,height:600},transform:{x:20,y:30,xNormalized:0,yNormalized:0,scaleX:.5,scaleY:.5,rotation:15,opacity:.8}} as AvatarLayer; const style=layerStyle(layer); expect(style.left).toBe(`${70/1024*100}%`); expect(style.top).toBe(`${130/1536*100}%`); expect(style.width).toBe(`${200/1024*100}%`); expect(style.transform).toBe("rotate(15deg)"); });
  it("renders the same composition at compact and profile sizes",()=>{ const view=render(createElement("div",{style:{width:76,height:76}},createElement(AvatarRenderer,{equipment}))); const compactLayers=view.container.querySelectorAll("[data-avatar-layer]"); expect(compactLayers.length).toBeGreaterThan(1); const compactLeft=(compactLayers[0] as HTMLElement).style.left; view.rerender(createElement("div",{style:{width:260,height:300}},createElement(AvatarRenderer,{equipment}))); expect(view.container.querySelectorAll("[data-avatar-layer]")).toHaveLength(compactLayers.length); expect((view.container.querySelector("[data-avatar-layer]") as HTMLElement).style.left).toBe(compactLeft); });
  it("gives modular profile avatars a 2:3 portrait viewport",()=>{ const view=render(createElement(EquippedAvatar,{equipment,size:210,variant:"portrait"})); const viewport=view.container.querySelector("[data-avatar-variant='portrait']") as HTMLElement; expect(viewport.style.width).toBe("210px"); expect(viewport.style.height).toBe("315px"); expect(viewport.querySelector("[data-avatar-layer]")).not.toBeNull(); });
});
