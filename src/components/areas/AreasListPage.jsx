import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MagnifyingGlass, ArrowRight } from '@phosphor-icons/react'
import Nav from '../Nav'
import Footer from '../Footer'
import MobileTabBar from '../MobileTabBar'
import FloatingAdvisorButton from '../FloatingAdvisorButton'
import VerdictBadge from '../widgets/VerdictBadge'
import { fetchAreaList } from '../../data/areas'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'Buy', label: 'Buy' },
  { key: 'Watch', label: 'Watch' },
  { key: 'Hold', label: 'Hold' },
]

function AreaCard({ area }) {
  return (
    <Link
      to={`/areas/${area.slug}`}
      className="group flex items-center justify-between gap-3 rounded-2xl border border-line bg-white px-5 py-4 shadow-[var(--shadow-xs)] transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-[var(--shadow-md)]"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{area.name}</p>
        <p className="mt-1 text-sm tabular-nums text-muted">
          <span className="font-semibold text-accent-dark">{area.score.toFixed(1)}</span>/10
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <VerdictBadge verdict={area.verdict} />
        <ArrowRight
          size={15}
          weight="bold"
          className="text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent-dark"
        />
      </div>
    </Link>
  )
}

export default function AreasListPage() {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [areaList, setAreaList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    fetchAreaList().then((list) => {
      if (!mounted) return
      setAreaList(list)
      setLoading(false)
    })
    return () => { mounted = false }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return areaList.filter((a) => {
      const matchesFilter = filter === 'all' || a.verdict === filter
      const matchesSearch = !q || a.name.toLowerCase().includes(q)
      return matchesFilter && matchesSearch
    })
  }, [areaList, filter, search])

  return (
    <div className="bg-cream text-ink pb-24 md:pb-0">
      <Nav />

      <section className="grain relative px-6 pt-32 pb-20 sm:pt-40">
        <div className="mx-auto max-w-[1120px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-dark">
            Area reports
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-4xl">
            Every Dubai area, scored.
          </h1>
          <p className="mt-2 max-w-[560px] text-base leading-relaxed text-muted">
          A live Buy, Watch, or Hold signal for {areaList.length} Dubai neighborhoods — backed by real transaction data, not guesswork.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 overflow-x-auto">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                    filter === f.key
                      ? 'bg-ink text-white shadow-[var(--shadow-xs)]'
                      : 'border border-line bg-white text-ink/70 hover:bg-accent/5 hover:text-accent-dark'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 shadow-[var(--shadow-xs)] focus-within:border-accent/40 sm:w-[280px]">
              <MagnifyingGlass size={16} className="shrink-0 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search areas…"
                className="w-full bg-transparent text-base text-ink placeholder:text-muted focus:outline-none sm:text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="mt-6 flex items-center justify-center rounded-[28px] border border-dashed border-line bg-white/60 px-6 py-16 text-center text-sm text-muted">
              Loading live area scores…
            </div>
          ) : filtered.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((area) => (
                <AreaCard key={area.slug} area={area} />
              ))}
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center rounded-[28px] border border-dashed border-line bg-white/60 px-6 py-16 text-center">
              <p className="text-lg font-semibold text-ink">No areas match</p>
              <p className="mt-1.5 text-sm text-muted">Try a different search term or filter.</p>
            </div>
          )}
        </div>
      </section>

      <Footer />
      <MobileTabBar />
      <FloatingAdvisorButton />
    </div>
  )
}
