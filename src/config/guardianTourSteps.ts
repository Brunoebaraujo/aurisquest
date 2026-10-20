export type GuardianPhase = "onboarding" | "app";

export type GuardianStep = {
  id: string;
  target: string;
  route?: string;
  speech: string;
  state: "speaking" | "pointing" | "celebrating";
  fallbackLabel?: string;
  fallbackSpeech?: string;
};

export const ONBOARDING_GUARDIAN_STEPS: GuardianStep[] = [
  {
    id: "kingdom",
    target: "onboarding-family-name",
    speech: "Todo grande reino começa com um nome. Como vamos chamar o seu?",
    state: "speaking",
  },
  {
    id: "heroes",
    target: "onboarding-children",
    speech: "Quem serão os primeiros heróis desta aventura? Vamos adicioná-los!",
    state: "pointing",
  },
  {
    id: "activities",
    target: "onboarding-default-activities",
    speech: "As atividades são desafios do dia a dia. Elas ajudam seus heróis a conquistar Auris!",
    state: "pointing",
  },
  {
    id: "starter-mission",
    target: "onboarding-starter-mission",
    speech: "E esta é Dentes Fortes! Escovar os dentes durante sete dias seguidos pode render uma medalha especial.",
    state: "speaking",
  },
  {
    id: "reward",
    target: "onboarding-reward-selector",
    speech: "Os Auris conquistados podem ser trocados por recompensas. Você decide o que estará disponível!",
    state: "pointing",
  },
  {
    id: "open-gates",
    target: "onboarding-activate",
    speech: "Seu reino está pronto! Vamos conhecer os lugares onde seus heróis viverão suas aventuras?",
    state: "celebrating",
  },
];

export const APP_GUARDIAN_STEPS: GuardianStep[] = [
  {
    id: "children",
    target: "children-password-control",
    route: "/app/criancas",
    speech: "Vamos preparar seus heróis! Aqui você define as senhas para eles entrarem no Reino.",
    state: "pointing",
    fallbackLabel: "Ir para Crianças",
  },
  {
    id: "activities",
    target: "activities-section",
    route: "/app/atividades",
    speech: "Estas são as Quests do dia a dia. Você pode editar, adicionar ou excluir atividades.",
    state: "pointing",
    fallbackLabel: "Ir para Atividades",
  },
  {
    id: "missions",
    target: "starter-mission-card",
    route: "/app/missoes",
    speech: "Missões são desafios maiores. Dentes Fortes, por exemplo, acompanha sete dias seguidos de escovação!",
    state: "speaking",
    fallbackLabel: "Ir para Missões",
    fallbackSpeech: "Missões são desafios maiores. A missão inicial não está ativa, mas você pode criar e acompanhar desafios nesta tela.",
  },
  {
    id: "pending",
    target: "pending-moderation",
    route: "/app/pendencias",
    speech: "Aqui você acompanha as atividades enviadas pelos heróis e aprova o que foi realizado.",
    state: "pointing",
    fallbackLabel: "Ir para Pendências",
  },
  {
    id: "merchant",
    target: "merchant-catalog-link",
    route: "/app/recompensas",
    speech: "Chegamos ao Mercador! Aqui você acompanha as recompensas disponíveis para seus heróis.",
    state: "pointing",
    fallbackLabel: "Ir para o Mercador",
  },
];

export const guardianStepsFor = (phase: GuardianPhase) =>
  phase === "onboarding" ? ONBOARDING_GUARDIAN_STEPS : APP_GUARDIAN_STEPS;
