import { useEffect, useState } from "react";

type Rect = { top: number; left: number; width: number; height: number };

export const GuardianSpotlight = ({ target }: { target: string }) => {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    const find = () => document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
    const update = () => {
      const element = find();
      if (!element) { setRect(null); return; }
      const next = element.getBoundingClientRect();
      setRect({ top: next.top, left: next.left, width: next.width, height: next.height });
    };
    const element = find();
    update();
    element?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center", inline: "nearest" });
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (element) observer?.observe(element);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const timeout = window.setTimeout(update, 250);
    return () => { observer?.disconnect(); window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); window.clearTimeout(timeout); };
  }, [target]);

  if (!rect) return null;
  return <div aria-hidden="true" className="pointer-events-none fixed z-40 rounded-xl ring-2 ring-primary ring-offset-4 ring-offset-background transition-all duration-150" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, boxShadow: "0 0 0 9999px rgb(15 23 42 / 0.28)" }} />;
};
