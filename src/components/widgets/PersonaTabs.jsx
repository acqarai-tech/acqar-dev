// Compact persona tab row — deliberately slim (icon + label only, no
// description) so it stays comfortable as a permanently-stuck bar rather
// than the bulkier description-card layout it used before.
export default function PersonaTabs({ personas, active, onChange, className = '' }) {
  return (
    <div className={`flex items-center gap-1 overflow-x-auto ${className}`}>
      {personas.map((p) => {
        const isActive = p.key === active
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onChange(p.key)}
            className={`flex shrink-0 cursor-pointer items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              isActive ? 'border-accent text-accent-dark' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <p.Icon weight={isActive ? 'fill' : 'regular'} size={16} />
            {p.label}
          </button>
        )
      })}
    </div>
  )
}
