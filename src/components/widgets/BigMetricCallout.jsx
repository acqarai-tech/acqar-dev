// Single oversized stat + narrative — the "Distress Meter" pattern, but
// generic enough for any headline-number-plus-explanation moment.
export default function BigMetricCallout({ value, label, body, className = '' }) {
  return (
    <div className={`flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-xs)] sm:flex-row sm:items-center ${className}`}>
      <div className="shrink-0 text-center sm:text-left">
        <p className="text-4xl font-semibold tabular-nums tracking-[-0.02em] text-accent-dark">{value}</p>
        {label && <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>}
      </div>
      <div className="hidden h-12 w-px shrink-0 bg-line sm:block" />
      <p className="text-sm leading-relaxed text-ink/80">{body}</p>
    </div>
  )
}
