'use client'

import { useEffect, useState } from 'react'
import { onCelebrate } from '@/lib/celebrate'

// One-shot confetti burst overlay, fired via celebrate() when a debt/loan is
// fully paid off. Pointer-events none; auto-clears after the animation.

type Particle = { id: number; dx: number; dy: number; rot: number; color: string; size: number; delay: number }
type Burst = { id: number; particles: Particle[] }

const COLORS = ['var(--accent)', 'var(--positive)', 'var(--caution)', '#f472b6', '#38bdf8']

// A richer burst (48 particles) for the bigger moment.
const makeBurst = (): Burst => {
  const N = 48
  const particles: Particle[] = Array.from({ length: N }, (_, i) => {
    const angle = (Math.PI * 2 * i) / N + Math.random() * 0.5
    const dist = 110 + Math.random() * 170
    return {
      id: i,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist * 0.75 + 150, // drift downward
      rot: (Math.random() - 0.5) * 540,
      color: COLORS[i % COLORS.length],
      size: 6 + Math.random() * 7,
      delay: Math.random() * 0.14,
    }
  })
  return { id: Date.now() + Math.random(), particles }
}

export default function CelebrationContainer() {
  const [bursts, setBursts] = useState<Burst[]>([])
  const [banner, setBanner] = useState<{ id: number; text: string } | null>(null)

  useEffect(() => {
    return onCelebrate((message) => {
      if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
      const burst = makeBurst()
      setBursts((prev) => [...prev, burst])
      setTimeout(() => setBursts((prev) => prev.filter((b) => b.id !== burst.id)), 1800)
      if (message) {
        const id = Date.now() + Math.random()
        setBanner({ id, text: message })
        setTimeout(() => setBanner((cur) => (cur && cur.id === id ? null : cur)), 2400)
      }
    })
  }, [])

  if (bursts.length === 0 && !banner) return null

  return (
    <div className="fixed inset-0 z-[100001] pointer-events-none overflow-hidden" aria-hidden="true">
      {bursts.map((b) => (
        <div key={b.id} className="absolute left-1/2 top-[38%]">
          {b.particles.map((p) => (
            <span
              key={p.id}
              className="confetti-p"
              style={{
                width: p.size,
                height: p.size * 0.55,
                backgroundColor: p.color,
                borderRadius: 2,
                animationDelay: `${p.delay}s`,
                ['--dx' as string]: `${p.dx}px`,
                ['--dy' as string]: `${p.dy}px`,
                ['--rot' as string]: `${p.rot}deg`,
              }}
            />
          ))}
        </div>
      ))}
      {banner && (
        <div className="absolute left-1/2 top-[30%] -translate-x-1/2 celebrate-banner">
          <div className="rounded-2xl px-5 py-3 shadow-pop text-center max-w-[80vw]" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="mx-auto mb-1" aria-hidden="true">
              <circle className="check-ring" cx="12" cy="12" r="10" stroke="var(--positive)" strokeWidth="2" strokeLinecap="round" />
              <path className="check-draw" d="M7.5 12.5l3 3 6-6.5" stroke="var(--positive)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm font-semibold text-content">{banner.text}</p>
          </div>
        </div>
      )}
    </div>
  )
}
