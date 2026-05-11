// Sistema de tiers globais para atividades
// Recompensas FIXAS — não há liberdade arbitrária.

export type ActivityTier = "rotina" | "responsabilidade" | "desafio";

export type TierConfig = {
  key: ActivityTier;
  label: string;
  auris: number;
  description: string;
  /** classe Tailwind para o texto/ícone do tier */
  colorClass: string;
  /** classe Tailwind de fundo suave */
  bgClass: string;
  /** classe Tailwind de fundo gradiente / forte */
  gradientClass: string;
  /** classe Tailwind de borda */
  borderClass: string;
};

export const TIERS: Record<ActivityTier, TierConfig> = {
  rotina: {
    key: "rotina",
    label: "Rotina",
    auris: 1,
    description: "Tarefas do dia a dia",
    colorClass: "text-primary",
    bgClass: "bg-primary/10",
    gradientClass: "bg-gradient-primary text-primary-foreground",
    borderClass: "border-primary",
  },
  responsabilidade: {
    key: "responsabilidade",
    label: "Responsabilidade",
    auris: 3,
    description: "Compromissos importantes",
    colorClass: "text-secondary",
    bgClass: "bg-secondary/10",
    gradientClass: "bg-gradient-warm text-secondary-foreground",
    borderClass: "border-secondary",
  },
  desafio: {
    key: "desafio",
    label: "Desafio",
    auris: 5,
    description: "Conquistas especiais",
    colorClass: "text-accent",
    bgClass: "bg-accent/10",
    gradientClass: "bg-gradient-reward text-accent-foreground",
    borderClass: "border-accent",
  },
};

export const TIER_LIST: TierConfig[] = [TIERS.rotina, TIERS.responsabilidade, TIERS.desafio];

export const aurisFor = (tier: ActivityTier) => TIERS[tier].auris;
export const tierFromAuris = (auris: number): ActivityTier =>
  auris <= 1 ? "rotina" : auris <= 3 ? "responsabilidade" : "desafio";

// Tiers de bônus de missões (separados das atividades)
export type MissionTier = "bronze" | "prata" | "ouro";
export type MissionTierConfig = {
  key: MissionTier;
  label: string;
  auris: number;
  colorClass: string;
  bgClass: string;
  gradientClass: string;
};

export const MISSION_TIERS: Record<MissionTier, MissionTierConfig> = {
  bronze: { key: "bronze", label: "Bronze", auris: 5,  colorClass: "text-orange-700", bgClass: "bg-orange-100", gradientClass: "bg-gradient-to-br from-orange-400 to-amber-700 text-white" },
  prata:  { key: "prata",  label: "Prata",  auris: 10, colorClass: "text-slate-600",  bgClass: "bg-slate-100",  gradientClass: "bg-gradient-to-br from-slate-300 to-slate-500 text-white" },
  ouro:   { key: "ouro",   label: "Ouro",   auris: 20, colorClass: "text-amber-600",  bgClass: "bg-amber-100",  gradientClass: "bg-gradient-reward text-accent-foreground" },
};
export const MISSION_TIER_LIST: MissionTierConfig[] = [MISSION_TIERS.bronze, MISSION_TIERS.prata, MISSION_TIERS.ouro];
export const missionAurisFor = (t: MissionTier) => MISSION_TIERS[t].auris;
export const missionTierFromAuris = (a: number): MissionTier =>
  a <= 5 ? "bronze" : a <= 10 ? "prata" : "ouro";
