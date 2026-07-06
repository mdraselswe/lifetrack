import { describe, it, expect } from 'vitest'
import { round2, toBnDigits, toBnNumber, num } from './format'

describe('round2', () => {
  it('fixes floating-point artifacts from summation', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3)
    expect(round2(100.30000000000001)).toBe(100.3)
  })

  it('handles negative numbers', () => {
    expect(round2(-100.30000000000001)).toBe(-100.3)
    expect(round2(-0.1 - 0.2)).toBe(-0.3)
    // Math.round is half-up (toward +Infinity), so a negative .5 boundary
    // rounds toward zero: -255.5 -> -255, i.e. -2.555 -> -2.55.
    expect(round2(-2.555)).toBe(-2.55)
  })

  it('returns 0 for non-finite input', () => {
    expect(round2(NaN)).toBe(0)
    expect(round2(Infinity)).toBe(0)
    expect(round2(-Infinity)).toBe(0)
  })

  it('passes integers through unchanged', () => {
    expect(round2(0)).toBe(0)
    expect(round2(5)).toBe(5)
    expect(round2(-42)).toBe(-42)
  })
})

describe('toBnDigits', () => {
  it('converts all Latin digits to Bengali numerals', () => {
    expect(toBnDigits('0123456789')).toBe('০১২৩৪৫৬৭৮৯')
  })

  it('converts only the digits in mixed strings', () => {
    expect(toBnDigits('abc123')).toBe('abc১২৩')
    expect(toBnDigits('2026-07-05')).toBe('২০২৬-০৭-০৫')
  })

  it('leaves digit-free strings unchanged', () => {
    expect(toBnDigits('hello')).toBe('hello')
    expect(toBnDigits('')).toBe('')
  })
})

describe('toBnNumber', () => {
  it('applies Indian (lakh) grouping with Bengali digits', () => {
    expect(toBnNumber(101000)).toBe('১,০১,০০০')
    expect(toBnNumber(1000)).toBe('১,০০০')
    expect(toBnNumber(0)).toBe('০')
  })

  it('caps at 2 decimal places', () => {
    expect(toBnNumber(1234.5678)).toBe('১,২৩৪.৫৭')
    expect(toBnNumber(1234.5)).toBe('১,২৩৪.৫')
  })

  it('renders non-finite input as ০', () => {
    expect(toBnNumber(NaN)).toBe('০')
    expect(toBnNumber(Infinity)).toBe('০')
  })
})

describe('num (amount coercion)', () => {
  it('passes finite numbers through', () => {
    expect(num(1000)).toBe(1000)
    expect(num(0)).toBe(0)
    expect(num(12.5)).toBe(12.5)
  })
  it('coerces numeric strings', () => {
    expect(num('1000')).toBe(1000)
    expect(num('12.50')).toBe(12.5)
  })
  it('returns 0 for garbage / non-finite / nullish', () => {
    expect(num('')).toBe(0)
    expect(num('abc')).toBe(0)
    expect(num(undefined)).toBe(0)
    expect(num(null)).toBe(0)
    expect(num(NaN)).toBe(0)
    expect(num(Infinity)).toBe(0)
  })
  it('parses leading-numeric strings like parseFloat', () => {
    expect(num('100abc')).toBe(100)
  })
})
