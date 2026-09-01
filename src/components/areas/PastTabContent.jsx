import PriceHistoryChart from '../widgets/PriceHistoryChart'
import KeyValueList from '../widgets/KeyValueList'
import DataTable from '../widgets/DataTable'

function ratingStars(count) {
  return '★★★★★'.slice(0, count) + '☆☆☆☆☆'.slice(count)
}

export default function PastTabContent({ profile }) {
  return (
    <div className="flex flex-col gap-5">
      <PriceHistoryChart
        data={profile.priceHistory}
        valueSuffix="/sqft"
        title={`${profile.name} price per sqft — 5 year history`}
        subtitle="Truvalu™ benchmark"
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {profile.maturity && <KeyValueList items={profile.maturity} />}
        {profile.developers && (
          <DataTable
            title="Developer delivery track record"
            meta="Market research"
            columns={profile.developers.columns}
            rows={profile.developers.rows}
            renderCell={(cell, ri, ci) => {
              if (ci === 1) {
                const pct = parseFloat(cell)
                return (
                  <span className="flex items-center justify-end gap-2">
                    <span className="h-1.5 w-12 overflow-hidden rounded-full bg-[#fdf8f2]">
                      <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="tabular-nums">{cell}</span>
                  </span>
                )
              }
              if (ci === 3) return <span className="tracking-tight text-accent-dark">{ratingStars(cell)}</span>
              return cell
            }}
          />
        )}
      </div>

      {profile.resilience && (
        <DataTable
          title={`How ${profile.name} survived every past shock`}
          meta="DLD + historical data"
          columns={profile.resilience.columns}
          rows={profile.resilience.rows}
          highlightRow={profile.resilience.rows.length - 1}
        />
      )}
    </div>
  )
}
