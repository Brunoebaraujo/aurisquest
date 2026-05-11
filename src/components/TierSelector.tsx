import { TIER_LIST, type ActivityTier } from "@/lib/tiers";
import { AuriIcon } from "./AuriIcon";
import { cn } from "@/lib/utils";

type Props = {
  value: ActivityTier;
  onChange: (tier: ActivityTier) => void;
};

export const TierSelector = ({ value, onChange }: Props) => (
  <div className="grid grid-cols-3 gap-2">
    {TIER_LIST.map(t => {
      const selected = value === t.key;
      return (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={cn(
            "relative rounded-2xl p-3 text-left border-2 transition-bounce",
            selected
              ? `${t.borderClass} shadow-soft scale-[1.02] ${t.bgClass}`
              : "border-border bg-card hover:border-muted-foreground/40",
          )}
        >
          <div className={cn("text-xs font-bold uppercase tracking-wide mb-1", selected ? t.colorClass : "text-muted-foreground")}>
            {t.label}
          </div>
          <div className="flex items-center gap-1 font-display text-xl font-bold">
            <AuriIcon size="md" variant="glow" />
            {t.auris}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 leading-tight">{t.description}</div>
        </button>
      );
    })}
  </div>
);

export default TierSelector;
