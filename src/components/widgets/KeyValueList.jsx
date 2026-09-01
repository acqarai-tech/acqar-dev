// Bordered label/value row list — area maturity facts, ownership costs, etc.
// Reusable anywhere a compact spec sheet is needed.
export default function KeyValueList({ items }) {
  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-white shadow-[var(--shadow-md)]">
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between gap-4 px-4 py-3">
          <p className="text-sm text-muted">{item.label}</p>
          <p className="text-sm font-semibold tabular-nums text-ink">{item.value}</p>
        </div>
      ))}
    </div>
  )
}
