import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Nav from '../components/NavBar';
import Footer from '../components/Footer';
import { supabase } from "../lib/supabase";
import PaywallModal from "../components/PaywallModal";
import { trackEvent } from "../analytics";
// import { Helmet } from "react-helmet-async";
// import "../styles/truvalu-dark.css";

const RAW_API = import.meta.env.VITE_AVM_API;
const API = RAW_API ? RAW_API.replace(/\/+$/, "") : "";

console.log("RAW_API:", RAW_API);
console.log("API:", API);

/* ✅ Fonts + Material Symbols + ALL component CSS (no Tailwind) */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; }

  :root {
    --primary: #2B2B2B;
    --accent-copper: #B87333;
    --accent: #B8763C;
    --accent-2: #C98945;
    --gray-light: #D4D4D4;
    --gray-medium: #B3B3B3;
    --bg-off-white: #FAFAFA;
    --border: #e5e7eb;
    --text-muted: #6b7280;
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

  /* MOBILE ONLY: stop Safari zoom when keyboard opens */
  @media (max-width: 640px) {
    input, select, textarea { font-size: 16px !important; }
  }

  /* ========================= PAGE ========================= */
  .vf-page { background: #F8F8F8; color: #111827; font-family: 'Inter', sans-serif; min-height: 100vh; }
  .vf-main { padding-bottom: 48px; }
  @media (min-width: 640px) { .vf-main { padding-bottom: 64px; } }
  @media (min-width: 768px) { .vf-main { padding-bottom: 80px; } }

  .vf-container { max-width: 56rem; margin: 0 auto; padding: 0 16px; }
  @media (min-width: 640px) { .vf-container { padding: 0 24px; } }

  /* ========================= HERO ========================= */
  .vf-hero { text-align: center; margin-bottom: 24px; }
  @media (min-width: 640px) { .vf-hero { margin-bottom: 32px; } }

  .vf-hero-title { font-size: 24px; font-weight: 700; letter-spacing: -0.01em; margin-bottom: 8px; }
  @media (min-width: 640px) { .vf-hero-title { font-size: 30px; margin-bottom: 12px; } }
  @media (min-width: 768px) { .vf-hero-title { font-size: 36px; } }

  .vf-hero-sub { color: #6b7280; font-size: 12px; }
  @media (min-width: 640px) { .vf-hero-sub { font-size: 14px; } }

  .vf-hero-break { display: none; }
  @media (min-width: 640px) { .vf-hero-break { display: block; } }

  /* ========================= PROGRESS ========================= */
  .vf-progress-wrap { margin-bottom: 24px; }
  @media (min-width: 640px) { .vf-progress-wrap { margin-bottom: 32px; } }

  .vf-progress-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .vf-progress-track { height: 2px; flex: 1; background: #e5e7eb; position: relative; }
  .vf-progress-fill { position: absolute; left: 0; top: 0; height: 100%; width: 50%; background: var(--accent); }
  .vf-progress-labels { display: flex; justify-content: space-between; font-size: 12px; }
  .vf-progress-caption { color: #9ca3af; }
  .vf-progress-step { font-size: 14px; font-weight: 700; }

  /* ========================= CARD ========================= */
  .vf-card { background: #fff; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid var(--border); overflow: hidden; }
  .vf-card-body { padding: 16px; display: flex; flex-direction: column; gap: 32px; }
  @media (min-width: 640px) { .vf-card-body { padding: 24px; } }
  @media (min-width: 768px) { .vf-card-body { padding: 32px; } }

  .vf-error { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; border-radius: 8px; padding: 12px 16px; font-size: 14px; font-weight: 600; }

  /* ========================= SECTIONS ========================= */
  .vf-section { display: flex; flex-direction: column; gap: 16px; }
  .vf-section-bordered { padding-top: 16px; border-top: 1px solid #f3f4f6; }
  .vf-section-title { font-size: 14px; font-weight: 700; letter-spacing: 0.05em; }

  /* ========================= GRIDS ========================= */
  .vf-grid-1 { display: grid; grid-template-columns: 1fr; gap: 16px; }
  .vf-grid-2 { display: grid; grid-template-columns: 1fr; gap: 16px; }
  .vf-grid-3 { display: grid; grid-template-columns: 1fr; gap: 16px; }
  .vf-grid-4 { display: grid; grid-template-columns: 1fr; gap: 16px; }
  @media (min-width: 768px) {
    .vf-grid-2 { grid-template-columns: repeat(2, 1fr); }
    .vf-grid-3 { grid-template-columns: repeat(3, 1fr); }
    .vf-grid-4 { grid-template-columns: repeat(4, 1fr); }
  }

  /* ========================= FIELDS ========================= */
  .vf-rel { position: relative; }
  .vf-label { font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; display: block; }

  .vf-input, .vf-select {
    width: 100%; height: 44px; background: #fff;
    border: 1px solid var(--border); border-radius: 6px;
    padding: 0 12px; font-size: 14px; color: #111827;
  }
  .vf-input:focus, .vf-select:focus {
    outline: none; border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }
  .vf-select:disabled, .vf-input:disabled { opacity: 0.6; cursor: not-allowed; }

  .vf-input-plain {
    width: 100%; height: 48px; background: #fff;
    border: 1px solid var(--border); border-radius: 8px;
    padding: 0 12px; font-size: 14px; color: #111827;
  }
  .vf-input-plain::placeholder { color: #9ca3af; }
  .vf-input-plain:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 2px rgba(184,118,60,0.3); }

  /* ========================= DROPDOWN ========================= */
  .vf-dropdown {
    position: absolute; left: 0; right: 0; top: 100%; margin-top: 8px; z-index: 50;
    background: #fff; border: 1px solid var(--border); border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
    overflow: hidden;
  }
  .vf-dropdown-search-wrap { padding: 12px; border-bottom: 1px solid #f3f4f6; background: #fff; position: sticky; top: 0; z-index: 10; }
  .vf-dropdown-search {
    width: 100%; height: 40px; padding: 0 12px; background: #f9fafb;
    border: 1px solid var(--border); border-radius: 8px; font-size: 14px;
  }
  .vf-dropdown-search:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
  .vf-dropdown-search-sm { height: 36px; border-radius: 6px; }

  .vf-dropdown-list { max-height: 256px; overflow: auto; overscroll-behavior: contain; }
  .vf-dropdown-list-tall { max-height: 60vh; }
  @media (min-width: 640px) { .vf-dropdown-list-tall { max-height: 240px; } }

  .vf-dropdown-empty { padding: 12px 16px; font-size: 14px; color: #6b7280; }

  .vf-option { width: 100%; text-align: left; padding: 12px 16px; font-size: 14px; background: none; border: none; cursor: pointer; color: inherit; }
  .vf-option:hover { background: #f9fafb; }
  .vf-option:active { background: #f3f4f6; }
  @media (min-width: 640px) { .vf-option-tight { padding: 10px 16px; } }

  .vf-dropdown-close-wrap { border-top: 1px solid #f3f4f6; padding: 8px; background: #fff; }
  @media (min-width: 640px) { .vf-dropdown-close-wrap { display: none; } }
  .vf-dropdown-close {
    width: 100%; height: 40px; border-radius: 8px; border: 1px solid var(--border);
    font-size: 14px; font-weight: 600; color: #374151; background: #fff;
  }
  .vf-dropdown-close:active { background: #f9fafb; }

  /* ========================= TOGGLE / RADIO ========================= */
  .vf-toggle-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .vf-toggle-row-lg { display: flex; flex-wrap: wrap; gap: 12px; }
  .vf-toggle-row-sm { display: flex; gap: 12px; }

  .vf-toggle {
    flex: 1; min-width: 120px; text-align: center; cursor: pointer; user-select: none;
    padding: 10px 16px; font-size: 12px; font-weight: 600;
    border-radius: 6px; border: 1px solid var(--border); background: #fff; color: #4b5563;
    transition: border-color 0.15s, background 0.15s, color 0.15s;
  }
  .vf-toggle:hover { border-color: #d1d5db; }
  .vf-toggle.is-active { border-color: #000; background: #000; color: #fff; }
  @media (min-width: 640px) { .vf-toggle { min-width: 0; } }

  .vf-radio-label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
  .vf-radio-input { width: 16px; height: 16px; accent-color: var(--accent); }
  .vf-radio-text { font-size: 14px; }

  /* ========================= SIZE / RENOVATION PICKER ========================= */
  .vf-size-row { position: relative; display: flex; }
  .vf-size-input-col { position: relative; width: 100%; }
  .vf-size-input {
    width: 100%; height: 44px; background: #fff;
    border: 1px solid var(--border); border-radius: 6px 0 0 6px;
    padding: 0 36px 0 12px; font-size: 14px; text-align: left;
  }
  .vf-size-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }

  .vf-size-arrow {
    position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
    color: #9ca3af; background: none; border: none; cursor: pointer;
  }
  .vf-size-arrow:hover { color: #4b5563; }

  .vf-size-unit-select {
    height: 44px; background: #f9fafb; border: 1px solid var(--border); border-left: none;
    border-radius: 0 6px 6px 0; padding: 0 8px; font-size: 12px;
  }
  .vf-size-unit-select:focus { outline: none; }

  .vf-size-unit-tag { font-size: 10px; color: var(--accent); margin-left: 4px; }

  /* ========================= AMENITIES ========================= */
  .vf-amenity-search-wrap { position: relative; }
  .vf-amenity-search {
    width: 100%; height: 44px; background: #fff; border: 1px solid var(--border);
    border-radius: 6px; padding: 0 40px; font-size: 14px;
  }
  .vf-amenity-search:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
  .vf-amenity-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9ca3af; }
  .vf-amenity-clear {
    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    color: #9ca3af; background: none; border: none; cursor: pointer; font-size: 14px;
  }
  .vf-amenity-clear:hover { color: #4b5563; }

  .vf-amenity-box { border-radius: 8px; border: 1px solid var(--border); background: #fff; }
  .vf-amenity-scroll { max-height: 256px; overflow-y: auto; padding: 12px; }
  .vf-amenity-list { display: flex; flex-wrap: wrap; gap: 8px; }
  .vf-amenity-empty { font-size: 14px; color: #6b7280; padding: 8px 4px; }

  .vf-pill {
    padding: 8px 12px; border-radius: 999px; font-size: 11px; font-weight: 500;
    border: 1px solid var(--border); background: #fff; color: #4b5563;
    transition: border-color 0.15s, background 0.15s, color 0.15s;
  }
  .vf-pill:hover { border-color: var(--accent); }
  .vf-pill.is-active { background: var(--accent); color: #fff; border-color: var(--accent); }
  @media (min-width: 640px) { .vf-pill { padding: 8px 16px; font-size: 12px; } }

  /* ========================= ACTIONS ========================= */
  .vf-actions { padding-top: 24px; display: flex; flex-direction: column; gap: 16px; }
  @media (min-width: 768px) { .vf-actions { flex-direction: row; } }

  .vf-submit {
    width: 100%; height: 56px; display: flex; align-items: center; justify-content: center; gap: 8px;
    background: linear-gradient(to right, var(--accent), var(--accent-2));
    color: #fff; border: none; border-radius: 12px; font-weight: 700;
    font-size: 18px; letter-spacing: 0.02em; cursor: pointer;
    box-shadow: 0 10px 15px -3px rgba(184,118,60,0.3);
    transition: box-shadow 0.2s, transform 0.2s;
  }
  .vf-submit:hover { box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); }
  .vf-submit:active { transform: scale(0.98); }
  .vf-submit:hover .vf-submit-icon { transform: translateX(4px); }
  @media (min-width: 768px) { .vf-submit { height: 48px; font-size: 16px; } }

  .vf-submit-icon { font-size: 26px; transition: transform 0.2s; }
  @media (min-width: 768px) { .vf-submit-icon { font-size: 20px; } }

  .vf-reset {
    padding: 0 32px; height: 48px; background: #fff; border: 1px solid var(--border);
    color: #4b5563; border-radius: 6px; font-weight: 500; font-size: 14px; cursor: pointer;
    transition: background 0.15s;
  }
  .vf-reset:hover { background: #f9fafb; }

  /* ========================= HEADER ========================= */
  .vf-hdr { position: fixed; top: 0; left: 0; right: 0; z-index: 50; width: 100%; border-bottom: 1px solid #D4D4D4; background: #fff; }
  .vf-hdr-wrap { max-width: 80rem; margin: 0 auto; padding: 0 16px; height: 80px; display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: nowrap; }
  @media (min-width: 640px) { .vf-hdr-wrap { padding: 0 24px; gap: 16px; } }

  .vf-hdr-logo { display: flex; align-items: center; cursor: pointer; flex-shrink: 0; white-space: nowrap; }
  .vf-hdr-logo h1 { font-size: 20px; font-weight: 900; letter-spacing: -0.04em; text-transform: uppercase; white-space: nowrap; }
  @media (min-width: 640px) { .vf-hdr-logo h1 { font-size: 24px; } }

  .vf-hdr-mobile-nav { display: flex; align-items: center; gap: 4px; }
  @media (min-width: 768px) { .vf-hdr-mobile-nav { display: none; } }

  .vf-hdr-mobile-btn {
    font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em;
    padding: 6px 8px; border-radius: 999px; white-space: nowrap; background: none; border: none; cursor: pointer;
    color: rgba(43,43,43,0.7); text-decoration: none;
  }
  .vf-hdr-mobile-btn.is-active { color: var(--accent-copper); text-decoration: underline; text-underline-offset: 4px; }

  .vf-hdr-desktop-nav { display: none; }
  @media (min-width: 768px) { .vf-hdr-desktop-nav { display: flex; align-items: center; gap: 40px; } }

  .vf-hdr-desktop-link {
    font-size: 14px; font-weight: 600; letter-spacing: 0.02em; white-space: nowrap;
    text-decoration: none; color: #2B2B2B; background: none; border: none; cursor: pointer;
    transition: color 0.15s;
  }
  .vf-hdr-desktop-link:hover { color: var(--accent-copper); }
  .vf-hdr-desktop-link.is-active { color: var(--accent-copper); }

  .vf-hdr-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; flex-wrap: nowrap; }
  @media (min-width: 640px) { .vf-hdr-right { gap: 16px; } }

  .vf-hdr-cta {
    background: var(--accent-copper); color: #fff; padding: 10px 16px; border-radius: 6px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.02em; white-space: nowrap;
    border: none; cursor: pointer; transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
  }
  .vf-hdr-cta:hover { background: #a6682e; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
  .vf-hdr-cta:active { transform: scale(0.95); }
  @media (min-width: 640px) { .vf-hdr-cta { padding: 10px 24px; font-size: 14px; } }

  .vf-hdr-spacer { height: 80px; }

  @media (max-width: 420px) {
    .vf-hdr-wrap { padding-left: 10px !important; padding-right: 10px !important; gap: 4px !important; }
    .vf-hdr-logo h1 { font-size: 17px !important; letter-spacing: -0.02em !important; }
  }
  @media (max-width: 360px) {
    .vf-hdr-wrap { gap: 3px !important; }
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
  // ✅ SIZE RANGE DROPDOWN (NO CONVERSION)
  // ============================
  const SIZE_STEP_SQFT = 100;
  const SIZE_MAX_SQFT = 25000;

  const SIZE_STEP_SQM = 10;
  const SIZE_MAX_SQM = 2500;

  function pickAnyInRangeInclusive(a, b) {
    const start = Math.round(Number(a));
    const end = Math.round(Number(b));
    if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;

    const lo = Math.min(start, end);
    const hi = Math.max(start, end);

    const n = hi - lo + 1;
    if (n <= 1) return lo;

    if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
      const u32 = new Uint32Array(1);
      const max = 0xffffffff;
      const limit = max - (max % n);
      let x;
      do {
        window.crypto.getRandomValues(u32);
        x = u32[0];
      } while (x >= limit);
      return lo + (x % n);
    }

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

    setSizeOpen(false);
    setSizeSearch("");

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
      if (sizeBoxRef.current && !sizeBoxRef.current.contains(e.target)) setSizeOpen(false);
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
    <div className="vf-page">
      <title>Get Your Free Property Valuation | Acqar Truvalu</title>
      <meta name="robots" content="noindex, nofollow" />
      <style>{styles}</style>

<Nav />

      <main className="vf-main">
        <div className="vf-container">
          {/* Header Section */}
          <div className="vf-hero">
            <h1 className="vf-hero-title">Property Details</h1>
            <p className="vf-hero-sub">
              Please provide the structural and legal specifications of your asset
              <br className="vf-hero-break" />
              for a RICS-standard AI valuation.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="vf-progress-wrap">
            <div className="vf-progress-row">
              <div className="vf-progress-track">
                <div className="vf-progress-fill" />
              </div>
            </div>
            <div className="vf-progress-labels">
              <span className="vf-progress-caption">PROGRESS</span>
              <span className="vf-progress-step">Step 2 of 4</span>
            </div>
          </div>

          {/* Main Form Card */}
          <div className="vf-card">
            <div className="vf-card-body">
              {error ? <div className="vf-error">{error}</div> : null}

              {/* 01. LOCATION */}
              <section className="vf-section">
                <h2 className="vf-section-title">01. LOCATION</h2>

                <div className="vf-grid-3">
                  {/* COUNTRY */}
                  <div>
                    <Label>COUNTRY</Label>
                    <select
                      ref={countryRef}
                      className="vf-select"
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
                      className="vf-select"
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
                  <div ref={districtBoxRef} className="vf-rel">
                    <Label>DISTRICT / AREA</Label>

                    <input
                      ref={districtInputRef}
                      className="vf-input"
                      placeholder={isDubaiFlow ? "Select district" : "Select UAE + Dubai first"}
                      value={selectedDistrict ? selectedDistrict.district_name : districtQuery}
                      disabled={!isDubaiFlow}
                      readOnly
                      inputMode="none"
                      onClick={() => {
                        setSelectedDistrict(null);
                        setDistrictQuery("");
                        setDistrictOpen(true);

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

                    {districtOpen && isDubaiFlow ? (
                      <div className="vf-dropdown">
                        <div className="vf-dropdown-search-wrap">
                          <input
                            className="vf-dropdown-search"
                            placeholder="Search district..."
                            value={districtQuery}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDistrictQuery(v);
                              setSelectedDistrict(null);

                              setSelectedProperty(null);
                              setPropertyQuery("");
                              setPropertyResults([]);
                              setPropertyOpen(false);

                              update("district_code", "");
                              update("district_name", v);
                              update("area_name_en", v);
                            }}
                          />
                        </div>

                        <div className="vf-dropdown-list">
                          {filteredDistricts.length === 0 && !districtLoading ? (
                            <div className="vf-dropdown-empty">No districts found</div>
                          ) : (
                            filteredDistricts.map((d) => (
                              <button
                                key={`${d.district_code}-${d.district_name}`}
                                type="button"
                                className="vf-option"
                                onClick={() => {
                                  setSelectedDistrict(d);
                                  setDistrictQuery(d.district_name);
                                  setDistrictOpen(false);

                                  update("district_code", d.district_code || "");
                                  update("district_name", d.district_name || "");
                                  update("area_name_en", d.district_name || "");

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

                        <div className="vf-dropdown-close-wrap">
                          <button
                            type="button"
                            onClick={() => setDistrictOpen(false)}
                            className="vf-dropdown-close"
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
              <section className="vf-section vf-section-bordered">
                <h2 className="vf-section-title">02. PROPERTY SPECIFICATIONS</h2>

                {/* Row 1: Building / Project Name */}
                <div className="vf-grid-1">
                  <div ref={propertyBoxRef} className="vf-rel">
                    <Label>BUILDING / PROJECT NAME</Label>
                    <input
                      ref={propertyInputRef}
                      className="vf-input"
                      placeholder={typedDistrictName ? "Select property" : "Select district first"}
                      value={selectedProperty ? selectedProperty.property_name : propertyQuery}
                      disabled={!typedDistrictName}
                      readOnly
                      inputMode="none"
                      onClick={() => {
                        setSelectedProperty(null);
                        setPropertyQuery("");
                        setPropertyOpen(true);

                        update("property_name", "");
                        update("project_reference", "");
                        update("project_name_en", "");
                      }}
                    />

                    {propertyOpen && typedDistrictName ? (
                      <div className="vf-dropdown">
                        <div className="vf-dropdown-search-wrap">
                          <div className="vf-rel">
                            <input
                              className="vf-dropdown-search vf-dropdown-search-sm"
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
                          </div>
                        </div>

                        <div className="vf-dropdown-list vf-dropdown-list-tall">
                          {filteredProperties.length === 0 && !propertyLoading ? (
                            <div className="vf-dropdown-empty">No properties found</div>
                          ) : (
                            filteredProperties.map((p) => (
                              <button
                                key={p.property_name}
                                type="button"
                                className="vf-option vf-option-tight"
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

                        <div className="vf-dropdown-close-wrap">
                          <button
                            type="button"
                            onClick={() => setPropertyOpen(false)}
                            className="vf-dropdown-close"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Row 2: Title Deed Number + Plot Number */}
                <div className="vf-grid-2">
                  <div>
                    <Label>TITLE DEED NUMBER (Optional)</Label>
                    <input
                      className="vf-input"
                      placeholder="e.g. 12347904"
                      value={form.title_deed_no || ""}
                      onChange={(e) => update("title_deed_no", e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>PLOT NUMBER (Optional) </Label>
                    <input
                      className="vf-input-plain"
                      placeholder="Enter plot number"
                      value=""
                      onChange={(e) => update("plot_no", e.target.value)}
                    />
                  </div>
                </div>

                {/* Row 3: Tenure Type */}
                <div>
                  <Label>TENURE TYPE</Label>
                  <div className="vf-toggle-row">
                    {TITLE_DEED_TYPES.map((t) => (
                      <ToggleBtnClean key={t} active={form.title_deed_type === t} onClick={() => update("title_deed_type", t)} label={t} />
                    ))}
                  </div>
                </div>
              </section>

              {/* 04. UNIT DETAILS */}
              <section className="vf-section vf-section-bordered">
                <h2 className="vf-section-title">04. UNIT DETAILS</h2>

                <div className="vf-grid-4">
                  <div>
                    <Label>UNIT NO. (Optional)</Label>
                    <input
                      ref={aptRef}
                      className="vf-input"
                      placeholder="e.g. 12A"
                      value={form.unit_no || ""}
                      onChange={(e) => update("unit_no", e.target.value)}
                    />
                  </div>

                  {/* ✅ SIZE (type manually OR pick range; NO conversion) */}
                  <div ref={sizeBoxRef} className="vf-rel">
                    <Label>
                      SIZE{" "}
                      <span className="vf-size-unit-tag">
                        {form.area_unit === "sq.m" ? "SqM ▼" : "SqFt ▼"}
                      </span>
                    </Label>

                    <div className="vf-size-row">
                      <div className="vf-size-input-col">
                        <input
                          ref={sizeRef}
                          inputMode="decimal"
                          className="vf-size-input"
                          value={sizeSelectedLabel || (form.area_value || "")}
                          placeholder="Total Area"
                          onChange={(e) => {
                            setSizeSelectedLabel("");
                            let v = e.target.value.replace(/[^\d.]/g, "");
                            const parts = v.split(".");
                            if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
                            update("area_value", v);
                          }}
                          onClick={() => {
                            if (!sizeOpen) setSizeSearch("");
                            setSizeOpen(true);
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => {
                            if (!sizeOpen) setSizeSearch("");
                            setSizeOpen((v) => !v);
                          }}
                          className="vf-size-arrow"
                          aria-label="Toggle size ranges"
                        >
                          ▼
                        </button>
                      </div>

                      <select
                        className="vf-size-unit-select"
                        value={form.area_unit}
                        onChange={(e) => {
                          update("area_unit", e.target.value);
                          setSizeSelectedLabel("");
                        }}
                      >
                        <option value="sq.ft">Sq Ft</option>
                        <option value="sq.m">Sq M</option>
                      </select>

                      {sizeOpen ? (
                        <div className="vf-dropdown">
                          <div className="vf-dropdown-search-wrap">
                            <input
                              className="vf-dropdown-search"
                              placeholder={
                                form.area_unit === "sq.m"
                                  ? "Search (sqm) e.g. 50 or 50-60"
                                  : "Search (sqft) e.g. 500 or 500-600"
                              }
                              value={sizeSearch}
                              onChange={(e) => {
                                setSizeSelectedLabel("");
                                let v = e.target.value.replace(/[^\d.]/g, "");
                                const parts = v.split(".");
                                if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
                                update("area_value", v);
                              }}
                            />
                          </div>

                          <div className="vf-dropdown-list">
                            {(() => {
                              const q = (sizeSearch || "").trim().toLowerCase();

                              const filtered = SIZE_RANGES.filter((r) => {
                                if (!q) return true;
                                return r.label.includes(q);
                              });

                              if (filtered.length === 0) {
                                return <div className="vf-dropdown-empty">No ranges found</div>;
                              }

                              return filtered.map((r) => {
                                const display = r.label;

                                return (
                                  <button
                                    key={r.label}
                                    type="button"
                                    className="vf-option"
                                    onClick={() => {
                                      const v = pickAnyInRangeInclusive(r.start, r.end);
                                      update("area_value", String(v));
                                      setSizeSelectedLabel(r.label);
                                      setSizeOpen(false);
                                    }}
                                  >
                                    {display}{" "}
                                    <span style={{ color: "#9ca3af", fontSize: 12, marginLeft: 8 }}>{form.area_unit}</span>
                                  </button>
                                );
                              });
                            })()}
                          </div>

                          <div className="vf-dropdown-close-wrap">
                            <button
                              type="button"
                              onClick={() => setSizeOpen(false)}
                              className="vf-dropdown-close"
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
                      className="vf-select"
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
                      className="vf-select"
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
                  <div className="vf-toggle-row-lg">
                    {["Fully Furnished", "Semi-Furnished", "Unfurnished"].map((x) => {
                      const mapping = {
                        "Fully Furnished": "Furnished",
                        "Semi-Furnished": "SemiFurnished",
                        Unfurnished: "Unfurnished",
                      };
                      const formValue = mapping[x];
                      return (
                        <label key={x} className="vf-radio-label">
                          <input
                            type="radio"
                            name="furnishing"
                            checked={form.furnishing === formValue}
                            onChange={() => update("furnishing", formValue)}
                            className="vf-radio-input"
                          />
                          <span className="vf-radio-text">{x}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* ✅ IS RENOVATED? */}
                <div>
                  <Label>IS RENOVATED?</Label>
                  <div className="vf-toggle-row-sm">
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
                    <div ref={renovationBoxRef} className="vf-rel" style={{ marginTop: 12 }}>
                      <Label>RENOVATION AMOUNT (AED)</Label>
                      <div className="vf-rel">
                        <input
                          inputMode="decimal"
                          className="vf-input"
                          style={{ paddingRight: 36 }}
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
                          className="vf-size-arrow"
                          aria-label="Toggle renovation ranges"
                        >
                          ▼
                        </button>

                        {renovationOpen ? (
                          <div className="vf-dropdown">
                            <div className="vf-dropdown-search-wrap">
                              <input
                                className="vf-dropdown-search"
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

                            <div className="vf-dropdown-list">
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
                                  className="vf-option"
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

                            <div className="vf-dropdown-close-wrap">
                              <button
                                type="button"
                                onClick={() => setRenovationOpen(false)}
                                className="vf-dropdown-close"
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
              <section className="vf-section vf-section-bordered">
                <h2 className="vf-section-title">05. FEATURES & AMENITIES</h2>

                {/* Search */}
                <div className="vf-amenity-search-wrap">
                  <input
                    type="text"
                    value={featureSearch}
                    onChange={(e) => setFeatureSearch(e.target.value)}
                    placeholder="Search amenities..."
                    className="vf-amenity-search"
                  />
                  <span className="vf-amenity-search-icon">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>

                  {featureSearch ? (
                    <button
                      type="button"
                      onClick={() => setFeatureSearch("")}
                      className="vf-amenity-clear"
                      aria-label="clear amenities search"
                    >
                      ✕
                    </button>
                  ) : null}
                </div>

                {/* Scroll container */}
                <div className="vf-amenity-box">
                  <div className="vf-amenity-scroll">
                    <div className="vf-amenity-list">
                      {(filteredAmenities || []).map((a) => {
                        const on = (form.amenities || []).includes(a);
                        return (
                          <button
                            key={a}
                            type="button"
                            onClick={() => toggleAmenity(a)}
                            className={`vf-pill${on ? " is-active" : ""}`}
                          >
                            {a}
                          </button>
                        );
                      })}

                      {filteredAmenities?.length === 0 ? <div className="vf-amenity-empty">No amenities found.</div> : null}
                    </div>
                  </div>
                </div>
              </section>

              {/* Actions */}
              <div className="vf-actions">
                <button type="button" onClick={onNext} className="vf-submit">
                  Get Free Valuation
                  <span className="material-symbols-outlined vf-submit-icon">
                    arrow_forward
                  </span>
                </button>

                <button type="button" onClick={onReset} className="vf-reset">
                  RESET ALL FIELDS
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ---------- Small UI helpers ----------
function Label({ children }) {
  return <label className="vf-label">{children}</label>;
}

function ToggleBtnClean({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`vf-toggle${active ? " is-active" : ""}`}>
      {label}
    </button>
  );
}
