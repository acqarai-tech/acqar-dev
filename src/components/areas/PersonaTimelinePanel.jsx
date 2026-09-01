import StatGrid from '../widgets/StatGrid'
import KeyValueList from '../widgets/KeyValueList'
import DataTable from '../widgets/DataTable'
import BarChart from '../widgets/BarChart'
import TrendChart from '../widgets/TrendChart'
import DonutChart from '../widgets/DonutChart'
import CompositionBars from '../widgets/CompositionBars'
import FlagStatList from '../widgets/FlagStatList'
import Timeline from '../widgets/Timeline'
import ProjectGrid from '../widgets/ProjectGrid'
import VerdictPanel from '../widgets/VerdictPanel'

// Price history + (when available) transaction volume, combined into one
// tab-switching chart instead of two separate static ones.
function buildPastTrendMetrics(profile) {
  const priceData = profile.priceHistory
  const priceChangePct = (((priceData[priceData.length - 1].value - priceData[0].value) / priceData[0].value) * 100).toFixed(1)
  const metrics = [
    {
      key: 'price',
      label: 'Price / sqft',
      value: `AED ${priceData[priceData.length - 1].value.toLocaleString()}`,
      change: `${Math.abs(priceChangePct)}%`,
      changeDirection: priceChangePct < 0 ? 'down' : 'up',
      data: priceData,
      valuePrefix: 'AED ',
      valueSuffix: '/sqft',
      title: `${profile.name} price per sqft — 5 year history`,
      subtitle: 'Truvalu™ benchmark',
    },
  ]
  const tv = profile.present?.transactionVolume
  if (tv) {
    const vals = tv.data.map((d) => d.value)
    const changePct = (((vals[vals.length - 1] - vals[0]) / vals[0]) * 100).toFixed(1)
    metrics.push({
      key: 'volume',
      label: 'Transaction Volume',
      value: vals[vals.length - 1].toLocaleString(),
      change: `${Math.abs(changePct)}%`,
      changeDirection: changePct < 0 ? 'down' : 'up',
      data: tv.data,
      band: tv.band,
      title: 'Monthly transaction volume — last 12 months',
      subtitle: tv.subtitle,
    })
  }
  return metrics
}

function PastTrendChart({ profile }) {
  return <TrendChart metrics={buildPastTrendMetrics(profile)} />
}

// Features the first composition pair as a hero donut, keeps the rest as
// the existing compact bars beside it.
function CompositionSection({ pairs, title, subtitle }) {
  const [hero, ...rest] = pairs
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <DonutChart
        data={[
          { label: hero.leftLabel, value: hero.leftValue },
          { label: hero.rightLabel, value: hero.rightValue },
        ]}
        title={title}
        subtitle={subtitle}
      />
      {rest.length > 0 && <CompositionBars pairs={rest} title="Unit & tenant mix" subtitle={subtitle} />}
    </div>
  )
}

function ratingStars(count) {
  return '★★★★★'.slice(0, count) + '☆☆☆☆☆'.slice(count)
}

const SIGNAL_STYLES = { Fair: 'text-ink', Premium: 'text-accent-dark', Opportunity: 'text-accent' }

function DeveloperTable({ developers }) {
  return (
    <DataTable
      title="Developer delivery track record"
      meta="Market research"
      columns={developers.columns}
      rows={developers.rows}
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
  )
}

function ResilienceTable({ resilience, areaName }) {
  return (
    <DataTable
      title={`How ${areaName} survived every past shock`}
      meta="DLD + historical data"
      columns={resilience.columns}
      rows={resilience.rows}
      highlightRow={resilience.rows.length - 1}
    />
  )
}

function Labeled({ label, children }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
      {children}
    </div>
  )
}

function AreaMaturity({ maturity }) {
  return (
    <Labeled label="Area maturity">
      <KeyValueList items={maturity} />
    </Labeled>
  )
}

function CatalystScoreCard({ catalystScore }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-md)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Catalyst score</p>
      <p className="mt-1.5 text-4xl font-semibold tabular-nums tracking-[-0.02em] text-ink">
        {catalystScore.score}
        <span className="text-base font-medium text-muted">/100</span>
      </p>
      <div className="mt-4 flex flex-col divide-y divide-line border-t border-line">
        {catalystScore.facts.map((fact) => (
          <div key={fact.label} className="flex items-center justify-between gap-4 py-2.5">
            <p className="text-xs text-muted">{fact.label}</p>
            <p className="text-xs font-semibold text-ink">{fact.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// Every persona sees the same underlying area data, but curated to what
// that persona actually cares about at each point in the Past/Present/
// Future timeline — a first-time buyer's "Present" is fair pricing, an
// investor's is yield and composition, an owner's is "should I sell".
export default function PersonaTimelinePanel({ persona, tab, profile }) {
  if (persona === 'firstTime') {
    if (tab === 'past') {
      return (
        <div className="flex flex-col gap-5">
          <PastTrendChart profile={profile} />
          {profile.maturity && <AreaMaturity maturity={profile.maturity} />}
          {profile.resilience && <ResilienceTable resilience={profile.resilience} areaName={profile.name} />}
          {profile.developers && <DeveloperTable developers={profile.developers} />}
        </div>
      )
    }
    if (tab === 'present') {
      return (
        <div className="flex flex-col gap-5">
          <StatGrid items={profile.metrics} />
          {profile.pricing && <DataTable title={`What does buying in ${profile.name} actually cost?`} columns={profile.pricing.columns} rows={profile.pricing.rows} />}
          {profile.present?.composition && (
            <CompositionSection pairs={profile.present.composition} title="Live market composition" subtitle="DLD 2024–2026" />
          )}
          {profile.present?.rentRanges && <DataTable title="Annual rent ranges (AED)" columns={profile.present.rentRanges.columns} rows={profile.present.rentRanges.rows} />}
          {profile.present?.nationality && <FlagStatList items={profile.present.nationality} title="Who's buying here" subtitle="Last 90 days · DLD verified" />}
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-5">
        {profile.future && <Timeline events={profile.future.timeline} title="What's coming to the area" subtitle="Confirmed · Announced · Likely" />}
        {profile.future?.catalystScore && <CatalystScoreCard catalystScore={profile.future.catalystScore} />}
      </div>
    )
  }

  if (persona === 'investor') {
    const { investor } = profile
    if (tab === 'past') {
      return (
        <div className="flex flex-col gap-5">
          {profile.developers && <DeveloperTable developers={profile.developers} />}
          <PastTrendChart profile={profile} />
          {profile.maturity && <AreaMaturity maturity={profile.maturity} />}
          {profile.resilience && <ResilienceTable resilience={profile.resilience} areaName={profile.name} />}
        </div>
      )
    }
    if (tab === 'present') {
      return (
        <div className="flex flex-col gap-5">
          <StatGrid items={investor.stats} columns={4} />
          <CompositionSection pairs={investor.composition} title="Market composition — investor view" subtitle="DLD 2024–2026" />
          <DataTable
            title="Truvalu™ benchmark vs asking price"
            meta="RICS-aligned"
            columns={investor.benchmark.columns}
            rows={investor.benchmark.rows}
            renderCell={(cell, ri, ci) => (ci === investor.benchmark.columns.length - 1 ? <span className={`font-semibold ${SIGNAL_STYLES[cell] ?? ''}`}>{cell}</span> : cell)}
          />
          {profile.present?.nationality && <FlagStatList items={profile.present.nationality} title={`Who is buying in ${profile.name}?`} subtitle="Last 90 days · DLD verified" />}
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_260px]">
          <BarChart data={investor.rentalYield.data.map((d) => ({ ...d, showValue: true }))} valueFormatter={(v) => `${v}%`} title="Rental yield by unit type" subtitle={`Dubai avg ${investor.rentalYield.dubaiAvg}%`} />
          <KeyValueList items={investor.rentalYield.facts} />
        </div>
        {profile.future && (
          <>
            <Timeline events={profile.future.timeline} title="Infrastructure & catalyst timeline" subtitle="Confirmed · Announced · Likely" />
            {profile.future.catalystScore && <CatalystScoreCard catalystScore={profile.future.catalystScore} />}
            <Labeled label="Off-plan supply — delivery risk">
              <StatGrid items={profile.future.supply} columns={4} dense />
            </Labeled>
            <ProjectGrid projects={profile.future.projects} title={`Active off-plan projects in ${profile.name}`} meta={`${profile.future.projects.length} total`} />
          </>
        )}
      </div>
    )
  }

  // owner
  const { owner } = profile
  if (tab === 'past') {
    return (
      <div className="flex flex-col gap-5">
        <PastTrendChart profile={profile} />
        {profile.maturity && <AreaMaturity maturity={profile.maturity} />}
        {profile.resilience && <ResilienceTable resilience={profile.resilience} areaName={profile.name} />}
        {profile.developers && <DeveloperTable developers={profile.developers} />}
      </div>
    )
  }
  if (tab === 'present') {
    return (
      <div className="flex flex-col gap-5">
        <div className="rounded-2xl border border-accent/20 bg-[#fdf8f2] p-5 shadow-[var(--shadow-md)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-dark">Your asset · Truvalu™ valuation</p>
          <p className="mt-1.5 text-lg font-semibold text-ink">
            {owner.asset.unitLabel} is worth {owner.asset.valueRange}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink/70">{owner.asset.note}</p>
          <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-2 border-t border-accent/15 pt-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Truvalu™ fair value</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-[-0.02em] text-ink">{owner.asset.fairValue}</p>
            </div>
            {owner.asset.deltas.map((d) => (
              <p key={d.label} className="text-sm text-accent-dark">
                <span className="font-semibold">{d.value}</span> <span className="text-muted">{d.label}</span>
              </p>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <VerdictPanel {...owner.sell} />
          <VerdictPanel {...owner.rent} />
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-5">
      {profile.future && <Timeline events={profile.future.timeline} title="What's coming — and how it affects your property" subtitle="Confirmed · Announced · Likely" />}
      {profile.future?.catalystScore && <CatalystScoreCard catalystScore={profile.future.catalystScore} />}
      <Labeled label="Your area vs Dubai average">
        <KeyValueList items={owner.areaVsDubai} />
      </Labeled>
    </div>
  )
}
