import { cn } from "../../lib/cn";

function hashColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff;
  const colors = ["#3B82F6", "#8B5CF6", "#16A34A", "#D97706", "#DC2626", "#0EA5E9", "#EC4899"];
  return colors[h % colors.length];
}

export function Avatar({
  name,
  seed,
  size = 40,
  ring,
  className,
}: {
  name: string;
  seed?: string;
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  const key = seed || name;
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      title={name}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-surface font-display tracking-wide",
        ring && "ring-2 ring-secondary/40",
        className,
      )}
      style={{ width: size, height: size, background: hashColor(key), fontSize: size * 0.42 }}
    >
      {initials || "?"}
    </span>
  );
}
