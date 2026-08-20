import { useEffect, useRef, useState } from "react";
import Konva from "konva";
import { Stage, Layer, Image as KonvaImage, Line, Circle, Rect, Text, Transformer } from "react-konva";
import { AvatarComposition, AvatarLayer } from "./composer.types";
import { AURIS_AVATAR_STANDARD_V1 as STANDARD } from "../standards/avatar-standard-v1";
import { sortLayers } from "./composer.utils";

function useImage(source: string) { const [image, setImage] = useState<HTMLImageElement | null>(null); const [failed, setFailed] = useState(false); useEffect(() => { setFailed(false); const next = new Image(); next.crossOrigin = "anonymous"; next.onload = () => setImage(next); next.onerror = () => { setImage(null); setFailed(true); }; next.src = source; return () => { next.onload = null; next.onerror = null; }; }, [source]); return { image, failed }; }

function StageImage({ layer, selected, preview, onSelect, onChange, onStart, onEnd }: { layer: AvatarLayer; selected: boolean; preview: boolean; onSelect:()=>void; onChange:(layer:AvatarLayer)=>void; onStart:()=>void; onEnd:()=>void }) {
  const { image, failed } = useImage(layer.source); const node = useRef<Konva.Image>(null); const transformer = useRef<Konva.Transformer>(null);
  useEffect(() => { if (selected && !preview && node.current && transformer.current) { transformer.current.nodes([node.current]); transformer.current.getLayer()?.batchDraw(); } }, [selected, preview, image]);
  // Asset status is edge-triggered by the image loader; depending on the mutable layer would loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (failed !== !!layer.missing) onChange({ ...layer, missing: failed }); }, [failed]);
  if (!image || !layer.visible) return null;
  const bounds = layer.crop ?? layer.trimBounds ?? { x: 0, y: 0, width: layer.nativeWidth ?? image.naturalWidth, height: layer.nativeHeight ?? image.naturalHeight };
  const x = layer.transform.x + bounds.x * layer.transform.scaleX; const y = layer.transform.y + bounds.y * layer.transform.scaleY;
  const update = () => { const n = node.current!; onChange({ ...layer, transform: { ...layer.transform, x: n.x() - bounds.x * n.scaleX(), y: n.y() - bounds.y * n.scaleY(), scaleX: n.scaleX(), scaleY: n.scaleY(), rotation: n.rotation() } }); };
  return <>{<KonvaImage ref={node} image={image} crop={bounds} width={bounds.width} height={bounds.height} x={x} y={y} scaleX={layer.transform.scaleX} scaleY={layer.transform.scaleY} rotation={layer.transform.rotation} opacity={layer.transform.opacity} draggable={!layer.locked && !preview} onClick={onSelect} onTap={onSelect} onDragStart={onStart} onDragMove={update} onDragEnd={() => { update(); onEnd(); }} onTransformStart={onStart} onTransform={update} onTransformEnd={() => { update(); onEnd(); }} />}{selected && !preview && !layer.locked && <Transformer ref={transformer} rotateEnabled flipEnabled={false} borderStroke="#38bdf8" anchorStroke="#38bdf8" anchorFill="#082f49" />}</>;
}

export interface AvatarStageHandle { exportPng: () => string }
export function AvatarStage({ composition, selectedId, scale, background, guides, preview, onSelect, onLayerChange, onStart, onEnd, stageRef }: { composition: AvatarComposition; selectedId:string|null; scale:number; background:"checker"|"dark"|"light"; guides:boolean; preview:boolean; onSelect:(id:string)=>void; onLayerChange:(layer:AvatarLayer)=>void; onStart:()=>void; onEnd:()=>void; stageRef: React.MutableRefObject<Konva.Stage|null> }) {
  const width = STANDARD.width * scale, height = STANDARD.height * scale; const g = STANDARD.guides;
  return <div className={background === "checker" ? "bg-[linear-gradient(45deg,#334155_25%,transparent_25%),linear-gradient(-45deg,#334155_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#334155_75%),linear-gradient(-45deg,transparent_75%,#334155_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0] bg-slate-600" : background === "dark" ? "bg-slate-950" : "bg-white"} style={{ width, height }}>
    <Stage ref={stageRef} width={width} height={height} scaleX={scale} scaleY={scale} onMouseDown={e => { if (e.target === e.target.getStage()) onSelect(""); }}>
      <Layer>{sortLayers(composition.layers).map(layer => <StageImage key={layer.id} layer={layer} selected={layer.id===selectedId} preview={preview} onSelect={()=>onSelect(layer.id)} onChange={onLayerChange} onStart={onStart} onEnd={onEnd} />)}</Layer>
      {guides && !preview && <Layer name="editor-guide" listening={false} opacity={.8}>
        <Line points={[512,0,512,1536]} stroke="#22d3ee" dash={[12,8]} strokeWidth={2/scale}/><Line points={[0,g.groundLine.y,1024,g.groundLine.y]} stroke="#fbbf24" dash={[12,8]} strokeWidth={2/scale}/>
        {[[g.rightHandGrip.x,g.rightHandGrip.y,"RIGHT_HAND_GRIP"],[g.leftForearmAnchor.x,g.leftForearmAnchor.y,"LEFT_FOREARM"],[g.waistAnchor.x,g.waistAnchor.y,"WAIST"]].map(([x,y,label]) => <GroupGuide key={String(label)} x={Number(x)} y={Number(y)} label={String(label)} />)}
        <Rect {...g.chestZone} stroke="#a78bfa" dash={[10,6]} /><Text x={g.chestZone.x} y={g.chestZone.y-22} text="CHEST_ZONE" fill="#a78bfa" fontSize={16}/><Rect {...g.feetZone} stroke="#34d399" dash={[10,6]} /><Text x={g.feetZone.x} y={g.feetZone.y-22} text="FEET_ZONE" fill="#34d399" fontSize={16}/>
      </Layer>}
    </Stage>
  </div>;
}
function GroupGuide({x,y,label}:{x:number;y:number;label:string}) { return <><Circle x={x} y={y} radius={8} stroke="#fb7185"/><Line points={[x-14,y,x+14,y]} stroke="#fb7185"/><Line points={[x,y-14,x,y+14]} stroke="#fb7185"/><Text x={x+12} y={y-18} text={label} fill="#fb7185" fontSize={14}/></>; }
