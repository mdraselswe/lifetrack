// Imperative celebration trigger (same singleton pattern as toast/confirm).
// celebrate() fires a one-shot confetti burst rendered by <CelebrationContainer/>.
type Fn = () => void
const listeners = new Set<Fn>()
export const celebrate = (): void => {
  listeners.forEach((f) => f())
}
export const onCelebrate = (f: Fn): (() => void) => {
  listeners.add(f)
  return () => {
    listeners.delete(f)
  }
}
