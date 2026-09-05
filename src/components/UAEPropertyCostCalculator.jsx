import { useState, useMemo } from "react";

// ─── DLD Official Fee Constants ───────────────────────────────
const DLD = {
  transferFeePct:    0.04,
  transferFeeMin:    500,
  trusteeReady:      4000,
  trusteeOffplan:    5000,
  trusteeCommercial: 5000,
  titleDeedFee:      250,
  knowledgeDirham:   10,
  innovationDirham:  10,
  mortgageRegPct:    0.0025,
  mortgageRegAdmin:  290,
  mortgageRegMin:    500,
  agentBuyPct:       0.02,
  agentSellPct:      0.02,
  nocMin:            500,
  nocMax:            5000,
  nocTypical:        2000,
  mortgageDischarge: 1290,
  sellerTrustee:     4000,
};

function fmtAED(n) {
  if (!Number.isFinite(n)) return "AED —";
  return "AED " + n.toLocaleString("en-AE", { maximumFractionDigits: 0 });
}
function fmtPct(n) {
  return Number.isFinite(n) ? `${(n * 100).toFixed(2)}%` : "—";
}

function calcBuying({ price, hasMortgage, ltvPct, isOffplan, isCommercial, includeAgent }) {
  if (!Number.isFinite(price) || price <= 0) return null;
  const dldTransfer   = Math.max(price * DLD.transferFeePct, DLD.transferFeeMin);
  const trusteeFee    = isCommercial ? DLD.trusteeCommercial : isOffplan ? DLD.trusteeOffplan : DLD.trusteeReady;
  const titleDeed     = DLD.titleDeedFee;
  const govSurcharge  = DLD.knowledgeDirham + DLD.innovationDirham;
  const loanAmount    = hasMortgage ? price * (ltvPct / 100) : 0;
  const mortgageReg   = hasMortgage ? Math.max(loanAmount * DLD.mortgageRegPct + DLD.mortgageRegAdmin, DLD.mortgageRegMin) : 0;
  const agentFee      = includeAgent ? price * DLD.agentBuyPct : 0;
  const subtotal      = dldTransfer + trusteeFee + titleDeed + govSurcharge + mortgageReg + agentFee;
  return {
    subtotal, loanAmount,
    totalWithProperty: price + subtotal,
    pctOfPrice: subtotal / price,
    rows: [
      { label: "DLD Transfer Fee (4%)",          formula: `4% × ${fmtAED(price)}`,                            amount: dldTransfer,  required: true,  tooltip: "Mandatory fee paid to Dubai Land Department. Minimum AED 500. Paid by buyer." },
      { label: "Trustee Office Fee",              formula: isOffplan ? "Off-plan: AED 5,000" : "Ready: AED 4,000", amount: trusteeFee,   required: true,  tooltip: "Paid to DLD-registered trustee office for processing title deed issuance." },
      { label: "Title Deed Issuance",             formula: "Fixed DLD fee",                                   amount: titleDeed,    required: true,  tooltip: "Fixed DLD administrative fee for issuing the new Title Deed document." },
      { label: "Knowledge & Innovation Dirham",   formula: "AED 10 + AED 10",                                 amount: govSurcharge, required: true,  tooltip: "Mandatory UAE government surcharges (Knowledge Dirham + Innovation Dirham) applied to all DLD transactions." },
      hasMortgage && { label: "Mortgage Registration (0.25%)", formula: `0.25% × ${fmtAED(loanAmount)} + AED 290 admin`, amount: mortgageReg, required: true, tooltip: "DLD fee to register the mortgage instrument. Calculated on loan value, minimum AED 500." },
      includeAgent && { label: "Buyer Agent Commission (2%)", formula: `2% × ${fmtAED(price)}`,               amount: agentFee,     required: false, tooltip: "Industry standard. Not a DLD fee but typically paid by buyer. Negotiable." },
    ].filter(Boolean),
  };
}

function calcSelling({ price, hasMortgage, nocOption, includeAgent }) {
  if (!Number.isFinite(price) || price <= 0) return null;
  const nocFee           = nocOption === "low" ? DLD.nocMin : nocOption === "high" ? DLD.nocMax : DLD.nocTypical;
  const mortgageClear    = hasMortgage ? DLD.mortgageDischarge : 0;
  const trusteeFee       = DLD.sellerTrustee;
  const agentFee         = includeAgent ? price * DLD.agentSellPct : 0;
  const subtotal         = nocFee + mortgageClear + trusteeFee + agentFee;
  return {
    subtotal,
    netProceeds: price - subtotal,
    pctOfPrice: subtotal / price,
    rows: [
      { label: "NOC Fee (Developer)",              formula: "Varies by developer",              amount: nocFee,         required: true,  tooltip: "No Objection Certificate from original developer. Required before DLD transfer. Typically AED 500–5,000. Seller pays." },
      { label: "Trustee Office Fee",               formula: "AED 4,000",                        amount: trusteeFee,     required: true,  tooltip: "Seller's share of trustee office processing fee." },
      hasMortgage && { label: "Mortgage Discharge Fee", formula: "AED 1,000 DLD + AED 290 admin",   amount: mortgageClear,  required: true, tooltip: "Fee to release the bank's charge from the title deed after mortgage is settled." },
      includeAgent && { label: "Seller Agent Commission (2%)", formula: `2% × ${fmtAED(price)}`, amount: agentFee,       required: false, tooltip: "Standard listing agent fee. Negotiable. Note: 4% DLD transfer fee is paid by BUYER, not seller." },
    ].filter(Boolean),
  };
}

// ── Sub-components ──────────────────────────────────────────
function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: "11px 0", border: "none", borderRadius: 8,
      fontSize: 12, fontWeight: 800, letterSpacing: ".07em", textTransform: "uppercase",
      cursor: "pointer", transition: "all .18s", touchAction: "manipulation",
      background: active ? "#2B2B2B" : "transparent",
      color: active ? "#fff" : "rgba(43,43,43,.45)",
    }}>{children}</button>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
      <div onClick={() => onChange(!checked)} style={{
        width: 38, height: 21, borderRadius: 11,
        background: checked ? "#B87333" : "#DDD",
        position: "relative", flexShrink: 0, transition: "background .18s",
      }}>
        <div style={{
          position: "absolute", top: 2.5, left: checked ? 19 : 2.5,
          width: 16, height: 16, borderRadius: "50%", background: "#fff",
          transition: "left .18s", boxShadow: "0 1px 4px rgba(0,0,0,.2)",
        }} />
      </div>
      <span style={{ fontSize: 12.5, color: "#2B2B2B", fontWeight: 500 }}>{label}</span>
    </label>
  );
}

function CostRow({ row, price }) {
  const [showTip, setShowTip] = useState(false);
  const pct = price > 0 ? ((row.amount / price) * 100).toFixed(2) : null;
  return (
    <div style={{ padding: "11px 0", borderBottom: "1px solid #F5F5F5" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "#2B2B2B", fontWeight: 500 }}>{row.label}</span>
            {!row.required && <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: ".08em", padding: "2px 6px", borderRadius: 4, background: "#F0F7FF", color: "#1d4ed8" }}>OPTIONAL</span>}
            <button onClick={() => setShowTip(t => !t)} style={{ width: 15, height: 15, borderRadius: "50%", border: "1px solid #DDD", background: "#F5F5F5", fontSize: 8, cursor: "pointer", color: "#999", fontWeight: 800, flexShrink: 0, lineHeight: 1 }}>?</button>
          </div>
          {showTip && <div style={{ marginTop: 5, fontSize: 11, color: "rgba(43,43,43,.55)", lineHeight: 1.55, background: "#FAFAF8", border: "1px solid #EEE", borderRadius: 6, padding: "7px 10px" }}>{row.tooltip}</div>}
          <div style={{ fontSize: 11, color: "rgba(43,43,43,.38)", marginTop: 2, fontFamily: "monospace" }}>{row.formula}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: "#2B2B2B" }}>{fmtAED(row.amount)}</div>
          {pct && <div style={{ fontSize: 10, color: "rgba(43,43,43,.35)", fontWeight: 600 }}>{pct}% of price</div>}
        </div>
      </div>
    </div>
  );
}

const BAR_COLORS = ["#B87333", "#2B2B2B", "#4B9EF0", "#10b981", "#f59e0b", "#8b5cf6"];

export default function UAEPropertyCostCalculator({ initialPrice }) {
  const [tab, setTab]               = useState("buy");
  const [priceRaw, setPriceRaw] = useState(
    initialPrice && Number.isFinite(Number(initialPrice))
      ? Math.round(Number(initialPrice)).toLocaleString("en-AE")
      : "1,500,000"
  );
  const [hasMortgage, setHasMortgage] = useState(true);
  const [ltvPct, setLtvPct]         = useState(75);
  const [isOffplan, setIsOffplan]   = useState(false);
  const [isCommercial, setIsCommercial] = useState(false);
  const [includeAgent, setIncludeAgent] = useState(true);
  const [nocOption, setNocOption]   = useState("typical");

  const price = useMemo(() => {
    const n = Number(String(priceRaw).replace(/,/g, "").trim());
    return Number.isFinite(n) && n > 0 ? n : NaN;
  }, [priceRaw]);

  const buying  = useMemo(() => calcBuying({ price, hasMortgage, ltvPct, isOffplan, isCommercial, includeAgent }), [price, hasMortgage, ltvPct, isOffplan, isCommercial, includeAgent]);
  const selling = useMemo(() => calcSelling({ price, hasMortgage, nocOption, includeAgent }), [price, hasMortgage, nocOption, includeAgent]);
  const active  = tab === "buy" ? buying : selling;

  const QUICK = [500000, 1000000, 2000000, 5000000, 10000000];

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#F5F4F2", minHeight: "100vh", padding: "32px 0" }}>
      <style>{`
        /* ── Responsive classes ── */
        .uae2-outer        { max-width: 700px; margin: 0 auto; padding: 0 20px; box-sizing: border-box; }
        .uae2-hdr-pad      { padding: 24px 28px 0; }
        .uae2-body-pad     { padding: 24px 28px 32px; }
        .uae2-summary      { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 20px; }
        .uae2-toggles      { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .uae2-noc-row      { display: flex; gap: 8px; }
        .uae2-roundtrip    { display: flex; justify-content: space-between; align-items: center; }
        .uae2-ltv-hint     { text-align: center; display: inline; }
        .uae2-comp-label   { color: rgba(43,43,43,.65); font-weight: 500; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .uae2-comp-val     { font-weight: 700; font-family: monospace; color: #2B2B2B; flex-shrink: 0; white-space: nowrap; }

        @media (max-width: 600px) {
          .uae2-outer     { padding: 0 12px; }
          .uae2-hdr-pad   { padding: 16px 16px 0; }
          .uae2-body-pad  { padding: 16px 16px 24px; }
          .uae2-summary   { grid-template-columns: 1fr !important; }
          .uae2-toggles   { grid-template-columns: 1fr !important; }
          .uae2-noc-row   { flex-direction: column; }
          .uae2-roundtrip { flex-direction: column; gap: 12px; text-align: center; }
          .uae2-ltv-hint  { display: none !important; }
        }
      `}</style>

      {/* FIX #1: outer wrapper has responsive horizontal padding */}
      <div className="uae2-outer">

        {/* Page title */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #E8E8E8", borderRadius: 100, padding: "6px 16px", marginBottom: 16 }}>
            <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: ".2em", textTransform: "uppercase", color: "#B87333" }}>ACQAR · DLD Fee Engine</span>
          </div>
          <h1 style={{ margin: 0, fontSize: "clamp(24px,5vw,36px)", fontWeight: 900, color: "#1a1a1a", letterSpacing: "-.03em", lineHeight: 1.05 }}>
            UAE Property Transaction<br />Cost Calculator
          </h1>
          <p style={{ margin: "10px 0 0", fontSize: 13, color: "rgba(43,43,43,.5)" }}>
            Official DLD fee schedule · All costs in AED · Tap <strong>?</strong> for fee explanations
          </p>
        </div>

        {/* Card */}
        <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #E8E8E8", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,.08)" }}>

          {/* FIX #2: tab header padding via class, shrinks on mobile */}
          <div className="uae2-hdr-pad">
            <div style={{ display: "flex", gap: 4, background: "#F5F5F5", borderRadius: 10, padding: 4, marginBottom: 0 }}>
              <TabBtn active={tab === "buy"}  onClick={() => setTab("buy")}>🏦 Buying Costs</TabBtn>
              <TabBtn active={tab === "sell"} onClick={() => setTab("sell")}>🤝 Selling Costs</TabBtn>
            </div>
          </div>

          {/* FIX #2: body padding via class, shrinks on mobile */}
          <div className="uae2-body-pad">

            {/* Price input */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 800, letterSpacing: ".15em", textTransform: "uppercase", color: "rgba(43,43,43,.4)", marginBottom: 8 }}>
                Property Price (AED)
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 13, fontWeight: 700, color: "rgba(43,43,43,.35)" }}>AED</span>
                {/* FIX: inputMode="numeric" shows number keyboard on mobile */}
                <input
                  type="text"
                  inputMode="numeric"
                  value={priceRaw}
                  onChange={e => setPriceRaw(e.target.value.replace(/[^\d,]/g, ""))}
                  onBlur={() => {
                    const n = Number(String(priceRaw).replace(/,/g, ""));
                    if (Number.isFinite(n) && n > 0) setPriceRaw(n.toLocaleString("en-AE"));
                  }}
                  onFocus={e => { e.target.style.borderColor = "#B87333"; }}
                  onBlurCapture={e => { e.target.style.borderColor = "#E8E8E8"; }}
                  placeholder="e.g. 1,500,000"
                  style={{ width: "100%", padding: "13px 16px 13px 54px", border: "2px solid #E8E8E8", borderRadius: 10, fontSize: 20, fontWeight: 800, color: "#1a1a1a", fontFamily: "monospace", outline: "none", boxSizing: "border-box", background: "#FAFAFA", transition: "border-color .15s" }}
                />
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
                {/* FIX: touchAction:"manipulation" removes 300ms tap delay on iOS */}
                {QUICK.map(v => (
                  <button key={v} onClick={() => setPriceRaw(v.toLocaleString("en-AE"))}
                    style={{ padding: "4px 11px", borderRadius: 6, border: "1px solid #E8E8E8", background: price === v ? "#2B2B2B" : "#FAFAFA", color: price === v ? "#fff" : "rgba(43,43,43,.6)", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all .12s", touchAction: "manipulation" }}>
                    {v >= 1000000 ? `${v / 1000000}M` : `${v / 1000}K`}
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div style={{ background: "#FAFAFA", border: "1px solid #F0F0F0", borderRadius: 12, padding: "16px 18px", marginBottom: 22 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(43,43,43,.38)", marginBottom: 12 }}>Transaction Options</div>
              {/* FIX #3: toggles in own grid class so it collapses to 1-col on mobile */}
              <div className="uae2-toggles">
                {tab === "buy" ? (
                  <>
                    <Toggle checked={hasMortgage}   onChange={setHasMortgage}   label="Mortgage Financed" />
                    <Toggle checked={isOffplan}     onChange={setIsOffplan}     label="Off-Plan Property" />
                    <Toggle checked={isCommercial}  onChange={setIsCommercial}  label="Commercial Property" />
                    <Toggle checked={includeAgent}  onChange={setIncludeAgent}  label="Include Agent Fee (2%)" />
                    {hasMortgage && (
                      <div style={{ gridColumn: "1/-1", paddingTop: 4 }}>
                        {/* FIX: flexWrap so LTV label and value don't overflow on small screens */}
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, flexWrap: "wrap", gap: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#2B2B2B" }}>Loan-to-Value (LTV)</span>
                          <span style={{ fontSize: 13, fontWeight: 800, fontFamily: "monospace", color: "#B87333" }}>{ltvPct}% — Loan: {Number.isFinite(price) ? fmtAED(price * ltvPct / 100) : "—"}</span>
                        </div>
                        <input type="range" min={25} max={85} step={5} value={ltvPct} onChange={e => setLtvPct(Number(e.target.value))} style={{ width: "100%", accentColor: "#B87333" }} />
                        {/* FIX #4: middle hint hidden on mobile via .uae2-ltv-hint */}
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(43,43,43,.35)", marginTop: 2 }}>
                          <span>25% min</span>
                          <span className="uae2-ltv-hint">UAE Central Bank: 75% expat / 80% UAE national (ready)</span>
                          <span>85% max</span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <Toggle checked={hasMortgage}  onChange={setHasMortgage}  label="Existing Mortgage" />
                    <Toggle checked={includeAgent} onChange={setIncludeAgent} label="Include Agent Fee (2%)" />
                    <div style={{ gridColumn: "1/-1" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#2B2B2B", marginBottom: 8 }}>NOC Fee Estimate (Developer Varies)</div>
                      {/* FIX: NOC row stacks vertically on mobile */}
                      <div className="uae2-noc-row">
                        {[{ id:"low", label:"Low", sub:"AED 500", desc:"Small devs" }, { id:"typical", label:"Typical", sub:"AED 2,000", desc:"Major devs" }, { id:"high", label:"High", sub:"AED 5,000", desc:"Premium devs" }].map(o => (
                          <button key={o.id} onClick={() => setNocOption(o.id)} style={{ flex: 1, padding: "9px 6px", borderRadius: 8, cursor: "pointer", border: `2px solid ${nocOption === o.id ? "#B87333" : "#E8E8E8"}`, background: nocOption === o.id ? "#FFF8F3" : "#fff", textAlign: "center", transition: "all .12s", touchAction: "manipulation" }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: nocOption === o.id ? "#B87333" : "#666" }}>{o.label}</div>
                            <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: "#2B2B2B" }}>{o.sub}</div>
                            <div style={{ fontSize: 10, color: "rgba(43,43,43,.4)" }}>{o.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Results */}
            {!Number.isFinite(price) ? (
              <div style={{ textAlign: "center", padding: "36px 0", color: "rgba(43,43,43,.3)", fontSize: 14 }}>Enter a property price above to see the cost breakdown</div>
            ) : active ? (
              <>
                {/* FIX #7: summary cards collapse to 1-col on mobile; font clamp updated */}
                <div className="uae2-summary">
                  {[
                    { label: "Property Price", value: fmtAED(price), sub: "Purchase price", dark: false },
                    { label: tab === "buy" ? "Total Extra Costs" : "Total Selling Costs", value: fmtAED(active.subtotal), sub: fmtPct(active.pctOfPrice) + " of price", dark: false },
                    { label: tab === "buy" ? "Total Cash Needed" : "Net Proceeds", value: tab === "buy" ? fmtAED(active.totalWithProperty) : fmtAED(active.netProceeds), sub: tab === "buy" ? "Price + all costs" : "After all deductions", dark: true },
                  ].map(c => (
                    <div key={c.label} style={{ background: c.dark ? "#2B2B2B" : "#FAFAFA", border: `1px solid ${c.dark ? "#2B2B2B" : "#EBEBEB"}`, borderRadius: 10, padding: "14px 16px" }}>
                      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: c.dark ? "rgba(255,255,255,.45)" : "rgba(43,43,43,.38)", marginBottom: 5 }}>{c.label}</div>
                      <div style={{ fontSize: "clamp(13px,3.5vw,19px)", fontWeight: 800, color: c.dark ? "#fff" : "#1a1a1a", lineHeight: 1.1, fontFamily: "monospace" }}>{c.value}</div>
                      <div style={{ fontSize: 11, color: c.dark ? "rgba(255,255,255,.45)" : "rgba(43,43,43,.4)", marginTop: 3 }}>{c.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Rows */}
                <div style={{ background: "#FAFAFA", border: "1px solid #F0F0F0", borderRadius: 12, padding: "4px 18px 4px", marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(43,43,43,.38)", padding: "12px 0 4px" }}>Fee Breakdown</div>
                  {active.rows.map(row => <CostRow key={row.label} row={row} price={price} />)}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0 8px", borderTop: "2px solid #E8E8E8", marginTop: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em" }}>Total</span>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#B87333", fontFamily: "monospace" }}>{fmtAED(active.subtotal)}</div>
                      <div style={{ fontSize: 10, color: "rgba(43,43,43,.38)", fontWeight: 600 }}>{fmtPct(active.pctOfPrice)} of property value</div>
                    </div>
                  </div>
                </div>

                {/* Visual bars — label truncates gracefully on narrow screens */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(43,43,43,.38)", marginBottom: 10 }}>Cost Composition</div>
                  {active.rows.map((row, i) => {
                    const pct = active.subtotal > 0 ? (row.amount / active.subtotal) * 100 : 0;
                    return (
                      <div key={row.label} style={{ marginBottom: 7 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3, gap: 6 }}>
                          <span className="uae2-comp-label">{row.label}</span>
                          <span className="uae2-comp-val">{pct.toFixed(1)}%  ·  {fmtAED(row.amount)}</span>
                        </div>
                        <div style={{ height: 5, background: "#EBEBEB", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: BAR_COLORS[i % BAR_COLORS.length], borderRadius: 3, transition: "width .4s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* FIX #5: round-trip stacks vertically on mobile via .uae2-roundtrip */}
                {buying && selling && (
                  <div className="uae2-roundtrip" style={{ background: "#1a1a1a", borderRadius: 12, padding: "14px 20px", marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.38)", marginBottom: 3 }}>Round-Trip Cost (Buy + Sell)</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>Combined costs to acquire and eventually exit this property</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: "#B87333", fontFamily: "monospace" }}>{fmtAED(buying.subtotal + selling.subtotal)}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", fontWeight: 600 }}>{fmtPct((buying.subtotal + selling.subtotal) / price)} of property value</div>
                    </div>
                  </div>
                )}

                {/* Disclaimer */}
                <div style={{ padding: "11px 14px", background: "#FAFAF6", border: "1px solid #EDE8D8", borderRadius: 8, fontSize: 11, color: "rgba(43,43,43,.5)", lineHeight: 1.6 }}>
                  <strong style={{ color: "rgba(43,43,43,.65)" }}>ℹ️ </strong>
                  {tab === "buy"
                    ? "DLD transfer fee (4%) is paid by the buyer. No VAT on residential transfers; VAT applies to commercial. Off-plan registrations use the 4% rate on the SPA price. Always confirm final figures with a RERA-registered agent or DLD trustee office."
                    : "The 4% DLD transfer fee is paid by the BUYER, not the seller. Sellers pay NOC, trustee, and agent fees only. Figures are estimates — developer NOC fees and mortgage clearance costs vary. Consult a RERA-registered agent for exact amounts."}
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "rgba(43,43,43,.3)" }}>
          Powered by ACQAR · Fee data based on DLD official schedule
        </div>
      </div>
    </div>
  );
}
