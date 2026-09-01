import { useState } from 'react'

// Animated segmented donut with hover-to-highlight and a center value that
// morphs to whichever segment is hovered — reads as a much stronger focal
// visual than a stack of flat composition bars. Segment colors stay within
// the copper/accent family (full accent for the lead segment, fading
// tints for the rest) rather than an arbitrary rainbow.
const SEGMENT_COLORS = ['var(--color-accent)', 'var(--color-accent-dark)', '#d4a574', '#e8c9a0', 'var(--color-line)']

export default function DonutChart({ data, title, subtitle, className = '' }) {
  const [hovered, setHovered] = useState(null)
  const size = 200
  const strokeWidth = 26
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const total = data.reduce((sum, d) => sum + d.value, 0)

  let offsetSoFar = 0
  const segments = data.map((d, i) => {
    const fraction = d.value / total
    const dash = fraction * circumference
    const segment = { ...d, dash, offset: offsetSoFar, color: d.color ?? SEGMENT_COLORS[i % SEGMENT_COLORS.length], index: i }
    offsetSoFar += dash
    return segment
  })

  // Default to the lead (first) segment rather than the sum — our data is
  // already percentage pairs, so a "total" readout would just read 100%.
  const active = segments[hovered ?? 0]

  return (
    <div className={`rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-md)] ${className}`}>
      {(title || subtitle) && (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          {title && <p className="text-sm font-semibold text-ink">{title}</p>}
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
      )}
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center sm:gap-10">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-line)" strokeWidth={strokeWidth} opacity="0.4" />
            {segments.map((s) => (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth={hovered === s.index ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={`${s.dash} ${circumference - s.dash}`}
                strokeDashoffset={-s.offset}
                strokeLinecap="butt"
                className="cursor-pointer transition-all duration-300"
                style={{
                  opacity: hovered == null || hovered === s.index ? 1 : 0.35,
                  transitionProperty: 'opacity, stroke-width',
                }}
                onMouseEnter={() => setHovered(s.index)}
                onMouseLeave={() => setHovered(null)}
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="max-w-[110px] truncate text-xs font-medium text-muted">{active.label}</p>
            <p className="text-3xl font-semibold tabular-nums tracking-[-0.02em] text-ink">{active.value}%</p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:min-w-[180px]">
          {segments.map((s) => (
            <button
              key={s.label}
              type="button"
              onMouseEnter={() => setHovered(s.index)}
              onMouseLeave={() => setHovered(null)}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                hovered === s.index ? 'bg-[#fdf8f2]' : 'hover:bg-ink/[0.02]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-sm text-ink/80">{s.label}</span>
              </span>
              <span className="text-sm font-semibold tabular-nums text-ink">{s.value}%</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
