export const ACTIVITY_CATEGORIES = [
  "Rotina",
  "Higiene",
  "Saúde",
  "Escola",
  "Estudos",
  "Casa",
  "Comportamento",
  "Criatividade",
  "Família",
] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export const isActivityCategory = (value: string | null | undefined): value is ActivityCategory =>
  ACTIVITY_CATEGORIES.includes(value as ActivityCategory);
