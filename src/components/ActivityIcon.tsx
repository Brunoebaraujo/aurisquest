import { getIconByKey } from "@/lib/iconLibrary";
import { Sparkles } from "lucide-react";

type Props = {
  iconKey?: string | null;
  iconUrl?: string | null;
  size?: number;
  className?: string;
  /** quando true aplica fundo cartoon */
  framed?: boolean;
};

export const ActivityIcon = ({ iconKey, iconUrl, size = 56, className, framed = false }: Props) => {
  const lib = getIconByKey(iconKey);
  const src = iconUrl || lib?.src;

  const inner = src ? (
    <img
      src={src}
      alt={lib?.label ?? ""}
      width={size}
      height={size}
      loading="lazy"
      draggable={false}
      className="object-contain select-none"
      style={{ width: size, height: size }}
    />
  ) : (
    <Sparkles style={{ width: size * 0.55, height: size * 0.55 }} className="text-primary" />
  );

  if (!framed) return <span className={`inline-flex items-center justify-center ${className ?? ""}`}>{inner}</span>;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-2xl bg-card shadow-soft ring-2 ring-border ${className ?? ""}`}
      style={{ width: size + 16, height: size + 16 }}
    >
      {inner}
    </span>
  );
};

export default ActivityIcon;
