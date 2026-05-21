export const ACTIVITY_CATEGORIES = [
  "Higiene",
  "Estudos",
  "Casa",
  "Saúde",
  "Comportamento",
  "Criatividade",
  "Família",
] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export const isActivityCategory = (value: string | null | undefined): value is ActivityCategory =>
  ACTIVITY_CATEGORIES.includes(value as ActivityCategory);
