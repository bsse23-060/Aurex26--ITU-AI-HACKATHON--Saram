import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type Tone = "primary" | "secondary" | "success" | "warning" | "danger" | "ink";

const tones: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/10 text-danger",
  ink: "bg-ink/10 text-ink",
};

export function Badge({ tone = "primary", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cn("pill", tones[tone])}>{children}</span>;
}
