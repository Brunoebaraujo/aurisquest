import { Progress } from "@/components/ui/progress";
import { Sparkles } from "lucide-react";

export type LevelInfo = {
  level: number;
  xp: number;
  xp_in_level: number;
  xp_to_next: number;
  total_xp: number;
  title?: string;
  auris?: number;
  medals?: number;
  best_streak?: number;
};

export function LevelBadge({ info, compact = false }: { info: LevelInfo; compact?: boolean }) {
  const pct = info.xp_to_next > 0 ? Math.min(100, Math.round((info.xp_in_level / info.xp_to_next) * 100)) : 100;
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-primary text-primary-foreground px-2 py-0.5 text-xs font-bold">
        <Sparkles className="w-3 h-3" /> Lv {info.level}
      </span>
    );
  }
  return (
    <div className="space-y-1 min-w-[160px]">
      <div className="flex items-center justify-between text-xs">
        <span className="font-display font-bold text-base flex items-center gap-1">
          <Sparkles className="w-4 h-4 text-accent" /> Nível {info.level}
          {info.title && <span className="ml-1 text-xs font-normal text-muted-foreground">· {info.title}</span>}
        </span>
        <span className="text-muted-foreground">
          {info.xp_in_level}/{info.xp_to_next} XP
        </span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}
