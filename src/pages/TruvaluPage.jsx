import { useState,useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { trackEvent } from "../analytics";
// import { Helmet } from "react-helmet-async";
import Nav from '../components/Nav';
import Footer from '../components/Footer';

import { supabase } from "../lib/supabase"; // make sure this exists

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { font-family: 'Inter', sans-serif; -webkit-text-size-adjust: 100%; }

  :root {
    --primary: #2B2B2B;
    --accent-copper: #B87333;
    --gray-light: #D4D4D4;
    --gray-medium: #B3B3B3;
    --bg-off-white: #FAFAFA;
  }

  /* ── ICONS ── */
  .mat-icon {
    font-family: 'Material Symbols Outlined';
    font-weight: normal; font-style: normal;
    font-size: 1.25rem; line-height: 1;
    letter-spacing: normal; text-transform: none;
    display: inline-block; white-space: nowrap;
    direction: ltr; -webkit-font-smoothing: antialiased;
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    user-select: none; vertical-align: middle;
  }
  .mat-icon.fill { font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
  .mat-icon.xs  { font-size: 0.875rem; }
  .mat-icon.sm  { font-size: 1rem; }
  .mat-icon.lg  { font-size: 1.5rem; }
  .mat-icon.xl  { font-size: 2.25rem; }

  /* ── SHARED UTILS ── */
  .architectural-lines {
    background-image: radial-gradient(#2B2B2B 0.5px, transparent 0.5px);
    background-size: 40px 40px; opacity: 0.05;
    position: absolute; inset: 0; z-index: 0; pointer-events: none;
  }
  .gradient-text {
    background: linear-gradient(to right, #B87333, #2B2B2B);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .soft-shadow { box-shadow: 0 20px 50px -12px rgba(43,43,43,0.15); }

  @keyframes pulse {
    0%,100% { opacity: 1; } 50% { opacity: 0.4; }
  }
  .pulse { animation: pulse 2s cubic-bezier(.4,0,.6,1) infinite; }

  /* ── MARQUEE ── */
  @keyframes marquee-left {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .marquee-track {
    display: flex; width: max-content;
    animation: marquee-left 34s linear infinite;
  }
  .marquee-track:hover { animation-play-state: paused; }
  .marquee-wrap {
    overflow: hidden;
    -webkit-mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
    mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
  }
  .tcard { transition: transform .25s ease, box-shadow .25s ease; }
  .tcard:hover { transform: translateY(-5px); box-shadow: 0 18px 40px rgba(0,0,0,0.11); }

  /* ── CONTAINERS ── */
  .container    { max-width: 80rem; margin: 0 auto; padding: 0 1.5rem; }
  .container-sm { max-width: 64rem; margin: 0 auto; padding: 0 1.5rem; }
  .container-xs { max-width: 56rem; margin: 0 auto; padding: 0 1.5rem; }

  /* ── HEADER — FIXED (never scrolls) ── */
  .site-header {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 200;
    height: 68px;
    border-bottom: 1px solid rgba(212,212,212,0.35);
    background: rgba(255,255,255,0.94);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }
  .header-inner {
    height: 100%;
    display: flex; align-items: center; justify-content: space-between;
  }
  .nav-desktop { display: flex; gap: 36px; align-items: center; }
  .nav-cta     { display: flex; align-items: center; gap: 14px; }
  .hamburger   { display: none; background: none; border: none; cursor: pointer; padding: 4px; }

  /* Push content below fixed header */
  .page-body { padding-top: 68px; }

  /* ── MOBILE MENU ── */
  .mobile-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.45); z-index: 300;
  }
  .mobile-panel {
    position: absolute; top: 0; right: 0; bottom: 0; width: 280px;
    background: #fff; padding: 24px 20px;
    display: flex; flex-direction: column; gap: 6px;
    box-shadow: -6px 0 30px rgba(0,0,0,0.14);
    overflow-y: auto;
  }
  .mobile-nav-btn {
    width: 100%; text-align: left; padding: 14px 8px;
    background: none; border: none;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer; font-size: 0.9375rem; font-weight: 600;
    font-family: 'Inter', sans-serif; color: var(--primary);
  }

  /* ── BUTTONS ── */
  .btn-copper {
    background: var(--accent-copper); color: #fff;
    border: 1px solid var(--accent-copper); cursor: pointer;
    font-family: 'Inter', sans-serif; font-weight: 700;
    border-radius: 12px; transition: all .2s;
    display: inline-flex; align-items: center; gap: 10px;
  }
  .btn-copper:hover {
    background: #a6682e;
    box-shadow: 0 14px 34px rgba(184,115,51,0.32);
    transform: translateY(-1px);
  }
  .btn-outline {
    background: #fff; color: var(--primary);
    border: 1px solid var(--gray-light); cursor: pointer;
    font-family: 'Inter', sans-serif; font-weight: 700;
    border-radius: 12px; transition: all .2s;
    display: inline-flex; align-items: center; gap: 10px;
  }
  .btn-outline:hover { background: var(--bg-off-white); border-color: var(--accent-copper); }

  /* ── HERO ── */
  .hero-section { position: relative; overflow: hidden; padding: 56px 0 80px; }
  .hero-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 56px; align-items: center;
    position: relative; z-index: 1;
  }
  .hero-left { display: flex; flex-direction: column; gap: 28px; }
  .hero-headline { font-size: 4.5rem; font-weight: 900; line-height: 1.1; letter-spacing: -.02em; color: var(--primary); }
  .hero-cta-row { display: flex; flex-direction: row; gap: 14px; align-items: center; }

  /* Trust bar */
  .trust-bar {
    margin-top: 48px; position: relative; z-index: 1;
    border: 1px solid rgba(147,197,253,0.5);
    background: rgba(239,246,255,0.3);
    border-radius: 12px; padding: 14px 20px;
    display: flex; flex-wrap: wrap;
    align-items: center; justify-content: center; gap: 28px;
  }

  /* ── STEPS ── */
  .steps-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 20px; margin-bottom: 60px; }

  /* ── STATS ── */
  .stats-grid {
    display: grid; grid-template-columns: repeat(3,1fr);
    gap: 28px; text-align: center;
    background: var(--primary); border-radius: 24px; padding: 40px;
    border: 1px solid rgba(184,115,51,0.2);
    box-shadow: 0 25px 50px rgba(0,0,0,0.2);
  }

  /* ── FOOTER ── */
  .footer-grid { display: grid; grid-template-columns: 3fr 2fr 2fr 2fr 3fr; gap: 44px; margin-bottom: 72px; }
  .footer-bottom {
    display: flex; justify-content: space-between;
    align-items: center; gap: 16px;
    padding-top: 32px; border-top: 1px solid #e5e7eb;
  }

  /* ══════════════════════════════════
     RESPONSIVE
  ══════════════════════════════════ */

  @media (max-width: 1024px) {
    .hero-grid        { grid-template-columns: 1fr !important; }
    .hero-left        { max-width: 100% !important; }
    .steps-grid       { grid-template-columns: repeat(2,1fr) !important; }
    .footer-grid      { grid-template-columns: 1fr 1fr !important; }
    .footer-brand-col { grid-column: 1 / -1 !important; }
    .stats-grid       { grid-template-columns: 1fr !important; }
    .stats-border     { border-right: none !important; padding-right: 0 !important; border-bottom: 1px solid rgba(255,255,255,0.12) !important; padding-bottom: 24px !important; }
  }

  @media (max-width: 768px) {
    /* Header height */
    .site-header  { height: 60px; }
    .page-body    { padding-top: 60px; }

    /* Nav — hide desktop, show hamburger */
    .nav-desktop  { display: none !important; }
    .nav-cta      { display: none !important; }
    .hamburger    { display: flex !important; align-items: center; }

    /* Hero */
    .hero-section       { padding: 28px 0 40px; }
    .hero-headline      { font-size: 2.55rem !important; }
    .hero-cta-row       { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
    .hero-cta-btn       { width: 100% !important; justify-content: center !important; }
    .hero-social-pill   { width: 100% !important; justify-content: center !important; }

    /* Show property card below text on mobile */
    .hero-card-section  { margin-top: 28px; }

    /* Steps */
    .steps-grid   { grid-template-columns: 1fr !important; }

    /* CTA section */
    .cta-headline { font-size: 1.9rem !important; }
    .cta-btn-row  { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
    .cta-btn-row button { width: 100% !important; justify-content: center !important; }

    /* Footer */
    .footer-grid    { grid-template-columns: 1fr 1fr !important; }
    .footer-bottom  { flex-direction: column !important; text-align: center !important; }

    /* Trust bar */
    .trust-bar   { gap: 14px !important; }
    .trust-item span { font-size: 0.8rem !important; }

    /* Stats */
    .stats-grid  { padding: 28px 20px !important; }
    .stats-num   { font-size: 1.75rem !important; }
  }

  @media (max-width: 480px) {
    .hero-headline  { font-size: 2rem !important; }
    .container      { padding: 0 1rem !important; }
    .footer-grid    { grid-template-columns: 1fr !important; }
    .partner-logos  { gap: 24px !important; }
    .hero-card-badge { bottom: -14px !important; right: -6px !important; max-width: 148px !important; }
  }
`;

/* ── ICON ── */
function Icon({ name, fill = false, size = "", className = "" }) {
  const sz = { xs:" xs", sm:" sm", lg:" lg", xl:" xl" }[size] || "";
  return <span className={`mat-icon${fill?" fill":""}${sz}${className?" "+className:""}`}>{name}</span>;
}

/* ──────────────────────────────────────
   HEADER
────────────────────────────────────── */
// ✅ ONLY HEADER CHANGED (everything else SAME)
// Replace your existing Header() function with THIS one.
// No other changes required.



//  function Header() {
//   const navigate = useNavigate();
//   const location = useLocation();

//   const current = location.pathname;

//   const [user, setUser] = useState(null);

// useEffect(() => {
//   // Get current session
//   supabase.auth.getSession().then(({ data }) => {
//     setUser(data.session?.user ?? null);
//   });

//   // Listen for login/logout changes
//   const { data: listener } = supabase.auth.onAuthStateChange(
//     (_event, session) => {
//       setUser(session?.user ?? null);
//     }
//   );

//   return () => {
//     listener.subscription.unsubscribe();
//   };
// }, []);

//   const navItems = [
//     // { label: "Products", path: "/" },
//     { label: "Pricing", path: "/pricing" },
//    { label: "Resources", path: "/blogs" },
//     // { label: "About", path: "/" },
//   ];

//   return (
//     <>
//       <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-[#D4D4D4] bg-white">
//         <div className="hdrWrap max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-2 sm:gap-4 flex-nowrap">
          
//           {/* Logo */}
//           <div
//             className="hdrLogo flex items-center cursor-pointer shrink-0 whitespace-nowrap"
//           onClick={() => {
//   trackEvent("nav_click", { item: "logo" });

//   navigate("/");
// }}

//           >
//             <h1 className="text-xl sm:text-2xl font-black tracking-tighter uppercase whitespace-nowrap">
//               <span style={{ color: "#B87333" }}>ACQ</span>
//               <span style={{ color: "#111111" }}>AR</span>
//             </h1>
//           </div>

//             {/* Mobile pricing */}
//            <button
//            onClick={() => {
//   trackEvent("nav_click", { item: "pricing" });

//   navigate("/pricing");
// }}

//             className={`md:hidden text-[10px] font-black uppercase tracking-[0.2em] px-3 py-2 rounded-full ${
//               current === "/pricing"
//                 ? "text-[#B87333] underline underline-offset-4"
//                 : "text-[#2B2B2B]/70"
//             }`}
//           >
//             Pricing
//           </button>


//           {/* Desktop nav */}
//           <nav className="hidden md:flex items-center gap-10">
//             {navItems.map((item) => (
//               <button
//                 key={item.label}
//                 onClick={() => {
//   trackEvent("Nav", "Click", item.label);
//   navigate(item.path);
// }}
//                 className={`text-sm font-semibold tracking-wide transition-colors hover:text-[#B87333] whitespace-nowrap ${
//                   current === item.path ? "text-[#B87333]" : "text-[#2B2B2B]"
//                 }`}
//               >
//                 {item.label}
//               </button>
//             ))}
//           </nav>

//      {/* Right buttons */}
// <div className="hdrRight flex items-center gap-2 sm:gap-4 shrink-0 flex-nowrap">
//   {user ? (
//   <button
//     onClick={() => navigate("/dashboard")}
//     className="bg-[#B87333] text-white px-4 sm:px-6 py-2.5 rounded-md text-[11px] sm:text-sm font-bold tracking-wide hover:bg-[#a6682e] hover:shadow-lg active:scale-95 whitespace-nowrap"
//   >
//     Dashboard
//   </button>
// ) : (
//   <button
//     onClick={() => {
//       trackEvent("nav_click", { item: "login" });
//       navigate("/login");
//     }}
//     className="bg-[#B87333] text-white px-4 sm:px-6 py-2.5 rounded-md text-[11px] sm:text-sm font-bold tracking-wide hover:bg-[#a6682e] hover:shadow-lg active:scale-95 whitespace-nowrap"
//   >
//     Sign In
//   </button>
// )}


//   {/* ✅ DESKTOP: Get Started ONLY on md+ */}
//   <button
//  onClick={() => {
//   trackEvent("valuation_start", { location: "header" });

//   navigate("/valuation");
// }}

//     className="hidden md:inline-flex hdrCta bg-[#B87333] text-white px-4 sm:px-6 py-2.5 rounded-md text-[11px] sm:text-sm font-bold tracking-wide hover:bg-[#a6682e] hover:shadow-lg active:scale-95 whitespace-nowrap"
//   >
//     Get Started
//   </button>
// </div>

//         </div>

//         {/* Mobile spacing tweaks (unchanged) */}
//         <style>{`
//           @media (max-width: 420px){
//             .hdrWrap{
//               padding-left: 10px !important;
//               padding-right: 10px !important;
//               gap: 8px !important;
//             }

//             .hdrLogo h1{
//               font-size: 18px !important;
//               letter-spacing: -0.02em !important;
//             }

//             .hdrPricing{
//               padding: 6px 10px !important;
//               font-size: 9px !important;
//               letter-spacing: 0.16em !important;
//             }

//             .hdrCta{
//               padding: 9px 12px !important;
//               font-size: 10px !important;
//             }
//           }

//           @media (max-width: 360px){
//             .hdrWrap{ gap: 6px !important; }

//             .hdrPricing{
//               padding: 6px 8px !important;
//               letter-spacing: 0.12em !important;
//             }

//             .hdrCta{
//               padding: 8px 10px !important;
//               font-size: 10px !important;
//             }
//           }
//         `}</style>
//       </header>

//       <div className="h-20" />
//     </>
//   );
// }


// function Header() {
//   const navigate = useNavigate();
//   const location = useLocation();

//   const current = location.pathname;

//   const [user, setUser] = useState(null);

//   useEffect(() => {
//     supabase.auth.getSession().then(({ data }) => {
//       setUser(data.session?.user ?? null);
//     });

//     const { data: listener } = supabase.auth.onAuthStateChange(
//       (_event, session) => {
//         setUser(session?.user ?? null);
//       }
//     );

//     return () => {
//       listener.subscription.unsubscribe();
//     };
//   }, []);

//   const navItems = [
//     // { label: "PRICING", path: "/pricing" },
//     { label: "RESOURCES", path: "/blogs" },
//   ];

//   return (
//     <>
//       <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-[#D4D4D4] bg-white">
//         <div className="hdrWrap max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-2 sm:gap-4 flex-nowrap">

//           {/* Logo */}
//           <div
//             className="hdrLogo flex items-center cursor-pointer shrink-0 whitespace-nowrap"
//             onClick={() => {
//               trackEvent("nav_click", { item: "logo" });
//               navigate("/");
//             }}
//           >
//             <h1 className="text-xl sm:text-2xl font-black tracking-tighter uppercase whitespace-nowrap">
//               <span style={{ color: "#B87333" }}>ACQ</span>
//               <span style={{ color: "#111111" }}>AR</span>
//             </h1>
//           </div>

//           {/* ── MOBILE: Pricing + Resources + Signal ── */}
//           <div className="md:hidden flex items-center gap-1">
//             {/* <button
//               onClick={() => {
//                 trackEvent("nav_click", { item: "pricing" });
//                 navigate("/pricing");
//               }}
//               className={`text-[9px] font-black uppercase tracking-[0.15em] px-2 py-1.5 rounded-full whitespace-nowrap ${
//                 current === "/pricing"
//                   ? "text-[#B87333] underline underline-offset-4"
//                   : "text-[#2B2B2B]/70"
//               }`}
//             >
//               PRICING
//             </button> */}


// <a
//               href="http://www.acqar.com/"
//               target="_blank"
//               rel="noopener noreferrer"
//               className="text-[9px] font-black uppercase tracking-[0.15em] px-2 py-1.5 rounded-full whitespace-nowrap text-[#2B2B2B]/70"
//               style={{ textDecoration: 'none' }}
//             >
//               SIGNAL™
//             </a>
//             <button
//               onClick={() => {
//                 trackEvent("nav_click", { item: "resources" });
//                 navigate("/blogs");
//               }}
//               className={`text-[9px] font-black uppercase tracking-[0.15em] px-2 py-1.5 rounded-full whitespace-nowrap ${
//                 current === "/blogs"
//                   ? "text-[#B87333] underline underline-offset-4"
//                   : "text-[#2B2B2B]/70"
//               }`}
//             >
//               RESOURCES
//             </button>

//             {/* Mobile Signal */}
//             {/* <a
//               href="http://www.acqar.com/"
//               target="_blank"
//               rel="noopener noreferrer"
//               className="text-[9px] font-black uppercase tracking-[0.15em] px-2 py-1.5 rounded-full whitespace-nowrap text-[#2B2B2B]/70"
//               style={{ textDecoration: 'none' }}
//             >
//               SIGNAL™
//             </a> */}
//           </div>

//           {/* ── DESKTOP nav ── */}
//           <nav className="hidden md:flex items-center gap-10">
            

//             {/* Desktop Signal */}
//             <a
//               href="http://www.acqar.com/"
//               target="_blank"
//               rel="noopener noreferrer"
//               onClick={() => trackEvent("Nav", "Click", "Signal")}
//               className="text-sm font-semibold tracking-wide transition-colors hover:text-[#B87333] whitespace-nowrap text-[#2B2B2B]"
//               style={{ textDecoration: 'none' }}
//             >
//             SIGNAL™
//             </a>

//             {navItems.map((item) => (
//               <button
//                 key={item.label}
//                 onClick={() => {
//                   trackEvent("Nav", "Click", item.label);
//                   navigate(item.path);
//                 }}
//                 className={`text-sm font-semibold tracking-wide transition-colors hover:text-[#B87333] whitespace-nowrap ${
//                   current === item.path ? "text-[#B87333]" : "text-[#2B2B2B]"
//                 }`}
//               >
//                 {item.label}
//               </button>
//             ))}
//           </nav>

//           {/* ── Right buttons ── */}
//           <div className="hdrRight flex items-center gap-2 sm:gap-4 shrink-0 flex-nowrap">
//             {user ? (
//               <button
//                 onClick={() => navigate("/dashboard")}
//                 className="bg-[#B87333] text-white px-4 sm:px-6 py-2.5 rounded-md text-[11px] sm:text-sm font-bold tracking-wide hover:bg-[#a6682e] hover:shadow-lg active:scale-95 whitespace-nowrap"
//               >
//                 Dashboard
//               </button>
//             ) : (
//               <button
//                 onClick={() => {
//                   trackEvent("nav_click", { item: "login" });
//                   navigate("/login");
//                 }}
//                 className="bg-[#B87333] text-white px-4 sm:px-6 py-2.5 rounded-md text-[11px] sm:text-sm font-bold tracking-wide hover:bg-[#a6682e] hover:shadow-lg active:scale-95 whitespace-nowrap"
//               >
//                 Sign In
//               </button>
//             )}

//             {/* Desktop only: Get Started */}
//             {/* <button
//               onClick={() => {
//                 trackEvent("valuation_start", { location: "header" });
//                 navigate("/valuation");
//               }}
//               className="hidden md:inline-flex hdrCta bg-[#B87333] text-white px-4 sm:px-6 py-2.5 rounded-md text-[11px] sm:text-sm font-bold tracking-wide hover:bg-[#a6682e] hover:shadow-lg active:scale-95 whitespace-nowrap"
//             >
//               Get Started
//             </button> */}
//           </div>

//         </div>

//         <style>{`
//           @media (max-width: 420px) {
//             .hdrWrap {
//               padding-left: 10px !important;
//               padding-right: 10px !important;
//               gap: 4px !important;
//             }
//             .hdrLogo h1 {
//               font-size: 17px !important;
//               letter-spacing: -0.02em !important;
//             }
//             .hdrCta {
//               padding: 9px 12px !important;
//               font-size: 10px !important;
//             }
//           }

//           @media (max-width: 360px) {
//             .hdrWrap { gap: 3px !important; }
//             .hdrCta {
//               padding: 8px 10px !important;
//               font-size: 10px !important;
//             }
//           }
//         `}</style>
//       </header>

//       <div className="h-20" />
//     </>
//   );
// }





/* ──────────────────────────────────────
   PROPERTY CARD (shared between hero columns)
────────────────────────────────────── */
function PropertyCard() {
  return (
    <div className="relative w-full px-4 sm:px-0 sm:max-w-[520px] sm:mx-auto">
      {/* soft glow */}
      <div
        className="absolute -inset-3 sm:-inset-4 rounded-[28px] sm:rounded-[32px]"
        style={{
          background: "rgba(43,43,43,0.05)",
          filter: "blur(28px)",
        }}
      />

      <div
        className="
          soft-shadow relative w-full bg-white
          border border-[rgba(212,212,212,0.35)]
          rounded-3xl sm:rounded-2xl
          overflow-hidden sm:overflow-visible
          px-4 py-4 sm:p-7
        "
      >
        {/* Card header */}
        <div className="flex items-start justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            {/* icon box */}
            <div
              className="w-11 h-11 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(43,43,43,0.09)" }}
            >
              <Icon name="analytics" />
            </div>

            <div>
              {/* ✅ Mobile: keep Palm Jumeirah on ONE line, Villa second line */}
              <p className="font-bold text-[15px] sm:text-sm text-[var(--primary)] leading-tight">
                <span className="block whitespace-nowrap">Palm Jumeirah</span>
                <span className="block">Villa</span>
              </p>

              {/* ✅ Never wrap ID */}
              <p className="text-[11px] sm:text-[12px] text-[rgba(43,43,43,0.40)] whitespace-nowrap">
                ID: ACQ-7721-DUBAI
              </p>
            </div>
          </div>

          {/* LIVE badge */}
          {/* LIVE badge (mobile exactly like 1st screenshot) */}
<span
  className="
    rounded-full
    text-[11px] sm:text-[10px]
    font-extrabold uppercase tracking-[0.12em]
    text-[var(--primary)]
    px-5 py-2 sm:px-3 sm:py-1.5
    leading-[1.05] text-center
  "
  style={{ background: "rgba(212,212,212,0.85)" }}
>
  <span className="block sm:hidden">LIVE</span>
  <span className="block sm:hidden">ANALYSIS</span>
  <span className="hidden sm:inline">Live Analysis</span>
</span>

        </div>

        {/* Value */}
        <div className="mb-4 sm:mb-5">
          <p className="text-[10px] sm:text-[9px] uppercase font-extrabold tracking-[0.18em] text-[rgba(43,43,43,0.40)] mb-1">
            Estimated Value
          </p>

          {/* ✅ Mobile: keep AED + number on ONE line always */}
          <h3
            className="font-black text-[var(--primary)] tracking-[-0.02em] leading-[1.02] whitespace-nowrap"
            style={{
              fontSize: "clamp(34px, 9.2vw, 44px)", // ✅ responsive, prevents wrap
            }}
          >
            AED 4,250,000
          </h3>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 gap-3 mb-4 sm:mb-5">
          <div className="rounded-2xl sm:rounded-xl p-4 sm:p-3.5 bg-[var(--bg-off-white)]">
            <p className="text-[10px] sm:text-[9px] uppercase font-extrabold tracking-[0.12em] text-[rgba(43,43,43,0.40)] mb-2">
              Investment Score
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-2xl font-black text-[var(--primary)]">
                87
              </span>
              <span className="text-sm sm:text-xs text-[rgba(43,43,43,0.40)]">
                / 100
              </span>
            </div>
          </div>

          <div className="rounded-2xl sm:rounded-xl p-4 sm:p-3.5 bg-[var(--bg-off-white)]">
            <p className="text-[10px] sm:text-[9px] uppercase font-extrabold tracking-[0.12em] text-[rgba(43,43,43,0.40)] mb-2">
              Market Volatility
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-lg font-black text-[var(--primary)]">
                Low
              </span>
              <Icon name="trending_down" size="sm" />
            </div>
          </div>
        </div>

        {/* Bar chart (straight tops) */}
        <div
          className="
            bg-[var(--bg-off-white)]
            flex items-end
            px-3 sm:px-1
            gap-2 sm:gap-1
            mb-4 sm:mb-5
            h-[95px] sm:h-[88px]
            rounded-2xl sm:rounded-lg
          "
        >
          {[
            ["38%", "rgba(43,43,43,0.10)"],
            ["50%", "rgba(43,43,43,0.12)"],
            ["40%", "rgba(43,43,43,0.10)"],
            ["70%", "rgba(43,43,43,0.35)"],
            ["62%", "rgba(184,115,51,0.55)"],
            ["82%", "rgba(43,43,43,0.55)"],
            ["92%", "var(--primary)"],
          ].map(([h, bg], i) => (
            <div
              key={i}
              className="flex-1"          // ✅ no rounded corners (straight top)
              style={{ height: h, background: bg }}
            />
          ))}
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between pt-4 border-t border-[rgba(212,212,212,0.30)]">
          <div className="flex items-center gap-2">
            <Icon name="history" size="sm" />
            <span className="text-[10px] sm:text-[9px] font-extrabold text-[rgba(43,43,43,0.35)] uppercase tracking-[0.18em] whitespace-nowrap">
              GENERATED IN 5S
            </span>
          </div>

          <button
            className="text-[12px] sm:text-[12px] font-bold text-[var(--primary)] bg-transparent border-0 cursor-pointer flex items-center gap-2 whitespace-nowrap"
            style={{ fontFamily: "'Inter',sans-serif" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-copper)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--primary)")}
          >
            Download PDF <Icon name="download" size="sm" />
          </button>
        </div>

        {/* ✅ RICS badge on MOBILE: smaller + bottom-right like screenshot */}
        {/* ✅ RICS badge on MOBILE: bottom-right, small, like 1st screenshot */}
<div
  className="
    sm:hidden
    absolute right-3 bottom-3
    bg-white
    border border-[rgba(212,212,212,0.30)]
    rounded-2xl
    px-3 py-2.5
    flex items-center gap-3
  "
  style={{
    boxShadow: "0 8px 28px rgba(0,0,0,0.10)",
    width: 230,               // ✅ fixed width to prevent centering / stretching
  }}
>
  <div
    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
    style={{ background: "var(--accent-copper)" }}
  >
    <Icon name="verified" size="xs" />
  </div>

  <p className="text-[11px] font-medium leading-snug text-[var(--primary)]">
    Institutional Quality RICS-Standard AI
  </p>
</div>

      </div>

      {/* Desktop badge stays same */}
      <div
        className="hidden sm:flex absolute -bottom-5 -right-4 bg-white border border-[rgba(212,212,212,0.30)] rounded-xl px-3 py-3 items-center gap-3 max-w-[170px]"
        style={{ boxShadow: "0 8px 28px rgba(0,0,0,0.10)" }}
      >
        <div className="w-8 h-8 rounded-full bg-[var(--accent-copper)] flex items-center justify-center shrink-0">
          <Icon name="verified" size="xs" />
        </div>
        <p className="text-[10px] font-medium leading-snug text-[var(--primary)]">
          Institutional Quality RICS-Standard AI
        </p>
      </div>
    </div>
  );
}



/* ──────────────────────────────────────
   HERO
────────────────────────────────────── */
function Hero() {
  const navigate = useNavigate();

  return (
    <section
      className="hero-section"
      style={{
        paddingTop: 0,
        paddingBottom: 24,
      }}
    >
      <div className="architectural-lines" />

      <div className="container">
        <div className="hero-grid" style={{ marginTop: 0 }}>
          {/* ── LEFT TEXT ── */}
          <div className="hero-left" style={{ marginTop: 0, paddingTop: 0 }}>
            {/* Pill badge */}
            <div
              style={{
                marginTop: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 14px",
                background: "rgba(184,115,51,0.1)",
                border: "1px solid rgba(184,115,51,0.22)",
                borderRadius: 9999,
                width: "fit-content",
              }}
            >
              <span
                className="pulse"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--accent-copper)",
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  fontSize: ".625rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: ".16em",
                  color: "var(--accent-copper)",
                }}
              >
                Where Dreams Meet Data
              </span>
            </div>

            {/* ✅ HEADLINE UPDATED (mobile matches your 2nd screenshot) */}
            <h1 className="hero-headline" style={{ marginTop: 10 }}>
              {/* Desktop text (unchanged look) */}
              <span className="hero-headline-desktop">
                See The Future.<br />
                <span className="gradient-text">Invest With Certainty.</span>
              </span>

              {/* Mobile text (forced lines like screenshot) */}
              <span className="hero-headline-mobile">
                <span>See The</span>
                <span>Future.</span>
                <span className="gradient-text">Invest With</span>
                <span className="gradient-text">Certainty.</span>
              </span>
            </h1>

            {/* Subtext */}
            <p
              style={{
                marginTop: 10,
                fontSize: "1.1rem",
                color: "rgba(43,43,43,0.62)",
                lineHeight: 1.7,
              }}
            >
              Enterprise-grade property intelligence for modern investors. Institutional accuracy, real-time data, and
              instant transparency.
            </p>

            {/* CTA + Social proof */}
            <div className="hero-mobile-stack">
              <button
                className="btn-copper hero-cta-btn hero-cta-full"
                onClick={() => {
    trackEvent("valuation_start", { location: "hero" });
    navigate("/valuation");
  }}
  

                style={{ padding: "18px 28px", fontSize: "1rem" }}
              >
                Get Your Free Valuation <Icon name="arrow_forward" />
              </button>

              <div
                className="hero-social-pill hero-social-full"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  border: "1px solid var(--gray-light)",
                  borderRadius: 14,
                  background: "#fff",
                }}
              >
                <div style={{ display: "flex" }}>
                  {[
                    "AB6AXuA1AfKa0TeL3cutDm2oORjvyJfaZ4sWKjqoymij-VUfwqkb45DX_8i2TZxTL5iJwibp3eJhiolBRUnVXZJLyLX6ngOHCGgzJySTVCswUzMNX1SXHMpZaqBWe94zpXJjaCSWAFGAHlvIe2TLAgoei80lt5n1ecefPDbNqUPHJ2d3kDXpU3i6tSWHaa1SxdUWHu12D1w2VM1cggHgyKK3zb1QAnEf7D-QPEiZK5hKc9TxAPyVm9ofoWHgwoFP68S1Wzs-HgyJ_KEzQfw",
                    "AB6AXuC6t4ms24nlSJb-UnR35BnGcMuHPPgXWLkF3m44dIr8GjwERYw9AtbnnI1EYqkXR3iECnKAyYFkFNau6QJGMOJCJHngAyyXIgjJcUF_PZPb-h41AYfwYA5es1lWZyctwVgdWK3HxpAHArohK4Pp4xjd0YSW_h39WyReIqHcZl8XlOevIqbNEFV0NIWvXS_SSHPJGqNV3ofaJu4pp2BfXm9Q1AlrS9ix-UJq7kjpP8-mHnNMSrvMpf0JeOIrGzH_8GkB0N3xLu_rQ3I",
                  ].map((id, i) => (
                    <img
                      key={i}
                      src={`https://lh3.googleusercontent.com/aida-public/${id}`}
                      alt=""
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        border: "2px solid #fff",
                        marginRight: i === 0 ? -10 : 0,
                        objectFit: "cover",
                      }}
                    />
                  ))}
                </div>
                <div>
                  <p style={{ fontSize: ".95rem", fontWeight: 800, color: "var(--primary)", lineHeight: 1.1 }}>
                    2,400+
                  </p>
                  <p style={{ fontSize: ".8rem", color: "rgba(43,43,43,0.45)" }}>Active Investors</p>
                </div>
              </div>

              {/* <div className="hero-card-mobile">
                <PropertyCard />
              </div> */}

              
{/* <div className="hero-card-mobile" style={{ 
  lineHeight: 0,
  overflow: "hidden",
  borderRadius: "24px"
}}>
  <img
    src="/hero.png"
    alt="Property"
    style={{
      width: "110%",
      height: "290px",
      marginLeft: "-1%",
      objectFit: "cover",
      objectPosition: "center center",
      display: "block"
    }}
  />
</div> */}



<div className="hero-card-mobile" style={{ 
  lineHeight: 0,
  overflow: "hidden",
  borderRadius: "20px",
  transition: "filter 0.4s ease, transform 0.4s ease",
  filter: "drop-shadow(0px 0px 24px rgba(184,115,51,0.35))"
}}
  onMouseEnter={e => {
    e.currentTarget.style.filter = "drop-shadow(0px 0px 40px rgba(184,115,51,0.55))"
    e.currentTarget.style.transform = "translateY(-4px)"
  }}
  onMouseLeave={e => {
    e.currentTarget.style.filter = "drop-shadow(0px 0px 24px rgba(184,115,51,0.35))"
    e.currentTarget.style.transform = "translateY(0px)"
  }}
>
  <img
    src="/hero.png"
    alt="Property"
    style={{
      width: "110%",
      height: "290px",
      marginLeft: "-1%",
      objectFit: "cover",
      objectPosition: "center center",
      display: "block"
    }}
  />
</div>

            </div>
          </div>

          {/* ── RIGHT: Card (desktop only) ── */}
          {/* <div className="hero-right-col">
            <PropertyCard />


          </div> */}

          {/* <div className="hero-right-col" style={{ 
  display: "flex", 
  alignItems: "stretch",
  overflow: "hidden",
  borderRadius: "24px"
}}>
  <img
    src="/hero.png"
    alt="Property"
    style={{
      width: "110%",
      height: "110%",
      minHeight: "480px",
      marginLeft: "-1%",
      marginTop: "-2%",
      objectFit: "cover",
      objectPosition: "center center",
      display: "block"
    }}
  />
</div> */}



{/* <div className="hero-right-col" style={{ 
  display: "flex", 
  alignItems: "stretch",
  overflow: "hidden",
  borderRadius: "24px"
}}>
  <img
    src="/hero.png"
    alt="Property"
    style={{
      width: "110%",
      height: "110%",
      minHeight: "480px",
      marginLeft: "-1%",
      marginTop: "-2%",
      objectFit: "cover",
      objectPosition: "center center",
      display: "block",
      // filter: "drop-shadow(0px 6px 6px rgba(184,115,51,0.20))"
filter: "drop-shadow(0px 0px 24px rgba(184,115,51,0.35))"

      
    }}
  />
</div> */}


<div className="hero-right-col" style={{ 
  display: "flex", 
  alignItems: "stretch",
  overflow: "hidden",
  borderRadius: "24px",
  transition: "filter 0.4s ease, transform 0.4s ease"
}}
  onMouseEnter={e => {
    e.currentTarget.style.filter = "drop-shadow(0px 0px 40px rgba(184,115,51,0.55))"
    e.currentTarget.style.transform = "translateY(-4px)"
  }}
  onMouseLeave={e => {
    e.currentTarget.style.filter = "drop-shadow(0px 0px 24px rgba(184,115,51,0.35))"
    e.currentTarget.style.transform = "translateY(0px)"
  }}
>
  <img
    src="/hero.png"
    alt="Property"
    style={{
      width: "110%",
      height: "110%",
      minHeight: "480px",
      marginLeft: "-1%",
      marginTop: "-2%",
      objectFit: "cover",
      objectPosition: "center center",
      display: "block"
    }}
  />
</div>




        </div>

     {/* Trust bar */}
<div
  className="trust-bar"
  style={{
    marginTop: 30,

    // ✅ desktop (keep as-is)
    padding: "22px 28px",
    border: "1px solid #cfd8e3",
    borderRadius: 12,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 40,
    background: "#f7f9fc",
    width: "100%",
    maxWidth: "97%",
  }}
>
  {[
    ["check_circle", "100% Independent"],
    ["check_circle", "10,000+ Valuations"],
    ["check_circle", "RICS-Aligned"],
  ].map(([icon, label]) => (
    <div
      key={label}
      className="trust-item"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <Icon name={icon} size="sm" />
      <span
        style={{
          fontSize: "0.78rem",
          fontWeight: 600,
          color: "var(--primary)",
        }}
      >
        {label}
      </span>
    </div>
  ))}

  {/* ✅ MOBILE ONLY OVERRIDES (desktop untouched) */}
<style>{`
/* MOBILE + TABLET */
@media (max-width:1024px){

/* increase gap between first and second item */
  .trust-item:nth-child(1){
    margin-right: 8px !important;
  }

  .trust-item:nth-child(2){
    margin-left: 6px !important;
  }

  .trust-bar{
    width:100% !important;
    max-width:100% !important;
    box-sizing:border-box !important;

    height:56px !important;
    padding:0 14px !important;

    border:1.5px solid #bcd4ff !important;
    border-radius:18px !important;
    background:#f7f9fc !important;

    display:flex !important;
    align-items:center !important;
    justify-content:space-between !important;

    gap:6px !important;
    overflow:hidden !important;     /* no scroll */
  }

  .trust-item{
    display:flex !important;
    align-items:center !important;
    justify-content:center !important;
    gap:5px !important;

    flex:1 1 0 !important;          /* equal width */
    min-width:0 !important;         /* allow shrink */
    white-space:nowrap !important;
  }

  .trust-item span{
    font-size:clamp(0.60rem, 2.1vw, 0.82rem) !important;
    font-weight:700 !important;
    line-height:1 !important;
    white-space:nowrap !important;
  }

  .trust-item svg,
  .trust-item .icon{
    width:clamp(13px, 2.2vw, 18px) !important;
    height:clamp(13px, 2.2vw, 18px) !important;
    flex:0 0 auto !important;
  }
}

/* SMALL PHONES (≤420px) */
@media (max-width:420px){

  .trust-bar{
    height:52px !important;
    padding:0 10px !important;
    gap:4px !important;
  }

  .trust-item span{
    font-size:clamp(0.55rem, 2.8vw, 0.72rem) !important;
  }
}

/* VERY SMALL PHONES (≤360px) */
@media (max-width:360px){

  .trust-bar{
    height:50px !important;
    padding:0 8px !important;
    gap:3px !important;
  }

  .trust-item span{
    font-size:0.58rem !important;
  }
}
`}</style>





</div>


      </div>

      {/* ✅ Responsive rules */}
      <style>{`
        .hero-right-col { position: relative; }

        .hero-mobile-stack {
          margin-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .hero-cta-full { width: auto; }
        .hero-social-full { width: fit-content; }
        .hero-card-mobile { display: none; }

        /* ✅ Headline switching */
        .hero-headline-mobile { display: none; }
        .hero-headline-desktop { display: inline; }

        @media (max-width: 1024px) {
          .hero-right-col { display: none !important; }

          .hero-cta-full { width: 100% !important; border-radius: 14px !important; }
          .hero-social-full { width: 100% !important; border-radius: 14px !important; }

          .hero-card-mobile { display: block !important; margin-top: 6px; }

          /* ✅ Mobile headline exactly like screenshot */
          .hero-headline-desktop { display: none !important; }
          .hero-headline-mobile { display: inline !important; }

          .hero-headline-mobile span {
            display: block;
            line-height: 0.95;
          }

          .hero-headline {
            font-size: 3.15rem !important;
            letter-spacing: -0.03em !important;
          }
        }
      `}</style>
    </section>
  );
}



/* ──────────────────────────────────────
   HOW IT WORKS
────────────────────────────────────── */
function HowItWorks() {
  const navigate = useNavigate();

  const steps = [
    { icon: "feed",          n: "1", title: "Enter Details",     desc: "Property location, size, and features.",          tag: "INPUT DATA" },
    { icon: "memory",        n: "2", title: "AI Analysis",       desc: "Comp selection, market signals, RICS standards",  tag: "PROCESSING ENGINE" },
    { icon: "auto_awesome",  n: "3", title: "Instant Valuation", desc: "Accurate value, confidence score, hidden costs",  tag: "60 SECONDS", star: true },
    { icon: "file_download", n: "4", title: "Actionable Report", desc: "Investment grade, shareable PDF, API-ready!",     tag: "VALUE OUTPUT" },
  ];

  return (
    <section style={{ padding: "88px 0", background: "var(--bg-off-white)" }}>
      <div className="container">
        <div style={{ textAlign: "center", maxWidth: 500, margin: "0 auto 56px" }}>
          <h2 style={{ fontSize: "1.875rem", fontWeight: 900, color: "var(--primary)", marginBottom: 14 }}>
            How TruValu™ Works
          </h2>
          <p style={{ color: "rgba(43,43,43,0.6)", lineHeight: 1.65 }}>
            From property input to investment intelligence in 60 seconds.
          </p>
        </div>

        {/* Video placeholder
        <div style={{ marginBottom: 68 }}>
          <div
            style={{
              position: "relative",
              maxWidth: "56rem",
              margin: "0 auto",
              aspectRatio: "16/9",
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: "0 22px 55px rgba(0,0,0,0.24)",
              background: "var(--primary)",
              cursor: "pointer",
            }}
          >
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7qkQArw2TmVGHNN9bcf75S4yDTxSbb9X-TVkQ26MW3akEDTfYgjcPNAMwG0SkcAG8hSo9OwHLiOE94qYlTvYTFMlaoEZG2KFf7HYeXlo9jc2_nMQde_AR3wiRHtiEFrFHqytfb2XyHe3friA06okLMLV8xm2Oit_9jwxLue01sF6BEh6WrXRZbTV2GWkZyyvk_jcA3pwdJZvF65ddn9KLcEcirbxK6jPC2I0AkMIwxtpevnSSzfsJNaFGb2aJJWdiuwnxgkbMzq0"
              alt="Dubai skyline"
              style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.5 }}
            />

            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div
                style={{
                  width: 92,
                  height: 92,
                  background: "rgba(255,255,255,0.18)",
                  backdropFilter: "blur(10px)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(255,255,255,0.28)",
                }}
              >
                <div
                  style={{
                    width: 76,
                    height: 76,
                    background: "#fff",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 34, color: "var(--primary)" }}>
                    play_arrow
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div> */}

        {/* Step cards */}
        <div className="steps-grid">
          {steps.map((s) => (
            <div
              key={s.n}
              style={{
                background: "#fff",
                padding: 28,
                borderRadius: 14,
                border: s.star ? "1px solid var(--accent-copper)" : "1px solid var(--gray-light)",
                boxShadow: s.star ? "0 0 0 4px rgba(184,115,51,.06)" : "none",
                position: "relative",
                transition: "border-color .2s",
              }}
              onMouseEnter={(e) => {
                if (!s.star) e.currentTarget.style.borderColor = "var(--accent-copper)";
              }}
              onMouseLeave={(e) => {
                if (!s.star) e.currentTarget.style.borderColor = "var(--gray-light)";
              }}
            >
              {s.star && (
                <div
                  style={{
                    position: "absolute",
                    top: 14,
                    right: 14,
                    background: "white",
                    color: "var(--accent-copper)",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: ".5rem",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: ".05em",
                  }}
                >
                  Instant
                </div>
              )}

              <div
                style={{
                  width: 46,
                  height: 46,
                  background: "rgba(226, 215, 215, 0.6)",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                }}
              >
                {/* ✅ FIX: Material Symbols icon + correct color on star card */}
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 22,
                    color:  "black",
                  }}
                >
                  {s.icon}
                </span>
              </div>

              <h5 style={{ fontSize: "1.0625rem", fontWeight: 700, marginBottom: 8, color: "var(--primary)" }}>
                {s.n}. {s.title}
              </h5>

              <p
                style={{
                  fontSize: ".875rem",
                  color: "rgba(43,43,43,0.6)",
                  lineHeight: 1.6,
                  fontWeight: s.star ? 600 : 400,
                }}
              >
                {s.desc}
              </p>

              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f3f3f3" }}>
                <span
                  style={{
                    fontSize: ".5625rem",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: ".15em",
                    color: s.star ? "var(--accent-copper)" : "rgba(43,43,43,0.4)",
                  }}
                >
                  {s.tag}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            className="btn-copper"
            onClick={() => {
  trackEvent("CTA", "Click", "HowItWorks - Get My Free Valuation Now");
  navigate("/valuation");
}}

            style={{ padding: "18px 38px", fontSize: "1.0625rem" }}
          >
            Get My Free Valuation Now{" "}
            <span className="material-symbols-outlined" style={{ fontSize: 20, marginLeft: 8 }}>
              arrow_forward
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────
   TESTIMONIALS
────────────────────────────────────── */
const TESTIMONIALS = [
  { name:"Ahmed Al Mansouri", role:"Chairman, ALM International",   quote:"ACQAR provides the kind of certainty usually reserved for institutional funds. In 60 seconds, I had a valuation that matched my appraiser's 5-day study.", img:"https://picsum.photos/200/200?random=10" },
  { name:"Sarah J.",          role:"Private Wealth Manager",         quote:"The precision is unmatched in the Dubai market. It's now our primary tool for quarterly portfolio rebalancing and client reporting.",                       img:"https://picsum.photos/200/200?random=11" },
  { name:"Julian Chen",       role:"PE Associate, Global Capital",   quote:"We've reduced our appraisal timelines by 80% using TruValu™ technology. The market speed requires tools like this to close high-ticket deals.",            img:"https://picsum.photos/200/200?random=12" },
  // { name:"Elena Rodriguez",   role:"Luxury Property Investor",       quote:"Finally, a platform that understands the nuances of prime real estate. The DealLens analysis saved me from a significantly overpriced acquisition.",         img:"https://picsum.photos/200/200?random=13" },
  { name:"Marcus Thorne",     role:"Portfolio Director",             quote:"Institutional-grade data at your fingertips. ACQAR has fundamentally changed how we evaluate exit opportunities in the Palm Jumeirah area.",                 img:"https://picsum.photos/200/200?random=14" },
  { name:"Fatima Al Sayed",   role:"Real Estate Developer",          quote:"The RICS-aligned intelligence gives our international investors the confidence they need in the Dubai market. Indispensable tool.",                           img:"https://picsum.photos/200/200?random=15" },
];

function TCard({ t }) {
  return (
    <div className="tcard" style={{ width:308, flexShrink:0, padding:26, background:"#fff", borderRadius:14, border:"1px solid rgba(212,212,212,0.35)", boxShadow:"0 3px 14px rgba(0,0,0,0.05)", margin:"0 10px" }}>
      <div style={{ display:"flex", gap:3, marginBottom:14, color:"var(--accent-copper)" }}>
        {[1,2,3,4,5].map(i => <Icon key={i} name="star" fill size="sm" />)}
      </div>
      <p style={{ fontSize:".875rem", fontStyle:"italic", color:"rgba(43,43,43,0.7)", lineHeight:1.65, marginBottom:18, minHeight:80 }}>"{t.quote}"</p>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <img src={t.img} alt={t.name} style={{ width:42, height:42, borderRadius:"50%", objectFit:"cover", border:"2px solid var(--bg-off-white)" }} />
        <div>
          <p style={{ fontWeight:700, fontSize:".8rem", color:"var(--primary)" }}>{t.name}</p>
          <p style={{ fontSize:".6875rem", color:"rgba(43,43,43,0.5)" }}>{t.role}</p>
        </div>
      </div>
    </div>
  );
}

function Testimonials() {
  const doubled = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <section style={{ padding:"88px 0", background:"#fff", borderTop:"1px solid rgba(212,212,212,0.22)", borderBottom:"1px solid rgba(212,212,212,0.22)", overflow:"hidden" }}>
      <div className="container" style={{ marginBottom:52 }}>
      <div
  style={{
    textAlign: "center",
    maxWidth: 900,          // wider for desktop
    margin: "0 auto",
    padding: "0 18px",
  }}
>
  {/* Top small label */}
  <p
    style={{
      margin: 0,
      marginBottom: 14,
      fontSize: "clamp(10px, 1.2vw, 12px)",
      fontWeight: 900,
      letterSpacing: "0.28em",
      textTransform: "uppercase",
      color: "var(--accent-copper)",
    }}
  >
    TRUSTED INTELLIGENCE
  </p>

  {/* Main heading */}
  <h2
    style={{
      margin: 0,
      fontWeight: 900,
      color: "var(--primary)",
      lineHeight: 1.08,
      letterSpacing: "-0.02em",
      fontSize: "clamp(2.1rem, 4.2vw, 3.2rem)", // perfect for desktop + mobile
      marginBottom: 16,
    }}
  >
    Elite Investor Insights
  </h2>

  {/* Sub text */}
  <p
    style={{
      margin: 0,
      color: "rgba(43,43,43,0.55)",
      lineHeight: 1.7,
      fontSize: "clamp(0.95rem, 1.4vw, 1.1rem)",
      maxWidth: 680,
      marginInline: "auto",
    }}
  >
    Why the world's leading property owners rely on ACQAR for precision.
  </p>
</div>


      </div>

      <div className="marquee-wrap">
        <div className="marquee-track">
          {doubled.map((t, i) => <TCard key={i} t={t} />)}
        </div>
      </div>

      {/* Stats block */}
      <div className="container" style={{ marginTop:64 }}>
        <div className="stats-grid">
          {[["10,000+","Valuations Performed"],["4.9 / 5","Investor Rating"],["AED 500M+","Capital Analyzed"]].map(([num,lbl],i) => (
            <div key={lbl} className={i<2 ? "stats-border" : ""} style={{ borderRight: i<2 ? "1px solid rgba(255,255,255,0.1)" : "none", paddingRight: i<2 ? 28 : 0 }}>
              <h6 className="stats-num" style={{ fontSize:"2.25rem", fontWeight:900, color:"#fff", marginBottom:8, textTransform:"uppercase" }}>{num}</h6>
              <p style={{ fontSize:".5625rem", color:"var(--accent-copper)", fontWeight:700, letterSpacing:".16em", textTransform:"uppercase" }}>{lbl}</p>
            </div>
          ))}
        </div>

        {/* Partner logos */}
        
      </div>
    </section>
  );
}


/* ──────────────────────────────────────
   INSIDE EVERY REPORT
────────────────────────────────────── */
function InsideEveryReport() {
  const navigate = useNavigate();

  const reportChips = [
    { icon: "apartment",      n: "01", label: "Property Detail" },
    { icon: "price_check",    n: "02", label: "Estimated Market Value" },
    { icon: "trending_up",    n: "03", label: "Prices & Trends" },
    { icon: "query_stats",    n: "04", label: "AI 6-Month Price Forecast" },
    { icon: "timeline",       n: "05", label: "AI 3-Year Price Forecast" },
    { icon: "tune",           n: "06", label: "Property Features" },
    { icon: "bar_chart",      n: "07", label: "Supply & Demand Chart" },
    { icon: "receipt_long",   n: "08", label: "Recent Sales (DLD Data)" },
    { icon: "verified",       n: "09", label: "Valuation Confidence Score" },
    { icon: "calculate",      n: "10", label: "UAE Transaction Cost Calc" },
  ];

  return (
    <section style={{ padding: "88px 0", background: "#fff", borderTop: "1px solid rgba(212,212,212,0.22)" }}>
      <style>{`
        .ier-chip {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff;
          border-radius: 14px;
          padding: 14px 16px;
          border: 1px solid rgba(212,212,212,0.3);
          font-size: .75rem;
          font-weight: 700;
          color: var(--primary);
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          transition: border-color .2s, box-shadow .2s;
        }
        .ier-chip:hover {
          border-color: rgba(184,115,51,0.4);
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        }
        @media (max-width: 1024px) {
          .ier-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .ier-chips-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="container">

        {/* Header */}
        <div style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 60px" }}>
          <p style={{ fontSize: ".625rem", fontWeight: 900, letterSpacing: ".3em", textTransform: "uppercase", color: "var(--accent-copper)", marginBottom: 14 }}>
            ACQAR TruValu™
          </p>
          <h2 style={{ fontSize: "clamp(2.2rem, 4vw, 3.2rem)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-.02em", color: "var(--primary)", marginBottom: 14, lineHeight: 1.05 }}>
            Inside Every Report
          </h2>
          <p style={{ color: "rgba(43,43,43,0.5)", fontWeight: 500, lineHeight: 1.7, fontSize: ".9375rem" }}>
            10 layers of AI-powered property intelligence — delivered in 60 seconds.
            What used to cost AED 3,500 and 21 days.
          </p>
        </div>

        {/* Two-col layout */}
        <div className="ier-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "start" }}>

          {/* ── LEFT: Mock Report Frame ── */}
          <div style={{ background: "var(--bg-off-white)", borderRadius: 24, padding: 24, border: "1px solid rgba(212,212,212,0.3)", boxShadow: "0 4px 24px rgba(43,43,43,0.08)" }}>

            {/* Report header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(212,212,212,0.3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* <div style={{ width: 28, height: 28, background: "var(--primary)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="architecture" size="xs" style={{ color: "var(--accent-copper)" }} />
                </div> */}
               <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
  <span style={{ fontWeight: 900, fontSize: 13, letterSpacing: "0.12em", lineHeight: 1 }}>
    <span style={{ color: "#B87333" }}>ACQ</span>
    <span style={{ color: "#111111" }}>AR</span>
  </span>
  <span style={{
    display: "inline-flex", alignItems: "center",
    padding: "2px 8px", borderRadius: 4,
    background: "rgba(184,115,51,0.08)",
    border: "1px solid rgba(184,115,51,0.35)",
  }}>
    <span style={{
      fontSize: 10, fontWeight: 700, color: "#B87333",
      letterSpacing: "1.5px", textTransform: "uppercase",
    }}>TRUVALU™</span>
  </span>
</div>
              </div>
              <span style={{ fontSize: ".5rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: ".15em", background: "rgba(184,115,51,0.1)", color: "var(--accent-copper)", border: "1px solid rgba(184,115,51,0.2)", padding: "4px 10px", borderRadius: 999 }}>
                AI Valuation Report
              </span>
            </div>

            {/* Property detail row */}
            <div style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", marginBottom: 12, border: "1px solid rgba(212,212,212,0.2)" }}>
              <p style={{ fontSize: ".5625rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: ".18em", color: "var(--accent-copper)", marginBottom: 4 }}>Property Detail</p>
              <p style={{ fontSize: ".875rem", fontWeight: 700, color: "var(--primary)" }}>2BR Apartment · Downtown Dubai · Burj Khalifa District</p>
              <p style={{ fontSize: ".6875rem", color: "rgba(43,43,43,0.4)", marginTop: 2 }}>Report generated in 58 seconds</p>
            </div>

            {/* Value row */}
            <div style={{ background: "var(--primary)", borderRadius: 14, padding: "16px 18px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: ".5625rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: ".18em", color: "var(--accent-copper)", marginBottom: 4 }}>Estimated Market Value</p>
                <p style={{ fontSize: "1.5rem", fontWeight: 900, color: "#fff" }}>AED 2,450,000</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: ".5625rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: ".18em", color: "rgba(184,115,51,0.7)", marginBottom: 4 }}>Confidence Score</p>
                <p style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--accent-copper)" }}>94%</p>
              </div>
            </div>

            {/* 3-col stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 12 }}>
              {[["Inv. Score", "78/100", "var(--primary)"], ["6-Mo Forecast", "+4.2%", "#16a34a"], ["3-Yr Forecast", "+18.5%", "#16a34a"]].map(([label, val, color]) => (
                <div key={label} style={{ background: "#fff", borderRadius: 12, padding: "12px 10px", textAlign: "center", border: "1px solid rgba(212,212,212,0.2)" }}>
                  <p style={{ fontSize: ".5rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: ".15em", color: "var(--accent-copper)", marginBottom: 4 }}>{label}</p>
                  <p style={{ fontSize: "1.125rem", fontWeight: 900, color }}>{val}</p>
                </div>
              ))}
            </div>

            {/* Bar chart */}
            <div style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", marginBottom: 12, border: "1px solid rgba(212,212,212,0.2)" }}>
              <p style={{ fontSize: ".5625rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: ".18em", color: "var(--accent-copper)", marginBottom: 10 }}>Prices & Trends · Supply & Demand</p>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 48 }}>
                {[["45%","rgba(212,212,212,0.4)"],["55%","rgba(212,212,212,0.4)"],["50%","rgba(212,212,212,0.4)"],["65%","rgba(212,212,212,0.4)"],["60%","rgba(212,212,212,0.4)"],["75%","rgba(184,115,51,0.3)"],["80%","rgba(184,115,51,0.5)"],["85%","rgba(184,115,51,0.7)"],["90%","var(--accent-copper)"],["100%","var(--accent-copper)"]].map(([h, bg], i) => (
                  <div key={i} style={{ flex: 1, height: h, background: bg }} />
                ))}
              </div>
            </div>

            {/* Recent sales */}
            <div style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(212,212,212,0.2)" }}>
              <p style={{ fontSize: ".5625rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: ".18em", color: "var(--accent-copper)", marginBottom: 10 }}>Recent Sales · 3 of 15 comparables</p>
              {[["Unit 1402 · Same floor", "2,380,000"], ["Unit 1808 · Same building", "2,490,000"], ["Unit 902 · Same complex", "2,310,000"]].map(([unit, price]) => (
                <div key={unit} style={{ display: "flex", justifyContent: "space-between", fontSize: ".75rem", fontWeight: 600, color: "rgba(43,43,43,0.6)", marginBottom: 8 }}>
                  <span>{unit}</span>
                  <span style={{ fontWeight: 700, color: "var(--primary)" }}>AED {price}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Feature chips + callout ── */}
          <div>
            <p style={{ fontSize: ".625rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: ".18em", color: "rgba(43,43,43,0.4)", marginBottom: 20 }}>
              All 10 sections included in every report
            </p>

            <div className="ier-chips-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
              {reportChips.map(({ icon, n, label }) => (
                <div key={n} className="ier-chip">
                  <Icon name={icon} fill size="sm" style={{ color: "var(--accent-copper)", flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: ".5625rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: ".15em", color: "var(--accent-copper)", marginBottom: 1 }}>{n}</p>
                    <p style={{ fontSize: ".75rem", fontWeight: 700, color: "var(--primary)" }}>{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* vs Traditional Valuation callout */}
            <div style={{ background: "var(--primary)", borderRadius: 20, padding: "22px 24px", display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
              <Icon name="compare" fill size="lg" style={{ color: "var(--accent-copper)", flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: ".9375rem", fontWeight: 900, color: "#fff", marginBottom: 6 }}>vs. Traditional Valuation</p>
                <p style={{ fontSize: ".75rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.65 }}>
                  A RICS-certified manual valuation delivers similar analysis — in 14–21 days, at AED 3,500 per report. TruValu delivers all 10 sections in 60 seconds at AED 9.90/report on the Pro plan.
                </p>
              </div>
            </div>

            {/* CTA row */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button
                className="btn-copper"
                onClick={() => {
                  trackEvent("CTA", "Click", "InsideReport - Get 3 Reports Free");
                  navigate("/valuation");
                }}
                style={{ padding: "14px 24px", fontSize: ".8125rem" }}
              >
                Get 3 Reports Free <Icon name="arrow_forward" />
              </button>
              <span style={{ fontSize: ".75rem", fontWeight: 700, color: "rgba(43,43,43,0.4)" }}>No card required</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}


/* ──────────────────────────────────────
   CTA SECTION
────────────────────────────────────── */
function CTASection() {
  const navigate = useNavigate();
  return (
    <section style={{ padding:"112px 0", position:"relative", overflow:"hidden", background:"#fff" }}>
      <div className="architectural-lines" />
      <div className="container-xs" style={{ textAlign:"center", position:"relative", zIndex:1 }}>
        <h2 className="cta-headline" style={{ fontSize:"3rem", fontWeight:900, color:"var(--primary)", marginBottom:28, lineHeight:1.2 }}>
          Ready to See Your Property's<br />
          <span style={{ color:"var(--accent-copper)" }}>True Value?</span>
        </h2>
        <p style={{ fontSize:"1.1rem", color:"rgba(43,43,43,0.6)", maxWidth:500, margin:"0 auto 44px", lineHeight:1.7 }}>
          Join 10,000+ property owners who discovered their property's complete investment potential with ACQAR's TruValu™ analysis.
        </p>
        <div className="cta-btn-row" style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:20, flexWrap:"wrap" }}>
          <button
  className="btn-copper"
  style={{
    fontSize: "18px",
    padding: "15px 30px",
    borderRadius: "14px",
    minHeight: "56px",
    fontWeight: 700
  }}
  onClick={() => {
    trackEvent("CTA", "Click", "CTASection - Get My Free Valuation Now");
    navigate("/valuation");
  }}
>
  Get My Free Valuation Now <Icon name="arrow_forward" />
</button>
          <button
  className="btn-outline"
  style={{
    fontSize: "18px",
    padding: "18px 30px",
    borderRadius: "14px",
    minHeight: "56px",
    fontWeight: 700
  }}
  onClick={() => {
    trackEvent("CTA", "Click", "CTASection - Talk to an Expert");
    // navigate("/contact") or open modal etc.
  }}
>
  Talk to an Expert
</button>
        </div>
        <p style={{ marginTop:28, fontSize:".75rem", color:"rgba(43,43,43,0.4)", fontWeight:700, textTransform:"uppercase", letterSpacing:".12em" }}>
          Results in 60 Seconds • 100% Secure • No Credit Card Required
        </p>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────
   FOOTER
────────────────────────────────────── */
/* ── FOOTER ── */
// function Footer() {
//   const navigate = useNavigate();

//   return (
//     <>
//       <style>{`
//         .acq-footer-new {
//           position: relative;
//           background: #F5F5F4;
//           border-top: 1px solid rgba(10,10,10,0.06);
//           font-family: 'Inter', sans-serif;
//         }
//         .acq-footer-new .copper-line {
//           position: absolute;
//           top: 0; left: 0; right: 0;
//           height: 1px;
//           background: linear-gradient(90deg, transparent 0%, #B87333 35%, #B87333 65%, transparent 100%);
//         }
//         .acq-footer-new .inner {
//           max-width: 80rem;
//           margin: 0 auto;
//           padding: 48px 80px 32px;
//         }
//         .acq-footer-new .main-grid {
//           display: grid;
//           grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
//           gap: 48px;
//           margin-bottom: 48px;
//         }
//         .acq-footer-new .col-heading {
//           display: flex;
//           align-items: center;
//           gap: 8px;
//           margin-bottom: 24px;
//         }
//         .acq-footer-new .col-heading-dot {
//           width: 4px; height: 4px;
//           border-radius: 50%;
//           background: #B87333;
//           opacity: 0.7;
//         }
//         .acq-footer-new .col-heading h6 {
//           font-size: 11px;
//           font-weight: 900;
//           text-transform: uppercase;
//           letter-spacing: 0.28em;
//           color: #0A0A0A;
//           margin: 0;
//         }
//         .acq-footer-new ul {
//           list-style: none;
//           padding: 0; margin: 0;
//           display: flex;
//           flex-direction: column;
//           gap: 16px;
//         }
//         .acq-footer-new ul li {
//           font-size: 11.5px;
//           font-weight: 600;
//           color: rgba(10,10,10,0.55);
//           cursor: pointer;
//           transition: color 0.2s;
//         }
//         .acq-footer-new ul li:hover { color: #B87333; }
//         .acq-footer-new ul li.muted {
//           color: rgba(10,10,10,0.2);
//           cursor: default;
//         }
//         .acq-footer-new .soon-badge {
//           padding: 1px 6px;
//           font-size: 8px;
//           font-weight: 900;
//           text-transform: uppercase;
//           background: rgba(184,115,51,0.1);
//           color: #B87333;
//           border: 1px solid rgba(184,115,51,0.2);
//           border-radius: 4px;
//           margin-left: 6px;
//         }
//         .acq-footer-new .rics-badge {
//           display: inline-flex;
//           align-items: center;
//           gap: 8px;
//           padding: 6px 12px;
//           background: white;
//           border: 1px solid rgba(184,115,51,0.2);
//           border-radius: 999px;
//           margin-bottom: 32px;
//         }
//         .acq-footer-new .rics-badge span {
//           font-size: 9px;
//           font-weight: 900;
//           color: rgba(10,10,10,0.7);
//           text-transform: uppercase;
//           letter-spacing: 0.2em;
//         }
//         .acq-footer-new .social-row { display: flex; gap: 12px; }
//         .acq-footer-new .social-btn {
//           width: 36px; height: 36px;
//           border-radius: 50%;
//           border: 1px solid rgba(10,10,10,0.09);
//           background: rgba(255,255,255,0.6);
//           display: flex; align-items: center; justify-content: center;
//           color: rgba(10,10,10,0.35);
//           text-decoration: none;
//           transition: all 0.2s;
//         }
//         .acq-footer-new .social-btn:hover {
//           color: #B87333;
//           border-color: rgba(184,115,51,0.4);
//         }
//         .acq-footer-new .bottom-bar {
//           border-top: 1px solid rgba(10,10,10,0.06);
//           padding-top: 32px;
//           display: flex;
//           align-items: center;
//           justify-content: space-between;
//           flex-wrap: wrap;
//           gap: 16px;
//         }
//         .acq-footer-new .bottom-bar p {
//           font-weight: 700;
//           color: rgba(10,10,10,0.3);
//           text-transform: uppercase;
//           font-size: 10px;
//           letter-spacing: 0.2em;
//           margin: 0;
//         }
//         .acq-footer-new .bottom-bar .not-advice {
//           font-weight: 500;
//           color: rgba(10,10,10,0.25);
//           font-size: 10px;
//           margin: 0;
//         }
//         .acq-footer-new .bottom-location {
//           display: flex;
//           align-items: center;
//           gap: 12px;
//         }
//         .acq-footer-new .bottom-location .logo {
//           font-weight: 900;
//           font-size: 10px;
//           letter-spacing: 0.05em;
//         }
//         .acq-footer-new .bottom-location .divider {
//           width: 1px; height: 12px;
//           background: rgba(10,10,10,0.15);
//         }
//         .acq-footer-new .bottom-location .city {
//           font-weight: 600;
//           color: rgba(10,10,10,0.35);
//           font-size: 10px;
//           letter-spacing: 0.05em;
//         }

//         /* Responsive */
//         @media (max-width: 1024px) {
//           .acq-footer-new .inner { padding: 48px 48px 32px; }
//           .acq-footer-new .main-grid { grid-template-columns: 1fr 1fr 1fr; gap: 32px; }
//         }
//         @media (max-width: 768px) {
//           .acq-footer-new .inner { padding: 40px 24px 24px; }
//           .acq-footer-new .main-grid { grid-template-columns: 1fr 1fr; gap: 32px 16px; }
//           .acq-footer-new .bottom-bar { flex-direction: column; text-align: center; justify-content: center; }
//           .acq-footer-new .bottom-location { justify-content: center; }
//           .acq-footer-new .not-advice { display: none; }
//         }
//         @media (max-width: 480px) {
//           .acq-footer-new .inner { padding: 40px 16px 20px; }
//           .acq-footer-new .main-grid { grid-template-columns: 1fr; gap: 28px; }
//         }
//       `}</style>

//       <footer className="acq-footer-new">
//         <div className="copper-line"></div>
//         <div className="inner">

//           {/* Main grid */}
//           <div className="main-grid">

//             {/* Brand column */}
//             <div>
//               <div style={{ marginBottom: 24, lineHeight: 1 }}>
//                 <span style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.5px' }}>
//                   <span style={{ color: '#B87333' }}>ACQ</span>
//                   <span style={{ color: '#111111' }}>AR</span>
//                 </span>
//               </div>
//               <p style={{ fontSize: 12, lineHeight: 1.75, color: 'rgba(10,10,10,0.5)', fontWeight: 500, marginBottom: 28, maxWidth: 280 }}>
//                 The world's first AI-powered property intelligence platform for Dubai real estate. Independent, instant, investment-grade.
//               </p>
//               <div className="rics-badge">
//                 <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
//                   <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.5C16.5 22.15 20 17.25 20 12V6L12 2z" stroke="#B87333" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
//                   <path d="M9 12l2 2 4-4" stroke="#B87333" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
//                 </svg>
//                 <span>RICS-Aligned Intelligence</span>
//               </div>
//               <div className="social-row">
//                 {[
//                   { href: 'https://www.linkedin.com/company/acqar', label: 'LinkedIn', icon: <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg> },
//                   { href: 'https://www.instagram.com/acqar.dxb/', label: 'Instagram', icon: <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> },
//                 ].map(({ href, label, icon }) => (
//                   <a key={label} href={href} target="_blank" rel="noopener noreferrer"
//                     aria-label={label} className="social-btn"
//                   >{icon}</a>
//                 ))}
//               </div>
//             </div>

//             {/* Product */}
//             <div>
//               <div className="col-heading">
//                 <span className="col-heading-dot"></span>
//                 <h6>Product</h6>
//               </div>
//               <ul>
//                 <li onClick={() => navigate('/valuation')}>ValuCheck™</li>
//                 <li className="muted">ACQAR Signal™ </li>
//                 <li className="muted">ACQAR Passport™ </li>
//                 <li onClick={() => navigate('/pricing')}>Pricing Tiers</li>
//               </ul>
//             </div>

//             {/* Company */}
//             <div>
//               <div className="col-heading">
//                 <span className="col-heading-dot"></span>
//                 <h6>Company</h6>
//               </div>
//               <ul>
//                 {['About ACQAR', 'How It Works', 'Pricing', 'Contact Us', 'Partners'].map(l => (
//                   <li key={l}>{l}</li>
//                 ))}
//               </ul>
//             </div>

//             {/* Legal */}
//             <div>
//               <div className="col-heading">
//                 <span className="col-heading-dot"></span>
//                 <h6>Legal & Info</h6>
//               </div>
//               <ul>
//                 <li onClick={() => window.open('https://www.acqar.com/blogs', '_blank')}>Intelligence Blog</li>
//                 <li onClick={() => navigate('/terms')}>Terms of Use</li>
//                 <li onClick={() => navigate('/privacy')}>Privacy Policy</li>
//               </ul>
//             </div>

//             {/* Comparisons */}
//             <div>
//               <div className="col-heading">
//                 <span className="col-heading-dot"></span>
//                 <h6>Comparisons</h6>
//               </div>
//               <ul>
//                 {['vs Bayut TruEstimate', 'vs Property Finder', 'vs Traditional Valuers', 'Why ACQAR?'].map(l => (
//                   <li key={l}>{l}</li>
//                 ))}
//               </ul>
//             </div>

//           </div>

//           {/* Bottom bar */}
//           <div className="bottom-bar">
//             <div className="bottom-location">
//               <span className="logo">
//                 <span style={{ color: '#B87333' }}>ACQ</span>
//                 <span style={{ color: '#0A0A0A' }}>AR</span>
//               </span>
//               <span className="divider"></span>
//               <span className="city">Dubai, United Arab Emirates</span>
//             </div>
//             <p>© 2026 ACQARLABS L.L.C-FZ. All rights reserved.</p>
//             <p className="not-advice">Not financial advice.</p>
//           </div>

//         </div>
//       </footer>
//     </>
//   );
// }


/* ── FOOTER ── */
/* ── FOOTER ── */



    
/* ──────────────────────────────────────
   APP ROOT
────────────────────────────────────── */
export default function TruvaluPage() {
  const location = useLocation();

  // 1. Page view
  useEffect(() => {
    trackEvent("page_viewed", { page: "truvalu_landing" });
  }, []);

  // 2. Scroll depth
  useEffect(() => {
    const scrolled = { 25: false, 50: false, 75: false, 100: false };
    const handleScroll = () => {
      const pct = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      if (pct >= 25 && !scrolled[25]) { scrolled[25] = true; trackEvent("scroll_depth", { page: "truvalu_landing", depth: "25%" }); }
      if (pct >= 50 && !scrolled[50]) { scrolled[50] = true; trackEvent("scroll_depth", { page: "truvalu_landing", depth: "50%" }); }
      if (pct >= 75 && !scrolled[75]) { scrolled[75] = true; trackEvent("scroll_depth", { page: "truvalu_landing", depth: "75%" }); }
      if (pct >= 100 && !scrolled[100]) { scrolled[100] = true; trackEvent("scroll_depth", { page: "truvalu_landing", depth: "100%" }); }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 3. Time spent
  useEffect(() => {
    const startTime = Date.now();
    return () => {
      trackEvent("time_spent", { page: "truvalu_landing", seconds: Math.round((Date.now() - startTime) / 1000) });
    };
  }, []);

  // 4. Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);
  return (
    <>
           {/* <Helmet> */}
 <title>AI Property Valuation Reports for Dubai | Acqar Truvalu</title>
  <meta name="description" content="Get instant AI property valuations for Dubai real estate. Truvalu by Acqar delivers RICS-aligned AVM reports in 60 seconds. Free for your first 3 reports." />
  <link rel="canonical" href="https://www.acqar.com/truvalu" />
  <meta property="og:title" content="Truvalu | Instant AI Property Valuation Reports — Dubai" />
  <meta property="og:description" content="Instant AI property valuations for Dubai. RICS-aligned AVM reports in 60 seconds — trusted by investors, agents & lenders." />
  <meta property="og:url" content="https://www.acqar.com/truvalu" />
  <meta name="robots" content="index, follow" />
  <script type="application/ld+json">{`
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Truvalu by Acqar",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "url": "https://www.acqar.com/truvalu",
      "description": "AI-powered property valuation report tool delivering instant, RICS-aligned AVM reports for Dubai real estate in 60 seconds.",
      "offers": {
        "@type": "Offer",
        "price": "9.90",
        "priceCurrency": "AED",
        "availability": "https://schema.org/InStock"
      },
      "provider": {
        "@type": "Organization",
        "name": "ACQAR",
        "url": "https://www.acqar.com"
      },
      "featureList": [
        "Instant AI property valuation",
        "RICS-aligned methodology",
        "DLD transaction data",
        "6-month price forecast",
        "3-year price forecast",
        "Investment score",
        "PDF report download",
        "Results in 60 seconds"
      ],
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "reviewCount": "2400",
        "bestRating": "5"
      }
    }
  `}</script>
  <script type="application/ld+json">{`
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How accurate is Truvalu AI property valuation?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Truvalu uses RICS-aligned methodology with DLD transaction data to deliver valuations with a confidence score. Each report shows the accuracy percentage based on available comparable sales data."
          }
        },
        {
          "@type": "Question",
          "name": "How long does a Truvalu valuation take?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Truvalu delivers a complete AI property valuation report in 60 seconds — compared to 14-21 days for a traditional RICS valuation."
          }
        },
        {
          "@type": "Question",
          "name": "Is Truvalu free to use?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Truvalu offers 3 free valuation reports with no credit card required. Pro plan is available at AED 9.90 per report."
          }
        },
        {
          "@type": "Question",
          "name": "What does a Truvalu report include?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Each Truvalu report includes estimated market value, investment score, 6-month and 3-year AI price forecasts, recent DLD sales comparables, supply and demand charts, transaction cost calculator, and a confidence score."
          }
        }
      ]
    }
  `}</script>
{/* </Helmet> */}
      <style>{styles}</style>
      <div style={{ background:"#fff", color:"var(--primary)", fontFamily:"'Inter',sans-serif", overflowX:"hidden" }}>
        <Nav />
<div className="page-body">
  <Hero />
  <HowItWorks />
  <Testimonials />
  <InsideEveryReport />
  <CTASection />
</div>
<Footer />
      </div>
    </>
  );
}
