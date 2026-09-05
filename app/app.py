import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import RunReportRequest, DateRange, Metric, Dimension, MetricAggregation
from google.oauth2 import service_account
import json


# ✅ Load .env only on local PC, NOT on Railway
if os.getenv("RAILWAY_ENVIRONMENT") is None:
    load_dotenv(Path(__file__).resolve().parent / ".env")


import joblib
import numpy as np
import pandas as pd
import requests


from fastapi import FastAPI, HTTPException, Query
from ai_chat import router as ai_chat_router
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


# -------------------------------------------------
# Env
# -------------------------------------------------
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")

TX_TABLE = os.getenv("TX_TABLE", "avm")
TX_BATCH = int(os.getenv("TX_BATCH", "5000"))
TX_MAX_ROWS = int(os.getenv("TX_MAX_ROWS", "200000"))
TX_MIN_DATE = os.getenv("TX_MIN_DATE", "2020-01-01")

OVERRIDE_TABLE = os.getenv("OVERRIDE_TABLE", "avm_project_overrides")

MODEL_BUCKET = os.getenv("MODEL_BUCKET", "models")
MODEL_OBJECT = os.getenv("MODEL_OBJECT", "avm_xgb_bundle4.joblib")
MODEL_PUBLIC = os.getenv("MODEL_PUBLIC", "false").lower() in ("1", "true", "yes", "y")

CACHE_DIR = Path(os.getenv("CACHE_DIR", "/tmp"))
CACHE_DIR.mkdir(parents=True, exist_ok=True)
MODEL_CACHE_PATH = CACHE_DIR / "model_bundle.joblib"

CURRENCY = os.getenv("CURRENCY", "AED")
SQM_TO_SQFT = 10.763910416709722
RANGE_BAND = float(os.getenv("RANGE_BAND", "0.15"))

GA_CREDENTIALS = os.getenv("GA_CREDENTIALS", "acqar-analytics-ce1ee993eef8.json")
GA_PROPERTY_ID = os.getenv("GA_PROPERTY_ID", "")


# -------------------------------------------------
# App
# -------------------------------------------------
app = FastAPI(title="AVM API", version="3.0-dual-value")


# -------------------------------------------------
# CORS
# -------------------------------------------------
cors_env = os.getenv("CORS_ORIGINS", "").strip()
if cors_env:
    allow_origins = [o.strip() for o in cors_env.split(",") if o.strip()]
else:
   allow_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5500",
        "http://127.0.0.1:8000",
        "https://acqar.vercel.app",
        "https://www.acqar.vercel.app",
        "https://acqar.com",
        "https://www.acqar.com",
        "https://beta.acqar.com",
       "https://acqar-dev.vercel.app",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_chat_router)


# -------------------------------------------------
# Globals
# -------------------------------------------------
bundle: Optional[dict] = None
feature_cols: List[str] = []
LOG_TARGET: bool = False
DATE_COL: str = "instance_date"
num_cols: List[str] = []
cat_cols: List[str] = []
tx: pd.DataFrame = pd.DataFrame()
STARTUP_WARNINGS: List[str] = []

ANCHOR_GROUP: Optional[str] = None
AREA_COL_FOR_TOTAL: str = "procedure_area"
ANCHOR_LOOKUP: Dict[str, Dict[str, Any]] = {}

ANCHORS: Dict[str, Dict[str, Dict[str, Any]]] = {
    "project": {},
    "master_project": {},
    "area": {},
    "city": {},
}

PROJECT_OVERRIDES: Dict[str, Dict[str, Any]] = {}

CAL: Dict[str, Any] = {
    "prudence": 0.80,
    "blend_anchor": 0.65,
    "blend_model": 0.35,
    "clamp_low": 0.85,
    "clamp_high": 1.15,
    "final_haircut": 0.97,
    "psm_cap_quantile": 0.80,
}


# -------------------------------------------------
# Request schema
# -------------------------------------------------
class PropertyData(BaseModel):
    property_type_en: Optional[str] = None
    area_name_en: Optional[str] = None
    project_name_en: Optional[str] = None
    master_project_en: Optional[str] = None
    rooms_en: Optional[Any] = None
    procedure_area: float = Field(default=0.0, ge=0.0)
    area_unit: Optional[str] = "sqm"
    instance_date: Optional[str] = None
    is_renovated: Optional[bool] = False
    renovation_amount: Optional[float] = 0.0
    model_config = {"extra": "allow"}


class PropertyInput(BaseModel):
    data: PropertyData


# -------------------------------------------------
# Helpers
# -------------------------------------------------
def _auth_headers() -> Dict[str, str]:
    key = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY
    return {"apikey": key, "Authorization": f"Bearer {key}"}


def _norm_text(x: Any) -> str:
    if x is None:
        return ""
    return str(x).strip()


def _norm_key(x: Any) -> str:
    s = "" if x is None else str(x)
    s = s.strip().lower()
    s = s.replace("–", "-").replace("—", "-")
    s = re.sub(r"[^\w\s\-]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _to_int_rooms(x: Any) -> Optional[int]:
    if x is None:
        return None
    s = str(x).strip().lower()
    digits = "".join([ch for ch in s if ch.isdigit()])
    if digits:
        try:
            return int(digits)
        except:
            return None
    try:
        return int(float(x))
    except:
        return None


def _safe_float(x: Any, default: Optional[float] = None) -> Optional[float]:
    try:
        v = float(x)
        if np.isfinite(v):
            return v
    except:
        pass
    return default


def _add_date_parts_to_row(row: Dict[str, Any], date_col: str) -> Dict[str, Any]:
    if date_col not in row or row.get(date_col) in (None, "", "null"):
        return row
    d = pd.to_datetime(row.get(date_col), errors="coerce")
    row[f"{date_col}_year"] = int(d.year) if pd.notna(d) else None
    row[f"{date_col}_month"] = int(d.month) if pd.notna(d) else None
    row.pop(date_col, None)
    return row


def _ensure_area_is_sqm(user_data: Dict[str, Any]) -> Dict[str, Any]:
    area = float(user_data.get("procedure_area", 0) or 0)
    unit = _norm_key(user_data.get("area_unit") or "sqm")
    if unit in ("sqft", "sq.ft", "ft2", "square feet", "square foot"):
        area = area / SQM_TO_SQFT
    user_data["procedure_area"] = float(max(area, 0.0))
    user_data["area_unit"] = "sqm"
    return user_data


def _build_feature_frame(user_data: Dict[str, Any]) -> pd.DataFrame:
    if bundle is None:
        raise RuntimeError("Model bundle not loaded")
    row = dict(user_data)
    expects_parts = any(c.startswith(f"{DATE_COL}_") for c in feature_cols)
    if expects_parts:
        row = _add_date_parts_to_row(row, DATE_COL)
    aligned = {c: row.get(c, None) for c in feature_cols}
    X = pd.DataFrame([aligned], columns=feature_cols)
    for c in num_cols:
        if c in X.columns:
            X[c] = pd.to_numeric(X[c], errors="coerce")
    return X


def predict_price_per_sqm_raw(user_data: Dict[str, Any]) -> float:
    if bundle is None:
        raise RuntimeError("Model bundle not loaded")
    X = _build_feature_frame(user_data)
    X_enc = bundle["preprocess"].transform(X)
    pred = bundle["model"].predict(X_enc)
    if LOG_TARGET:
        return float(np.expm1(pred)[0])
    return float(pred[0])


def _build_anchor_lookup(anchor_stats: Optional[pd.DataFrame], anchor_group: Optional[str]) -> Dict[str, Dict[str, Any]]:
    if anchor_stats is None or anchor_group is None:
        return {}
    if not isinstance(anchor_stats, pd.DataFrame) or anchor_stats.empty:
        return {}
    cols = set(anchor_stats.columns)
    need = {anchor_group, "p50_psm", "p80_psm"}
    if not need.issubset(cols):
        return {}
    out: Dict[str, Dict[str, Any]] = {}
    for _, r in anchor_stats.iterrows():
        k = _norm_key(r.get(anchor_group))
        if not k:
            continue
        out[k] = {
            "p50_psm": _safe_float(r.get("p50_psm")),
            "p80_psm": _safe_float(r.get("p80_psm")),
            "n": int(r.get("n")) if "n" in cols and pd.notna(r.get("n")) else None,
        }
    return out


def _make_anchor_stats_from_tx(df: pd.DataFrame, group_col: Optional[str]) -> Dict[str, Dict[str, Any]]:
    if df.empty or not group_col or group_col not in df.columns or "price_per_sqm" not in df.columns:
        return {}
    tmp = df[[group_col, "price_per_sqm"]].dropna().copy()
    tmp[group_col] = tmp[group_col].astype(str)
    tmp["_k"] = tmp[group_col].map(_norm_key)
    tmp = tmp[tmp["_k"] != ""]
    if tmp.empty:
        return {}
    g = tmp.groupby("_k")["price_per_sqm"]
    stats = pd.DataFrame({"p50": g.median(), "p80": g.quantile(0.80), "n": g.size()}).reset_index()
    out: Dict[str, Dict[str, Any]] = {}
    for _, r in stats.iterrows():
        out[str(r["_k"])] = {"p50_psm": float(r["p50"]), "p80_psm": float(r["p80"]), "n": int(r["n"])}
    return out


def _anchor_level(user_data: Dict[str, Any]) -> str:
    proj = _norm_key(user_data.get("project_name_en"))
    mp   = _norm_key(user_data.get("master_project_en"))
    area = _norm_key(user_data.get("area_name_en"))
    if proj and proj in ANCHORS["project"]:
        return "project"
    if mp and mp in ANCHORS["master_project"]:
        return "master_project"
    if area and area in ANCHORS["area"]:
        return "area"
    if "__city__" in ANCHORS["city"]:
        return "city"
    if proj and proj in ANCHOR_LOOKUP:
        return "bundle_project"
    return "none"


def _get_anchor_for_user(user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    proj = _norm_key(user_data.get("project_name_en"))
    mp   = _norm_key(user_data.get("master_project_en"))
    area = _norm_key(user_data.get("area_name_en"))
    if proj and proj in ANCHORS["project"]:
        return ANCHORS["project"][proj]
    if mp and mp in ANCHORS["master_project"]:
        return ANCHORS["master_project"][mp]
    if area and area in ANCHORS["area"]:
        return ANCHORS["area"][area]
    if "__city__" in ANCHORS["city"]:
        return ANCHORS["city"]["__city__"]
    if proj and proj in ANCHOR_LOOKUP:
        return ANCHOR_LOOKUP[proj]
    return None


def calibrate_price_per_sqm(pred_psm: float, user_data: Dict[str, Any]) -> float:
    pred_psm = _safe_float(pred_psm, None)
    if pred_psm is None or pred_psm <= 0:
        return float(pred_psm or 0)
    cal = CAL or {}
    a = _get_anchor_for_user(user_data)
    if not a:
        return float(pred_psm * float(cal.get("final_haircut", 1.0)))
    p50 = _safe_float(a.get("p50_psm"), None)
    p80 = _safe_float(a.get("p80_psm"), None)
    n   = int(a.get("n") or 0)
    if not p50 or p50 <= 0:
        return float(pred_psm * float(cal.get("final_haircut", 1.0)))
    if not p80 or p80 <= 0:
        p80 = p50
    blend_anchor = float(cal.get("blend_anchor", 0.65))
    blend_model  = float(cal.get("blend_model", 0.35))
    if n and n < 8:
        blend_anchor = min(blend_anchor, 0.55)
        blend_model  = max(blend_model, 0.45)
    cap_q = float(cal.get("psm_cap_quantile", 0.80))
    cap_q = min(max(cap_q, 0.50), 0.95)
    if cap_q <= 0.80:
        cap = p50 + (p80 - p50) * ((cap_q - 0.50) / 0.30)
    else:
        cap = p80 * (1.0 + 0.25 * ((cap_q - 0.80) / 0.15))
    pred_capped = min(pred_psm, cap)
    prudence = float(cal.get("prudence", 0.80))
    anchor = prudence * p50 + (1 - prudence) * p80
    blended = blend_anchor * anchor + blend_model * pred_capped
    low  = anchor * float(cal.get("clamp_low", 0.85))
    high = anchor * float(cal.get("clamp_high", 1.15))
    final_psm = min(max(blended, low), high)
    final_psm = final_psm * float(cal.get("final_haircut", 0.97))
    return float(final_psm)


def compute_total_value_from_psm(price_per_sqm: float, user_data: Dict[str, Any]) -> float:
    area_sqm = float(user_data.get(AREA_COL_FOR_TOTAL, 0) or 0)
    return float(price_per_sqm * area_sqm)

def apply_renovation_uplift(total_value: float, user_data: Dict[str, Any]) -> float:
    """Adds renovation value on top of the base valuation, if declared by the user."""
    is_renovated = bool(user_data.get("is_renovated"))
    if not is_renovated:
        return float(total_value)
    amount = _safe_float(user_data.get("renovation_amount"), 0.0) or 0.0
    if amount <= 0:
        return float(total_value)
    # Renovation typically doesn't add back 100% of what was spent —
    # apply a recovery factor (e.g. 70%) reflecting real resale uplift.
    RENOVATION_RECOVERY_FACTOR = 0.70
    return float(total_value) + (amount * RENOVATION_RECOVERY_FACTOR)


def _json_safe(x: Any):
    if isinstance(x, float):
        return x if np.isfinite(x) else None
    if isinstance(x, (np.floating,)):
        v = float(x)
        return v if np.isfinite(v) else None
    if isinstance(x, (np.integer,)):
        return int(x)
    if isinstance(x, dict):
        return {k: _json_safe(v) for k, v in x.items()}
    if isinstance(x, list):
        return [_json_safe(v) for v in x]
    return x


def _range_from_total(total: float, band: float) -> Dict[str, float]:
    try:
        total = float(total or 0.0)
        band = float(band or 0.0)
    except:
        return {"range_low": 0.0, "range_high": 0.0}
    if not np.isfinite(total) or total <= 0 or not np.isfinite(band) or band <= 0:
        return {"range_low": 0.0, "range_high": 0.0}
    return {"range_low": total * (1.0 - band), "range_high": total * (1.0 + band)}


# -------------------------------------------------
# Market overrides
# -------------------------------------------------
def _load_overrides_from_supabase() -> Dict[str, Dict[str, Any]]:
    if not SUPABASE_URL or not (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY):
        STARTUP_WARNINGS.append("Overrides not loaded: missing SUPABASE_URL or key.")
        return {}
    endpoint = f"{SUPABASE_URL}/rest/v1/{OVERRIDE_TABLE}"
    r = requests.get(endpoint, headers=_auth_headers(), params={"select": "*", "limit": "20000"}, timeout=60)
    if r.status_code != 200:
        STARTUP_WARNINGS.append(f"Override fetch failed: {r.status_code} {r.text[:200]}")
        return {}
    out: Dict[str, Dict[str, Any]] = {}
    for row in r.json():
        k = _norm_key(row.get("project_key"))
        if not k:
            continue
        out[k] = row
    return out


def market_price_per_sqm(user_data: Dict[str, Any], tx_psm: float, anchor_level: str) -> Dict[str, Any]:
    proj = _norm_key(user_data.get("project_name_en"))
    ov = PROJECT_OVERRIDES.get(proj)
    if ov:
        m_psm = _safe_float(ov.get("market_psm"))
        mult  = _safe_float(ov.get("market_multiplier"))
        if m_psm and m_psm > 0:
            psm = float(m_psm)
            method = "override_market_psm"
        elif mult and mult > 0:
            psm = float(tx_psm) * float(mult)
            method = "override_multiplier"
        else:
            psm = float(tx_psm)
            method = "override_empty_fallback"
        lo = _safe_float(ov.get("min_psm"))
        hi = _safe_float(ov.get("max_psm"))
        if lo and psm < lo:
            psm = float(lo)
        if hi and psm > hi:
            psm = float(hi)
        return {"psm": float(psm), "method": method, "confidence": "high", "override": ov}
    if anchor_level in ("project", "master_project", "bundle_project"):
        return {"psm": float(tx_psm), "method": "tx_anchor_strong", "confidence": "medium", "override": None}
    return {"psm": float(tx_psm), "method": "tx_proxy_no_override", "confidence": "low", "override": None}


# -------------------------------------------------
# Supabase Storage
# -------------------------------------------------
def _storage_public_url(bucket: str, obj_path: str) -> str:
    return f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{obj_path}"


def _storage_signed_url(bucket: str, obj_path: str, expires_in: int = 3600) -> str:
    endpoint = f"{SUPABASE_URL}/storage/v1/object/sign/{bucket}/{obj_path}"
    r = requests.post(endpoint, headers=_auth_headers(), json={"expiresIn": expires_in}, timeout=60)
    if r.status_code not in (200, 201):
        raise RuntimeError(f"Signed URL failed: {r.status_code} {r.text[:200]}")
    data = r.json()
    signed = data.get("signedURL") or data.get("signedUrl") or data.get("signed_url")
    if not signed:
        raise RuntimeError(f"Signed URL missing in response: {data}")
    if signed.startswith("http"):
        return signed
    return f"{SUPABASE_URL}{signed}"


def _download_model_from_storage() -> Path:
    if not SUPABASE_URL:
        raise RuntimeError("SUPABASE_URL missing")
    if MODEL_CACHE_PATH.exists() and MODEL_CACHE_PATH.stat().st_size > 1024:
        return MODEL_CACHE_PATH
    if MODEL_PUBLIC:
        url = _storage_public_url(MODEL_BUCKET, MODEL_OBJECT)
        r = requests.get(url, timeout=120)
        if r.status_code != 200:
            raise RuntimeError(f"Public model download failed: {r.status_code} {r.text[:200]}")
    else:
        if not (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY):
            raise RuntimeError("No Supabase key available to download model")
        signed_url = _storage_signed_url(MODEL_BUCKET, MODEL_OBJECT, expires_in=3600)
        r = requests.get(signed_url, timeout=120)
        if r.status_code != 200:
            raise RuntimeError(f"Signed model download failed: {r.status_code} {r.text[:200]}")
    MODEL_CACHE_PATH.write_bytes(r.content)
    return MODEL_CACHE_PATH


# -------------------------------------------------
# Supabase DB: load transactions
# -------------------------------------------------
def _load_tx_from_supabase() -> pd.DataFrame:
    if not SUPABASE_URL:
        raise RuntimeError("SUPABASE_URL missing")
    if not (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY):
        raise RuntimeError("Supabase key missing")

    endpoint = f"{SUPABASE_URL}/rest/v1/{TX_TABLE}"
    headers = _auth_headers()

    select_cols = [
        "instance_date", "area_name_en", "project_name_en", "master_project_en",
        "property_type_en", "property_sub_type_en", "rooms_en",
        "procedure_area", "price_per_sqm", "meter_sale_price", "actual_worth", "transaction_id",
    ]

    all_rows: List[dict] = []
    offset = 0

    while True:
        if offset >= TX_MAX_ROWS:
            STARTUP_WARNINGS.append(f"TX_MAX_ROWS cap reached ({TX_MAX_ROWS}).")
            break
        params = {
            "select": ",".join(select_cols),
            "instance_date": f"gte.{TX_MIN_DATE}",
            "limit": str(TX_BATCH),
            "offset": str(offset),
            "order": "instance_date.desc",
        }
        r = requests.get(endpoint, headers=headers, params=params, timeout=120)
        if r.status_code != 200:
            raise RuntimeError(f"Supabase fetch failed: {r.status_code} {r.text[:200]}")
        batch = r.json()
        if not batch:
            break
        all_rows.extend(batch)
        offset += len(batch)
        if len(batch) < TX_BATCH:
            break

    df = pd.DataFrame(all_rows)
    if df.empty:
        return df

    for c in ["meter_sale_price", "price_per_sqm", "procedure_area", "actual_worth"]:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce")

    if "rooms_en" in df.columns:
        df["rooms_en"] = df["rooms_en"].astype(str)

    if "instance_date" in df.columns:
        df["_instance_date"] = pd.to_datetime(df["instance_date"], errors="coerce")
    else:
        df["_instance_date"] = pd.NaT

    # ✅ FIX 1: compute price_per_sqm from actual_worth / procedure_area if missing
    if "price_per_sqm" not in df.columns or df["price_per_sqm"].isna().all():
        if "meter_sale_price" in df.columns and not df["meter_sale_price"].isna().all():
            df["price_per_sqm"] = pd.to_numeric(df["meter_sale_price"], errors="coerce")
        elif "actual_worth" in df.columns and "procedure_area" in df.columns:
            actual = pd.to_numeric(df["actual_worth"], errors="coerce")
            area = pd.to_numeric(df["procedure_area"], errors="coerce")
            df["price_per_sqm"] = actual / area.replace(0, np.nan)
    else:
        # fill partial NULLs
        mask = df["price_per_sqm"].isna()
        if mask.any() and "actual_worth" in df.columns and "procedure_area" in df.columns:
            actual = pd.to_numeric(df.loc[mask, "actual_worth"], errors="coerce")
            area = pd.to_numeric(df.loc[mask, "procedure_area"], errors="coerce")
            df.loc[mask, "price_per_sqm"] = actual / area.replace(0, np.nan)

    essentials = [c for c in ["procedure_area", "price_per_sqm"] if c in df.columns]
    if essentials:
        df = df.dropna(subset=essentials).copy()

    return df


# -------------------------------------------------
# Startup
# -------------------------------------------------
@app.on_event("startup")
def _startup():
    global bundle, feature_cols, LOG_TARGET, DATE_COL, num_cols, cat_cols
    global tx, ANCHOR_GROUP, AREA_COL_FOR_TOTAL, ANCHOR_LOOKUP, CAL
    global ANCHORS, PROJECT_OVERRIDES

    STARTUP_WARNINGS.clear()

    try:
        model_path = _download_model_from_storage()
        bundle = joblib.load(str(model_path))
        feature_cols = list(bundle.get("feature_columns", []))
        LOG_TARGET = bool(bundle.get("log_target", False))
        DATE_COL = bundle.get("date_parts_from", "instance_date")
        num_cols = list(bundle.get("numeric_columns", []))
        cat_cols = list(bundle.get("categorical_columns", []))
        ANCHOR_GROUP = bundle.get("anchor_group")
        AREA_COL_FOR_TOTAL = bundle.get("area_col_for_total", "procedure_area") or "procedure_area"
        if isinstance(bundle.get("ovaluate_calibration"), dict):
            for k, v in dict(bundle["ovaluate_calibration"]).items():
                CAL[k] = v
        anchor_stats = bundle.get("anchor_stats", None)
        if anchor_stats is not None and not isinstance(anchor_stats, pd.DataFrame):
            try:
                anchor_stats = pd.DataFrame(anchor_stats)
            except:
                anchor_stats = None
        ANCHOR_LOOKUP = _build_anchor_lookup(anchor_stats, ANCHOR_GROUP)
    except Exception as e:
        STARTUP_WARNINGS.append(f"Failed to load model from Supabase Storage: {e}")
        bundle = None
        ANCHOR_LOOKUP = {}

    try:
        tx = _load_tx_from_supabase()
        if tx.empty:
            STARTUP_WARNINGS.append("Supabase returned 0 rows for transactions.")
            ANCHORS = {"project": {}, "master_project": {}, "area": {}, "city": {}}
        else:
            ANCHORS["project"] = _make_anchor_stats_from_tx(tx, "project_name_en")
            ANCHORS["master_project"] = _make_anchor_stats_from_tx(tx, "master_project_en")
            ANCHORS["area"] = _make_anchor_stats_from_tx(tx, "area_name_en")
            vals = pd.to_numeric(tx["price_per_sqm"], errors="coerce").dropna().astype(float)
            if len(vals) >= 50:
                ANCHORS["city"] = {"__city__": {
                    "p50_psm": float(vals.median()),
                    "p80_psm": float(vals.quantile(0.80)),
                    "n": int(len(vals))
                }}
            else:
                ANCHORS["city"] = {}
    except Exception as e:
        STARTUP_WARNINGS.append(f"Failed to load transactions from Supabase table '{TX_TABLE}': {e}")
        tx = pd.DataFrame()
        ANCHORS = {"project": {}, "master_project": {}, "area": {}, "city": {}}

    try:
        PROJECT_OVERRIDES = _load_overrides_from_supabase()
        if not PROJECT_OVERRIDES:
            STARTUP_WARNINGS.append("No market overrides found (table empty or not accessible).")
    except Exception as e:
        STARTUP_WARNINGS.append(f"Failed to load market overrides: {e}")
        PROJECT_OVERRIDES = {}


# -------------------------------------------------
# Comparables
# -------------------------------------------------
def get_comparables(user_data: Dict[str, Any], top_k: int = 10):
    if tx.empty:
        return {"comparables": [], "comparables_meta": {"used_level": "none", "count": 0}}

    df = tx.copy()

    area = _norm_text(user_data.get("area_name_en"))
    project = _norm_text(user_data.get("project_name_en"))
    ptype = _norm_text(user_data.get("property_type_en"))
    rooms = _to_int_rooms(user_data.get("rooms_en"))
    subj_area_sqm = float(user_data.get("procedure_area", 0) or 0)

    used_level = "city"

    # ✅ FIX 3: filter by area FIRST
    if area and "area_name_en" in df.columns:
        df_area = df[df["area_name_en"].astype(str).str.contains(area, case=False, na=False, regex=False)].copy()
        if len(df_area) >= 3:
            df = df_area
            used_level = "area"

    # ✅ FIX 2: strip trailing "s" to handle "Apartments" -> "apartment"
    ptype_norm = ptype.lower().rstrip("s")
    if "property_sub_type_en" in df.columns:
        if ptype_norm == "apartment":
            df_tmp = df[df["property_sub_type_en"].astype(str).str.contains("flat|apartment", case=False, na=False)]
            if len(df_tmp) >= 3:
                df = df_tmp
        elif ptype_norm == "villa":
            df_tmp = df[df["property_sub_type_en"].astype(str).str.contains("villa", case=False, na=False)]
            if len(df_tmp) >= 3:
                df = df_tmp
        elif ptype_norm == "townhouse":
            df_tmp = df[df["property_sub_type_en"].astype(str).str.contains("townhouse", case=False, na=False)]
            if len(df_tmp) >= 3:
                df = df_tmp

    if rooms is not None and "rooms_en" in df.columns:
        rooms_raw = df["rooms_en"].astype(str).str.strip().str.lower()
        rcol = pd.to_numeric(rooms_raw.str.extract(r"(\d+)")[0], errors="coerce")
        rcol = rcol.where(~rooms_raw.str.contains("studio", na=False), 0)
        df = df[rcol == rooms]

    if subj_area_sqm > 0 and "procedure_area" in df.columns:
        low, high = subj_area_sqm * 0.8, subj_area_sqm * 1.2
        df = df[(df["procedure_area"] >= low) & (df["procedure_area"] <= high)]

    if df.empty:
        df = tx.copy()
        used_level = "area_loose"
        if area and "area_name_en" in df.columns:
            df = df[df["area_name_en"].astype(str).str.contains(area, case=False, na=False, regex=False)].copy()

    if df.empty:
        return {"comparables": [], "comparables_meta": {"used_level": "none", "count": 0}}

    if project and "project_name_en" in df.columns:
        df1 = df[df["project_name_en"].astype(str).str.contains(project, case=False, na=False, regex=False)].copy()
        if len(df1) >= 3:
            df = df1
            used_level = "project"

    if used_level in ("city", "area_loose") and project and "master_project_en" in df.columns and "project_name_en" in df.columns:
        mp = tx.loc[
            tx["project_name_en"].astype(str).str.contains(project, case=False, na=False, regex=False),
            "master_project_en"
        ].dropna()
        if len(mp) > 0:
            master_project = str(mp.iloc[0])
            df2 = df[df["master_project_en"].astype(str).str.contains(master_project, case=False, na=False, regex=False)].copy()
            if len(df2) >= 3:
                df = df2
                used_level = "master_project"

    if used_level in ("city", "area_loose") and area and "area_name_en" in df.columns:
        df3 = df[df["area_name_en"].astype(str).str.contains(area, case=False, na=False, regex=False)].copy()
        if len(df3) >= 3:
            df = df3
            used_level = "area"

    if df.empty:
        return {"comparables": [], "comparables_meta": {"used_level": "none", "count": 0}}

    if subj_area_sqm > 0 and "procedure_area" in df.columns:
        df = df.assign(_size_diff=(df["procedure_area"] - subj_area_sqm).abs())
    else:
        df = df.assign(_size_diff=0.0)

    if "_instance_date" in df.columns:
        df = df.sort_values(["_size_diff", "_instance_date"], ascending=[True, False])
    else:
        df = df.sort_values(["_size_diff"], ascending=True)

    denom = max(subj_area_sqm, 1.0)
    df["_match_pct"] = (1.0 - (df["_size_diff"] / denom)).clip(0.0, 1.0) * 100.0

    ppm2_col = "price_per_sqm" if "price_per_sqm" in df.columns else "meter_sale_price"
    df[ppm2_col] = pd.to_numeric(df[ppm2_col], errors="coerce")

    if "actual_worth" in df.columns and df["actual_worth"].notna().any():
        df["price_aed"] = pd.to_numeric(df["actual_worth"], errors="coerce")
    else:
        df["price_aed"] = df[ppm2_col] * df["procedure_area"]

    df["size_sqft"] = df["procedure_area"] * SQM_TO_SQFT
    df["price_per_sqft"] = (df[ppm2_col] / SQM_TO_SQFT)
    df["sold_date"] = df["instance_date"] if "instance_date" in df.columns else None
    df["match_pct"] = df["_match_pct"].round(0)

    if "project_name_en" in df.columns:
        df["building_name_en"] = df["project_name_en"]

    dedupe_keys = [c for c in ["sold_date", "price_aed", "procedure_area", "project_name_en"] if c in df.columns]
    if dedupe_keys:
        df = df.drop_duplicates(subset=dedupe_keys, keep="first")

    cols_to_return = [c for c in [
        "area_name_en", "project_name_en", "master_project_en", "building_name_en",
        "property_type_en", "property_sub_type_en", "rooms_en",
        "procedure_area", "size_sqft", "price_aed", "price_per_sqft", "sold_date", "match_pct",
    ] if c in df.columns]

    comps = df.head(top_k)[cols_to_return].to_dict(orient="records")
    return {"comparables": comps, "comparables_meta": {"used_level": used_level, "count": len(comps)}}


# -------------------------------------------------
# Charts
# -------------------------------------------------
# def chart_data(user_data: Dict[str, Any]):
#     if tx.empty:
#         return {"distribution": [], "trend": []}

#     df = tx.copy()
#     area = _norm_text(user_data.get("area_name_en"))
#     if area and "area_name_en" in df.columns:
#         df = df[df["area_name_en"].astype(str).str.contains(area, case=False, na=False)].copy()

#     price_col = "price_per_sqm" if "price_per_sqm" in df.columns else ("meter_sale_price" if "meter_sale_price" in df.columns else None)
#     if not price_col:
#         return {"distribution": [], "trend": []}

#     values = pd.to_numeric(df[price_col], errors="coerce").dropna().astype(float).values
#     dist = []
#     if len(values) >= 20:
#         hist, edges = np.histogram(values, bins=20)
#         dist = [{"bin_start": float(edges[i]), "bin_end": float(edges[i + 1]), "count": int(hist[i])}
#                 for i in range(len(hist))]

#     trend = []
#     if "_instance_date" in df.columns:
#         df2 = df.dropna(subset=["_instance_date"]).copy()
#         if not df2.empty:
#             cutoff = pd.Timestamp.today() - pd.DateOffset(months=60)
#             df2 = df2[df2["_instance_date"] >= cutoff].copy()
#             df2["_month"] = df2["_instance_date"].dt.to_period("M").astype(str)
#             df2[price_col] = pd.to_numeric(df2[price_col], errors="coerce")
#             g = df2.groupby("_month")[price_col].median().reset_index()
#             trend = [{"month": row["_month"], "median_price_per_sqm": float(row[price_col])}
#                      for _, row in g.iterrows()]

#     return {"distribution": dist, "trend": trend}



def chart_data(user_data: Dict[str, Any]):
    if tx.empty:
        return {"distribution": [], "trend": [], "is_synthetic": True}

    df = tx.copy()
    area = _norm_text(user_data.get("area_name_en"))
    if area and "area_name_en" in df.columns:
        df = df[df["area_name_en"].astype(str).str.contains(area, case=False, na=False, regex=False)].copy()

    price_col = "price_per_sqm" if "price_per_sqm" in df.columns else ("meter_sale_price" if "meter_sale_price" in df.columns else None)
    if not price_col:
        return {"distribution": [], "trend": [], "is_synthetic": True}

    values = pd.to_numeric(df[price_col], errors="coerce").dropna().astype(float).values
    dist = []
    if len(values) >= 20:
        hist, edges = np.histogram(values, bins=20)
        dist = [{"bin_start": float(edges[i]), "bin_end": float(edges[i + 1]), "count": int(hist[i])}
                for i in range(len(hist))]

    trend = []
    is_synthetic = False

    if "_instance_date" in df.columns:
        df2 = df.dropna(subset=["_instance_date"]).copy()
        if not df2.empty:
            cutoff = pd.Timestamp.today() - pd.DateOffset(months=60)
            df2 = df2[df2["_instance_date"] >= cutoff].copy()
            df2["_month"] = df2["_instance_date"].dt.to_period("M").astype(str)
            df2[price_col] = pd.to_numeric(df2[price_col], errors="coerce")
            g = df2.groupby("_month")[price_col].median().reset_index()
            trend = [{"month": row["_month"], "median_price_per_sqm": float(row[price_col])}
                     for _, row in g.iterrows()]

    # ✅ FALLBACK: if fewer than 2 real trend points, generate synthetic 24-month trend
    if len(trend) < 2:
        is_synthetic = True
        fallback_psm = None

        area_key = _norm_key(user_data.get("area_name_en"))
        proj_key = _norm_key(user_data.get("project_name_en"))

        if proj_key and proj_key in ANCHORS["project"]:
            fallback_psm = ANCHORS["project"][proj_key].get("p50_psm")
        elif area_key and area_key in ANCHORS["area"]:
            fallback_psm = ANCHORS["area"][area_key].get("p50_psm")
        elif "__city__" in ANCHORS["city"]:
            fallback_psm = ANCHORS["city"]["__city__"].get("p50_psm")

        # Last resort: use raw tx city median if anchors are empty
        if (not fallback_psm or fallback_psm <= 0) and not tx.empty and price_col in tx.columns:
            city_vals = pd.to_numeric(tx[price_col], errors="coerce").dropna()
            if len(city_vals) >= 10:
                fallback_psm = float(city_vals.median())

        if fallback_psm and fallback_psm > 0:
            DEFAULT_GROWTH = 0.005  # 0.5% monthly ≈ 6% annual
            base_month = pd.Period(pd.Timestamp.today(), freq="M") - 24
            trend = []
            for i in range(24):
                psm = fallback_psm * (1 + DEFAULT_GROWTH) ** (i - 23)
                trend.append({
                    "month": str(base_month + i),
                    "median_price_per_sqm": round(float(psm), 2),
                    "is_synthetic": True,
                })

    return _json_safe({"distribution": dist, "trend": trend, "is_synthetic": is_synthetic})

# -------------------------------------------------
# ✅ NEW: Supply & Demand
# -------------------------------------------------
# def supply_demand_data(user_data: Dict[str, Any]):
#     if tx.empty:
#         return {"monthly": [], "total_sales": 0, "avg_monthly": 0}

#     df = tx.copy()
#     area = _norm_text(user_data.get("area_name_en"))
#     if area and "area_name_en" in df.columns:
#         df = df[df["area_name_en"].astype(str).str.contains(area, case=False, na=False)].copy()

#     if df.empty:
#         return {"monthly": [], "total_sales": 0, "avg_monthly": 0}

#     monthly = []
#     if "_instance_date" in df.columns:
#         df2 = df.dropna(subset=["_instance_date"]).copy()
#         cutoff = pd.Timestamp.today() - pd.DateOffset(months=24)
#         df2 = df2[df2["_instance_date"] >= cutoff].copy()
#         if not df2.empty:
#             df2["_month"] = df2["_instance_date"].dt.to_period("M").astype(str)
#             g = df2.groupby("_month").size().reset_index(name="transactions")
#             monthly = g.to_dict(orient="records")

#     total_sales = int(len(df))
#     avg_monthly = round(sum(m["transactions"] for m in monthly) / max(len(monthly), 1), 1)

#     return _json_safe({"monthly": monthly, "total_sales": total_sales, "avg_monthly": avg_monthly})

def supply_demand_data(user_data: Dict[str, Any]):
    if tx.empty:
        return {"monthly": [], "total_sales": 0, "avg_monthly": 0, "is_synthetic": True}

    df = tx.copy()
    area = _norm_text(user_data.get("area_name_en"))
    if area and "area_name_en" in df.columns:
        df = df[df["area_name_en"].astype(str).str.contains(area, case=False, na=False, regex=False)].copy()

    monthly = []
    is_synthetic = False

    if not df.empty and "_instance_date" in df.columns:
        df2 = df.dropna(subset=["_instance_date"]).copy()
        cutoff = pd.Timestamp.today() - pd.DateOffset(months=24)
        df2 = df2[df2["_instance_date"] >= cutoff].copy()
        if not df2.empty:
            df2["_month"] = df2["_instance_date"].dt.to_period("M").astype(str)
            g = df2.groupby("_month").size().reset_index(name="transactions")
            monthly = g.to_dict(orient="records")

    # ✅ FALLBACK: fewer than 2 real monthly points — generate synthetic 24-month supply data
    if len(monthly) < 2:
        is_synthetic = True

        # Try to estimate a baseline transaction volume from city-level data
        fallback_monthly_count = None

        if not tx.empty and "_instance_date" in tx.columns:
            df_city = tx.dropna(subset=["_instance_date"]).copy()
            cutoff = pd.Timestamp.today() - pd.DateOffset(months=24)
            df_city = df_city[df_city["_instance_date"] >= cutoff].copy()
            if not df_city.empty:
                df_city["_month"] = df_city["_instance_date"].dt.to_period("M").astype(str)
                city_monthly = df_city.groupby("_month").size()
                if len(city_monthly) >= 2:
                    # Scale city volume down to a plausible area-level estimate (5% of city)
                    fallback_monthly_count = max(1, round(float(city_monthly.median()) * 0.05))

        # Final fallback: use a small fixed baseline
        if not fallback_monthly_count or fallback_monthly_count <= 0:
            fallback_monthly_count = 5

        # Generate 24 months of synthetic data with slight randomness for realism
        import random
        random.seed(42)  # deterministic so it doesn't change on each reload
        base_month = pd.Period(pd.Timestamp.today(), freq="M") - 24
        monthly = []
        for i in range(24):
            # Add mild seasonal variation ±20%
            variation = 1.0 + random.uniform(-0.20, 0.20)
            count = max(1, round(fallback_monthly_count * variation))
            monthly.append({
                "month": str(base_month + i),
                "transactions": count,
                "is_synthetic": True,
            })

    total_sales = int(len(df)) if not df.empty else sum(m["transactions"] for m in monthly)
    avg_monthly = round(sum(m["transactions"] for m in monthly) / max(len(monthly), 1), 1)

    return _json_safe({
        "monthly": monthly,
        "total_sales": total_sales,
        "avg_monthly": avg_monthly,
        "is_synthetic": is_synthetic,
    })
# -------------------------------------------------
# ✅ NEW: Forecast (6-month projection)
# -------------------------------------------------
# def forecast_data(user_data: Dict[str, Any]):
#     ch = chart_data(user_data)
#     trend = ch.get("trend", [])

#     if len(trend) < 6:
#         return {"forecast": [], "historical": trend, "growth_pct": None}

#     recent = trend[-6:]
#     prices = [r["median_price_per_sqm"] for r in recent if r.get("median_price_per_sqm")]

#     if len(prices) < 2:
#         return {"forecast": [], "historical": trend[-12:], "growth_pct": None}

#     avg_growth = (prices[-1] - prices[0]) / prices[0] / max(len(prices) - 1, 1)
#     last_price = prices[-1]

#     try:
#         last_month = pd.Period(recent[-1]["month"], freq="M")
#     except:
#         return {"forecast": [], "historical": trend[-12:], "growth_pct": None}

#     forecast_points = []
#     for i in range(1, 7):
#         proj_price = last_price * (1 + avg_growth) ** i
#         proj_month = str(last_month + i)
#         forecast_points.append({
#             "month": proj_month,
#             "median_price_per_sqm": round(float(proj_price), 2),
#             "is_forecast": True
#         })

#     growth_pct = round(float(avg_growth) * 6 * 100, 2)

#     return _json_safe({
#         "forecast": forecast_points,
#         "historical": trend[-12:],
#         "growth_pct": growth_pct
#     })



def forecast_data(user_data: Dict[str, Any]):
    ch = chart_data(user_data)
    trend = ch.get("trend", [])

    # ✅ FALLBACK: if no trend data at all, generate synthetic 2-year-old forecast
    # using city-level median price so the chart always has something to show
    if len(trend) < 2:
        fallback_psm = None

        # Try to get a price anchor for this property
        area = _norm_key(user_data.get("area_name_en"))
        proj = _norm_key(user_data.get("project_name_en"))

        if proj and proj in ANCHORS["project"]:
            fallback_psm = ANCHORS["project"][proj].get("p50_psm")
        elif area and area in ANCHORS["area"]:
            fallback_psm = ANCHORS["area"][area].get("p50_psm")
        elif "__city__" in ANCHORS["city"]:
            fallback_psm = ANCHORS["city"]["__city__"].get("p50_psm")

        if not fallback_psm or fallback_psm <= 0:
            return {"forecast": [], "historical": [], "growth_pct": None}

        # Generate 24 months of synthetic historical + 6 months forecast
        DEFAULT_GROWTH = 0.005  # 0.5% monthly = ~6% annual
        base_month = pd.Period(pd.Timestamp.today(), freq="M") - 24
        synthetic_historical = []
        for i in range(24):
            psm = fallback_psm * (1 + DEFAULT_GROWTH) ** (i - 23)
            synthetic_historical.append({
                "month": str(base_month + i),
                "median_price_per_sqm": round(float(psm), 2),
            })

        last_price = fallback_psm
        last_month = pd.Period(pd.Timestamp.today(), freq="M")
        forecast_points = []
        for i in range(1, 7):
            proj_price = last_price * (1 + DEFAULT_GROWTH) ** i
            forecast_points.append({
                "month": str(last_month + i),
                "median_price_per_sqm": round(float(proj_price), 2),
                "is_forecast": True,
            })

        return _json_safe({
            "forecast": forecast_points,
            "historical": synthetic_historical,
            "growth_pct": round(DEFAULT_GROWTH * 6 * 100, 2),
            "is_synthetic": True,
        })

    # ✅ NORMAL PATH: enough real trend data
    # Use at least 2 points, prefer 6
    recent = trend[-6:] if len(trend) >= 6 else trend
    prices = [r["median_price_per_sqm"] for r in recent if r.get("median_price_per_sqm")]

    if len(prices) < 2:
        return {"forecast": [], "historical": trend[-12:], "growth_pct": None}

    avg_growth = (prices[-1] - prices[0]) / prices[0] / max(len(prices) - 1, 1)
    # Clamp growth to reasonable bounds (-5% to +5% monthly)
    avg_growth = max(min(avg_growth, 0.05), -0.05)
    last_price = prices[-1]

    try:
        last_month = pd.Period(recent[-1]["month"], freq="M")
    except:
        return {"forecast": [], "historical": trend[-12:], "growth_pct": None}

    forecast_points = []
    for i in range(1, 7):
        proj_price = last_price * (1 + avg_growth) ** i
        proj_month = str(last_month + i)
        forecast_points.append({
            "month": proj_month,
            "median_price_per_sqm": round(float(proj_price), 2),
            "is_forecast": True,
        })

    growth_pct = round(float(avg_growth) * 6 * 100, 2)

    return _json_safe({
        "forecast": forecast_points,
        "historical": trend[-12:],
        "growth_pct": growth_pct,
        "is_synthetic": False,
    })

# -------------------------------------------------
# Debug / Lookup endpoints
# -------------------------------------------------
@app.get("/debug/columns")
def debug_columns():
    return {
        "tx_rows": int(len(tx)),
        "warnings": STARTUP_WARNINGS,
        "model_object": MODEL_OBJECT,
        "anchor_group": ANCHOR_GROUP,
        "anchors_from_tx": {
            "project": int(len(ANCHORS["project"])),
            "master_project": int(len(ANCHORS["master_project"])),
            "area": int(len(ANCHORS["area"])),
            "city": int(len(ANCHORS["city"])),
        },
        "override_table": OVERRIDE_TABLE,
        "overrides_loaded": int(len(PROJECT_OVERRIDES)),
        "calibration": CAL,
    }


@app.get("/lookup/areas")
def lookup_areas(limit: int = 5000):
    if tx.empty or "area_name_en" not in tx.columns:
        return []
    vals = tx["area_name_en"].dropna().astype(str).str.strip()
    vals = vals[vals != ""].unique().tolist()
    vals.sort()
    return vals[: max(1, min(int(limit), 20000))]


@app.get("/lookup/projects")
def lookup_projects(area: str = Query(default=""), limit: int = 5000):
    if tx.empty or "project_name_en" not in tx.columns:
        return []
    df = tx
    a = area.strip()
    if a and "area_name_en" in df.columns:
        df = df[df["area_name_en"].astype(str).str.contains(a, case=False, na=False, regex=False)]
    vals = df["project_name_en"].dropna().astype(str).str.strip()
    vals = vals[vals != ""].unique().tolist()
    vals.sort()
    return vals[: max(1, min(int(limit), 20000))]


# -------------------------------------------------
# Main endpoints
# -------------------------------------------------
@app.get("/")
def root():
    return {"status": "ok", "service": "AVM API", "version": app.version}


@app.get("/health")
def health():
    return {
        "status": "ok" if bundle is not None else "degraded",
        "model_loaded": bundle is not None,
        "model_source": "supabase_storage",
        "model_bucket": MODEL_BUCKET,
        "model_object": MODEL_OBJECT,
        "tx_loaded": not tx.empty,
        "tx_source": f"supabase_table:{TX_TABLE}",
        "tx_rows": int(len(tx)),
        "features_expected": int(len(feature_cols)),
        "log_target": LOG_TARGET,
        "date_parts_from": DATE_COL,
        "warnings": STARTUP_WARNINGS,
        "anchors_from_tx": {
            "project": int(len(ANCHORS["project"])),
            "master_project": int(len(ANCHORS["master_project"])),
            "area": int(len(ANCHORS["area"])),
            "city": int(len(ANCHORS["city"])),
        },
        "override_table": OVERRIDE_TABLE,
        "overrides_loaded": int(len(PROJECT_OVERRIDES)),
        "calibration": CAL,
    }


@app.post("/predict")
def predict(inp: PropertyInput):
    if bundle is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Check /health")
    user_data = inp.data.model_dump()
    user_data = _ensure_area_is_sqm(user_data)
    raw_psm = predict_price_per_sqm_raw(user_data)
    tx_psm = calibrate_price_per_sqm(raw_psm, user_data)
    area_sqm = float(user_data.get("procedure_area", 0) or 0)
    area_sqft = area_sqm * SQM_TO_SQFT
    tx_total = tx_psm * area_sqm
    tx_psf = tx_psm / SQM_TO_SQFT
    level = _anchor_level(user_data)
    m = market_price_per_sqm(user_data, tx_psm, level)
    market_psm = float(m["psm"])
    market_total = market_psm * area_sqm
    market_psf = market_psm / SQM_TO_SQFT

    # ✅ Apply renovation uplift to the final total
    market_total = apply_renovation_uplift(market_total, user_data)
    tx_total = apply_renovation_uplift(tx_total, user_data)

    rng = _range_from_total(market_total, RANGE_BAND)
    payload = {
        "currency": CURRENCY,
        "tx": {"price_per_sqm": tx_psm, "price_per_sqft": tx_psf, "total_valuation": tx_total, "anchor_level": level},
        "market": {"price_per_sqm": market_psm, "price_per_sqft": market_psf, "total_valuation": market_total,
                   "method": m.get("method"), "confidence": m.get("confidence"),
                   "override_used": bool(m.get("override")), "override": m.get("override") or None},
        "procedure_area_sqm": area_sqm,
        "procedure_area_sqft": area_sqft,
        "range_low": rng["range_low"],
        "range_high": rng["range_high"],
        "raw_model_price_per_sqm": raw_psm,
        "calibration": CAL,
        "renovation_applied": bool(user_data.get("is_renovated")) and (_safe_float(user_data.get("renovation_amount"), 0.0) or 0.0) > 0,
        "renovation_amount": _safe_float(user_data.get("renovation_amount"), 0.0) or 0.0,
    }
    return _json_safe(payload)


@app.post("/predict_with_comparables")
def predict_with_comparables(inp: PropertyInput):
    if bundle is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Check /health")
    user_data = inp.data.model_dump()
    user_data = _ensure_area_is_sqm(user_data)
    raw_psm = predict_price_per_sqm_raw(user_data)
    tx_psm = calibrate_price_per_sqm(raw_psm, user_data)
    area_sqm = float(user_data.get("procedure_area", 0) or 0)
    area_sqft = area_sqm * SQM_TO_SQFT
    tx_total = tx_psm * area_sqm
    tx_psf = tx_psm / SQM_TO_SQFT
    level = _anchor_level(user_data)
    m = market_price_per_sqm(user_data, tx_psm, level)
    market_psm = float(m["psm"])
    market_total = market_psm * area_sqm
    market_psf = market_psm / SQM_TO_SQFT

    # ✅ Apply renovation uplift to the final total
    market_total = apply_renovation_uplift(market_total, user_data)
    tx_total = apply_renovation_uplift(tx_total, user_data)

    rng = _range_from_total(market_total, RANGE_BAND)
    comps = get_comparables(user_data, top_k=10)
    ch = chart_data(user_data)
    sd = supply_demand_data(user_data)
    fc = forecast_data(user_data)
    payload = {
        "currency": CURRENCY,
        "tx": {"price_per_sqm": tx_psm, "price_per_sqft": tx_psf, "total_valuation": tx_total, "anchor_level": level},
        "market": {"price_per_sqm": market_psm, "price_per_sqft": market_psf, "total_valuation": market_total,
                   "method": m.get("method"), "confidence": m.get("confidence"),
                   "override_used": bool(m.get("override")), "override": m.get("override") or None},
        "procedure_area_sqm": area_sqm,
        "procedure_area_sqft": area_sqft,
        "range_low": rng["range_low"],
        "range_high": rng["range_high"],
        "raw_model_price_per_sqm": raw_psm,
        "calibration": CAL,
        "comparables": comps.get("comparables", []),
        "comparables_meta": comps.get("comparables_meta", {}),
        "charts": ch,
        "supply_demand": sd,       # ✅ NEW
        "forecast": fc,            # ✅ NEW
        "renovation_applied": bool(user_data.get("is_renovated")) and (_safe_float(user_data.get("renovation_amount"), 0.0) or 0.0) > 0,
        "renovation_amount": _safe_float(user_data.get("renovation_amount"), 0.0) or 0.0,
    }
    return _json_safe(payload)


@app.post("/comparables")
def comparables(inp: PropertyInput):
    user_data = inp.data.model_dump()
    user_data = _ensure_area_is_sqm(user_data)
    res = get_comparables(user_data, top_k=10)
    return _json_safe({"currency": CURRENCY, **res})


@app.post("/charts")
def charts(inp: PropertyInput):
    user_data = inp.data.model_dump()
    user_data = _ensure_area_is_sqm(user_data)
    return _json_safe(chart_data(user_data))


# ✅ NEW standalone endpoints
@app.post("/supply_demand")
def supply_demand(inp: PropertyInput):
    user_data = inp.data.model_dump()
    user_data = _ensure_area_is_sqm(user_data)
    return _json_safe(supply_demand_data(user_data))


@app.post("/forecast")
def forecast(inp: PropertyInput):
    user_data = inp.data.model_dump()
    user_data = _ensure_area_is_sqm(user_data)
    return _json_safe(forecast_data(user_data))



# -------------------------------------------------
# Google Analytics
# -------------------------------------------------
# @app.get("/api/analytics")
# def analytics(range: str = "30daysAgo"):
#     try:
#         creds_raw = GA_CREDENTIALS
#         if creds_raw.endswith(".json"):
#             credentials = service_account.Credentials.from_service_account_file(
#                 creds_raw,
#                 scopes=["https://www.googleapis.com/auth/analytics.readonly"]
#             )
#         else:
#             credentials = service_account.Credentials.from_service_account_info(
#                 json.loads(creds_raw),
#                 scopes=["https://www.googleapis.com/auth/analytics.readonly"]
#             )

#         client = BetaAnalyticsDataClient(credentials=credentials)
#         response = client.run_report(RunReportRequest(
#             property=f"properties/{GA_PROPERTY_ID}",
#             date_ranges=[DateRange(start_date=range, end_date="today")],
#             metrics=[
#                 Metric(name="totalUsers"),
#                 Metric(name="screenPageViews"),
#                 Metric(name="averageSessionDuration"),
#                 Metric(name="bounceRate"),
#             ],
#             dimensions=[
#                 Dimension(name="month"),
#                 Dimension(name="country"),
#                 Dimension(name="deviceCategory"),
#             ],
#         ))

#         rows = [
#             {
#                 "dimensionValues": [{"value": d.value} for d in row.dimension_values],
#                 "metricValues":    [{"value": m.value} for m in row.metric_values],
#             }
#             for row in response.rows
#         ]
#         totals = [
#             {"metricValues": [{"value": m.value} for m in row.metric_values]}
#             for row in response.totals
#         ]
#         return {"rows": rows, "totals": totals}

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analytics")
def analytics(range: str = "30daysAgo"):
    try:
        creds_raw = GA_CREDENTIALS
        if creds_raw.endswith(".json"):
            credentials = service_account.Credentials.from_service_account_file(
                creds_raw,
                scopes=["https://www.googleapis.com/auth/analytics.readonly"]
            )
        else:
            credentials = service_account.Credentials.from_service_account_info(
                json.loads(creds_raw),
                scopes=["https://www.googleapis.com/auth/analytics.readonly"]
            )

        client = BetaAnalyticsDataClient(credentials=credentials)
        response = client.run_report(RunReportRequest(
            property=f"properties/{GA_PROPERTY_ID}",
            date_ranges=[DateRange(start_date=range, end_date="today")],
            metrics=[
                Metric(name="totalUsers"),
                Metric(name="screenPageViews"),
                Metric(name="averageSessionDuration"),
                Metric(name="bounceRate"),
            ],
            dimensions=[
                Dimension(name="month"),
                Dimension(name="country"),
                Dimension(name="deviceCategory"),
            ],
            metric_aggregations=[MetricAggregation.TOTAL],
        ))

        rows = [
            {
                "dimensionValues": [{"value": d.value} for d in row.dimension_values],
                "metricValues":    [{"value": m.value} for m in row.metric_values],
            }
            for row in response.rows
        ]
        totals = [
            {"metricValues": [{"value": m.value} for m in row.metric_values]}
            for row in response.totals
        ]
        return {"rows": rows, "totals": totals}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
