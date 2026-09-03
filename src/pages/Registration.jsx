import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import posthog from "posthog-js";
import acqarLogo from "../assets/acqar-logo.webp";


const ROLES = ["Investor", "Buyer", "Seller", "Broker / Real Estate Agent"];

const COUNTRY_CODES = [
  { code: "+93", label: "Afghanistan (+93)" },
  { code: "+355", label: "Albania (+355)" },
  { code: "+213", label: "Algeria (+213)" },
  { code: "+1-684", label: "American Samoa (+1-684)" },
  { code: "+376", label: "Andorra (+376)" },
  { code: "+244", label: "Angola (+244)" },
  { code: "+1-264", label: "Anguilla (+1-264)" },
  { code: "+672", label: "Antarctica (+672)" },
  { code: "+1-268", label: "Antigua & Barbuda (+1-268)" },
  { code: "+54", label: "Argentina (+54)" },
  { code: "+374", label: "Armenia (+374)" },
  { code: "+297", label: "Aruba (+297)" },
  { code: "+61", label: "Australia (+61)" },
  { code: "+43", label: "Austria (+43)" },
  { code: "+994", label: "Azerbaijan (+994)" },
  { code: "+1-242", label: "Bahamas (+1-242)" },
  { code: "+973", label: "Bahrain (+973)" },
  { code: "+880", label: "Bangladesh (+880)" },
  { code: "+1-246", label: "Barbados (+1-246)" },
  { code: "+375", label: "Belarus (+375)" },
  { code: "+32", label: "Belgium (+32)" },
  { code: "+501", label: "Belize (+501)" },
  { code: "+229", label: "Benin (+229)" },
  { code: "+1-441", label: "Bermuda (+1-441)" },
  { code: "+975", label: "Bhutan (+975)" },
  { code: "+591", label: "Bolivia (+591)" },
  { code: "+387", label: "Bosnia & Herzegovina (+387)" },
  { code: "+267", label: "Botswana (+267)" },
  { code: "+55", label: "Brazil (+55)" },
  { code: "+246", label: "British Indian Ocean Territory (+246)" },
  { code: "+1-284", label: "British Virgin Islands (+1-284)" },
  { code: "+673", label: "Brunei (+673)" },
  { code: "+359", label: "Bulgaria (+359)" },
  { code: "+226", label: "Burkina Faso (+226)" },
  { code: "+257", label: "Burundi (+257)" },
  { code: "+855", label: "Cambodia (+855)" },
  { code: "+237", label: "Cameroon (+237)" },
  { code: "+1", label: "Canada (+1)" },
  { code: "+238", label: "Cape Verde (+238)" },
  { code: "+1-345", label: "Cayman Islands (+1-345)" },
  { code: "+236", label: "Central African Republic (+236)" },
  { code: "+235", label: "Chad (+235)" },
  { code: "+56", label: "Chile (+56)" },
  { code: "+86", label: "China (+86)" },
  { code: "+61", label: "Christmas Island (+61)" },
  { code: "+61", label: "Cocos (Keeling) Islands (+61)" },
  { code: "+57", label: "Colombia (+57)" },
  { code: "+269", label: "Comoros (+269)" },
  { code: "+242", label: "Congo - Republic (+242)" },
  { code: "+243", label: "Congo - DRC (+243)" },
  { code: "+682", label: "Cook Islands (+682)" },
  { code: "+506", label: "Costa Rica (+506)" },
  { code: "+225", label: "Côte d'Ivoire (+225)" },
  { code: "+385", label: "Croatia (+385)" },
  { code: "+53", label: "Cuba (+53)" },
  { code: "+599", label: "Curaçao (+599)" },
  { code: "+357", label: "Cyprus (+357)" },
  { code: "+420", label: "Czechia (+420)" },
  { code: "+45", label: "Denmark (+45)" },
  { code: "+253", label: "Djibouti (+253)" },
  { code: "+1-767", label: "Dominica (+1-767)" },
  { code: "+1-809", label: "Dominican Republic (+1-809)" },
  { code: "+1-829", label: "Dominican Republic (+1-829)" },
  { code: "+1-849", label: "Dominican Republic (+1-849)" },
  { code: "+670", label: "East Timor (Timor-Leste) (+670)" },
  { code: "+593", label: "Ecuador (+593)" },
  { code: "+20", label: "Egypt (+20)" },
  { code: "+503", label: "El Salvador (+503)" },
  { code: "+240", label: "Equatorial Guinea (+240)" },
  { code: "+291", label: "Eritrea (+291)" },
  { code: "+372", label: "Estonia (+372)" },
  { code: "+268", label: "Eswatini (+268)" },
  { code: "+251", label: "Ethiopia (+251)" },
  { code: "+500", label: "Falkland Islands (+500)" },
  { code: "+298", label: "Faroe Islands (+298)" },
  { code: "+679", label: "Fiji (+679)" },
  { code: "+358", label: "Finland (+358)" },
  { code: "+33", label: "France (+33)" },
  { code: "+594", label: "French Guiana (+594)" },
  { code: "+689", label: "French Polynesia (+689)" },
  { code: "+241", label: "Gabon (+241)" },
  { code: "+220", label: "Gambia (+220)" },
  { code: "+995", label: "Georgia (+995)" },
  { code: "+49", label: "Germany (+49)" },
  { code: "+233", label: "Ghana (+233)" },
  { code: "+350", label: "Gibraltar (+350)" },
  { code: "+30", label: "Greece (+30)" },
  { code: "+299", label: "Greenland (+299)" },
  { code: "+1-473", label: "Grenada (+1-473)" },
  { code: "+590", label: "Guadeloupe (+590)" },
  { code: "+1-671", label: "Guam (+1-671)" },
  { code: "+502", label: "Guatemala (+502)" },
  { code: "+44-1481", label: "Guernsey (+44-1481)" },
  { code: "+224", label: "Guinea (+224)" },
  { code: "+245", label: "Guinea-Bissau (+245)" },
  { code: "+592", label: "Guyana (+592)" },
  { code: "+509", label: "Haiti (+509)" },
  { code: "+504", label: "Honduras (+504)" },
  { code: "+852", label: "Hong Kong (+852)" },
  { code: "+36", label: "Hungary (+36)" },
  { code: "+354", label: "Iceland (+354)" },
  { code: "+91", label: "India (+91)" },
  { code: "+62", label: "Indonesia (+62)" },
  { code: "+98", label: "Iran (+98)" },
  { code: "+964", label: "Iraq (+964)" },
  { code: "+353", label: "Ireland (+353)" },
  { code: "+44-1624", label: "Isle of Man (+44-1624)" },
  { code: "+972", label: "Israel (+972)" },
  { code: "+39", label: "Italy (+39)" },
  { code: "+1-876", label: "Jamaica (+1-876)" },
  { code: "+81", label: "Japan (+81)" },
  { code: "+44-1534", label: "Jersey (+44-1534)" },
  { code: "+962", label: "Jordan (+962)" },
  { code: "+7", label: "Kazakhstan (+7)" },
  { code: "+254", label: "Kenya (+254)" },
  { code: "+686", label: "Kiribati (+686)" },
  { code: "+383", label: "Kosovo (+383)" },
  { code: "+965", label: "Kuwait (+965)" },
  { code: "+996", label: "Kyrgyzstan (+996)" },
  { code: "+856", label: "Laos (+856)" },
  { code: "+371", label: "Latvia (+371)" },
  { code: "+961", label: "Lebanon (+961)" },
  { code: "+266", label: "Lesotho (+266)" },
  { code: "+231", label: "Liberia (+231)" },
  { code: "+218", label: "Libya (+218)" },
  { code: "+423", label: "Liechtenstein (+423)" },
  { code: "+370", label: "Lithuania (+370)" },
  { code: "+352", label: "Luxembourg (+352)" },
  { code: "+853", label: "Macau (+853)" },
  { code: "+389", label: "North Macedonia (+389)" },
  { code: "+261", label: "Madagascar (+261)" },
  { code: "+265", label: "Malawi (+265)" },
  { code: "+60", label: "Malaysia (+60)" },
  { code: "+960", label: "Maldives (+960)" },
  { code: "+223", label: "Mali (+223)" },
  { code: "+356", label: "Malta (+356)" },
  { code: "+692", label: "Marshall Islands (+692)" },
  { code: "+596", label: "Martinique (+596)" },
  { code: "+222", label: "Mauritania (+222)" },
  { code: "+230", label: "Mauritius (+230)" },
  { code: "+262", label: "Mayotte (+262)" },
  { code: "+52", label: "Mexico (+52)" },
  { code: "+691", label: "Micronesia (+691)" },
  { code: "+373", label: "Moldova (+373)" },
  { code: "+377", label: "Monaco (+377)" },
  { code: "+976", label: "Mongolia (+976)" },
  { code: "+382", label: "Montenegro (+382)" },
  { code: "+1-664", label: "Montserrat (+1-664)" },
  { code: "+212", label: "Morocco (+212)" },
  { code: "+258", label: "Mozambique (+258)" },
  { code: "+95", label: "Myanmar (+95)" },
  { code: "+264", label: "Namibia (+264)" },
  { code: "+674", label: "Nauru (+674)" },
  { code: "+977", label: "Nepal (+977)" },
  { code: "+31", label: "Netherlands (+31)" },
  { code: "+687", label: "New Caledonia (+687)" },
  { code: "+64", label: "New Zealand (+64)" },
  { code: "+505", label: "Nicaragua (+505)" },
  { code: "+227", label: "Niger (+227)" },
  { code: "+234", label: "Nigeria (+234)" },
  { code: "+683", label: "Niue (+683)" },
  { code: "+850", label: "North Korea (+850)" },
  { code: "+1-670", label: "Northern Mariana Islands (+1-670)" },
  { code: "+47", label: "Norway (+47)" },
  { code: "+968", label: "Oman (+968)" },
  { code: "+92", label: "Pakistan (+92)" },
  { code: "+680", label: "Palau (+680)" },
  { code: "+970", label: "Palestine (+970)" },
  { code: "+507", label: "Panama (+507)" },
  { code: "+675", label: "Papua New Guinea (+675)" },
  { code: "+595", label: "Paraguay (+595)" },
  { code: "+51", label: "Peru (+51)" },
  { code: "+63", label: "Philippines (+63)" },
  { code: "+48", label: "Poland (+48)" },
  { code: "+351", label: "Portugal (+351)" },
  { code: "+1-787", label: "Puerto Rico (+1-787)" },
  { code: "+1-939", label: "Puerto Rico (+1-939)" },
  { code: "+974", label: "Qatar (+974)" },
  { code: "+262", label: "Réunion (+262)" },
  { code: "+40", label: "Romania (+40)" },
  { code: "+7", label: "Russia (+7)" },
  { code: "+250", label: "Rwanda (+250)" },
  { code: "+590", label: "Saint Barthélemy (+590)" },
  { code: "+290", label: "Saint Helena (+290)" },
  { code: "+1-869", label: "Saint Kitts & Nevis (+1-869)" },
  { code: "+1-758", label: "Saint Lucia (+1-758)" },
  { code: "+590", label: "Saint Martin (+590)" },
  { code: "+508", label: "Saint Pierre & Miquelon (+508)" },
  { code: "+1-784", label: "Saint Vincent & the Grenadines (+1-784)" },
  { code: "+685", label: "Samoa (+685)" },
  { code: "+378", label: "San Marino (+378)" },
  { code: "+239", label: "São Tomé & Príncipe (+239)" },
  { code: "+966", label: "Saudi Arabia (+966)" },
  { code: "+221", label: "Senegal (+221)" },
  { code: "+381", label: "Serbia (+381)" },
  { code: "+248", label: "Seychelles (+248)" },
  { code: "+232", label: "Sierra Leone (+232)" },
  { code: "+65", label: "Singapore (+65)" },
  { code: "+1-721", label: "Sint Maarten (+1-721)" },
  { code: "+421", label: "Slovakia (+421)" },
  { code: "+386", label: "Slovenia (+386)" },
  { code: "+677", label: "Solomon Islands (+677)" },
  { code: "+252", label: "Somalia (+252)" },
  { code: "+27", label: "South Africa (+27)" },
  { code: "+82", label: "South Korea (+82)" },
  { code: "+211", label: "South Sudan (+211)" },
  { code: "+34", label: "Spain (+34)" },
  { code: "+94", label: "Sri Lanka (+94)" },
  { code: "+249", label: "Sudan (+249)" },
  { code: "+597", label: "Suriname (+597)" },
  { code: "+46", label: "Sweden (+46)" },
  { code: "+41", label: "Switzerland (+41)" },
  { code: "+963", label: "Syria (+963)" },
  { code: "+886", label: "Taiwan (+886)" },
  { code: "+992", label: "Tajikistan (+992)" },
  { code: "+255", label: "Tanzania (+255)" },
  { code: "+66", label: "Thailand (+66)" },
  { code: "+228", label: "Togo (+228)" },
  { code: "+690", label: "Tokelau (+690)" },
  { code: "+676", label: "Tonga (+676)" },
  { code: "+1-868", label: "Trinidad & Tobago (+1-868)" },
  { code: "+216", label: "Tunisia (+216)" },
  { code: "+90", label: "Turkey (+90)" },
  { code: "+993", label: "Turkmenistan (+993)" },
  { code: "+1-649", label: "Turks & Caicos Islands (+1-649)" },
  { code: "+688", label: "Tuvalu (+688)" },
  { code: "+1-340", label: "U.S. Virgin Islands (+1-340)" },
  { code: "+256", label: "Uganda (+256)" },
  { code: "+380", label: "Ukraine (+380)" },
  { code: "+971", label: "United Arab Emirates (+971)" },
  { code: "+44", label: "United Kingdom (+44)" },
  { code: "+1", label: "United States (+1)" },
  { code: "+598", label: "Uruguay (+598)" },
  { code: "+998", label: "Uzbekistan (+998)" },
  { code: "+678", label: "Vanuatu (+678)" },
  { code: "+379", label: "Vatican City (+379)" },
  { code: "+58", label: "Venezuela (+58)" },
  { code: "+84", label: "Vietnam (+84)" },
  { code: "+681", label: "Wallis & Futuna (+681)" },
  { code: "+212", label: "Western Sahara (+212)" },
  { code: "+967", label: "Yemen (+967)" },
  { code: "+260", label: "Zambia (+260)" },
  { code: "+263", label: "Zimbabwe (+263)" },
];

export default function Registration() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.from || "/chat";

  const [role, setRole]               = useState("Investor");
  const [name, setName]               = useState("");
  const [countryCode, setCountryCode] = useState("+971");
  const [phone, setPhone]             = useState("");
  const [reraId, setReraId]           = useState("");
  const [agree, setAgree]             = useState(false);
  const [error, setError]             = useState(null);
  const [loading, setLoading]         = useState(false);
  const [email, setEmail] = useState("");

  const isBroker = role === "Broker / Real Estate Agent";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // ── Validation ──────────────────────────────────────
if (!name.trim())  return setError("Please enter your full name.");
if (!email.trim()) return setError("Please enter your email.");
if (!phone.trim()) return setError("Please enter your phone number.");
if (isBroker && !reraId.trim()) return setError("Please enter your RERA ID number.");

if (!agree)        return setError("Please agree to the Terms of Service and Privacy Policy.");

    setLoading(true);
try {
  // 1. Reuse existing session, or create an anonymous one
  let { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const { data, error: anonErr } = await supabase.auth.signInAnonymously();
    if (anonErr) throw anonErr;
    session = data.session;
  }
  const user = session.user;

  const phoneValue = phone.trim() ? `${countryCode}${phone.trim()}` : null;
  const reraValue  = reraId.trim() ? reraId.trim() : null;

  // 2. Attach profile info to the auth user
await supabase.auth.updateUser({
    data: {
      name:  name.trim(),
      role,
      email: email.trim(),
      phone: phoneValue,
      rera_id: reraValue,
    },
  });

 // 3. Atomic upsert on email — no race condition, no manual check needed.
  const normalizedEmail = email.trim().toLowerCase();

  const { error: upsertErr } = await supabase.rpc("upsert_user_profile", {
    p_id: user.id,
    p_email: normalizedEmail,
    p_name: name.trim(),
    p_role: role,
    p_phone: phoneValue,
    p_rera_id: reraValue,
  });
  if (upsertErr) throw upsertErr;
  // 4. Identify in PostHog (same as login page)
  const { data: { user: identifiedUser } } = await supabase.auth.getUser();
  if (identifiedUser) {
    posthog.identify(identifiedUser.id, { email: identifiedUser.email });
    sessionStorage.setItem('acqar_username', identifiedUser.user_metadata?.full_name || identifiedUser.user_metadata?.name || identifiedUser.email)
  }

  // 5. Back to wherever the user came from
  navigate(returnTo, { replace: true });
} catch (err) {
  setError(err?.message || "Something went wrong. Please try again.");
} finally {
  setLoading(false);
}};

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Header */}
        <div 
  style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
  onClick={() => navigate("/")}
>
 <div style={styles.logoBox}>
  <img src={acqarLogo} alt="ACQAR" width={22} height={22} style={{ display: "block" }} />
</div>

  <h1 className="text-xl sm:text-2xl font-black tracking-tighter uppercase whitespace-nowrap">
    <span style={{ color: "var(--color-accent)" }}>ACQ</span>
    <span style={{ color: "var(--color-ink)" }}>AR</span>
  </h1>
</div>

        <h2 style={styles.title}>Complete Your Profile</h2>
        <p style={styles.sub}>
          Just a few details to personalise your ACQAR experience.
        </p>

        {error && <div style={styles.errorBox}>{error}</div>}

        {/* Role selector */}
        <div style={styles.section}>
          <div style={styles.label}>I am a/an:</div>
          <div style={styles.roleRow}>
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                style={{
                  ...styles.roleBtn,
                  ...(r === role ? styles.roleBtnActive : {}),
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Full Name */}
          <div style={styles.field}>
            <label style={styles.label}>Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              style={styles.input}
              autoComplete="name"
            />
          </div>

{/* Email */}
<div style={styles.field}>
  <label style={styles.label}>Email</label>
  <input
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    placeholder="you@example.com"
    style={styles.input}
    autoComplete="email"
  />
</div>
          {/* Phone */}
          <div style={styles.field}>
          <label style={styles.label}>
   Phone Number
</label>
            <div style={styles.phoneRow}>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                style={styles.ccSelect}
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="50 000 0000"
                style={styles.phoneInput}
                autoComplete="tel"
              />
            </div>
          </div>

          {/* RERA ID (optional) — brokers/agents only */}
          {isBroker && (
            <div style={styles.field}>
              <label style={styles.label}>
  RERA ID Number
</label>
              <input
                type="text"
                value={reraId}
                onChange={(e) => setReraId(e.target.value)}
                placeholder="RERA ID (if applicable)"
                style={styles.input}
                autoComplete="off"
              />
            </div>
          )}

          {/* Terms */}
          <div style={styles.termsRow}>
            <input
              id="agree"
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              style={styles.checkbox}
            />
            <label htmlFor="agree" style={styles.termsText}>
              I agree to the{" "}
              <a href="/terms" style={styles.link}>Terms of Service</a> and{" "}
              <a href="/privacy" style={styles.link}>Privacy Policy</a>,
              including the processing of my property data.
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.cta,
              opacity: loading ? 0.75 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Saving…" : "Create Account →"}
          </button>
        </form>

        <p style={styles.signinRow}>
          Already have an account?{" "}
          <span style={styles.signinLink} onClick={() => navigate("/loginpage")}>
            Sign In
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "var(--color-cream)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
    fontFamily: "var(--font-sans)",
  },
  card: {
    background: "#ffffff",
    borderRadius: 20,
    padding: "32px 40px",
    width: "100%",
    maxWidth: 660,
    boxShadow: "var(--shadow-lg)",
    boxSizing: "border-box",
  },
  logoRow:  { display: "flex", alignItems: "center", gap: 10, marginBottom: 20 },
  logoBox:  {
    width: 34, height: 34, borderRadius: 9,
    background: "#fff8f3", border: "1px solid rgba(184,115,51,0.28)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  logoText: { fontSize: 17, fontWeight: 800, color: "var(--color-ink)", letterSpacing: 2.5 },
  title: { margin: "16px 0 5px", fontSize: 22, fontWeight: 800, color: "var(--color-ink)" },
  sub:   { margin: "0 0 20px", fontSize: 13.5, color: "var(--color-muted)", lineHeight: 1.5 },

  errorBox: {
    marginBottom: 14,
    background: "#fff1f2", border: "1px solid #fecdd3",
    color: "#9f1239", padding: "10px 14px",
    borderRadius: 12, fontSize: 13, fontWeight: 600,
  },

  section: { marginBottom: 16 },
  label:   { display: "block", fontSize: 13, fontWeight: 700, color: "var(--color-ink)", marginBottom: 7 },
  roleRow: { display: "flex", gap: 8, flexWrap: "wrap" },
 roleBtn: {
    padding: "8px 16px", borderRadius: 10,
    border: "1px solid var(--color-line)", background: "#ffffff",
    fontWeight: 600, fontSize: 13, color: "#374151",
    cursor: "pointer", fontFamily: "inherit",
    whiteSpace: "nowrap",
  },
  roleBtnActive: {
    border: "1.5px solid var(--color-accent)",
    background: "#fdf5ee", color: "var(--color-accent-dark)", fontWeight: 700,
  },

  field:  { marginBottom: 14 },
  input:  {
    width: "100%", boxSizing: "border-box",
    border: "1px solid var(--color-line)", borderRadius: 12,
    padding: "11px 14px", fontSize: 14,
    outline: "none", background: "#ffffff",
    color: "var(--color-ink)", fontFamily: "inherit",
  },

  phoneRow: {
    display: "flex",
    gap: 8,
    position: "relative",
    flexWrap: "wrap"
  },
  ccSelect: {
    width: 230, flexShrink: 0, height: 42,
    borderRadius: 12, border: "1px solid var(--color-line)",
    background: "#ffffff", fontWeight: 600,
    color: "#374151", outline: "none",
    padding: "0 10px", cursor: "pointer",
    fontSize: 13, fontFamily: "inherit",
  },
  phoneInput: {
    flex: 1, minWidth: 140, border: "1px solid var(--color-line)",
    borderRadius: 12, outline: "none",
    fontSize: 14, padding: "11px 14px",
    background: "#ffffff", color: "var(--color-ink)",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },

  termsRow: { display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 18 },
  checkbox: { width: 16, height: 16, marginTop: 2, flexShrink: 0, accentColor: "var(--color-accent)" },
  termsText:{ fontSize: 13, color: "var(--color-muted)", fontWeight: 500, lineHeight: 1.5 },
  link:     { color: "var(--color-accent)", fontWeight: 700, textDecoration: "none" },

  cta: {
    width: "100%", border: "none", borderRadius: 12,
    padding: "13px 18px",
    background: "linear-gradient(180deg, var(--color-accent) 0%, var(--color-accent-dark) 100%)",
    boxShadow: "var(--shadow-glow)",
    fontSize: 15.5, fontWeight: 800, color: "#ffffff",
    fontFamily: "inherit",
  },
  signinRow: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 13.5,
    color: "var(--color-muted)",
    fontWeight: 500,
    background: "linear-gradient(180deg, #fdf6ef 0%, #fef9f4 100%)",
    borderRadius: 10,
    padding: "10px 14px",
  },
  signinLink: {
    color: "var(--color-accent)",
    fontWeight: 800,
    cursor: "pointer",
  },
};
