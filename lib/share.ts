// Share a plain-text statement via the Web Share API, falling back to the
// clipboard. Returns what actually happened so the caller can toast.
export async function shareOrCopy(title: string, text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ title, text })
      return 'shared'
    }
  } catch (err) {
    // User cancelled the share sheet, or share failed — fall through to copy.
    if ((err as { name?: string })?.name === 'AbortError') return 'failed'
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      // Clipboard gets only the text (Web Share sends title separately), so
      // fold the title in here to keep the name — without duplicating it in
      // the share path, where the body intentionally omits the name.
      await navigator.clipboard.writeText(title ? `${title}\n${text}` : text)
      return 'copied'
    }
  } catch {
    // ignore
  }
  return 'failed'
}
