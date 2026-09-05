import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import * as Accordion from '@radix-ui/react-accordion'
import { List, X, Sparkle, CaretDown } from '@phosphor-icons/react'
import acqarLogo from '../assets/acqar-logo.webp'
import { INVESTOR_TOOLS_ITEMS, INSIGHTS_ITEMS } from '../data/navMenus'
import { supabase } from '../lib/supabase'

function Logo() {
  const styles = {
    link: {
      display: 'inline-flex',
      alignItems: 'center',
      cursor: 'pointer',
      textDecoration: 'none',
    },
    image: {
      height: '28px',
      width: 'auto',
      display: 'block',
    },
  }

  return (
    <Link to="/" style={styles.link}>
      <img src={acqarLogo} alt="ACQAR" style={styles.image} />
    </Link>
  )
}

// Desktop navigation links
const TAB_LINKS = [
  {
    href: '/valuations',
    label: 'Property Valuations',
  },
  {
    label: 'Investor Tools',
    items: INVESTOR_TOOLS_ITEMS,
  },
  {
    href: '#for-brokers',
    label: 'Pricing',
  },
  {
    label: 'Insights',
    items: INSIGHTS_ITEMS,
  },
  {
    href: 'https://www.acqar.com/',
    label: 'About Us',
  },
]

function NavDropdown({ label, items, delay = 0 }) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef(null)
  const rootRef = useRef(null)

  const [buttonHovered, setButtonHovered] = useState(false)

  const openNow = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
    }

    setOpen(true)
  }

  const closeSoon = () => {
    closeTimer.current = setTimeout(() => {
      setOpen(false)
    }, 150)
  }

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    return () => {
      if (closeTimer.current) {
        clearTimeout(closeTimer.current)
      }
    }
  }, [])

  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    padding: 0,
    margin: 0,
    fontSize: '14px',
    fontWeight: 500,
    color: buttonHovered || open ? 'var(--accent-dark, #9a6b3f)' : 'rgba(20, 20, 20, 0.8)',
    transition: 'color 200ms ease',
    animationDelay: `${delay}ms`,
    fontFamily: 'inherit',
  }

  const dropdownStyle = {
    position: 'absolute',
    left: '50%',
    top: '100%',
    zIndex: 50,
    marginTop: '12px',
    width: '320px',
    transform: 'translateX(-50%)',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    borderRadius: '16px',
    background: '#ffffff',
    padding: '8px',
    boxShadow:
      '0 18px 45px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06)',
  }

  const itemStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    width: '100%',
    boxSizing: 'border-box',
    cursor: 'pointer',
    borderRadius: '12px',
    padding: '12px',
    textDecoration: 'none',
    transition: 'background-color 150ms ease',
    color: 'inherit',
  }

  const iconBoxStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    border: '1px solid rgba(180, 130, 80, 0.2)',
    background: '#fdf8f2',
    color: 'var(--accent, #a97845)',
  }

  const titleStyle = {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    lineHeight: 1.4,
    color: 'var(--ink, #1c1c1c)',
  }

  const descriptionStyle = {
    display: 'block',
    marginTop: '2px',
    fontSize: '12px',
    lineHeight: 1.4,
    color: 'var(--muted, #777)',
  }

  return (
    <div
      ref={rootRef}
      style={{
        position: 'relative',
      }}
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        style={buttonStyle}
        onMouseEnter={() => setButtonHovered(true)}
        onMouseLeave={() => setButtonHovered(false)}
      >
        {label}

        <CaretDown
          weight="bold"
          size={11}
          style={{
            transition: 'transform 200ms ease, color 200ms ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            color: open
              ? 'var(--accent-dark, #9a6b3f)'
              : 'rgba(20, 20, 20, 0.4)',
          }}
        />
      </button>

      {open && (
        <div role="menu" style={dropdownStyle}>
          {items.map((item) => {
            const content = (
              <>
                <span style={iconBoxStyle}>
                  <item.Icon weight="duotone" size={17} />
                </span>

                <span>
                  <span style={titleStyle}>{item.label}</span>

                  <span style={descriptionStyle}>
                    {item.desc}
                  </span>
                </span>
              </>
            )

            const commonProps = {
              role: 'menuitem',
              style: itemStyle,
              onMouseEnter: (e) => {
                e.currentTarget.style.backgroundColor =
                  'rgba(180, 130, 80, 0.06)'
              },
              onMouseLeave: (e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              },
            }

            if (item.href?.startsWith('/')) {
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  {...commonProps}
                  onClick={() => setOpen(false)}
                >
                  {content}
                </Link>
              )
            }

            return (
              <a
                key={item.label}
                href={item.href ?? '#'}
                {...commonProps}
                onClick={() => setOpen(false)}
              >
                {content}
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MobileNavAccordion({ value, label, items }) {
  const triggerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    boxSizing: 'border-box',
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    borderRadius: '8px',
    padding: '12px 8px',
    textAlign: 'left',
    fontSize: '16px',
    fontWeight: 400,
    color: 'rgba(20, 20, 20, 0.8)',
    transition: 'background-color 150ms ease, color 150ms ease',
    fontFamily: 'inherit',
  }

  const itemStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    width: '100%',
    boxSizing: 'border-box',
    cursor: 'pointer',
    borderRadius: '8px',
    padding: '10px 8px',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'background-color 150ms ease',
  }

  const iconStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: '1px solid rgba(180, 130, 80, 0.2)',
    background: '#fdf8f2',
    color: 'var(--accent, #a97845)',
  }

  return (
    <Accordion.Item
      value={value}
      style={{
        borderBottom: 'none',
      }}
    >
      <Accordion.Header>
        <Accordion.Trigger
          style={triggerStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'
            e.currentTarget.style.color = '#1c1c1c'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'rgba(20, 20, 20, 0.8)'
          }}
        >
          {label}

          <CaretDown
            weight="bold"
            size={14}
            style={{
              flexShrink: 0,
              color: 'rgba(20, 20, 20, 0.4)',
              transition: 'transform 300ms ease, color 300ms ease',
            }}
          />
        </Accordion.Trigger>
      </Accordion.Header>

      <Accordion.Content
        style={{
          overflow: 'hidden',
          animationDuration: '250ms',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            paddingTop: '4px',
            paddingBottom: '4px',
          }}
        >
          {items.map((item) => {
            const content = (
              <>
                <span style={iconStyle}>
                  <item.Icon weight="duotone" size={15} />
                </span>

                <span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 500,
                      lineHeight: 1.4,
                      color: 'var(--ink, #1c1c1c)',
                    }}
                  >
                    {item.label}
                  </span>

                  <span
                    style={{
                      display: 'block',
                      marginTop: '2px',
                      fontSize: '12px',
                      lineHeight: 1.4,
                      color: 'var(--muted, #777)',
                    }}
                  >
                    {item.desc}
                  </span>
                </span>
              </>
            )

            const commonProps = {
              style: itemStyle,
              onMouseEnter: (e) => {
                e.currentTarget.style.backgroundColor =
                  'rgba(0, 0, 0, 0.05)'
              },
              onMouseLeave: (e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              },
            }

            return (
              <Dialog.Close asChild key={item.label}>
                {item.href?.startsWith('/') ? (
                  <Link to={item.href} {...commonProps}>
                    {content}
                  </Link>
                ) : (
                  <a href={item.href ?? '#'} {...commonProps}>
                    {content}
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
  const [headerHeight, setHeaderHeight] = useState(0)
  const [session, setSession] = useState(null)

  const rowRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setSession(session)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8)
    }

    onScroll()

    window.addEventListener('scroll', onScroll, {
      passive: true,
    })

    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  useEffect(() => {
    const el = rowRef.current

    if (!el) return

    const update = () => {
      const height = el.offsetHeight

      setHeaderHeight(height)

      document.documentElement.style.setProperty(
        '--nav-height',
        `${height}px`
      )
    }

    update()

    const resizeObserver = new ResizeObserver(update)
    resizeObserver.observe(el)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const headerStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  }

  const desktopWrapperStyle = {
    display: 'none',
    paddingLeft: '24px',
    paddingRight: '24px',
    paddingTop: '24px',
    paddingBottom: '16px',
  }

  const desktopPillStyle = {
    maxWidth: '1280px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '32px',
    borderRadius: '9999px',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    background: 'rgba(255, 255, 255, 0.9)',
    padding: '16px 28px',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    transition: 'box-shadow 300ms ease',
    boxShadow: scrolled
      ? '0 18px 45px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06)'
      : '0 4px 12px rgba(0, 0, 0, 0.06)',
  }

  const navStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '28px',
    fontSize: '14px',
    color: 'rgba(20, 20, 20, 0.8)',
  }

  const standardNavLinkStyle = {
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    color: 'rgba(20, 20, 20, 0.8)',
    textDecoration: 'none',
    transition: 'color 200ms ease',
    whiteSpace: 'nowrap',
  }

  const authAreaStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  }

  const loginButtonStyle = {
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    padding: 0,
    fontSize: '14px',
    color: 'rgba(20, 20, 20, 0.8)',
    transition: 'color 200ms ease',
    fontFamily: 'inherit',
  }

  const ctaStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    borderRadius: '9999px',
    background: 'var(--accent, #a97845)',
    padding: '8px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#ffffff',
    textDecoration: 'none',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    transition:
      'transform 200ms ease, box-shadow 200ms ease',
    whiteSpace: 'nowrap',
  }

  const mobileRowStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    alignItems: 'center',
    background: 'rgba(250, 247, 241, 0.85)',
    padding: '16px 24px',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    transition: 'box-shadow 300ms ease',
    boxShadow: scrolled
      ? '0 4px 12px rgba(0, 0, 0, 0.08)'
      : 'none',
  }

  const mobileMenuButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    justifySelf: 'start',
    width: '40px',
    height: '40px',
    cursor: 'pointer',
    border: 'none',
    borderRadius: '9999px',
    background: 'transparent',
    color: '#1c1c1c',
    transition: 'background-color 150ms ease',
    padding: 0,
  }

  const mobileLogoWrapperStyle = {
    justifySelf: 'center',
    display: 'flex',
    alignItems: 'center',
  }

  const mobileChatButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    justifySelf: 'end',
    width: '40px',
    height: '40px',
    cursor: 'pointer',
    borderRadius: '9999px',
    background: 'var(--accent, #a97845)',
    color: '#ffffff',
    textDecoration: 'none',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    transition: 'transform 200ms ease',
  }

  const overlayStyle = {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    top: `${headerHeight}px`,
    zIndex: 40,
    background: 'rgba(20, 20, 20, 0.2)',
  }

  const drawerStyle = {
    position: 'fixed',
    left: 0,
    right: 0,
    top: `${headerHeight}px`,
    zIndex: 50,
    borderTop: '1px solid rgba(0, 0, 0, 0.08)',
    background: '#faf7f1',
    padding: '16px 24px',
    boxShadow:
      '0 18px 45px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06)',
    overflowY: 'auto',
    maxHeight: `calc(100vh - ${headerHeight}px)`,
  }

  const drawerLinkStyle = {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    cursor: 'pointer',
    borderRadius: '8px',
    padding: '12px 8px',
    fontSize: '16px',
    fontWeight: 400,
    color: 'rgba(20, 20, 20, 0.8)',
    textDecoration: 'none',
    transition: 'background-color 150ms ease, color 150ms ease',
    border: 'none',
    background: 'transparent',
    textAlign: 'left',
    fontFamily: 'inherit',
  }

  const drawerCtaStyle = {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    marginBottom: '8px',
    cursor: 'pointer',
    borderRadius: '9999px',
    background: 'var(--accent, #a97845)',
    padding: '12px 16px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: 500,
    color: '#ffffff',
    textDecoration: 'none',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  }

  return (
    <header style={headerStyle}>
      <Dialog.Root
        open={menuOpen}
        onOpenChange={setMenuOpen}
      >
        <div
          ref={rowRef}
          style={{
            width: '100%',
          }}
        >
          {/* Desktop navigation */}
          <div
            className="desktop-nav"
            style={desktopWrapperStyle}
          >
            <div style={desktopPillStyle}>
              <Logo />

              <nav style={navStyle}>
                {TAB_LINKS.map((link, index) =>
                  link.items ? (
                    <NavDropdown
                      key={link.label}
                      label={link.label}
                      items={link.items}
                      delay={index * 40}
                    />
                  ) : link.href.startsWith('/') ? (
                    <Link
                      key={link.label}
                      to={link.href}
                      style={standardNavLinkStyle}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color =
                          'var(--accent-dark, #9a6b3f)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color =
                          'rgba(20, 20, 20, 0.8)'
                      }}
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      key={link.label}
                      href={link.href}
                      style={standardNavLinkStyle}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color =
                          'var(--accent-dark, #9a6b3f)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color =
                          'rgba(20, 20, 20, 0.8)'
                      }}
                    >
                      {link.label}
                    </a>
                  )
                )}
              </nav>

              <div style={authAreaStyle}>
                {session ? (
                  <button
                    type="button"
                    onClick={async () => {
                      const { error } =
                        await supabase.auth.signOut()

                      if (error) {
                        console.error(
                          'Logout error:',
                          error
                        )
                        return
                      }

                      navigate('/')
                    }}
                    style={loginButtonStyle}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#1c1c1c'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color =
                        'rgba(20, 20, 20, 0.8)'
                    }}
                  >
                    Log out
                  </button>
                ) : (
                  <Link
                    to="/loginpage"
                    style={{
                      ...loginButtonStyle,
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#1c1c1c'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color =
                        'rgba(20, 20, 20, 0.8)'
                    }}
                  >
                    Log in
                  </Link>
                )}

                <Link
                  to="/chat"
                  style={ctaStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform =
                      'scale(1.03)'
                    e.currentTarget.style.boxShadow =
                      '0 10px 25px rgba(0, 0, 0, 0.12)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform =
                      'scale(1)'
                    e.currentTarget.style.boxShadow =
                      '0 4px 12px rgba(0, 0, 0, 0.08)'
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform =
                      'scale(0.95)'
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform =
                      'scale(1.03)'
                  }}
                >
                  Ask ACQAR Free
                </Link>
              </div>
            </div>
          </div>

          {/* Mobile navigation */}
          <div
            className="mobile-nav"
            style={mobileRowStyle}
          >
            <Dialog.Trigger asChild>
              <button
                type="button"
                aria-label={
                  menuOpen ? 'Close menu' : 'Open menu'
                }
                style={mobileMenuButtonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'rgba(0, 0, 0, 0.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'transparent'
                }}
              >
                {menuOpen ? (
                  <X size={22} weight="bold" />
                ) : (
                  <List size={22} weight="bold" />
                )}
              </button>
            </Dialog.Trigger>

            <div style={mobileLogoWrapperStyle}>
              <Logo />
            </div>

            <Link
              to="/chat"
              aria-label="Ask ACQAR AI assistant"
              title="Ask ACQAR AI assistant"
              style={mobileChatButtonStyle}
              onMouseDown={(e) => {
                e.currentTarget.style.transform =
                  'scale(0.95)'
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform =
                  'scale(1)'
              }}
            >
              <Sparkle size={20} weight="fill" />
            </Link>
          </div>
        </div>

        <Dialog.Portal>
          <Dialog.Overlay style={overlayStyle} />

          <Dialog.Content
            style={drawerStyle}
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Dialog.Title
              style={{
                position: 'absolute',
                width: '1px',
                height: '1px',
                padding: 0,
                margin: '-1px',
                overflow: 'hidden',
                clip: 'rect(0, 0, 0, 0)',
                whiteSpace: 'nowrap',
                border: 0,
              }}
            >
              Navigation menu
            </Dialog.Title>

            <Dialog.Description
              style={{
                position: 'absolute',
                width: '1px',
                height: '1px',
                padding: 0,
                margin: '-1px',
                overflow: 'hidden',
                clip: 'rect(0, 0, 0, 0)',
                whiteSpace: 'nowrap',
                border: 0,
              }}
            >
              Links to navigate the ACQAR website
            </Dialog.Description>

            <Accordion.Root
              type="single"
              collapsible
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <Dialog.Close asChild>
                <Link
                  to="/chat"
                  style={drawerCtaStyle}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform =
                      'scale(0.95)'
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform =
                      'scale(1)'
                  }}
                >
                  Ask ACQAR Free
                </Link>
              </Dialog.Close>

              <Dialog.Close asChild>
                <Link
                  to="/valuations"
                  style={drawerLinkStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      'rgba(0, 0, 0, 0.05)'
                    e.currentTarget.style.color = '#1c1c1c'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      'transparent'
                    e.currentTarget.style.color =
                      'rgba(20, 20, 20, 0.8)'
                  }}
                >
                  Property Valuations
                </Link>
              </Dialog.Close>

              <MobileNavAccordion
                value="investor-tools"
                label="Investor Tools"
                items={INVESTOR_TOOLS_ITEMS}
              />

              <Dialog.Close asChild>
                <a
                  href="#for-brokers"
                  style={drawerLinkStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      'rgba(0, 0, 0, 0.05)'
                    e.currentTarget.style.color = '#1c1c1c'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      'transparent'
                    e.currentTarget.style.color =
                      'rgba(20, 20, 20, 0.8)'
                  }}
                >
                  Pricing
                </a>
              </Dialog.Close>

              <MobileNavAccordion
                value="insights"
                label="Insights"
                items={INSIGHTS_ITEMS}
              />

              {session ? (
                <>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      style={drawerLinkStyle}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          'rgba(0, 0, 0, 0.05)'
                        e.currentTarget.style.color =
                          '#1c1c1c'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          'transparent'
                        e.currentTarget.style.color =
                          'rgba(20, 20, 20, 0.8)'
                      }}
                    >
                      Profile
                    </button>
                  </Dialog.Close>

                  <button
                    type="button"
                    onClick={async () => {
                      const { error } =
                        await supabase.auth.signOut()

                      if (error) {
                        console.error(
                          'Logout error:',
                          error
                        )
                        return
                      }

                      setMenuOpen(false)
                      navigate('/')
                    }}
                    style={{
                      ...drawerLinkStyle,
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        'rgba(0, 0, 0, 0.05)'
                      e.currentTarget.style.color =
                        '#1c1c1c'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        'transparent'
                      e.currentTarget.style.color =
                        'rgba(20, 20, 20, 0.8)'
                    }}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    navigate('/loginpage')
                  }}
                  style={{
                    ...drawerLinkStyle,
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      'rgba(0, 0, 0, 0.05)'
                    e.currentTarget.style.color = '#1c1c1c'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      'transparent'
                    e.currentTarget.style.color =
                      'rgba(20, 20, 20, 0.8)'
                  }}
                >
                  Login
                </button>
              )}
            </Accordion.Root>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Responsive display rules */}
      <style>
        {`
          .desktop-nav {
            display: none !important;
          }

          .mobile-nav {
            display: grid !important;
          }

          @media (min-width: 768px) {
            .desktop-nav {
              display: block !important;
            }

            .mobile-nav {
              display: none !important;
            }
          }

          [data-radix-accordion-content] {
            overflow: hidden;
          }

          [data-radix-accordion-content][data-state="open"] {
            animation: accordion-down 250ms ease-out;
          }

          [data-radix-accordion-content][data-state="closed"] {
            animation: accordion-up 250ms ease-out;
          }

          @keyframes accordion-down {
            from {
              height: 0;
            }
            to {
              height: var(--radix-accordion-content-height);
            }
          }

          @keyframes accordion-up {
            from {
              height: var(--radix-accordion-content-height);
            }
            to {
              height: 0;
            }
          }
        `}
      </style>
    </header>
  )
}
