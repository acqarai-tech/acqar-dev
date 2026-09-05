import acqarLogo from "../assets/acqar-logo.webp";
import { useEffect, useState } from "react";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "ACQAR TruValu™", href: "/truvalu" },
      { label: "Pricing", href: "#for-brokers" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About ACQAR", href: "https://www.acqar.com/" },
      { label: "Contact Us", href: "#" },
      { label: "Brokers", href: "#for-brokers" },
    ],
  },
  {
    title: "Legal & Info",
    links: [
      { label: "Intelligence Blog", href: "#" },
      { label: "Terms of Use", href: "#" },
      { label: "Privacy Policy", href: "#" },
    ],
  },
];

export default function Footer() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const footerStyle = {
    borderTop: "1px solid #e5e7eb",
    padding: isMobile ? "40px 24px" : "56px 24px",
  };

  const gridStyle = {
    width: "100%",
    maxWidth: "1280px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: isMobile
      ? "1fr"
      : "repeat(4, minmax(0, 1fr))",
    gap: isMobile ? "40px" : "40px",
  };

  const brandStyle = {
    gridColumn: isMobile ? "auto" : "span 1",
  };

  const logoStyle = {
    height: "24px",
    width: "auto",
    display: "block",
  };

  const descriptionStyle = {
    marginTop: "12px",
    maxWidth: "240px",
    fontSize: "14px",
    lineHeight: "1.5",
    color: "#64748b",
    marginBottom: 0,
  };

  const columnTitleStyle = {
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "#64748b",
    margin: 0,
  };

  const listStyle = {
    listStyle: "none",
    padding: 0,
    margin: "12px 0 0 0",
  };

  const listItemStyle = {
    marginBottom: "8px",
  };

  const linkStyle = {
    cursor: "pointer",
    fontSize: "14px",
    color: "rgba(15, 23, 42, 0.7)",
    textDecoration: "none",
    transition: "color 0.2s ease",
  };

  const bottomStyle = {
    width: "100%",
    maxWidth: "1280px",
    margin: "40px auto 0",
    borderTop: "1px solid #e5e7eb",
    paddingTop: "24px",
    textAlign: "center",
    fontSize: "12px",
    color: "#64748b",
  };

  return (
    <footer style={footerStyle}>
      <div style={gridStyle}>

        {/* Logo / Description */}
        <div style={brandStyle}>
          <img
            src={acqarLogo}
            alt="ACQAR"
            style={logoStyle}
          />

          <p style={descriptionStyle}>
            The Real Estate AI Agent in your pocket. Independent, data-backed,
            and always on.
          </p>
        </div>

        {/* Footer Columns */}
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p style={columnTitleStyle}>
              {col.title}
            </p>

            <ul style={listStyle}>
              {col.links.map((link) => (
                <li key={link.label} style={listItemStyle}>
                  <a
                    href={link.href}
                    style={linkStyle}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#a56b2f";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color =
                        "rgba(15, 23, 42, 0.7)";
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
      <div style={bottomStyle}>
        © 2026 ACQARLABS L.L.C-FZ. All rights reserved.
      </div>
    </footer>
  );
}
