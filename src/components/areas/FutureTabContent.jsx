import Timeline from '../widgets/Timeline'
import StatGrid from '../widgets/StatGrid'
import ProjectGrid from '../widgets/ProjectGrid'

export default function FutureTabContent({ future, areaName }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
        <Timeline events={future.timeline} title="Infrastructure & catalyst timeline" subtitle="Confirmed · Announced · Likely" />

        <div className="rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-md)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Catalyst score</p>
          <p className="mt-1.5 text-4xl font-semibold tabular-nums tracking-[-0.02em] text-ink">
            {future.catalystScore.score}
            <span className="text-base font-medium text-muted">/100</span>
          </p>
          <div className="mt-4 flex flex-col divide-y divide-line border-t border-line">
            {future.catalystScore.facts.map((fact) => (
              <div key={fact.label} className="flex items-center justify-between gap-4 py-2.5">
                <p className="text-xs text-muted">{fact.label}</p>
                <p className="text-xs font-semibold text-ink">{fact.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <StatGrid items={future.supply} columns={4} dense />

      <ProjectGrid
        projects={future.projects}
        title={`Active off-plan projects in ${areaName}`}
        meta={`${future.projects.length} total`}
      />
    </div>
  )
}
