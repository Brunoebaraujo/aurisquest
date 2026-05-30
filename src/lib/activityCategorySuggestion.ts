import { type ActivityCategory } from "@/constants/activityCategories";

type CategoryKeywordRule = {
  category: ActivityCategory;
  keywords: string[];
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const CATEGORY_KEYWORDS: CategoryKeywordRule[] = [
  {
    category: "Higiene",
    keywords: ["escovar", "dente", "dentes", "banho", "lavar", "mão", "mãos", "sabonete", "cabelo"],
  },
  {
    category: "Saúde",
    keywords: ["remédio", "medicamento", "vitamina", "água", "beber água", "exercício", "alongamento"],
  },
  {
    category: "Escola",
    keywords: ["lição", "dever", "tarefa escolar", "estudar", "leitura", "ler", "matemática", "português", "prova", "mochila"],
  },
  {
    category: "Casa",
    keywords: ["quarto", "cama", "brinquedos", "guardar", "arrumar", "organizar", "louça", "roupa", "lixo"],
  },
  {
    category: "Comportamento",
    keywords: [
      "comportamento",
      "exemplar",
      "obedeceu",
      "respeitou",
      "respeitar",
      "ajudou",
      "ajudar",
      "compartilhou",
      "compartilhar",
      "paciência",
      "esperar",
      "calma",
      "birra",
      "irmão",
      "irmã",
      "gentileza",
      "educação",
    ],
  },
];

export const suggestActivityCategory = (activityName: string): ActivityCategory => {
  const normalizedName = normalize(activityName);
  const match = CATEGORY_KEYWORDS.find(rule =>
    rule.keywords.some(keyword => normalizedName.includes(normalize(keyword))),
  );

  return match?.category ?? "Rotina";
};
