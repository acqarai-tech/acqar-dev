import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  PaymentElement,
  Elements,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { supabase } from "../lib/supabase";

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

// ── Inner checkout form ──────────────────────────────────────────────────────
function CheckoutForm({ onSuccess, onError, userDetails, isLoggedIn, paymentIntentId, setClientSecret, setPaymentIntentId, valuationId, termsAccepted, setTermsAccepted, existingUserId }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
const [discountCode, setDiscountCode] = useState("");
const [discountApplied, setDiscountApplied] = useState(false);
const [discountError, setDiscountError] = useState("");
const [discountData, setDiscountData] = useState(null);


  const handlePay = async () => {
    if (!discountApplied && (!stripe || !elements)) return;

    if (!termsAccepted) {
      setErrMsg("Please accept the Terms and Conditions to proceed with payment.");
      return;
    }

    // ── Validate fields first ──
   if (!isLoggedIn && !existingUserId) {
  if (!userDetails.name.trim()) {
    setErrMsg("Please enter your full name.");
    return;
  }
  if (!userDetails.email.trim()) {
    setErrMsg("Please enter your email address.");
    return;
  }
  if (!userDetails.phone.trim()) {
    setErrMsg("Please enter your phone number.");
    return;
  }
  if (!userDetails.role) {
    setErrMsg("Please select your role.");
    return;
  }
}

    setLoading(true);
    setErrMsg("");

    try {

      // ── STEP 1: Create or login user BEFORE payment ──
      // We need a real user session before we can do anything
      let userId = null;

if (isLoggedIn) {
  // ── Already logged in — just get current user ID ──
  const { data: { session } } = await supabase.auth.getSession();
  userId = session?.user?.id;
} else {
  // ── Not logged in — sign up or sign in ──
 if (existingUserId) {
    userId = existingUserId;

    // ── Sign in so Supabase RLS allows the update ──
    const { data: signInData } = await supabase.auth.signInWithPassword({
      email: userDetails.email.trim(),
      password: `${userDetails.countryCode}${userDetails.phone.trim()}`,
    });
    if (signInData?.session?.user?.id) {
      userId = signInData.session.user.id;
    }


  } else {
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
  email: userDetails.email.trim(),
  password: `${userDetails.countryCode}${userDetails.phone.trim()}`,
  options: {
    emailRedirectTo: null,
    data: {
      full_name: userDetails.name.trim(),
      phone: `${userDetails.countryCode}${userDetails.phone.trim()}`,
    },
  },
});
 

  if (signUpError && signUpError.message === "User already registered") {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: userDetails.email.trim(),
      password: `${userDetails.countryCode}${userDetails.phone.trim()}`,
    });

  if (signInError) {
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", userDetails.email.trim().toLowerCase())
      .maybeSingle();

if (existingUser?.id) {
        userId = existingUser.id;
      } else {
       setErrMsg("Login failed. Please check your credentials or use a different email.");
      setLoading(false);
      return;
      }

    } else {
      userId = signInData.session.user.id;
    }

   } else if (signUpError) {
    setErrMsg(signUpError.message);
    setLoading(false);
    return;
  } else {
    userId = signUpData.user?.id;
  }}
}

if (!userId) {
  setErrMsg("Could not create account. Please try again.");
  setLoading(false);
  return;
}
      // ── STEP 2: Insert user row into users table ──
      // Do this BEFORE payment so the row exists
      // const { error: insertError } = await supabase.from("users").upsert({
      //   id: userId,
      //   email: userDetails.email.trim(),
      //   full_name: userDetails.name.trim(),
      //   name: userDetails.name.trim(),        // ✅ name column
      //   phone: `${userDetails.countryCode}${userDetails.phone.trim()}`,
      //   role: userDetails.role || null,        // ✅ role column
      //   plan: "free",
      //   free_reports_used: 0,
      //   free_reports_limit: 3,
      //   is_founding_member: false,
      // }, { onConflict: "id" });

      // ── STEP 2: Insert user row — only for new signups ──
if (!isLoggedIn && !existingUserId) {
      const { error: insertError } = await supabase.from("users").upsert(
        {
          id: userId,
          role: userDetails.role,
          name: userDetails.name.trim(),
          email: userDetails.email.trim(),
          phone: `${userDetails.countryCode}${userDetails.phone.trim()}`,
          provider: "email",
          plan: "free",
          free_reports_used: 0,
          free_reports_limit: 3,
          is_founding_member: false,
          plan_started_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      if (insertError) {
        console.error("[PaywallModal] Users table insert error:", insertError);
      } else {
        console.log("[PaywallModal] User row created/updated in users table ✅");
      }
}

     

      // ── STEP 3: Process payment ──

// ── FREE/DISCOUNT: Skip Stripe, upgrade directly ──
if (discountApplied) {
  const originalPrice = 29;
  const discountPct = discountData?.discount_percentage || 100;
  const amountPaid = Math.round(originalPrice * (1 - discountPct / 100));

  const { error: upgradeError } = await supabase.from("users").update({
    plan: "pro",
    account_type: "pro",
    free_reports_limit: 10,
    free_reports_used: 0,
    is_founding_member: true,
    plan_activated_at: new Date().toISOString(),
    plan_started_at: new Date().toISOString(),
    discount_code_used: discountCode.trim(),
    amount_paid: amountPaid,
  }).eq("id", userId);

  if (upgradeError) {
    setErrMsg("Account upgrade failed. Please contact support.");
    setLoading(false);
    return;
  }

  // ── Sign in existing user after upgrade so dashboard shows pro ──
  if (existingUserId && !isLoggedIn) {
    await supabase.auth.signInWithOtp({ email: userDetails.email.trim() });
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      window.location.href = "/dashboard";
    }, 3000);
    setLoading(false);
    return;
  }

await supabase.from("users").update({
  profile_completed: true,
}).eq("id", userId);


await fetch(
  `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-payment-confirmation`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      name: userDetails.name.trim(),
      email: userDetails.email.trim(),
      plan: "Pro",
      amount: "AED 29",
    }),
  }
);

setShowSuccess(true);
setTimeout(() => {
  setShowSuccess(false);
  window.location.href = "/dashboard";
}, 3000);
setLoading(false);
return;
}
    

// ── STEP 4: Update receipt email before payment ──
// ── STEP 4: Update receipt email before payment ──
if (userDetails.email) {
  try {
    await fetch(
      `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/update-payment-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: userDetails.email.trim(),
          userId: userId,
          isGuest: !isLoggedIn,
          paymentIntentId: paymentIntentId,
        }),
      }
    );
  } catch (e) {
    console.log("Email update skipped:", e.message);
  }
}

// ── STEP 5: Process payment ──
// ── STEP 5: Process payment ──
const paymentElement = elements.getElement("payment");
const isWallet = paymentElement?._implementation?._frame?._appName === "wallets";

console.log("[PAY DEBUG] paymentElement:", paymentElement);
console.log("[PAY DEBUG] isWallet detected:", isWallet);
console.log("[PAY DEBUG] appName:", paymentElement?._implementation?._frame?._appName);

const confirmParams = {
  return_url: window.location.href,
};

// Only pass billing_details for card — NOT for Google Pay / Apple Pay
// Always pass billing_details — remove address since it's set to "never"
confirmParams.payment_method_data = {
  billing_details: {
    email: userDetails.email?.trim() || "",
    name: userDetails.name?.trim() || "",
    phone: userDetails.phone
      ? `${userDetails.countryCode}${userDetails.phone.trim()}`
      : "",
  },
};

console.log("[PAY DEBUG] confirmParams:", JSON.stringify(confirmParams, null, 2));
console.log("[PAY DEBUG] calling stripe.confirmPayment...");

const { error: paymentError, paymentIntent } = await stripe.confirmPayment({
  elements,
  confirmParams,
  redirect: "if_required",
});

console.log("[PAY DEBUG] paymentError:", paymentError);
console.log("[PAY DEBUG] paymentError?.code:", paymentError?.code);
console.log("[PAY DEBUG] paymentError?.type:", paymentError?.type);
console.log("[PAY DEBUG] paymentError?.message:", paymentError?.message);
console.log("[PAY DEBUG] paymentIntent:", paymentIntent);

if (paymentError) {
  // ── DEBUG: Print full error ──
  console.log("[APPLE PAY ERROR] Full error object:", JSON.stringify(paymentError, null, 2));
  console.log("[APPLE PAY ERROR] type:", paymentError.type);
  console.log("[APPLE PAY ERROR] code:", paymentError.code);
  console.log("[APPLE PAY ERROR] message:", paymentError.message);
  console.log("[APPLE PAY ERROR] decline_code:", paymentError.decline_code);
  console.log("[APPLE PAY ERROR] param:", paymentError.param);

  if (paymentError.type === 'card_error' || paymentError.type === 'validation_error') {
    setErrMsg(paymentError.message);
  } else {
    // ── Show actual error in UI for debugging ──
    setErrMsg(`Error [${paymentError.type}] ${paymentError.code}: ${paymentError.message}`);
  }
  onError?.(paymentError.message);
  setLoading(false);
  return;
}
      if (paymentIntent?.status === "succeeded") {
        console.log("[PaywallModal] Payment succeeded ✅");


     const { data: { session } } = await supabase.auth.getSession();

  await fetch(
    `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/save-payment-details`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": session
          ? `Bearer ${session.access_token}`
          : `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        paymentIntentId: paymentIntent.id,
        userId: userId,
      }),
    }
  );
        // ── STEP 4: Upgrade user to pro ──
       // ── STEP 4: Upgrade user to pro ──
const originalPrice = 29;
const discountPct = discountApplied ? (discountData?.discount_percentage || 0) : 0;
const amountPaid = Math.round(originalPrice * (1 - discountPct / 100));

const { error: upgradeError } = await supabase.from("users").update({
  plan: "pro",
  account_type: "pro",
  free_reports_limit: 10,
  free_reports_used: 0,
  is_founding_member: true,
  plan_activated_at: new Date().toISOString(),
  plan_started_at: new Date().toISOString(),
  discount_code_used: discountApplied ? discountCode.trim() : null,
  amount_paid: amountPaid,
}).eq("id", userId);

if (upgradeError) {
  console.error("[PaywallModal] Plan upgrade error:", upgradeError);
} else {
  console.log("[PaywallModal] Plan upgraded to pro ✅");
}
        // ── Sign in the existing user after payment ──
if (existingUserId && !isLoggedIn) {
  // Existing user — send OTP magic link then redirect to dashboard
  await supabase.auth.signInWithOtp({ email: userDetails.email.trim() });
  setShowSuccess(true);
  setTimeout(() => {
    setShowSuccess(false);
    window.location.href = "/dashboard";
  }, 3000);
  return;
}
       // ── Send welcome email ──
await supabase.from("users").update({
  profile_completed: true,
}).eq("id", userId);

await fetch(
  `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-payment-confirmation`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      name: userDetails.name.trim(),
      email: userDetails.email.trim(),
      plan: "Pro",
      amount: "AED 29",
    }),
  }
);

// ── STEP 5: Done → go to dashboard ──
setShowSuccess(true);
setTimeout(() => {
  setShowSuccess(false);
  window.location.href = "/dashboard";
}, 3000);
      } else {
        setErrMsg('Payment was not completed. Please try again or use a different card.');
        setLoading(false);
        return;
      }
    } catch (e) {
      console.error("[PaywallModal] Unexpected error:", e);
      setErrMsg(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>


       {/* ── Success popup overlay ── */}
      {showSuccess && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}>
          <div style={{
            background: "#fff",
            borderRadius: 20,
            padding: "40px 32px",
            maxWidth: 380,
            width: "100%",
            textAlign: "center",
            boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
            animation: "fadeInUp 0.4s ease",
          }}>
            {/* Checkmark circle */}
            <div style={{
              width: 72, height: 72,
              borderRadius: "50%",
              background: "rgba(34,197,94,0.1)",
              border: "3px solid rgba(34,197,94,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>

            {/* Title */}
            <h2 style={{
              fontSize: 22, fontWeight: 900,
              color: "#1a1a1a", marginBottom: 8,
              letterSpacing: "-0.02em",
            }}>
              Payment Successful! 🎉
            </h2>

            {/* Subtitle */}
            <p style={{
              fontSize: 14, color: "#666",
              lineHeight: 1.6, marginBottom: 20,
            }}>
              Welcome to <strong style={{ color: "#B87333" }}>Acqar Pro</strong>!
              Your account has been activated. Redirecting to your dashboard...
            </p>

            {/* Plan badge */}
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 20px",
              background: "#FFF7ED",
              border: "1px solid #F5C89A",
              borderRadius: 999,
              marginBottom: 20,
            }}>
              <span style={{ fontSize: 16 }}>⭐</span>
              <span style={{
                fontSize: 12, fontWeight: 800,
                color: "#B87333", textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}>
                Founding Member — Pro Plan
              </span>
            </div>

            {/* Loading bar */}
            <div style={{
              height: 4,
              background: "#f3f4f6",
              borderRadius: 999,
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                background: "linear-gradient(to right, #B87333, #D4956A)",
                borderRadius: 999,
                animation: "progressBar 3s linear forwards",
              }} />
            </div>

            <style>{`
              @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
              }
              @keyframes progressBar {
                from { width: 0%; }
                to { width: 100%; }
              }
            `}</style>
          </div>
        </div>
      )}

      {/* ── Discount Code ── */}
<div style={{ marginBottom: 16 }}>
  <label style={{
    fontSize: 11, fontWeight: 700, color: "#555",
    display: "block", marginBottom: 4,
    textTransform: "uppercase", letterSpacing: "0.08em"
  }}>
    Discount Code (Optional)
  </label>
  <div style={{ display: "flex", gap: 8 }}>
    <input
      type="text"
      placeholder="Enter code"
      value={discountCode}
      onChange={(e) => {
        setDiscountCode(e.target.value.toUpperCase());
        setDiscountApplied(false);
        setDiscountError("");
      }}
      disabled={discountApplied}
      style={{
        flex: 1, padding: "13px 15px", borderRadius: 8,
        border: `1px solid ${discountApplied ? "#16a34a" : "#e5e7eb"}`,
        fontSize: 14, outline: "none", boxSizing: "border-box",
        fontFamily: "inherit",
        background: discountApplied ? "#f0fdf4" : "#fff",
      }}
    />
    <button
      onClick={async () => {
  if (!discountCode.trim()) return;

  const { data, error } = await supabase
    .from('discount_codes')
    .select('code, is_active, discount_percentage')
    .eq('code', discountCode.trim().toUpperCase())
    .maybeSingle();

  if (error || !data) {
    setDiscountError("Invalid discount code.");
    setDiscountApplied(false);
  } else if (!data.is_active) {
    setDiscountError("This discount code is no longer active.");
    setDiscountApplied(false);
 } else {
  setDiscountApplied(true);
  setDiscountData(data);
  setDiscountError("");
}
}}
      disabled={discountApplied || !discountCode.trim()}
      style={{
        padding: "13px 18px", borderRadius: 8,
        background: discountApplied ? "#16a34a" : "#B87333",
        color: "#fff", border: "none", fontWeight: 700,
        fontSize: 13, cursor: discountApplied ? "default" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {discountApplied ? "✓ Applied" : "Apply"}
    </button>
  </div>
  {discountError && (
    <p style={{ fontSize: 11, color: "#dc2626", marginTop: 4, marginBottom: 0 }}>
      ⚠️ {discountError}
    </p>
  )}
  {discountApplied && (
    <p style={{ fontSize: 11, color: "#16a34a", fontWeight: 700, marginTop: 4, marginBottom: 0 }}>
      ✅ 100% discount applied — your order is FREE!
    </p>
  )}
</div>
     {!discountApplied && <PaymentElement
  options={{
    fields: {
  billingDetails: {
    email: "never",
    phone: "never",
    address: "auto",
    name: "never",
  }
},
   wallets: {
  applePay: "auto",
  googlePay: "auto",
  link: "never",
},
    layout: {
      type: "tabs",
      defaultCollapsed: false,
    },
  }}
/>}

  {/* ── Terms box ── */}
      <div style={{ marginTop: 16, marginBottom: 4 }}>
        <div style={{
          background: "#f9fafb", border: "1px solid #e5e7eb",
          borderRadius: 10, padding: "14px 16px",
          maxHeight: 160, overflowY: "auto", marginBottom: 10,
        }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: "#1a1a1a", marginBottom: 6, marginTop: 0 }}>
  ACQAR Platform — Terms of Use & Payment Agreement
</p>
          <p style={{ fontSize: 11, color: "#444", marginBottom: 6 }}>By proceeding further you agree to the following:</p>
         <ul style={{ fontSize: 11, color: "#444", lineHeight: 1.7, paddingLeft: "1.1rem", margin: 0, listStyleType: "disc" }}>
  <li style={{ marginBottom: 5 }}>
    <strong style={{ color: "#1a1a1a" }}>AI-Generated Estimates:</strong> ACQAR TRUVALU™ valuations are produced by an AI model trained on Dubai real estate transaction data. They are indicative estimates only and do not constitute a formal RICS or CBUAE-compliant property valuation, financial advice, or legal documentation.
  </li>
  <li style={{ marginBottom: 5 }}>
    <strong style={{ color: "#1a1a1a" }}>No Refund Policy:</strong> All payments are strictly non-refundable once processed. By proceeding, you confirm that you have reviewed the platform, understand what you are purchasing, and have selected the correct plan. No exceptions will be made.
  </li>
  <li style={{ marginBottom: 5 }}>
    <strong style={{ color: "#1a1a1a" }}>Personal Use Only:</strong> Reports, valuations, and data generated on ACQAR are licensed for your personal, non-commercial use only. Redistribution, resale, republication, or commercial use of any ACQAR output without prior written consent from ACQARLABS L.L.C-FZ is strictly prohibited.
  </li>
  <li style={{ marginBottom: 5 }}>
    <strong style={{ color: "#1a1a1a" }}>Limitation of Liability:</strong> ACQARLABS L.L.C-FZ is not liable for any investment, financial, legal, or tax decisions made based on valuations, forecasts, or market data provided on this platform. Always seek independent professional advice before making property decisions.
  </li>
  <li style={{ marginBottom: 5 }}>
    <strong style={{ color: "#1a1a1a" }}>Data Accuracy:</strong> While ACQAR sources data from Dubai Land Department (DLD) transaction records, we do not guarantee the completeness or real-time accuracy of any data displayed. Market conditions change rapidly and past performance is not indicative of future values.
  </li>
  <li style={{ marginBottom: 5 }}>
    <strong style={{ color: "#1a1a1a" }}>Founding Member Pricing:</strong> The Founding Member rate of AED 29/mo is guaranteed for your first 3 months only. After this period, billing automatically continues at the standard rate of AED 149/mo unless you cancel. You may cancel anytime before your next renewal date with no cancellation fee.
  </li>
  <li>
    <strong style={{ color: "#1a1a1a" }}>Governing Law:</strong> These terms are governed by the laws of the United Arab Emirates. Any disputes shall be subject to the exclusive jurisdiction of the courts of Dubai, UAE.
  </li>
</ul>
        </div>
        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={e => setTermsAccepted(e.target.checked)}
            style={{ marginTop: 2, accentColor: "#B87333", width: 15, height: 15, flexShrink: 0 }}
          />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#2B2B2B" }}>
            I have read and accept the Payment Terms and Conditions
          </span>
        </label>
      </div>


      {errMsg && (
        <div style={{
          marginTop: 10, padding: "10px 14px",
          background: "#fef2f2", border: "1px solid #fecaca",
          borderRadius: 8, color: "#dc2626", fontSize: 12,
        }}>
          ⚠️ {errMsg}
        </div>
      )}
      <button
        onClick={handlePay}
        disabled={(!discountApplied && !stripe) || loading}
        style={{
         display: "block", margin: "24px auto 0",
width: "min(100%, 400px)", padding: "16px 28px",
  background: loading ? "#ccc" : discountApplied ? "#16a34a" : "#B87333",
          color: "#fff", borderRadius: 10, border: "none",
          fontWeight: 700, fontSize: 15,
          cursor: loading ? "not-allowed" : "pointer",
          fontFamily: "inherit",
        }}
      >
      {loading ? "Processing..." : discountApplied ? "Activate Pro for FREE 🎉" : "Pay AED 29 & Activate Pro"}
      </button>
    </div>
  );
}

// ── Main Modal ───────────────────────────────────────────────────────────────
export default function PaywallModal({ valuationId, onSuccess, onClose, defaultRole }) {
  const [clientSecret, setClientSecret] = useState(null);
  const [loadingSecret, setLoadingSecret] = useState(false);
  const [fetchError, setFetchError] = useState("");

  // User details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+971");
  // const [password, setPassword] = useState("");
 const [role, setRole] = useState(defaultRole || "");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [showCardForm, setShowCardForm] = useState(false);
const [termsAccepted, setTermsAccepted] = useState(false);

const [continuLoading, setContinueLoading] = useState(false);
const [continueError, setContinueError] = useState("");
const [existingUserId, setExistingUserId] = useState(null);

  useEffect(() => {
  async function init() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setEmail(session.user.email);
        setIsLoggedIn(true);
        setLoadingSecret(true);
        fetch(
          `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/create-payment-intent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              valuationId: valuationId || null,
              userId: session.user.id,
              userEmail: session.user.email,
              amount: 2900,
            }),
          }
        )
        .then(res => res.json())
        .then(data => {
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
            setPaymentIntentId(data.paymentIntentId);
          } else {
            setFetchError("Payment setup failed. Please try again.");
          }
        })
        .catch(e => {
          setFetchError(e.message);
        })
        .finally(() => {
          setLoadingSecret(false);
        });
      }
    } catch (e) {
      console.error("[PaywallModal] init error:", e);
    }
  }
  init();
}, [valuationId]);
  return (
    <div style={{
  position: "fixed", inset: 0,
  background: "#fff",
  zIndex: 9999, display: "flex",
  alignItems: "flex-start", justifyContent: "flex-start",
  overflowY: "auto",
}}>
     <div style={{
  background: "#fff",
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  padding: "48px 5% 64px",
  maxWidth: "100%", width: "100%",
  minHeight: "100vh",
  position: "relative",
}}>

        {/* Close */}
        <button onClick={onClose} style={{
  position: "fixed", top: 16, right: 20,
  background: "none", border: "1px solid #e5e7eb",
  borderRadius: 8, width: 36, height: 36,
  fontSize: 16, cursor: "pointer", color: "#888",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 10000,
}}>✕</button>

        {/* Header */}
      <div style={{ marginBottom: 20, textAlign: "center" }}>
  <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.05em", marginBottom: 20 }}>
    <span style={{ color: "#B87333" }}>ACQ</span><span style={{ color: "#111" }}>AR</span>
  </div>
  <h2 style={{ fontSize: 32, fontWeight: 900, color: "#1a1a1a", marginBottom: 6, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
    Unlock ACQAR PRO
  </h2>
  <p style={{ fontSize: 12, color: "#B87333", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
    Founding Member Offer · Closes Soon
  </p>
</div>
<div style={{ height: 1, background: "#f0f0f0", marginBottom: 28 }} />
        {/* Price badge */}
       <div style={{
  background: "linear-gradient(135deg, #FFF7ED 0%, #FEF3E2 100%)",
  border: "1px solid #F5C89A",
  borderRadius: 14, padding: "20px 24px",
  display: "flex", justifyContent: "space-between",
  alignItems: "center", marginBottom: 32,
  boxShadow: "0 2px 16px rgba(184,115,51,0.15)",
  width: "100%",
  boxSizing: "border-box",
}}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>
              Acqar Pro — Founding Member
            </div>
            <div style={{ fontSize: 11, color: "#B87333", marginTop: 2 }}>
              First 3 months · then AED 149/mo · Cancel anytime
            </div>
          </div>
          <span style={{ fontSize: 30, fontWeight: 900, color: "#B87333", letterSpacing: "-0.03em" }}>
  AED 29
</span>
        </div>

        {/* Loading */}
        {loadingSecret && (
          <p style={{ textAlign: "center", color: "#888", fontSize: 13, marginBottom: 16 }}>
            Loading payment form...
          </p>
        )}

        {/* Error */}
        {fetchError && (
          <div style={{
            padding: "10px 14px", background: "#fef2f2",
            border: "1px solid #fecaca", borderRadius: 8,
            color: "#dc2626", fontSize: 12, marginBottom: 16,
          }}>
            ⚠️ {fetchError}
          </div>
        )}

{/* ── Guest: Account Details + Continue button ── */}
{!isLoggedIn && !showCardForm && !loadingSecret && (
  <div>
  <div style={{
  marginBottom: 24, padding: "24px",
  background: "#f9fafb", borderRadius: 14,
  border: "1px solid #e5e7eb",
}}>
      <p style={{
        fontSize: 13, fontWeight: 700, color: "#B87333",
        textTransform: "uppercase", letterSpacing: "0.1em",
        marginBottom: 14, marginTop: 0,
      }}>
         Your Account Details
      </p>

      {/* Full Name */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: "#555", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Full Name *</label>
        <input type="text" placeholder="John Smith" value={name} onChange={(e) => setName(e.target.value)}
          style={{ width: "100%", padding: "13px 15px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
      </div>

      {/* Role */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: "#555", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>I Am A *</label>
        <select value={role} onChange={(e) => setRole(e.target.value)} disabled={defaultRole === "Broker / Real Estate Agent"}
  style={{ width: "100%", padding: "13px 15px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit", background: defaultRole === "Broker / Real Estate Agent" ? "#f9fafb" : "#fff", color: role ? "#2B2B2B" : "#aaa", cursor: defaultRole === "Broker / Real Estate Agent" ? "not-allowed" : "pointer" }}>
  {defaultRole === "Broker / Real Estate Agent" ? (
    <option value="Broker / Real Estate Agent">Broker / Real Estate Agent</option>
  ) : (
    <>
      <option value="" disabled>Select your role...</option>
      <option value="Investor">Investor</option>
      <option value="Buyer">Buyer</option>
      <option value="Seller">Seller</option>
      <option value="Broker / Real Estate Agent">Broker / Real Estate Agent</option>
    </>
  )}
</select>
      </div>

      {/* Email */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: "#555", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Email Address *</label>
        <input type="email" placeholder="john@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: "13px 15px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
      </div>

      {/* Phone */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: "#555", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Phone Number *</label>
        <div style={{ display: "flex", gap: 8, width: "100%" }}>
          <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)}
            style={{ padding: "11px 8px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13, outline: "none", background: "#fff", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, width: "140px" }}>
            <option value="+971">UAE (+971)</option>
            <option value="+92">Pakistan (+92)</option>
            <option value="+91">India (+91)</option>
            <option value="+1">USA/Canada (+1)</option>
            <option value="+44">UK (+44)</option>
            <option value="+966">Saudi Arabia (+966)</option>
            <option value="+965">Kuwait (+965)</option>
            <option value="+974">Qatar (+974)</option>
            <option value="+968">Oman (+968)</option>
            <option value="+973">Bahrain (+973)</option>
          </select>
          <input type="tel" placeholder="50 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)}
            style={{ flex: 1, minWidth: 0, padding: "13px 15px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
        </div>
      </div>
    </div>

   {continueError && continueError !== "PRO_ACCOUNT" && (
  <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: 12, marginBottom: 12 }}>
    ⚠️ {continueError}
  </div>
)}

{/* ── PRO account popup ── */}
{continueError === "PRO_ACCOUNT" && (
  <div style={{
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
    zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
  }}>
    <div style={{
      background: "#fff", borderRadius: 20, padding: "36px 28px",
      maxWidth: 360, width: "100%", textAlign: "center",
      boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: "50%",
        background: "rgba(184,115,51,0.1)", border: "2px solid #F5C89A",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 16px", fontSize: 28,
      }}>⭐</div>

      <h3 style={{ fontSize: 20, fontWeight: 900, color: "#1a1a1a", marginBottom: 8 }}>
        Already a Pro Member!
      </h3>
      <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6, marginBottom: 20 }}>
        This email already has an active <strong style={{ color: "#B87333" }}>ACQAR Pro</strong> account.
        Please log in to access your dashboard.
      </p>

      <button
        onClick={() => { setContinueError(""); window.location.href = "/login"; }}
        style={{
          width: "100%", padding: "14px", background: "#B87333",
          color: "#fff", borderRadius: 10, border: "none",
          fontWeight: 800, fontSize: 14, cursor: "pointer", marginBottom: 10,
        }}
      >
        Log In to My Account
      </button>
      <button
        onClick={() => setContinueError("")}
        style={{
          width: "100%", padding: "12px", background: "none",
          border: "1px solid #e5e7eb", borderRadius: 10,
          fontWeight: 600, fontSize: 13, color: "#888", cursor: "pointer",
        }}
      >
        Use a Different Email
      </button>
    </div>
  </div>
)}

    <button
      disabled={continuLoading}
    onClick={async () => {
  setContinueError("");
  if (!name.trim()) return setContinueError("Please enter your full name.");
  if (!role) return setContinueError("Please select your role.");
  if (!email.trim() || !email.includes("@")) return setContinueError("Please enter a valid email address.");
  if (!phone.trim()) return setContinueError("Please enter your phone number.");

  setContinueLoading(true);
  try {
    // ── NEW: Check if email already exists in users table ──
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, plan, email")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (existingUser) {
      if (existingUser.plan === "pro") {
        // ── PRO account — block and show login prompt ──
        setContinueError("PRO_ACCOUNT"); // special flag
        setContinueLoading(false);
        return;
      }
      // ── FREE account — allow, just show a warning (handled below) ──
      setExistingUserId(existingUser.id);
    }

    const res = await fetch(
      `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/create-payment-intent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          valuationId: valuationId || null,
          userId: null,
          userEmail: email.trim(),
          amount: 2900,
        }),
      }
    );
    const data = await res.json();
    if (data.clientSecret) {
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
      setShowCardForm(true);
    } else {
      setContinueError("Payment setup failed. Please try again.");
    }
  } catch (e) {
    setContinueError("Something went wrong. Please try again.");
  } finally {
    setContinueLoading(false);
  }
}}
      style={{
display: "block", margin: "24px auto 0",
width: "min(100%, 400px)", padding: "16px 36px",
background: continuLoading ? "#ccc" : "linear-gradient(135deg, #C4843D, #B87333)",
color: "#fff", borderRadius: 10, border: "none",
fontWeight: 800, fontSize: 15, letterSpacing: "0.01em",
boxShadow: continuLoading ? "none" : "0 4px 20px rgba(184,115,51,0.35)",
}}>
      {continuLoading ? "Setting up payment..." : "Continue the Payment →"}
    </button>
  </div>
)}



{/* ── Card form — only shown after clientSecret exists ── */}
{(clientSecret) && (
    <Elements
  key={clientSecret}
  stripe={stripePromise}
  options={{
    clientSecret,
    appearance: {
      theme: "stripe",
    },
  }}
>

    
        
            {/* Stripe card + Pay button */}
          <CheckoutForm
  onSuccess={onSuccess}
  userDetails={{ name, email, phone, countryCode, role }}
  isLoggedIn={isLoggedIn}
  paymentIntentId={paymentIntentId}
  setClientSecret={setClientSecret}
  setPaymentIntentId={setPaymentIntentId}
  valuationId={valuationId}
  termsAccepted={termsAccepted}
  setTermsAccepted={setTermsAccepted}
  existingUserId={existingUserId} 
/>
          </Elements>
        )}


        <p style={{ textAlign: "center", fontSize: 12, color: "#bbb", marginTop: 32, letterSpacing: "0.04em" }}>
  🔐 Secured by Stripe · No hidden fees · Cancel anytime
</p>
      </div>
    </div>
  );
}
