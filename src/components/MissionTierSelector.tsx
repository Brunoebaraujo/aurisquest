import { MISSION_TIER_LIST, type MissionTier } from "@/lib/tiers";
import { AuriIcon } from "./AuriIcon";
import { cn } from "@/lib/utils";

type Props = {
  value: MissionTier;
  onChange: (tier: MissionTier) => void;
};

export const MissionTierSelector = ({ value, onChange }: Props) => (
  <div className="grid grid-cols-3 gap-2">
    {MISSION_TIER_LIST.map(t => {
      const selected = value === t.key;
      return (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={cn(
            "relative rounded-2xl p-3 text-center border-2 transition-bounce",
            selected ? "shadow-soft scale-[1.02]" : "border-border bg-card hover:border-muted-foreground/40 opacity-80",
            selected && t.gradientClass,
          )}
        >
          <div className={cn("text-xs font-bold uppercase tracking-wide", selected ? "" : t.colorClass)}>
            {t.label}
          </div>
          <div className="flex items-center justify-center gap-1 font-display text-lg font-bold mt-1">
            <AuriIcon size="md" variant="glow" />
            {t.auris}
          </div>
        </button>
      );
    })}
  </div>
);

export default MissionTierSelector;
