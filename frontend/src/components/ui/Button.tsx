import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "ghost" | "danger" | "soft" | "outline";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
  icon?: ReactNode;
};

const styles: Record<Variant, string> = {
  primary: "text-surface bg-primary border-primary hover:bg-primary/90",
  ghost: "text-ink/90 border-line bg-surface hover:bg-aqua-soft hover:border-primary/30",
  danger: "text-surface bg-danger border-danger hover:opacity-90",
  soft: "text-ink border-line bg-mint/60 hover:bg-mint-strong/80",
  outline: "text-primary border-primary/40 bg-surface hover:bg-aqua-soft hover:border-primary",
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
        "inline-flex items-center justify-center gap-8 rounded-md border px-16 py-12 font-body text-14 transition-opacity disabled:opacity-45 disabled:cursor-not-allowed",
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
