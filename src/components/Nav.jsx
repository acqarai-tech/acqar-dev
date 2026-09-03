import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import * as Accordion from '@radix-ui/react-accordion'
import { List, X, Sparkle, CaretDown } from '@phosphor-icons/react'
import acqarLogo from '../assets/acqar-logo.webp'
import { INVESTOR_TOOLS_ITEMS, INSIGHTS_ITEMS } from '../data/navMenus'
import { supabase } from '../lib/supabase'

function Logo() {
  return (
    <Link to="/" className="cursor-pointer">
      <img src={acqarLogo} alt="ACQAR" className="h-6 w-auto sm:h-7" />
    </Link>
  )
}

// Desktop-only nav — mobile keeps its bottom tab bar plus its own drawer
// menu. Home, AI Agent, and Advisor are dropped here since the logo
// (home), "Ask ACQAR Free" CTA, and the floating WhatsApp button already
// cover those.
const TAB_LINKS = [
  { href: '/valuations', label: 'Property Valuations' },
  { label: 'Investor Tools', items: INVESTOR_TOOLS_ITEMS },
  { href: '#for-brokers', label: 'Pricing' },
  { label: 'Insights', items: INSIGHTS_ITEMS },
  { href: 'https://www.acqar.com/', label: 'About Us' },
]

// Hover-intent dropdown (mirrors the shadcn NavigationMenu trigger/content
// pattern) implemented with plain state instead of pulling in
// @radix-ui/react-navigation-menu — this is the only place in the site that
// needs it, and the project already hand-builds its interactive pieces.
function NavDropdown({ label, items, delay }) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef(null)
  const rootRef = useRef(null)


  const openNow = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(true)
  }
  const closeSoon = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }

  useEffect(() => {
    if (!open) return undefined
    const handlePointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useEffect(() => () => closeTimer.current && clearTimeout(closeTimer.current), [])

  return (
    <div ref={rootRef} className="relative" onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className="nav-item-enter flex cursor-pointer items-center gap-1 font-medium text-ink/80 transition-colors duration-200 hover:text-accent-dark"
        style={{ animationDelay: `${delay}ms` }}
      >
        {label}
        <CaretDown
          weight="bold"
          size={11}
          className={`transition-transform duration-200 ${open ? 'rotate-180 text-accent-dark' : 'text-ink/40'}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-1/2 top-full z-50 mt-3 w-[320px] -translate-x-1/2 rounded-2xl border border-line bg-white p-2 shadow-[var(--shadow-lg)]"
        >
          {items.map((item) => {
            const itemContent = (
              <>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-[#fdf8f2] text-accent">
                  <item.Icon weight="duotone" size={17} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink">{item.label}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted">{item.desc}</span>
                </span>
              </>
            )
            const itemClassName = 'flex cursor-pointer items-start gap-3 rounded-xl p-3 transition-colors hover:bg-accent/5'
            return item.href?.startsWith('/') ? (
              <Link key={item.label} to={item.href} role="menuitem" className={itemClassName} onClick={() => setOpen(false)}>
                {itemContent}
              </Link>
            ) : (
              <a key={item.label} href={item.href ?? '#'} role="menuitem" className={itemClassName}>
                {itemContent}
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Mobile drawer counterpart to NavDropdown — same items, expand-on-tap via
// accordion instead of hover (mirrors the shadcn navbar reference's own
// mobile pattern of collapsing dropdown items into an accordion).
function MobileNavAccordion({ value, label, items }) {
  return (
    <Accordion.Item value={value} className="border-b-0">
      <Accordion.Header>
        <Accordion.Trigger className="group flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-3 text-left text-base text-ink/80 transition-colors hover:bg-ink/5 hover:text-ink">
          {label}
          <CaretDown
            weight="bold"
            size={14}
            className="shrink-0 text-ink/40 transition-transform duration-300 group-data-[state=open]:rotate-180 group-data-[state=open]:text-accent-dark"
          />
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content className="faq-content">
        <div className="flex flex-col gap-0.5 py-1">
          {items.map((item) => {
            const itemContent = (
              <>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-[#fdf8f2] text-accent">
                  <item.Icon weight="duotone" size={15} />
                </span>
                <span>
                  <span className="block text-sm font-medium text-ink">{item.label}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted">{item.desc}</span>
                </span>
              </>
            )
            const itemClassName = 'flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-ink/5'
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
      </Accordion.Content>
    </Accordion.Item>
  )
}

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
 
  const rowRef = useRef(null)
  const [headerHeight, setHeaderHeight] = useState(0)
  const navigate = useNavigate()
  const [session, setSession] = useState(null)


  useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session)
  })

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session)
  })

  return () => subscription.unsubscribe()
}, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const el = rowRef.current
    if (!el) return
    // Exposed as a CSS var so any page can stick content directly under the
    // fixed header (e.g. AreaDetailPage's sticky persona/timeline tabs)
    // without re-measuring it themselves.
    const update = () => {
      const h = el.offsetHeight
      setHeaderHeight(h)
      document.documentElement.style.setProperty('--nav-height', `${h}px`)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <div ref={rowRef} className="mx-auto">
          {/* Desktop row: floating pill, content scrolls visibly behind it.
              Width mirrors the Capabilities section (px-6 + max-w-1280) so
              the pill's edges line up with the first/last capability cards. */}
          <div className="hidden px-6 pt-6 pb-4 md:block">
            <div
              className={`nav-pill mx-auto flex max-w-[1280px] items-center justify-between gap-8 rounded-full border border-line/70 bg-white/90 px-7 py-4 backdrop-blur-md transition-shadow duration-300 ${
                scrolled ? 'shadow-[var(--shadow-lg)]' : 'shadow-[var(--shadow-sm)]'
              }`}
            >
              <Logo />
              <nav className="flex items-center gap-7 text-sm text-ink/80">
                {TAB_LINKS.map((l, i) =>
                  l.items ? (
                    <NavDropdown key={l.label} label={l.label} items={l.items} delay={i * 40} />
                  ) : l.href.startsWith('/') ? (
                    <Link
                      key={l.label}
                      to={l.href}
                      className="nav-item-enter cursor-pointer font-medium transition-colors duration-200 hover:text-accent-dark"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      {l.label}
                    </Link>
                  ) : (
                    <a
                      key={l.label}
                      href={l.href}
                      className="nav-item-enter cursor-pointer font-medium transition-colors duration-200 hover:text-accent-dark"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      {l.label}
                    </a>
                  )
                )}
              </nav>
              <div className="flex items-center gap-4">
{session ? (
  <button
    type="button"
    onClick={async () => {
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('Logout error:', error)
        return
      }

      navigate('/loginpage')
    }}
    className="cursor-pointer text-sm text-ink/80 transition-colors hover:text-ink"
  >
    Log out
  </button>
) : (
  <Link
    to="/loginpage"
    className="cursor-pointer text-sm text-ink/80 transition-colors hover:text-ink"
  >
    Log in
  </Link>
)}
                <Link
                  to="/chat"
                  className="cursor-pointer rounded-full bg-accent px-5 py-2 text-sm font-medium text-white shadow-[var(--shadow-sm)] transition-all duration-200 hover:scale-[1.03] hover:shadow-[var(--shadow-md)] active:scale-95"
                >
                  Ask ACQAR Free
                </Link>
              </div>
            </div>
          </div>

          {/* Mobile row: menu left, logo centered, AI chat right */}
          <div
            className={`grid grid-cols-3 items-center bg-cream/85 px-6 py-4 backdrop-blur-md transition-shadow duration-300 md:hidden ${
              scrolled ? 'shadow-[var(--shadow-sm)]' : ''
            }`}
          >
            <Dialog.Trigger asChild>
              <button
                type="button"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                className="flex h-10 w-10 cursor-pointer items-center justify-center justify-self-start rounded-full text-ink transition-colors hover:bg-ink/5"
              >
                {menuOpen ? <X size={22} weight="bold" /> : <List size={22} weight="bold" />}
              </button>
            </Dialog.Trigger>
            <div className="justify-self-center">
              <Logo />
            </div>
            <Link
              to="/chat"
              aria-label="Ask ACQAR AI assistant"
              title="Ask ACQAR AI assistant"
              className="flex h-10 w-10 cursor-pointer items-center justify-center justify-self-end rounded-full bg-accent text-white shadow-[var(--shadow-sm)] transition-transform duration-200 active:scale-95"
            >
              <Sparkle size={20} weight="fill" />
            </Link>
          </div>
        </div>

        <Dialog.Portal>
          <Dialog.Overlay
            className="nav-overlay fixed inset-x-0 bottom-0 z-40 bg-ink/20 md:hidden"
            style={{ top: headerHeight }}
          />
          <Dialog.Content
            className="nav-drawer fixed inset-x-0 z-50 border-t border-line bg-cream px-6 py-4 shadow-[var(--shadow-lg)] md:hidden"
            style={{ top: headerHeight }}
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Dialog.Title className="sr-only">Navigation menu</Dialog.Title>
            <Dialog.Description className="sr-only">
              Links to jump to sections of the ACQAR landing page
            </Dialog.Description>
            <Accordion.Root type="single" collapsible className="flex flex-col gap-1">
              <Dialog.Close asChild>
                <Link
                  to="/chat"
                  className="mb-2 cursor-pointer rounded-full bg-accent px-4 py-3 text-center text-sm font-medium text-white shadow-[var(--shadow-sm)] transition-all duration-200 active:scale-95"
                >
                  Ask ACQAR Free
                </Link>
              </Dialog.Close>
              <Dialog.Close asChild>
                <Link
                  to="/valuations"
                  className="cursor-pointer rounded-lg px-2 py-3 text-base text-ink/80 transition-colors hover:bg-ink/5 hover:text-ink"
                >
                  Property Valuations
                </Link>
              </Dialog.Close>
              <MobileNavAccordion value="investor-tools" label="Investor Tools" items={INVESTOR_TOOLS_ITEMS} />
              <Dialog.Close asChild>
                <a
                  href="#for-brokers"
                  className="cursor-pointer rounded-lg px-2 py-3 text-base text-ink/80 transition-colors hover:bg-ink/5 hover:text-ink"
                >
                  Pricing
                </a>
              </Dialog.Close>
              <MobileNavAccordion value="insights" label="Insights" items={INSIGHTS_ITEMS} />
              {session ? (
                <>
                  <Dialog.Close asChild>
                    <a
                      href="#"
                      className="cursor-pointer rounded-lg px-2 py-3 text-base text-ink/80 transition-colors hover:bg-ink/5 hover:text-ink"
                    >
                      Profile
                    </a>
                  </Dialog.Close>
                 <button
  type="button"
  onClick={async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Logout error:', error)
      return
    }

    setMenuOpen(false)
    navigate('/loginpage')
  }}
  className="cursor-pointer rounded-lg px-2 py-3 text-left text-base text-ink/80 transition-colors hover:bg-ink/5 hover:text-ink"
>
  Logout
</button>
                </>
              ) : (
               <button
  type="button"
  onClick={() => navigate('/loginpage')}
  className="cursor-pointer rounded-lg px-2 py-3 text-left text-base text-ink/80 transition-colors hover:bg-ink/5 hover:text-ink"
>
  Login
</button>
              )}
            </Accordion.Root>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </header>
  )
}
