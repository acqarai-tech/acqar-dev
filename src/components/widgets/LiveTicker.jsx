import { Circle } from '@phosphor-icons/react'

// Scrolling stat strip for the top of a live report — reuses the same
// marquee mechanics as DeveloperMarquee (mask-fade edges, seamless loop).
export default function LiveTicker({ label, items, className = '' }) {
  const track = [...items, ...items]

  return (
    <div className={`border-y border-line bg-white py-2 shadow-[var(--shadow-xs)] ${className}`}>
      <div
        className="marquee-track relative overflow-hidden"
        style={{
          maskImage: 'linear-gradient(90deg, transparent 0%, black 6%, black 94%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 6%, black 94%, transparent 100%)',
        }}
      >
        <div className="animate-marquee flex w-max items-center gap-8 whitespace-nowrap px-4">
          {label && (
            <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-accent-dark">
              <Circle weight="fill" size={7} className="animate-pulse text-accent" />
              {label}
            </span>
          )}
          {track.map((item, i) => (
            <span key={`${item.label}-${i}`} className="shrink-0 text-xs text-ink/70">
              <span className="text-muted">{item.label}: </span>
              <span className="font-semibold text-ink">{item.value}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
