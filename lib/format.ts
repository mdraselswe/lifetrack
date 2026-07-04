// Round a number to at most 2 decimal places, avoiding floating-point
// artifacts like 100.30000000000001 that appear when summing amounts.
export const round2 = (n: number): number => {
  if (!Number.isFinite(n)) return 0
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// Convert Latin digits (0-9) in a string to Bengali numerals (০-৯).
const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']
export const toBnDigits = (s: string): string => s.replace(/[0-9]/g, (d) => BN_DIGITS[+d])
