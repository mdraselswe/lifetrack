// Deterministic avatar color from a name — same person, same color everywhere.
export const avatarColor = (name: string): { bg: string; fg: string } => {
  let h = 0
  const s = (name || '?').trim().toLowerCase()
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  const hue = ((h >>> 0) % 12) * 30
  return { bg: `hsl(${hue} 60% 45%)`, fg: '#ffffff' }
}
