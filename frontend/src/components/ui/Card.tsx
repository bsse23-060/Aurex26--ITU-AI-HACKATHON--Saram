import type { HTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/cn";

type Props = HTMLAttributes<HTMLDivElement> & {
  accent?: "primary" | "secondary" | "success" | "warning" | "danger" | "none";
  pad?: "sm" | "md" | "lg";
  hover?: boolean;
  children: ReactNode;
};

const accents: Record<NonNullable<Props["accent"]>, string> = {
  primary: "border-t-[6px] border-t-primary",
  secondary: "border-t-[6px] border-t-secondary",
  success: "border-t-[6px] border-t-success",
  warning: "border-t-[6px] border-t-warning",
  danger: "border-t-[6px] border-t-danger",
  none: "",
};

const pads = { sm: "p-16", md: "p-24", lg: "p-32" };

export function Card({ accent = "none", pad = "md", hover, className, children, ...rest }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      {...(rest as object)}
      className={cn(
        "card",
        accents[accent],
        pads[pad],
        hover && "hover:-translate-y-1 hover:shadow-artistic transition-all",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export function CardTitle({ children, kicker }: { children: ReactNode; kicker?: string }) {
  return (
    <div className="mb-12 flex items-baseline gap-8">
      {kicker && <span className="label-caps text-secondary">{kicker}</span>}
      <h3 className="display text-22 text-ink">{children}</h3>
    </div>
  );
}
