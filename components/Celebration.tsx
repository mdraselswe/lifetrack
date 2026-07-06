'use client'

import { useEffect, useState } from 'react'
import { onCelebrate } from '@/lib/celebrate'

// One-shot confetti burst overlay, fired via celebrate() when a debt/loan is
// fully paid off. Pointer-events none; auto-clears after the animation.

type Particle = { id: number; dx: number; dy: number; rot: number; color: string; size: number; delay: number }
type Burst = { id: number; particles: Particle[] }

const COLORS = ['var(--accent)', 'var(--positive)', 'var(--caution)', '#f472b6', '#38bdf8']

const makeBurst = (): Burst => {
  const particles: Particle[] = Array.from({ length: 26 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 26 + Math.random() * 0.5
    const dist = 90 + Math.random() * 130
    return {
      id: i,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist * 0.75 + 130, // drift downward
      rot: (Math.random() - 0.5) * 540,
      color: COLORS[i % COLORS.length],
      size: 6 + Math.random() * 6,
      delay: Math.random() * 0.12,
    }
  })
  return { id: Date.now() + Math.random(), particles }
}

export default function CelebrationContainer() {
  const [bursts, setBursts] = useState<Burst[]>([])

  useEffect(() => {
    return onCelebrate(() => {
      if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
      const burst = makeBurst()
      setBursts((prev) => [...prev, burst])
      setTimeout(() => setBursts((prev) => prev.filter((b) => b.id !== burst.id)), 1600)
    })
  }, [])

  if (bursts.length === 0) return null

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
    </div>
  )
}
