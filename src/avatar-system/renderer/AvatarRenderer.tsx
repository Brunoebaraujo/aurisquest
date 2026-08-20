import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { Equipment } from "@/components/cosmetics/EquippedAvatar";
import type { AvatarComposition, AvatarLayer } from "../composer/composer.types";
import rawLayout from "../layouts/gael-guardian-v1.json";
import { isGaelEquipment, isLayerEquipped } from "./equipment-resolver";

const layout = rawLayout as AvatarComposition;
const assetUrl = (source: string) => `${import.meta.env.BASE_URL}${source.replace(/^\//, "")}`;

export const canRenderModularAvatar = (equipment: Equipment) => isGaelEquipment(equipment);

export function layerStyle(layer: AvatarLayer, canvas = layout.canvas): CSSProperties {
  const bounds = layer.trimBounds ?? layer.sourceRegion ?? { x: 0, y: 0, width: layer.nativeWidth ?? canvas.width, height: layer.nativeHeight ?? canvas.height };
  const { transform } = layer;
  return {
    position: "absolute",
    left: `${((transform.x + bounds.x * transform.scaleX) / canvas.width) * 100}%`,
    top: `${((transform.y + bounds.y * transform.scaleY) / canvas.height) * 100}%`,
    width: `${(bounds.width * transform.scaleX / canvas.width) * 100}%`,
    height: `${(bounds.height * transform.scaleY / canvas.height) * 100}%`,
    transform: `rotate(${transform.rotation}deg)`,
    transformOrigin: "top left",
    opacity: transform.opacity,
    overflow: "hidden",
    pointerEvents: "none",
  };
}

function RenderLayer({ layer }: { layer: AvatarLayer }) {
  const bounds = layer.trimBounds ?? layer.sourceRegion ?? { x: 0, y: 0, width: layer.nativeWidth ?? layout.canvas.width, height: layer.nativeHeight ?? layout.canvas.height };
  const nativeWidth = layer.nativeWidth ?? layout.canvas.width, nativeHeight = layer.nativeHeight ?? layout.canvas.height;
  return <div data-avatar-layer={layer.id} style={layerStyle(layer)}><img src={assetUrl(layer.source)} alt="" draggable={false} style={{ position:"absolute", maxWidth:"none", width:`${nativeWidth / bounds.width * 100}%`, height:`${nativeHeight / bounds.height * 100}%`, left:`${-bounds.x / bounds.width * 100}%`, top:`${-bounds.y / bounds.height * 100}%` }} /></div>;
}

export function AvatarRenderer({ equipment, className, label = "Avatar de Gael" }: { equipment: Equipment; className?: string; label?: string }) {
  const layers = layout.layers.filter(layer => isLayerEquipped(layer, equipment)).sort((a,b) => a.zIndex-b.zIndex);
  return <div className={cn("relative w-full h-full flex items-center justify-center", className)} role="img" aria-label={label}><div className="relative h-full max-w-full" style={{ aspectRatio:`${layout.canvas.width} / ${layout.canvas.height}` }}>{layers.map(layer=><RenderLayer key={layer.id} layer={layer}/>)}</div></div>;
}
