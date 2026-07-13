// Product wordmark (text logo). A rounded accent tile "L" mark + a two-tone
// "LifeTrack" wordmark. `size` scales the whole lockup for headers vs. auth pages.
interface WordmarkProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  sm: { mark: 'h-7 w-7 rounded-lg', text: 'text-lg' },
  md: { mark: 'h-8 w-8 rounded-xl', text: 'text-xl' },
  lg: { mark: 'h-11 w-11 rounded-2xl', text: 'text-2xl' },
}

export default function Wordmark({ size = 'sm', className = '' }: WordmarkProps) {
  const s = SIZES[size]
  return (
    <span className={`inline-flex items-center gap-2 select-none ${className}`} aria-label="LifeTrack">
      {/* App icon = the favicon / PWA icon, so brand mark matches the installed app */}
      <img
        src="/icon-192x192.png"
        alt=""
        aria-hidden="true"
        className={`shrink-0 object-contain shadow-card ${s.mark}`}
      />
      <span className={`font-extrabold tracking-tight leading-none text-content ${s.text}`}>
        Life<span className="text-accent">Track</span>
      </span>
    </span>
  )
}
