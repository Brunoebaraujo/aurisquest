import auriImg from "@/assets/auri.png";

type SizeToken = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
const SIZE_MAP: Record<SizeToken, number> = { xs: 12, sm: 16, md: 20, lg: 28, xl: 40, "2xl": 56 };

type Props = {
  size?: SizeToken | number;
  variant?: "flat" | "glow" | "stack";
  animate?: boolean;
  className?: string;
};

const resolveSize = (s: Props["size"]) =>
  typeof s === "number" ? s : SIZE_MAP[s ?? "sm"];

export const AuriIcon = ({ size = "sm", variant = "flat", animate = false, className }: Props) => {
  const px = resolveSize(size);
  const glow = variant === "glow"
    ? { filter: `drop-shadow(0 0 ${Math.max(2, px / 5)}px hsl(200 95% 70% / 0.7))` }
    : undefined;

  if (variant === "stack") {
    const offset = Math.max(1, Math.round(px * 0.12));
    return (
      <span
        className={`relative inline-block align-text-bottom ${animate ? "animate-pulse" : ""} ${className ?? ""}`}
        style={{ width: px + offset * 2, height: px + offset * 2 }}
        aria-label="Auris"
        title="Auris — cristal do Auris Quest"
      >
        <img src={auriImg} alt="" width={px} height={px} draggable={false}
          className="absolute" style={{ left: 0, top: offset * 2, ...glow }} />
        <img src={auriImg} alt="" width={px} height={px} draggable={false}
          className="absolute" style={{ left: offset, top: offset, ...glow }} />
        <img src={auriImg} alt="Auri" width={px} height={px} draggable={false}
          className="absolute" style={{ left: offset * 2, top: 0, ...glow }} />
      </span>
    );
  }

  return (
    <img
      src={auriImg}
      alt="Auri"
      title="Auri — cristal do Auris Quest"
      width={px}
      height={px}
      draggable={false}
      className={`inline-block align-text-bottom select-none ${animate ? "animate-bounce-soft" : ""} ${className ?? ""}`}
      style={glow}
    />
  );
};

export default AuriIcon;
