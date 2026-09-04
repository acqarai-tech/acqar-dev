import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  MapPin,
  CaretRight,
  HouseLine,
  Briefcase,
  Key,
  Link as LinkIcon,
  Check,
  ClockCounterClockwise,
  Broadcast,
  Binoculars,
} from '@phosphor-icons/react'
import Reveal from '../Reveal'
import Nav from '../Nav'
import Footer from '../Footer'
import MobileTabBar from '../MobileTabBar'
import FloatingAdvisorButton from '../FloatingAdvisorButton'
import StatGrid from '../widgets/StatGrid'
import KeyValueList from '../widgets/KeyValueList'
import ScoreGauge from '../widgets/ScoreGauge'
import AIBriefCard from '../widgets/AIBriefCard'
import AlertBanner from '../widgets/AlertBanner'
import DataTable from '../widgets/DataTable'
import PersonaTabs from '../widgets/PersonaTabs'
import LiveTicker from '../widgets/LiveTicker'
import CommentSection from '../widgets/CommentSection'
import PersonaTimelinePanel from './PersonaTimelinePanel'
import PastTabContent from './PastTabContent'
import PresentTabContent from './PresentTabContent'
import FutureTabContent from './FutureTabContent'
import { fetchAreaProfile, hasFullProfile } from '../../data/areas'

const PERSONAS = [
  { key: 'firstTime', label: 'First-Time Buyer', Icon: HouseLine },
  { key: 'investor', label: 'Investor', Icon: Briefcase },
  { key: 'owner', label: 'Already Own', Icon: Key },
]

const TIMELINE_TABS = [
  { key: 'past', label: 'Past', sub: 'History & track record', Icon: ClockCounterClockwise },
  { key: 'present', label: 'Present', sub: 'Live market data', Icon: Broadcast },
  { key: 'future', label: 'Future', sub: "What's coming", Icon: Binoculars },
]

function Section({ eyebrow, title, children, className = '' }) {
  return (
    <section className={className}>
      {(eyebrow || title) && (
        <div className="mb-3">
          {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-dark">{eyebrow}</p>}
          {title && <h2 className="mt-1 text-lg font-semibold text-ink">{title}</h2>}
        </div>
      )}
      {children}
    </section>
  )
}

export default function AreaDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [persona, setPersona] = useState('firstTime')
  const [timelineTab, setTimelineTab] = useState('past')
  const [copied, setCopied] = useState(false)


  useEffect(() => {
   supabase.auth.getSession().then(({ data: { session } }) => {
     if (!session) {
       navigate('/loginpage', { replace: true, state: { from: `/areas/${slug}` } })
     } else {
       setAuthChecked(true)
     }
   })
  }, [navigate, slug])
  
  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchAreaProfile(slug).then((p) => {
      if (!mounted) return
      setProfile(p)
      setLoading(false)
    })
    return () => { mounted = false }
  }, [slug])

  if (!authChecked || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-cream text-sm text-muted">
        Loading area report…
      </div>
    )
  }

  if (!profile) return <Navigate to="/areas" replace />
  
  const isFull = hasFullProfile(slug)
  const hasPersonaTimeline = Boolean(profile.investor && profile.owner)

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="bg-cream text-ink pb-24 md:pb-0">
      <Nav />

      {profile.ticker && <LiveTicker label={`${profile.name} live`} items={profile.ticker} className="mt-32 sm:mt-40" />}

      <section className={`grain relative px-6 pb-20 ${profile.ticker ? 'pt-5 sm:pt-6' : 'pt-32 sm:pt-40'}`}>
        <div className="mx-auto max-w-[1120px]">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Link to="/areas" className="cursor-pointer transition-colors hover:text-accent-dark">
              Area reports
            </Link>
            <CaretRight size={10} />
            <span className="font-medium text-ink">{profile.name}</span>
          </div>

          {profile.alert && <AlertBanner {...profile.alert} className="mt-4" />}

          {!isFull && (
            <p className="mt-4 inline-block rounded-full border border-line bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              Preview report — auto-generated
            </p>
          )}

          {/* Hero */}
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
            <MapPin size={13} className="text-accent" />
            Dubai — {profile.tag}
          </div>
          <h1 className="mt-2 text-3xl font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-4xl">
            {profile.name}
          </h1>

          {/* Snapshot: the 6 metric boxes with the score pinned alongside */}
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
            <Reveal className="order-2 lg:order-1">
              <StatGrid items={profile.metrics} />
            </Reveal>

            <Reveal delay={100} className="order-1 lg:order-2">
              <div className="lg:sticky lg:top-28">
                <ScoreGauge
                  score={profile.score}
                  verdict={profile.verdict}
                  outlookLabel={profile.outlookLabel}
                  breakdown={profile.scoreBreakdown}
                />
              </div>
            </Reveal>
          </div>

          {/* "Who are you?" — full width on desktop */}
          <div className="mt-8">
            {hasPersonaTimeline ? (
                <div>
                  {/* Persona tabs + Past/Present/Future sub-tabs, stuck together
                      directly under the fixed Nav — on both desktop and mobile. */}
                  <div
                    className="sticky z-30 -mx-6 border-b border-line bg-cream/95 px-6 shadow-[var(--shadow-sm)] backdrop-blur-sm sm:mx-0 sm:rounded-t-2xl sm:border sm:border-b-0 sm:bg-white/95"
                    style={{ top: 'var(--nav-height)' }}
                  >
                    <p className="pt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted sm:px-2">
                      Who are you?
                    </p>
                    <PersonaTabs personas={PERSONAS} active={persona} onChange={setPersona} className="sm:px-1" />
                    <div className="flex items-center gap-1 overflow-x-auto border-t border-line sm:px-1">
                      {TIMELINE_TABS.map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setTimelineTab(tab.key)}
                          className={`flex shrink-0 cursor-pointer items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                            timelineTab === tab.key
                              ? 'border-accent text-accent-dark'
                              : 'border-transparent text-muted hover:text-ink'
                          }`}
                        >
                          <tab.Icon weight={timelineTab === tab.key ? 'fill' : 'regular'} size={15} />
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-md)] sm:mt-0 sm:rounded-t-none sm:rounded-b-2xl sm:border-t-0">
                    <PersonaTimelinePanel persona={persona} tab={timelineTab} profile={profile} />
                  </div>
                </div>
              ) : (
                <Section eyebrow="Area timeline" title="Past, present, and what's coming">
                  <div className="flex items-center gap-1 overflow-x-auto border-b border-line">
                    {TIMELINE_TABS.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setTimelineTab(tab.key)}
                        className={`flex shrink-0 cursor-pointer items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                          timelineTab === tab.key
                            ? 'border-accent text-accent-dark'
                            : 'border-transparent text-muted hover:text-ink'
                        }`}
                      >
                        <tab.Icon weight={timelineTab === tab.key ? 'fill' : 'regular'} size={16} />
                        {tab.label}
                        <span className="hidden text-xs font-normal text-muted sm:inline">— {tab.sub}</span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-5">
                    {timelineTab === 'past' && <PastTabContent profile={profile} />}

                    {timelineTab === 'present' &&
                      (profile.present ? (
                        <PresentTabContent present={profile.present} />
                      ) : (
                        <div className="rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-md)]">
                          <p className="text-sm leading-relaxed text-ink/80">
                            Live market-composition data isn't available yet for {profile.name}. Explore Jumeirah Village Circle (JVC) for a complete example.
                          </p>
                        </div>
                      ))}

                    {timelineTab === 'future' &&
                      (profile.future ? (
                        <FutureTabContent future={profile.future} areaName={profile.name} />
                      ) : (
                        <div className="rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-md)]">
                          <p className="text-sm leading-relaxed text-ink/80">
                            {isFull
                              ? `${profile.name} has confirmed infrastructure and off-plan supply landing over the next 24 months — see the buying guide above for the specific catalysts driving this area's outlook.`
                              : `Detailed upcoming-catalyst data isn't available yet for ${profile.name}. Explore Jumeirah Village Circle (JVC) for a complete example.`}
                          </p>
                        </div>
                      ))}
                  </div>
                </Section>
              )}
          </div>

          {/* Rest of the page */}
          {profile.brief && <AIBriefCard {...profile.brief} className="mt-10" />}

          {profile.pricing && (
            <Section eyebrow="Cost to buy" title={`What does buying in ${profile.name} actually cost?`} className="mt-10">
              <DataTable columns={profile.pricing.columns} rows={profile.pricing.rows} />
              <p className="mt-2.5 text-xs leading-relaxed text-muted">
                "Fair price" is ACQAR's Truvalu™ benchmark — what a property is actually worth based on real transactions, not asking prices.
              </p>
            </Section>
          )}

          {profile.ownershipCosts && (
            <Section eyebrow="Cost to own" title="What will it cost to own — not just buy?" className="mt-10">
              <KeyValueList items={profile.ownershipCosts} />
            </Section>
          )}

          {/* Share */}
          <div className="mt-10 flex flex-col items-start gap-4 rounded-[28px] border border-accent/20 bg-white px-6 py-6 shadow-[var(--shadow-md)] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-base font-semibold text-ink">Share this Area Specialist report</p>
              <p className="mt-1 max-w-[440px] text-sm text-muted">
                Copy a link to this report to send to a client — no login required to view it.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-sm)] transition-all duration-200 hover:brightness-105 active:scale-95"
            >
              {copied ? <Check weight="bold" size={16} /> : <LinkIcon weight="bold" size={16} />}
              {copied ? 'Link copied' : 'Copy report link'}
            </button>
          </div>

          {/* Discussion */}
          {profile.comments && (
            <Section eyebrow="Community" title="Discussion" className="mt-10">
              <CommentSection areaName={profile.name} areaId={profile.areaId} seedComments={profile.comments} />
            </Section>
          )}
        </div>
      </section>

      <Footer />
      <MobileTabBar />
      <FloatingAdvisorButton />
    </div>
  )
}
