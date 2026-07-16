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
