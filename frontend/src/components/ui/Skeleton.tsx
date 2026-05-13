import { cn } from "../../lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-ink/5",
        className,
      )}
    >
      <div className="absolute inset-0">
        <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer" />
      </div>
    </div>
  );
}
