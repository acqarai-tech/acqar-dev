import acqarLogo from '../assets/acqar-logo.webp'
import { LinkedinLogo, InstagramLogo } from '@phosphor-icons/react'

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'ACQAR TruValu™', href: 'https://www.acqar.com/truvalu' },
      { label: 'ACQAR Signal™', href: 'https://www.acqar.com/signal' },
      { label: 'ACQAR Passport™', href: '#' },
      { label: 'Pricing', href: '#for-brokers' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About ACQAR', href: 'https://www.acqar.com/' },
      { label: 'Contact Us', href: '#' },
      { label: 'Brokers', href: '#for-brokers' },
      { label: 'Resources', href: 'https://www.acqar.com/blogs' },
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

const styles = `
  :root {
    --tf-line: #e5e7ec;
    --tf-muted: #6b7280;
    --tf-accent-dark: #b57a3f;
    --tf-ink: #0a0a0a;
  }

  .tf-footer {
    border-top: 1px solid var(--tf-line);
    padding: 56px 24px;
  }

  .tf-grid {
    margin: 0 auto;
    display: grid;
    max-width: 1280px;
    grid-template-columns: repeat(2, 1fr);
    gap: 40px;
  }
  @media (min-width: 640px) {
    .tf-grid { grid-template-columns: repeat(4, 1fr); }
  }

  .tf-brand-col { grid-column: span 2 / span 2; }
  @media (min-width: 640px) {
    .tf-brand-col { grid-column: span 1 / span 1; }
  }

  .tf-logo { height: 24px; width: auto; display: block; }

  .tf-tagline {
    margin-top: 12px;
    max-width: 240px;
    font-size: 14px;
    color: var(--tf-muted);
  }

  .tf-social-row { margin-top: 16px; display: flex; gap: 12px; }

  .tf-social-btn {
    display: flex;
    height: 36px; width: 36px;
    align-items: center; justify-content: center;
    border-radius: 999px;
    border: 1px solid var(--tf-line);
    color: var(--tf-muted);
    text-decoration: none;
    transition: border-color 0.2s, color 0.2s;
  }
  .tf-social-btn:hover {
    border-color: rgba(181, 122, 63, 0.4);
    color: var(--tf-accent-dark);
  }

  .tf-col-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--tf-muted);
  }

  .tf-col-list {
    margin-top: 12px;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .tf-col-link {
    cursor: pointer;
    font-size: 14px;
    color: rgba(10, 10, 10, 0.7);
    text-decoration: none;
    transition: color 0.2s;
  }
  .tf-col-link:hover { color: var(--tf-accent-dark); }

  .tf-bottom {
    margin: 40px auto 0;
    max-width: 1280px;
    border-top: 1px solid var(--tf-line);
    padding-top: 24px;
    text-align: center;
    font-size: 12px;
    color: var(--tf-muted);
  }
`;

export default function Footer() {
  return (
    <footer className="tf-footer">
      <style>{styles}</style>

      <div className="tf-grid">
        <div className="tf-brand-col">
          <img src={acqarLogo} alt="ACQAR" className="tf-logo" />
          <p className="tf-tagline">
            The Real Estate AI Agent in your pocket. Independent, data-backed, and
            always on.
          </p>
          <div className="tf-social-row">
            <a
              href="https://www.linkedin.com/company/acqar"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="tf-social-btn"
            >
              <LinkedinLogo weight="fill" size={16} />
            </a>
            <a
              href="https://www.instagram.com/acqar.dxb/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="tf-social-btn"
            >
              <InstagramLogo weight="fill" size={16} />
            </a>
          </div>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="tf-col-title">{col.title}</p>
            <ul className="tf-col-list">
              {col.links.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="tf-col-link">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="tf-bottom">
        © 2026 ACQARLABS L.L.C-FZ. All rights reserved.
      </div>
    </footer>
  )
}
