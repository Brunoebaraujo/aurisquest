export type SideQuestCategory = "bondade" | "criatividade" | "socializacao";

export type SideQuestMission = {
  key: string;
  title: string;
  emoji: string;
};

export type SideQuestCategoryDef = {
  id: SideQuestCategory;
  label: string;
  emoji: string;
  // Tailwind tokens
  gradient: string; // gradient background classes
  ring: string;     // ring/border color classes
  badge: string;    // badge background classes
  missions: SideQuestMission[];
};

export const SIDE_QUEST_CATEGORIES: Record<SideQuestCategory, SideQuestCategoryDef> = {
  bondade: {
    id: "bondade",
    label: "Bondade",
    emoji: "💖",
    gradient: "from-rose-200 via-pink-100 to-amber-100",
    ring: "ring-rose-300",
    badge: "bg-rose-500 text-white",
    missions: [
      { key: "bondade.ajudar",  title: "Ajude alguém de forma espontânea!", emoji: "🤝" },
      { key: "bondade.elogio",  title: "Faça um elogio sincero para alguém.", emoji: "💬" },
      { key: "bondade.dividir", title: "Divida algo que você gosta.", emoji: "🎁" },
    ],
  },
  criatividade: {
    id: "criatividade",
    label: "Criatividade",
    emoji: "✨",
    gradient: "from-amber-200 via-yellow-100 to-violet-100",
    ring: "ring-violet-300",
    badge: "bg-violet-500 text-white",
    missions: [
      { key: "criatividade.desenho",  title: "Crie um desenho de algo que aconteceu no seu dia.", emoji: "🎨" },
      { key: "criatividade.historia", title: "Invente uma pequena história.", emoji: "📖" },
      { key: "criatividade.construir",title: "Construa algo usando objetos de casa.", emoji: "🧱" },
    ],
  },
  socializacao: {
    id: "socializacao",
    label: "Socialização",
    emoji: "🗣️",
    gradient: "from-sky-200 via-cyan-100 to-emerald-100",
    ring: "ring-sky-300",
    badge: "bg-sky-500 text-white",
    missions: [
      { key: "social.brincar",  title: "Chame um amigo para brincar.", emoji: "🧒" },
      { key: "social.perguntar",title: "Pergunte como foi o dia de alguém.", emoji: "💭" },
      { key: "social.ligar",    title: "Ligue e conte como foi seu dia para um parente próximo.", emoji: "📞" },
    ],
  },
};

export const ALL_CATEGORIES: SideQuestCategory[] = ["bondade", "criatividade", "socializacao"];

export const pickRandomCategory = (): SideQuestCategory =>
  ALL_CATEGORIES[Math.floor(Math.random() * ALL_CATEGORIES.length)];

export const pickRandomReward = (): number => (Math.random() < 0.5 ? 2 : 3);

export const findMission = (key: string): { category: SideQuestCategoryDef; mission: SideQuestMission } | null => {
  for (const cat of Object.values(SIDE_QUEST_CATEGORIES)) {
    const m = cat.missions.find(mm => mm.key === key);
    if (m) return { category: cat, mission: m };
  }
  return null;
};
