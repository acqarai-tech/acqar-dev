// Generic metric-card grid — label, big value, small note. Used across the
// area detail page (key metrics, area maturity) and reusable anywhere else
// a "row of stats" is needed (e.g. a future chat rich-answer variant).
// Hover tint stays within the copper/accent family (no traffic-light
// colors) — positive metrics warm toward accent, caution toward the
// darker burnt-copper "caution" tone already used for its text.
const TONE_STYLES = {
  positive: { text: 'text-accent-dark', hover: 'hover:border-accent/30 hover:bg-accent/5' },
  caution: { text: 'text-[#b5502e]', hover: 'hover:border-[#b5502e]/25 hover:bg-[#b5502e]/5' },
  default: { text: 'text-ink', hover: 'hover:border-line hover:bg-ink/[0.02]' },
}

export default function StatGrid({ items, columns = 3, dense = false }) {
  const gridCols =
    columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : columns === 4
        ? 'grid-cols-2 sm:grid-cols-4'
        : 'grid-cols-2 sm:grid-cols-3'

  return (
    <div className={`grid gap-3 ${gridCols}`}>
      {items.map((item) => {
        const tone = TONE_STYLES[item.tone] ?? TONE_STYLES.default
        return (
          <div
            key={item.label}
            className={`rounded-2xl border border-line bg-white shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] ${tone.hover} ${dense ? 'px-4 py-3' : 'px-5 py-4'} ${item.wide ? 'col-span-full' : ''}`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{item.label}</p>
            <p className={`mt-1.5 font-semibold tabular-nums tracking-[-0.02em] ${dense ? 'text-lg' : 'text-2xl'} ${tone.text}`}>
              {item.value}
            </p>
            {item.note && <p className="mt-1 text-xs leading-snug text-muted">{item.note}</p>}
          </div>
        )
      })}
    </div>
  )
}
