import BigMetricCallout from '../widgets/BigMetricCallout'
import BarChart from '../widgets/BarChart'
import CompositionBars from '../widgets/CompositionBars'
import DataTable from '../widgets/DataTable'
import FlagStatList from '../widgets/FlagStatList'

const STATUS_STYLES = {
  Fair: 'text-ink',
  Premium: 'text-accent-dark',
  Opportunity: 'text-accent',
}

export default function PresentTabContent({ present }) {
  return (
    <div className="flex flex-col gap-5">
      <BigMetricCallout value={present.distress.value} label="Distress meter" body={present.distress.body} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <BarChart
          data={present.transactionVolume.data}
          band={present.transactionVolume.band}
          title="Transaction volume — last 12 months"
          subtitle={present.transactionVolume.subtitle}
        />
        <CompositionBars pairs={present.composition} title="Live market composition" subtitle="DLD 2024–2026" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <DataTable title="Annual rent ranges (AED)" columns={present.rentRanges.columns} rows={present.rentRanges.rows} />
        <DataTable
          title="Truvalu™ benchmark — current"
          columns={present.benchmark.columns}
          rows={present.benchmark.rows}
          renderCell={(cell, ri, ci) =>
            ci === present.benchmark.columns.length - 1 ? (
              <span className={`font-semibold ${STATUS_STYLES[cell] ?? ''}`}>{cell}</span>
            ) : (
              cell
            )
          }
        />
      </div>

      <FlagStatList items={present.nationality} title="Buyer nationality" subtitle="Last 90 days · DLD verified" />
    </div>
  )
}
