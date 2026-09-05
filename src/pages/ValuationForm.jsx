import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import NavBar from "../components/Nav";
import { supabase } from "../lib/supabase";
import PaywallModal from "../components/PaywallModal";
import { trackEvent } from "../analytics";
// import { Helmet } from "react-helmet-async";
import "../styles/truvalu-dark.css";

const RAW_API = process.env.REACT_APP_AVM_API;
const API = RAW_API ? RAW_API.replace(/\/+$/, "") : "";

console.log("RAW_API:", RAW_API);
console.log("API:", API);

/* ✅ ADDED: Fonts + Material Symbols for this screen */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; }

  :root {
    --primary: #2B2B2B;
    --accent-copper: #B87333;
    --gray-light: #D4D4D4;
    --gray-medium: #B3B3B3;
    --bg-off-white: #FAFAFA;
  }

  .mat-icon {
    font-family: 'Material Symbols Outlined';
    font-weight: normal;
    font-style: normal;
    font-size: 1.25rem;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-smoothing: antialiased;
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    user-select: none;
  }
  .mat-icon.fill { font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
  .mat-icon.sm { font-size: 1rem; }
  .mat-icon.xs { font-size: 0.75rem; }
  .mat-icon.lg { font-size: 1.5rem; }

  .container { max-width: 80rem; margin: 0 auto; padding: 0 1.5rem; }
  .container-sm { max-width: 64rem; margin: 0 auto; padding: 0 1.5rem; }

  /* ---------- Responsive helpers ---------- */
  .hide-desktop { display: none; }
  .stack { display: flex; gap: 12px; align-items: center; }
  .no-wrap { white-space: nowrap; }

  /* Make sticky header usable on small screens */
  @media (max-width: 1024px) {
    .container { padding: 0 1rem; }
    .container-sm { padding: 0 1rem; }
  }
  @media (max-width: 900px) {
    .hide-mobile { display: none !important; }
    .hide-desktop { display: inline-flex; }
  }

  /* ---------- Pricing cards grid ---------- */
  .pricing-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1.1fr 1fr;
    gap: 16px;
    align-items: start;
  }
  @media (max-width: 1200px) {
    .pricing-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 640px) {
    .pricing-grid { grid-template-columns: 1fr; }
  }

  /* ---------- Compare table responsiveness ---------- */
  .compare-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .compare-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1.1fr 1fr;
    min-width: 820px; /* keeps layout intact; scroll on small screens */
  }
  @media (max-width: 640px) {
    .compare-grid { min-width: 760px; }
  }

  /* ---------- Savings section layout ---------- */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  @media (max-width: 900px) {
    .two-col { grid-template-columns: 1fr; }
  }

  /* ---------- Footer grid ---------- */
  .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 48px; }
  @media (max-width: 900px) {
    .footer-grid { grid-template-columns: 1fr 1fr; gap: 28px; }
  }
  @media (max-width: 520px) {
    .footer-grid { grid-template-columns: 1fr; }
  }

  /* ---------- Range ---------- */
  input[type=range] {
    -webkit-appearance: none;
    width: 100%;
    height: 4px;
    border-radius: 2px;
    background: var(--gray-light);
    outline: none;
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--accent-copper);
    cursor: pointer;
    border: 3px solid #fff;
    box-shadow: 0 2px 8px rgba(184,115,51,0.4);
  }

  /* ---------- Small-screen typography tweaks (keeps your design, just prevents overflow) ---------- */
  @media (max-width: 520px) {
    .hero-sub { padding: 0 8px; }
  }

  /* MOBILE ONLY: stop Safari zoom when keyboard opens */
  @media (max-width: 640px) {
    input, select, textarea {
      font-size: 16px !important;
    }
  }
`;

function Icon({ name, fill = false, size = "", style = {}, className = "" }) {
  const sz = size === "sm" ? " sm" : size === "xs" ? " xs" : size === "lg" ? " lg" : "";
  return (
    <span className={`mat-icon${fill ? " fill" : ""}${sz}${className ? " " + className : ""}`} style={style}>
      {name}
    </span>
  );
}

// ✅ REPLACED: Header (your provided fixed header exactly)
function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const current = location.pathname;

  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const navItems = [
    { label: "PRICING", path: "/pricing" },
    { label: "RESOURCES", path: "/blogs" },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-[#D4D4D4] bg-white">
        <div className="hdrWrap max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-2 sm:gap-4 flex-nowrap">

          {/* Logo */}
          <div
            className="hdrLogo flex items-center cursor-pointer shrink-0 whitespace-nowrap"
            onClick={() => {
              trackEvent("nav_click", { item: "logo" });
              navigate("/");
            }}
          >
            <h1 className="text-xl sm:text-2xl font-black tracking-tighter uppercase whitespace-nowrap">
              <span style={{ color: "#B87333" }}>ACQ</span>
              <span style={{ color: "#111111" }}>AR</span>
            </h1>
          </div>

          {/* ── MOBILE: Pricing + Resources + Signal ── */}
          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={() => {
                trackEvent("nav_click", { item: "pricing" });
                navigate("/pricing");
              }}
              className={`text-[9px] font-black uppercase tracking-[0.15em] px-2 py-1.5 rounded-full whitespace-nowrap ${
                current === "/pricing"
                  ? "text-[#B87333] underline underline-offset-4"
                  : "text-[#2B2B2B]/70"
              }`}
            >
              PRICING
            </button>


<a
              href="http://www.acqar.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] font-black uppercase tracking-[0.15em] px-2 py-1.5 rounded-full whitespace-nowrap text-[#2B2B2B]/70"
              style={{ textDecoration: 'none' }}
            >
              SIGNAL™
            </a>
            <button
              onClick={() => {
                trackEvent("nav_click", { item: "resources" });
                navigate("/blogs");
              }}
              className={`text-[9px] font-black uppercase tracking-[0.15em] px-2 py-1.5 rounded-full whitespace-nowrap ${
                current === "/blogs"
                  ? "text-[#B87333] underline underline-offset-4"
                  : "text-[#2B2B2B]/70"
              }`}
            >
              RESOURCES
            </button>

            {/* Mobile Signal */}
            {/* <a
              href="http://www.acqar.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] font-black uppercase tracking-[0.15em] px-2 py-1.5 rounded-full whitespace-nowrap text-[#2B2B2B]/70"
              style={{ textDecoration: 'none' }}
            >
              SIGNAL™
            </a> */}
          </div>

          {/* ── DESKTOP nav ── */}
          <nav className="hidden md:flex items-center gap-10">
            

            {/* Desktop Signal */}
            <a
              href="http://www.acqar.com/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("Nav", "Click", "Signal")}
              className="text-sm font-semibold tracking-wide transition-colors hover:text-[#B87333] whitespace-nowrap text-[#2B2B2B]"
              style={{ textDecoration: 'none' }}
            >
            SIGNAL™
            </a>

            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  trackEvent("Nav", "Click", item.label);
                  navigate(item.path);
                }}
                className={`text-sm font-semibold tracking-wide transition-colors hover:text-[#B87333] whitespace-nowrap ${
                  current === item.path ? "text-[#B87333]" : "text-[#2B2B2B]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* ── Right buttons ── */}
          <div className="hdrRight flex items-center gap-2 sm:gap-4 shrink-0 flex-nowrap">
            {user ? (
              <button
                onClick={() => navigate("/dashboard")}
                className="bg-[#B87333] text-white px-4 sm:px-6 py-2.5 rounded-md text-[11px] sm:text-sm font-bold tracking-wide hover:bg-[#a6682e] hover:shadow-lg active:scale-95 whitespace-nowrap"
              >
                Dashboard
              </button>
            ) : (
              <button
                onClick={() => {
                  trackEvent("nav_click", { item: "login" });
                  navigate("/login");
                }}
                className="bg-[#B87333] text-white px-4 sm:px-6 py-2.5 rounded-md text-[11px] sm:text-sm font-bold tracking-wide hover:bg-[#a6682e] hover:shadow-lg active:scale-95 whitespace-nowrap"
              >
                Sign In
              </button>
            )}

            {/* Desktop only: Get Started */}
            {/* <button
              onClick={() => {
                trackEvent("valuation_start", { location: "header" });
                navigate("/valuation");
              }}
              className="hidden md:inline-flex hdrCta bg-[#B87333] text-white px-4 sm:px-6 py-2.5 rounded-md text-[11px] sm:text-sm font-bold tracking-wide hover:bg-[#a6682e] hover:shadow-lg active:scale-95 whitespace-nowrap"
            >
              Get Started
            </button> */}
          </div>

        </div>

        <style>{`
          @media (max-width: 420px) {
            .hdrWrap {
              padding-left: 10px !important;
              padding-right: 10px !important;
              gap: 4px !important;
            }
            .hdrLogo h1 {
              font-size: 17px !important;
              letter-spacing: -0.02em !important;
            }
            .hdrCta {
              padding: 9px 12px !important;
              font-size: 10px !important;
            }
          }

          @media (max-width: 360px) {
            .hdrWrap { gap: 3px !important; }
            .hdrCta {
              padding: 8px 10px !important;
              font-size: 10px !important;
            }
          }
        `}</style>
      </header>

      <div className="h-20" />
    </>
  );
}


// ✅ REPLACED: Footer (your provided footer exactly)
function Footer() {
  const navigate = useNavigate();

  return (
    <>
      <style>{`
        .acq-footer-new {
          position: relative;
          background: #F5F5F4;
          border-top: 1px solid rgba(10,10,10,0.06);
          font-family: 'Inter', sans-serif;
        }
        .acq-footer-new .copper-line {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, #B87333 35%, #B87333 65%, transparent 100%);
        }
        .acq-footer-new .inner {
          max-width: 100%;
          margin: 0 auto;
          padding: 48px 80px 32px;
        }
        .acq-footer-new .main-grid {
          display: grid;
          grid-template-columns: 1.8fr 1fr 1fr 1fr 1fr;
          gap: 32px;
          margin-bottom: 48px;
        }
        .acq-footer-new .col-heading {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 24px;
        }
        .acq-footer-new .col-heading-dot {
          width: 4px; height: 4px;
          border-radius: 50%;
          background: #B87333;
          opacity: 0.7;
        }
        .acq-footer-new .col-heading h6 {
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.28em;
          color: #0A0A0A;
          margin: 0;
        }
        .acq-footer-new ul {
          list-style: none;
          padding: 0; margin: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .acq-footer-new ul li {
          font-size: 11.5px;
          font-weight: 600;
          color: rgba(10,10,10,0.55);
          cursor: pointer;
          transition: color 0.2s;
        }
        .acq-footer-new ul li:hover { color: #B87333; }
        .acq-footer-new ul li.muted {
          color: rgba(10,10,10,0.55);
          cursor: default;
        }
        .acq-footer-new ul li a {
          color: inherit;
          text-decoration: none;
          transition: color 0.2s;
        }
        .acq-footer-new ul li a:hover { color: #B87333; }
        .acq-footer-new .soon-badge {
          padding: 1px 6px;
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
          background: rgba(184,115,51,0.1);
          color: #B87333;
          border: 1px solid rgba(184,115,51,0.2);
          border-radius: 4px;
          margin-left: 6px;
        }
        .acq-footer-new .rics-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: white;
          border: 1px solid rgba(184,115,51,0.2);
          border-radius: 999px;
          margin-bottom: 32px;
        }
        .acq-footer-new .rics-badge span {
          font-size: 9px;
          font-weight: 900;
          color: rgba(10,10,10,0.7);
          text-transform: uppercase;
          letter-spacing: 0.2em;
        }
        .acq-footer-new .social-row { display: flex; gap: 12px; }
        .acq-footer-new .social-btn {
          width: 36px; height: 36px;
          border-radius: 50%;
          border: 1px solid rgba(10,10,10,0.09);
          background: rgba(255,255,255,0.6);
          display: flex; align-items: center; justify-content: center;
          color: rgba(10,10,10,0.35);
          text-decoration: none;
          transition: all 0.2s;
        }
        .acq-footer-new .social-btn:hover {
          color: #B87333;
          border-color: rgba(184,115,51,0.4);
        }
        .acq-footer-new .bottom-bar {
          border-top: 1px solid rgba(10,10,10,0.06);
          padding-top: 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          width: 100%;
        }
        .acq-footer-new .bottom-bar p {
          font-weight: 700;
          color: rgba(10,10,10,0.3);
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.2em;
          margin: 0;
        }
        .acq-footer-new .bottom-bar .not-advice {
          font-weight: 500;
          color: rgba(10,10,10,0.25);
          font-size: 10px;
          margin: 0;
        }
        .acq-footer-new .bottom-location {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .acq-footer-new .bottom-location .logo {
          font-weight: 900;
          font-size: 10px;
          letter-spacing: 0.05em;
        }
        .acq-footer-new .bottom-location .divider {
          width: 1px; height: 12px;
          background: rgba(10,10,10,0.15);
        }
        .acq-footer-new .bottom-location .city {
          font-weight: 600;
          color: rgba(10,10,10,0.35);
          font-size: 10px;
          letter-spacing: 0.05em;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .acq-footer-new .inner { padding: 48px 32px 32px; }
          .acq-footer-new .main-grid { grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
        }
        @media (max-width: 768px) {
          .acq-footer-new .inner { padding: 40px 24px 24px; }
          .acq-footer-new .main-grid { grid-template-columns: 1fr 1fr; gap: 32px 16px; }
          .acq-footer-new .bottom-bar { flex-direction: column; text-align: center; justify-content: center; }
          .acq-footer-new .bottom-location { justify-content: center; }
          .acq-footer-new .not-advice { display: none; }
        }
        @media (max-width: 480px) {
          .acq-footer-new .inner { padding: 40px 16px 20px; }
          .acq-footer-new .main-grid { grid-template-columns: 1fr; gap: 28px; }
        }
      `}</style>

      <footer className="acq-footer-new">
        <div className="copper-line"></div>
        <div className="inner">

          {/* Main grid */}
          <div className="main-grid">

            {/* Brand column */}
            <div>
              <div style={{ marginBottom: 24, lineHeight: 1 }}>
                <span style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.5px' }}>
                  <span style={{ color: '#B87333' }}>ACQ</span>
                  <span style={{ color: '#111111' }}>AR</span>
                </span>
              </div>
              <p style={{ fontSize: 12, lineHeight: 1.75, color: 'rgba(10,10,10,0.5)', fontWeight: 500, marginBottom: 28, maxWidth: 280 }}>
                An AI-powered property intelligence platform built exclusively for Dubai real estate. Independent, institutional-quality, and always on.
              </p>
              {/* <div className="rics-badge"> */}
                {/* <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.5C16.5 22.15 20 17.25 20 12V6L12 2z" stroke="#B87333" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 12l2 2 4-4" stroke="#B87333" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                </svg> */}
                {/* <span>RICS-Aligned Intelligence</span> */}
              {/* </div> */}
              <div className="social-row">
                {[
                  { href: 'https://www.linkedin.com/company/acqar', label: 'LinkedIn', icon: <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg> },
                  { href: 'https://www.instagram.com/acqar.dxb/', label: 'Instagram', icon: <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> },
                ].map(({ href, label, icon }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                    aria-label={label} className="social-btn"
                  >{icon}</a>
                ))}
              </div>
            </div>

            {/* Product */}
            <div>
              <div className="col-heading">
                <span className="col-heading-dot"></span>
                <h6>Product</h6>
              </div>
              <ul>
                <li>
                  <a href="https://www.acqar.com/truvalu" target="_blank" rel="noopener noreferrer">
                    ACQAR TRUVALU™
                  </a>
                </li>
                <li>
                  <a href="http://www.acqar.com/" target="_blank" rel="noopener noreferrer">
                    ACQAR SIGNAL™
                  </a>
                </li>
                <li className="muted">ACQAR PASSPORT™</li>
                <li onClick={() => navigate('/pricing')}>PRICING</li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <div className="col-heading">
                <span className="col-heading-dot"></span>
                <h6>Company</h6>
              </div>
              <ul>
                {/* {['About ACQAR', 'How It Works', 'Pricing', 'Contact Us', 'Partners'].map(l => ( */}
                  {['About ACQAR', 'Contact Us'].map(l => (
  <li key={l}>{l}</li>
))}
<li><a href="/broker" style={{ color: 'inherit', textDecoration: 'none' }}>Brokers</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <div className="col-heading">
                <span className="col-heading-dot"></span>
                <h6>Legal & Info</h6>
              </div>
              <ul>
                <li onClick={() => window.open('https://www.acqar.com/blogs', '_blank')}>Intelligence Blog</li>
                <li onClick={() => navigate('/terms')}>Terms of Use</li>
                <li onClick={() => navigate('/terms')}>Privacy Policy</li>
              </ul>
            </div>

            {/* Comparisons */}
            <div>
              <div className="col-heading">
                <span className="col-heading-dot"></span>
                <h6>Comparisons</h6>
              </div>
              <ul>
                {['vs Bayut TruEstimate', 'vs Property Finder', 'vs Traditional Valuers', 'Why ACQAR?'].map(l => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>

          </div>

          {/* Bottom bar */}
          <div className="bottom-bar">
            <div className="bottom-location">
              <span className="logo">
                <span style={{ color: '#B87333' }}>ACQ</span>
                <span style={{ color: '#0A0A0A' }}>AR</span>
              </span>
              <span className="divider"></span>
              <span className="city">Dubai, United Arab Emirates</span>
            </div>
            <p>© 2026 ACQARLABS L.L.C-FZ. All rights reserved.</p>
            <p className="not-advice">Not financial advice.</p>
          </div>

        </div>
      </footer>
    </>
  );
}
// ---------- Helpers ----------
function toSqm(areaVal, unit) {
  const v = Number(areaVal || 0);
  if (!v) return 0;
  if (unit === "sq.ft") return v * 0.092903;
  return v;
}
function useDebounced(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
function escapeForILike(s) {
  return (s || "").replace(/[%_\\]/g, (m) => `\\${m}`);
}

// ---------- NEW: DB helper utils (ADDED ONLY) ----------
function norm(s) {
  return (s || "").trim().replace(/\s+/g, " ");
}
function genDistrictCode() {
  const a = Date.now().toString(36);
  const b = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `D-${a}-${b}`;
}

// Ensure district row exists in `districts` table.
async function ensureDistrictExists({ district_name, district_code }) {
  const dn = norm(district_name);
  if (!dn) return { district_code: "", district_name: "" };

  const { data: found, error: findErr } = await supabase
    .from("districts")
    .select("id, district_code, district_name")
    .ilike("district_name", dn)
    .limit(1);

  if (findErr) throw findErr;

  if (found && found.length > 0) {
    const row = found[0];
    return {
      district_code: norm(row.district_code),
      district_name: norm(row.district_name) || dn,
    };
  }

  const newCode = norm(district_code) || genDistrictCode();

  const { data: inserted, error: insErr } = await supabase
    .from("districts")
    .insert([{ district_code: newCode, district_name: dn }])
    .select("district_code, district_name")
    .single();

  if (insErr) throw insErr;

  return {
    district_code: norm(inserted?.district_code) || newCode,
    district_name: norm(inserted?.district_name) || dn,
  };
}

// Ensure mapping exists in `district_properties` table.
async function ensureDistrictPropertyExists({ district_code, district_name, property_name }) {
  const dc = norm(district_code);
  const dn = norm(district_name);
  const pn = norm(property_name);
  if (!dc || !dn || !pn) return;

  const { data: found, error: findErr } = await supabase
    .from("district_properties")
    .select("id")
    .eq("district_code", dc)
    .ilike("property_name", pn)
    .limit(1);

  if (findErr) throw findErr;
  if (found && found.length > 0) return;

  const { error: insErr } = await supabase
    .from("district_properties")
    .insert([{ district_code: dc, district_name: dn, property_name: pn }]);

  if (insErr) throw insErr;
}

// ✅ insert valuation snapshot (store ID for Report update)
async function insertValuationRow(row) {
  const { data, error } = await supabase
    .from("valuations")
    .insert([row])
    .select("id"); // <-- don't .single()

  if (error) throw error;

  // data may be [] if RLS blocks returning/select
  const id = Array.isArray(data) && data.length > 0 ? data[0].id : null;
  return id;
}

// ✅ safe JSON parse (kept)
function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ✅ create small deterministic signature for report cache
function stableStringify(obj) {
  const seen = new WeakSet();
  return JSON.stringify(obj, function (k, v) {
    if (v && typeof v === "object") {
      if (seen.has(v)) return;
      seen.add(v);
      if (Array.isArray(v)) return v;
      return Object.keys(v)
        .sort()
        .reduce((acc, key) => {
          acc[key] = v[key];
          return acc;
        }, {});
    }
    return v;
  });
}
function hashLike(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return String(h);
}

// ---------- Constants ----------
const COUNTRIES = ["United Arab Emirates", "Kingdom of Saudi Arabia", "Kingdom of Bahrain", "Qatar", "Oman", "Kuwait"];

const UAE_CITIES = [
  "Dubai",
  "Abu Dhabi",
  "Sharjah",
  "Umm Al Quwain",
  "Fujairah",
  "Ajman",
  "Ras Al Khaimah",
  "Kalba",
  "Khor Fakkan",
  "Al Ain",
];

const PROPERTY_CATEGORIES = ["Residential"];
const PROPERTY_TYPES = ["Apartment", "Villa", "Townhouse", "Penthouse", "Office", "Retail"];

const AMENITY_OPTIONS = [
  "24 Hour Security",
  "24 Hours Concierge",
  "ATM Facility",
  "Balcony or Terrace",
  "Barbeque Area",
  "Basketball Court",
  "Beach Access",
  "Beach View",
  "Broadband Internet",
  "Built-in Closet",
  "Built-in Kitchen Appliances",
  "Built-in Wardrobes",
  "Business Centre",
  "Canal View",
  "CCTV Security",
  "Central Heating",
  "Centrally Air-Conditioned",
  "Children's Pool",
  "City View",
  "Cleaning Services",
  "Clinic",
  "Community pool",
  "Community View",
  "Conference Room",
  "Courtyard view",
  "Covered Parking",
  "Cycling Tracks",
  "Day Care Center",
  "Double Glazed Windows",
  "Easy Access to Parking",
  "Electricity Backup",
  "Elevator",
  "Exclusive beach access",
  "Facilities for Disabled",
  "First Aid Medical Center",
  "Fitness center",
  "Football Pitches",
  "Games Room",
  "Golf",
  "Golf Course View",
  "Gym or Health Club",
  "Gymnasium",
  "Health & Beauty Salon",
  "Health Centre",
  "High-Rise views",
  "High-speed elevator",
  "Housekeeping",
  "Indoor Gardens",
  "Indoor Pool",
  "Intercom",
  "Jacuzzi",
  "Jogging Track",
  "Kid's Play Area",
  "Kitchen Appliances",
  "Lake View",
  "Landmark view",
  "Landscaping",
  "Laundry Facility",
  "Laundry Room",
  "Lawn or Garden",
  "Lobby",
  "Lounge Area",
  "Maid Service",
  "Maids Room",
  "Maintenance Staff",
  "Mall",
  "Mini-Market",
  "Nursery",
  "Outdoor Pool",
  "Pantry",
  "Park",
  "Park Views",
  "Parking",
  "Pets Allowed",
  "Pool View",
  "Prayer Room",
  "Private Garden",
  "Private Jacuzzi",
  "Private Parking",
  "Private Pool",
  "Public Pool",
  "Reception/Waiting Room",
  "Recording studio",
  "Restaurants",
  "Retail",
  "Road View",
  "Satellite/Cable TV",
  "Sauna",
  "Sea Views",
  "Security",
  "Shaded Garage",
  "Shared Gym",
  "Shared Jacuzzi",
  "Shared Pool",
  "Skating Park",
  "Social Club",
  "Solar Heating or Electrical",
  "Spa",
  "Sports Facilities",
  "Steam Room",
  "Storage Areas",
  "Study Room",
  "Supermarket",
  "Swimming Pool",
  "Tennis Court",
  "Theater",
  "Underground Parking",
  "Vastu-compliant",
  "Walk-in Closet",
  "Waste Disposal",
  "Water View",
  "Wellness club",
  "Yoga Studio",
];

const TITLE_DEED_TYPES = ["Leasehold", "Freehold", "Musataha"];
const VALUATION_TYPES = ["Current Market Value", "Historical Property Value", "Verify Previous Valuation"];
const PURPOSE_OF_VALUATION = ["Buy & Sell", "Mortgage", "Investment", "Tax", "Legal", "Other"];
const PROPERTY_STATUS = ["Owner Occupied", "Leased", "Vacant", "Under Construction"];
const FURNISHING_TYPES = ["Furnished", "Unfurnished", "SemiFurnished"];
const BEDROOMS = ["0", "1", "2", "3", "4", "5", "6", "7+"];
const BATHROOMS = ["1", "2", "3", "4", "5", "6+"];
const FLOOR_LEVELS = ["Basement", "Ground", "Mezzanine", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10+"];

// ✅ localStorage keys
const LS_FORM_KEY = "truvalu_formData_v1";
const LS_VAL_ROW_ID = "truvalu_valuation_row_id";
const LS_REPORT_KEY = "truvalu_reportData_v1";
const LS_REPORT_META = "truvalu_report_meta_v1"; // { formHash }
const LS_PENDING_INSERT = "truvalu_pending_valuation_insert_v1"; // optional fallback

const HIDE_MAP_UI = true; // set false if you want it back

// ✅ NEW: default form (used to clear UI after success)
const DEFAULT_FORM = {
  country: "United Arab Emirates",
  city: "Dubai",
  district_code: "",
  district_name: "",
  property_name: "",
  // legacy keys (keep)
  area_name_en: "",
  area_name_ar: "",
  district_key: "",
  building_name_en: "",
  building_key: "",
  project_name_en: "",
  project_name_ar: "",
  land_type_en: "",
  land_type_ar: "",
  project_reference: "",
  building_name: "",
  title_deed_no: "",
  title_deed_type: "Freehold",
  plot_no: "1001",
  is_project_valuation: false,
  valuation_type: "Current Market Value",
  property_category: "Residential",
  purpose_of_valuation: "Buy & Sell",
  property_status: "Leased",
  unit_no: "",
  // apartment_no: "",
  area_value: "",
  area_unit: "sq.ft",
  last_renovated_on: "",
  floor_level: "",
  furnishing: "Unfurnished",
  bedrooms: "",
  bathrooms: "",
  property_type_en: "Apartment",
  property_name_unit: "",
  amenities: [],
  is_renovated: false,
  renovation_amount: "",
};


// ✅ requirement #1: graph hidden (code present, UI hidden)
const HIDE_GRAPHS_BUT_KEEP_CODE = true;

// ---------- Component ----------
export default function ValuationForm({ formData, setFormData }) {
  const navigate = useNavigate();
  const [error, setError] = useState("");

//   const [showPaywall, setShowPaywall] = useState(false);
// const [paywallValuationId, setPaywallValuationId] = useState(null);
// const [pendingNavigation, setPendingNavigation] = useState(false);

  // ✅ auth state to drive routing + hide header
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      const { data } = await supabase.auth.getSession();
      const sess = data?.session || null;
      if (!mounted) return;
      setIsLoggedIn(!!sess);
      setSessionUser(sess?.user || null);
    }

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setIsLoggedIn(!!sess);
      setSessionUser(sess?.user || null);
    });

   return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  // 1. Page view
  useEffect(() => {
    trackEvent("page_viewed", { page: "valuation_form" });
  }, []);

  // 2. Scroll depth
  useEffect(() => {
    const scrolled = { 25: false, 50: false, 75: false, 100: false };
    const handleScroll = () => {
      const pct = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      if (pct >= 25 && !scrolled[25]) { scrolled[25] = true; trackEvent("scroll_depth", { page: "valuation_form", depth: "25%" }); }
      if (pct >= 50 && !scrolled[50]) { scrolled[50] = true; trackEvent("scroll_depth", { page: "valuation_form", depth: "50%" }); }
      if (pct >= 75 && !scrolled[75]) { scrolled[75] = true; trackEvent("scroll_depth", { page: "valuation_form", depth: "75%" }); }
      if (pct >= 100 && !scrolled[100]) { scrolled[100] = true; trackEvent("scroll_depth", { page: "valuation_form", depth: "100%" }); }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 3. Time spent
  useEffect(() => {
    const startTime = Date.now();
    return () => {
      trackEvent("time_spent", { page: "valuation_form", seconds: Math.round((Date.now() - startTime) / 1000) });
    };
  }, []);

  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  // ✅ CHANGED: use DEFAULT_FORM so we can clear UI after success
  const [form, setForm] = useState(formData || DEFAULT_FORM);

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const isDubaiFlow = form.country === "United Arab Emirates" && form.city === "Dubai";

  // -------- Districts --------
  const [districtOpen, setDistrictOpen] = useState(false);
  const districtBoxRef = useRef(null);
  const [districtQuery, setDistrictQuery] = useState("");
  const dQ = useDebounced(districtQuery, 250);
  const [districtLoading, setDistrictLoading] = useState(false);
  const [districtResults, setDistrictResults] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState(null);

  // -------- Properties --------
  const [propertyOpen, setPropertyOpen] = useState(false);
  const propertyBoxRef = useRef(null);
  const [propertyQuery, setPropertyQuery] = useState("");
  const pQ = useDebounced(propertyQuery, 150);
  const [propertyLoading, setPropertyLoading] = useState(false);
  const [propertyResults, setPropertyResults] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);

  // -------- Amenities --------
  const [featuresOpen, setFeaturesOpen] = useState(true);
  const [featureSearch, setFeatureSearch] = useState("");
  const fQ = useDebounced(featureSearch, 200);

  const computedSqm = useMemo(() => toSqm(form.area_value, form.area_unit), [form.area_value, form.area_unit]);

  const typedDistrictName = norm(selectedDistrict?.district_name || districtQuery || form.district_name);

  // ============================
  // ✅ SIZE RANGE DROPDOWN (NO CONVERSION)  ✅✅ (UPDATED)
  // ============================
  const SIZE_STEP_SQFT = 100;
  const SIZE_MAX_SQFT = 25000;

  const SIZE_STEP_SQM = 10;
  const SIZE_MAX_SQM = 2500;

  // function midpoint(a, b) {
  //   const x = (Number(a) + Number(b)) / 2;
  //   return Math.round(x);
  // }

  function pickAnyInRangeInclusive(a, b) {
  const start = Math.round(Number(a));
  const end = Math.round(Number(b));
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;

  const lo = Math.min(start, end);
  const hi = Math.max(start, end);

  // Prefer cryptographically-strong randomness if available
  const n = hi - lo + 1;
  if (n <= 1) return lo;

  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    // uniform int in [0, n)
    const u32 = new Uint32Array(1);
    const max = 0xffffffff;
    const limit = max - (max % n); // remove modulo bias
    let x;
    do {
      window.crypto.getRandomValues(u32);
      x = u32[0];
    } while (x >= limit);
    return lo + (x % n);
  }

  // fallback
  return lo + Math.floor(Math.random() * n);
}

  function buildRanges(unit) {
    const step = unit === "sq.m" ? SIZE_STEP_SQM : SIZE_STEP_SQFT;
    const max = unit === "sq.m" ? SIZE_MAX_SQM : SIZE_MAX_SQFT;

    const out = [];
    let start = 0;
    let end = step;

    while (end <= max) {
      out.push({ start, end, label: `${start}-${end}` });
      start = end + 1;
      end = start + (step - 1);
    }
    return out;
  }

  const SIZE_RANGES = useMemo(() => buildRanges(form.area_unit), [form.area_unit]);

const [sizeOpen, setSizeOpen] = useState(false);
  const sizeBoxRef = useRef(null);
  const [sizeSearch, setSizeSearch] = useState("");
  const [sizeSelectedLabel, setSizeSelectedLabel] = useState("");

  // ✅ Renovation amount range picker
  const [renovationOpen, setRenovationOpen] = useState(false);
  const renovationBoxRef = useRef(null);
  const [renovationSearch, setRenovationSearch] = useState("");
  const [renovationSelectedLabel, setRenovationSelectedLabel] = useState("");

  function buildRenovationRanges() {
    const MIN = 100;
    const MAX = 50000;
    const STEP = 1000;
    const out = [];
    let start = MIN;
    while (start < MAX) {
      const end = Math.min(start + STEP - 1, MAX);
      out.push({ start, end, label: `AED ${start.toLocaleString()} - ${end.toLocaleString()}` });
      start = end + 1;
    }
    return out;
  }
  const RENOVATION_RANGES = useMemo(() => buildRenovationRanges(), []);


  function getSelectedRangeLabel() {
    const val = Number(form.area_value || 0);
    if (!val) return "";
    const r = SIZE_RANGES.find((x) => val >= x.start && val <= x.end);
    return r ? r.label : "";
  }

  // ✅ focus refs (ADDED ONLY)
  const countryRef = useRef(null);
  const cityRef = useRef(null);
  const districtInputRef = useRef(null);
  const propertyInputRef = useRef(null);
  const aptRef = useRef(null);
  const sizeRef = useRef(null);

  function focusField(ref) {
    const el = ref?.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      try {
        el.focus?.();
        if (el.tagName === "BUTTON") el.click?.();
      } catch {}
    }, 250);
  }

  const resetDistrictAndProperty = () => {
    setSelectedDistrict(null);
    setDistrictQuery("");
    setDistrictResults([]);
    setDistrictOpen(false);

    setSelectedProperty(null);
    setPropertyQuery("");
    setPropertyResults([]);
    setPropertyOpen(false);

    update("district_code", "");
    update("district_name", "");
    update("property_name", "");

    update("area_name_en", "");
    update("project_name_en", "");
    update("project_reference", "");
  };

  // ✅ NEW: clear UI after successful valuation (does NOT delete localStorage / report)
  function clearUiAfterSuccessfulValuation() {
    setSelectedDistrict(null);
    setDistrictQuery("");
    setDistrictResults([]);
    setDistrictOpen(false);

    setSelectedProperty(null);
    setPropertyQuery("");
    setPropertyResults([]);
    setPropertyOpen(false);

    setFeaturesOpen(true);
    setFeatureSearch("");

    // keep size dropdown clean
    setSizeOpen(false);
    setSizeSearch("");

    // keep renovation dropdown clean
    setRenovationOpen(false);
    setRenovationSearch("");
    setRenovationSelectedLabel("");

    setForm(DEFAULT_FORM);
    setFormData?.(null);
  }
 useEffect(() => {
    function onDown(e) {
      if (districtBoxRef.current && !districtBoxRef.current.contains(e.target)) setDistrictOpen(false);
      if (propertyBoxRef.current && !propertyBoxRef.current.contains(e.target)) setPropertyOpen(false);

      // ✅ close size dropdown
      if (sizeBoxRef.current && !sizeBoxRef.current.contains(e.target)) setSizeOpen(false);

      // ✅ close renovation dropdown
      if (renovationBoxRef.current && !renovationBoxRef.current.contains(e.target)) setRenovationOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    let alive = true;
    async function run() {
      if (!districtOpen) return;
      if (!isDubaiFlow) return;

      setDistrictLoading(true);
      setError("");

      const q = (dQ || "").trim();
      let query = supabase
        .from("districts")
        .select("district_code, district_name")
        .order("district_name", { ascending: true })
        .range(0, 9999);

      if (q.length >= 2) {
        const safe = escapeForILike(q);
        query = query.ilike("district_name", `%${safe}%`);
      }

      const { data, error: e } = await query;
      if (!alive) return;

      setDistrictLoading(false);

      if (e) {
        console.error(e);
        setDistrictResults([]);
        setError(e.message);
        return;
      }

      const map = new Map();
      (data || []).forEach((r) => {
        const code = (r.district_code || "").trim();
        const name = (r.district_name || "").trim();
        if (!name) return;
        const key = `${code}__${name}`;
        if (!map.has(key)) map.set(key, { district_code: code, district_name: name });
      });

      setDistrictResults(Array.from(map.values()));
    }

    run();
    return () => {
      alive = false;
    };
  }, [districtOpen, isDubaiFlow, dQ]);

  const filteredDistricts = useMemo(() => {
    const q = (districtQuery || "").trim().toLowerCase();
    if (!q) return districtResults;
    return districtResults.filter((d) => (d.district_name || "").toLowerCase().includes(q));
  }, [districtQuery, districtResults]);

  const canAddTypedDistrict = useMemo(() => {
    const dn = norm(districtQuery);
    if (!dn) return false;
    const exists = (districtResults || []).some((d) => norm(d.district_name).toLowerCase() === dn.toLowerCase());
    return !exists;
  }, [districtQuery, districtResults]);

  useEffect(() => {
    let alive = true;
    async function run() {
      if (!propertyOpen) return;

      const districtForLookup = selectedDistrict?.district_name
        ? selectedDistrict
        : typedDistrictName
        ? { district_code: "", district_name: typedDistrictName }
        : null;

      if (!districtForLookup) return;

      setPropertyLoading(true);
      setError("");

      let query = supabase
        .from("district_properties")
        .select("property_name")
        .order("property_name", { ascending: true })
        .range(0, 9999)
        .not("property_name", "is", null)
        .neq("property_name", "");

      if (districtForLookup.district_code) query = query.eq("district_code", districtForLookup.district_code);
      else query = query.eq("district_name", districtForLookup.district_name);

      const { data, error: e } = await query;
      if (!alive) return;

      setPropertyLoading(false);

      if (e) {
        console.error(e);
        setPropertyResults([]);
        setError(e.message);
        return;
      }

      const seen = new Set();
      const rows = [];
      (data || []).forEach((r) => {
        const name = (r.property_name || "").trim();
        if (!name) return;
        if (seen.has(name)) return;
        seen.add(name);
        rows.push({ property_name: name });
      });

      setPropertyResults(rows);
    }

    run();
    return () => {
      alive = false;
    };
  }, [propertyOpen, selectedDistrict, typedDistrictName]);

  const filteredProperties = useMemo(() => {
    const q = (pQ || "").trim().toLowerCase();
    if (!q) return propertyResults;
    return propertyResults.filter((x) => (x.property_name || "").toLowerCase().includes(q));
  }, [pQ, propertyResults]);

  const canAddTypedProperty = useMemo(() => {
    const pn = norm(propertyQuery);
    if (!pn) return false;
    const exists = (propertyResults || []).some((p) => norm(p.property_name).toLowerCase() === pn.toLowerCase());
    return !exists;
  }, [propertyQuery, propertyResults]);

  const toggleAmenity = (a) => {
    const cur = Array.isArray(form.amenities) ? form.amenities : [];
    if (cur.includes(a)) update("amenities", cur.filter((x) => x !== a));
    else update("amenities", [...cur, a]);
  };

  const filteredAmenities = useMemo(() => {
    const q = (fQ || "").trim().toLowerCase();
    if (!q) return AMENITY_OPTIONS;
    return AMENITY_OPTIONS.filter((x) => x.toLowerCase().includes(q));
  }, [fQ]);

  // ---------- Submit ----------
  const onNext = async () => {
    setError("");
    trackEvent("valuation_submit", { page: "valuation_form" });

    const { data: sessData } = await supabase.auth.getSession();
    const sessNow = sessData?.session || null;
    const loggedInNow = !!sessNow;
    const userNow = sessNow?.user || null;

    setIsLoggedIn(loggedInNow);
    setSessionUser(userNow);

    // ✅ UPDATED: focus missing field (ADDED ONLY)
    if (!isDubaiFlow) {
      setError("Please select Country: United Arab Emirates and City: Dubai.");
      focusField(countryRef);
      return;
    }

    const finalDistrictName = norm(selectedDistrict?.district_name || districtQuery || form.district_name);
    if (!finalDistrictName) {
      setError("Please select a District.");
      setDistrictOpen(true);
      focusField(districtInputRef);
      return;
    }

    const chosenProperty = norm(selectedProperty?.property_name || propertyQuery || form.property_name);
    if (!chosenProperty) {
      setError("Please select a Project / Property Reference (property).");
      setPropertyOpen(true);
      focusField(propertyInputRef);
      return;
    }

    

    if (!computedSqm || computedSqm <= 0) {
      setError("Please enter Apartment Size (greater than 0).");
      setSizeOpen(true);
      focusField(sizeRef);
      return;
    }

    try {
      const ensuredDistrict = await ensureDistrictExists({
        district_name: finalDistrictName,
        district_code: selectedDistrict?.district_code || form.district_code || "",
      });

      await ensureDistrictPropertyExists({
        district_code: ensuredDistrict.district_code,
        district_name: ensuredDistrict.district_name,
        property_name: chosenProperty,
      });

      const payload = {
        ...form,
        procedure_area: Number(computedSqm),
        rooms_en:
  form.bedrooms === "studio"
    ? 0
    : Number(form.bedrooms || 0),

        district_code: ensuredDistrict?.district_code || "",
        district_name: ensuredDistrict?.district_name || "",
        property_name: chosenProperty,
        area_name_en: ensuredDistrict?.district_name || "",
        project_name_en: chosenProperty,
        project_reference: chosenProperty,
        building_name_en: form.building_name || "",
        is_renovated: !!form.is_renovated,
        renovation_amount: form.is_renovated ? Number(form.renovation_amount || 0) : 0,
      };

      localStorage.setItem(LS_FORM_KEY, JSON.stringify(payload));
      setFormData(payload);

      const formHash = hashLike(stableStringify(payload));
      localStorage.setItem(LS_REPORT_META, JSON.stringify({ formHash }));

      const userId = userNow?.id || null;
      const nameGuess =
        (userNow?.user_metadata?.name ||
          userNow?.user_metadata?.full_name ||
          userNow?.email?.split("@")?.[0] ||
          "") || null;

      const row = {
        user_id: userId,
        name: nameGuess,
        district: payload.district_name || "",
        property_name: payload.property_name || "",
        building_name: payload.building_name || "",
        title_deed_no: payload.title_deed_no || "",
        title_deed_type: payload.title_deed_type || "",
        plot_no: payload.plot_no || "",

        valuation_type: payload.valuation_type || "",
        valuation_type_selection: payload.valuation_type || "",
        property_category: payload.property_category || "",
        purpose_of_valuation: payload.purpose_of_valuation || "",
        property_current_status: payload.property_status || "",

        unit_no: payload.unit_no || "",

        // apartment_no: payload.apartment_no || "",
        apartment_size: payload.area_value || "",
        apartment_size_unit: payload.area_unit || "",
        last_renovated_on: payload.last_renovated_on || null,
        floor_level: payload.floor_level || "",

        furnishing_type: payload.furnishing || "",
        bedroom: payload.bedrooms || "",
        bathroom: payload.bathrooms || "",
        property_type: payload.property_type_en || "",
        unit: payload.property_name_unit || "",

        is_renovated: !!payload.is_renovated,
        renovation_amount: Number(payload.renovation_amount || 0),

        features: Array.isArray(payload.amenities) ? payload.amenities : [],
        form_payload: payload,
        updated_at: new Date().toISOString(),
      };

  //     try {
  //       const valuationRowId = await insertValuationRow(row);
  //       if (valuationRowId) localStorage.setItem(LS_VAL_ROW_ID, String(valuationRowId));
  //     } catch (dbErr) {
  //       console.warn("Valuations insert blocked (likely RLS). Keeping flow:", dbErr?.message);
  //       localStorage.removeItem(LS_VAL_ROW_ID);
  //       localStorage.setItem(LS_PENDING_INSERT, JSON.stringify(row));
  //     }

  //     clearUiAfterSuccessfulValuation();

  //     if (loggedInNow) navigate("/report");
  //     else navigate("/valucheck");
  //   } catch (e) {
  //     console.error(e);
  //     setError(e?.message || "Could not save district/property to database (check RLS policies).");
  //   }
  // };

   let valuationRowId = null;
   try {
        valuationRowId = await insertValuationRow(row);
        if (valuationRowId) localStorage.setItem(LS_VAL_ROW_ID, String(valuationRowId));
      } catch (dbErr) {
        console.warn("Valuations insert blocked (likely RLS):", dbErr?.message);
        localStorage.removeItem(LS_VAL_ROW_ID);
        localStorage.setItem(LS_PENDING_INSERT, JSON.stringify(row));
      }

      // Paywall check — only for logged in users
      if (loggedInNow && userNow?.id) {
  const { data: userData } = await supabase
    .from("users")
    .select("free_reports_used, free_reports_limit, plan")
    .eq("id", userNow.id)
    .single();

  const used = userData?.free_reports_used ?? 0;
  const limit = userData?.free_reports_limit ?? 3;
  const plan = userData?.plan || "free";

  

  localStorage.setItem(
    "truvalu_report_locked",
    plan !== "pro" && used >= limit ? "1" : "0"
  );
}

clearUiAfterSuccessfulValuation();
if (loggedInNow) navigate("/report");
else navigate("/valucheck");
      
    } catch (e) {
      console.error(e);
      setError(e?.message || "Could not save district/property to database (check RLS policies).");
    }
  };

  

 const onReset = () => {
    setError("");
    trackEvent("valuation_reset", { page: "valuation_form" });
    resetDistrictAndProperty();
    setFeatureSearch("");
    setSizeOpen(false);
    setSizeSearch("");
    setRenovationOpen(false);
    setRenovationSearch("");
    setRenovationSelectedLabel("");
    setForm({
      ...DEFAULT_FORM,
      address_search: "",
      plot_no: "",
      property_status: "Owner Occupied",
      furnishing: "Unfurnished",
    });

    localStorage.removeItem(LS_FORM_KEY);
    localStorage.removeItem(LS_VAL_ROW_ID);
    localStorage.removeItem(LS_PENDING_INSERT);
  };

  return (
    <div className="bg-[#F8F8F8] text-gray-900 font-sans min-h-screen">
       {/* <Helmet> */}
        <title>Get Your Free Property Valuation | Acqar Truvalu</title>
        <meta name="robots" content="noindex, nofollow" />
      {/* </Helmet> */}
      <style>{styles}</style>

      {/* ✅ show NEW Header only when NOT logged in (same behavior as before) */}
      {!isLoggedIn ? <Header /> : null}

      {/* ✅ keep your old NavBar behavior when logged out? (REPLACED by Header) */}
      {/* {!isLoggedIn ? <NavBar /> : null} */}

      {/* ✅ IMPORTANT: removed top padding because Header is fixed + includes spacer */}
      <main className="pb-12 sm:pb-16 md:pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Header Section */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-2 sm:mb-3">Property Details</h1>
            <p className="text-gray-500 text-xs sm:text-sm">
              Please provide the structural and legal specifications of your asset
              <br className="hidden sm:block" />
              for a RICS-standard AI valuation.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-2">
              <div className="h-[2px] flex-1 bg-gray-200 relative">
                <div className="absolute left-0 top-0 h-full w-1/2 bg-[#B8763C]" />
              </div>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">PROGRESS</span>
              <span className="text-sm font-bold">Step 2 of 4</span>
            </div>
          </div>

          {/* Main Form Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 sm:p-6 md:p-8 space-y-8">
              {error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm font-semibold">
                  {error}
                </div>
              ) : null}

              {/* 01. LOCATION */}
              <section className="space-y-4">
                <h2 className="text-sm font-bold tracking-wider">01. LOCATION</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* COUNTRY */}
                  <div>
                    <Label>COUNTRY</Label>
                    <select
                      ref={countryRef}
                      className="w-full h-11 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-[#B8763C] focus:border-[#B8763C] px-3 text-sm"
                      value={form.country}
                      onChange={(e) => {
                        const v = e.target.value;
                        update("country", v);
                        if (v === "United Arab Emirates") update("city", "Dubai");
                        else update("city", "");
                        resetDistrictAndProperty();
                      }}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* CITY */}
                  <div>
                    <Label>CITY</Label>
                    <select
                      ref={cityRef}
                      className="w-full h-11 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-[#B8763C] focus:border-[#B8763C] px-3 text-sm"
                      value={form.city}
                      onChange={(e) => {
                        update("city", e.target.value);
                        resetDistrictAndProperty();
                      }}
                      disabled={form.country !== "United Arab Emirates"}
                    >
                      {(form.country === "United Arab Emirates" ? UAE_CITIES : []).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* DISTRICT */}
                  <div ref={districtBoxRef} className="relative">
                    <Label>DISTRICT / AREA</Label>

                    <input
                      ref={districtInputRef}
                      className="w-full h-11 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-[#B8763C] focus:border-[#B8763C] px-3 text-sm"
                      placeholder={isDubaiFlow ? "Select district" : "Select UAE + Dubai first"}
                      value={selectedDistrict ? selectedDistrict.district_name : districtQuery}
                      disabled={!isDubaiFlow}
                      readOnly
                      inputMode="none"
                      onClick={() => {
                        // ✅ allow re-select / open search again
                        setSelectedDistrict(null);
                        setDistrictQuery(""); // start fresh search
                        setDistrictOpen(true);

                        // ✅ reset property when district changes
                        setSelectedProperty(null);
                        setPropertyQuery("");
                        setPropertyResults([]);
                        setPropertyOpen(false);

                        update("district_code", "");
                        update("district_name", "");
                        update("area_name_en", "");
                        update("property_name", "");
                        update("project_reference", "");
                        update("project_name_en", "");
                      }}
                    />

                    {/* ✅ Mobile-friendly anchored dropdown */}
                    {districtOpen && isDubaiFlow ? (
                      <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                        <div className="p-3 border-b border-gray-100 bg-white sticky top-0 z-10">
                          <input
                            className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#B8763C] focus:border-[#B8763C] text-sm"
                            placeholder="Search district..."
                            value={districtQuery}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDistrictQuery(v);
                              setSelectedDistrict(null);

                              // reset property
                              setSelectedProperty(null);
                              setPropertyQuery("");
                              setPropertyResults([]);
                              setPropertyOpen(false);

                              update("district_code", "");
                              update("district_name", v);
                              update("area_name_en", v);
                            }}
                          />

                          {/* {canAddTypedDistrict ? (
                            <button
                              type="button"
                              className="mt-2 w-full text-left px-3 py-2 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold hover:bg-orange-100"
                              onClick={() => {
                                const dn = norm(districtQuery);
                                if (!dn) return;
                                const d = { district_code: "", district_name: dn };
                                setSelectedDistrict(d);
                                setDistrictQuery(dn);
                                setDistrictOpen(false);

                                update("district_code", "");
                                update("district_name", dn);
                                update("area_name_en", dn);

                                // reset property
                                setSelectedProperty(null);
                                setPropertyQuery("");
                                setPropertyResults([]);
                                setPropertyOpen(false);
                              }}
                            >
                              + Use "{norm(districtQuery)}" (add new)
                            </button>
                          ) : null} */}
                        </div>

                        <div className="max-h-64 overflow-auto overscroll-contain">
                          {filteredDistricts.length === 0 && !districtLoading ? (
                            <div className="px-4 py-3 text-sm text-gray-500">No districts found</div>
                          ) : (
                            filteredDistricts.map((d) => (
                              <button
                                key={`${d.district_code}-${d.district_name}`}
                                type="button"
                                className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 active:bg-gray-100"
                                onClick={() => {
                                  setSelectedDistrict(d);
                                  setDistrictQuery(d.district_name);
                                  setDistrictOpen(false);

                                  update("district_code", d.district_code || "");
                                  update("district_name", d.district_name || "");
                                  update("area_name_en", d.district_name || "");

                                  // reset property
                                  setSelectedProperty(null);
                                  setPropertyQuery("");
                                  setPropertyResults([]);
                                  setPropertyOpen(false);
                                }}
                              >
                                {d.district_name}
                              </button>
                            ))
                          )}
                        </div>

                        <div className="sm:hidden border-t border-gray-100 p-2 bg-white">
                          <button
                            type="button"
                            onClick={() => setDistrictOpen(false)}
                            className="w-full h-10 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 bg-white active:bg-gray-50"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>

              {/* 02. PROPERTY SPECIFICATIONS */}
              <section className="space-y-4 pt-4 border-t border-gray-100">
                <h2 className="text-sm font-bold tracking-wider">02. PROPERTY SPECIFICATIONS</h2>

                {/* Row 1: Building / Project Name */}
                <div className="grid grid-cols-1 gap-4">
                  <div ref={propertyBoxRef} className="relative">
                    <Label>BUILDING / PROJECT NAME</Label>
                    <input
                      ref={propertyInputRef}
                      className="w-full h-11 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-[#B8763C] focus:border-[#B8763C] px-3 text-sm"
                      placeholder={typedDistrictName ? "Select property" : "Select district first"}
                      value={selectedProperty ? selectedProperty.property_name : propertyQuery}
                      disabled={!typedDistrictName}
                      readOnly
                      inputMode="none"
                      onClick={() => {
                        // ✅ allow re-select / open search again
                        setSelectedProperty(null);
                        setPropertyQuery(""); // start fresh search
                        setPropertyOpen(true);

                        update("property_name", "");
                        update("project_reference", "");
                        update("project_name_en", "");
                      }}
                    />

                    {propertyOpen && typedDistrictName ? (
                      <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                        <div className="p-3 border-b border-gray-100 bg-white sticky top-0 z-10">
                          <div className="relative">
                            <input
                              className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-md focus:ring-1 focus:ring-[#B8763C] focus:border-[#B8763C] text-sm"
                              placeholder="Search property..."
                              value={propertyQuery}
                              onChange={(e) => {
                                const v = e.target.value;
                                setPropertyQuery(v);
                                setSelectedProperty(null);
                                update("property_name", v);
                                update("project_reference", v);
                                update("project_name_en", v);
                              }}
                            />

                            {/* {canAddTypedProperty ? (
                              <button
                                type="button"
                                className="mt-2 w-full text-left px-3 py-2 rounded-md bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold hover:bg-orange-100"
                                onClick={() => {
                                  const pn = norm(propertyQuery);
                                  if (!pn) return;
                                  const p = { property_name: pn };
                                  setSelectedProperty(p);
                                  setPropertyQuery(pn);
                                  setPropertyOpen(false);
                                  update("property_name", pn);
                                  update("project_reference", pn);
                                  update("project_name_en", pn);
                                }}
                              >
                                + Use "{norm(propertyQuery)}" (add new)
                              </button>
                            ) : null} */}
                          </div>
                        </div>

                        <div className="max-h-[50vh] sm:max-h-60 overflow-auto">
                          {filteredProperties.length === 0 && !propertyLoading ? (
                            <div className="px-4 py-3 text-sm text-gray-500">No properties found</div>
                          ) : (
                            filteredProperties.map((p) => (
                              <button
                                key={p.property_name}
                                type="button"
                                className="w-full text-left px-4 py-3 sm:py-2.5 text-sm hover:bg-gray-50"
                                onClick={() => {
                                  setSelectedProperty(p);
                                  setPropertyQuery(p.property_name);
                                  setPropertyOpen(false);
                                  update("property_name", p.property_name);
                                  update("project_reference", p.property_name);
                                  update("project_name_en", p.property_name);
                                }}
                              >
                                {p.property_name}
                              </button>
                            ))
                          )}
                        </div>

                        <div className="sm:hidden border-t border-gray-100 p-2">
                          <button
                            type="button"
                            onClick={() => setPropertyOpen(false)}
                            className="w-full h-10 rounded-md border border-gray-200 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Row 2: Title Deed Number + Plot Number */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>TITLE DEED NUMBER (Optional)</Label>
                    <input
                      className="w-full h-11 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-[#B8763C] focus:border-[#B8763C] px-3 text-sm"
                      placeholder="e.g. 12347904"
                      value={form.title_deed_no || ""}
                      onChange={(e) => update("title_deed_no", e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>PLOT NUMBER (Optional) </Label>

                    <input
                      className="
                        w-full h-12
                        bg-white border border-gray-200
                        rounded-lg
                        px-3 text-sm
                        placeholder:text-gray-400
                        focus:ring-2 focus:ring-[#B8763C]/30
                        focus:border-[#B8763C]
                        transition-all
                      "
                      placeholder="Enter plot number"
                      value=""
                      onChange={(e) => update("plot_no", e.target.value)}
                    />
                  </div>
                </div>

                {/* Row 3: Tenure Type */}
                <div>
                  <Label>TENURE TYPE</Label>
                  <div className="flex flex-wrap gap-2">
                    {TITLE_DEED_TYPES.map((t) => (
                      <ToggleBtnClean key={t} active={form.title_deed_type === t} onClick={() => update("title_deed_type", t)} label={t} />
                    ))}
                  </div>
                </div>
              </section>

              {/* 03. VALUATION TYPE
              <section className="space-y-4 pt-4 border-t border-gray-100">
                <h2 className="text-sm font-bold tracking-wider">03. VALUATION TYPE</h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {["MARKET VALUE", "RENTAL YIELD", "MORTGAGE APP.", "REINSTATEMENT"].map((x) => {
                    const mapping = {
                      "MARKET VALUE": "Current Market Value",
                      "RENTAL YIELD": "Historical Property Value",
                      "MORTGAGE APP.": "Verify Previous Valuation",
                      REINSTATEMENT: "Reinstatement Value",
                    };
                    const formValue = mapping[x];
                    return (
                      <ToggleBtnClean key={x} active={form.valuation_type === formValue} onClick={() => update("valuation_type", formValue)} label={x} />
                    );
                  })}
                </div>
              </section> */}

              {/* 04. UNIT DETAILS */}
              <section className="space-y-4 pt-4 border-t border-gray-100">
                <h2 className="text-sm font-bold tracking-wider">04. UNIT DETAILS</h2>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                     <Label>UNIT NO. (Optional)</Label>
                    <input
                      ref={aptRef}
                      className="w-full h-11 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-[#B8763C] focus:border-[#B8763C] px-3 text-sm"
                      placeholder="e.g. 12A"
                       value={form.unit_no || ""}
    onChange={(e) => update("unit_no", e.target.value)}
                    />

              </div>

             
                  {/* ✅ SIZE (type manually OR pick range; NO conversion) */}
                  <div ref={sizeBoxRef} className="relative">
      <Label>
        SIZE{" "}
        <span className="text-[10px] text-[#B8763C] ml-1">
          {form.area_unit === "sq.m" ? "SqM ▼" : "SqFt ▼"}
        </span>
      </Label>

      <div className="relative flex">
        {/* LEFT: input (typing allowed) + arrow toggle */}
        <div className="relative w-full">
          <input
            ref={sizeRef}
            inputMode="decimal"
            className="w-full h-11 bg-white border border-gray-200 rounded-l-md focus:ring-1 focus:ring-[#B8763C] focus:border-[#B8763C] px-3 text-sm text-left pr-9"
            value={sizeSelectedLabel || (form.area_value || "")}
            placeholder="Total Area"
            onChange={(e) => {
              // ✅ user typing => show typed number (not range label)
              setSizeSelectedLabel("");

              let v = e.target.value.replace(/[^\d.]/g, "");
              const parts = v.split(".");
              if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
              update("area_value", v);
            }}
            onClick={() => {
              // ✅ open dropdown on click (keep label if already selected)
              if (!sizeOpen) setSizeSearch("");
              setSizeOpen(true);
            }}
          />

          {/* dropdown opens ONLY when arrow clicked */}
          <button
            type="button"
            onClick={() => {
              if (!sizeOpen) setSizeSearch("");
              setSizeOpen((v) => !v);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Toggle size ranges"
          >
            ▼
          </button>
        </div>

        {/* RIGHT: unit selector (NO conversion) */}
        <select
          className="h-11 bg-gray-50 border border-l-0 border-gray-200 rounded-r-md px-2 text-xs focus:ring-0"
          value={form.area_unit}
          onChange={(e) => {
            // ✅ NO conversion: only switch unit label
            update("area_unit", e.target.value);

            // ✅ clear label because ranges list changes
            setSizeSelectedLabel("");
          }}
        >
          <option value="sq.ft">Sq Ft</option>
          <option value="sq.m">Sq M</option>
        </select>

        {/* dropdown */}
        {sizeOpen ? (
          <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
            <div className="p-3 border-b border-gray-100 bg-white sticky top-0 z-10">
              <input
                className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#B8763C] focus:border-[#B8763C] text-sm"
                placeholder={
                  form.area_unit === "sq.m"
                    ? "Search (sqm) e.g. 50 or 50-60"
                    : "Search (sqft) e.g. 500 or 500-600"
                }
                value={sizeSearch}
               onChange={(e) => {
  // ✅ typing a value should override any selected range label
  setSizeSelectedLabel("");

  let v = e.target.value.replace(/[^\d.]/g, "");
  const parts = v.split(".");
  if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
  update("area_value", v);
}}

              />
            </div>

            <div className="max-h-64 overflow-auto overscroll-contain">
              {(() => {
                const q = (sizeSearch || "").trim().toLowerCase();

                const filtered = SIZE_RANGES.filter((r) => {
                  if (!q) return true;
                  return r.label.includes(q);
                });

                if (filtered.length === 0) {
                  return <div className="px-4 py-3 text-sm text-gray-500">No ranges found</div>;
                }

                return filtered.map((r) => {
                  const display = r.label;

                  return (
                    <button
                      key={r.label}
                      type="button"
                      className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 active:bg-gray-100"
                      onClick={() => {
                        // ✅ pick ANY value inside selected range for valuation
                        const v = pickAnyInRangeInclusive(r.start, r.end);
                        update("area_value", String(v)); // numeric used for valuation
                        setSizeSelectedLabel(r.label);   // label shown to user
                        setSizeOpen(false);
                      }}
                    >
                      {display}{" "}
                      <span className="text-gray-400 text-xs ml-2">{form.area_unit}</span>
                    </button>
                  );
                });
              })()}
            </div>

            <div className="sm:hidden border-t border-gray-100 p-2 bg-white">
              <button
                type="button"
                onClick={() => setSizeOpen(false)}
                className="w-full h-10 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 bg-white active:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>

                  <div>
                    <Label>BEDROOMS </Label>
                  
                   <select
  className="w-full h-11 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-[#B8763C] focus:border-[#B8763C] px-3 text-sm"
  value={
    String(
      form.bedrooms === 0 || form.bedrooms === "0" || form.bedrooms === "" || form.bedrooms == null
        ? "studio"
        : form.bedrooms
    )
  }
  onChange={(e) => update("bedrooms", e.target.value)}
>
  <option value="studio">Studio</option>
  {BEDROOMS.filter((x) => String(x) !== "0").map((x) => (
    <option key={x} value={x}>
      {x} Bedroom{x !== "1" ? "s" : ""}
    </option>
  ))}
</select>
                  </div>

                  <div>
                    <Label>BATHROOMS </Label>
                    
                    <select
  className="w-full h-11 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-[#B8763C] focus:border-[#B8763C] px-3 text-sm"
  value={String(form.bathrooms === "" || form.bathrooms == null || form.bathrooms === "-" ? "1" : form.bathrooms)}
  onChange={(e) => update("bathrooms", e.target.value)}
>
  {BATHROOMS.map((x) => (
    <option key={x} value={x}>
      {x} Bathroom{x !== "1" ? "s" : ""}
    </option>
  ))}
</select>
                  </div>
                </div>

                <div>
                  <Label>FURNISHING STATUS</Label>
                  <div className="flex flex-wrap gap-3">
                    {["Fully Furnished", "Semi-Furnished", "Unfurnished"].map((x) => {
                      const mapping = {
                        "Fully Furnished": "Furnished",
                        "Semi-Furnished": "SemiFurnished",
                        Unfurnished: "Unfurnished",
                      };
                      const formValue = mapping[x];
                      return (
                        <label key={x} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="furnishing"
                            checked={form.furnishing === formValue}
                            onChange={() => update("furnishing", formValue)}
                            className="w-4 h-4 text-[#B8763C] focus:ring-[#B8763C]"
                          />
                          <span className="text-sm">{x}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* ✅ IS RENOVATED? */}
                <div>
                  <Label>IS RENOVATED?</Label>
                  <div className="flex gap-3">
                    <ToggleBtnClean
                      label="Yes"
                      active={form.is_renovated === true}
                      onClick={() => update("is_renovated", true)}
                    />
                    <ToggleBtnClean
                      label="No"
                      active={form.is_renovated !== true}
                      onClick={() => {
                        update("is_renovated", false);
                        update("renovation_amount", "");
                        setRenovationSelectedLabel("");
                        setRenovationOpen(false);
                      }}
                    />
                  </div>

                  {form.is_renovated === true ? (
                    <div ref={renovationBoxRef} className="relative mt-3">
                      <Label>RENOVATION AMOUNT (AED)</Label>
                      <div className="relative">
                        <input
                          inputMode="decimal"
                          className="w-full h-11 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-[#B8763C] focus:border-[#B8763C] px-3 text-sm pr-9"
                          value={renovationSelectedLabel || (form.renovation_amount || "")}
                          placeholder="e.g. 5000"
                          onChange={(e) => {
                            setRenovationSelectedLabel("");
                            let v = e.target.value.replace(/[^\d.]/g, "");
                            const parts = v.split(".");
                            if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
                            update("renovation_amount", v);
                          }}
                          onClick={() => {
                            if (!renovationOpen) setRenovationSearch("");
                            setRenovationOpen(true);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!renovationOpen) setRenovationSearch("");
                            setRenovationOpen((v) => !v);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          aria-label="Toggle renovation ranges"
                        >
                          ▼
                        </button>

                        {renovationOpen ? (
                          <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                            <div className="p-3 border-b border-gray-100 bg-white sticky top-0 z-10">
                              <input
                                className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#B8763C] focus:border-[#B8763C] text-sm"
                                placeholder="Search amount e.g. 5000"
                                value={renovationSearch}
                                onChange={(e) => {
                                  setRenovationSelectedLabel("");
                                  let v = e.target.value.replace(/[^\d.]/g, "");
                                  const parts = v.split(".");
                                  if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
                                  update("renovation_amount", v);
                                  setRenovationSearch(e.target.value);
                                }}
                              />
                            </div>

                            <div className="max-h-64 overflow-auto overscroll-contain">
                              {RENOVATION_RANGES.filter((r) => {
                                const q = (renovationSearch || "").trim().toLowerCase();
                                if (!q) return true;
                                return (
                                  r.label.toLowerCase().includes(q) ||
                                  String(r.start).includes(q) ||
                                  String(r.end).includes(q)
                                );
                              }).map((r) => (
                                <button
                                  key={r.label}
                                  type="button"
                                  className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 active:bg-gray-100"
                                  onClick={() => {
                                    const v = pickAnyInRangeInclusive(r.start, r.end);
                                    update("renovation_amount", String(v));
                                    setRenovationSelectedLabel(r.label);
                                    setRenovationOpen(false);
                                  }}
                                >
                                  {r.label}
                                </button>
                              ))}
                            </div>

                            <div className="sm:hidden border-t border-gray-100 p-2 bg-white">
                              <button
                                type="button"
                                onClick={() => setRenovationOpen(false)}
                                className="w-full h-10 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 bg-white active:bg-gray-50"
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>

              {/* 05. FEATURES & AMENITIES */}
              <section className="space-y-4 pt-4 border-t border-gray-100">
                <h2 className="text-sm font-bold tracking-wider">05. FEATURES & AMENITIES</h2>

                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    value={featureSearch}
                    onChange={(e) => setFeatureSearch(e.target.value)}
                    placeholder="Search amenities..."
                    className="w-full h-11 bg-white border border-gray-200 rounded-md px-10 text-sm focus:ring-1 focus:ring-[#B8763C] focus:border-[#B8763C] outline-none"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>

                  {featureSearch ? (
                    <button
                      type="button"
                      onClick={() => setFeatureSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label="clear amenities search"
                    >
                      ✕
                    </button>
                  ) : null}
                </div>

                {/* Scroll container */}
                <div className="rounded-lg border border-gray-200 bg-white">
                  <div className="max-h-64 overflow-y-auto p-3">
                    <div className="flex flex-wrap gap-2">
                      {(filteredAmenities || []).map((a) => {
                        const on = (form.amenities || []).includes(a);
                        return (
                          <button
                            key={a}
                            type="button"
                            onClick={() => toggleAmenity(a)}
                            className={
                              on
                                ? "px-3 sm:px-4 py-2 bg-[#B8763C] text-white rounded-full text-[11px] sm:text-xs font-medium"
                                : "px-3 sm:px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-full text-[11px] sm:text-xs font-medium hover:border-[#B8763C]"
                            }
                          >
                            {a}
                          </button>
                        );
                      })}

                      {filteredAmenities?.length === 0 ? <div className="text-sm text-gray-500 px-1 py-2">No amenities found.</div> : null}
                    </div>
                  </div>
                </div>
              </section>

              {/* Actions */}
              <div className="pt-6 flex flex-col md:flex-row gap-4">
                <button
                  type="button"
                  onClick={onNext}
                  className="
                    group w-full h-14 md:h-12
                    bg-gradient-to-r from-[#B8763C] to-[#C98945]
                    text-white rounded-xl font-bold
                    text-[18px] md:text-[16px]
                    tracking-wide
                    shadow-lg shadow-[#B8763C]/30
                    active:scale-[0.98] hover:shadow-xl
                    transition-all duration-200
                    flex items-center justify-center gap-2
                  "
                >
                  Get Free Valuation

                  <span
                    className="
                      material-symbols-outlined
                      text-[26px] md:text-[20px]
                      transition-transform group-hover:translate-x-1
                    "
                  >
                    arrow_forward
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onReset}
                  className="px-8 h-12 bg-white border border-gray-200 text-gray-600 rounded-md font-medium text-sm hover:bg-gray-50 transition-colors"
                >
                  RESET ALL FIELDS
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>



      {/* ✅ REPLACED Footer */}
      <Footer />
    </div>
  );
}

// ---------- Small UI helpers ----------
function Label({ children }) {
  return <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">{children}</label>;
}

function ToggleBtnClean({ label, active, onClick }) {
  const base = "py-2.5 px-4 text-xs font-semibold rounded-md border transition-all text-center cursor-pointer select-none";
  const act = "border-black bg-black text-white";
  const inact = "border-gray-200 bg-white text-gray-600 hover:border-gray-300";

  return (
    <button type="button" onClick={onClick} className={[base, "flex-1 min-w-[120px] sm:min-w-0", active ? act : inact].join(" ")}>
      {label}
    </button>
  );

}
