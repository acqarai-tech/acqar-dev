import { useEffect, useState } from 'react'
import acqarLogo from '../assets/acqar-logo.webp'

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'ACQAR TruValu™', href: '/truvalu' },
      { label: 'Pricing', href: '#for-brokers' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About ACQAR', href: 'https://www.acqar.com/' },
      { label: 'Contact Us', href: '#' },
      { label: 'Brokers', href: '#for-brokers' },
    ],
  },
  {
    title: 'Legal & Info',
    links: [
      { label: 'Intelligence Blog', href: '#' },
      { label: 'Terms of Use', href: '#' },
      { label: 'Privacy Policy', href: '#' },
    ],
  },
]

export default function Footer() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  )

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640)
    }

    handleResize()

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const footerStyle = {
    borderTop: '1px solid rgba(0, 0, 0, 0.08)',
    padding: isMobile ? '48px 24px' : '56px 24px',
    width: '100%',
    boxSizing: 'border-box',
  }

  const containerStyle = {
    maxWidth: '1280px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: isMobile
      ? 'repeat(2, minmax(0, 1fr))'
      : 'repeat(4, minmax(0, 1fr))',
    gap: isMobile ? '40px' : '40px',
    width: '100%',
    boxSizing: 'border-box',
  }

  const logoColumnStyle = {
    gridColumn: isMobile ? 'span 2' : 'span 1',
  }

  const logoStyle = {
    height: '24px',
    width: 'auto',
    display: 'block',
  }

  const descriptionStyle = {
    margin: '12px 0 0',
    maxWidth: '240px',
    fontSize: '14px',
    lineHeight: '1.5',
    color: 'var(--muted, #777)',
  }

  const columnTitleStyle = {
    margin: 0,
    fontSize: '11px',
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--muted, #777)',
  }

  const listStyle = {
    margin: '12px 0 0',
    padding: 0,
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  }

  const copyrightContainerStyle = {
    maxWidth: '1280px',
    margin: '40px auto 0',
    borderTop: '1px solid rgba(0, 0, 0, 0.08)',
    paddingTop: '24px',
    textAlign: 'center',
    fontSize: '12px',
    lineHeight: 1.5,
    color: 'var(--muted, #777)',
  }

  return (
    <footer style={footerStyle}>
      <div style={containerStyle}>
        {/* Logo and description */}
        <div style={logoColumnStyle}>
          <img
            src={acqarLogo}
            alt="ACQAR"
            style={logoStyle}
          />

          <p style={descriptionStyle}>
            The Real Estate AI Agent in your pocket.
            Independent, data-backed, and always on.
          </p>
        </div>

        {/* Footer columns */}
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p style={columnTitleStyle}>
              {column.title}
            </p>

            <ul style={listStyle}>
              {column.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    style={{
                      cursor: 'pointer',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      color: 'rgba(20, 20, 20, 0.7)',
                      textDecoration: 'none',
                      transition: 'color 200ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color =
                        'var(--accent-dark, #9a6b3f)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color =
                        'rgba(20, 20, 20, 0.7)'
                    }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Copyright */}
      <div style={copyrightContainerStyle}>
        © 2026 ACQARLABS L.L.C-FZ. All rights reserved.
      </div>
    </footer>
  )
}
```
