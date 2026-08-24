import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { Equipment } from "@/components/cosmetics/EquippedAvatar";
import type { AvatarComposition, AvatarLayer } from "../composer/composer.types";
import { gaelGuardianLayout, getAvatarLayout } from "../registry/avatar-layout-registry";
import {
  isLayerVisibleOnSurface,
  type AvatarRenderSurface,
  type WardrobeSlot,
  wardrobeSlotForLayer,
} from "./equipment-resolver";

const assetUrl = (source: string) => `${import.meta.env.BASE_URL}${source.replace(/^\//, "")}`;

export const canRenderModularAvatar = (equipment: Equipment) => getAvatarLayout(equipment) !== null;

export function layerStyle(layer: AvatarLayer, canvas = gaelGuardianLayout.canvas): CSSProperties {
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

function RenderLayer({ layer, layout, onSelect }: { layer: AvatarLayer; layout: AvatarComposition; onSelect?: (slot: WardrobeSlot) => void }) {
  const bounds = layer.trimBounds ?? layer.sourceRegion ?? { x: 0, y: 0, width: layer.nativeWidth ?? layout.canvas.width, height: layer.nativeHeight ?? layout.canvas.height };
  const nativeWidth = layer.nativeWidth ?? layout.canvas.width;
  const nativeHeight = layer.nativeHeight ?? layout.canvas.height;
  const slot = wardrobeSlotForLayer(layer);
  const clickable = Boolean(slot && onSelect && layer.type !== "avatarBase");
  const content = <img src={assetUrl(layer.source)} alt="" draggable={false} style={{ position:"absolute", maxWidth:"none", width:`${nativeWidth / bounds.width * 100}%`, height:`${nativeHeight / bounds.height * 100}%`, left:`${-bounds.x / bounds.width * 100}%`, top:`${-bounds.y / bounds.height * 100}%` }} />;

  if (clickable && slot) {
    return (
      <button
        type="button"
        data-avatar-layer={layer.id}
        data-wardrobe-slot={slot}
        aria-label={`Abrir ${slot}`}
        onClick={() => onSelect?.(slot)}
        className="appearance-none border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        style={{ ...layerStyle(layer, layout.canvas), pointerEvents: "auto", cursor: "pointer" }}
      >
        {content}
      </button>
    );
  }

  return <div data-avatar-layer={layer.id} style={layerStyle(layer, layout.canvas)}>{content}</div>;
}

export function AvatarRenderer({
  equipment,
  className,
  label = "Avatar",
  surface = "portrait",
  onLayerSelect,
}: {
  equipment: Equipment;
  className?: string;
  label?: string;
  surface?: AvatarRenderSurface;
  onLayerSelect?: (slot: WardrobeSlot) => void;
}) {
  const layout = getAvatarLayout(equipment);
  if (!layout) return null;

  const layers = layout.layers
    .filter(layer => isLayerVisibleOnSurface(layer, equipment, surface))
    .sort((a,b) => a.zIndex-b.zIndex);

  return (
    <div className={cn("relative flex h-full w-full items-center justify-center", className)} role="img" aria-label={label} data-avatar-surface={surface}>
      <div className="relative h-full max-w-full" style={{ aspectRatio:`${layout.canvas.width} / ${layout.canvas.height}` }}>
        {layers.map(layer => <RenderLayer key={layer.id} layer={layer} layout={layout} onSelect={onLayerSelect} />)}
      </div>
    </div>
  );
}
