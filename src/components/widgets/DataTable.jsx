// Generic responsive data table — pricing tiers, developer track records,
// the resilience report, anything column/row shaped. Only the table itself
// scrolls horizontally on narrow screens, never the page (per the site's
// established mobile-table convention). Pass `renderCell` for custom cells
// (star ratings, colored deltas); otherwise cells render as plain text.
export default function DataTable({ columns, rows, renderCell, highlightRow, title, meta, className = '' }) {
  return (
    <div className={`rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-md)] ${className}`}>
      {(title || meta) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && <p className="text-sm font-semibold text-ink">{title}</p>}
          {meta && <span className="rounded-full border border-line px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{meta}</span>}
        </div>
      )}
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-accent/15 bg-[#fdf8f2] text-left text-ink/70">
              {columns.map((col, i) => (
                <th
                  key={col}
                  className={`whitespace-nowrap px-6 py-3 text-xs font-semibold uppercase tracking-[0.06em] first:rounded-l-lg first:pl-4 last:rounded-r-lg last:pr-4 ${i > 0 ? 'text-right' : ''}`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className={`border-b border-line/60 last:border-0 ${highlightRow === ri ? 'bg-[#fdf8f2]' : ''}`}
              >
                {row.map((cell, ci) => (
                  <td key={ci} className={`whitespace-nowrap px-6 py-3 align-top first:pl-4 last:pr-4 ${ci > 0 ? 'text-right' : 'font-medium text-ink'}`}>
                    {renderCell ? renderCell(cell, ri, ci) : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
