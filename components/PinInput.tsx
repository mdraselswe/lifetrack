'use client'

import { useRef, type KeyboardEvent, type ClipboardEvent } from 'react'

interface PinInputProps {
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  length?: number
  error?: boolean
  autoFocus?: boolean
  ariaLabel?: string
}

// OTP-style split PIN entry: one box per digit, auto-advances on fill, and
// backspaces to the previous box when empty. `value` is the combined digits
// string owned by the parent. Digits are masked (type=password).
export default function PinInput({
  value,
  onChange,
  onComplete,
  length = 4,
  error = false,
  autoFocus = false,
  ariaLabel,
}: PinInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length }, (_, i) => value[i] || '')

  const focusBox = (i: number) => {
    const el = refs.current[i]
    if (el) { el.focus(); el.select() }
  }

  const setDigit = (i: number, d: string) => {
    const next = digits.slice()
    next[i] = d
    const joined = next.join('').slice(0, length)
    onChange(joined)
    return joined
  }

  const handleChange = (i: number, raw: string) => {
    const d = raw.replace(/\D/g, '').slice(-1) // keep only the last typed digit
    if (!d) {
      // Cleared the box.
      setDigit(i, '')
      return
    }
    const joined = setDigit(i, d)
    if (i < length - 1) focusBox(i + 1)
    if (joined.length === length && !joined.includes('') && joined.replace(/\D/g, '').length === length) {
      onComplete?.(joined)
    }
  }

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[i]) {
        setDigit(i, '')
      } else if (i > 0) {
        setDigit(i - 1, '')
        focusBox(i - 1)
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      focusBox(i - 1)
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      focusBox(i + 1)
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    onChange(pasted)
    const lastIdx = Math.min(pasted.length, length) - 1
    focusBox(lastIdx)
    if (pasted.length === length) onComplete?.(pasted)
  }

  return (
    <div className="flex gap-2 justify-center" dir="ltr">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={1}
          value={d}
          autoFocus={autoFocus && i === 0}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          aria-label={ariaLabel ? `${ariaLabel} ${i + 1}` : undefined}
          className={`input w-12 h-14 text-center text-2xl p-0 ${error ? 'input-error' : ''}`}
        />
      ))}
    </div>
  )
}
