// Tiny vibration feedback on supported devices (Android Chrome etc.).
// Silently does nothing elsewhere (iOS Safari has no vibrate API).
export const haptic = (pattern: number | number[] = 10): void => {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern)
  } catch {
    // ignore
  }
}
