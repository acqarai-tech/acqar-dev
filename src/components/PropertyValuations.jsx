import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  Plus,
  ArrowSquareOut,
  ArrowRight,
  MagnifyingGlass,
  Funnel,
  ChartBar,
  Buildings,
  Sparkle,
  LockSimple,
} from '@phosphor-icons/react'
import Nav from './Nav'
import Footer from './Footer'
import MobileTabBar from './MobileTabBar'
import FloatingAdvisorButton from './FloatingAdvisorButton'

const NEW_VALUATION_URL = 'https://www.acqar.com/valuation'
const REPORT_URL_BASE = 'https://www.acqar.com/report'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'free', label: 'Free' },
  { key: 'paid', label: 'Paid' },
]

// Reference data only — for reviewing the populated card layout. Swap for
// real report data once the reports API/backend exists.
const SAMPLE_REPORTS = [
  {
    id: 1,
    building: 'Marina Gate 1',
    area: 'Dubai Marina',
    unit: '1BR · Unit 2104',
    value: 'AED 1,850,000',
    verdict: 'Buy',
    plan: 'free',
    date: '12 Aug 2026',
  },
  {
    id: 2,
    building: 'The Fields',
    area: 'Jumeirah Village Circle',
    unit: 'Studio · Unit 512',
    value: 'AED 620,000',
    verdict: 'Sell',
    plan: 'free',
    date: '28 Jul 2026',
  },
  {
    id: 3,
    building: 'Executive Towers',
    area: 'Business Bay',
    unit: '2BR · Unit 3311',
    value: 'AED 2,430,000',
    verdict: 'Invest',
    plan: 'paid',
    date: '05 Aug 2026',
  },
]

const VERDICT_STYLES = {
  Buy: 'bg-accent text-white',
  Sell: 'border border-accent-dark text-accent-dark',
  Invest: 'bg-accent/10 text-accent-dark',
}

function NewValuationButton({ className = '' }) {
  return (
    <a
      href={NEW_VALUATION_URL}

      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-glow)] transition-all duration-200 hover:brightness-105 active:scale-95 ${className}`}
    >
      <Plus weight="bold" size={16} />
      New Valuation
      <ArrowSquareOut weight="bold" size={14} className="opacity-70" />
    </a>
  )
}

function StatCard({ label, value, tag }) {
  return (
    <div className="rounded-2xl border border-line bg-white px-5 py-4 shadow-[var(--shadow-xs)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-[-0.02em] text-ink">{value}</p>
      {tag && (
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-dark">{tag}</p>
      )}
    </div>
  )
}

function ReportCard({ report }) {
  // const navigate = useNavigate()
  return (
    <div className="group flex flex-col rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-xs)] transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-[var(--shadow-md)]">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-[#fdf8f2] text-accent">
          <Buildings weight="duotone" size={20} />
        </span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${
            report.plan === 'paid' ? 'bg-ink text-white' : 'border border-line text-muted'
          }`}
        >
          {report.plan === 'paid' ? 'Paid' : 'Free'}
        </span>
      </div>

      <p className="mt-4 text-base font-semibold leading-snug text-ink">{report.building}</p>
      <p className="text-sm text-muted">
        {report.area} · {report.unit}
      </p>

      <div className="mt-4 flex items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Estimated value</p>
          <p className="mt-1 text-xl font-semibold tabular-nums tracking-[-0.02em] text-ink">{report.value}</p>
        </div>
               {report.verdict && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${VERDICT_STYLES[report.verdict]}`}
          >
            {report.verdict}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <p className="text-xs text-muted">{report.date}</p>
        {/* <button
          type="button"
          onClick={() => navigate(`/report?id=${report.id}`)}
          className="flex cursor-pointer items-center gap-1 text-sm font-medium text-accent-dark transition-colors hover:text-accent"
        >
          View report
          <ArrowRight weight="bold" size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </button> */}

        <button
  type="button"
onClick={() => { window.location.href = `${REPORT_URL_BASE}?id=${report.id}` }}
  className="flex cursor-pointer items-center gap-1 text-sm font-medium text-accent-dark transition-colors hover:text-accent"
>
  View report
  <ArrowRight weight="bold" size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
</button>
      </div>
    </div>
  )
}
function LoginGate({ onLogin }) {
  return (
    <div className="relative mt-6">
      {/* Blurred preview of real report cards — gives a taste of the product
          behind the sign-in prompt instead of a blank locked state. Capped
          height on mobile so 3 cards stacking in one column doesn't push
          the sign-in card below the fold; sm+ uses the natural (short)
          multi-column height instead. */}
      <div aria-hidden className="pointer-events-none max-h-[220px] select-none overflow-hidden blur-[6px] opacity-40 sm:max-h-none">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SAMPLE_REPORTS.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      </div>

      <div className="absolute inset-0 -mx-6 flex items-start justify-center px-6 pt-2 sm:mx-0 sm:items-center sm:pt-0">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-cream/50 via-cream/85 to-cream"
        />
        <div className="relative flex w-full max-w-[380px] flex-col items-center rounded-[28px] border border-line bg-white px-6 py-6 text-center shadow-[var(--shadow-lg)] sm:py-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-accent/20 bg-[#fdf8f2] text-accent shadow-[var(--shadow-sm)] sm:h-14 sm:w-14">
            <LockSimple weight="duotone" size={22} />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-ink sm:mt-5">Sign in to view your reports</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Your valuation history, saved properties, and reports live in your ACQAR account.
          </p>
          <button
            type="button"
            onClick={onLogin}
            className="mt-5 w-full cursor-pointer rounded-full bg-accent px-5 py-3 text-sm font-medium text-white shadow-[var(--shadow-glow)] transition-all duration-200 hover:brightness-105 active:scale-95 sm:mt-6"
          >
            Log in
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PropertyValuations() {
  const navigate = useNavigate()
  const location = useLocation()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [valuations, setValuations] = useState([])
  const [reportsLoading, setReportsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setSession(session)
      setAuthLoading(false)
    }

    checkAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const isLoggedIn = !!session

  useEffect(() => {
    if (!session?.user?.id) return
    let mounted = true

    const loadValuations = async () => {
      setReportsLoading(true)
      const { data, error } = await supabase
        .from('valuations')
        .select('id, property_name, building_name, district, created_at, estimated_valuation, type')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (!mounted) return
      if (error) {
        console.error('Failed to load valuations:', error)
        setValuations([])
      } else {
        setValuations(data || [])
      }
      setReportsLoading(false)
    }

    loadValuations()
    return () => { mounted = false }
  }, [session])

  const reports = useMemo(() => {
    return valuations.map((v) => ({
      id: v.id,
      building: v.property_name || v.building_name || 'Property',
      area: v.district || '—',
      unit: v.building_name && v.building_name !== v.property_name ? v.building_name : '',
      value: Number(v.estimated_valuation) > 0
        ? `AED ${Number(v.estimated_valuation).toLocaleString()}`
        : '—',
      plan: (v.type || 'free').toLowerCase() === 'paid' ? 'paid' : 'free',
      date: v.created_at
        ? new Date(v.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '',
    }))
  }, [valuations])

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase()
    return reports.filter((r) => {
      const matchesFilter = filter === 'all' || r.plan === filter
      const matchesSearch = !q || `${r.building} ${r.area}`.toLowerCase().includes(q)
      return matchesFilter && matchesSearch
    })
  }, [reports, filter, search])

  return (
    <div className="bg-cream text-ink pb-24 md:pb-0">
      <Nav />

      <section className="grain relative px-6 pt-32 pb-20 sm:pt-40">
        <div className="mx-auto max-w-[960px]">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-dark">
                Property valuations
              </p>
              <h1 className="mt-2 text-3xl font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-4xl">
                Your valuation reports.
              </h1>
              <p className="mt-2 max-w-[440px] text-base leading-relaxed text-muted">
                Manage and monitor every valuation you've generated for Dubai properties.
              </p>
            </div>
                    {isLoggedIn && <NewValuationButton className="w-full sm:w-auto" />}
          </div>

          {authLoading ? (
            <div className="mt-8 animate-pulse text-sm text-muted">Loading…</div>
                   ) : !isLoggedIn ? (
            <LoginGate onLogin={() => navigate('/loginpage', { state: { from: location.pathname } })} />
          ) : (
            <>
              {/* Stats */}
              <div className="mt-8 grid grid-cols-2 gap-3 sm:max-w-[420px]">
                <StatCard label="Total reports" value={`${reports.length} / 3`} tag="Free plan" />
                <StatCard label="Active assets" value={String(reports.length)} />
              </div>

              <div className="mt-8 border-t border-line" />

              {/* Filters + search */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

                <div className="flex items-center gap-2">
                  <div className="flex flex-1 items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 shadow-[var(--shadow-xs)] focus-within:border-accent/40 sm:w-[280px]">
                    <MagnifyingGlass size={16} className="shrink-0 text-muted" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by building or unit…"
                      className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    aria-label="Filter options"
                    title="Filter options"
                    className="flex h-[42px] w-[42px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-white text-ink/70 shadow-[var(--shadow-xs)] transition-colors hover:bg-accent/5 hover:text-accent-dark"
                  >
                    <Funnel size={17} />
                  </button>
                </div>
              </div>

              {/* Reports grid / empty state */}
              {reportsLoading ? (
                <div className="mt-6 flex items-center justify-center rounded-[28px] border border-dashed border-line bg-white/60 px-6 py-16 text-center text-sm text-muted">
                  Loading your reports…
                </div>
              ) : filteredReports.length > 0 ? (
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredReports.map((report) => (
                    <ReportCard key={report.id} report={report} />
                  ))}
                </div>
              ) : (
                <div className="mt-6 flex flex-col items-center rounded-[28px] border border-dashed border-line bg-white/60 px-6 py-16 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/20 bg-white text-accent shadow-[var(--shadow-md)]">
                    <ChartBar weight="duotone" size={26} />
                  </span>
                  {reports.length === 0 ? (
                    <>
                      <h2 className="mt-5 text-lg font-semibold text-ink">No valuations yet</h2>
                      <p className="mt-1.5 max-w-[320px] text-sm leading-relaxed text-muted">
                        Create your first valuation to see it here.
                      </p>
                      <NewValuationButton className="mt-5" />
                    </>
                  ) : (
                    <>
                      <h2 className="mt-5 text-lg font-semibold text-ink">No matching reports</h2>
                      <p className="mt-1.5 max-w-[320px] text-sm leading-relaxed text-muted">
                        Try a different search term or filter.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setFilter('all')
                          setSearch('')
                        }}
                        className="mt-5 cursor-pointer rounded-full border border-line bg-white px-5 py-2.5 text-sm font-medium text-ink/70 shadow-[var(--shadow-xs)] transition-colors hover:bg-accent/5 hover:text-accent-dark"
                      >
                        Clear filters
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Upsell banner */}
              <div className="relative mt-8 flex flex-col items-start gap-4 overflow-hidden rounded-[28px] border border-accent/20 bg-white px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -left-10 -top-16 h-[180px] w-[320px] rounded-full opacity-[0.15] blur-[70px]"
                  style={{ background: 'radial-gradient(circle, rgba(184,115,51,0.8), transparent 70%)' }}
                />
                <div className="relative flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
                    <Sparkle weight="fill" size={18} />
                  </span>
                  <div>
                    <p className="text-base font-semibold text-ink">Need deeper insights?</p>
                    <p className="mt-1 max-w-[420px] text-sm leading-relaxed text-muted">
                      Unlock full valuation history, exportable reports, and unlimited assessments with an ACQAR plan.
                    </p>
                  </div>
                </div>
                <a
                  href="#"
                  className="relative shrink-0 cursor-pointer rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-sm)] transition-all duration-200 hover:brightness-110 active:scale-95"
                >
                  See plans
                </a>
              </div>

                <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={async () => {
                    await supabase.auth.signOut()
                    navigate('/')
                  }}
                  className="cursor-pointer text-xs text-muted underline decoration-line underline-offset-2 transition-colors hover:text-accent-dark"
                >
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />
      <MobileTabBar />
      <FloatingAdvisorButton />
    </div>
  )
}
