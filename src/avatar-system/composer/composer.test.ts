import { describe, expect, it } from "vitest";
import { createGaelPreset } from "./gaelPreset";
import { alphaBoundsInRegion, bindAssetToComposition, createLayer, exportableComposition, makeTransform, parseComposition, serializeComposition, sortLayers, splitLayer, syncNormalized } from "./composer.utils";
import type { InspectedAsset } from "./composer.types";

const asset = (overrides: Partial<InspectedAsset> = {}): InspectedAsset => ({ source: "blob:test", sourceKind: "local", fileName: "test.png", width: 1024, height: 1536, trimBounds: { x: 100, y: 200, width: 800, height: 1000 }, leftTrimBounds: { x: 100, y: 200, width: 300, height: 1000 }, rightTrimBounds: { x: 600, y: 250, width: 300, height: 900 }, ...overrides });

describe("avatar composer data model", () => {
  it("normalizes canonical pixel transforms", () => {
    const layer = createLayer({ name: "x", type: "generic", source: "x", transform: makeTransform(292, 894) });
    expect(syncNormalized(layer).transform.xNormalized).toBe(0.28515625);
    expect(syncNormalized(layer).transform.yNormalized).toBe(0.58203125);
  });
  it("exports and imports an exact round trip", () => {
    const source = createGaelPreset();
    expect(parseComposition(serializeComposition(source))).toEqual(exportableComposition(source));
  });
  it("sorts layers by z-index", () => {
    const preset = createGaelPreset();
    expect(sortLayers([...preset.layers].reverse()).map(l => l.id)).toEqual(preset.layers.map(l => l.id));
  });
  it("keeps multipart equipment identity and independent transforms", () => {
    const source = createLayer({ name: "Boots", type: "boots", source: "x", equipmentId: "boots_blue", nativeWidth: 1024, nativeHeight: 1536 });
    const [left, right] = splitLayer(source);
    expect(left.equipmentId).toBe(right.equipmentId);
    expect([left.renderPartId, right.renderPartId]).toEqual(["left", "right"]);
    expect(left.transform.x).toBe(right.transform.x);
    expect(left.sourceRegion?.width).toBe(512);
    expect(right.sourceRegion?.x).toBe(512);
  });
  it("preserves locked structural layers", () => {
    const layer = createLayer({ name: "mask", type: "occlusionMask", source: "x", locked: true });
    expect(parseComposition(serializeComposition({ ...createGaelPreset(), layers: [layer] })).layers[0].locked).toBe(true);
  });
  it("does not export editor warning/UI metadata", () => {
    const preset = createGaelPreset(); preset.layers[0].warning = "editor only";
    const json = serializeComposition(preset);
    expect(json).not.toContain("editor only"); expect(json).not.toContain("guides");
  });
  it("fails gracefully on malformed JSON", () => {
    expect(() => parseComposition("{")).toThrow("JSON inválido");
    expect(() => parseComposition(JSON.stringify({ schemaVersion: 99 }))).toThrow("Versão de schema");
  });
  it("rejects duplicate layer IDs", () => {
    const preset = createGaelPreset(); preset.layers[1].id = preset.layers[0].id;
    expect(() => parseComposition(JSON.stringify(preset))).toThrow("duplicado");
  });

  it("attaches an upload to the same empty placeholder without changing semantics", () => {
    const preset=createGaelPreset(); const before=preset.layers.find(layer=>layer.id==="helmet-scene")!;
    const result=bindAssetToComposition(preset,before.id,asset({fileName:"helmet.png"}),"replace"); const after=result.layers.find(layer=>layer.id===before.id)!;
    expect(result.layers).toHaveLength(preset.layers.length); expect(result.layers.filter(layer=>layer.type==="generic")).toHaveLength(0); expect(after.id).toBe(before.id); expect(after.type).toBe("helmetScene"); expect(after.placementType).toBe("scene"); expect(after.zIndex).toBe(before.zIndex); expect(after.source).toBe("blob:test"); expect(after.missing).toBe(false);
  });

  it("preserves transforms and state when replacing an asset", () => {
    const preset=createGaelPreset(); const target=preset.layers[0]; target.source="blob:old"; target.missing=false; target.nativeWidth=1024; target.nativeHeight=1536; target.transform={...target.transform,x:123,y:456,scaleX:.7,rotation:12};
    const after=bindAssetToComposition(preset,target.id,asset({width:500,height:700}),"replace").layers[0];
    expect(after.transform).toEqual(target.transform); expect(after.locked).toBe(target.locked); expect(after.visible).toBe(target.visible); expect(after.warning).toContain("Dimensões alteradas");
  });

  it("creates one generic scene layer when there is no target", () => {
    const preset=createGaelPreset(); const result=bindAssetToComposition(preset,null,asset(),"new"); const added=result.layers.at(-1)!;
    expect(result.layers).toHaveLength(preset.layers.length+1); expect(added.type).toBe("generic"); expect(added.placementType).toBe("scene");
  });

  it("reuses the two boot placeholders with one shared source and independent transforms", () => {
    const preset=createGaelPreset(); const leftBefore=preset.layers.find(layer=>layer.id==="boots-left")!; const rightBefore=preset.layers.find(layer=>layer.id==="boots-right")!; rightBefore.transform={...rightBefore.transform,x:22};
    const result=bindAssetToComposition(preset,leftBefore.id,asset(),"bootPair"); const boots=result.layers.filter(layer=>layer.equipmentId==="boots_guardian_blue");
    expect(boots).toHaveLength(2); expect(boots.map(layer=>layer.id).sort()).toEqual(["boots-left","boots-right"]); expect(new Set(boots.map(layer=>layer.source))).toEqual(new Set(["blob:test"])); expect(new Set(boots.map(layer=>layer.equipmentId))).toEqual(new Set(["boots_guardian_blue"])); expect(boots.map(layer=>layer.renderPartId).sort()).toEqual(["left","right"]); expect(boots.find(layer=>layer.renderPartId==="right")!.transform.x).toBe(22); boots.find(layer=>layer.renderPartId==="left")!.transform.x=99; expect(boots.find(layer=>layer.renderPartId==="right")!.transform.x).toBe(22);
  });
  it("creates a new uploaded layer using the selected type",()=>{ const result=bindAssetToComposition(createGaelPreset(),null,asset(),"new","weapon"); expect(result.layers.at(-1)?.type).toBe("weapon"); expect(result.layers.at(-1)?.placementType).toBe("body"); });

  it("preserves global registration and calculates alpha bounds per half", () => {
    const pixels=new Uint8ClampedArray(8*4*4); pixels[(1*8+1)*4+3]=255; pixels[(2*8+6)*4+3]=255;
    expect(alphaBoundsInRegion(pixels,8,4,{x:0,y:0,width:4,height:4})).toEqual({x:1,y:1,width:1,height:1}); expect(alphaBoundsInRegion(pixels,8,4,{x:4,y:0,width:4,height:4})).toEqual({x:6,y:2,width:1,height:1});
  });

  it("falls back safely when the selected placeholder no longer exists", () => {
    const preset=createGaelPreset(); const result=bindAssetToComposition(preset,"missing-layer",asset(),"replace");
    expect(result.layers).toHaveLength(preset.layers.length+1); expect(result.layers.at(-1)?.type).toBe("generic");
  });
});
