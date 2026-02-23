export type MacroTotals = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export function round0(value: number): number {
  return Math.round(value);
}

export function parseNonNegativeInt(raw: string): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, round0(parsed));
}

export function isWithinTolerance(
  actual: number,
  target: number,
  tolerancePct: number,
): boolean {
  return Math.abs(actual - target) <= target * (tolerancePct / 100);
}
