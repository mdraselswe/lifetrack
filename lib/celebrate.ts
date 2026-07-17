// Imperative celebration trigger (same singleton pattern as toast/confirm).
// celebrate(message?) fires a confetti burst (rendered by <CelebrationContainer/>)
// and, if a message is given, a short centered banner for a bigger moment.
type Fn = (message?: string) => void
const listeners = new Set<Fn>()
export const celebrate = (message?: string): void => {
  listeners.forEach((f) => f(message))
}
export const onCelebrate = (f: Fn): (() => void) => {
  listeners.add(f)
  return () => {
    listeners.delete(f)
  }
}
