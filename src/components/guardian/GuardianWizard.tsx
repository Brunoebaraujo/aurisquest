import { motion, useReducedMotion } from "framer-motion";
import wizardImage from "@/assets/wizard.png";

export type GuardianWizardState = "idle" | "speaking" | "pointing" | "celebrating";

export const GuardianWizard = ({ state = "idle", className = "" }: { state?: GuardianWizardState; className?: string }) => {
  const reducedMotion = useReducedMotion();
  const animation = reducedMotion ? {} : state === "celebrating"
    ? { y: [0, -6, 0], rotate: [0, -2, 2, 0] }
    : state === "pointing"
      ? { x: [0, 4, 0], rotate: [0, -2, 0] }
      : state === "speaking"
        ? { y: [0, -3, 0] }
        : { y: [0, -2, 0] };
  return (
    <motion.img
      src={wizardImage}
      alt="Guardião mágico do Auris Quest"
      className={`h-16 w-16 sm:h-20 sm:w-20 object-contain select-none ${className}`}
      animate={animation}
      transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
    />
  );
};
