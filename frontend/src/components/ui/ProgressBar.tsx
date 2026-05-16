import { motion } from "framer-motion";
import { cn } from "../../lib/cn";

type Props = {
  value: number;
  tone?: "primary" | "secondary" | "success" | "warning" | "danger" | "gradient";
  height?: number;
  label?: string;
  shimmer?: boolean;
};

const fills: Record<NonNullable<Props["tone"]>, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  gradient: "bg-gradient-to-r from-primary via-aqua-bright to-success",
};

export function ProgressBar({ value, tone = "gradient", height = 8, label, shimmer }: Props) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className="w-full">
      {label && <p className="label-caps mb-4">{label}</p>}
      <div className="relative w-full overflow-hidden rounded-sm bg-line" style={{ height }}>
        <motion.div
          className={cn("absolute inset-y-0 left-0 rounded-sm", fills[tone])}
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
        {shimmer && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
          </div>
        )}
      </div>
    </div>
  );
}
