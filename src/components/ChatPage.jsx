import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import * as Dialog from '@radix-ui/react-dialog'
import {
  Sparkle,
  ArrowUp,
  Plus,
  List,
  X,
  MagnifyingGlass,
  Copy,
  Check,
  ArrowClockwise,
  ThumbsUp,
  ThumbsDown,
  PencilSimple,
  SidebarSimple,
  Export,
  UserCircle,
  SignOut,
  PushPin,
  Headset,
  CheckCircle,
} from '@phosphor-icons/react'
import acqarLogo from '../assets/acqar-logo.webp'
import LayeredGlow from './LayeredGlow'
import TypingPlaceholder from './TypingPlaceholder'

const STARTER_PROMPTS = [
  'Is a 3-bedroom townhouse in Damac Hills a good investment?',
  'Should I sell my 2BR in Business Bay now or wait a year?',
  'Is AED 1.8M fair for a 1BR in JVC, or am I overpaying?',
]

// Same shortened phrasing as Hero's mobile placeholder rotation — on phones
// the input cycles through these instead of showing the static chip row
// below, so the welcome screen stays to one clear action instead of a
// crowded stack of long full-sentence pills.
const STARTER_PROMPTS_MOBILE = [
  'Good investment in Damac Hills?',
  'Sell now or wait in Business Bay?',
  'Fair price for this JVC 1BR?',
]

let seedId = 0
const nextId = () => `c${seedId++}`

const INITIAL_CONVERSATIONS = [
  { id: nextId(), title: '1BR in JVC — fair price?', day: 'today', pinned: false },
  { id: nextId(), title: '2BR Business Bay — sell or hold?', day: 'today', pinned: false },
  { id: nextId(), title: 'Off-plan vs resale in Dubai Hills', day: 'yesterday', pinned: false },
]

// Two phrasings per verdict so "Regenerate" has something real to swap
// between, instead of silently reprinting the same text.
const REPLIES = {
  sell: [
    {
      verdict: 'Sell',
      text: "Comparable resales in this building are up roughly 6% over the last 90 days, and rental demand in the area has softened slightly. If you don't need the long-term appreciation, this is a reasonable window to sell.",
      footnote: 'Based on 14 comparable DLD transactions in the last 90 days.',
    },
    {
      verdict: 'Sell',
      text: 'Prices here have climbed steadily since you likely bought, and turnover in the building has picked up, meaning buyer demand is active right now. Selling into that demand rather than waiting is the safer play.',
      footnote: 'Based on 14 comparable DLD transactions in the last 90 days.',
    },
  ],
  invest: [
    {
      verdict: 'Invest',
      text: 'This area is showing a gross rental yield of roughly 7.2%, above the Dubai average of 6.1%. Combined with steady price appreciation over the past year, this checks out as a solid income-focused investment.',
      footnote: 'Based on live rental listings and DLD sale transactions.',
    },
    {
      verdict: 'Invest',
      text: 'Rental demand in this area has stayed consistent year-round, and yields are outperforming most comparable Dubai communities. For an income-focused buy, the numbers support it.',
      footnote: 'Based on live rental listings and DLD sale transactions.',
    },
  ],
  buy: [
    {
      verdict: 'Buy',
      text: "Comparable units in this building have sold for 4-8% below asking over the last quarter, so there's room to negotiate. At the right price, this is a fair entry point given the area's transaction volume and stable demand.",
      footnote: 'Based on 21 comparable DLD transactions in the last 90 days.',
    },
    {
      verdict: 'Buy',
      text: "Transaction volume in this building is healthy and prices have stayed flat rather than spiking, so you're not chasing a hot market. Negotiate off the asking price and this is a reasonable buy.",
      footnote: 'Based on 21 comparable DLD transactions in the last 90 days.',
    },
  ],
  followup: [
    {
      text: "Got it. In the full ACQAR app, I'd cross-reference live listings, current DLD transactions, and area trends to give you a precise, up-to-the-minute number for that.",
    },
    {
      text: "Noted. In the full ACQAR app, that would pull fresh DLD transaction data and live listings for the exact area you're asking about.",
    },
  ],
}

// One fully "real" example answer — deep data behind a short verdict, the
// shape a genuine ACQAR/DLD-backed response would actually take rather than
// the lightweight canned replies above. Triggered by a JVC + 2026 question
// specifically so there's one place to see the dense-data layout render.
const JVC_RICH_REPLY = {
  rich: true,
  verdict: 'Invest',
  headline: 'JVC looks strong for 2026 investors.',
  metrics: [
    { label: 'Average price', value: '15,929 AED/sqm', note: '1,480 AED/sqft — typical unit price here' },
    { label: 'Average DLD valuation', value: '974,356 AED', note: 'Recent assessed worth of properties' },
    { label: 'Transactions, last 90 days', value: '500+', note: 'Market activity is high (lower-bound)' },
    { label: 'Data quality', value: '20 excluded', note: 'Outlier records removed as data errors' },
  ],
  conclusion:
    'Strong recent activity and solid pricing indicate JVC is a good investment area for 2026, with fresh market data supporting confidence.',
  tableTitle: 'Recent sales — last 90 days (JVC)',
  tableSubtitle: 'Showing the 15 most recent complete records of 500 real transactions in this window.',
  tableColumns: ['#', 'Date', 'Type', 'Project', 'Sqft', 'PSM', 'PSF', 'Total (AED)'],
  tableRows: [
    [1, '2026-07-13', '1 B/R', 'Serenz by Danube', '577', '25,867', '2,403', '1,385,700'],
    [2, '2026-07-13', '1 B/R', 'Serenz by Danube', '552', '24,995', '2,322', '1,281,000'],
    [3, '2026-07-13', 'Studio', 'Manhattan 1 by SD', '409', '19,600', '1,821', '744,017'],
    [4, '2026-07-11', '1 B/R', 'Tresora by Wadan', '665', '14,464', '1,344', '893,556'],
    [5, '2026-07-11', '1 B/R', 'ALEF NOON RESIDENCE', '1,211', '13,878', '1,289', '1,561,838'],
    [6, '2026-07-11', 'Studio', 'Tresora by Wadan', '416', '17,607', '1,636', '680,348'],
    [7, '2026-07-11', '1 B/R', 'Norah Residence', '674', '15,972', '1,484', '1,000,000'],
    [8, '2026-07-11', '1 B/R', 'Aveline Residences by Citi Developers', '784', '14,589', '1,355', '1,062,234'],
    [9, '2026-07-11', '1 B/R', 'Skyhills III by HRE', '820', '16,675', '1,549', '1,269,994'],
    [10, '2026-07-11', '1 B/R', 'Tresora by Wadan', '725', '15,001', '1,394', '1,010,456'],
    [11, '2026-07-11', 'Studio', 'Tresora by Wadan', '459', '18,180', '1,689', '775,200'],
    [12, '2026-07-11', 'Studio', 'Tresora by Wadan', '576', '13,581', '1,262', '726,323'],
    [13, '2026-07-11', 'Studio', 'Tresora by Wadan', '459', '18,000', '1,672', '767,525'],
    [14, '2026-07-11', 'Studio', 'Dusit Princess Rijas', '364', '23,535', '2,186', '795,000'],
    [15, '2026-07-11', 'Studio', 'Stax', '420', '20,843', '1,936', '813,500'],
  ],
}

function getAssistantReply(query, isFirst, variant = 0) {
  const q = query.toLowerCase()

  if (isFirst && q.includes('jvc') && (q.includes('invest') || q.includes('2026'))) {
    return JVC_RICH_REPLY
  }

  let category = 'buy'
  if (!isFirst) category = 'followup'
  else if (q.includes('sell') || q.includes('hold')) category = 'sell'
  else if (q.includes('rent') || q.includes('yield') || q.includes('invest') || q.includes('earn')) category = 'invest'

  const variants = REPLIES[category]
  return { ...variants[variant % variants.length], category, variant }
}

// All three verdicts stay inside the copper accent family (no red/green) —
// the rest of the site never introduces a second hue, it only varies weight
// and tint of the one accent color, so the chat shouldn't either.
const VERDICT_STYLES = {
  Buy: 'bg-accent text-white',
  Sell: 'border border-accent-dark text-accent-dark',
  Invest: 'bg-accent/10 text-accent-dark',
}

function ProfileCard({ collapsed, isLoggedIn, userEmail, userPlan, onToggleLogin }) {
  const initial = userEmail?.[0]?.toUpperCase() || 'U'

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggleLogin}
        title={isLoggedIn ? userEmail : 'Log in'}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-accent/20 bg-white/70 text-accent shadow-[var(--shadow-xs)]"
      >
        {isLoggedIn ? <span className="text-xs font-semibold">{initial}</span> : <UserCircle size={18} />}
      </button>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-accent/20 bg-white/70 px-3 py-2.5">
        <div className="flex items-center gap-2 text-sm text-ink/70">
          <UserCircle size={22} />
          Guest
        </div>
        <button
          type="button"
          onClick={onToggleLogin}
          className="cursor-pointer rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white transition-all duration-200 hover:shadow-[var(--shadow-sm)]"
        >
          Log in
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-white px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{userEmail || 'Account'}</p>
          <p className="text-xs text-muted">
            {userPlan === 'pro' || userPlan === 'elite' ? 'Pro plan' : 'Free plan'}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggleLogin}
        aria-label="Log out"
        title="Log out"
        className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-ink/5 hover:text-ink"
      >
        <SignOut size={15} />
      </button>
    </div>
  )
}

function ConversationRow({ c, active, isEditing, editValue, onEditValueChange, onOpenClick, onTogglePin, onStartRename, onSaveRename, onCancelRename }) {
  if (isEditing) {
    return (
      <input
        autoFocus
        value={editValue}
        onChange={(e) => onEditValueChange(e.target.value)}
        onBlur={onSaveRename}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSaveRename()
          if (e.key === 'Escape') onCancelRename()
        }}
        className="w-full rounded-lg border border-accent/40 bg-white/80 px-2 py-2 text-sm text-ink focus:outline-none"
      />
    )
  }

  return (
    <div
      className={`group flex items-center gap-1 rounded-lg px-2 py-2 transition-colors ${
        active ? 'border border-accent/20 bg-accent/10' : 'border border-transparent hover:bg-accent/5'
      }`}
    >
      <button
        type="button"
        onClick={() => onOpenClick(c.title)}
        className="min-w-0 flex-1 truncate text-left text-sm text-muted hover:text-ink"
      >
        {c.title}
      </button>
      <button
        type="button"
        onClick={() => onTogglePin(c.id)}
        title={c.pinned ? 'Unpin' : 'Pin'}
        aria-label={c.pinned ? 'Unpin chat' : 'Pin chat'}
        className={`flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${
          c.pinned ? 'text-accent-dark' : 'text-muted/70 hover:text-accent-dark'
        }`}
      >
        <PushPin size={13} weight={c.pinned ? 'fill' : 'regular'} />
      </button>
      <button
        type="button"
        onClick={() => onStartRename(c.id, c.title)}
        title="Rename"
        aria-label="Rename chat"
        className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted/70 transition-colors hover:text-ink"
      >
        <PencilSimple size={13} />
      </button>
    </div>
  )
}

function SidebarContent({
  onPromptClick,
  onNewChat,
  collapsed,
  onToggleCollapse,
  isLoggedIn,
  userEmail,
  userPlan,
  onToggleLogin,
  conversations,
  activeConversationId,
  onTogglePin,
  editingId,
  editValue,
  onEditValueChange,
  onStartRename,
  onSaveRename,
  onCancelRename,
}) {
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()
  const filtered = q ? conversations.filter((c) => c.title.toLowerCase().includes(q)) : conversations
  const pinned = filtered.filter((c) => c.pinned)
  const today = filtered.filter((c) => !c.pinned && c.day === 'today')
  const yesterday = filtered.filter((c) => !c.pinned && c.day === 'yesterday')

  const rowProps = {
    activeConversationId,
    onOpenClick: onPromptClick,
    onTogglePin,
    editingId,
    editValue,
    onEditValueChange,
    onStartRename,
    onSaveRename,
    onCancelRename,
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className={`flex items-center px-5 pt-5 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2">
            <img src={acqarLogo} alt="ACQAR" className="h-6 w-auto" />
          </Link>
        )}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink/60 transition-colors hover:bg-accent/5 hover:text-ink"
          >
            <SidebarSimple size={18} />
          </button>
        )}
      </div>

      <div className={`flex flex-col gap-2 px-4 pt-6 ${collapsed ? 'items-center px-2' : ''}`}>
        <button
          type="button"
          onClick={onNewChat}
          title="New chat"
          className={`flex cursor-pointer items-center gap-2 rounded-full bg-accent text-sm font-medium text-white shadow-[var(--shadow-sm)] transition-all duration-200 hover:shadow-[var(--shadow-md)] active:scale-[0.98] ${
            collapsed ? 'h-9 w-9 justify-center' : 'w-full px-4 py-2.5'
          }`}
        >
          <Plus size={16} weight="bold" />
          {!collapsed && 'New chat'}
        </button>

        {!collapsed && (
          <div className="flex items-center gap-2 rounded-full border border-accent/20 bg-white/70 px-4 py-2">
            <MagnifyingGlass size={15} className="shrink-0 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
            />
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="mt-6 min-h-0 flex-1 overflow-y-auto px-4">
          {pinned.length > 0 && (
            <>
              <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-dark">Pinned</p>
              <div className="mt-3 flex flex-col gap-1">
                {pinned.map((c) => (
                  <ConversationRow key={c.id} c={c} active={c.id === activeConversationId} isEditing={editingId === c.id} {...rowProps} />
                ))}
              </div>
            </>
          )}

          {today.length > 0 && (
            <>
              <p className="mt-7 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-dark">Today</p>
              <div className="mt-3 flex flex-col gap-1">
                {today.map((c) => (
                  <ConversationRow key={c.id} c={c} active={c.id === activeConversationId} isEditing={editingId === c.id} {...rowProps} />
                ))}
              </div>
            </>
          )}

          {yesterday.length > 0 && (
            <>
              <p className="mt-7 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-dark">Yesterday</p>
              <div className="mt-3 flex flex-col gap-1">
                {yesterday.map((c) => (
                  <ConversationRow key={c.id} c={c} active={c.id === activeConversationId} isEditing={editingId === c.id} {...rowProps} />
                ))}
              </div>
            </>
          )}

          {q && pinned.length === 0 && today.length === 0 && yesterday.length === 0 && (
            <p className="px-1 text-sm text-muted">No matches for "{search}".</p>
          )}
        </div>
      )}

      <div className={`flex flex-col gap-3 border-t border-line px-4 py-4 ${collapsed ? 'items-center px-2' : ''}`}>
                <ProfileCard collapsed={collapsed} isLoggedIn={isLoggedIn} userEmail={userEmail} userPlan={userPlan} onToggleLogin={onToggleLogin} />
      </div>
    </div>
  )
}

function MessageActionButton({ onClick, active, activeClassName, children, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-colors ${
        active ? activeClassName : 'text-muted hover:bg-ink/5 hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

// The "full answer behind the verdict" layout — a headline, a stat grid,
// a conclusion, and a scrollable transactions table. Everything still
// stays inside ACQAR's card/border/accent language, just with more room
// to breathe than the short canned replies get.
function RichAnswerCard({ m }) {
  return (
    <div className="rounded-2xl rounded-tl-md border border-line bg-white p-4 shadow-[var(--shadow-xs)] sm:p-5">
      {m.verdict && (
        <span
          className={`mb-2.5 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${VERDICT_STYLES[m.verdict]}`}
        >
          {m.verdict}
        </span>
      )}
      <p className="text-base font-semibold leading-snug text-ink sm:text-lg">{m.headline}</p>

      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-dark">Key metrics</p>
      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        {m.metrics.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-line bg-[#fdf8f2] px-3 py-2.5">
            <p className="text-base font-semibold tabular-nums text-ink">{stat.value}</p>
            <p className="mt-0.5 text-xs leading-snug text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-ink">{m.conclusion}</p>

      <div className="mt-5 border-t border-line pt-4">
        <p className="text-sm font-semibold text-ink">{m.tableTitle}</p>
        <p className="mt-1 text-xs text-muted">{m.tableSubtitle}</p>

        <div className="mt-3 -mx-1 overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-accent/15 bg-[#fdf8f2] text-left text-ink/70">
                {m.tableColumns.map((col, i) => (
                  <th key={col} className={`whitespace-nowrap px-4 py-2.5 font-semibold first:rounded-l-lg first:pl-3 last:rounded-r-lg last:pr-3 ${i >= 4 ? 'text-right' : ''}`}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {m.tableRows.map((row, ri) => (
                <tr key={ri} className="border-b border-line/60 last:border-0">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`whitespace-nowrap px-4 py-2.5 tabular-nums text-ink first:pl-3 last:pr-3 ${ci >= 4 ? 'text-right' : ''}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function AssistantMessage({ m, onRegenerate, onFeedback, isLast }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const textToCopy = m.rich ? `${m.headline}\n\n${m.conclusion}` : m.text
    navigator.clipboard?.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex items-start gap-3">
      <span className="mt-6 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-accent shadow-[var(--shadow-xs)]">
        <Sparkle weight="fill" size={16} />
      </span>
      <div className={m.rich ? 'min-w-0 max-w-[85%] flex-1 sm:max-w-[640px]' : 'max-w-[80%]'}>
        <p className="mb-1.5 text-xs font-semibold tracking-[-0.01em] text-ink/70">ACQAR</p>
        {m.rich ? (
          <RichAnswerCard m={m} />
        ) : (
          <div className="rounded-2xl rounded-tl-md border border-line bg-white px-4 py-3.5 shadow-[var(--shadow-xs)]">
            {m.verdict && (
              <span
                className={`mb-2.5 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${VERDICT_STYLES[m.verdict]}`}
              >
                {m.verdict}
              </span>
            )}
            <p className="text-base leading-relaxed text-ink">{m.text}</p>
            {m.footnote && <p className="mt-2.5 text-sm text-muted">{m.footnote}</p>}
          </div>
        )}

        <div className="mt-1.5 flex items-center gap-0.5">
          <MessageActionButton onClick={handleCopy} label="Copy">
            {copied ? <Check size={14} weight="bold" className="text-accent-dark" /> : <Copy size={14} />}
          </MessageActionButton>
          <MessageActionButton onClick={onRegenerate} label="Regenerate">
            <ArrowClockwise size={14} />
          </MessageActionButton>
          <MessageActionButton
            onClick={() => onFeedback('up')}
            active={m.feedback === 'up'}
            activeClassName="text-accent-dark"
            label="Good response"
          >
            <ThumbsUp size={14} weight={m.feedback === 'up' ? 'fill' : 'regular'} />
          </MessageActionButton>
          <MessageActionButton
            onClick={() => onFeedback('down')}
            active={m.feedback === 'down'}
            activeClassName="text-accent-dark"
            label="Poor response"
          >
            <ThumbsDown size={14} weight={m.feedback === 'down' ? 'fill' : 'regular'} />
          </MessageActionButton>
        </div>

        {isLast && <DisclaimerLine className="mt-3 text-left" />}
      </div>
    </div>
  )
}

function UserMessage({ m, onEdit }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard?.writeText(m.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col items-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-md bg-accent px-4 py-3 text-base text-white shadow-[var(--shadow-sm)]">
        {m.text}
      </div>
      <div className="mt-1.5 flex items-center gap-0.5">
        <MessageActionButton onClick={handleCopy} label="Copy">
          {copied ? <Check size={14} weight="bold" className="text-accent-dark" /> : <Copy size={14} />}
        </MessageActionButton>
        <MessageActionButton onClick={onEdit} label="Edit">
          <PencilSimple size={14} />
        </MessageActionButton>
      </div>
    </div>
  )
}

// Claude-style "Thinking for Ns…" indicator — a live elapsed-time counter
// rather than a static spinner, so the wait reads as real work happening.
function ThinkingIndicator() {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const start = Date.now()
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 200)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-accent shadow-[var(--shadow-xs)]">
        <Sparkle weight="fill" size={16} className="animate-pulse" />
      </span>
      <span className="text-base text-muted">
        Thinking{seconds > 0 ? ` for ${seconds}s` : '…'}
      </span>
    </div>
  )
}

function DisclaimerLine({ className = '' }) {
  return (
    <p className={`text-xs text-muted ${className}`}>
      ACQAR AI can make mistakes. Please double-check responses.{' '}
      <a href="#" className="cursor-pointer underline decoration-line underline-offset-2 transition-colors hover:text-accent-dark">
        Give us feedback
      </a>
    </p>
  )
}

function ShareButton({ onShare, copied, compact = false }) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={onShare}
        aria-label="Share this chat"
        title="Share this chat"
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-line bg-white text-ink shadow-[var(--shadow-xs)] transition-transform duration-200 active:scale-90"
      >
        {copied ? <Check size={17} weight="bold" className="text-accent-dark" /> : <Export size={17} weight="bold" />}
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onShare}
      className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-ink/70 transition-colors hover:bg-accent/5 hover:text-accent-dark"
    >
      {copied ? <Check size={15} weight="bold" className="text-accent-dark" /> : <Export size={15} />}
      {copied ? 'Link copied' : 'Share'}
    </button>
  )
}

// Floating "talk to a property advisor" prompt — only shown once ACQAR has
// actually answered something, so it reads as "want a human take on this?"
// rather than an unprompted popup before there's anything to discuss.
function AdvisorPrompt({ visible }) {
  const [open, setOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  if (!visible) return null

  const handleClose = () => {
    setOpen(false)
    setTimeout(() => setConfirmed(false), 200)
  }

  return (
    <div className="absolute bottom-28 right-4 z-20 flex flex-col items-end sm:right-8">
      {open && (
        <div className="mb-3 w-[280px] rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-lg)] sm:w-[300px]">
          {confirmed ? (
            <div className="flex flex-col items-center gap-2 py-2 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-accent">
                <CheckCircle weight="fill" size={22} />
              </span>
              <p className="text-sm font-medium text-ink">Thanks — a property advisor will be in touch shortly.</p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-white text-accent shadow-[var(--shadow-xs)]">
                    <Headset weight="fill" size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">ACQAR Advisor</p>
                    <p className="text-xs text-muted">Usually replies within a day</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Dismiss"
                  className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-ink/5 hover:text-ink"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink">
                Do you want to discuss this with a property advisor?
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmed(true)}
                  className="flex-1 cursor-pointer rounded-full bg-accent px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-sm)] transition-all duration-200 hover:shadow-[var(--shadow-md)] active:scale-[0.98]"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 cursor-pointer rounded-full border border-line px-4 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-accent/5 hover:text-ink"
                >
                  No
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Talk to a property advisor"
        title="Talk to a property advisor"
        className="relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border border-accent/20 bg-white text-accent shadow-[var(--shadow-md)] transition-transform duration-200 active:scale-95"
      >
        {!open && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/20" />}
        <Headset weight="fill" size={22} className="relative" />
      </button>
    </div>
  )
}

export default function ChatPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
   const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [userPlan, setUserPlan] = useState('free')
  const [shareCopied, setShareCopied] = useState(false)
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS)
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const autoSubmitted = useRef(false)
  const scrollRef = useRef(null)


  useEffect(() => {
  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      navigate('/loginpage', { replace: true })
      return
    }

    setSession(session)
    setAuthLoading(false)
  }

  checkAuth()

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      navigate('/', { replace: true })
      return
    }

    setSession(session)
    setAuthLoading(false)
  })

  return () => subscription.unsubscribe()
}, [navigate])


    useEffect(() => {
    if (!session?.user?.id) return
    let mounted = true

    const loadPlan = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('plan')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!mounted) return
      if (error) {
        console.error('Failed to load user plan:', error)
        return
      }
      setUserPlan(data?.plan || 'free')
    }

    loadPlan()
    return () => { mounted = false }
  }, [session])

  const sendMessage = (text) => {
    const trimmed = text.trim()
    if (!trimmed || thinking) return

    const isFirst = messages.length === 0
    setMessages((m) => [...m, { role: 'user', text: trimmed }])
    setInput('')
    setThinking(true)

    if (isFirst) {
      const convo = { id: nextId(), title: trimmed, day: 'today', pinned: false }
      setConversations((c) => [convo, ...c])
      setActiveConversationId(convo.id)
    }

    // Claude-style thinking pause is long enough for the elapsed-time
    // counter in ThinkingIndicator to actually be visible ticking up.
    setTimeout(() => {
      const reply = getAssistantReply(trimmed, isFirst)
      setMessages((m) => [...m, { role: 'assistant', feedback: null, ...reply }])
      setThinking(false)
    }, 1800)
  }

  useEffect(() => {
    const q = searchParams.get('q')
    if (q && !autoSubmitted.current) {
      autoSubmitted.current = true
      sendMessage(q)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  const handlePromptClick = (label) => {
    setDrawerOpen(false)
    if (label) sendMessage(label)
  }

  const resetChat = () => {
    setDrawerOpen(false)
    setMessages([])
    setInput('')
    setThinking(false)
    setActiveConversationId(null)
  }

  const regenerate = (index) => {
    const query = messages[index - 1]?.text
    if (!query) return
    const isFirst = index - 1 === 0
    const current = messages[index]
    const nextVariant = (current.variant ?? 0) + 1
    const reply = getAssistantReply(query, isFirst, nextVariant)
    setMessages((m) => m.map((msg, i) => (i === index ? { role: 'assistant', feedback: null, ...reply } : msg)))
  }

  const setFeedback = (index, value) => {
    setMessages((m) =>
      m.map((msg, i) => (i === index ? { ...msg, feedback: msg.feedback === value ? null : value } : msg))
    )
  }

  const editMessage = (index) => {
    setInput(messages[index].text)
    setMessages((m) => m.slice(0, index))
  }

  const togglePin = (id) => {
    setConversations((c) => c.map((conv) => (conv.id === id ? { ...conv, pinned: !conv.pinned } : conv)))
  }

  const startRename = (id, currentTitle) => {
    setEditingId(id)
    setEditValue(currentTitle)
  }

  const saveRename = () => {
    const trimmed = editValue.trim()
    if (trimmed && editingId) {
      setConversations((c) => c.map((conv) => (conv.id === editingId ? { ...conv, title: trimmed } : conv)))
    }
    setEditingId(null)
  }

  const cancelRename = () => setEditingId(null)

  // No backend/persistence to point a "share" link at a saved conversation,
  // so this shares a link that reproduces the opening exchange (via ?q=) —
  // honest for a prototype, and still genuinely useful for a broker sending
  // a client "here's what ACQAR said about this property."
  const handleShare = async () => {
    const firstUserMessage = messages.find((m) => m.role === 'user')?.text
    const url = `${window.location.origin}/chat${firstUserMessage ? `?q=${encodeURIComponent(firstUserMessage)}` : ''}`

    if (navigator.share) {
      try {
        await navigator.share({ title: 'ACQAR', text: 'Ask ACQAR about Dubai property', url })
      } catch {
        // user cancelled the native share sheet — nothing to do
      }
      return
    }

    try {
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {
      // clipboard blocked (e.g. insecure context) — fail silently
    }
  }

  const hasConversation = messages.length > 0
  const hasAnswer = messages.some((m) => m.role === 'assistant')

    if (authLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-cream">
        <Sparkle weight="fill" size={28} className="animate-pulse text-accent" />
      </div>
    )
  }

const sidebarProps = {
  onPromptClick: handlePromptClick,
  onNewChat: resetChat,
  isLoggedIn: !!session,
  userEmail: session?.user?.email,
  userPlan,
  onToggleLogin: async () => {
    if (session) {
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('Logout error:', error)
        return
      }

      navigate('/', { replace: true })
    } else {
      navigate('/loginpage')
    }
  },
  conversations,
    activeConversationId,
    onTogglePin: togglePin,
    editingId,
    editValue,
    onEditValueChange: setEditValue,
    onStartRename: startRename,
    onSaveRename: saveRename,
    onCancelRename: cancelRename,
  }

  return (
    <div className="flex h-dvh flex-col bg-cream text-ink md:flex-row">
      {/* Desktop sidebar */}
      <aside
        className={`hidden shrink-0 border-r border-line bg-[#fdf8f2]/80 backdrop-blur-sm transition-[width] duration-200 md:block ${
          sidebarCollapsed ? 'w-[76px]' : 'w-[280px]'
        }`}
      >
        <SidebarContent
          {...sidebarProps}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        />
      </aside>

      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-line bg-cream/90 px-4 py-3 shadow-[var(--shadow-xs)] backdrop-blur-sm md:hidden">
        <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
          <Dialog.Trigger asChild>
            <button
              type="button"
              aria-label="Open menu"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5"
            >
              <List size={20} weight="bold" />
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/20" />
            <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-line bg-[#fdf8f2] shadow-[var(--shadow-lg)]">
              <Dialog.Title className="sr-only">ACQAR chat menu</Dialog.Title>
              <Dialog.Description className="sr-only">
                Pinned and recent chats, and a link back to the ACQAR site
              </Dialog.Description>
              <div className="flex shrink-0 justify-end px-4 pt-4">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Close menu"
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5"
                  >
                    <X size={20} weight="bold" />
                  </button>
                </Dialog.Close>
              </div>
              <SidebarContent {...sidebarProps} collapsed={false} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <Link to="/" className="flex items-center gap-1.5">
          <img src={acqarLogo} alt="ACQAR" className="h-5 w-auto" />
        </Link>

        <div className="flex items-center gap-1">
          {hasConversation && <ShareButton onShare={handleShare} copied={shareCopied} compact />}
          <button
            type="button"
            onClick={resetChat}
            aria-label="New chat"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-accent text-white shadow-[var(--shadow-xs)] transition-transform duration-200 active:scale-90"
          >
            <Plus size={18} weight="bold" />
          </button>
        </div>
      </div>

      {/* Main chat column */}
      <div className="grain relative flex flex-1 flex-col overflow-hidden">
        <LayeredGlow />
        <AdvisorPrompt visible={hasAnswer} />

        {/* Desktop-only conversation header — mobile already has the top bar above */}
        {hasConversation && (
          <div className="relative hidden shrink-0 items-center justify-end gap-1 border-b border-line bg-white/40 px-6 py-3 backdrop-blur-sm md:flex">
            <ShareButton onShare={handleShare} copied={shareCopied} />
            <button
              type="button"
              onClick={resetChat}
              className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-ink/70 transition-colors hover:bg-accent/5 hover:text-accent-dark"
            >
              <Plus size={15} weight="bold" />
              New chat
            </button>
          </div>
        )}

        {!hasConversation ? (
          <div className="relative mx-auto flex w-full max-w-[640px] flex-1 flex-col items-center justify-center px-6 text-center">
            <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-white text-accent shadow-[var(--shadow-md)]">
              <Sparkle weight="fill" size={24} />
            </span>
            <h1 className="text-3xl font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[2.5rem]">
              Ask ACQAR anything about{' '}
              <span className="bg-gradient-to-r from-accent via-[#c98a4a] to-accent-dark bg-clip-text text-transparent">
                a Dubai property.
              </span>
            </h1>
            <p className="mt-3 max-w-[480px] text-base leading-relaxed text-muted">
              Get a straight Buy, Sell, or Invest answer, backed by real DLD transaction data.
            </p>

            <ChatInputBar
              value={input}
              onChange={setInput}
              onSubmit={() => sendMessage(input)}
              className="mt-8 w-full"
              rotatingPlaceholder
            />

            <div className="mt-6 hidden w-full flex-wrap justify-center gap-2 sm:flex">
              {STARTER_PROMPTS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => sendMessage(label)}
                  className="cursor-pointer rounded-full border border-line bg-white px-4 py-2 text-left text-xs text-ink/70 shadow-[var(--shadow-xs)] transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:text-accent-dark hover:shadow-[var(--shadow-sm)] sm:text-sm"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-4 py-8 sm:px-8">
              <div className="mx-auto flex max-w-[720px] flex-col gap-6">
                {messages.map((m, i) =>
                  m.role === 'user' ? (
                    <UserMessage key={i} m={m} onEdit={() => editMessage(i)} />
                  ) : (
                    <AssistantMessage
                      key={i}
                      m={m}
                      onRegenerate={() => regenerate(i)}
                      onFeedback={(v) => setFeedback(i, v)}
                      isLast={i === messages.length - 1}
                    />
                  )
                )}

                {thinking && <ThinkingIndicator />}
              </div>
            </div>

            <div className="relative border-t border-line bg-cream/90 px-4 py-4 backdrop-blur-sm sm:px-8">
              <ChatInputBar
                value={input}
                onChange={setInput}
                onSubmit={() => sendMessage(input)}
                className="mx-auto w-full max-w-[720px]"
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ChatInputBar({ value, onChange, onSubmit, className = '', rotatingPlaceholder = false }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className={className}
    >
      <div className="flex items-center gap-2 rounded-full border border-line bg-white p-2 shadow-[var(--shadow-md)] transition-shadow focus-within:shadow-[var(--shadow-lg)]">
        <Sparkle weight="fill" size={18} className="ml-2 shrink-0 text-accent" />
        <div className="relative w-full">
          {rotatingPlaceholder && value === '' && (
            <TypingPlaceholder
              texts={STARTER_PROMPTS}
              mobileTexts={STARTER_PROMPTS_MOBILE}
              className="pointer-events-none absolute inset-y-0 left-0 flex items-center truncate px-1 py-2.5 text-base text-muted"
            />
          )}
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={rotatingPlaceholder ? '' : 'Ask about any Dubai property…'}
            className="w-full bg-transparent px-1 py-2.5 text-base text-ink placeholder:text-muted focus:outline-none"
          />
        </div>
        <button
          type="submit"
          aria-label="Send"
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-white shadow-[var(--shadow-glow)] transition-transform duration-200 hover:brightness-105 active:scale-90"
        >
          <ArrowUp weight="bold" size={17} />
        </button>
      </div>
    </form>
  )
}
