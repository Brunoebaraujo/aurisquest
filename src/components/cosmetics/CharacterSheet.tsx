import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { AuriIcon } from "@/components/AuriIcon";
import { EquippedAvatar, type Equipment } from "./EquippedAvatar";
import { RarityFrame, type Rarity } from "./Rarity";
import {
  ArrowLeft, X, Sparkles, Crown, Flame, Medal, Clock, CheckCircle2,
  HardHat, Shirt, Hand, Gem, Circle, Minus, Sword, Footprints, Shield, Lock,
  ClipboardList, Calendar, Trophy, Pencil, ShoppingBag,
} from "lucide-react";

export type RealSlotKey = "elmo" | "armadura" | "arma" | "pet" | "aura";

type SlotConfig = {
  label: string;
  realSlot: RealSlotKey | null; // null = locked / "Em breve"
  emptyIcon: typeof HardHat;
  equipKey?: keyof Equipment;   // which Equipment field to read
};

const SLOTS_LEFT: SlotConfig[] = [
  { label: "Cabeça", realSlot: "elmo",     emptyIcon: HardHat,    equipKey: "helmet" },
  { label: "Peito",  realSlot: "armadura", emptyIcon: Shirt,      equipKey: "armor" },
  { label: "Luvas",  realSlot: null,       emptyIcon: Hand },
];
const SLOTS_RIGHT: SlotConfig[] = [
  { label: "Amuleto", realSlot: "aura", emptyIcon: Gem, equipKey: "aura" },
  { label: "Anel",    realSlot: null,   emptyIcon: Circle },
  { label: "Cinto",   realSlot: null,   emptyIcon: Minus },
];
const SLOTS_BOTTOM: SlotConfig[] = [
  { label: "Mão Principal", realSlot: "arma", emptyIcon: Sword,      equipKey: "weapon" },
  { label: "Botas",         realSlot: null,   emptyIcon: Footprints },
  { label: "PET", realSlot: "pet", emptyIcon: Shield,     equipKey: "pet" },
];

function SlotTile({
  label, item, locked, onClick, EmptyIcon,
}: {
  label: string;
  item?: { image_url: string; rarity: Rarity; name?: string } | null;
  locked?: boolean;
  onClick?: () => void;
  EmptyIcon: typeof HardHat;
}) {
  const hasItem = !!item;
  const content = (
    <div className="flex flex-col items-center gap-1 w-full">
      <div className="text-[10px] font-semibold tracking-wide text-accent uppercase truncate w-full text-center">
        {label}
      </div>
      {hasItem ? (
        <RarityFrame rarity={item!.rarity} rounded="rounded-xl" className="w-full">
          <div className="aspect-square bg-gradient-to-br from-muted/60 to-background flex items-center justify-center overflow-hidden">
            <img src={item!.image_url} alt={item!.name ?? label} className="w-full h-full object-contain p-1.5" />
          </div>
        </RarityFrame>
      ) : (
        <div
          className={cn(
            "aspect-square w-full rounded-xl border-2 border-dashed flex items-center justify-center relative",
            locked
              ? "border-muted-foreground/20 bg-muted/20"
              : "border-muted-foreground/30 bg-muted/30",
          )}
        >
          <EmptyIcon
            className={cn(
              "w-7 h-7",
              locked ? "text-muted-foreground/30" : "text-muted-foreground/50",
            )}
          />
          {locked && (
            <span className="absolute -top-1 -right-1 inline-flex items-center gap-0.5 rounded-full bg-muted text-muted-foreground text-[8px] font-bold px-1.5 py-0.5 border border-border">
              <Lock className="w-2 h-2" /> Em breve
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (locked) {
    return (
      <div className="w-full opacity-70 min-h-[44px] cursor-not-allowed" aria-disabled>
        {content}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full min-h-[44px] transition-bounce hover:scale-[1.03] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
    >
      {content}
    </button>
  );
}

function ResourceCard({
  icon, value, label,
}: { icon: ReactNode; value: ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 rounded-2xl bg-card/95 border border-border shadow-soft py-2 px-2 min-h-[64px]">
      <div className="flex items-center gap-1 text-base font-display font-bold leading-none">
        {icon}
        <span>{value}</span>
      </div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function MoneyCard({
  tone, label, value, Icon,
}: {
  tone: "pending" | "approved" | "paid";
  label: string;
  value: number;
  Icon: typeof Clock;
}) {
  const toneClasses = {
    pending: "bg-card border-warning/40 text-warning",
    approved: "bg-gradient-reward text-accent-foreground border-transparent",
    paid: "bg-card border-success/40 text-success",
  }[tone];
  const valueClasses =
    tone === "approved" ? "text-accent-foreground" : "text-foreground";
  return (
    <div className={cn("rounded-2xl border-2 shadow-card p-3 flex flex-col items-center gap-1", toneClasses)}>
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide">
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
      </div>
      <div className={cn("font-display font-bold text-lg leading-none flex items-center gap-1", valueClasses)}>
        <AuriIcon size={16} /> {value}
      </div>
    </div>
  );
}

export type CharacterSheetProps = {
  name: string;
  title?: string;
  level: number;
  xpInLevel: number;
  xpToNext: number;
  totalXp: number;
  nextLevelTotalXp: number;
  auris: number;
  medals: number;
  streak: number;
  pending: number;
  approved: number;
  paid: number;
  equipment: Equipment;
  hasActivityBadge?: boolean;
  levelGlow?: boolean;
  onAvatarClick?: () => void;
  onSlotClick?: (slot: RealSlotKey) => void;
  onLockedSlotClick?: (label: string) => void;
  onNameEdit?: () => void;
  onBack?: () => void;
  onClose?: () => void;
  onActivities?: () => void;
  onCalendar?: () => void;
  onRanking?: () => void;
  onShop?: () => void;
  hasPendingRedemptionBadge?: boolean;
};

export function CharacterSheet({
  name, title, level, xpInLevel, xpToNext, totalXp, nextLevelTotalXp,
  auris, medals, streak, pending, approved, paid,
  equipment, hasActivityBadge, levelGlow,
  onAvatarClick, onSlotClick, onLockedSlotClick, onNameEdit,
  onBack, onClose, onActivities, onCalendar, onRanking, onShop, hasPendingRedemptionBadge,
}: CharacterSheetProps) {
  const pct = xpToNext > 0 ? Math.min(100, Math.round((xpInLevel / xpToNext) * 100)) : 0;

  const renderSlot = (s: SlotConfig) => {
    const item = s.equipKey ? (equipment[s.equipKey] as any) : null;
    return (
      <SlotTile
        key={s.label}
        label={s.label}
        item={item}
        locked={!s.realSlot}
        EmptyIcon={s.emptyIcon}
        onClick={() => {
          if (!s.realSlot) { onLockedSlotClick?.(s.label); return; }
          onSlotClick?.(s.realSlot);
        }}
      />
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      {(onBack || onClose) && (
        <div className="flex items-center justify-between">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="min-w-[44px] min-h-[44px] rounded-xl bg-card/80 border border-border flex items-center justify-center hover:bg-card transition-smooth"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : <span />}
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] rounded-xl bg-card/80 border border-border flex items-center justify-center hover:bg-card transition-smooth"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          ) : <span />}
        </div>
      )}

      {/* SECTION 1 — Character Overview */}
      <div className="rounded-3xl bg-gradient-to-br from-primary/15 via-background to-secondary/10 border border-border shadow-card p-4 md:p-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onAvatarClick}
            className="relative shrink-0 transition-bounce hover:scale-[1.03] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
            aria-label="Editar visual"
          >
            <EquippedAvatar
              equipment={{ avatar: equipment.avatar, frame: equipment.frame }}
              size={76}
              fallbackName={name}
              className={cn(levelGlow && "ring-4 ring-primary/60 rounded-full animate-pulse")}
            />
          </button>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display font-bold text-2xl md:text-3xl truncate">{name}</h1>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-gradient-reward text-accent-foreground px-2 py-0.5 text-[11px] font-display font-bold border-2 border-background shadow-reward">
                <Sparkles className="w-2.5 h-2.5" /> Lv {level}
              </span>
              {onNameEdit && (
                <button
                  type="button"
                  onClick={onNameEdit}
                  className="text-primary hover:text-primary/80"
                  aria-label="Editar nome"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 text-accent text-sm font-semibold">
              <Crown className="w-4 h-4" /> {title ?? "Aventureiro"}
            </div>
            <div className="space-y-1">
              <Progress value={pct} className="h-2" />
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="font-bold">Lv {level}</span>
                <span>{totalXp}/{nextLevelTotalXp} XP</span>
              </div>
            </div>
          </div>
        </div>

        {/* Resource cards */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <ResourceCard icon={<AuriIcon size={16} />} value={auris} label="Auris" />
          <ResourceCard icon={<Medal className="w-4 h-4 text-accent" />} value={medals} label="Medalhas" />
          <ResourceCard icon={<Flame className="w-4 h-4 text-warning" />} value={streak} label="Dias seguidos" />
        </div>
      </div>

      {/* SECTION 2 — Financial */}
      <div className="grid grid-cols-3 gap-2">
        <MoneyCard tone="pending"  label="Pendente"  value={pending}  Icon={Clock} />
        <MoneyCard tone="approved" label="Aprovado"  value={approved} Icon={Sparkles} />
        <MoneyCard tone="paid"     label="Pago"      value={paid}     Icon={CheckCircle2} />
      </div>

      {/* SECTION 3 — Equipment Panel */}
      <div className="relative rounded-3xl border border-border overflow-hidden bg-gradient-to-b from-primary/20 via-background to-secondary/15 shadow-card p-4">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-3 h-3 text-accent" />
          <h2 className="font-display font-bold text-base text-accent tracking-wide">EQUIPAMENTOS</h2>
          <Sparkles className="w-3 h-3 text-accent" />
        </div>

        {/* Top: 3-column grid with character in the middle */}
        <div className="grid grid-cols-[minmax(64px,1fr)_minmax(140px,1.8fr)_minmax(64px,1fr)] gap-2 items-center">
          <div className="flex flex-col gap-2">
            {SLOTS_LEFT.map(renderSlot)}
          </div>
          <div className="flex items-center justify-center py-2">
            <button
              type="button"
              onClick={onAvatarClick}
              className="transition-bounce hover:scale-[1.02] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
              aria-label="Editar visual"
            >
              <EquippedAvatar
                equipment={{ avatar: equipment.avatar, frame: equipment.frame }}
                size={180}
                fallbackName={name}
              />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {SLOTS_RIGHT.map(renderSlot)}
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {SLOTS_BOTTOM.map(renderSlot)}
        </div>
      </div>

      {/* SECTION 4 — Profile Navigation */}
      {(onActivities || onCalendar || onRanking || onShop) && (
        <div className={cn("grid gap-2", onShop ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
          {onActivities && (
            <NavBtn icon={<ClipboardList className="w-5 h-5" />} label="Atividades" onClick={onActivities} badge={hasActivityBadge} />
          )}
          {onShop && (
            <NavBtn icon={<ShoppingBag className="w-5 h-5" />} label="Loja" onClick={onShop} badge={hasPendingRedemptionBadge} />
          )}
          {onCalendar && (
            <NavBtn icon={<Calendar className="w-5 h-5" />} label="Calendário" onClick={onCalendar} />
          )}
          {onRanking && (
            <NavBtn icon={<Trophy className="w-5 h-5" />} label="Ranking" onClick={onRanking} />
          )}
        </div>
      )}
    </div>
  );
}

function NavBtn({ icon, label, onClick, badge }: {
  icon: ReactNode; label: string; onClick: () => void; badge?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative min-h-[52px] rounded-2xl bg-card/95 border border-border shadow-soft flex items-center justify-center gap-2 px-3 hover:bg-card hover:border-primary transition-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="text-accent">{icon}</span>
      <span className="font-display font-bold text-sm">{label}</span>
      {badge && (
        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
      )}
    </button>
  );
}
