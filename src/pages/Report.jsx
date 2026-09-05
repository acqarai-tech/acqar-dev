import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { trackEvent } from "../analytics";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import UAECostCalculator from "../components/UAECostCalculator";
import UAEPropertyCostCalculator from "../components/UAEPropertyCostCalculator";
import PaywallModal from "../components/PaywallModal";

import {
  ResponsiveContainer,
  AreaChart,
  BarChart,
  Bar,
  Area,
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  ReferenceLine,
} from "recharts";

const RAW_API = process.env.REACT_APP_AVM_API;
const API = RAW_API ? RAW_API.replace(/\/+$/, "") : "";

const LS_FORM_KEY = "truvalu_formData_v1";
const LS_REPORT_KEY = "truvalu_reportData_v1";
const LS_VAL_ROW_ID = "truvalu_valuation_row_id";
const LS_COUNTED_ID = "truvalu_counted_val_id";

function safeParse(json) {
  try { return JSON.parse(json); } catch { return null; }
}
function fmtAED(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return "—";
  return `AED ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
function fmtNum(x, d = 0) {
  const n = Number(x);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: d });
}
function fmtDate(iso) {
  if (!iso) return "—";
  const s = String(iso).slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}
function monthLabel(yyyyMm) {
  if (!yyyyMm) return "";
  const [y, m] = String(yyyyMm).split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  if (Number.isNaN(d.getTime())) return String(yyyyMm);
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}
function fmtPct(x, d = 0) {
  const n = Number(x);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(d)}%`;
}
const SQM_TO_SQFT = 10.763910416709722;
function sqmToSqft(sqm) {
  const n = Number(sqm);
  if (!Number.isFinite(n)) return null;
  return n * SQM_TO_SQFT;
}
function aedPerSqftFromAedPerSqm(aedPerSqm) {
  const n = Number(aedPerSqm);
  if (!Number.isFinite(n)) return null;
  return n / SQM_TO_SQFT;
}

function normalizeValuationResponse(data, fallbackFormData) {
  const total = data?.total_valuation ?? data?.total ?? data?.market?.total_valuation ?? data?.tx?.total_valuation ?? null;
  const psm = data?.predicted_meter_sale_price ?? data?.price_per_sqm ?? data?.market?.price_per_sqm ?? data?.tx?.price_per_sqm ?? null;
  const psf = data?.price_per_sqft ?? data?.market?.price_per_sqft ?? data?.tx?.price_per_sqft ?? (Number.isFinite(Number(psm)) ? aedPerSqftFromAedPerSqm(psm) : null);
  const areaSqm = data?.procedure_area_sqm ?? data?.procedure_area ?? data?.tx?.procedure_area_sqm ?? data?.market?.procedure_area_sqm ?? fallbackFormData?.procedure_area ?? 0;
  const areaSqft = data?.procedure_area_sqft ?? (Number.isFinite(Number(areaSqm)) ? sqmToSqft(areaSqm) : null);
  const rangeLow = data?.range_low ?? data?.ci_low ?? null;
  const rangeHigh = data?.range_high ?? data?.ci_high ?? null;
  return { total_valuation: total, price_per_sqm: psm, price_per_sqft: psf, procedure_area_sqm: Number(areaSqm) || 0, procedure_area_sqft: Number(areaSqft) || null, range_low: rangeLow, range_high: rangeHigh, currency: data?.currency || "AED" };
}

function SectionHeader({ label, title }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(43,43,43,.4)", marginBottom: 4 }}>{label}</div>
      <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#2B2B2B", letterSpacing: "-.01em" }}>{title}</h3>
    </div>
  );
}

function SectionBox({ children, style = {} }) {
  return (
    <section style={{ marginTop: 48, background: "#fff", border: "1px solid #E8E8E8", borderRadius: 12, padding: "24px 28px", ...style }}>
      {children}
    </section>
  );
}

function generatePriceTimeline(currentValue) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const GROWTH_RATE = 0.06;
  const points = [];
  for (let i = 2; i >= 1; i--) {
    points.push({ year: String(currentYear - i), historical: Math.round(currentValue / Math.pow(1 + GROWTH_RATE, i)), forecast: null });
  }
  points.push({ year: String(currentYear), historical: Math.round(currentValue), forecast: Math.round(currentValue) });
  for (let i = 1; i <= 3; i++) {
    points.push({ year: String(currentYear + i), historical: null, forecast: Math.round(currentValue * Math.pow(1 + GROWTH_RATE, i)) });
  }
  return points;
}

function PricePredictionChart({ currentValue }) {
  const data = generatePriceTimeline(currentValue);
  const currentYear = String(new Date().getFullYear());
  const futurePoints = data.filter(d => d.forecast !== null && d.historical === null);

  const renderHistoricalDot = (props) => {
    const { cx, cy, payload } = props;
    if (payload.historical == null) return <g key={`h-empty-${cx}`} />;
    return <circle key={`h-${payload.year}`} cx={cx} cy={cy} r={4} fill="#9ca3af" stroke="#fff" strokeWidth={2} />;
  };

  const renderForecastDot = (props) => {
    const { cx, cy, payload } = props;
    if (payload.forecast == null) return <g key={`f-empty-${cx}`} />;
    return <circle key={`f-${payload.year}`} cx={cx} cy={cy} r={4} fill="#B87333" stroke="#fff" strokeWidth={2} />;
  };

  return (
    
    <SectionBox>
      <SectionHeader label="AI Projection" title="3-Year Price Forecast" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 24 }}>
        {futurePoints.map((d) => (
          <div key={d.year} style={{ background: "#fff8f3", border: "1px solid #fcd9b6", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#e87722", letterSpacing: 1, marginBottom: 4 }}>{d.year} EST.</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#111" }}>{fmtAED(d.forecast)}</div>
            <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>+6% projected annual growth</div>
          </div>
        ))}
      </div>
      <div style={{ height: "min(240px, 50vw)" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} width={55} />
            <Tooltip
              formatter={(v, name) => { if (v == null) return [null, null]; return [fmtAED(v), name === "historical" ? "Historical" : "AI Forecast"]; }}
              contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
            />
            <ReferenceLine x={currentYear} stroke="#e87722" strokeDasharray="4 4"
              label={{ value: "Today", position: "insideTopRight", fontSize: 10, fill: "#e87722" }}
            />
            <Line type="monotone" dataKey="historical" name="historical" stroke="#9ca3af" strokeWidth={2} connectNulls={false} dot={renderHistoricalDot} activeDot={{ r: 5, fill: "#9ca3af" }} />
            <Line type="monotone" dataKey="forecast" name="forecast" stroke="#B87333" strokeWidth={2} strokeDasharray="6 3" connectNulls={false} dot={renderForecastDot} activeDot={{ r: 5, fill: "#B87333" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#6b7280" }}>
          <div style={{ width: 24, height: 2, background: "#9ca3af" }} /> Historical (2 years)
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#6b7280" }}>
          <div style={{ width: 24, height: 2, borderTop: "2px dashed #B87333" }} /> AI Forecast (3 years)
        </div>
      </div>
      <div style={{ marginTop: 12, fontSize: 11, color: "rgba(43,43,43,.4)", fontStyle: "italic", textAlign: "center" }}>
        Based on Dubai market avg. 6% annual growth · For indicative purposes only
      </div>
    </SectionBox>
    
  );
}

function HeaderLite() {
  const navigate = useNavigate();
  return (
    <>
      <header className="acqHdrLite">
        <div className="acqHdrLiteInner">
          <div className="acqHdrLogo" onClick={() => navigate("/")} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate("/"); }}
            aria-label="Go to landing page" title="ACQAR">
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
  <span style={{ fontWeight: 900, fontSize: 14, letterSpacing: "0.12em" }}>
    <span style={{ color: "#B87333" }}>ACQ</span>
    <span style={{ color: "#111111" }}>AR</span>
  </span>
  <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 4, background: "rgba(184,115,51,0.08)", border: "1px solid rgba(184,115,51,0.35)" }}>
    <span style={{ fontSize: 11, fontWeight: 700, color: "#B87333", letterSpacing: "1.5px", textTransform: "uppercase" }}>TRUVALU™</span>
  </span>
</div>
          </div>
        </div>
      </header>
      <div className="acqHdrLiteSpacer" />
    </>
  );
}

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

export default function Report() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const valuationId = sp.get("id");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // 1. Page view
  useEffect(() => {
    trackEvent("page_viewed", { page: "report" });
  }, []);

  // 2. Scroll depth
  useEffect(() => {
    const scrolled = { 25: false, 50: false, 75: false, 100: false };
    const handleScroll = () => {
      const pct = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      if (pct >= 25 && !scrolled[25]) { scrolled[25] = true; trackEvent("scroll_depth", { page: "report", depth: "25%" }); }
      if (pct >= 50 && !scrolled[50]) { scrolled[50] = true; trackEvent("scroll_depth", { page: "report", depth: "50%" }); }
      if (pct >= 75 && !scrolled[75]) { scrolled[75] = true; trackEvent("scroll_depth", { page: "report", depth: "75%" }); }
      if (pct >= 100 && !scrolled[100]) { scrolled[100] = true; trackEvent("scroll_depth", { page: "report", depth: "100%" }); }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 3. Time spent
  useEffect(() => {
    const startTime = Date.now();
    return () => {
      trackEvent("time_spent", { page: "report", seconds: Math.round((Date.now() - startTime) / 1000) });
    };
  }, []);


  const [fbSubmitting, setFbSubmitting] = useState(false);
  const [fbStep, setFbStep] = useState("choose");
  const [fbRating, setFbRating] = useState("");
  const [fbNote, setFbNote] = useState("");
  const [fbStar, setFbStar] = useState(0);
  const [fbStarHover, setFbStarHover] = useState(0);

  const [showSectionLock, setShowSectionLock] = useState(false);
  const [showAllComparables, setShowAllComparables] = useState(false);

  const [formData, setFormData] = useState(() => safeParse(localStorage.getItem(LS_FORM_KEY)) || {});
  const [reportData, setReportData] = useState(() => safeParse(localStorage.getItem(LS_REPORT_KEY)) || null);
  const [valRow, setValRow] = useState(null);

const savedRef = useRef(false);
const incrementedRef = useRef(false);
  const location = useLocation();
  const [copied, setCopied] = useState(false);
  const [loggedUser, setLoggedUser] = useState(null);
  const [lsValRowId, setLsValRowId] = useState(() => localStorage.getItem(LS_VAL_ROW_ID) || "");
  const [userStats, setUserStats] = useState({ used: 0, limit: 3, plan: "free" });
const [statsReady, setStatsReady] = useState(false);

  // ── Paywall / lock state ──────────────────────────────────────────────────
  const [isLocked, setIsLocked] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallValuationId, setPaywallValuationId] = useState(null);
  // ─────────────────────────────────────────────────────────────────────────

  // ── Reusable lock-check function (called on mount AND after payment) ──────
const checkLock = useCallback(async () => {
  const { data: sess } = await supabase.auth.getSession();
  const user = sess?.session?.user;

  // Always fetch user plan first — needed for LockedSection regardless of valuationId
  let userData = null;
  if (user) {
    const { data, error: userErr } = await supabase
      .from("users")
      .select("free_reports_used, free_reports_limit, plan")
      .eq("id", user.id)
      .single();

    if (!userErr && data) {
      userData = data;
      // Always update userStats so LockedSection knows the real plan
      setUserStats({
        used: data.free_reports_used ?? 0,
        limit: data.free_reports_limit ?? 3,
        plan: data.plan ?? "free",
      });
    }
  }

  // Shared report links (?id=xxx) — never show isLocked overlay
  // but LockedSection still uses userStats.plan set above
  if (valuationId) {
    setIsLocked(false);
    return;
  }

  // Not logged in → not locked
  if (!user || !userData) {
    setIsLocked(false);
    return;
  }

  const used  = userData.free_reports_used  ?? 0;
  const limit = userData.free_reports_limit ?? 3;
  const plan  = userData.plan               ?? "free";

  // Free users get 3 reports free — on the 4th report it locks
  const locked = plan !== "pro" && plan !== "elite" && used > limit;

  console.log("[checkLock] result:", { plan, used, limit, locked });
  setIsLocked(locked);

  const valId = localStorage.getItem(LS_VAL_ROW_ID) || "";
  setPaywallValuationId(valId || null);
}, [valuationId]);
 
  // ─────────────────────────────────────────────────────────────────────────

  
  // Run lock check on mount
  useEffect(() => {
    checkLock();
  }, [checkLock]);

  async function submitFeedback(rating, note) {
    try {
      if (fbSubmitting) return;
      setFbSubmitting(true);
      const { data: u } = await supabase.auth.getUser();
      const user = u?.user || null;
      const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || (user?.email ? user.email.split("@")[0] : null) || null;
      const valId = shareValId && /^\d+$/.test(String(shareValId)) ? Number(shareValId) : null;
      const payload = { rating, comment: (note || "").trim() || null, star: fbStar || null, valuation_id: valId, user_id: user?.id || null, user_name: userName, user_email: user?.email || null, page: "report", user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null };
      const { error } = await supabase.from("feedback").insert(payload);
      if (error) throw error;
      setFbStep("success");
    } catch (e) {
      setErr(e?.message || "Failed to save feedback.");
    } finally {
      setFbSubmitting(false);
    }
  }

  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "auto" }); }, [location.pathname]);

  function displayBedroomsFromForm(fd) {
    const b = fd?.bedrooms ?? fd?.rooms_en ?? fd?.bedroom ?? "";
    const s = String(b).trim().toLowerCase();
    if (!s || s === "-" || s === "null" || s === "undefined") return "Studio";
    if (s === "studio") return "Studio";
    if (s === "0") return "Studio";
    const m = s.match(/\d+/);
    if (!m) return "Studio";
    const n = Number(m[0]);
    if (!Number.isFinite(n) || n <= 0) return "Studio";
    return `${n} Bedroom${n === 1 ? "" : "s"}`;
  }

  function displayBathroomsFromForm(fd) {
    const b = fd?.bathrooms ?? fd?.bathrooms_en ?? fd?.baths ?? fd?.bathroom ?? "";
    const s = String(b).trim().toLowerCase();
    if (!s || s === "-" || s === "null" || s === "undefined") return "1 Bathroom";
    const m = s.match(/\d+(\.\d+)?/);
    if (!m) return "1 Bathroom";
    const n = Number(m[0]);
    if (!Number.isFinite(n) || n <= 0) return "1 Bathroom";
    return `${m[0]} Bathroom${Number(m[0]) === 1 ? "" : "s"}`;
  }

  const shareValId = useMemo(() => {
    const fromLS = localStorage.getItem(LS_VAL_ROW_ID) || "";
    const raw = valuationId || (valRow?.id != null ? String(valRow.id) : "") || lsValRowId || fromLS;
    const clean = String(raw || "").trim();
    if (!/^\d+$/.test(clean)) return "";
    return clean;
  }, [valuationId, valRow, lsValRowId]);

  const shareUrl = shareValId ? `${window.location.origin}/report?id=${encodeURIComponent(shareValId)}` : "";

  async function handleCopyShareLink() {
    if (!shareUrl) { alert("No report id found to share."); return; }
    trackEvent("report_share_link_copied", { page: "report", share_url: shareUrl });
    try { await navigator.clipboard.writeText(shareUrl); } catch (e) {
      const ta = document.createElement("textarea"); ta.value = shareUrl; ta.setAttribute("readonly", ""); ta.style.position = "absolute"; ta.style.left = "-9999px"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    }
    setCopied(true); window.clearTimeout(handleCopyShareLink._copiedT); handleCopyShareLink._copiedT = window.setTimeout(() => setCopied(false), 1800);
  }

  

  useEffect(() => {
    let mounted = true;
    async function loadValuation() {
      if (!valuationId) return;
      try {
        setErr(""); setLoading(true);
        const cleanId = valuationId ? String(valuationId).trim() : "";
        if (!/^\d+$/.test(cleanId)) { if (!mounted) return; setErr("Invalid share link (id must be a number)."); setLoading(false); return; }
        const { data, error } = await supabase.from("valuations").select("*").eq("id", Number(cleanId)).maybeSingle();
        if (error) throw error;
        if (!data) { setErr("This shared report was not found (invalid or deleted id)."); setLoading(false); return; }
        setValRow(data || null);
        const payload = data?.form_payload || data?.payload || null;
        const obj = typeof payload === "string" ? safeParse(payload) : payload;
        if (obj && typeof obj === "object") { setFormData(obj); } else { setErr("This shared report has no form_payload saved."); }
      } catch (e) { if (!mounted) return; setErr(e?.message || "Failed to load shared valuation."); }
      finally { if (!mounted) return; setLoading(false); }
    }
    loadValuation();
    return () => { mounted = false; };
  }, [valuationId]);

useEffect(() => {
    let mounted = true;
  async function run() {
  console.log("🔴 run() called", new Date().toISOString());
  try {
    setErr(""); setLoading(true);

    // ✅ NEW: If opening a saved/shared report, load from saved report_payload
    if (valuationId && valRow?.report_payload) {
      const saved = typeof valRow.report_payload === "string"
        ? safeParse(valRow.report_payload)
        : valRow.report_payload;
      if (saved && typeof saved === "object") {
        const normalized = normalizeValuationResponse(saved, formData);
        setReportData({ ...saved, ...normalized });
        setLoading(false);
        return; // ✅ Skip API call entirely
      }
    }

    if (!API) throw new Error("REACT_APP_AVM_API is missing.");
        if (!formData || Object.keys(formData).length === 0) return;
if (!valuationId && (!formData || Object.keys(formData).length === 0)) throw new Error("No form data found for this report.");
if (valuationId && incrementedRef.current) return;
        const res = await fetch(`${API}/predict_with_comparables`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: formData }) });
        const json = await res.json();
        if (!res.ok) { const msg = json?.detail || json?.message || `Request failed (${res.status})`; throw new Error(msg); }
        if (!mounted) return;
        const normalized = normalizeValuationResponse(json, formData);
        const merged = { ...json, ...normalized };
        setReportData(merged);
        if (!valuationId) localStorage.setItem(LS_REPORT_KEY, JSON.stringify(merged));
        const valuationRowId = localStorage.getItem(LS_VAL_ROW_ID);
        const est = Number(merged?.total_valuation);
        const alreadyCounted = localStorage.getItem(LS_COUNTED_ID) === String(valuationRowId);
if (alreadyCounted) { setStatsReady(true); return; }  // ← hard stop, don't even hit Supabase
if (valuationRowId && Number.isFinite(est) && !incrementedRef.current) {
  incrementedRef.current = true;  // ← set synchronously BEFORE any await
  savedRef.current = true;
           const { data: userData } = await supabase
  .from("users")
  .select("plan")
  .eq("id", (await supabase.auth.getUser()).data?.user?.id)
  .single();

const userPlan = userData?.plan || "free";
const isPro = userPlan === "pro" || userPlan === "elite";

const { error: upErr } = await supabase.from("valuations").update({
  estimated_valuation: est,
  updated_at: new Date().toISOString(),
  form_payload: formData,
  report_payload: JSON.stringify(merged),
  type: isPro ? "paid" : "free",
  payment: isPro ? "paid" : "free",
}).eq("id", valuationRowId);
            if (upErr) { console.error("Failed to update estimated valuation:", upErr); savedRef.current = false; }
if (upErr) { console.error("Failed to update estimated valuation:", upErr); savedRef.current = false; }
else {
  setLsValRowId(String(valuationRowId));
  localStorage.setItem(LS_VAL_ROW_ID, String(valuationRowId));

  const { data: sessData } = await supabase.auth.getSession();
  const userId = sessData?.session?.user?.id;
  if (userId) {
    await supabase.rpc("increment_free_reports_used", { user_id_input: userId });
    localStorage.setItem(LS_COUNTED_ID, String(valuationRowId));
    const { data: freshUser } = await supabase
      .from("users")
      .select("free_reports_used, free_reports_limit")
      .eq("id", userId)
      .single();
    setUserStats(prev => ({
      ...prev,
      used: freshUser?.free_reports_used ?? prev.used,
      limit: freshUser?.free_reports_limit ?? prev.limit,
    }));
    setStatsReady(true);
  } else {
    localStorage.setItem(LS_COUNTED_ID, String(valuationRowId));
    setStatsReady(true);
  }
}

          
        }
      } catch (e) {
        if (!mounted) return;
        setErr(e?.message || "Something went wrong");
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    run();
    return () => { mounted = false; };
}, [formData, valRow]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function getUser() { const { data } = await supabase.auth.getUser(); if (data?.user) setLoggedUser(data.user); }
    getUser();
  }, []);

  useEffect(() => {
    if (loading || !reportData) return;
    const missingSections = [];
    const trendData = reportData?.charts?.trend || reportData?.trend || reportData?.market_trend || [];
    if (trendData.length < 2) missingSections.push("market_trend");
    const forecastHist = reportData?.forecast?.historical || [];
    const forecastProj = reportData?.forecast?.forecast || [];
    if (forecastHist.length + forecastProj.length < 2) missingSections.push("6_month_forecast");
    const comps = Array.isArray(reportData?.comparables) ? reportData.comparables : [];
    if (comps.length === 0) missingSections.push("transaction_history");
    if (missingSections.length === 0) return;
    async function logMissingData() {
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess?.session?.user?.id || null;
      const district = formData?.area_name_en || formData?.district_name || "Unknown";
      await supabase.from("no_data_logs").insert({ user_id: userId, district_name: district, missing_sections: missingSections });
    }
    logMissingData();
  }, [loading, reportData]);

  // ── Payment success handler ───────────────────────────────────────────────
 const handlePaywallSuccess = useCallback(async () => {
  // Step 1: Optimistically unlock UI immediately — good UX
  setShowPaywall(false);
  setIsLocked(false);
 
  // Step 2: Get current user
  const { data: sess } = await supabase.auth.getSession();
  const user = sess?.session?.user;
  if (!user) {
    console.error("[handlePaywallSuccess] No user session — cannot update plan.");
    return;
  }
 
  console.log("[handlePaywallSuccess] Upgrading plan for user:", user.id);
 
  // ✅ FIX: Use UPDATE not UPSERT.
  //
  // WHY: Your `users` table is likely a mirror/extension of auth.users.
  // Supabase RLS policies almost always BLOCK INSERT on this table for the
  // client (only the auth system can insert). upsert() tries INSERT first —
  // it hits RLS, throws an error, you return early, and the plan NEVER updates.
  //
  // UPDATE only modifies existing rows — the row already exists because it was
  // created at signup. UPDATE is allowed by typical RLS policies.
  const { error: updateErr } = await supabase
    .from("users")
    .update({
      plan: "pro",
      free_reports_limit: 10,
      free_reports_used: 0,
      is_founding_member: true,
    })
    .eq("id", user.id);
 
  if (updateErr) {
    // ✅ FIX: Log the FULL error object so you can see what's failing
    console.error("[handlePaywallSuccess] UPDATE FAILED — full error:", JSON.stringify(updateErr, null, 2));
    // UI stays unlocked since payment succeeded — user can use the report.
    // But on next page load it will re-lock since DB wasn't updated.
    // Show a visible alert so you know this happened during testing:
    if (process.env.NODE_ENV === "development") {
      alert(`DEV: Plan update failed!\n\nCode: ${updateErr.code}\nMessage: ${updateErr.message}\nDetails: ${updateErr.details}\n\nCheck Supabase RLS policies on the users table.`);
    }
    return;
  }
 
  console.log("[handlePaywallSuccess] Plan updated to pro successfully.");
 
  // Step 3: Re-read from DB to confirm the write actually landed
  const { data: verified, error: verifyErr } = await supabase
    .from("users")
    .select("plan, free_reports_used, free_reports_limit")
    .eq("id", user.id)
    .single();
 
  if (verifyErr) {
    console.error("[handlePaywallSuccess] Verify read failed:", verifyErr);
    // Keep UI unlocked — optimistic
    return;
  }
 
  console.log("[handlePaywallSuccess] DB verified state:", verified);
 
  const verifiedPlan = verified?.plan ?? "free";
  const verifiedUsed = verified?.free_reports_used ?? 0;
  const verifiedLimit = verified?.free_reports_limit ?? 10;
 
  // ✅ FIX: Use >= consistently with checkLock
  const stillLocked = verifiedPlan !== "pro" && verifiedUsed >= verifiedLimit;
 
  if (stillLocked) {
    // This means the UPDATE returned no error but the data didn't change.
    // This happens when RLS silently swallows the update (no error, 0 rows affected).
    console.warn(
      "[handlePaywallSuccess] Plan still NOT pro after update — RLS is likely silently blocking the UPDATE.\n" +
      "Go to Supabase → Table Editor → users → RLS Policies and ensure:\n" +
      "  UPDATE is allowed for: auth.uid() = id\n" +
      "Current DB state:", verified
    );
    if (process.env.NODE_ENV === "development") {
      alert(
        `DEV: Plan update silently failed!\n\nDB still shows: plan="${verifiedPlan}"\n\n` +
        `This means Supabase RLS is silently blocking the UPDATE.\n` +
        `Fix: In Supabase → Authentication → Policies → users table,\n` +
        `add UPDATE policy: (auth.uid() = id)`
      );
    }
  }
 
  setIsLocked(stillLocked);
}, []);
  // ─────────────────────────────────────────────────────────────────────────

  const trendSeries = useMemo(() => {
    const t = reportData?.charts?.trend || reportData?.trend || reportData?.market_trend || [];
    const area = Number(reportData?.procedure_area_sqm ?? formData?.procedure_area ?? 0) || 0;
    const propertyTotal = Number(reportData?.total_valuation);
    return t.slice(-60).map((r) => {
      const marketPsm = Number(r.median_price_per_sqm);
      const marketTotal = Number.isFinite(marketPsm) ? marketPsm * area : null;
      return { month: r.month, label: monthLabel(r.month), property_total: Number.isFinite(propertyTotal) ? propertyTotal : null, market_total: Number.isFinite(marketTotal) ? marketTotal : null };
    });
  }, [reportData, formData]);

  const forecastSeries = useMemo(() => {
    const hist = (reportData?.forecast?.historical || []).slice(-12).map(r => ({ label: monthLabel(r.month), psm: r.median_price_per_sqm, is_forecast: false }));
    const proj = (reportData?.forecast?.forecast || []).map(r => ({ label: monthLabel(r.month), psm: r.median_price_per_sqm, is_forecast: true }));
    return [...hist, ...proj];
  }, [reportData]);

  const supplyDemandSeries = useMemo(() => {
    return (reportData?.supply_demand?.monthly || []).slice(-18).map(r => ({ label: monthLabel(r.month), transactions: r.transactions }));
  }, [reportData]);

 const filteredComparables = useMemo(() => {
    const list = Array.isArray(reportData?.comparables) ? reportData.comparables : [];
    const subjectProp = String(formData?.project_name_en || formData?.building_name_en || "").trim().toLowerCase();
    const subjectArea = String(formData?.area_name_en || "").trim().toLowerCase();
    return list
      .filter((c) => {
        if (subjectArea) {
          const compArea = String(c?.area_name_en || "").trim().toLowerCase();
          if (!compArea) return false;
          if (!compArea.includes(subjectArea) && !subjectArea.includes(compArea)) return false;
        }
        if (!subjectProp) return true;
        const compProp = String(c?.project_name_en || c?.building_name_en || c?.master_project_en || "").trim().toLowerCase();
        if (!compProp) return true;
        return compProp !== subjectProp;
      })
      .sort((a, b) => {
        const dateA = new Date(a?.instance_date ?? a?.sold_date ?? 0).getTime();
        const dateB = new Date(b?.instance_date ?? b?.sold_date ?? 0).getTime();
        return dateB - dateA;
      });
  }, [reportData, formData]);


  const displayUserName = useMemo(() => {
    if (!loggedUser) return "User";
    if (loggedUser.user_metadata?.full_name) return loggedUser.user_metadata.full_name;
    if (loggedUser.email) { const name = loggedUser.email.split("@")[0]; return name.charAt(0).toUpperCase() + name.slice(1); }
    return "User";
  }, [loggedUser]);

  const goBack = () => navigate("/valuation");

  const areaName = formData?.area_name_en || "—";
  const subArea = formData?.sub_area_en || formData?.community_en || "";
  const projectName = formData?.project_name_en || formData?.building_name_en || "—";
  const propertyType = formData?.property_type_en || "Property";

  const totalVal = Number(reportData?.total_valuation);
  const rateSqm = Number(reportData?.price_per_sqm);
  const rateSqft = Number(reportData?.price_per_sqft ?? aedPerSqftFromAedPerSqm(rateSqm));
  const band = 0.15;
  const rangeLow = Number.isFinite(Number(reportData?.range_low)) ? Number(reportData?.range_low) : Number.isFinite(totalVal) ? totalVal * (1 - band) : null;
  const rangeHigh = Number.isFinite(Number(reportData?.range_high)) ? Number(reportData?.range_high) : Number.isFinite(totalVal) ? totalVal * (1 + band) : null;
  const compsCount = Number(reportData?.comparables_meta?.count ?? (reportData?.comparables || []).length);

  const anchorLevelConfidence = { project: 92, master_project: 85, bundle_project: 85, area: 72, city: 55, none: 40 };
  const confidencePct = Number.isFinite(Number(reportData?.confidence_pct))
    ? Number(reportData?.confidence_pct)
    : anchorLevelConfidence[reportData?.tx?.anchor_level] ?? 70;

  const sqm = Number(reportData?.procedure_area_sqm ?? formData?.procedure_area ?? 0);
  const sqft = Number(reportData?.procedure_area_sqft ?? sqmToSqft(sqm));

  const downPaymentPct = 0.20;
  const mortgageRate = 0.045;
  const mortgageYears = 25;
  const downPayment = Number.isFinite(totalVal) ? totalVal * downPaymentPct : null;
  const loanAmount = Number.isFinite(totalVal) ? totalVal * (1 - downPaymentPct) : null;
  const monthlyRate = mortgageRate / 12;
  const numPayments = mortgageYears * 12;
  const monthlyPayment = loanAmount ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1) : null;

  const dldFee = Number.isFinite(totalVal) ? totalVal * 0.04 : null;
  const agentBuyFee = Number.isFinite(totalVal) ? totalVal * 0.02 : null;
  const trusteeFee = 4000;
  const mortgageRegFee = loanAmount ? loanAmount * 0.0025 : null;
  const totalBuyingCost = dldFee && agentBuyFee && mortgageRegFee ? dldFee + agentBuyFee + trusteeFee + mortgageRegFee : null;
  const agentSellFee = Number.isFinite(totalVal) ? totalVal * 0.02 : null;

  const anchorLevel = reportData?.tx?.anchor_level || "area";
  const anchorLevelMap = { project: 100, master_project: 85, bundle_project: 85, area: 70, city: 55, none: 40 };
  const dataQuality = anchorLevelMap[anchorLevel] || 70;

  const factorWeights = useMemo(() => {
    const level = reportData?.tx?.anchor_level || "area";
    const comps = Number(reportData?.comparables_meta?.count || 0);
    const locationW = level === "project" ? 40 : level === "master_project" ? 35 : level === "area" ? 30 : 20;
    const dataW = Math.min(25, Math.max(5, Math.round(comps * 2.5)));
    const sizeW = 20;
    const typeW = 15;
    const recencyW = Math.max(5, 100 - locationW - dataW - sizeW - typeW);
    return [
      { name: "Location & Area", value: locationW, color: "#B87333" },
      { name: "Property Size", value: sizeW, color: "#2563EB" },
      { name: "Property Type", value: typeW, color: "#10b981" },
      { name: "Comparable Sales", value: dataW, color: "#f59e0b" },
      { name: "Recency of Data", value: recencyW, color: "#8b5cf6" },
    ];
  }, [reportData]);

  const CSS = `
    :root{ --acq-text:#2B2B2B; --acq-accent:#B87333; --acq-border:#E5E5E5; }
    body{ margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto',sans-serif; }
    .reportPage{ width:100%; overflow-x:hidden; background:#F5F5F3; color:var(--acq-text); }
    .acqHdrLite{ position:fixed; top:0; left:0; right:0; z-index:60; background:#fff; border-bottom:1px solid var(--acq-border); }
    .acqHdrLiteInner{ max-width:80rem; margin:0 auto; height:64px; display:flex; align-items:center; padding:0 20px; }
    .acqHdrLogo h1{ margin:0; font-size:20px; font-weight:900; letter-spacing:-0.04em; text-transform:uppercase; cursor:pointer; }
    .acqHdrLiteSpacer{ height:64px; }
    .vcMain{ max-width:1200px; margin:0 auto; padding:40px 20px 80px; }
    .vcHeader{ margin-bottom:0; padding-bottom:24px; border-bottom:1px solid var(--acq-border); }
    .vcTitle{ margin:0 0 8px; font-size:32px; line-height:1.2; font-weight:700; letter-spacing:-0.02em; color:#2B2B2B; }
    .vcMeta{ display:flex; flex-wrap:wrap; gap:8px; color:rgba(43,43,43,.5); font-weight:400; font-size:13px; align-items:center; margin-bottom:12px; }
    .vcDot{ width:3px; height:3px; border-radius:50%; background:rgba(43,43,43,.3); display:inline-block; }
    .vcHeaderRow{ display:flex; gap:24px; flex-wrap:wrap; margin-top:12px; }
    .vcMini span:first-child{ font-size:10px; font-weight:600; letter-spacing:.05em; text-transform:uppercase; color:rgba(43,43,43,.4); display:block; }
    .vcMini span:last-child{ font-size:11px; font-weight:600; font-family:ui-monospace,monospace; color:#2B2B2B; }
    .vcSectionGrid{ display:grid; grid-template-columns:1fr 1fr; gap:32px; margin-top:32px; padding-top:32px; border-top:1px solid #F0F0F0; }
    .vcSmallTitle{ font-size:10px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:rgba(43,43,43,.4); margin:0 0 16px; }
    .vcValueBig{ font-size:48px; font-weight:700; letter-spacing:-0.02em; margin:0; color:#2B2B2B; }
    .vcValueSub{ font-size:13px; color:rgba(43,43,43,.5); font-weight:400; margin-top:6px; }
    .vcBar{ height:8px; background:#F5F5F5; border-radius:4px; overflow:hidden; display:flex; margin-top:20px; }
    .vcBar>div{ height:100%; }
    .vcBarLow{ width:25%; background:#E5E5E5; }
    .vcBarMid{ width:50%; background:#B87333; }
    .vcBarHigh{ width:25%; background:#E5E5E5; }
    .vcRange{ display:grid; grid-template-columns:1fr 1fr 1fr; margin-top:12px; font-size:11px; font-weight:600; }
    .vcRange div{ font-family:ui-monospace,monospace; }
    .vcRange small{ display:block; font-size:9px; color:rgba(43,43,43,.4); font-weight:600; letter-spacing:.08em; margin-bottom:4px; text-transform:uppercase; }
    .vcRangeMid{ text-align:center; }
    .vcRangeRight{ text-align:right; }
    .vcTip{ margin-top:20px; padding:12px 14px; background:#FAFAF8; border:1px solid #F0F0F0; display:flex; gap:10px; align-items:flex-start; border-radius:6px; }
    .vcTip p{ margin:0; font-size:12px; color:rgba(43,43,43,.6); line-height:1.5; }
    .vcChartCard{ height:260px; width:100%; background:#FAFAFA; border-radius:6px; padding:12px; }
    .vcCardsHead{ display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
    .vcCardsSubtitle{ font-size:10px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:rgba(43,43,43,.4); margin:0 0 4px; }
    .vcCardsMainTitle{ font-size:18px; font-weight:700; margin:0; color:#2B2B2B; }
    .vcUnlockBtn{ border:none; background:transparent; color:#B87333; font-weight:700; font-size:11px; letter-spacing:.05em; text-transform:uppercase; border-bottom:1.5px solid #B87333; padding:0 0 4px; cursor:pointer; }
    .vcCards{ display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
    .vcCard{ border:1px solid #E8E8E8; padding:16px; border-radius:8px; background:#FFFFFF; transition:all .2s; }
    .vcCard:hover{ border-color:#B87333; box-shadow:0 2px 8px rgba(0,0,0,.04); }
    .vcTagRow{ display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; }
    .vcTag{ font-size:9px; font-weight:700; color:#2563EB; background:#EFF6FF; border:1px solid #DBEAFE; padding:3px 8px; border-radius:4px; text-transform:uppercase; letter-spacing:.08em; }
    .vcWhen{ font-size:10px; color:rgba(43,43,43,.4); font-weight:600; font-family:ui-monospace,monospace; }
    .vcCardTitle{ font-size:15px; font-weight:700; margin:0 0 4px; color:#2B2B2B; }
    .vcCardSub{ font-size:11px; color:rgba(43,43,43,.5); margin:0 0 16px; }
    .vcCardBottom{ display:flex; justify-content:space-between; align-items:flex-end; gap:12px; border-top:1px solid #F5F5F5; padding-top:12px; }
    .vcSoldLabel{ font-size:9px; color:rgba(43,43,43,.4); font-weight:600; letter-spacing:.08em; text-transform:uppercase; margin:0 0 4px; }
    .vcSoldPrice{ font-size:18px; font-weight:700; font-family:ui-monospace,monospace; margin:0; color:#2B2B2B; }
    .vcSize{ font-size:11px; color:rgba(43,43,43,.45); font-weight:600; font-family:ui-monospace,monospace; text-align:right; }
    .vcFeedback{ margin-top:48px; background:#FAFAF8; border:1px solid #F0F0F0; border-radius:18px; padding:24px 26px; box-shadow:0 10px 24px rgba(0,0,0,.04); }
    .vcFbTopRow{ display:flex; align-items:center; justify-content:space-between; gap:28px; }
    .vcFbLeft{ flex:1; min-width:320px; }
    .vcRewardBadge{ font-size:10px; font-weight:900; color:#B87333; background:#FEF3E7; border:1px solid #F0D9C0; padding:6px 12px; border-radius:999px; text-transform:uppercase; letter-spacing:.14em; display:inline-flex; align-items:center; gap:8px; }
    .vcFeedbackTitle{ font-size:30px; font-weight:900; font-style:italic; letter-spacing:-.02em; text-transform:uppercase; margin:10px 0 8px; color:#2B2B2B; }
    .vcFeedbackText{ font-size:13px; color:rgba(43,43,43,.55); line-height:1.6; margin:0; max-width:520px; }
    .vcFeedbackText a{ color:#B87333; font-weight:800; text-decoration:none; border-bottom:1.5px solid rgba(184,115,51,.55); }
    .vcFbRight{ display:flex; align-items:center; justify-content:flex-end; gap:14px; flex:0 0 auto; }
    .vcFbChoice{ width:128px; height:76px; border:1px solid #D9D9D9; background:#FFFFFF; border-radius:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; cursor:pointer; transition:all .18s ease; color:rgba(43,43,43,.45); font-weight:900; letter-spacing:.16em; text-transform:uppercase; font-size:10px; box-shadow:0 6px 14px rgba(0,0,0,.04); }
    .vcFbChoice:hover{ border-color:#B87333; color:#B87333; }
    .vcFbChoice:disabled{ opacity:.55; cursor:not-allowed; }
    .vcFbFormTitle{ margin:0 0 14px; font-size:26px; font-weight:700; color:#2B2B2B; }
    .vcFbTextarea{ width:640px; max-width:100%; height:120px; border:1px solid #E6E6E6; border-radius:10px; padding:14px 16px; font-size:12px; line-height:1.6; background:#FFFFFF; color:#2B2B2B; outline:none; resize:none; }
    .vcFbActions{ margin-top:16px; display:flex; align-items:center; gap:22px; flex-wrap:wrap; }
    .vcFbSubmit{ min-width:380px; height:54px; padding:0 22px; border-radius:12px; border:none; background:#2B2B2B; color:#FFFFFF; cursor:pointer; font-size:11px; font-weight:900; letter-spacing:.16em; text-transform:uppercase; display:flex; align-items:center; justify-content:center; gap:12px; box-shadow:0 14px 26px rgba(0,0,0,.18); }
    .vcFbSubmit:hover{ background:#1F1F1F; }
    .vcFbSubmit:disabled{ opacity:.6; cursor:not-allowed; }
    .vcFbBack{ border:none; background:transparent; padding:0; height:54px; display:flex; align-items:center; font-size:11px; font-weight:900; letter-spacing:.14em; text-transform:uppercase; color:rgba(43,43,43,.35); cursor:pointer; }
    .vcRewardScreen{ padding:46px 22px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:14px; }
    .vcRewardCheck{ width:56px; height:56px; border-radius:999px; display:flex; align-items:center; justify-content:center; background:rgba(34,197,94,.10); border:1px solid rgba(34,197,94,.18); }
    .vcRewardTitle{ margin:10px 0 2px; font-size:34px; font-weight:900; font-style:italic; color:#2B2B2B; letter-spacing:-.02em; }
    .vcRewardSub{ margin:0 0 10px; font-size:12px; color:rgba(43,43,43,.42); line-height:1.6; max-width:560px; }
    .vcBottomSection{ margin-top:48px; }
    .vcShareSection{ background:#FAFAFA; border:1px solid #E8E8E8; border-radius:8px; padding:20px; margin-bottom:24px; }
    .vcShareLabel{ font-size:10px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:rgba(43,43,43,.4); margin:0 0 12px; }
    .vcShareRow{ display:flex; gap:12px; }
    .vcShareInput{ flex:1; padding:10px 14px; border:1px solid #E5E5E5; border-radius:6px; font-size:12px; font-family:ui-monospace,monospace; background:#FFFFFF; color:rgba(43,43,43,.7); }
    .vcCopyBtn{ padding:10px 20px; background:#B87333; color:#FFFFFF; border:none; border-radius:6px; font-size:11px; font-weight:700; text-transform:uppercase; cursor:pointer; }
    .vcFooterInfo{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:24px; }
    .vcInfoTitle{ font-size:10px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:rgba(43,43,43,.4); margin:0 0 8px; }
    .vcInfoContent{ font-size:12px; color:rgba(43,43,43,.7); line-height:1.6; margin:0; }
    .vcInfoList{ list-style:none; padding:0; margin:0; }
    .vcInfoList li{ font-size:12px; color:rgba(43,43,43,.7); margin-bottom:4px; padding-left:12px; position:relative; }
    .vcInfoList li:before{ content:'•'; position:absolute; left:0; color:rgba(43,43,43,.3); }
    .vcActions{ margin-top:32px; padding-top:24px; border-top:1px solid #E8E8E8; display:flex; justify-content:space-between; gap:14px; flex-wrap:wrap; align-items:center; }
    .vcBtn{ padding:12px 20px; font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; border-radius:6px; cursor:pointer; transition:all .2s; }
    .vcBtnPrimary{ background:#2B2B2B; color:#fff; border:1px solid #2B2B2B; }
    .vcBtnPrimary:hover{ background:#000; }
    .vcBtnGhost{ background:#fff; color:#2B2B2B; border:1px solid #E5E5E5; }
    .vcBtnGhost:hover{ background:#FAFAFA; border-color:#2B2B2B; }
    .statCard{ background:#fff; border:1px solid #E8E8E8; border-radius:10px; padding:18px 20px; }
    .statLabel{ font-size:9px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:rgba(43,43,43,.4); margin:0 0 6px; }
    .statValue{ font-size:22px; font-weight:700; color:#2B2B2B; margin:0; }
    .statSub{ font-size:11px; color:rgba(43,43,43,.5); margin:4px 0 0; }
    .featureGrid{ display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
    .featureItem{ background:#FAFAFA; border:1px solid #F0F0F0; border-radius:8px; padding:14px 16px; }
    .featureIcon{ font-size:20px; margin-bottom:8px; }
    .featureLabel{ font-size:9px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:rgba(43,43,43,.4); margin:0 0 4px; }
    .featureValue{ font-size:14px; font-weight:700; color:#2B2B2B; margin:0; }
    .txTable{ width:100%; border-collapse:collapse; }
    .txTable th{ font-size:9px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:rgba(43,43,43,.4); padding:0 12px 10px; text-align:left; border-bottom:1px solid #F0F0F0; }
    .txTable td{ font-size:12px; padding:12px; border-bottom:1px solid #F5F5F5; color:#2B2B2B; vertical-align:middle; }
    .txTable tr:last-child td{ border-bottom:none; }
    .txTable tr:hover td{ background:#FAFAF8; }
    .factorRow{ display:flex; align-items:center; gap:12px; margin-bottom:14px; }
    .factorName{ font-size:12px; font-weight:600; color:#2B2B2B; width:160px; flex-shrink:0; }
    .factorBarWrap{ flex:1; height:8px; background:#F0F0F0; border-radius:4px; overflow:hidden; }
    .factorBarFill{ height:100%; border-radius:4px; }
    .factorPct{ font-size:11px; font-weight:700; color:rgba(43,43,43,.55); width:36px; text-align:right; flex-shrink:0; }
    @media(max-width:1024px){ .vcSectionGrid{ grid-template-columns:1fr; } .vcCards{ grid-template-columns:1fr 1fr; } .featureGrid{ grid-template-columns:repeat(2,1fr); } .vcFooterInfo{ grid-template-columns:1fr; } }
    @media(max-width:640px){
      .vcValueBig{ font-size:30px; } .vcCards{ grid-template-columns:1fr; } .featureGrid{ grid-template-columns:1fr 1fr; } .vcTitle{ font-size:20px; }
      .vcFbSubmit{ width:100%; min-width:0; } .vcFbLeft{ min-width:0; } .vcFbTopRow{ flex-direction:column; } .vcFbRight{ width:100%; } .vcFbChoice{ flex:1; }
      .vcMain{ padding:16px 12px 60px; } .vcSectionGrid{ grid-template-columns:1fr !important; gap:20px; } .vcChartCard{ height:200px; padding:8px; }
      .vcRange{ font-size:9px; } .vcFooterInfo{ grid-template-columns:1fr !important; } .vcShareRow{ flex-direction:column; }
      .vcShareInput{ width:100%; box-sizing:border-box; } .vcCopyBtn{ width:100%; padding:12px; } .vcActions{ flex-direction:column; } .vcBtn{ width:100%; text-align:center; box-sizing:border-box; }
      .vcFbTextarea{ width:100%; box-sizing:border-box; } .txTable th,.txTable td{ font-size:10px; padding:8px 5px; }
      .vcFeedback{ padding:16px; } .vcRewardTitle{ font-size:24px; } .vcFeedbackTitle{ font-size:22px; } .statCard{ min-width:0 !important; }
    }
    @media(max-width:768px){
      .vcMain{ padding:20px 12px 60px; } .vcTitle{ font-size:22px; } .vcValueBig{ font-size:28px; } .vcSectionGrid{ grid-template-columns:1fr; gap:20px; } .vcCards{ grid-template-columns:1fr; }
      .featureGrid{ grid-template-columns:1fr 1fr; } .vcFooterInfo{ grid-template-columns:1fr; gap:16px; } .vcFbTopRow{ flex-direction:column; gap:16px; } .vcFbLeft{ min-width:0; }
      .vcFbRight{ width:100%; justify-content:space-between; } .vcFbChoice{ flex:1; height:60px; } .vcFbSubmit{ min-width:0; width:100%; } .vcFbTextarea{ width:100%; box-sizing:border-box; }
      .vcShareRow{ flex-direction:column; } .vcShareInput{ width:100%; box-sizing:border-box; } .vcCopyBtn{ width:100%; } .vcActions{ flex-direction:column; } .vcBtn{ width:100%; text-align:center; }
      .statCard{ min-width:0 !important; }
    }
    @media(max-width:480px){
      .vcTitle{ font-size:17px; } .vcValueBig{ font-size:24px; } .featureGrid{ grid-template-columns:1fr; } .vcCards{ grid-template-columns:1fr; } .vcMeta{ font-size:11px; }
      .vcFbChoice{ height:58px; font-size:9px; } .factorName{ width:110px; font-size:11px; } .vcRewardSub{ font-size:11px; }
    }
    .vcSectionGrid{ display:grid; grid-template-columns:1fr 1fr; gap:32px; margin-top:32px; padding-top:32px; border-top:1px solid #F0F0F0; }
  `;


 function LockedSection({ children, title, label }) {
  const isFree = userStats.plan !== "pro" && userStats.plan !== "elite";
  const hasExceededLimit = userStats.used > userStats.limit;
  // Only lock if free AND exceeded report limit
  if (!isFree || !hasExceededLimit) return children;
  return (
    <div style={{ marginTop: 48, background: "#fff", border: "1px solid #E8E8E8", borderRadius: 12, overflow: "hidden" }}>
      
      {/* ── Heading always visible ── */}
      <div style={{ padding: "24px 28px 16px 28px", borderBottom: "1px solid #F0F0F0" }}>
        {label && (
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(43,43,43,.4)", marginBottom: 4 }}>
            {label}
          </div>
        )}
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#2B2B2B" }}>{title}</h3>
      </div>

      {/* ── Content locked ── */}
      <div style={{ position: "relative" }}>
        <div style={{ filter: "blur(6px)", pointerEvents: "none", userSelect: "none", padding: "24px 28px", minHeight: 120 }}>
          {children}
        </div>
        <div
          onClick={() => setShowSectionLock(true)}
          style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.5)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", gap: 8 }}
        >
          <span style={{ fontSize: 28 }}>🔒</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#2B2B2B", textTransform: "uppercase", letterSpacing: "0.1em" }}>Pro Feature</span>
          <span style={{ fontSize: 11, color: "rgba(43,43,43,0.5)", fontWeight: 600 }}>Click to unlock</span>
        </div>
      </div>

    </div>
  );
}
  return (
    <div className="reportPage">
      <style>{CSS}</style>
      <HeaderLite />

      {copied && (
        <div style={{ position: "fixed", top: 76, right: 18, zIndex: 9999, background: "#2B2B2B", color: "#fff", padding: "10px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, letterSpacing: ".04em", boxShadow: "0 10px 30px rgba(0,0,0,.18)" }} role="status" aria-live="polite">
          ✅ Copied
        </div>
      )}

      <main className="vcMain">

        {/* ── HEADER ── */}
        
          

         

 <section className="vcHeader">
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>

    {/* LEFT: title + meta + date + badge */}
    <div style={{ flex: 1, minWidth: 0 }}>
      <h1 className="vcTitle">{projectName}</h1>
      <div className="vcMeta">
        <span>{displayBedroomsFromForm(formData)}</span>
        <span className="vcDot" />
        <span>{displayBathroomsFromForm(formData)}</span>
        <span className="vcDot" />
        <span>{Number.isFinite(sqft) ? `${fmtNum(sqft, 0)} SQFT` : "—"}</span>
        <span className="vcDot" />
        <span>📍 {areaName}{subArea ? `, ${subArea}` : ""}</span>
      </div>
      <div className="vcHeaderRow">
        <div className="vcMini">
          <span>Generated On</span>
          <span>{fmtDate(valRow?.created_at || reportData?.created_at || new Date().toISOString())}</span>
        </div>
      </div>
      {/* {!valuationId && statsReady && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", background: "#F5F5F5", border: "1px solid #E8E8E8", borderRadius: 999, fontSize: 10, fontWeight: 800, color: "rgba(43,43,43,0.6)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {userStats.plan === "pro" || userStats.plan === "elite"
              ? `PRO PLAN · ${userStats.used} / ${userStats.limit} Reports Used`
              : `FREE PLAN · ${userStats.used} / ${userStats.limit} Reports Used`}
          </div>
        </div>
      )} */}

      {!valuationId && (
  <div style={{ marginTop: 10 }}>
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", background: "#F5F5F5", border: "1px solid #E8E8E8", borderRadius: 999, fontSize: 10, fontWeight: 800, color: "rgba(43,43,43,0.6)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
      {userStats.plan === "pro" || userStats.plan === "elite"
        ? `PRO PLAN · ${userStats.used} / ${userStats.limit} Reports Used`
        : `FREE PLAN · ${userStats.used} / ${userStats.limit} Reports Used`}
    </div>
  </div>
)}
    </div>

    {/* RIGHT: founding box only */}
    {!valuationId && (userStats.plan !== "pro" && userStats.plan !== "elite") && (
  <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, width: 360 }}>
    <div style={{ padding: "12px 16px", background: "rgba(184,115,51,0.06)", border: "1px solid rgba(184,115,51,0.2)", borderRadius: 10, width: "100%" }}>
      <p style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 400, color: "#2B2B2B", lineHeight: 1.7, fontFamily: "'Inter', sans-serif" }}>
 <strong style={{ fontWeight: 700, color: "#1a1a1a", display: "block", marginBottom: 6, fontSize: 17 }}>
  Founding Member Pricing Closes Soon.
</strong>
  AED 29 won't last — join 225 founding members locking in before it hits AED 149/mo.
</p>
      <button
        onClick={() => { trackEvent("cta_click", { location: "report_upgrade_banner", page: "report" }); navigate("/pricing"); }}
       style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "12px 24px", background: "#B87333", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "'Inter', sans-serif", boxShadow: "0 8px 24px rgba(184,115,51,0.30)", transition: "all 0.2s" }}
      >
        CLAIM YOUR SPOT →
      </button>
    </div>
  </div>
)}

  </div>
</section>
        

        {loading ? (
          <div style={{ marginTop: 32, background: "#fff", border: "1px solid #E8E8E8", padding: 24, borderRadius: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Loading report…</div>
            <div style={{ color: "rgba(43,43,43,.55)" }}>Generating prediction and fetching comparables</div>
          </div>
        ) : err ? (
          <div style={{ marginTop: 32, background: "#fff", border: "1px solid #E8E8E8", padding: 24, borderRadius: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Error</div>
            <div style={{ color: "rgba(43,43,43,.7)" }}>{err}</div>
          </div>
        ) : (
          <>
            
  {/* ── 1. VALUATION RANGE ── */}
<div style={{ position: "relative", marginTop: 32 }}>
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, paddingTop: 32, borderTop: "1px solid #F0F0F0" }}>
    <div><h2 className="vcSmallTitle">Estimated Market Value</h2></div>
    <div><h2 className="vcSmallTitle">Prices & Trends — {areaName}</h2></div>
  </div>
  <div style={{
  filter: (userStats.plan !== "pro" && userStats.plan !== "elite") && (userStats.used > userStats.limit) ? "blur(6px)" : "none",
  pointerEvents: (userStats.plan !== "pro" && userStats.plan !== "elite") && (userStats.used > userStats.limit) ? "none" : "auto",
  userSelect: (userStats.plan !== "pro" && userStats.plan !== "elite") && (userStats.used > userStats.limit) ? "none" : "auto",
}}>
    <section className="vcSectionGrid" style={{ marginTop: 12, paddingTop: 0 }}>
      <div>
        <p className="vcValueBig">{fmtAED(reportData?.total_valuation)}</p>
        <div className="vcValueSub">± {fmtPct(confidencePct, 0)} Confidence · {reportData?.tx?.anchor_level || "area"} level</div>
        <div className="vcBar"><div className="vcBarLow" /><div className="vcBarMid" /><div className="vcBarHigh" /></div>
        <div className="vcRange">
          <div><small>Low</small>{Number.isFinite(rangeLow) ? fmtAED(rangeLow) : "—"}</div>
          <div className="vcRangeMid"><small>Most Likely</small>{Number.isFinite(totalVal) ? fmtAED(totalVal) : "—"}</div>
          <div className="vcRangeRight"><small>High</small>{Number.isFinite(rangeHigh) ? fmtAED(rangeHigh) : "—"}</div>
        </div>
        <div className="vcTip">
          <p>Accuracy based on historical transaction density in {areaName}. For institutional-grade accuracy, upgrade to <strong>ACQAR PRO</strong>.</p>
        </div>
      </div>
      <div>
        <div className="vcChartCard">
          {trendSeries.length >= 2 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="label" interval={5} tick={{ fontSize: 10, fill: "#999" }} />
                <YAxis tickFormatter={(v) => fmtNum(v / 1000000, 1) + "M"} tick={{ fontSize: 10, fill: "#999" }} />
                <Tooltip formatter={(v) => fmtAED(v)} contentStyle={{ fontSize: 11, border: "1px solid #E8E8E8", borderRadius: 6 }} />
                <Area type="monotone" dataKey="market_total" fill="#B87333" fillOpacity={0.1} stroke="none" />
                <Line type="monotone" dataKey="market_total" dot={false} stroke="#B87333" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(43,43,43,.4)", fontSize: 13, fontWeight: 700 }}>No trend data available</div>
          )}
        </div>
        <div style={{ marginTop: 10, color: "rgba(43,43,43,.55)", fontSize: 12, lineHeight: 1.6 }}>
          <strong style={{ color: "#2B2B2B" }}>Rate:</strong> {Number.isFinite(rateSqm) ? `AED ${fmtNum(rateSqm, 0)}/sqm` : "—"} {Number.isFinite(rateSqft) ? `· AED ${fmtNum(rateSqft, 0)}/sqft` : ""}
        </div>
      </div>
    </section>
  </div>
  {(userStats.plan !== "pro" && userStats.plan !== "elite") && (userStats.used > userStats.limit) && (
    <div onClick={() => setShowSectionLock(true)} style={{ position: "absolute", inset: 0, top: 48, backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", background: "rgba(255,255,255,0.5)", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", gap: 8 }}>
      <span style={{ fontSize: 28 }}>🔒</span>
      <span style={{ fontSize: 12, fontWeight: 800, color: "#2B2B2B", textTransform: "uppercase", letterSpacing: "0.1em" }}>Pro Feature</span>
      <span style={{ fontSize: 11, color: "rgba(43,43,43,0.5)", fontWeight: 600 }}>Click to unlock</span>
    </div>
  )}
</div>

                {/* ── 2. 6-MONTH FORECAST ── */}
                <LockedSection title="6-Month Price Forecast" label="AI Projection">
                <SectionBox>
                  <SectionHeader label="AI Projection" title="6-Month Price Forecast" />
                  <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
                    {reportData?.forecast?.growth_pct != null && (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: reportData.forecast.growth_pct >= 0 ? "#F0FDF4" : "#FEF2F2", border: `1px solid ${reportData.forecast.growth_pct >= 0 ? "#86EFAC" : "#FCA5A5"}`, borderRadius: 6, padding: "5px 12px" }}>
                        <span style={{ fontSize: 14 }}>{reportData.forecast.growth_pct >= 0 ? "📈" : "📉"}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: reportData.forecast.growth_pct >= 0 ? "#15803D" : "#DC2626", letterSpacing: ".05em", textTransform: "uppercase" }}>
                          {reportData.forecast.growth_pct >= 0 ? "+" : ""}{reportData.forecast.growth_pct?.toFixed(1)}% projected over 6 months
                        </span>
                      </div>
                    )}
                    <span style={{ fontSize: 11, color: "rgba(43,43,43,.4)", fontWeight: 600 }}>Based on historical trend in {areaName}</span>
                  </div>
                  <div style={{ height: 240 }}>
                    {forecastSeries.length >= 2 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={forecastSeries}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#999" }} />
                          <YAxis tickFormatter={(v) => `${fmtNum(v, 0)}`} tick={{ fontSize: 10, fill: "#999" }} />
                          <Tooltip formatter={(v) => [`AED ${fmtNum(v, 0)}/sqm`, "Median PSM"]} contentStyle={{ fontSize: 11, border: "1px solid #E8E8E8", borderRadius: 6 }} />
                          <Line type="monotone" dataKey="psm" dot={(props) => {
                            const { cx, cy, payload } = props;
                            return payload.is_forecast
                              ? <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill="#B87333" stroke="#fff" strokeWidth={2} strokeDasharray="4 2" />
                              : <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={3} fill="#2563EB" />;
                          }} stroke="#B87333" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(43,43,43,.4)", fontSize: 13, fontWeight: 700 }}>Insufficient data for forecast</div>
                    )}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 11, color: "rgba(43,43,43,.4)", fontStyle: "italic" }}>
                    Dashed line = projected values · Solid line = historical data. Projections are indicative only.
                  </div>
                </SectionBox>
</LockedSection>

                {/* ── 3-YEAR FORECAST ── */}
                {Number.isFinite(totalVal) && totalVal > 0 ? (
  <LockedSection title="3-Year Price Forecast" label="AI Projection">
    <PricePredictionChart currentValue={totalVal} />
  </LockedSection>
) : null}

                {/* ── 3. PROPERTY FEATURES ── */}
                <LockedSection title="Property Features" label="Property Details">
                <SectionBox>
                  <SectionHeader label="Property Details" title="Property Features" />
                  <div className="featureGrid">
                    {[
                      { icon: "🏢", label: "Property Type", value: formData?.property_type_en || "—" },
                      { icon: "🛏", label: "Bedrooms", value: displayBedroomsFromForm(formData) },
                      { icon: "🚿", label: "Bathrooms", value: displayBathroomsFromForm(formData) },
                      { icon: "📐", label: "Area (sqft)", value: Number.isFinite(sqft) ? `${fmtNum(sqft, 0)} sqft` : "—" },
                      { icon: "📏", label: "Area (sqm)", value: Number.isFinite(sqm) ? `${fmtNum(sqm, 2)} sqm` : "—" },
                      { icon: "📍", label: "District", value: areaName },
                      { icon: "🏗", label: "Project", value: projectName },
                      { icon: "🔑", label: "Ownership", value: "Freehold" },
                      { icon: "💰", label: "Rate / sqft", value: Number.isFinite(rateSqft) ? `AED ${fmtNum(rateSqft, 0)}` : "—" },
                    ].map((f) => (
                      <div className="featureItem" key={f.label}>
                        <div className="featureIcon">{f.icon}</div>
                        <div className="featureLabel">{f.label}</div>
                        <div className="featureValue">{f.value}</div>
                      </div>
                    ))}
                    {(() => {
                      const amenities =
                        (Array.isArray(valRow?.features) && valRow.features.length > 0) ? valRow.features
                        : (Array.isArray(formData?.amenities) && formData.amenities.length > 0) ? formData.amenities
                        : (Array.isArray(formData?.features) && formData.features.length > 0) ? formData.features
                        : [];
                      if (amenities.length === 0) return null;
                      return (
                        <div className="featureItem" key="amenities" style={{ gridColumn: "1 / -1" }}>
                          <div className="featureIcon">🏠</div>
                          <div className="featureLabel">Amenities</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                            {amenities.map((a) => (
                              <span key={a} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "#fff8f3", border: "1px solid #fcd9b6", borderRadius: 999, fontSize: 11, fontWeight: 700, color: "#B87333" }}>{a}</span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </SectionBox>
</LockedSection>


                {/* ── 4. SUPPLY & DEMAND ── */}
                <LockedSection title="Supply & Demand" label="Market Activity">
                <SectionBox>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
                    <SectionHeader label="Market Activity" title="Supply & Demand" />
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {[
                        { label: "Total Sales (Dubai)", value: fmtNum(reportData?.supply_demand?.total_sales, 0) },
                        { label: "Avg / Month", value: fmtNum(reportData?.supply_demand?.avg_monthly, 1) },
                      ].map(s => (
                        <div className="statCard" key={s.label} style={{ minWidth: 120 }}>
                          <div className="statLabel">{s.label}</div>
                          <div className="statValue">{s.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ height: 220 }}>
                    {supplyDemandSeries.length >= 2 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={supplyDemandSeries} barSize={14}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#999" }} interval={2} />
                          <YAxis tick={{ fontSize: 10, fill: "#999" }} />
                          <Tooltip contentStyle={{ fontSize: 11, border: "1px solid #E8E8E8", borderRadius: 6 }} formatter={(v) => [v, "Transactions"]} />
                          <Bar dataKey="transactions" fill="#B87333" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(43,43,43,.4)", fontSize: 13, fontWeight: 700 }}>No supply/demand data available</div>
                    )}
                  </div>
                </SectionBox>
</LockedSection>


                {/* ── 5. TRANSACTION HISTORY ── */}
                {filteredComparables.length > 0 && (
                <LockedSection title="Transaction History" label="Recent Sales">
                <SectionBox>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <SectionHeader label="Recent Sales" title="Transaction History" />
                    {filteredComparables.length > 8 && (
                      <button
                        className="vcUnlockBtn"
                        type="button"
                        onClick={(e) => {
                          setShowAllComparables((v) => !v);
                          e.currentTarget.blur();
                        }}
                      >
                        {showAllComparables ? "Show Less" : "View All"}
                      </button>
                    )}
                  </div>
                  {filteredComparables.length > 0 ? (
                    <div style={{ overflowX: "auto" }}>
                      <table className="txTable">
                        <thead>
                          <tr>
                            <th>Project</th><th>Area</th><th>Bedrooms</th><th>Size</th>
                            <th>Sold For</th><th>Price / sqft</th><th>Date</th><th>Match</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(showAllComparables ? filteredComparables : filteredComparables.slice(0, 8)).map((c, idx) => {
                            const soldDate = fmtDate(c?.instance_date ?? c?.sold_date);
                            const price = Number(c?.actual_worth ?? c?.price_aed ?? c?.transaction_value);
                            const sizeSqft = Number(c?.size_sqft ?? (c?.procedure_area ? c.procedure_area * 10.764 : null));
                            const psf = Number(c?.price_per_sqft);
                            const match = Number(c?.match_pct);
                            return (
                              <tr key={idx}>
                                <td style={{ fontWeight: 600 }}>{c?.project_name_en || c?.building_name_en || "—"}</td>
                                <td style={{ color: "rgba(43,43,43,.6)" }}>{c?.area_name_en || "—"}</td>
                                <td>{c?.rooms_en || "—"}</td>
                                <td style={{ fontFamily: "ui-monospace,monospace" }}>{Number.isFinite(sizeSqft) ? `${fmtNum(sizeSqft, 0)} sqft` : "—"}</td>
                                <td style={{ fontWeight: 700, fontFamily: "ui-monospace,monospace" }}>{Number.isFinite(price) ? fmtAED(price) : "—"}</td>
                                <td style={{ fontFamily: "ui-monospace,monospace" }}>{Number.isFinite(psf) ? `AED ${fmtNum(psf, 0)}` : "—"}</td>
                                <td style={{ color: "rgba(43,43,43,.5)", fontSize: 11 }}>{soldDate}</td>
                                <td>
                                  <span style={{ background: "#EFF6FF", color: "#2563EB", border: "1px solid #DBEAFE", borderRadius: 4, padding: "2px 7px", fontSize: 9, fontWeight: 700, letterSpacing: ".06em" }}>
                                    {Number.isFinite(match) ? `${Math.round(match)}%` : "—"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: 20, background: "#FAFAFA", borderRadius: 8, color: "rgba(43,43,43,.5)", fontSize: 13, fontWeight: 600, textAlign: "center" }}>
                      No comparable transactions found for this area.
                    </div>
                 )}
                </SectionBox>
</LockedSection>
                )}


                {/* ── 6. ADDITIONAL COSTS ── */}
                <LockedSection title="Additional Cost to Buy or Sell" label="Transaction Costs">
                <SectionBox>
                  <SectionHeader label="Transaction Costs" title="Additional Cost to Buy or Sell" />
                  <UAECostCalculator initialPrice={totalVal} />
                </SectionBox>
</LockedSection>

                {/* ── 7. KEY FACTORS ── */}
                <LockedSection title="Key Factors in Your Evaluation" label="Valuation Model">
                <SectionBox>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 32 }}>
                    <div>
                      <SectionHeader label="Valuation Model" title="Key Factors in Your Evaluation" />
                      {factorWeights.map((f) => (
                        <div className="factorRow" key={f.name}>
                          <div className="factorName">{f.name}</div>
                          <div className="factorBarWrap">
                            <div className="factorBarFill" style={{ width: `${f.value * 4}%`, background: f.color }} />
                          </div>
                          <div className="factorPct">{f.value}%</div>
                        </div>
                      ))}
                      <div style={{ marginTop: 16, padding: "14px 18px", background: "#FAFAFA", border: "1px solid #F0F0F0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                        <div style={{ fontSize: 11, color: "rgba(43,43,43,.55)", lineHeight: 1.6 }}>
                          Anchor level: <strong style={{ color: "#2B2B2B" }}>{reportData?.tx?.anchor_level || "area"}</strong>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(43,43,43,.4)", marginBottom: 2 }}>Data Quality Score</div>
                          <div style={{ fontSize: 32, fontWeight: 900, color: dataQuality >= 80 ? "#15803D" : dataQuality >= 60 ? "#B87333" : "#DC2626", letterSpacing: "-0.02em", lineHeight: 1 }}>{dataQuality}%</div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <SectionHeader label="Confidence" title="Data Quality Breakdown" />
                      <div style={{ height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={factorWeights} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label={({ name, value }) => `${value}%`} labelLine={false} fontSize={13}>
                              {factorWeights.map((f, i) => <Cell key={f.name} fill={f.color} />)}
                            </Pie>
                            <Tooltip formatter={(v, n) => [`${v}%`, n]} contentStyle={{ fontSize: 11, border: "1px solid #E8E8E8", borderRadius: 6 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                        {factorWeights.map(f => (
                          <div key={f.name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "rgba(43,43,43,.75)" }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: f.color, flexShrink: 0 }} />
                            {f.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </SectionBox>

</LockedSection>
              

            {/* ── FEEDBACK (always accessible, outside lock) ── */}
            <section className="vcFeedback">
              {fbStep === "choose" && (
                <div className="vcFbTopRow">
                  <div className="vcFbLeft">
                    <span className="vcRewardBadge">🎁 Community Reward</span>
                    <h3 className="vcFeedbackTitle" style={{ marginBottom: 8 }}>Was our valuation accurate?</h3>
                    <p className="vcFeedbackText">Help us improve our AI engine.</p>
                  </div>
                  <div className="vcFbRight">
                    {[
                      { label: "TOO HIGH", rating: "too_high", icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></svg>) },
                      { label: "SPOT ON", rating: "spot_on", icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="9 12 11 14 15 10" /></svg>) },
                      { label: "TOO LOW", rating: "too_low", icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>) },
                    ].map(b => (
                      <button key={b.rating} className="vcFbChoice" type="button" disabled={fbSubmitting}
                        onClick={() => { trackEvent("feedback_rating_selected", { rating: b.rating, page: "report" }); setFbRating(b.rating); setFbNote(""); setFbStar(0); setFbStarHover(0); setFbStep("form"); }}>
                        {b.icon}{b.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {fbStep === "form" && (
                <div>
                  <h3 className="vcFbFormTitle">How can we improve?</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 18 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(43,43,43,.5)", letterSpacing: ".08em", textTransform: "uppercase", marginRight: 4 }}>Rate your experience</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} type="button" onClick={() => setFbStar(star)} onMouseEnter={() => setFbStarHover(star)} onMouseLeave={() => setFbStarHover(0)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 3px", lineHeight: 1 }} aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill={(fbStarHover || fbStar) >= star ? "#B87333" : "none"} stroke={(fbStarHover || fbStar) >= star ? "#B87333" : "#D1D5DB"} strokeWidth="1.8" style={{ transition: "fill 0.12s, stroke 0.12s" }}>
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </button>
                    ))}
                    {fbStar > 0 && (<span style={{ fontSize: 11, fontWeight: 700, color: "#B87333", marginLeft: 4 }}>{["", "Poor", "Fair", "Good", "Great", "Excellent"][fbStar]}</span>)}
                  </div>
                  <textarea className="vcFbTextarea" placeholder="Tell us what data points we missed (e.g. recent renovations, building amenities...)" value={fbNote} onChange={(e) => setFbNote(e.target.value)} />
                  <div className="vcFbActions">
                    <button className="vcFbSubmit" type="button" disabled={fbSubmitting || !fbRating} onClick={() => { trackEvent("feedback_submitted", { rating: fbRating, stars: fbStar, page: "report" }); submitFeedback(fbRating, fbNote); }}>
                      SUBMIT FEEDBACK &amp; CLAIM REWARD <span aria-hidden="true">🎟️</span>
                    </button>
                    <button className="vcFbBack" type="button" disabled={fbSubmitting} onClick={() => { setFbStep("choose"); setFbRating(""); setFbNote(""); setFbStar(0); setFbStarHover(0); }}>GO BACK</button>
                  </div>
                </div>
              )}
              {fbStep === "success" && (
                <div className="vcRewardScreen">
                  <div className="vcRewardCheck">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                  </div>
                  <h3 className="vcRewardTitle">Reward Unlocked!</h3>
                  <p className="vcRewardSub">Your feedback has been logged. You will receive an email with your free subscription shortly.</p>
                  <button className="vcFbBack" type="button" onClick={() => { setFbStep("choose"); setFbRating(""); setFbNote(""); setFbStar(0); setFbStarHover(0); }} style={{ marginTop: 10 }}>GO BACK</button>
                </div>
              )}
            </section>

            {/* ── SHARE + FOOTER INFO ── */}
            <section className="vcBottomSection">
              <div className="vcShareSection">
                <p className="vcShareLabel">Public Shareable Link</p>
                <div className="vcShareRow">
                  <input type="text" className="vcShareInput" value={shareUrl} readOnly placeholder="Link will appear once report is saved…" />
                  <button className="vcCopyBtn" onClick={handleCopyShareLink} disabled={!shareUrl} style={{ opacity: shareUrl ? 1 : 0.45, cursor: shareUrl ? "pointer" : "not-allowed" }}>Copy</button>
                </div>
                {!shareUrl && (<p style={{ margin: "8px 0 0", fontSize: 11, color: "rgba(43,43,43,.4)", fontStyle: "italic" }}>Saving report to generate shareable link…</p>)}
              </div>
              <div className="vcFooterInfo">
                <div>
                  <p className="vcInfoTitle">Purpose</p>
                  <p className="vcInfoContent">Prepared for investment decision-making only. <strong>NOT suitable for</strong>:</p>
                  <ul className="vcInfoList">
                    <li>Bank mortgage applications</li>
                    <li>Legal proceedings</li>
                    <li>Tax assessments</li>
                    <li>Financial reporting</li>
                  </ul>
                </div>
                <div>
                  <p className="vcInfoTitle">Intended User</p>
                  <p className="vcInfoContent">{displayUserName} — For personal use only</p>
                </div>
                <div>
                  <p className="vcInfoTitle">Third-Party Reliance</p>
                  <p className="vcInfoContent">Not permitted without explicit written consent from ACQARLABS L.L.C-FZ.</p>
                </div>
              </div>
              <div className="vcActions">
  <button className="vcBtn vcBtnGhost" onClick={goBack}>Regenerate Report</button>
  {(userStats.plan !== "pro" && userStats.plan !== "elite") && (
  <button
    className="vcBtn"
    onClick={() => { trackEvent("cta_click", { location: "report_footer_cta", page: "report" }); navigate("/pricing"); }}
    style={{ background: "#B87333", color: "#fff", border: "none" }}
  >
    CLAIM YOUR SPOT →
  </button>
)}
  <button className="vcBtn vcBtnPrimary" onClick={goBack}>Delete Report</button>
</div>
            </section>

          </>
        )}
      </main>

      {/* ── PaywallModal ── */}
      {showPaywall && (
        <PaywallModal
          valuationId={paywallValuationId}
          onSuccess={handlePaywallSuccess}
          onClose={() => setShowPaywall(false)}
        />
      )}

{showSectionLock && (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div style={{ background: "#fff", borderRadius: 20, padding: "28px 24px", maxWidth: 400, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.25)", position: "relative" }}>
      <button onClick={() => setShowSectionLock(false)} style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#aaa" }}>✕</button>
      <div style={{ fontSize: 10, fontWeight: 900, color: "#B87333", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 10 }}>PRO FEATURE</div>
      <h2 style={{ fontSize: 22, fontWeight: 900, textTransform: "uppercase", color: "#1a1a1a", marginBottom: 10 }}>UNLOCK FULL REPORT</h2>
      <p style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 400, color: "#2B2B2B", lineHeight: 1.7, fontFamily: "'Inter', sans-serif" }}>
  <strong style={{ fontWeight: 700, color: "#1a1a1a", display: "block", marginBottom: 4 }}>
    Founding Member Pricing Closes Soon.
  </strong>
  AED 29 won't last — join 225 founding members locking in before it hits AED 149/mo.
</p>
      <button onClick={() => { setShowSectionLock(false); navigate("/pricing"); }} style={{ width: "100%", padding: "14px", background: "#B87333", color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", fontFamily: "'Inter', sans-serif", letterSpacing: "0.05em", boxShadow: "0 8px 24px rgba(184,115,51,0.30)"  }}>
        CLAIM YOUR SPOT →
      </button>
      <button onClick={() => setShowSectionLock(false)} style={{ width: "100%", marginTop: 10, padding: "10px", background: "transparent", border: "none", fontSize: 11, color: "#aaa", cursor: "pointer", fontWeight: 700, textTransform: "uppercase" }}>
        Maybe later
      </button>
    </div>
  </div>
)}
      <Footer />
    </div>
  );
}


