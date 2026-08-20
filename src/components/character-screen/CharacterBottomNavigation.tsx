import { Backpack, Map, Shield, Sparkles, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export type CharacterNavigationTarget = "inventory" | "equipment" | "abilities" | "map" | "profile";

const items = [
  { key: "inventory", label: "Inventário", icon: Backpack },
  { key: "equipment", label: "Equipamentos", icon: Shield },
  { key: "abilities", label: "Habilidades", icon: Sparkles },
  { key: "map", label: "Mapa", icon: Map },
  { key: "profile", label: "Perfil", icon: UserRound },
] as const;

export function CharacterBottomNavigation({ onNavigate }: { onNavigate: (target: CharacterNavigationTarget) => void }) {
  return (
    <nav aria-label="Navegação do personagem" className="relative z-30 grid h-[76px] grid-cols-5 border-t border-amber-500/40 bg-[#031421]/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md">
      {items.map(({ key, label, icon: Icon }) => {
        const active = key === "equipment";
        return (
          <button
            key={key}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => onNavigate(key)}
            className={cn(
              "relative flex min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-[9px] uppercase tracking-[0.04em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300 sm:text-[10px]",
              active ? "text-cyan-300" : "text-amber-100/70 hover:text-amber-100",
            )}
          >
            {active && <span className="absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />}
            <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_rgba(103,232,249,0.8)]")} aria-hidden="true" />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
