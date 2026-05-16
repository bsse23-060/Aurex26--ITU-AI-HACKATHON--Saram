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
  variant = "color",
  className,
}: {
  name: string;
  seed?: string;
  size?: number;
  ring?: boolean;
  /** `neutral` matches minimal chrome (gray tile); `color` uses a deterministic accent from the seed. */
  variant?: "color" | "neutral";
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
  const isNeutral = variant === "neutral";
  return (
    <span
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md font-body tracking-wide",
        isNeutral
          ? "border border-line bg-neutral text-ink"
          : "text-surface",
        ring && !isNeutral && "ring-2 ring-secondary/40",
        ring && isNeutral && "ring-1 ring-line",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        ...(isNeutral ? {} : { background: hashColor(key) }),
      }}
    >
      {initials || "?"}
    </span>
  );
}
