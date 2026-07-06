// Flat, unDraw-style illustrations drawn inline so colors come from the app's
// CSS tokens — they adapt to light/dark automatically and add zero network
// cost. Gentle motion via the .ill-float/.ill-sway classes (reduced-motion safe).

type IllProps = { className?: string; tone?: 'accent' | 'pos' | 'neg' }

const toneVar = (tone: IllProps['tone']) =>
  tone === 'pos' ? 'var(--positive)' : tone === 'neg' ? 'var(--negative)' : 'var(--accent)'

// Wallet with floating coins — empty money lists / dashboard.
export function MoneyIllustration({ className = '', tone = 'accent' }: IllProps) {
  const c = toneVar(tone)
  return (
    <svg viewBox="0 0 200 140" fill="none" className={className} aria-hidden="true">
      <ellipse cx="100" cy="74" rx="86" ry="58" fill={c} opacity="0.08" />
      <ellipse cx="100" cy="122" rx="56" ry="7" fill="var(--muted)" opacity="0.15" />
      {/* wallet */}
      <g>
        <rect x="55" y="58" width="90" height="58" rx="10" fill={c} opacity="0.85" />
        <rect x="55" y="50" width="74" height="20" rx="8" fill={c} />
        <rect x="112" y="76" width="33" height="22" rx="7" fill="var(--surface)" />
        <circle cx="123" cy="87" r="4.5" fill={c} />
      </g>
      {/* floating coins */}
      <g className="ill-float">
        <circle cx="58" cy="34" r="13" fill="var(--caution)" opacity="0.9" />
        <circle cx="58" cy="34" r="8.5" fill="var(--caution)" opacity="0.5" />
        <text x="58" y="39" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--surface)">৳</text>
      </g>
      <g className="ill-float ill-delay-1">
        <circle cx="148" cy="30" r="10" fill={c} opacity="0.85" />
        <text x="148" y="34.5" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--surface)">৳</text>
      </g>
      <g className="ill-float ill-delay-2">
        <circle cx="103" cy="18" r="6.5" fill="var(--positive)" opacity="0.8" />
      </g>
      {/* sparkles */}
      <path d="M30 62l2.4 5.4 5.4 2.4-5.4 2.4L30 77.6l-2.4-5.4-5.4-2.4 5.4-2.4z" fill={c} opacity="0.45" />
      <path d="M172 56l1.8 4 4 1.8-4 1.8-1.8 4-1.8-4-4-1.8 4-1.8z" fill="var(--caution)" opacity="0.5" />
    </svg>
  )
}

// Bell with clock — empty reminders.
export function BellIllustration({ className = '' }: IllProps) {
  return (
    <svg viewBox="0 0 200 140" fill="none" className={className} aria-hidden="true">
      <ellipse cx="100" cy="74" rx="86" ry="58" fill="var(--accent)" opacity="0.08" />
      <ellipse cx="100" cy="122" rx="48" ry="7" fill="var(--muted)" opacity="0.15" />
      {/* bell */}
      <g className="ill-sway">
        <path d="M100 34c-19 0-30 14-30 32v14l-9 14h78l-9-14V66c0-18-11-32-30-32z" fill="var(--accent)" />
        <path d="M100 34c-19 0-30 14-30 32v14l-9 14h39V34z" fill="var(--accent)" opacity="0.75" />
        <circle cx="100" cy="30" r="5" fill="var(--accent)" />
        <path d="M91 100a9 9 0 0 0 18 0z" fill="var(--accent)" opacity="0.9" />
      </g>
      {/* rings */}
      <g className="ill-float">
        <path d="M146 44a26 26 0 0 0-8-16" stroke="var(--caution)" strokeWidth="5" strokeLinecap="round" />
        <path d="M54 44a26 26 0 0 1 8-16" stroke="var(--caution)" strokeWidth="5" strokeLinecap="round" />
      </g>
      {/* clock */}
      <g className="ill-float ill-delay-1">
        <circle cx="152" cy="92" r="17" fill="var(--surface)" stroke="var(--positive)" strokeWidth="4" />
        <path d="M152 84v9l6 4" stroke="var(--positive)" strokeWidth="3.5" strokeLinecap="round" />
      </g>
    </svg>
  )
}

// Magnifier over papers — no search results.
export function NoResultsIllustration({ className = '' }: IllProps) {
  return (
    <svg viewBox="0 0 200 120" fill="none" className={className} aria-hidden="true">
      <ellipse cx="100" cy="62" rx="78" ry="48" fill="var(--accent)" opacity="0.07" />
      {/* paper */}
      <rect x="62" y="28" width="60" height="72" rx="8" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
      <rect x="72" y="42" width="40" height="5" rx="2.5" fill="var(--muted)" opacity="0.4" />
      <rect x="72" y="54" width="30" height="5" rx="2.5" fill="var(--muted)" opacity="0.3" />
      <rect x="72" y="66" width="36" height="5" rx="2.5" fill="var(--muted)" opacity="0.3" />
      {/* magnifier */}
      <g className="ill-sway">
        <circle cx="124" cy="72" r="20" fill="var(--accent)" opacity="0.12" />
        <circle cx="124" cy="72" r="20" stroke="var(--accent)" strokeWidth="5" />
        <path d="M139 87l14 14" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round" />
        <path d="M118 68l12 9m0-9l-12 9" stroke="var(--negative)" strokeWidth="3.5" strokeLinecap="round" />
      </g>
    </svg>
  )
}

// Phone with taka + shield — auth pages hero.
export function FinanceHeroIllustration({ className = '' }: IllProps) {
  return (
    <svg viewBox="0 0 220 150" fill="none" className={className} aria-hidden="true">
      <ellipse cx="110" cy="80" rx="96" ry="62" fill="var(--accent)" opacity="0.08" />
      <ellipse cx="110" cy="136" rx="58" ry="7" fill="var(--muted)" opacity="0.15" />
      {/* phone */}
      <rect x="78" y="22" width="64" height="112" rx="12" fill="var(--surface)" stroke="var(--accent)" strokeWidth="4" />
      <rect x="88" y="40" width="44" height="26" rx="6" fill="var(--accent)" opacity="0.9" />
      <text x="110" y="58" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--surface)">৳</text>
      <rect x="88" y="74" width="44" height="7" rx="3.5" fill="var(--positive)" opacity="0.55" />
      <rect x="88" y="87" width="32" height="7" rx="3.5" fill="var(--negative)" opacity="0.45" />
      <rect x="88" y="100" width="38" height="7" rx="3.5" fill="var(--muted)" opacity="0.3" />
      {/* shield check */}
      <g className="ill-float">
        <path d="M164 44c10 4 18 4 18 4s1 24-18 34c-19-10-18-34-18-34s8 0 18-4z" fill="var(--positive)" />
        <path d="M156 62l6 6 11-12" stroke="var(--surface)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
      {/* coin */}
      <g className="ill-float ill-delay-2">
        <circle cx="56" cy="46" r="12" fill="var(--caution)" opacity="0.9" />
        <text x="56" y="51" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--surface)">৳</text>
      </g>
      <path d="M42 92l2.2 5 5 2.2-5 2.2-2.2 5-2.2-5-5-2.2 5-2.2z" fill="var(--accent)" opacity="0.5" />
    </svg>
  )
}
