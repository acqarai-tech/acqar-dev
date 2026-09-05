import { useState, useMemo } from "react";

const DLD = {
  transferFeePct: 0.04, transferFeeMin: 500,
  trusteeReady: 4000, trusteeOffplan: 5000, trusteeCommercial: 5000,
  titleDeedFee: 250, knowledgeDirham: 10, innovationDirham: 10,
  mortgageRegPct: 0.0025, mortgageRegAdmin: 290, mortgageRegMin: 500,
  agentBuyPct: 0.02, agentSellPct: 0.02,
  nocMin: 500, nocMax: 5000, nocTypical: 2000,
  mortgageDischarge: 1290, sellerTrustee: 4000,
};

const fmt = n => Number.isFinite(n) ? "AED " + Math.round(n).toLocaleString("en-AE") : "AED —";
const fmtPct = n => Number.isFinite(n) ? (n * 100).toFixed(2) + "%" : "—";
const BAR_COLORS = ["#B87333","#2B2B2B","#4B9EF0","#10b981","#f59e0b","#8b5cf6"];

function calcBuying({ price, hasMortgage, ltvPct, isOffplan, isCommercial, includeAgent }) {
  if (!price) return null;
  const dld   = Math.max(price * 0.04, 500);
  const trustee = isCommercial ? 5000 : isOffplan ? 5000 : 4000;
  const deed  = 250, gov = 20;
  const loan  = hasMortgage ? price * ltvPct / 100 : 0;
  const mort  = hasMortgage ? Math.max(loan * 0.0025 + 290, 500) : 0;
  const agent = includeAgent ? price * 0.02 : 0;
  const sub   = dld + trustee + deed + gov + mort + agent;
  return {
    subtotal: sub, totalWithProperty: price + sub, pctOfPrice: sub / price,
    rows: [
      { label:"DLD Transfer Fee (4%)",          formula:`4% × ${fmt(price)}`,                         amount:dld,     required:true,  tip:"Mandatory fee to Dubai Land Department. Min AED 500. Always paid by buyer." },
      { label:"Trustee Office Fee",             formula:isOffplan?"Off-plan: AED 5,000":"Ready: AED 4,000", amount:trustee, required:true,  tip:"Paid to DLD-registered trustee office for processing and Title Deed issuance." },
      { label:"Title Deed Issuance",            formula:"Fixed DLD administrative fee",               amount:deed,    required:true,  tip:"Fixed DLD fee for generating the new Title Deed document in buyer's name." },
      { label:"Knowledge & Innovation Dirham",  formula:"AED 10 + AED 10 (mandatory surcharges)",    amount:gov,     required:true,  tip:"UAE government surcharges applied to all DLD transactions without exception." },
      hasMortgage&&{ label:"Mortgage Registration (0.25%)", formula:`0.25% × ${fmt(loan)} + AED 290`, amount:mort,    required:true,  tip:"DLD fee to register the mortgage/charge on the property. Min AED 500. On loan amount, not property price." },
      includeAgent&&{ label:"Buyer Agent Commission (2%)", formula:`2% × ${fmt(price)}`,              amount:agent,   required:false, tip:"Industry standard. Not a DLD fee. Negotiable. Typically paid by buyer in Dubai." },
    ].filter(Boolean),
  };
}

function calcSelling({ price, hasMortgage, nocOption, includeAgent }) {
  if (!price) return null;
  const noc   = nocOption==="low"?500:nocOption==="high"?5000:2000;
  const disc  = hasMortgage ? 1290 : 0;
  const trust = 4000;
  const agent = includeAgent ? price * 0.02 : 0;
  const sub   = noc + disc + trust + agent;
  return {
    subtotal: sub, netProceeds: price - sub, pctOfPrice: sub / price,
    rows: [
      { label:"NOC Fee (Developer)",            formula:"Varies by developer (AED 500–5,000)",        amount:noc,    required:true,  tip:"No Objection Certificate from original developer. Must be obtained before DLD transfer. Seller pays." },
      { label:"Trustee Office Fee",             formula:"AED 4,000",                                  amount:trust,  required:true,  tip:"Seller's share of trustee office fee for processing the title transfer." },
      hasMortgage&&{ label:"Mortgage Discharge Fee", formula:"AED 1,000 (DLD) + AED 290 (admin)",    amount:disc,   required:true,  tip:"Fee to remove bank's charge from title deed once mortgage is settled. Seller pays." },
      includeAgent&&{ label:"Seller Agent Commission (2%)", formula:`2% × ${fmt(price)}`,             amount:agent,  required:false, tip:"Standard listing agent fee. Note: The 4% DLD transfer fee is paid by BUYER — seller does NOT pay this." },
    ].filter(Boolean),
  };
}

function CostRow({ row, price }) {
  const [tip, setTip] = useState(false);
  const pct = price > 0 ? (row.amount / price * 100).toFixed(2) : null;
  return (
    <div style={{ padding:"10px 0", borderBottom:"1px solid #F5F5F5" }}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"flex-start" }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
            <span style={{ fontSize:13, color:"#2B2B2B", fontWeight:500 }}>{row.label}</span>
            {!row.required && <span style={{ fontSize:9, fontWeight:800, letterSpacing:".08em", padding:"2px 6px", borderRadius:4, background:"#F0F7FF", color:"#1d4ed8" }}>OPTIONAL</span>}
            <button onClick={()=>setTip(t=>!t)} style={{ width:15,height:15,borderRadius:"50%",border:"1px solid #DDD",background:"#F5F5F5",fontSize:8,cursor:"pointer",color:"#999",fontWeight:800,flexShrink:0 }}>?</button>
          </div>
          {tip && <div style={{ marginTop:5,fontSize:11,color:"rgba(43,43,43,.55)",lineHeight:1.55,background:"#FAFAF8",border:"1px solid #EEE",borderRadius:6,padding:"6px 10px" }}>{row.tip}</div>}
          <div style={{ fontSize:11,color:"rgba(43,43,43,.38)",marginTop:2,fontFamily:"monospace" }}>{row.formula}</div>
        </div>
        <div style={{ textAlign:"right", flexShrink:0 }}>
          <div style={{ fontSize:14,fontWeight:700,fontFamily:"monospace",color:"#2B2B2B" }}>{fmt(row.amount)}</div>
          {pct && <div style={{ fontSize:10,color:"rgba(43,43,43,.35)",fontWeight:600 }}>{pct}% of price</div>}
        </div>
      </div>
    </div>
  );
}

export default function UAECostCalculator({ initialPrice }) {
  const [tab, setTab]     = useState("buy");
  const [raw, setRaw] = useState(
    initialPrice && Number.isFinite(Number(initialPrice))
      ? Math.round(Number(initialPrice)).toLocaleString("en-AE")
      : "1,500,000"
  );
  const [mort, setMort]   = useState(true);
  const [ltv, setLtv]     = useState(75);
  const [offplan, setOP]  = useState(false);
  const [comm, setComm]   = useState(false);
  const [agent, setAgent] = useState(true);
  const [noc, setNoc]     = useState("typical");

  const price = useMemo(()=>{ const n=Number(raw.replace(/,/g,"")); return(Number.isFinite(n)&&n>0?n:NaN); },[raw]);
  const buying  = useMemo(()=>calcBuying({price,hasMortgage:mort,ltvPct:ltv,isOffplan:offplan,isCommercial:comm,includeAgent:agent}),[price,mort,ltv,offplan,comm,agent]);
  const selling = useMemo(()=>calcSelling({price,hasMortgage:mort,nocOption:noc,includeAgent:agent}),[price,mort,noc,agent]);
  const active  = tab==="buy"?buying:selling;

  const Tog = ({val,set,label})=>(
    <label style={{ display:"flex",alignItems:"center",gap:9,cursor:"pointer",userSelect:"none" }}>
      <div onClick={()=>set(!val)} style={{ width:36,height:20,borderRadius:10,background:val?"#B87333":"#DDD",position:"relative",flexShrink:0,transition:"background .15s" }}>
        <div style={{ position:"absolute",top:2,left:val?18:2,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left .15s",boxShadow:"0 1px 4px rgba(0,0,0,.2)" }} />
      </div>
      <span style={{ fontSize:12.5,color:"#2B2B2B",fontWeight:500 }}>{label}</span>
    </label>
  );

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
    <style>{`
      /* ── Responsive classes ── */
      .uae-outer { max-width: 680px; margin: 0 auto; padding: 0 16px; box-sizing: border-box; }
      .uae-tab-padding { padding: 22px 24px 0; }
      .uae-card-padding { padding: 22px 24px 28px; }
      .uae-summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 18px; }
      .uae-toggles-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
      .uae-noc-row { display: flex; gap: 7px; }
      .uae-roundtrip { display: flex; justify-content: space-between; align-items: center; background: #1a1a1a; border-radius: 11px; padding: 13px 18px; margin-bottom: 14px; }
      .uae-ltv-hint { display: inline; }
      .uae-comp-label { color: rgba(43,43,43,.6); font-weight: 500; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .uae-comp-val { font-weight: 700; font-family: monospace; color: #2B2B2B; flex-shrink: 0; }

      @media (max-width: 600px) {
        .uae-outer { padding: 0 10px; }
        .uae-tab-padding { padding: 14px 14px 0; }
        .uae-card-padding { padding: 16px 14px 22px; }
        .uae-summary-grid { grid-template-columns: 1fr !important; }
        .uae-toggles-grid { grid-template-columns: 1fr !important; }
        .uae-noc-row { flex-direction: column; }
        .uae-roundtrip { flex-direction: column; gap: 10px; text-align: center; }
        .uae-ltv-hint { display: none !important; }
      }
    `}</style>

      {/* FIX #1: replaced hardcoded maxWidth div with .uae-outer for mobile edge padding */}
      <div className="uae-outer">

        <div style={{ textAlign:"center",marginBottom:22 }}>
          <div style={{ display:"inline-flex",alignItems:"center",gap:6,background:"#fff",border:"1px solid #E8E8E8",borderRadius:100,padding:"5px 14px",marginBottom:12 }}>
            <span style={{ width:6,height:6,borderRadius:"50%",background:"#B87333",display:"inline-block" }} />
            <span style={{ fontSize:9,fontWeight:900,letterSpacing:".2em",textTransform:"uppercase",color:"#B87333" }}>ACQAR · DLD Fee Engine</span>
          </div>
          <h1 style={{ margin:0,fontSize:"clamp(22px,5vw,34px)",fontWeight:900,color:"#1a1a1a",letterSpacing:"-.03em",lineHeight:1.05 }}>
            UAE Property Transaction<br/>Cost Calculator
          </h1>
          <p style={{ margin:"8px 0 0",fontSize:12,color:"rgba(43,43,43,.45)" }}>Official DLD fee schedule · Tap <strong>?</strong> on any fee for explanation</p>
        </div>

        <div style={{ background:"#fff",borderRadius:18,border:"1px solid #E8E8E8",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,.07)" }}>

          {/* Tabs — FIX #2: padding via class so it shrinks on mobile */}
          <div className="uae-tab-padding">
            <div style={{ display:"flex",gap:3,background:"#F5F5F5",borderRadius:9,padding:3 }}>
              {[["buy","🏦  Buying Costs"],["sell","🤝  Selling Costs"]].map(([id,lbl])=>(
                <button key={id} onClick={()=>setTab(id)} style={{ flex:1,padding:"10px 0",border:"none",borderRadius:7,fontSize:12,fontWeight:800,letterSpacing:".06em",textTransform:"uppercase",cursor:"pointer",transition:"all .15s",background:tab===id?"#2B2B2B":"transparent",color:tab===id?"#fff":"rgba(43,43,43,.4)",touchAction:"manipulation" }}>{lbl}</button>
              ))}
            </div>
          </div>

          {/* FIX #2: inner padding via class so it shrinks on mobile */}
          <div className="uae-card-padding">
            {/* Price */}
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:10,fontWeight:800,letterSpacing:".15em",textTransform:"uppercase",color:"rgba(43,43,43,.38)",marginBottom:7 }}>Property Price (AED)</div>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:12,fontWeight:700,color:"rgba(43,43,43,.3)" }}>AED</span>
                {/* FIX #6: inputMode="numeric" opens number keyboard on mobile */}
                <input type="text" inputMode="numeric" value={raw}
                  onChange={e=>setRaw(e.target.value.replace(/[^\d,]/g,""))}
                  onBlur={()=>{ const n=Number(raw.replace(/,/g,"")); if(Number.isFinite(n)&&n>0)setRaw(n.toLocaleString("en-AE")); }}
                  placeholder="e.g. 1,500,000"
                  style={{ width:"100%",padding:"12px 14px 12px 50px",border:"2px solid #E8E8E8",borderRadius:9,fontSize:19,fontWeight:800,color:"#1a1a1a",fontFamily:"monospace",outline:"none",boxSizing:"border-box",background:"#FAFAFA" }}
                />
              </div>
              <div style={{ display:"flex",gap:5,marginTop:8,flexWrap:"wrap" }}>
                {/* FIX #6: touchAction:"manipulation" removes 300ms tap delay on iOS */}
                {[500000,1000000,2000000,5000000,10000000].map(v=>(
                  <button key={v} onClick={()=>setRaw(v.toLocaleString("en-AE"))} style={{ padding:"4px 10px",borderRadius:5,border:"1px solid #E8E8E8",background:price===v?"#2B2B2B":"#FAFAFA",color:price===v?"#fff":"rgba(43,43,43,.55)",fontSize:11,fontWeight:700,cursor:"pointer",touchAction:"manipulation" }}>
                    {v>=1e6?`${v/1e6}M`:`${v/1e3}K`}
                  </button>
                ))}
              </div>
            </div>

            {/* Options — FIX #3: restructured so label + toggles are in one column-spanning block */}
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:10,fontWeight:800,letterSpacing:".14em",textTransform:"uppercase",color:"rgba(43,43,43,.35)",marginBottom:11 }}>Transaction Options</div>
              {/* FIX #3: inner toggle grid now stands alone, collapses to 1-col on mobile via class */}
              <div className="uae-toggles-grid">
                {tab==="buy"?(
                  <>
                    <Tog val={mort}  set={setMort}  label="Mortgage Financed" />
                    <Tog val={offplan} set={setOP}  label="Off-Plan Property" />
                    <Tog val={comm}  set={setComm}  label="Commercial Property" />
                    <Tog val={agent} set={setAgent} label="Include Agent Fee (2%)" />
                    {mort&&(
                      <div style={{ gridColumn:"1/-1",paddingTop:4 }}>
                        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5,flexWrap:"wrap",gap:4 }}>
                          <span style={{ fontSize:12,fontWeight:600,color:"#2B2B2B" }}>Loan-to-Value (LTV)</span>
                          <span style={{ fontSize:13,fontWeight:800,fontFamily:"monospace",color:"#B87333" }}>{ltv}%  ·  Loan: {Number.isFinite(price)?fmt(price*ltv/100):"—"}</span>
                        </div>
                        <input type="range" min={25} max={85} step={5} value={ltv} onChange={e=>setLtv(+e.target.value)} style={{ width:"100%",accentColor:"#B87333" }} />
                        {/* FIX #4: middle hint hidden on mobile via .uae-ltv-hint */}
                        <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:"rgba(43,43,43,.32)",marginTop:2 }}>
                          <span>25%</span><span className="uae-ltv-hint">UAE CB max: 75% expat / 80% national (ready property)</span><span>85%</span>
                        </div>
                      </div>
                    )}
                  </>
                ):(
                  <>
                    <Tog val={mort}  set={setMort}  label="Existing Mortgage" />
                    <Tog val={agent} set={setAgent} label="Include Agent Fee (2%)" />
                    <div style={{ gridColumn:"1/-1" }}>
                      <div style={{ fontSize:12,fontWeight:600,color:"#2B2B2B",marginBottom:7 }}>NOC Fee Estimate</div>
                      <div className="uae-noc-row">
                        {[{id:"low",lbl:"Low",sub:"AED 500",desc:"Small devs"},{id:"typical",lbl:"Typical",sub:"AED 2,000",desc:"Major devs"},{id:"high",lbl:"High",sub:"AED 5,000",desc:"Premium devs"}].map(o=>(
                          <button key={o.id} onClick={()=>setNoc(o.id)} style={{ flex:1,padding:"8px 4px",borderRadius:8,cursor:"pointer",border:`2px solid ${noc===o.id?"#B87333":"#E8E8E8"}`,background:noc===o.id?"#FFF8F3":"#fff",textAlign:"center",touchAction:"manipulation" }}>
                            <div style={{ fontSize:11,fontWeight:800,color:noc===o.id?"#B87333":"#666" }}>{o.lbl}</div>
                            <div style={{ fontSize:12,fontWeight:700,fontFamily:"monospace",color:"#2B2B2B" }}>{o.sub}</div>
                            <div style={{ fontSize:10,color:"rgba(43,43,43,.38)" }}>{o.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {!Number.isFinite(price)?(
              <div style={{ textAlign:"center",padding:"32px 0",color:"rgba(43,43,43,.28)",fontSize:14 }}>Enter a property price above to calculate costs</div>
            ):active?(
              <>

                {/* Summary cards — FIX #7: clamp updated to scale better on narrow screens */}
                <div className="uae-summary-grid">
                  {[
                    { lbl:"Property Price", val:fmt(price), sub:"Purchase price", dark:false },
                    { lbl:tab==="buy"?"Total Extra Costs":"Total Selling Costs", val:fmt(active.subtotal), sub:fmtPct(active.pctOfPrice)+" of price", dark:false },
                    { lbl:tab==="buy"?"Total Cash Needed":"Net Proceeds", val:tab==="buy"?fmt(active.totalWithProperty):fmt(active.netProceeds), sub:tab==="buy"?"Price + all costs":"Price − all costs", dark:true },
                  ].map(c=>(
                    <div key={c.lbl} style={{ background:c.dark?"#2B2B2B":"#FAFAFA",border:`1px solid ${c.dark?"#2B2B2B":"#EBEBEB"}`,borderRadius:9,padding:"13px 14px" }}>
                      <div style={{ fontSize:9,fontWeight:800,letterSpacing:".12em",textTransform:"uppercase",color:c.dark?"rgba(255,255,255,.4)":"rgba(43,43,43,.35)",marginBottom:4 }}>{c.lbl}</div>
                      <div style={{ fontSize:"clamp(13px,3.5vw,17px)",fontWeight:800,color:c.dark?"#fff":"#1a1a1a",fontFamily:"monospace",lineHeight:1.1 }}>{c.val}</div>
                      <div style={{ fontSize:10,color:c.dark?"rgba(255,255,255,.4)":"rgba(43,43,43,.38)",marginTop:3 }}>{c.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Breakdown */}
                <div style={{ background:"#FAFAFA",border:"1px solid #F0F0F0",borderRadius:11,padding:"2px 16px 4px",marginBottom:14 }}>
                  <div style={{ fontSize:10,fontWeight:800,letterSpacing:".14em",textTransform:"uppercase",color:"rgba(43,43,43,.35)",padding:"11px 0 4px" }}>Fee Breakdown</div>
                  {active.rows.map(r=><CostRow key={r.label} row={r} price={price} />)}
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0 7px",borderTop:"2px solid #E8E8E8",marginTop:2 }}>
                    <span style={{ fontSize:13,fontWeight:800,textTransform:"uppercase",letterSpacing:".06em" }}>Total</span>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:18,fontWeight:900,color:"#B87333",fontFamily:"monospace" }}>{fmt(active.subtotal)}</div>
                      <div style={{ fontSize:10,color:"rgba(43,43,43,.35)",fontWeight:600 }}>{fmtPct(active.pctOfPrice)} of property value</div>
                    </div>
                  </div>
                </div>

                {/* Composition bars — label truncates gracefully on narrow screens */}
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:10,fontWeight:800,letterSpacing:".14em",textTransform:"uppercase",color:"rgba(43,43,43,.35)",marginBottom:9 }}>Cost Composition</div>
                  {active.rows.map((r,i)=>{
                    const p=active.subtotal>0?(r.amount/active.subtotal*100):0;
                    return(
                      <div key={r.label} style={{ marginBottom:6 }}>
                        <div style={{ display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3,gap:6 }}>
                          <span className="uae-comp-label">{r.label}</span>
                          <span className="uae-comp-val">{p.toFixed(1)}% · {fmt(r.amount)}</span>
                        </div>
                        <div style={{ height:5,background:"#EBEBEB",borderRadius:3,overflow:"hidden" }}>
                          <div style={{ height:"100%",width:`${p}%`,background:BAR_COLORS[i%BAR_COLORS.length],borderRadius:3,transition:"width .4s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Round trip — FIX #5: stacks vertically on mobile via .uae-roundtrip class */}
                {buying&&selling&&(
                  <div className="uae-roundtrip">
                    <div>
                      <div style={{ fontSize:9,fontWeight:800,letterSpacing:".14em",textTransform:"uppercase",color:"rgba(255,255,255,.35)",marginBottom:3 }}>Round-Trip Cost (Buy + Sell)</div>
                      <div style={{ fontSize:12,color:"rgba(255,255,255,.45)" }}>Total cost to acquire and eventually exit</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:19,fontWeight:900,color:"#B87333",fontFamily:"monospace" }}>{fmt(buying.subtotal+selling.subtotal)}</div>
                      <div style={{ fontSize:10,color:"rgba(255,255,255,.28)",fontWeight:600 }}>{fmtPct((buying.subtotal+selling.subtotal)/price)} of property value</div>
                    </div>
                  </div>
                )}

                {/* Disclaimer */}
                <div style={{ padding:"10px 13px",background:"#FAFAF6",border:"1px solid #EDE8D8",borderRadius:7,fontSize:11,color:"rgba(43,43,43,.48)",lineHeight:1.65 }}>
                  <strong style={{ color:"rgba(43,43,43,.62)" }}>ℹ️ </strong>
                  {tab==="buy"
                    ?"DLD transfer fee (4%) is paid by the buyer. No VAT on residential property transfers; VAT applies to commercial. Always confirm with a RERA-registered agent or DLD trustee before transacting."
                    :"The 4% DLD transfer fee is the buyer's responsibility — sellers do NOT pay it. Seller costs are NOC, trustee, and agent fees only. NOC fees vary by developer. Always verify with a RERA-registered agent."}
                </div>
              </>
            ):null}
          </div>
        </div>
        <div style={{ textAlign:"center",marginTop:12,fontSize:10,color:"rgba(43,43,43,.25)",letterSpacing:".08em" }}>POWERED BY ACQAR · DATA: DUBAI LAND DEPARTMENT</div>
      </div>
    </div>
  );
}
