import { ArrowLeft, CircleHelp, Shield, Sparkles } from "lucide-react";
import sceneBackground from "@/assets/auth-bg.jpg";
import { AvatarRenderer, canRenderModularAvatar } from "@/avatar-system/renderer/AvatarRenderer";
import type { WardrobeSlot } from "@/avatar-system/renderer/equipment-resolver";
import type { Equipment } from "@/components/cosmetics/EquippedAvatar";
import { CharacterBottomNavigation, type CharacterNavigationTarget } from "./CharacterBottomNavigation";

export function CharacterEquipmentScreen({
  childName,
  equipment,
  onBack,
  onHelp,
  onSelectSlot,
  onNavigate,
}: {
  childName: string;
  equipment: Equipment;
  onBack: () => void;
  onHelp: () => void;
  onSelectSlot: (slot: WardrobeSlot) => void;
  onNavigate: (target: CharacterNavigationTarget) => void;
}) {
  const modular = canRenderModularAvatar(equipment);

  return (
    <main className="min-h-[100dvh] bg-[#01070d] text-amber-50">
      <section className="relative mx-auto flex h-[100dvh] min-h-[620px] max-w-[480px] flex-col overflow-hidden border-x border-cyan-950/80 bg-[#041421] shadow-2xl">
        <img src={sceneBackground} alt="" className="absolute inset-0 h-full w-full object-cover object-center opacity-50" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,11,19,0.72)_0%,rgba(3,20,33,0.26)_32%,rgba(1,11,19,0.80)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(14,116,144,0.18),transparent_42%)]" />

        <header className="relative z-30 grid h-[70px] shrink-0 grid-cols-[52px_1fr_52px] items-center border-b border-amber-500/40 bg-[#031421]/90 px-2 backdrop-blur-md">
          <button type="button" onClick={onBack} aria-label="Voltar para a jornada" className="grid h-11 w-11 place-items-center rounded-xl border border-amber-500/40 bg-slate-950/50 text-amber-300 transition hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="text-center">
            <p className="font-display text-lg font-bold uppercase tracking-[0.12em] text-amber-300 sm:text-xl">Equipamentos</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-100/65">{childName}</p>
          </div>
          <button type="button" onClick={onHelp} aria-label="Como usar esta tela" className="grid h-11 w-11 place-items-center rounded-xl border border-amber-500/40 bg-slate-950/50 text-amber-300 transition hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
            <CircleHelp className="h-6 w-6" />
          </button>
        </header>

        <div className="relative z-10 min-h-0 flex-1" data-character-scene>
          <div className="absolute inset-x-[12%] bottom-[4%] h-[12%] rounded-[50%] border border-cyan-300/20 bg-slate-950/55 shadow-[0_0_45px_rgba(8,145,178,0.22)]" />

          <button
            type="button"
            onClick={() => onSelectSlot("elmo")}
            className="absolute left-4 top-5 z-30 flex h-[126px] w-[94px] flex-col overflow-hidden rounded-xl border border-cyan-300/70 bg-slate-950/75 shadow-[0_0_22px_rgba(34,211,238,0.25)] backdrop-blur-sm transition hover:border-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            aria-label="Abrir equipamentos de elmo"
            data-equipment-slot="elmo"
          >
            <span className="border-b border-cyan-300/25 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100">Elmo</span>
            <span className="flex min-h-0 flex-1 items-center justify-center p-2">
              {equipment.helmet ? (
                <img src={equipment.helmet.image_url} alt={equipment.helmet.name ?? "Elmo equipado"} className="h-full w-full object-contain drop-shadow-[0_8px_10px_rgba(0,0,0,0.65)]" />
              ) : (
                <Shield className="h-12 w-12 text-cyan-100/35" aria-hidden="true" />
              )}
            </span>
            <span className="bg-cyan-950/70 py-1 text-[9px] text-cyan-100/70">Toque para trocar</span>
          </button>

          <div className="absolute inset-x-1 bottom-[1%] top-[3%] z-20">
            {modular ? (
              <AvatarRenderer
                equipment={equipment}
                surface="characterScene"
                label={`Personagem equipado de ${childName}`}
                onLayerSelect={onSelectSlot}
              />
            ) : equipment.avatar ? (
              <div className="flex h-full items-center justify-center px-20 pb-10 pt-16">
                <img src={equipment.avatar.image_url} alt={`Avatar de ${childName}`} className="max-h-full max-w-full object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.55)]" />
              </div>
            ) : null}
          </div>

          <div className="pointer-events-none absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-400/30 bg-slate-950/75 px-3 py-1.5 text-[10px] text-amber-100/80 backdrop-blur-sm">
            <Sparkles className="h-3 w-3 text-amber-300" /> Toque em uma peça para trocar
          </div>
        </div>

        <CharacterBottomNavigation onNavigate={onNavigate} />
      </section>
    </main>
  );
}
