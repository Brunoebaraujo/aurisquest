import { describe, expect, it } from "vitest";
import { createGaelPreset } from "./gaelPreset";
import { createLayer, exportableComposition, makeTransform, parseComposition, serializeComposition, sortLayers, splitLayer, syncNormalized } from "./composer.utils";

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
    expect(left.transform.x).not.toBe(right.transform.x);
    expect(left.crop?.width).toBe(512);
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
});
