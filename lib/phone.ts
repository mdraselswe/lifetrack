// Phone helpers for call / WhatsApp actions on debt & loan cards.

// Normalize a Bangladeshi number to international digits for wa.me:
// strip non-digits; "01XXXXXXXXX" (11 digits) → "8801XXXXXXXXX".
export const normalizePhone = (raw: string): string => {
  const digits = (raw || '').replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('01')) return `880${digits.slice(1)}`
  if (digits.startsWith('880')) return digits
  return digits
}

// WhatsApp deep link with a prefilled message.
export const waLink = (phone: string, message: string): string =>
  `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`

// Valid Bangladeshi mobile: 11 digits "01[3-9]XXXXXXXX", optionally with a
// 880 or +880 country prefix. Empty is treated as valid (the field is optional).
export const isValidBdPhone = (raw: string): boolean => {
  const s = (raw || '').trim()
  if (!s) return true
  const digits = s.replace(/\D/g, '')
  return /^01[3-9]\d{8}$/.test(digits) || /^8801[3-9]\d{8}$/.test(digits)
}
