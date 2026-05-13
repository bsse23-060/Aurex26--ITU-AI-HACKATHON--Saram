import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type Tone = "primary" | "secondary" | "success" | "warning" | "danger" | "ink";

const tones: Record<Tone, string> = {
  primary: "border-primary/25 bg-aqua-soft text-primary",
  secondary: "border-line bg-surface text-secondary",
  success: "border-success/30 bg-mint text-success",
  warning: "border-line bg-neutral text-warning",
  danger: "border-line bg-neutral text-danger",
  ink: "border-line bg-neutral text-ink",
};

export function Badge({ tone = "primary", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-sm border px-10 py-3 font-body text-12", tones[tone])}>
      {children}
    </span>
  );
}
