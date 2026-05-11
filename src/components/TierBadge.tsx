import { TIERS, type ActivityTier } from "@/lib/tiers";
import { AuriIcon } from "./AuriIcon";
import { cn } from "@/lib/utils";

type Props = {
  tier: ActivityTier;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
};

export const TierBadge = ({ tier, size = "sm", showLabel = true, className }: Props) => {
  const t = TIERS[tier];
  const sizeClass =
    size === "lg" ? "text-sm px-3 py-1.5 gap-1.5" :
    size === "md" ? "text-xs px-2.5 py-1 gap-1" :
                    "text-[11px] px-2 py-0.5 gap-1";
  const auriSize = size === "lg" ? "md" : size === "md" ? "sm" : "xs";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold whitespace-nowrap",
        t.gradientClass,
        sizeClass,
        className,
      )}
    >
      {showLabel && <span>{t.label}</span>}
      <span className="inline-flex items-center gap-0.5">
        <AuriIcon size={auriSize as any} variant="glow" />
        <span>{t.auris}</span>
      </span>
    </span>
  );
};

export default TierBadge;
