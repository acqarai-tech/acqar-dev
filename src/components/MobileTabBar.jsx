import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { HouseLine, Gauge, Sparkle, ChartLineUp, WhatsappLogo, X } from '@phosphor-icons/react'
import { INVESTOR_TOOLS_ITEMS } from '../data/navMenus'

const WHATSAPP_GREEN = '#25D366'

// Mobile-only bottom tab bar — desktop keeps the floating WhatsApp button
// instead (see FloatingAdvisorButton, hidden md:block there / this md:hidden
// here). Design pass only: Property Valuation, Insights, and the advisor
// destination are still placeholders ("#") pending real URLs/number.
// "Investors" (not "Tools"/"Invest") since it opens market intelligence —
// areas, reports, projects, trends — so ChartLineUp (a rising trend line)
// reads as market data at a glance. Gauge (a valuation-score dial)
// matches what ACQAR's real product shows for a property assessment —
// current price + outlook — not a scale (reads legal/justice). Advisor's icon uses real
// WhatsApp green so it reads instantly as "this opens WhatsApp" — the
// label stays in the normal brand palette like every other tab, only the
// icon breaks from it.
const TABS = [
  { key: 'home', label: 'Home', href: '/', Icon: HouseLine },
  { key: 'valuation', label: 'Valuation', href: '/valuations', Icon: Gauge },
  { key: 'ai', label: 'AI Agent', href: '/chat', Icon: Sparkle, featured: true },
  { key: 'insights', label: 'Investors', Icon: ChartLineUp, popup: true },
  { key: 'advisor', label: 'Advisor', href: '#', Icon: WhatsappLogo, iconColor: WHATSAPP_GREEN },
]

export default function MobileTabBar() {
  const { pathname } = useLocation()
  const [investorsOpen, setInvestorsOpen] = useState(false)

  return (
    <Dialog.Root open={investorsOpen} onOpenChange={setInvestorsOpen}>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-[20px] border-t border-line bg-cream/85 shadow-[0_-10px_28px_-6px_rgba(20,14,8,0.14),0_-3px_10px_-3px_rgba(20,14,8,0.08)] backdrop-blur-md md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 -top-10 -z-10 h-28 w-[340px] -translate-x-1/2 rounded-full opacity-[0.18] blur-[70px]"
          style={{ background: 'radial-gradient(circle, rgba(184,115,51,0.7), transparent 70%)' }}
        />
        <div className="mx-auto flex max-w-[520px] items-end justify-around px-2 pt-2">
          {TABS.map((tab) => {
            if (tab.featured) {
              return (
                <Link
                  key={tab.key}
                  to={tab.href}
                  className="flex min-h-11 min-w-[64px] cursor-pointer flex-col items-center gap-1 px-1 py-2"
                >
                  <span className="relative -mt-6 mb-0.5 flex h-14 w-14 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/30" />
                    <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-accent/20 bg-white shadow-[var(--shadow-md)]">
                      <tab.Icon weight="fill" size={30} className="text-accent" />
                    </span>
                  </span>
                  <span className="text-[10px] font-medium leading-none text-accent">
                    {tab.label}
                  </span>
                </Link>
              )
            }

            const isActive = tab.popup
              ? investorsOpen
              : tab.href !== '#' && (tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href))

            const content = (
              <>
                <tab.Icon
                  weight={isActive ? 'fill' : 'regular'}
                  size={26}
                  style={tab.iconColor ? { color: tab.iconColor } : undefined}
                />
                <span className="text-[10px] font-medium leading-none">
                  {tab.label}
                </span>
              </>
            )
            const className = `flex min-h-11 min-w-[56px] cursor-pointer flex-col items-center gap-1 rounded-lg px-1 py-2 transition-colors ${
              isActive ? 'text-accent' : 'text-muted'
            }`

            if (tab.popup) {
              return (
                <Dialog.Trigger asChild key={tab.key}>
                  <button type="button" className={className}>
                    {content}
                  </button>
                </Dialog.Trigger>
              )
            }

            return tab.href.startsWith('/') ? (
              <Link key={tab.key} to={tab.href} className={className}>
                {content}
              </Link>
            ) : (
              <a key={tab.key} href={tab.href} className={className}>
                {content}
              </a>
            )
          })}
        </div>
      </nav>

      <Dialog.Portal>
        <Dialog.Overlay className="nav-overlay fixed inset-0 z-[60] bg-ink/30 md:hidden" />
        <Dialog.Content
          className="investor-sheet fixed inset-x-0 bottom-0 z-[70] rounded-t-[28px] border-t border-line bg-cream px-6 pt-3 shadow-[var(--shadow-lg)] md:hidden"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Dialog.Title className="sr-only">Investor Tools</Dialog.Title>
          <Dialog.Description className="sr-only">
            Market intelligence tools for property investors
          </Dialog.Description>

          <div aria-hidden className="mx-auto h-1.5 w-10 rounded-full bg-line" />

          <div className="mt-4 flex items-center justify-between">
            <p className="text-lg font-semibold tracking-[-0.01em] text-ink">Investor Tools</p>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5"
              >
                <X size={20} weight="bold" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-3 flex flex-col gap-1 pb-2">
            {INVESTOR_TOOLS_ITEMS.map((item) => {
              const itemContent = (
                <>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-[#fdf8f2] text-accent">
                    <item.Icon weight="duotone" size={18} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">{item.label}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted">{item.desc}</span>
                  </span>
                </>
              )
              const itemClassName = 'flex cursor-pointer items-start gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-ink/5'
              return (
                <Dialog.Close asChild key={item.label}>
                  {item.href?.startsWith('/') ? (
                    <Link to={item.href} className={itemClassName}>
                      {itemContent}
                    </Link>
                  ) : (
                    <a href={item.href ?? '#'} className={itemClassName}>
                      {itemContent}
                    </a>
                  )}
                </Dialog.Close>
              )
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
