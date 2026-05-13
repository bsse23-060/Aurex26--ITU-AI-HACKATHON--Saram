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
  primary: "border-l-[3px] border-l-primary",
  secondary: "border-l-[3px] border-l-aqua-bright/70",
  success: "border-l-[3px] border-l-success",
  warning: "border-l-[3px] border-l-warning/50",
  danger: "border-l-[3px] border-l-danger/40",
  none: "",
};

const pads = { sm: "p-16", md: "p-24", lg: "p-32" };

export function Card({ accent = "none", pad = "md", hover, className, children, ...rest }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      {...(rest as object)}
      className={cn(
        "card",
        accents[accent],
        pads[pad],
        hover && "hover:border-primary/25 hover:shadow-bold transition-shadow",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export function CardTitle({ children, kicker }: { children: ReactNode; kicker?: string }) {
  return (
    <div className="mb-12 flex flex-wrap items-baseline gap-8">
      {kicker && <span className="label-caps">{kicker}</span>}
      <h3 className="display text-22 text-ink font-normal">{children}</h3>
    </div>
  );
}
