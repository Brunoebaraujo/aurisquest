import { useCallback, useEffect, useRef, useState } from "react";
import { AvatarComposition, AvatarLayer, StoredPreset } from "./composer.types";
import { createGaelPreset } from "./gaelPreset";
import rawMayaLayout from "../layouts/maya-guardian-v1.json";
import { createMayaBodyPartsPreset } from "./mayaBodyPartsPreset";
import { parseComposition, reindexLayers, syncNormalized } from "./composer.utils";

const PRESET_KEY = "auris-avatar-composer-presets-v1";

export const createBlankPreset = (avatarId: string, presetName: string): AvatarComposition => ({
  schemaVersion: 1,
  avatarStandard: "auris-avatar-standard-v1",
  avatarId,
  presetId: `${avatarId}-${Date.now()}`,
  presetName,
  canvas: { width: 1024, height: 1536 },
  layers: [],
});

export function useComposerState() {
  const [composition, setCompositionRaw] = useState<AvatarComposition>(() => createGaelPreset());
  const [selectedId, setSelectedId] = useState<string | null>("avatar-base");
  const [past, setPast] = useState<AvatarComposition[]>([]);
  const [future, setFuture] = useState<AvatarComposition[]>([]);
  const transactionStart = useRef<AvatarComposition | null>(null);

  const commit = useCallback((next: AvatarComposition | ((value: AvatarComposition) => AvatarComposition)) => {
    setCompositionRaw(current => { const resolved = typeof next === "function" ? next(current) : next; setPast(history => [...history.slice(-49), current]); setFuture([]); return resolved; });
  }, []);
  const replaceTransient = useCallback((next: AvatarComposition | ((value: AvatarComposition) => AvatarComposition)) => setCompositionRaw(next), []);
  const beginTransaction = () => { transactionStart.current = composition; };
  const endTransaction = () => { if (transactionStart.current) { setPast(h => [...h.slice(-49), transactionStart.current!]); setFuture([]); transactionStart.current = null; } };
  const undo = useCallback(() => setPast(history => { if (!history.length) return history; const previous = history[history.length - 1]; setFuture(f => [composition, ...f]); setCompositionRaw(previous); return history.slice(0, -1); }), [composition]);
  const redo = useCallback(() => setFuture(history => { if (!history.length) return history; const next = history[0]; setPast(p => [...p, composition]); setCompositionRaw(next); return history.slice(1); }), [composition]);
  const updateLayer = useCallback((id: string, patch: Partial<AvatarLayer> | ((layer: AvatarLayer) => AvatarLayer), transient = false) => {
    const apply = (current: AvatarComposition) => ({ ...current, layers: current.layers.map(layer => layer.id === id ? syncNormalized(typeof patch === "function" ? patch(layer) : { ...layer, ...patch }) : layer) });
    (transient ? replaceTransient : commit)(apply);
  }, [commit, replaceTransient]);
  const addLayers = (layers: AvatarLayer[]) => { commit(current => ({ ...current, layers: reindexLayers([...current.layers, ...layers]) })); setSelectedId(layers.at(-1)?.id ?? null); };
  const removeLayer = (id: string) => { commit(c => ({ ...c, layers: c.layers.filter(l => l.id !== id) })); setSelectedId(null); };
  const reorder = (id: string, destination: number) => commit(c => { const ordered = [...c.layers].sort((a,b) => a.zIndex-b.zIndex); const from = ordered.findIndex(l => l.id === id); if (from < 0) return c; const [item] = ordered.splice(from, 1); ordered.splice(Math.max(0, Math.min(destination, ordered.length)), 0, item); return { ...c, layers: reindexLayers(ordered) }; });
  const loadComposition = (value: AvatarComposition) => { commit(parseComposition(JSON.stringify(value))); setSelectedId(value.layers[0]?.id ?? null); };
  const createComposition = (avatarId: string, presetName: string) => { const next = createBlankPreset(avatarId, presetName); commit(next); setSelectedId(null); };

  const presets = (): StoredPreset[] => {
    const builtIns: StoredPreset[] = [
      { id: "gael-guardian-v1", name: "Gael Guardian v1", composition: createGaelPreset(), updatedAt: "built-in" },
      { id: "maya-guardian-v1", name: "Maya Guardian v1", composition: rawMayaLayout as AvatarComposition, updatedAt: "built-in" },
      { id: "maya-body-parts-lab-v1", name: "Maya — Partes do Corpo", composition: createMayaBodyPartsPreset(), updatedAt: "built-in" },
    ];
    try { const local = JSON.parse(localStorage.getItem(PRESET_KEY) ?? "[]") as StoredPreset[]; return [...builtIns, ...local.filter(item => !builtIns.some(builtIn => builtIn.id === item.id))]; } catch { return builtIns; }
  };
  const savePreset = (name: string) => { const all = presets(); const id = composition.presetId || `preset-${Date.now()}`; const record = { id, name, composition: { ...composition, presetId: id, presetName: name }, updatedAt: new Date().toISOString() }; localStorage.setItem(PRESET_KEY, JSON.stringify([...all.filter(p => p.id !== id), record])); setCompositionRaw(record.composition); return record; };
  const deletePreset = (id: string) => localStorage.setItem(PRESET_KEY, JSON.stringify(presets().filter(p => p.id !== id)));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { const target = event.target as HTMLElement; if (/INPUT|TEXTAREA|SELECT/.test(target.tagName) || target.isContentEditable) return; if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); return; } const delta: Record<string,[number,number]> = { ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1] }; if (selectedId && delta[event.key]) { event.preventDefault(); const multiplier = event.shiftKey ? 10 : event.altKey ? .1 : 1; updateLayer(selectedId, layer => layer.locked ? layer : ({ ...layer, transform: { ...layer.transform, x: layer.transform.x + delta[event.key][0] * multiplier, y: layer.transform.y + delta[event.key][1] * multiplier } })); } };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, redo, undo, updateLayer]);

  return { composition, selectedId, setSelectedId, commit, updateLayer, addLayers, removeLayer, reorder, loadComposition, createComposition, undo, redo, canUndo: !!past.length, canRedo: !!future.length, beginTransaction, endTransaction, presets, savePreset, deletePreset };
}
