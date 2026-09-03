import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import posthog from "posthog-js";
import acqarLogo from "../assets/acqar-logo.webp";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep]       = useState("email"); // "email" | "otp"
  const [email, setEmail]     = useState("");
  const [otp, setOtp]         = useState("");
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // ── Step 1: send OTP ──────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) return setError("Please enter your email.");
    if (!emailRegex.test(email.trim())) return setError("Please enter a valid email address.");

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: true },
      });
      if (otpErr) throw otpErr;

      setEmail(normalizedEmail);
      setStep("otp");
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP ────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(null);

    if (!otp.trim()) return setError("Please enter the code we sent you.");

    setLoading(true);
    try {
      const { data, error: verifyErr } = await supabase.auth.verifyOtp({
        email,
        token: otp.trim(),
        type: "email",
      });
      if (verifyErr) throw verifyErr;

      const user = data?.user;
const session = data?.session;

if (user) {
  posthog.identify(user.id, { email });
  sessionStorage.setItem("acqar_username", email);
}

const isAdmin = user?.app_metadata?.role === "admin";

if (isAdmin && session) {
  const { supabaseAdmin } = await import("../lib/supabaseAdmin");
  await supabaseAdmin.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  await supabase.auth.signOut(); // keep admin out of the public session
  navigate("/admin-dashboard", { replace: true });
} else {
  const redirectTo = location.state?.from || "/chat";
  navigate(redirectTo, { replace: true });
}
    } catch (err) {
      setError(err?.message || "Invalid or expired code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (otpErr) throw otpErr;
    } catch (err) {
      setError(err?.message || "Could not resend code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = () => {
    setError(null);
    setOtp("");
    setStep("email");
  };

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

        {step === "email" ? (
          <>
            <h2 style={styles.title}>Log In</h2>
            <p style={styles.sub}>Enter your email to continue to ACQAR.</p>
          </>
        ) : (
          <>
            <h2 style={styles.title}>Verify Your Email</h2>
            <p style={styles.sub}>
              Enter the 6-digit code we sent to <strong>{email}</strong>.
            </p>
          </>
        )}

        {error && <div style={styles.errorBox}>{error}</div>}

        {step === "email" ? (
          <form onSubmit={handleSendOtp}>
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

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.cta,
                opacity: loading ? 0.75 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Sending code…" : "Sign In →"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div style={styles.field}>
              <label style={styles.label}>Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                style={{ ...styles.input, letterSpacing: 4, textAlign: "center", fontSize: 18 }}
                autoComplete="one-time-code"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.cta,
                opacity: loading ? 0.75 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Verifying…" : "Verify & Continue →"}
            </button>

            <div style={styles.linkRow}>
              <button type="button" onClick={handleChangeEmail} style={styles.linkBtn}>
                Change email
              </button>
              <span style={{ color: "var(--color-line)" }}>·</span>
              <button type="button" onClick={handleResend} disabled={loading} style={styles.linkBtn}>
                Resend code
              </button>
            </div>
          </form>
        )}

        <p style={styles.signupRow}>
          Don't have an account?{" "}
          <span style={styles.signupLink} onClick={() => navigate("/complete-profile")}>
            Request Access
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

  field:  { marginBottom: 18 },
  label:  { display: "block", fontSize: 13, fontWeight: 700, color: "var(--color-ink)", marginBottom: 7 },
  input:  {
    width: "100%", boxSizing: "border-box",
    border: "1px solid var(--color-line)", borderRadius: 12,
    padding: "11px 14px", fontSize: 14,
    outline: "none", background: "#ffffff",
    color: "var(--color-ink)", fontFamily: "inherit",
  },

  cta: {
    width: "100%", border: "none", borderRadius: 12,
    padding: "13px 18px",
    background: "linear-gradient(180deg, var(--color-accent) 0%, var(--color-accent-dark) 100%)",
    boxShadow: "var(--shadow-glow)",
    fontSize: 15.5, fontWeight: 800, color: "#ffffff",
    fontFamily: "inherit",
  },

  linkRow: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
  linkBtn: {
    background: "none",
    border: "none",
    padding: 0,
    fontSize: 13,
    fontWeight: 600,
    color: "var(--color-accent)",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  signupRow: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 13.5,
    color: "var(--color-muted)",
    fontWeight: 500,
  },
  signupLink: {
    color: "var(--color-ink)",
    fontWeight: 800,
    cursor: "pointer",
  },
};
