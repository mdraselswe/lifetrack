// Round a number to at most 2 decimal places, avoiding floating-point
// artifacts like 100.30000000000001 that appear when summing amounts.
export const round2 = (n: number): number => {
  if (!Number.isFinite(n)) return 0
  return Math.round((n + Number.EPSILON) * 100) / 100
}
