export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function fmtPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function fmtPKR(n: number): string {
  return new Intl.NumberFormat("en-PK").format(n);
}
