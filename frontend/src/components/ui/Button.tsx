import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "ghost" | "danger" | "soft" | "outline";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
  icon?: ReactNode;
};

const styles: Record<Variant, string> = {
  primary:
    "text-surface bg-artistic-gradient shadow-bold hover:shadow-[0_12px_40px_rgba(59,130,246,0.35)] active:scale-[0.99]",
  ghost: "text-ink/80 border-2 border-ink/10 hover:border-primary hover:text-primary",
  danger: "text-surface bg-danger hover:bg-[#b91c1c]",
  soft: "text-secondary bg-secondary/10 hover:bg-secondary/20",
  outline: "text-primary border-2 border-primary hover:bg-primary hover:text-surface",
};

export function Button({
  variant = "primary",
  loading,
  icon,
  className,
  disabled,
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-8 rounded-md px-16 py-12 font-mono text-12 uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed",
        styles[variant],
        className,
      )}
    >
      {loading ? (
        <span className="h-3 w-3 inline-block rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
