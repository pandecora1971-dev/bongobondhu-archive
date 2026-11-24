/** Bound untrusted query parameters before passing an offset to Prisma. */
export function pageNumber(value: unknown, maximum = 500): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(1, Math.min(maximum, Math.floor(n))) : 1;
}
