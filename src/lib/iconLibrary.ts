// Biblioteca oficial de ícones cartoon para atividades.
// Cada ícone é um PNG transparente 256x256 importado como módulo (Vite resolve a URL).

import escovarDentes from "@/assets/activity-icons/escovar-dentes.png";
import tomarBanho from "@/assets/activity-icons/tomar-banho.png";
import arrumarCama from "@/assets/activity-icons/arrumar-cama.png";
import licaoDeCasa from "@/assets/activity-icons/licao-de-casa.png";
import leitura from "@/assets/activity-icons/leitura.png";
import brincar from "@/assets/activity-icons/brincar.png";
import organizarQuarto from "@/assets/activity-icons/organizar-quarto.png";
import regarPlantas from "@/assets/activity-icons/regar-plantas.png";
import alimentarPet from "@/assets/activity-icons/alimentar-pet.png";
import passearPet from "@/assets/activity-icons/passear-pet.png";
import exercicio from "@/assets/activity-icons/exercicio.png";
import musica from "@/assets/activity-icons/musica.png";
import lavarLouca from "@/assets/activity-icons/lavar-louca.png";
import tirarLixo from "@/assets/activity-icons/tirar-lixo.png";
import dormirCedo from "@/assets/activity-icons/dormir-cedo.png";
import ajudarCozinha from "@/assets/activity-icons/ajudar-cozinha.png";

export type IconCategory = "rotina" | "casa" | "estudos" | "pet" | "saude" | "outro";

export type ActivityIconDef = {
  key: string;
  label: string;
  src: string;
  category: IconCategory;
};

export const ICON_LIBRARY: ActivityIconDef[] = [
  { key: "escovar-dentes",   label: "Escovar os dentes", src: escovarDentes, category: "rotina" },
  { key: "tomar-banho",      label: "Tomar banho",       src: tomarBanho,    category: "rotina" },
  { key: "arrumar-cama",     label: "Arrumar a cama",    src: arrumarCama,   category: "rotina" },
  { key: "dormir-cedo",      label: "Dormir cedo",       src: dormirCedo,    category: "rotina" },
  { key: "licao-de-casa",    label: "Lição de casa",     src: licaoDeCasa,   category: "estudos" },
  { key: "leitura",          label: "Leitura",           src: leitura,       category: "estudos" },
  { key: "musica",           label: "Música / instrumento", src: musica,     category: "estudos" },
  { key: "brincar",          label: "Brincar",           src: brincar,       category: "outro" },
  { key: "exercicio",        label: "Exercício",         src: exercicio,     category: "saude" },
  { key: "organizar-quarto", label: "Organizar o quarto", src: organizarQuarto, category: "casa" },
  { key: "ajudar-cozinha",   label: "Ajudar na cozinha", src: ajudarCozinha, category: "casa" },
  { key: "lavar-louca",      label: "Lavar a louça",     src: lavarLouca,    category: "casa" },
  { key: "tirar-lixo",       label: "Tirar o lixo",      src: tirarLixo,     category: "casa" },
  { key: "regar-plantas",    label: "Regar plantas",     src: regarPlantas,  category: "casa" },
  { key: "alimentar-pet",    label: "Alimentar pet",     src: alimentarPet,  category: "pet" },
  { key: "passear-pet",      label: "Passear com pet",   src: passearPet,    category: "pet" },
];

export const getIconByKey = (key?: string | null) =>
  key ? ICON_LIBRARY.find(i => i.key === key) : undefined;
