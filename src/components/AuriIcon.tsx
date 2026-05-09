import auriPng from "@/assets/auri.png";

type Props = { size?: number; className?: string };

export const AuriIcon = ({ size = 16, className }: Props) => (
  <img
    src={auriPng}
    alt="Auri"
    title="Auri — moeda do Auris Quest"
    width={size}
    height={size}
    className={`inline-block align-text-bottom select-none ${className ?? ""}`}
    draggable={false}
  />
);

export default AuriIcon;
