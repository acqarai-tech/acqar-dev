import os
import re
import json
import asyncio
import traceback
import math
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
import time

from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
from supabase import create_client
from collections import defaultdict
from groq import Groq

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
router      = APIRouter()
SUPABASE_URL = os.getenv("SUPABASE_URL_CHAT", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY_CHAT", "")
supabase     = create_client(SUPABASE_URL, SUPABASE_KEY)
PRIMARY_MODEL  = "openai/gpt-oss-120b"
FALLBACK_MODEL = "openai/gpt-oss-20b"
BACKEND = os.getenv("BACKEND_URL", "https://development-production-2ad3.up.railway.app")
_executor = ThreadPoolExecutor(max_workers=int(os.getenv("ACQAR_EXECUTOR_WORKERS", "25")))

class ChatRequest(BaseModel):
    message: str
    history: list = []

AREA_ID_MAP = {
    "jumeirah village circle": 59, "dubai creek harbour": 100009,
    "dubai hills estate": 53, "arabian ranches 3": 16296,
    "arabian ranches 2": 133, "arabian ranches": 133,
    "jumeirah lake towers": 12, "jumeirah golf estates": 347,
    "dubai sports city": 67, "dubai internet city": 1621,
    "dubai production city": 5036, "dubai media city": 95,
    "dubai harbour": 3512, "barsha heights": 25,
    "discovery gardens": 13, "international city": 368,
    "palm jumeirah": 410, "palm jebel ali": 1519,
    "silicon oasis": 295, "bluewaters island": 1754,
    "business bay": 54, "downtown dubai": 10,
    "damac hills": 279,     "damac hills 2": 352,
    "odara": 352,          
    "damac lagoons": 75266, "tilal al ghaf": 5173,
    "damac islands 2": 89789, 
    "fiji 1": 506, "fiji 2": 506, "fiji": 506,
    "dubai islands": 5178, "creek harbour": 100009,
    "dubai marina": 330, "dubai hills": 53,
    "jumeirah park": 73, "sports city": 67,
    "town square": 386, "dubai south": 3355,
    "motor city": 268, "al furjan": 41,
    "bluewaters": 1754, "al barsha": 105,
    "al jaddaf": 1509, "al karama": 271,
    "al satwa": 1347, "nad al sheba": 161,
    "oud metha": 388, "expo city": 85082,
    "dubailand": 51, "meydan": 43,
    "downtown": 10, "the greens": 100074,
    "jaddaf": 1509, "tecom": 25, "greens": 100074,
    "karama": 271, "satwa": 1347, "mirdif": 232,
    "marina": 330, "palm": 410, "difc": 117,
    "impz": 5036, "arjan": 91, "dso": 295,
   "jvc": 59, "jlt": 12, "jumeirah": 23, "deira": 545, "liwan": 100016,
   "jumeirah village triangle": 100002, "jvt": 100002,
    "jbr": 100023, "jumeirah beach residence": 100023,
    "burj khalifa": 390,
    "jumeirah first": 317, "jumeirah second": 375, "jumeirah third": 318,
    "al wasl": 914,
    "pearl jumeirah": 344,
    "green community": 673,
    "dubai festival city": 277,
    "dubai studio city": 81,
    "world islands": 413,
    "palm deira": 432, "palm jabal ali": 411,
    "living legends": 52,
    "al quoz": 293,
    "al safa": 313,
    "dubai design district": 22688, "d3": 22688,
    "dubai maritime city": 2848,
    "culture village": 190, "jaddaf waterfront": 190,
    "dubai land residence complex": 603,
    "trade center": 341,
    "bur dubai": 345,
    "mohammed bin rashid city": 302, "mbr city": 302,
"sobha heartland": 100015,
"the valley": 100040, "the valley by emaar": 100040,
"city walk": 100025,
"al barari": 100018,
"villanova": 100032,
"mira": 100034,
"mudon": 100035,
"la mer": 100037,
"the lakes": 100041,
"emirates living": 100073,
"sustainable city": 100055,
"serena": 100047,
"the villa": 100045,
"remraam": 100026,
"meydan one": 100012,
"meydan avenue": 100027,
"meydan horizon": 89404,
"jumeirah islands": 100049,
"jumeirah living": 100050,
"jumeirah heights": 849,
"dubai water canal": 100029,
"dubai science park": 100007,
"business park": 100003,
"majan": 100001,
"liwan 2": 75598,
"dubai marina proper": 36,
"damac islands": 506,
}

AREA_DISPLAY_NAMES = {
    36: "Dubai Marina", 59: "Jumeirah Village Circle (JVC)",
    10: "Downtown Dubai", 54: "Business Bay", 410: "Palm Jumeirah",
    23: "Jumeirah", 53: "Dubai Hills Estate", 12: "Jumeirah Lake Towers (JLT)",
    117: "DIFC", 1509: "Dubai Creek Harbour", 1754: "Bluewaters Island",
    3355: "Dubai South", 41: "Al Furjan", 268: "Motor City",
    67: "Dubai Sports City", 133: "Arabian Ranches", 352: "DAMAC Hills 2 (Akoya by DAMAC)",
    386: "Town Square", 91: "Arjan", 105: "Al Barsha", 295: "Dubai Silicon Oasis (DSO)",
    232: "Mirdif", 13: "Discovery Gardens", 368: "International City",
    25: "Barsha Heights / TECOM", 545: "Deira", 100016: "Liwan", 345: "Bur Dubai",
    506: "DAMAC Islands", 89789: "DAMAC Islands 2",
    43: "Meydan", 73: "Jumeirah Park", 347: "Jumeirah Golf Estates",
    51: "Dubailand", 85082: "Expo City Dubai",
    330: "Dubai Marina", 390: "Burj Khalifa", 317: "Jumeirah First",
    375: "Jumeirah Second", 318: "Jumeirah Third", 914: "Al Wasl",
    344: "Pearl Jumeirah", 673: "Green Community", 277: "Dubai Festival City",
    81: "Dubai Studio City", 413: "World Islands", 432: "Palm Deira",
    411: "Palm Jabal Ali", 52: "Living Legends", 293: "Al Quoz",
    313: "Al Safa", 22688: "Dubai Design District (D3)",
    2848: "Dubai Maritime City", 190: "Culture Village (Jaddaf Waterfront)",
   603: "Dubai Land Residence Complex", 341: "Trade Center First",
    100023: "Jumeirah Beach Residence (JBR)", 100002: "Jumeirah Village Triangle (JVT)",
    302: "Mohammed Bin Rashid City (MBR City)",
100015: "Sobha Heartland",
100040: "The Valley by Emaar",
100025: "City Walk",
100018: "Al Barari",
100032: "Villanova",
100034: "Mira",
100035: "Mudon",
100037: "La Mer",
100041: "The Lakes",
100073: "Emirates Living",
100055: "Sustainable City",
100047: "Serena",
100045: "The Villa",
100026: "Remraam",
100012: "Meydan One",
100027: "Meydan Avenue",
89404: "Meydan Horizon",
100049: "Jumeirah Islands",
100050: "Jumeirah Living",
849: "Jumeirah Heights",
100029: "Dubai Water Canal",
100007: "Dubai Science Park",
100003: "Business Park",
100001: "Majan",
75598: "Liwan 2",
100009: "Dubai Creek Harbour",
100074: "The Greens and The Views",
36: "Dubai Marina",

}

BEDROOM_KEYS = {
    "0": "Studio", "0.0": "Studio", "1": "1 BR", "1.0": "1 BR",
    "2": "2 BR", "2.0": "2 BR", "3": "3 BR", "3.0": "3 BR",
    "4": "4 BR", "4.0": "4 BR", "5": "5 BR", "5.0": "5 BR",
}

ROOM_LABEL_MAP = {"0": "Studio", "1": "1 BR", "2": "2 BR", "3": "3 BR", "4": "4 BR", "5": "5 BR"}

def _room_label(v):
    if v is None: return None
    s = str(v).strip().lower()
    if not s: return None
    if "studio" in s: return "Studio"
    m = re.search(r'(\d+)', s)
    if m: return ROOM_LABEL_MAP.get(m.group(1))
    return None

def _clean_area_search_term(name: str) -> str:
    return re.sub(r'\s*\([^)]*\)', '', name or "").strip()

# These actually map to specific areas in LIFESTYLE_AREA_MAP — trigger area search
LIFESTYLE_KEYWORDS = [
    "british", "expat", "family", "school", "villa", "community", "kids",
    "children", "safe", "quiet", "beach", "beachfront", "luxury", "affordable",
    "cheap", "golf", "waterfront", "airbnb", "short term", "holiday home",
    "freehold", "high yield",
]

# Only treat a message as a lifestyle/area-recommendation request when it
# actually ASKS for one — not when these words merely appear inside a
# property listing description or unrelated sentence.
LIFESTYLE_INTENT_PATTERNS = [
    "where should i", "which area", "which areas", "best area for",
    "best areas for", "recommend an area", "recommend areas",
    "looking for a", "want to live in", "suggest an area", "suggest areas",
    "top areas for", "good area for", "areas to consider",
]

LIFESTYLE_AREA_MAP = {
    "british": [53, 23, 73], "family": [53, 73, 133, 59, 100015, 100040],
    "kids": [53, 73, 133, 59], "children": [53, 73, 133, 59],
    "school": [53, 73, 133], "expat": [330, 10, 54, 12],
    "quiet": [59, 73, 53], "safe": [59, 73, 53, 133],
    "beach": [410, 330, 1754], "beachfront": [410, 1754],
    "luxury": [410, 10, 330, 117, 100037, 302], "affordable": [59, 91, 13, 368, 100002, 100026, 75598],
    "cheap": [59, 368, 13], "budget": [59, 13, 368],
    "golf": [347, 352, 53], "waterfront": [330, 410, 12, 1754, 100037, 100029, 100009],
    "metro": [25, 12, 54, 10], "airbnb": [330, 10, 54, 1754],
    "short term": [330, 10, 54], "holiday home": [410, 330, 1754],
    
"villa": [73, 133, 352, 53, 100002, 100032, 100034, 100035, 100045, 100015, 100040],
"freehold": [59, 330, 54, 10],
"community": [53, 73, 133, 59],
}




LIFESTYLE_STRONG_SIGNALS = {
    "family", "families", "kids", "children", "school", "schools",
    "safe", "safety", "community feel", "villa", "townhouse",
}

NATIONALITY_KEYWORDS = [
    "british", "russian", "chinese", "indian", "pakistani", "filipino",
    "emirati", "european", "french", "german", "italian", "american",
    "canadian", "arab", "saudi", "egyptian", "lebanese", "african",
    "south asian", "east asian", "western", "japanese", "korean",
]

# Coordinates for every area — extend this as you add new areas to AREA_ID_MAP.
# This is what lets commute calculation work for ANY area pair, not a fixed list.
AREA_COORDINATES = {
    10: (25.1972, 55.2744), 54: (25.1877, 55.2633), 117: (25.2138, 55.2822),
    390: (25.1972, 55.2744), 341: (25.2582, 55.3047), 330: (25.0806, 55.1403),
    12: (25.0693, 55.1409), 100023: (25.0787, 55.1338), 1754: (25.0940, 55.1350),
    3512: (25.0410, 55.1230), 59: (25.0596, 55.2081), 91: (25.1103, 55.2331),
    41: (25.0304, 55.1447), 268: (25.0453, 55.2323), 73: (25.0570, 55.2153),
    5036: (25.0289, 55.1863), 3355: (24.9857, 55.1713), 386: (25.0100, 55.2372),
    51: (25.0400, 55.2500),100016: (24.9950, 55.2850), 85082: (24.9754, 55.1927), 53: (25.0958, 55.2536),
    133: (25.0480, 55.2650), 279: (25.0350, 55.2350), 352: (24.9950, 55.3450),
    5173: (25.0290, 55.3020), 347: (25.0330, 55.2170), 545: (25.2697, 55.3095),
    345: (25.2582, 55.2977), 271: (25.2450, 55.3050), 1347: (25.2280, 55.2820),
    25: (25.0910, 55.1950), 368: (25.1620, 55.3900), 13: (25.0470, 55.1240),
    410: (25.1124, 55.1390), 411: (25.0100, 54.9500), 432: (25.2450, 55.0300),
    413: (25.2100, 55.0900), 23: (25.2120, 55.2450), 317: (25.2280, 55.2560),
    375: (25.2050, 55.2380), 318: (25.1880, 55.2250), 914: (25.1970, 55.2440),
    344: (25.2470, 55.2670), 673: (25.0530, 55.2450), 277: (25.2230, 55.3520),
    81: (25.0300, 55.2200), 52: (25.0180, 55.2760), 293: (25.1470, 55.2350),
    313: (25.1690, 55.2400), 22688: (25.1810, 55.2610), 2848: (25.2600, 55.3200),
    190: (25.2260, 55.3300), 1509: (25.1900, 55.3600), 603: (25.0500, 55.3300),
    295: (25.1220, 55.3830), 95: (25.1000, 55.1650), 1621: (25.0980, 55.1620),
    232: (25.2160, 55.4050), 161: (25.1720, 55.3300), 388: (25.2400, 55.3230),
    43: (25.1580, 55.3040), 67: (25.0470, 55.2260),
    506: (25.0200, 55.2000), 89789: (25.0200, 55.2000), 100002: (25.0540, 55.1980),
    302: (25.1620, 55.2870),    # Mohammed Bin Rashid City
    100015: (25.1660, 55.2850), # Sobha Heartland
    100040: (25.0450, 55.3550), # The Valley by Emaar
    100025: (25.2090, 55.2660), # City Walk
    100018: (25.0680, 55.2680), # Al Barari
    100032: (24.9950, 55.3200), # Villanova
    100034: (25.0330, 55.2400), # Mira
    100035: (25.0180, 55.2650), # Mudon
    100037: (25.2260, 55.2740), # La Mer
    100041: (25.0770, 55.1750), # The Lakes
    100073: (25.0750, 55.1780), # Emirates Living
    100055: (24.9540, 55.2500), # Sustainable City
    100047: (25.0100, 55.2700), # Serena
    100045: (25.0450, 55.2280), # The Villa
    100026: (25.0100, 55.2500), # Remraam
    100012: (25.1600, 55.3070), # Meydan One
    100027: (25.1610, 55.3060), # Meydan Avenue
    89404: (25.1650, 55.3100),  # Meydan Horizon
    100049: (25.0700, 55.1900), # Jumeirah Islands
    100050: (25.2000, 55.2400), # Jumeirah Living
    849: (25.0730, 55.2000),    # Jumeirah Heights
    100029: (25.1900, 55.2600), # Dubai Water Canal
    100007: (25.1150, 55.3900), # Dubai Science Park
    100003: (25.1100, 55.2280), # Business Park
    100001: (25.0400, 55.3050), # Majan
    75598: (24.9930, 55.2870),  # Liwan 2
    100009: (25.1950, 55.3480), # Dubai Creek Harbour
    100074: (25.0920, 55.1750), # The Greens and The Views
    36: (25.0800, 55.1400),     # Dubai Marina (36)
}

COMMUTE_PATTERN = re.compile(
    r'(\d+)\s*(?:to|-)\s*(\d+)\s*min(?:ute)?s?\s*(?:away\s*)?(?:from|to|of)\s+'
    r'([a-z][a-z0-9\s\(\)]{2,40})'
)
COMMUTE_PATTERN_SINGLE = re.compile(
    r'(\d+)\s*min(?:ute)?s?\s*(?:away\s*)?(?:from|to|of)\s+'
    r'([a-z][a-z0-9\s\(\)]{2,40})'
)

MARKET_KEYWORDS = [
    "best area", "top area", "highest yield", "compare", "market overview",
    "which area", "recommend", "suggest", "vs", "versus",
    "where to buy", "where should", "top 5", "top 3", "best areas",
    "rank", "ranking", "overview", "investment score", "highest score",
    "best investment", "top investment",
]



def has_market_keyword(msg_lower: str) -> bool:
    """Word-boundary match for MARKET_KEYWORDS — plain substring matching
    lets 'compare' match inside 'compared'/'comparison', which wrongly
    triggers area-ranking data for unrelated time-comparison questions
    like 'compared to a couple years ago'."""
    for kw in MARKET_KEYWORDS:
        if re.search(r'\b' + re.escape(kw) + r'\b', msg_lower):
            return True
    return False

VOLUME_KEYWORDS = [
    "selling the most", "most sales", "most transactions", "highest volume",
    "most active", "most listings", "who's selling", "where are people selling",
]

def is_volume_query(msg_lower: str) -> bool:
    return any(k in msg_lower for k in VOLUME_KEYWORDS)


YIELD_KEYWORDS = [
    "yield", "rental yield", "highest yield", "best yield",
    "top yield", "rental income", "gross yield",
]

PORTFOLIO_STRATEGY_PATTERNS = [
    "one trophy property", "single property", "single trophy",
    "split it across", "split across", "diversify", "diversification",
    "several units", "multiple units", "spread across", "spread it across",
    "all into one", "put it all into", "one property or", "concentrate",
]

def is_portfolio_strategy_question(msg_lower: str) -> bool:
    return any(p in msg_lower for p in PORTFOLIO_STRATEGY_PATTERNS)

VAGUE_PATTERNS = [
    "just landed", "new to dubai", "moving to dubai", "relocating",
    "want to buy", "looking to buy", "thinking of buying",
    "buy property in dubai", "invest in dubai", "where should i buy",
    "help me find", "guide me", "not sure", "any suggestions",
    "what should i buy", "where to start", "i don't know", "i dont know",
]

LEGAL_QUERY_MARKERS = [
    "rera", "dld complaint", "sue", "lawsuit", "breach", "contract dispute",
    "refuse to honor", "refusing to honor", "cashback", "legal action",
    "court", "arbitration", "compensation", "my rights", "complaint",
    # new additions below — existing ones untouched
    "mortgage", "bank reversed", "loan reversed", "loan cancelled",
    "approval reversed", "approval withdrawn", "central bank", "ombudsman",
    "reversed my", "withdrew my", "cancelled my loan", "cancelled my mortgage",
]


DUE_DILIGENCE_MARKERS = [
    "how to check", "how do i check", "how can i check", "how do i verify",
    "how can i verify", "is there a way to verify", "what signals should i",
    "how do i know if", "how can i tell if", "red flags", "warning signs",
    "due diligence", "before i commit", "before i sign", "how to spot",
    "how to identify", "signs of insolvency", "risk of",
    "watch out for", "anything to watch", "anything specific i should",
    "before i make an offer", "before making an offer",
]

INVESTMENT_VERDICT_KEYWORDS = [
    "investment case", "worth investing", "worth the investment", "good investment",
    "strong investment", "is it a good investment", "paying a premium",
    "brand premium", "is it worth", "should i invest in",
    "overpaying for the name", "overpaying for the brand",
    "justify the premium", "premium for the name", "premium justified",
    "worth the name",
]

def is_investment_verdict_query(msg_lower: str) -> bool:
    return any(k in msg_lower for k in INVESTMENT_VERDICT_KEYWORDS)

VISA_COST_TRADEOFF_KEYWORDS = [
    "worth it", "smarter way", "overpaying", "overpay", "without overpaying",
    "cheaper way", "minimum needed", "just to hit the threshold",
    "just to qualify", "more than i need",
]

def is_visa_cost_tradeoff_query(msg_lower: str) -> bool:
    """Detects questions asking whether spending MORE than a visa's minimum
    threshold is worthwhile, or how to hit the threshold efficiently — these
    need an actual qualitative verdict, not just a repeat of the mechanics
    table, which is what the LLM defaults to when this instruction is only
    stated inline inside a long prompt paragraph."""
    return any(k in msg_lower for k in VISA_COST_TRADEOFF_KEYWORDS)


AFFIRMATIVE_PATTERNS = ["yes", "yeah", "yep", "sure", "please", "ok", "okay", "go ahead", "sounds good", "please do", "id like that", "i'd like that", "do that", "go for it"]

def _is_affirmative_message(text: str) -> bool:
    t = text.strip().lower().rstrip(".!")
    if t in AFFIRMATIVE_PATTERNS:
        return True
    words = t.split()
    if len(words) <= 6:
        for p in AFFIRMATIVE_PATTERNS:
            if t == p or t.startswith(p + " ") or t.startswith(p + ","):
                return True
    return False


def _classify_prior_offer(prior_question: str) -> str:
    q = prior_question.lower()
    if any(p in q for p in ["specific area", "which area", "which areas"]):
        return "needs_area"
    if any(p in q for p in [
        "locating affordable", "locate affordable", "find specific",
        "identifying specific", "identify specific", "freehold units",
        "freehold projects", "shortlist", "candidate units", "candidate areas",
    ]):
        return "needs_unit_shortlist"
    return "generic_fulfill"

OFFPLAN_DEFAULT_KEYWORDS = [
    "default", "miss a payment", "missed a payment", "can't keep up",
    "cant keep up", "fall behind", "behind on payment", "forfeit",
    "lose everything", "lose my money", "cancel my contract",
    "terminate the contract", "stop paying", "can't afford the payments",
    "cant afford the payments", "payment plan default",
]

# Verified reference only — never surface these exact %/day figures to the
# user as settled fact. Confirm current caps with a lawyer/RERA before
# treating this as ground truth; it exists so the model paraphrases the
# STRUCTURE (tiered by construction stage) instead of hallucinating one.
OFFPLAN_DEFAULT_FACTS = (
    "Verified reference framework (do not quote exact %/day figures as "
    "settled fact — describe the structure and tell the user to confirm "
    "current caps with RERA/DLD or a licensed UAE lawyer): Dubai off-plan "
    "payment default under RERA/DLD escrow rules is NOT automatic total "
    "forfeiture. Developer retention on termination is capped on a tiered "
    "basis tied to construction completion — the earlier the project stage, "
    "the lower the cap; the cap rises as construction progresses; near "
    "completion the developer may resell/auction the unit instead of "
    "keeping the full contract sum. Any amount paid above the applicable "
    "cap must be returned to the buyer. Before default, buyers can usually "
    "request a payment deferral/restructuring, or assign (resell) the "
    "off-plan contract to a new buyer to recover paid equity."
)


VISA_QUERY_KEYWORDS = [
    "golden visa", "investor visa", "residency visa", "property visa",
    "visa eligibility", "visa qualify", "qualify for a visa", "10-year visa",
    "10 year visa", "2-year visa", "2 year visa", "uae residency",
]

# Verified reference only — structural framework, no exact AED figures
# surfaced as settled fact. Exists so the model distinguishes the TWO
# separate visa products instead of merging them and inventing one number.
VISA_RULES_FACTS = (
    "Verified reference framework (describe structure only — do not quote "
    "exact AED thresholds as settled fact without hedging; tell the user to "
    "confirm current figures with GDRFA/DLD or a licensed UAE immigration "
    "advisor): Dubai property-linked residency has AT LEAST TWO DISTINCT "
    "visa products with DIFFERENT rules — never merge them into one answer. "
    "(1) The long-term Golden Visa: for higher-value property purchases, "
    "off-plan buyers can generally qualify BEFORE handover using the "
    "DLD's off-plan registration certificate (Oqood) as proof of purchase, "
    "provided the developer is RERA-registered and the property is in a "
    "freehold zone. (2) The shorter-term standard property investor visa: "
    "this generally requires a COMPLETED property with an issued title "
    "deed — an Oqood certificate is typically not accepted for this "
    "category, so off-plan buyers usually must wait until handover for "
    "this visa type. WHAT HAPPENS ON SALE/DISPOSAL: do NOT state as "
    "settled fact whether selling the qualifying property causes automatic "
    "revocation, a grace period, or continued validity until expiry — this "
    "varies by visa type, timing, and current GDRFA practice and is NOT "
    "something to assert confidently. Describe it only as 'this is a "
    "case-specific question that depends on current GDRFA rules and how "
    "your particular visa was issued' and tell the user to confirm directly "
    "with GDRFA/DLD or an immigration lawyer before selling, rather than "
    "assuming continued eligibility. Always state which of the two products "
    "you're describing, and never quote a specific AED threshold as certain — "
    "describe it as 'a minimum property value applies' and tell the user "
    "to confirm the current figure with GDRFA/DLD."
)


BUYER_PROTECTION_KEYWORDS = [
    "double sold", "double selling", "sold to someone else", "sold my unit",
    "escrow protect", "how likely", "still happen today", "happen today",
    "what's changed", "whats changed", "horror story", "worst case scenario",
    "before reform", "buyer protection", "used to happen", "risk of losing my",
    "developer resell", "resell my unit",
]

# Verified reference only — structural framework, no exact %/AED/date figures
# surfaced as settled fact. Exists so the model explains the MECHANISM (Oqood
# registration, escrow) instead of inventing percentages under a fake
# "Since 2020, RERA requires X%" citation.
BUYER_PROTECTION_FACTS = (
    "Verified reference framework (describe structure only — do not quote "
    "exact percentages, dates, or AED figures as settled fact; tell the user "
    "to confirm current rules with RERA/DLD or a licensed UAE lawyer): "
    "Dubai's off-plan buyer protections have been substantially strengthened "
    "since the pre-2008 era, when sales were often tracked only on developer "
    "spreadsheets with no mandatory registration, allowing a developer to "
    "resell a unit to a different buyer despite receiving most of the "
    "original buyer's payments. Today: (1) Interim registration — signed "
    "sale contracts are generally registered on the DLD's Oqood system, "
    "tying the unit to the buyer's name and making an unregistered resale "
    "to someone else much harder to execute legitimately. (2) Escrow "
    "accounts — buyer payments are generally required to go into a "
    "project-specific bank escrow account rather than the developer's "
    "general funds, with release tied to verified construction milestones. "
    "(3) Regulatory oversight of stalled projects — regulators can "
    "intervene in severely delayed or abandoned projects. Never state an "
    "exact escrow percentage, retention cap, performance-bond percentage, "
    "or 'X% risk' figure as fact — describe the mechanism only and tell "
    "the user to confirm specifics and verify their own project's "
    "registration/escrow status directly with RERA/DLD."
)


SERVICE_CHARGE_KEYWORDS = [
    "service charge", "service charges", "maintenance fee", "maintenance fees",
    "owners association fee", "oa fee", "sinking fund",
]

# Verified reference only — describes the correct BASIS for Dubai service
# charges (RERA index rates are always AED/sqft/year, or expressed as a %
# of the PROPERTY VALUE — never as a % of annual rent). Exists so the model
# can't invent a "% of rent" framing, which produces numbers an order of
# magnitude too small and has no basis in how Dubai service charges work.
SERVICE_CHARGE_FACTS = (
    "Verified reference framework (describe structure only — do not quote "
    "one precise AED/sqft rate as settled fact for a specific building; tell "
    "the user to confirm the exact rate on their owners association statement "
    "or the RERA service charge index): Dubai service charges are set and "
    "published PER PROJECT via the RERA service charge index, quoted as "
    "AED per square foot of the unit's built-up area per year — mid-market "
    "buildings are typically in roughly the AED 10-20/sqft/year range, "
    "premium/waterfront buildings higher. As a rough property-value cross-"
    "check, annual service charges commonly land around 1-2% of the "
    "property's value, though this varies a lot by building age, amenities, "
    "and developer. NEVER express service charges as a percentage of the "
    "unit's RENTAL income — that is not how they are set or published, and "
    "produces a figure with no basis in real Dubai OA statements. To assess "
    "impact on rental returns, compare the AED/sqft or AED/year charge "
    "directly against the unit's annual rent in AED, not as a percentage "
    "of rent."
)

FRACTIONAL_INVESTING_KEYWORDS = [
    "fractional", "fractional ownership", "fractional investing",
    "fractional real estate", "crowdfund", "crowdfunding",
    "smartcrowd", "stake", "prypco", "reit.ae", "reitae", "baytk",
]

# Verified reference only — structural framework, no invented sector stats.
# Exists so the model describes the MODEL (partial ownership, lower entry
# cost, liquidity/control trade-offs) instead of hallucinating total capital
# raised, investor counts, yield ranges, or fee percentages for the sector
# or any named platform.
FRACTIONAL_INVESTING_FACTS = (
    "Verified reference framework (describe structure only — do NOT invent "
    "sector-wide or platform-specific statistics: no total capital raised, "
    "no investor counts, no 'since 20XX' framing, no yield/return percentage "
    "ranges, no minimum investment amounts, no fee percentages — none of "
    "this is provided data and must not be stated as fact): Fractional or "
    "crowdfunded real estate platforms let an investor buy a partial share "
    "of a property, typically with a lower entry cost than a full purchase "
    "or a full down payment. Structural trade-offs to describe QUALITATIVELY "
    "only: the investor does not control tenancy or resale timing, returns "
    "depend on that specific project's performance and the platform's fee "
    "structure, secondary-market liquidity for exiting a position is "
    "typically slower and less certain than reselling a directly-owned "
    "property, and the platform's own regulatory status (e.g. DFSA "
    "registration in the UAE) and the underlying developer's track record "
    "should be verified independently before committing funds. Tell the "
    "user to confirm current minimums, fees, and reported returns directly "
    "on the platform's own site or app — never state these as settled fact."
)

LEGAL_CITATION_PATTERN = re.compile(
    r'\b(article\s+\d+|law\s+no\.?\s*\d+|regulation\s+no\.?\s*\d+/?\d*|'
    r'\d+[\s\u2010-\u2015]*(?:-)?[\s\u2010-\u2015]*\d*\s*(?:months?|years?|days?)\s*'
    r'(?:period|window|deadline|to\s+(?:file|lodge|claim|limitation|respond|reply))|'
    r'(?:within|after)\s+\d+[\s\u2010-\u2015]*(?:-)?[\s\u2010-\u2015]*\d*\s*(?:months?|years?|days?)|'
    r'aed\s*[\d,]+\s*(?:million|m|k)?\b.{0,30}(?:small\s+claims|threshold|visa|eligib|qualif|minimum\s+value)|'
    r'\d+(?:\.\d+)?\s*%\s*(?:of\s+)?.{0,30}(?:retain|forfeit|keep|penalty|non-refundable|per\s+annum|late[- ]payment|'
    r'escrow|held\s+in|performance\s+bond|bank\s+guarantee)|'
    r'since\s+\d{4}\b.{0,40}(?:rera|dld|law|requires|mandates))',
    re.IGNORECASE
)
LEGAL_OBLIGATION_PATTERN = re.compile(
    r'\b(bank|lender|developer|agency|institution|adib|rera|dld)\s+'
    r'(?:must|is required to|has to|generally must|is obligated to)\b'
    r'|\bcentral bank\'?s?\s+consumer protection\b'
    r'|\bombudsman\b',
    re.IGNORECASE
)


PORTAL_NAME_PATTERN = re.compile(
    r'\b(trakheesi|developer\s+financial\s+health\s+portal|dfm\s+filing|'
    r'moody\'?s|s&p|fitch|dubai\s+courts\'?\s+public\s+registry|dfsa|'
    r'gdrfa)\b',
    re.IGNORECASE
)

VISA_AED_THRESHOLD_PATTERN = re.compile(
    r'(?:\b(?:a|an|one)\s+(?:single\s+)?)?AED\s*[\d,]+(?:\.\d+)?\s*(?:million|m|k)?\b',
    re.IGNORECASE
)

VISA_RETENTION_CLAIM_PATTERN = re.compile(
    r'\b(will not (?:automatically )?lose|remains? valid|stays? valid|'
    r'you (?:can|may) keep|does not (?:automatically )?revoke|'
    r'visa (?:stays|remains) active)\b',
    re.IGNORECASE
)

VISA_TIMEFRAME_PATTERN = re.compile(
    r'\b\d+\s*(?:to|-|–)?\s*\d*\s*(?:weeks?|months?|days?)\b'
    r'(?=[^.]{0,80}(?:golden\s*visa|residency|gdrfa|visa\s+(?:issu|stamp|process)|'
    r'title\s+deed|application|processing|approval))',
    re.IGNORECASE
)

# Catches named third-party commercial platforms (fractional-ownership,
# brokerages, portals) paired with a sign-up/account CTA — ACQAR has no
# verified data relationship with these platforms, so both the stats and
# the implied endorsement are a problem.
THIRD_PARTY_PLATFORM_PATTERN = re.compile(
    r'\b(smartcrowd|stake|baytk|reit\.ae|reitae|prypco)\b.{0,60}'
    r'(sign\s*up|open\s+an\s+account|create\s+an\s+account|register\s+(?:an\s+account|now)|visit\s+their\s+site)',
    re.IGNORECASE
)

# Catches a named third-party platform sitting near a specific AED figure or
# percentage EVEN WITHOUT a sign-up CTA nearby — e.g. "Smartcrowd let you
# start with as little as AED 5,000" has no CTA verb, so
# THIRD_PARTY_PLATFORM_PATTERN never fires on it. This is the backstop for
# that gap.
THIRD_PARTY_PLATFORM_STAT_PATTERN = re.compile(
    r'\b(smartcrowd|stake|baytk|reit\.ae|reitae|prypco)\b'
    r'(?:(?!\.\s|$).){0,80}?'
    r'(aed\s*[\d,]+(?:\.\d+)?\s*(?:million|m|k)?|\d+(?:\.\d+)?\s*%)',
    re.IGNORECASE
)

# Catches fabricated fractional/crowdfunding-investing statistics even when
# NO platform name sits near the number — e.g. "Dubai's regulated
# crowdfunding sector has attracted hundreds of investors and raised
# several billion AED" or "Reported annualised yields... typically sit
# between 5% and 8%" in a section that only named the platform once,
# elsewhere in the reply. This is the gap THIRD_PARTY_PLATFORM_STAT_PATTERN
# misses because it requires name+number proximity.
FRACTIONAL_CATEGORY_STAT_PATTERN = re.compile(
    r'(fractional|crowdfund\w*)'
    r'(?:(?!\.\s|$).){0,300}?'
    r'(aed\s*[\d,]+(?:\.\d+)?\s*(?:million|billion|m|k)?|\d+(?:\.\d+)?\s*%|'
    r'\bhundreds?\s+of\s+investors\b|\bthousands?\s+of\s+investors\b)',
    re.IGNORECASE | re.DOTALL
)

# Catches invented financial/operational thresholds stated as fact in
# due-diligence-style answers, e.g. "debt-to-equity above 1.5",
# "occupancy below 70%" — these are never grounded in DB context since
# ACQAR has no developer financial data table.
FABRICATED_METRIC_PATTERN = re.compile(
    r'\b(?:debt[- ]to[- ]equity|current\s+ratio|liquidity\s+ratio|solvency\s+ratio|'
    r'occupancy\s+rate|default\s+rate|delay\s+rate|quick\s+ratio)\b[^.]{0,40}'
    r'(?:above|below|exceeds?|greater\s+than|less\s+than|over|under|>|<)\s*'
    r'\d+(\.\d+)?%?',
    re.IGNORECASE
)

NO_DP_KEYWORDS = [
    "no downpayment", "no down payment", "without downpayment", "without down payment",
    "zero downpayment", "zero down payment", "0 downpayment", "0 down payment",
    "no dp", "without dp", "downpayment not required", "down payment not required",
    "no money for downpayment", "don't have downpayment", "do not have downpayment",
    "not have sufficient funds", "insufficient funds", "not sufficient funds",
    "no sufficient funds", "way around", "workaround", "post handover",
    "post-handover", "payment plan", "0% downpayment", "emi only",
    "salary and side income", "side income",
]

FINANCING_KEYWORDS = [
    "emi", "mortgage", "home loan", "bank loan", "financing", "finance",
    "monthly payment", "instalment", "installment", "pre-approval",
    "murabaha", "ltv", "down payment", "downpayment", "ready to move",
]


BUYER_KEYWORDS = [
    "buy", "buying", "purchase", "i want to buy", "looking to buy",
    "first time buyer", "end user", "own use", "live in", "to live",
    "move in", "move to", "living in",
    "family home", "apartment for myself", "home for", "which area should i",
    "where should i buy", "afford", "for myself", "for my family",
    "to stay", "to reside", "end-user", "for living", "off-plan", "oqood", "spa", "defect", "snagging", "handover",
"cooling off", "escrow", "noc", "form f", "title deed", "freehold",
"leasehold", "service charge", "golden visa", "dewa", "pre-approval",
"ltv", "murabaha", "mortgage", "down payment", "first time",

]
SELLER_KEYWORDS = [
    "sell", "selling", "list", "listing", "put on market", "good time to sell",
    "should i sell", "when to sell", "exit", "offload", "dispose",
    "my property", "my apartment", "my villa", "i own", "i have a property",
    "sale price", "asking price", "how much can i sell", "want to sell",
    "looking to sell", "thinking of selling", "time to sell", "evict", "eviction", "tenancy", "vacant possession", "assignment",
"power of attorney", "poa", "repatriate", "capital gain", "flip",
"listing", "mandate", "valuation", "form a", "form b",
]
INVESTOR_KEYWORDS = [
    "invest", "investment", "roi", "return", "yield", "rental yield",
    "rental income", "passive income", "portfolio", "capital appreciation",
    "cash flow", "gross yield", "net yield", "off plan", "off-plan",
    "hold", "flip", "exit strategy", "capital gain", "rental return",
    "buy to let", "buy-to-let", "multiple units", "diversify",
    "best return", "highest return", "income property", "rent out",
    "tenant", "letting", "rental property","airbnb", "short term rental", "holiday home", "dtcm", "flip",
"assignment", "occupancy rate", "net yield", "service charge",
"token", "reit", "hotel apartment", "co-living", "d33",
]
BROKER_KEYWORDS = [
    "broker", "agent", "realtor", "rera", "client", "my client", "clients",
    "commission", "viewings", "leads", "prospect", "pipeline",
    "market report", "area report", "pitch", "present to client",
    "comparable", "comps", "transaction data", "dld data",
    "i am an agent", "i'm an agent", "i work in real estate",
    "real estate professional", "property consultant", "give me comparables",
    "for my client", "i work as", "rera card", "rera licence", "commission split", "lead generation",
"bayut", "property finder", "off-plan launch", "form a", "form b",
"dual agency", "co-broking", "aml", "ejari", "crm", "mandate",
"exclusive listing", "tyre-kicker", "co-broke",
]



DEVELOPER_QUERY_KEYWORDS = [
    "top developer", "top 10 developer", "best developer", "developers in dubai",
    "developer ranking", "which developer", "list of developers",
]

def is_developer_query(msg_lower: str) -> bool:
    return any(k in msg_lower for k in DEVELOPER_QUERY_KEYWORDS) or (
        "developer" in msg_lower and any(k in msg_lower for k in ["top", "best", "rank", "list", "who are"])
    )

PERSONAL_USE_MARKERS = [
    "relocating", "moving to dubai", "family of", "for my family",
    "to live in", "we are moving", "planning to live", "moving with my family",
]

def detect_user_type(msg_lower: str) -> str:
    if any(k in msg_lower for k in PERSONAL_USE_MARKERS):
        buyer_score = sum(1 for k in BUYER_KEYWORDS if k in msg_lower)
        investor_score = sum(1 for k in INVESTOR_KEYWORDS if k in msg_lower)
        if buyer_score >= 1 and investor_score <= buyer_score:
            return "buyer"
    scores = {
        "broker":   sum(1 for k in BROKER_KEYWORDS if k in msg_lower),
        "seller":   sum(1 for k in SELLER_KEYWORDS if k in msg_lower),
        "investor": sum(1 for k in INVESTOR_KEYWORDS if k in msg_lower),
        "buyer":    sum(1 for k in BUYER_KEYWORDS if k in msg_lower),
    }
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "general"


def detect_language(text: str):
    """Returns (lang_code, direction)"""
    # Arabic script block (covers Arabic + Urdu)
    if re.search(r'[\u0600-\u06FF\u0750-\u077F]', text):
        # Urdu-specific letters: ٹ ڈ ڑ ں ھ ہ ے etc.
        if re.search(r'[\u0679\u0688\u0691\u06BA\u06BE\u06C1\u06C2\u06D2]', text):
            return "ur", "rtl"
        return "ar", "rtl"
    if re.search(r'[\u4e00-\u9fff]', text):          # Chinese
        return "zh", "ltr"
    return "en", "ltr"


LANG_NAMES = {"ar": "Arabic", "ur": "Urdu", "zh": "Simplified Chinese"}


def translate_result_texts(result: dict, lang: str) -> dict:
    """Translates summary / reply / insight via Groq. Numbers, URLs, emojis stay intact."""
    target = LANG_NAMES.get(lang)
    if not target:
        return result

    payload = {
        "summary": result.get("summary", ""),
        "reply":   result.get("reply", ""),
        "insight": result.get("insight", ""),
    }
    sys = (
        f"You are a translator. Translate the JSON string values into {target}.\n"
        "STRICT RULES:\n"
        "- Keep ALL numbers, AED amounts, percentages, dates EXACTLY unchanged\n"
        "- Keep area names (e.g. Dubai Marina, JVC), developer names, and URLs unchanged\n"
        "- Keep all emojis, bullet symbols (•), and line breaks (\\n) in the same positions\n"
        "- TRANSLATE section header text (e.g. '📌 INVESTMENT VERDICT' → '📌 قرار الاستثمار') but the emoji must remain the FIRST character of the header line\n"
        "- Return ONLY valid JSON with the same keys: summary, reply, insight"
    )
    messages = [
        {"role": "system", "content": sys},
        {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
    ]

    def call(model):
        resp = groq_client.chat.completions.create(
            model=model, messages=messages, temperature=0,
            max_tokens=2500, response_format={"type": "json_object"},
        )
        return resp.choices[0].message.content.strip()

    try:
        try:    raw = call(PRIMARY_MODEL)
        except: raw = call(FALLBACK_MODEL)
        translated = extract_json(raw)
        for k in ("summary", "reply", "insight"):
            if translated.get(k):
                result[k] = translated[k]
    except Exception as e:
        print(f"[ACQAR] translation error: {e}")  # fail silently → English fallback
    return result



def translate_to_english(text: str) -> str:
    """Translate user query to English so keyword/area detection works. Returns original on failure."""
    try:
        resp = groq_client.chat.completions.create(
            model=PRIMARY_MODEL,
            messages=[
                {"role": "system", "content": (
                    "Translate the user's message to English. Return ONLY the translated text, nothing else. "
                    "Use standard English names for Dubai areas (e.g. واحة دبي للسيليكون → Dubai Silicon Oasis, "
                    "دبي مارينا → Dubai Marina, وسط مدينة دبي → Downtown Dubai, الخليج التجاري → Business Bay, "
                    "نخلة جميرا → Palm Jumeirah). Keep numbers, AED amounts, and percentages unchanged."
                )},
                {"role": "user", "content": text},
            ],
            temperature=0, max_tokens=400,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        print(f"[ACQAR] translate-to-english error: {e}")
        return text


def grade_relevance(question: str, reply: str) -> int:
    """Asks Groq to rate 1-5 how directly the reply answers the question.
    Used to flag off-topic / drifted responses in the admin panel.
    Returns None on failure so it never breaks the main response."""
    if not reply or not reply.strip():
        return None
    try:
        messages = [
            {"role": "system", "content": (
                "You grade whether an answer addresses a question. "
                "Reply with ONLY a single digit from 1 to 5. "
                "5 = directly and fully answers the question. "
                "3 = partially relevant but misses the actual ask. "
                "1 = completely unrelated to the question."
            )},
            {"role": "user", "content": f"Question: {question}\n\nAnswer: {reply[:2000]}"},
        ]

        def call(model):
            resp = groq_client.chat.completions.create(
                model=model, messages=messages, temperature=0, max_tokens=5,
            )
            return resp.choices[0].message.content.strip()

        try:    raw = call(PRIMARY_MODEL)
        except: raw = call(FALLBACK_MODEL)

        m = re.search(r'[1-5]', raw)
        return int(m.group(0)) if m else None
    except Exception as e:
        print(f"[ACQAR] relevance grading error: {e}")
        return None


def grade_fact_grounding(reply: str, db_context: str) -> str:
    """Flags numeric claims (%, AED, day/month/year figures) in `reply` that
    have no support in `db_context`. Admin-only signal, fire-and-forget."""
    if not reply or not reply.strip():
        return None
    try:
        messages = [
            {"role": "system", "content": (
                "You audit an AI real-estate assistant's reply for fabricated "
                "numbers AND internal contradictions. Given PROVIDED CONTEXT "
                "(the only facts/numbers the model was allowed to use) and "
                "REPLY, list (1) any specific numeric claim in REPLY "
                "(percentages, day/month/year figures, AED amounts) that is "
                "NOT traceable to PROVIDED CONTEXT — this includes any "
                "minimum investment, return %, fee, or AUM figure attributed "
                "to a named third-party commercial platform (e.g. "
                "Smartcrowd, Stake, Prypco) unless that exact figure appears "
                "in PROVIDED CONTEXT — and (2) any case where "
                "same benchmark or figure (e.g. two different 'Dubai average "
                "yield' numbers, or a yield/price figure in one section that "
                "contradicts a figure for the same area/metric in another "
                "section). Reply with ONLY 'CLEAN' if none, or a short "
                "comma-separated list of the unsupported or contradictory "
                "figures."
            )},
            {"role": "user", "content": f"PROVIDED CONTEXT:\n{db_context[:2000]}\n\nREPLY:\n{reply[:2000]}"},
        
        ]
        resp = groq_client.chat.completions.create(
            model=FALLBACK_MODEL, messages=messages, temperature=0, max_tokens=100,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        print(f"[ACQAR] grounding check error: {e}")
        return None
def _fix_unescaped_newlines(s: str) -> str:
    result, in_str, escaped = [], False, False
    for ch in s:
        if escaped: result.append(ch); escaped = False; continue
        if ch == "\\" and in_str: result.append(ch); escaped = True; continue
        if ch == '"': in_str = not in_str; result.append(ch); continue
        if in_str:
            if ch == "\n": result.append("\\n"); continue
            if ch == "\r": result.append("\\r"); continue
            if ch == "\t": result.append("\\t"); continue
        result.append(ch)
    return "".join(result)


def extract_json(raw: str) -> dict:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?", "", raw); raw = re.sub(r"```$", "", raw); raw = raw.strip()
    for attempt in [raw, _fix_unescaped_newlines(raw)]:
        try: return json.loads(attempt)
        except: pass
    match = re.search(r'\{.*\}', raw, re.DOTALL)
    if match:
        for attempt in [match.group(0), _fix_unescaped_newlines(match.group(0))]:
            try: return json.loads(attempt)
            except: pass
    return {"summary": "", "reply": raw, "charts": [], "insight": ""}



def _coerce_text(v) -> str:
    """LLM sometimes returns 'reply'/'summary'/'insight' as a list of
    strings instead of one string — normalize either shape to plain text."""
    if v is None:
        return ""
    if isinstance(v, list):
        return "\n".join(str(x) for x in v if x)
    return str(v).strip()


def _looks_truncated(text: str) -> bool:
    """Flags a reply that ends mid-sentence — e.g. the model cut off before
    finishing its JSON, or a partial completion slipped through
    extract_json's regex fallback. Not a rewrite/retry — just a visible
    flag so an unfinished answer never ships silently."""
    t = (text or "").rstrip()
    return bool(t) and not t.endswith((".", "!", "?", ":", "؟", "**", "|", ")"))

def _strip_dangling_fragment(text: str) -> str:
    """Occasionally the LLM leaves a short orphaned word/fragment on its own
    trailing line with no terminal punctuation (e.g. a truncated 'Because'
    with nothing after it) — strip only that exact pattern, not ordinary
    short lines, headers, or bullets."""
    if not text:
        return text
    lines = text.rstrip().split("\n")
    if len(lines) >= 2:
        last = lines[-1].strip()
        if last and len(last.split()) <= 3 \
                and not last.endswith((".", "!", "?", ":", "؟")) \
                and not last.startswith(("•", "-", "#", "✦", "⚠️", "|")):
            return "\n".join(lines[:-1]).rstrip()
    return text

def get_area_id(msg_lower: str):
    best = None  # (position, -length, aid, kw)
    for kw in AREA_ID_MAP:
        pattern = r'\b' + re.escape(kw.rstrip('s')) + r's?\b'
        m = re.search(pattern, msg_lower)
        if m:
            cand = (m.start(), -len(kw), AREA_ID_MAP[kw], kw)
            if best is None or cand < best:
                best = cand
    if best:
        return best[2], best[3]
    return None, None


def _is_reasonable_match(term: str, pname: str) -> bool:
    """Rejects a match where a multi-word junk phrase only coincidentally
    covers a small fraction of a much longer, unrelated project name —
    e.g. a phrase like 'hills bedroom price' loosely hitting an unrelated
    project. Single-word terms are always trusted since they're most
    likely the actual project name the user typed."""
    if " " not in term:
        return True
    term_len = len(term.replace(" ", ""))
    name_len = len(pname.replace(" ", ""))
    if name_len == 0:
        return False
    return (term_len / name_len) >= 0.35


def _project_name_plausible(project_name: str, user_message_lower: str) -> bool:
    """Guards against silently overriding a correctly-detected literal area
    with a low-confidence project match. Requires at least one distinctive
    word (4+ letters) from the matched project name to literally appear in
    what the user typed — a match found only via a junk multi-word search
    phrase won't satisfy this and the override is skipped."""
    name_words = [w.lower() for w in re.findall(r"[A-Za-z]{4,}", project_name)]
    return any(w in user_message_lower for w in name_words)


def get_project_match(msg: str, min_words: int = 1):
   
    
    try:
        raw_words = [w for w in re.findall(r"[A-Za-z0-9][A-Za-z0-9']{0,}", msg) if w.lower() not in
                 ("the", "and", "for", "sale", "villa", "apartment", "this", "property", "with")]

        NOISE_WORDS = {
            "sq", "ft", "sqft", "sqm", "m2", "bedroom", "bedrooms", "br",
            "bhk", "price", "cost", "worth", "value",
        }
        DEVELOPER_NOISE_WORDS = {
            "damac", "emaar", "sobha", "nakheel", "meraas", "azizi", "danube",
            "binghatti", "ellington", "select", "group", "properties", "developments",
        }
        COMMON_PROJECT_WORDS = {
            "hills", "gardens", "residences", "towers", "park", "views",
            "heights", "islands", "village", "estate", "lakes",
        }

        words = [w for w in raw_words if not w.isdigit()
                 and w.lower() not in NOISE_WORDS
                 and w.lower() not in DEVELOPER_NOISE_WORDS
                 and w.lower() not in COMMON_PROJECT_WORDS]
        
        candidates = set()
        for n in (3, 2, 1):
            if n < min_words: continue
            for i in range(len(words) - n + 1):
                candidates.add(" ".join(words[i:i+n]))

        # PRIORITY 1: standalone content words, in the order they appeared
        # in the message. A project name (e.g. "Odara") is usually a single
        # distinctive word — it must never be crowded out by longer
        # multi-word junk phrases just because those are longer strings.
        non_alias_words, alias_words = [], []
        for w in words:
            if len(w) < 4: continue
            if w in non_alias_words or w in alias_words: continue
            if w.lower() in AREA_ID_MAP:
                alias_words.append(w)
            else:
                non_alias_words.append(w)

        terms = (non_alias_words + alias_words)[:6]

        # PRIORITY 2: fill any remaining slots with longer multi-word
        # phrases, longest first (previous behavior, now a fallback only).
        if len(terms) < 6:
            for term in sorted(candidates, key=len, reverse=True):
                if len(term) < 4: continue
                if term.lower() in AREA_ID_MAP: continue
                if term in terms: continue
                terms.append(term)
                if len(terms) >= 6: break

        if not terms:
            return None, None

        def fetch(term):
            return term, supabase.table("avm").select("project_name_en, area_id") \
                .ilike("project_name_en", f"%{term}%").order("project_name_en").limit(5).execute()

        with ThreadPoolExecutor(max_workers=len(terms)) as ex:
            results = list(ex.map(fetch, terms))

        results_by_term = dict(results)
        # Iterate terms IN PRIORITY ORDER (single content words first) so a
        # match on the real project name always wins over a coincidental
        # match on a junk multi-word phrase, regardless of dict ordering.
        for term in terms:
            res = results_by_term[term]
            for row in (res.data or []):
                pname = row.get("project_name_en") or ""
                idx = pname.lower().find(term.lower())
                if idx == -1: continue
                tail = pname[idx + len(term): idx + len(term) + 3]
                if re.match(r'\s*\d', tail): continue
                if not _is_reasonable_match(term, pname): continue
                return row["area_id"], pname
        return None, None
    except Exception as e:
        print(f"[ACQAR] get_project_match error: {e}")
        return None, None


def get_all_area_ids(msg_lower: str) -> list:
    found, seen = [], set()
    matched_spans = []  # character ranges already claimed by a longer keyword

    for kw in sorted(AREA_ID_MAP, key=len, reverse=True):
        pattern = r'\b' + re.escape(kw.rstrip('s')) + r's?\b'
        for m in re.finditer(pattern, msg_lower):
            idx, end = m.start(), m.end()
            overlaps = any(idx < s_end and end > s_start for s_start, s_end in matched_spans)
            if not overlaps:
                aid = AREA_ID_MAP[kw]
                if aid not in seen:
                    found.append((aid, kw))
                    seen.add(aid)
                matched_spans.append((idx, end))
                break

    return found






def find_areas_in_reply(text_lower: str) -> list:
    """Same anti-collision logic as get_all_area_ids, but returns
    (position, area_id, area_name) sorted by where each area is first
    mentioned in the text. A shorter alias (e.g. 'jumeirah') that falls
    entirely inside an already-claimed longer match (e.g. 'palm jumeirah')
    is NOT counted as a separate area."""
    found = []
    seen_ids = set()
    matched_spans = []

    for area_name in sorted(AREA_ID_MAP, key=len, reverse=True):
        area_id_val = AREA_ID_MAP[area_name]
        if area_id_val in seen_ids:
            continue
        idx = text_lower.find(area_name)
        while idx != -1:
            end = idx + len(area_name)
            overlaps = any(idx < s_end and end > s_start for s_start, s_end in matched_spans)
            if not overlaps:
                found.append((idx, area_id_val, area_name))
                seen_ids.add(area_id_val)
                matched_spans.append((idx, end))
                break
            idx = text_lower.find(area_name, idx + 1)

    found.sort(key=lambda x: x[0])
    return found
def get_lifestyle_areas(msg_lower: str) -> list:
    scores = defaultdict(int)
    for kw, aids in sorted(LIFESTYLE_AREA_MAP.items(), key=lambda x: -len(x[0])):
        if kw in msg_lower:
            for rank, aid in enumerate(aids): scores[aid] += (5 - rank)
    return sorted(scores, key=lambda x: -scores[x])[:4]



def call_groq_plain(user_message: str) -> str:
    """Last-resort fallback when both PRIMARY_MODEL and FALLBACK_MODEL refuse
    the full prompt (near-instant, empty completion — a content-refusal
    signature, not a token-limit issue). Strips db_context and the elaborate
    system prompt, and drops response_format=json_object so a refusal comes
    back as plain text instead of a hard validation error."""
    resp = groq_client.chat.completions.create(
        model=FALLBACK_MODEL,
        messages=[
            {"role": "system", "content": (
                "You are a helpful Dubai real-estate assistant. Answer the "
                "question in plain, neutral language, under 200 words. "
                "General guidance only — no specific legal citations, no "
                "specific percentages or AED figures unless you're certain "
                "of them."
            )},
            {"role": "user", "content": user_message},
        ],
        temperature=0.2,
        max_tokens=500,
        # no response_format here — plain text output
    )
    text = resp.choices[0].message.content.strip()
    return json.dumps({"summary": "", "reply": text, "charts": [], "insight": ""})


def detect_nationality(msg_lower: str):
    for nat in NATIONALITY_KEYWORDS:
        if nat in msg_lower:
            return nat
    return None


def fetch_areas_by_nationality(nationality: str, limit: int = 6) -> list:
    """Ranks areas by real buyer_nationalities % — pulled from Supabase,
    works for any nationality already present in the data."""
    try:
        res = supabase.table("area_intelligence").select(
            "area_id, area_name_en, buyer_nationalities, investment_score, "
            "gross_yield_pct, truvalu_psm, price_trend_pct, parks_info"
        ).not_.is_("buyer_nationalities", "null").execute()
        scored = []
        for r in (res.data or []):
            for n in (r.get("buyer_nationalities") or []):
                if nationality in (n.get("name") or "").lower():
                    scored.append((float(n.get("pct") or 0), r["area_id"]))
                    break
        scored.sort(key=lambda x: -x[0])
        return [aid for _, aid in scored[:limit]]
    except Exception as e:
        print(f"[ACQAR] fetch_areas_by_nationality error: {e}")
        return []


def extract_commute_reference(msg_lower: str):
    """Detects '15 to 20 minutes from <ANY AREA>' or '20 minutes from <ANY AREA>'.
    Resolved dynamically against AREA_ID_MAP — works for any of the ~100 areas."""
    m = COMMUTE_PATTERN.search(msg_lower)
    if m:
        lo, hi, ref_text = int(m.group(1)), int(m.group(2)), m.group(3).strip()
        span = m.span(3)
    else:
        m2 = COMMUTE_PATTERN_SINGLE.search(msg_lower)
        if not m2:
            return None
        val = int(m2.group(1))
        lo, hi, ref_text = max(0, val - 5), val + 5, m2.group(2).strip()
        span = m2.span(2)

    ref_id, ref_kw = get_area_id(ref_text)
    if ref_id is None:
        return None

    return {
        "min": lo, "max": hi,
        "ref_area_id": ref_id,
        "ref_area_name": preferred_name(ref_id, ref_kw),
        "span": span,
    }


def strip_commute_reference(msg_lower: str, commute_info) -> str:
    if not commute_info:
        return msg_lower
    start, end = commute_info["span"]
    return msg_lower[:start] + (" " * (end - start)) + msg_lower[end:]


def haversine_km(lat1, lon1, lat2, lon2) -> float:
    R = 6371
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1) * math.cos(p2) * math.sin(dl/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


def estimate_drive_minutes(area_id_a: int, area_id_b: int):
    """Works for ANY two areas with coordinates — no manual pair entry needed."""
    if area_id_a == area_id_b:
        return 5
    c1 = AREA_COORDINATES.get(area_id_a)
    c2 = AREA_COORDINATES.get(area_id_b)
    if not c1 or not c2:
        return None
    dist_km = haversine_km(c1[0], c1[1], c2[0], c2[1]) * 1.35
    return round((dist_km / 38) * 60)


def filter_by_commute(area_ids: list, commute_info: dict) -> list:
    """Ranks/filters candidate areas by proximity to the reference area,
    calculated live for any reference area — not looked up from a fixed table."""
    if not commute_info:
        return area_ids
    ref_id = commute_info["ref_area_id"]
    lo, hi = commute_info["min"] - 5, commute_info["max"] + 5

    scored = []
    for aid in area_ids:
        mins = estimate_drive_minutes(ref_id, aid)
        if mins is None:
            scored.append((2, 999, aid))
        elif lo <= mins <= hi:
            scored.append((0, mins, aid))
        else:
            scored.append((1, mins, aid))

    scored.sort(key=lambda x: (x[0], x[1]))
    filtered = [aid for score, _, aid in scored if score == 0]
    return filtered[:6] if filtered else [aid for _, _, aid in scored][:6]


# ── CHANGE 1: EMI detection added to extract_budget ──────────────
def extract_budget(msg: str):
    mc = msg.lower().replace(",", "").replace("aed", "").strip()
    if any(w in mc for w in ["bought", "purchased", "acquired", "paid for", "years ago", "through a"]):
        return None

    # Detect monthly EMI/salary → estimate property budget
    emi_match = re.search(r'emi\s+(?:of\s+)?(?:aed\s+)?(\d+)', mc)
    if not emi_match:
        emi_match = re.search(r'(\d+)\s*/?\s*month', mc)
    if not emi_match:
        emi_match = re.search(r'salary\s+(?:is\s+|of\s+)?(?:aed\s+)?(\d+)', mc)
    if emi_match:
        emi = float(emi_match.group(1).replace(",", ""))
        if 2000 < emi < 150000:  # sanity: monthly figure
            return round(emi * 150)  # ~12yr mortgage estimate

    for pat in [r'(\d+\.?\d*)\s*(?:million|m)\b', r'(\d{7,})', r'(\d+\.?\d*)\s*k\b']:
        m = re.search(pat, mc)
        if m:
            val = float(m.group(1)); tail = mc[m.start():m.end()+2]
            if "k" in tail: return val * 1_000
            if val < 1000:  return val * 1_000_000
            return val
    return None


def extract_foreign_currency_amount(msg: str):
    """Detects a bare USD figure like '$1M', '$1 million', 'USD 1M' and
    returns {'usd':..., 'aed_approx':...} so downstream prompts can state
    the conversion instead of ignoring it. Uses a fixed approximate peg
    (AED ~3.6725/USD) — always presented as an approximation, never as a
    verified figure."""
    m = re.search(r'(?:\$|usd\s*)(\d+\.?\d*)\s*(million|m)?\b', msg.lower())
    if not m:
        return None
    val = float(m.group(1))
    if m.group(2):
        val *= 1_000_000
    return {"usd": val, "aed_approx": round(val * 3.6725)}


def extract_bedrooms(msg: str):
    m = msg.lower()
    for pat, label in [
        (r'\bstudio\b',"Studio"),
        (r'\b1[\s-]*(?:br|beds?|bedrooms?|bhk)\b',"1 BR"),
        (r'\b2[\s-]*(?:br|beds?|bedrooms?|bhk)\b',"2 BR"),
        (r'\b3[\s-]*(?:br|beds?|bedrooms?|bhk)\b',"3 BR"),
        (r'\b4[\s-]*(?:br|beds?|bedrooms?|bhk)\b',"4 BR"),
        (r'\bone\s*bed(?:room)?\b',"1 BR"),
        (r'\btwo\s*bed(?:room)?\b',"2 BR"),
        (r'\bthree\s*bed(?:room)?\b',"3 BR"),
    ]:
        if re.search(pat, m): return label
    return None



TRANSACTION_INTENT_KEYWORDS = [
    "recent transaction", "recent transactions", "recent sales", "recent sale",
    "show transactions", "show me transactions", "transaction history",
    "latest transactions", "latest sales", "sold recently", "last sold",
    "transactions in", "sales in", "closed sales", "recent closed sales",
]

def is_transactions_only_query(msg_lower: str) -> bool:
    return any(kw in msg_lower for kw in TRANSACTION_INTENT_KEYWORDS)


def extract_property_type(msg: str):
    m = msg.lower()
    if re.search(r'\btown\s*-?\s*house(s)?\b|\bth\b', m):
        return "Townhouse"
    if re.search(r'\bvilla(s)?\b', m):
        return "Villa"
    if re.search(r'\bapartment(s)?\b|\bflat(s)?\b|\bunit\b', m):
        return "Apartment"
    return None
def extract_sqft(msg: str):
    """Detects a stated unit size like '2100 sq ft' / '2100 sqft' / '195 sqm'.
    Returns size in sqft (converts sqm -> sqft when needed)."""
    m = msg.lower().replace(",", "")
    sqft_match = re.search(r'(\d{3,6})\s*(?:sq\.?\s*ft|sqft|square\s*feet)', m)
    if sqft_match:
        return float(sqft_match.group(1))
    sqm_match = re.search(r'(\d{2,6})\s*(?:sq\.?\s*m|sqm|square\s*met(?:er|re)s?)', m)
    if sqm_match:
        return round(float(sqm_match.group(1)) * 10.7639, 0)
    return None

def is_vague(msg_lower: str, area_id, is_lifestyle: bool) -> bool:
    if area_id or is_lifestyle: return False
    if any(k in msg_lower for k in NO_DP_KEYWORDS): return False
    if any(k in msg_lower for k in FINANCING_KEYWORDS): return False
    # Seller without area → ask which area
    PERSONAL_SELLER_MARKERS = [
        "my apartment", "my property", "my villa", "my unit", "my flat",
        "i own", "i have a property", "i want to sell", "i'm looking to sell",
        "should i sell my", "want to sell my",
    ]
    MARKET_QUESTION_MARKERS = [
        "people", "which area", "where are", "most today", "most this",
        "highest volume", "most transactions", "most active",
    ]
    is_personal_seller = any(k in msg_lower for k in PERSONAL_SELLER_MARKERS)
    is_market_question = any(k in msg_lower for k in MARKET_QUESTION_MARKERS)
    is_seller = any(k in msg_lower for k in SELLER_KEYWORDS) and is_personal_seller and not is_market_question
    has_specific = any(w in msg_lower for w in [
        "yield","price","psm","sqm","trend","compare","vs","score",
        "invest","return","roi","catalyst","developer","aed","bedroom","studio","villa","apartment",
        "commission","fee","broker","agent","process","how to","documents","noc","visa",
    ])
    if is_seller and not has_specific: return True
    has_vague = any(p in msg_lower for p in VAGUE_PATTERNS)
    return has_vague and not has_specific and len(msg_lower.split()) < 20


def median_val(values: list):
    if not values: return None
    s = sorted(values); n = len(s); mid = n // 2
    return round((s[mid-1]+s[mid])/2 if n%2==0 else s[mid], 0)


# Rough sqm assumptions per unit type — used only for a budget sanity-check
# when we don't have area+bedroom-specific median price data on hand.
TYPICAL_UNIT_SQM = {"Studio": 37, "1 BR": 65, "2 BR": 102, "3 BR": 140}

def check_budget_feasibility(budget: float, bedrooms: str, areas: list) -> str:
    """Returns a warning string if the budget looks unrealistic for the
    requested (or smallest reasonable default) bedroom type across the
    candidate areas, else None. Rough estimate — labeled as such."""
    if not budget or not areas:
        return None
    target = bedrooms or "1 BR"
    sqm = TYPICAL_UNIT_SQM.get(target)
    if not sqm:
        return None
    cheapest_psm = min((a.get("truvalu_psm") for a in areas if a.get("truvalu_psm")), default=None)
    if not cheapest_psm:
        return None
    est_min_price = cheapest_psm * sqm
    if budget < est_min_price * 0.85:
        return (
            f"Heads up: {fmt_aed(budget)} is below the typical entry price for a {target} "
            f"even in the most affordable areas here (roughly {fmt_aed(est_min_price)}+ estimated). "
            f"A smaller unit type, or a slightly higher budget, is more realistic."
        )
    return None

def resolve_bedroom_filter(bedrooms: str):
    """Never silently substitute a bedroom type the user didn't ask for.
    Returns (bedrooms_or_None, disclosure_line_or_None)."""
    if bedrooms:
        return bedrooms, None
    return None, "You didn't specify a unit size, so figures below span multiple bedroom types."

def bedroom_display_label(bedrooms: str) -> str:
    """Single source of truth for how an unset bedroom size is described
    across summary/insight/reply — prevents the three builders from
    drifting to different silent defaults."""
    return bedrooms if bedrooms else "across unit types"

def pick_target_bedroom(bedrooms: str, bmed: dict, priority_order=("Studio", "1 BR", "2 BR", "3 BR", "4 BR")):
    """Never silently substitute a bedroom type the user asked for.
    - If the user named a size, use it ONLY if we have data for it — return
      None (not a different size) if we don't, so callers can disclose the gap.
    - If the user didn't name a size, fall back to the first type with data."""
    if bedrooms:
        return bedrooms if bedrooms in bmed else None
    for br in priority_order:
        if br in bmed:
            return br
    return next(iter(bmed), None)
def preferred_name(area_id: int, fallback: str = "") -> str:
    return AREA_DISPLAY_NAMES.get(area_id, fallback.title() if fallback else str(area_id))

def pick_hero_area(context_data: dict) -> dict:
    """Returns intel/stats/cats/hist for whichever area should drive the widget cards."""
    if context_data.get("area_intelligence") and context_data["area_intelligence"].get("area_name_en"):
        return {
            "intel": context_data["area_intelligence"],
            "stats": context_data.get("transaction_stats", {}),
            "cats":  context_data.get("area_catalysts", []),
            "hist":  context_data.get("price_history_by_year", {}),
        }

    lifestyle_keys = [k for k in context_data if k.startswith("lifestyle_")]
    if lifestyle_keys:
        best_key = max(
            lifestyle_keys,
            key=lambda k: float((context_data[k].get("area_intelligence") or {}).get("investment_score") or 0)
        )
        sub = context_data[best_key]
        intel_sub = sub.get("area_intelligence") or {}
        name = intel_sub.get("area_name_en") or sub.get("detected_area", "")
        if name:
            return {
                "intel": {**intel_sub, "area_name_en": name},
                "stats": sub.get("transaction_stats", {}),
                "cats":  sub.get("area_catalysts", []),
                "hist":  sub.get("price_history_by_year", {}),
            }

    if context_data.get("budget_search_areas"):
        areas = context_data["budget_search_areas"]
        if areas and areas[0].get("area_name_en"):
            top = areas[0]
            return {
                "intel": {
                    "area_name_en":     top.get("area_name_en"),
                    "truvalu_psm":      top.get("truvalu_psm"),
                    "gross_yield_pct":  top.get("gross_yield_pct"),
                    "investment_score": top.get("investment_score"),
                    "verdict":          top.get("verdict"),
                    "price_trend_pct":  top.get("price_trend_pct"),
                },
                "stats": {}, "cats": [], "hist": {},
            }

    for key in ("top_yield_areas", "top_areas", "dubai_market_context"):
        data = context_data.get(key)
        if data and data[0].get("area_name_en"):
            top = data[0]
            return {
                "intel": {
                    "area_name_en":     top.get("area_name_en"),
                    "truvalu_psm":      top.get("truvalu_psm"),
                    "gross_yield_pct":  top.get("gross_yield_pct"),
                    "investment_score": top.get("investment_score"),
                    "verdict":          top.get("verdict"),
                    "price_trend_pct":  top.get("price_trend_pct"),
                },
                "stats": {}, "cats": [], "hist": {},
            }

    return {"intel": {}, "stats": {}, "cats": [], "hist": {}}


def fmt_aed(v) -> str:
    if v is None: return ""
    v = float(v)
    if v >= 1_000_000: return f"AED {v/1_000_000:.2f}M"
    if v >= 1_000:     return f"AED {int(v):,}"
    return f"AED {v:.0f}"


def fmt_psm(v) -> str:
    if v is None: return ""
    return f"AED {int(float(v)):,}/sqm"


def area_to_slug(area_name: str) -> str:
    slug = area_name.lower().strip()
    slug = re.sub(r'\s+', '-', slug)
    slug = re.sub(r'[^a-z0-9-]', '', slug)
    return slug



def sanitize_yield(y, cap: float = 30.0):
    """Sparse/bad price-per-sqm records occasionally produce impossible
    gross yields (>1000%). Anything outside a sane range is treated as
    unreliable rather than surfaced as a real number."""
    if y is None:
        return None
    try:
        v = float(y)
    except (TypeError, ValueError):
        return None
    return v if 0 < v <= cap else None

MATURE_AREA_YOY_TREND_CAP_PCT = 18.0  # a genuine single-year move beyond this,
# in a built-out/established area, is more likely a comparable-set artifact
# (mixed unit types/segments between years) than a real market swing.

def _area_is_mature(intel: dict) -> bool:
    if not intel:
        return False
    completion = str(intel.get("completion_rate") or "")
    m = re.search(r'(\d+)', completion)
    is_built_out = bool(m) and int(m.group(1)) >= 90
    year_est = intel.get("year_established")
    is_established = bool(year_est) and (date.today().year - int(year_est)) >= 10
    return is_built_out or is_established


def _sanity_bound_trend(trend_pct, intel: dict):
    """Returns (safe_value_or_None, flagged_bool). Never overwrites — just
    withholds an implausible number rather than presenting it as fact."""
    if trend_pct is None:
        return None, False
    if _area_is_mature(intel) and abs(float(trend_pct)) > MATURE_AREA_YOY_TREND_CAP_PCT:
        return None, True
    return trend_pct, False
# ─────────────────────────────────────────────────────────────────
# SUPABASE FETCHERS
# ─────────────────────────────────────────────────────────────────
def fetch_area_intelligence(area_id: int):
    try:
        res = supabase.table("area_intelligence").select(
            "area_name_en, truvalu_psm, gross_yield_pct, investment_score, verdict, "
            "catalyst_score, absorption_rate_pct, price_trend_pct, ranking_rank, "
            "zone_type, master_developer, completion_rate, residential_units, "
            "parks_info, retail_info, active_project_count, buyer_nationalities, "
            "key_developers, active_project_names, tx_7d, tx_7d_delta_pct, "
            "distress_pct, year_established"
        ).eq("area_id", area_id).limit(1).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        print(f"[ACQAR] fetch_area_intelligence error (area_id={area_id}): {e}")
        return None



def fetch_area_stats(area_id: int, project_name: str = None, property_type: str = None) -> list:
    """Returns pre-aggregated rows from area_price_stats RPC — one row per
    bedroom bucket plus one 'ALL' row — computed over the FULL matching
    dataset in SQL, not a row-limited sample. Each row has: bucket,
    txn_count, median_worth, avg_worth, avg_psm, min_psm, max_psm."""
    try:
        res = supabase.rpc("area_price_stats", {
            "p_area_id": area_id,
            "p_project_name": project_name,
            "p_property_type": property_type,
        }).execute()
        return res.data or []
    except Exception as e:
        print(f"[ACQAR] fetch_area_stats error (area_id={area_id}): {e}")
        return []


def fetch_area_year_trend(area_id: int, project_name: str = None) -> list:
    """Builds a multi-year price trend. When no project filter is given,
    aggregates per-year averages IN SQL via RPC — this guarantees every
    year is represented regardless of how skewed the volume is toward the
    most recent year (e.g. JVC had 11,306 sales in 2026 alone, which used
    to consume the entire row-limit and silently erase 2021-2025 history).
    Project-filtered lookups still use the raw-row path since the RPC
    doesn't take a project filter."""
    try:
        if project_name:
            q = supabase.table("avm").select("price_per_sqm, sale_year") \
                .eq("area_id", area_id).not_.is_("sale_year", "null") \
                .not_.is_("price_per_sqm", "null") \
                .ilike("project_name_en", f"%{project_name}%")
            res = q.order("sale_year", desc=True).limit(3000).execute()
            return res.data or []

        res = supabase.rpc("yearly_avg_psm_by_area", {"p_area_id": area_id}).execute()
        return [
            {"sale_year": r["sale_year"], "price_per_sqm": r["avg_psm"]}
            for r in (res.data or [])
            if r.get("sale_year") is not None and r.get("avg_psm") is not None
        ]
    except Exception as e:
        print(f"[ACQAR] fetch_area_year_trend error (area_id={area_id}): {e}")
        return []
def fetch_price_history(area_id: int) -> list:
    try:
        res = supabase.table("price_history_manual").select(
            "sale_year, sale_month, psf, cnt"
        ).eq("area_id", area_id).order("sale_year", desc=False).order("sale_month", desc=False).limit(36).execute()
        return res.data or []
    except Exception as e:
        print(f"[ACQAR] fetch_price_history error (area_id={area_id}): {e}")
        return []


def fetch_area_catalysts(area_id: int) -> list:
    try:
        today = date.today().isoformat()
        res = supabase.table("area_catalysts").select(
            "catalyst_type, name, description, expected_date, confidence, status"
        ).eq("area_id", area_id).eq("status", "active").gte("expected_date", today).order("expected_date", desc=False).limit(5).execute()
        return res.data or []
    except Exception as e:
        print(f"[ACQAR] fetch_area_catalysts error (area_id={area_id}): {e}")
        return []


def fetch_developer_track_records(developer_names: list) -> list:
    try:
        clean = [d for d in developer_names if d and d != "Various"]
        if not clean: return []
        res = supabase.table("developer_track_records").select(
            "developer_name, on_time_pct, avg_delay_months, total_projects, delivered_units, star_rating, market_segment, notes"
        ).in_("developer_name", clean).execute()
        return res.data or []
    except Exception as e:
        print(f"[ACQAR] fetch_developer_track_records error (developers={developer_names}): {e}")
        return []


def fetch_area_shock_impacts(zone_type: str) -> list:
    try:
        if not zone_type: return []
        res = supabase.table("area_shock_impacts").select(
            "event_name, event_period, price_impact_pct, recovery_months, recovery_driver, notes"
        ).eq("zone_type", zone_type).execute()
        return res.data or []
    except Exception as e:
        print(f"[ACQAR] fetch_area_shock_impacts error (zone_type={zone_type}): {e}")
        return []


def fetch_top_areas_intelligence(limit: int = 20) -> list:
    try:
        res = supabase.table("area_intelligence").select(
            "area_name_en, truvalu_psm, gross_yield_pct, investment_score, verdict, ranking_rank, price_trend_pct, catalyst_score, zone_type"
        ).not_.is_("investment_score", "null").order("investment_score", desc=True).limit(limit).execute()
        for r in (res.data or []):
            r["gross_yield_pct"] = sanitize_yield(r.get("gross_yield_pct"))
        return res.data or []
    except: return []


def fetch_top_areas_by_volume(limit: int = 10) -> list:
    try:
        res = supabase.table("area_intelligence").select(
            "area_name_en, truvalu_psm, gross_yield_pct, investment_score, verdict, "
            "price_trend_pct, tx_7d, tx_7d_delta_pct"
        ).not_.is_("tx_7d", "null").order("tx_7d", desc=True).limit(limit).execute()
        return res.data or []
    except:
        return []

def fetch_top_yield_areas() -> list:
    try:
        res = supabase.table("area_intelligence").select(
            "area_name_en, gross_yield_pct, investment_score, verdict, truvalu_psm, price_trend_pct"
        ).not_.is_("gross_yield_pct", "null").order("gross_yield_pct", desc=True).limit(30).execute()
        clean = []
        for r in (res.data or []):
            y = sanitize_yield(r.get("gross_yield_pct"))
            if y is None:
                continue
            r["gross_yield_pct"] = y
            clean.append(r)
        return clean[:10]
    except: return []


def fetch_dld_projects(area_id: int, project_name: str = None) -> list:
    try:
        res = supabase.rpc("top_projects_by_area", {"p_area_id": area_id, "p_limit": 20}).execute()
        rows = res.data or []
        if project_name:
            rows = [r for r in rows if project_name.upper() in (r.get("project_name_en") or "").upper()]
        return [(r["project_name_en"], r["cnt"]) for r in rows[:5]]
    except Exception as e:
        print(f"[ACQAR] fetch_dld_projects error (area_id={area_id}): {e}")
        return []



_SHARED_ZONE_FILTER_CACHE = {}

def get_project_filter_for_shared_zone(area_id: int, detected_keyword: str) -> str:
    try:
        res = supabase.rpc("distinct_projects_by_area", {"p_area_id": area_id}).execute()
        rows = res.data or []
        names = {r["project_name_en"] for r in rows if r.get("project_name_en")}
        if len(names) <= 1:
            return None
        kw_clean = detected_keyword.upper().strip()
        matches = [n for n in names if kw_clean in n.upper()]
        if matches and len(matches) < len(names):
            return kw_clean
        return None
    except Exception as e:
        print(f"[ACQAR] get_project_filter_for_shared_zone error (area_id={area_id}): {e}")
        return None
    
def get_project_filter_for_shared_zone_cached(area_id: int, detected_keyword: str):
    cache_key = (area_id, detected_keyword.lower().strip())
    if cache_key in _SHARED_ZONE_FILTER_CACHE:
        return _SHARED_ZONE_FILTER_CACHE[cache_key]
    result = get_project_filter_for_shared_zone(area_id, detected_keyword)
    _SHARED_ZONE_FILTER_CACHE[cache_key] = result
    return result

def fetch_recent_transactions(area_id: int, limit: int = 10, project_name: str = None, property_type: str = None) -> list:
    try:
        q = supabase.table("avm").select(
            "price_per_sqm, actual_worth, rooms_en, procedure_area, project_name_en, sale_year, sale_month"
        ).eq("area_id", area_id).not_.is_("sale_year", "null")
        if project_name:
            q = q.ilike("project_name_en", f"%{project_name}%")
        if property_type:
            q = q.ilike("property_type_en", f"%{property_type}%")
        res = q.order("sale_year", desc=True).order("sale_month", desc=True).limit(limit).execute()
        return res.data or []
    except Exception as e:
        print(f"[ACQAR] fetch_recent_transactions error (area_id={area_id}): {e}")
        return []

def fetch_rental_stats(area_name: str) -> dict:
    try:
        res = supabase.table("rentals").select(
            "ANNUAL_AMOUNT,PROP_TYPE_EN,PROP_SUB_TYPE_EN,ROOMS,USAGE_EN,VERSION_EN,REGISTRATION_DATE"
        ).ilike("AREA_EN", f"%{area_name}%").order("REGISTRATION_DATE", desc=True).limit(500).execute()
        rows = res.data or []
        if not rows: return {}

        rents = [float(r["ANNUAL_AMOUNT"]) for r in rows if r.get("ANNUAL_AMOUNT")]
        by_room = defaultdict(list); by_type = defaultdict(list)
        version_count = defaultdict(int)

        for r in rows:
            amt = r.get("ANNUAL_AMOUNT")
            if not amt: continue
            amt = float(amt)
            label = _room_label(r.get("ROOMS"))
            if label: by_room[label].append(amt)
            ptype = r.get("PROP_SUB_TYPE_EN") or r.get("PROP_TYPE_EN")
            if ptype: by_type[ptype].append(amt)
            if r.get("VERSION_EN"): version_count[r["VERSION_EN"]] += 1

        return {
            "count": len(rows),
            "avg_annual_rent": round(sum(rents)/len(rents), 0) if rents else None,
            "median_annual_rent": median_val(rents),
            "rent_by_bedroom": {
                k: {"avg": round(sum(v)/len(v), 0), "median": median_val(v), "count": len(v)}
                for k, v in by_room.items() if len(v) >= 2
            },
            "rent_by_type": {k: round(sum(v)/len(v), 0) for k, v in by_type.items() if len(v) >= 2},
            "new_vs_renewed": dict(version_count),
        }
    except Exception as e:
        print(f"[ACQAR] fetch_rental_stats error: {e}")
        return {}

def fetch_rental_stats_for_area(name: str, keyword: str) -> dict:
    for cand in filter(None, [_clean_area_search_term(name), keyword]):
        data = fetch_rental_stats(cand)
        if data: return data
    return {}


async def _run(func, *args):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, func, *args)

async def build_area_context_async(area_id: int, detected_keyword: str, context_data: dict, project_name: str = None, property_type: str = None, bedrooms: str = None):
    name = preferred_name(area_id, detected_keyword)
    context_data["detected_area"] = name
    context_data["area_id"]       = area_id
    if project_name:
        context_data["matched_project_name"] = project_name
    context_data["_searched_project_name"] = project_name

    txn_fetch_limit = 30 if bedrooms else 10
    intel, area_data, history, catalysts, projects, recent_txns_raw, year_trend_rows = await asyncio.gather(
        _run(fetch_area_intelligence, area_id),
        _run(fetch_area_stats, area_id, project_name, property_type),
        _run(fetch_price_history, area_id),
        _run(fetch_area_catalysts, area_id),
        _run(fetch_dld_projects, area_id, project_name),
        _run(fetch_recent_transactions, area_id, txn_fetch_limit, project_name, property_type),
        _run(fetch_area_year_trend, area_id, project_name),
    )

    if bedrooms and recent_txns_raw:
        matched = [t for t in recent_txns_raw if _room_label(t.get("rooms_en")) == bedrooms]
        other   = [t for t in recent_txns_raw if _room_label(t.get("rooms_en")) != bedrooms]
        recent_txns = (matched + other)[:10]
        context_data["recent_transactions_bedroom_matched_count"] = len(matched)
    else:
        recent_txns = recent_txns_raw[:10]
    if property_type and not area_data:
        area_data = await _run(fetch_area_stats, area_id, project_name, None)
        context_data["property_type_fallback_used"] = True

    if recent_txns: context_data["recent_transactions"] = recent_txns

    dld_name = (intel.get("area_name_en") if intel else None) or name
    rental_stats = await _run(fetch_rental_stats_for_area, dld_name, detected_keyword)
    if rental_stats: context_data["rental_stats"] = rental_stats

    dev_records = []; shock_data = []

    if intel:
        devs = intel.get("key_developers") or []; zone = intel.get("zone_type")
        tasks = []
        fd = bool(devs); fs = bool(zone)
        if fd: tasks.append(_run(fetch_developer_track_records, devs))
        if fs: tasks.append(_run(fetch_area_shock_impacts, zone))
        results = await asyncio.gather(*tasks) if tasks else []
        idx = 0
        if fd: dev_records = results[idx] or []; idx += 1
        if fs: shock_data  = results[idx] or []

    if intel:
        # Always prefer the curated display name over Supabase's raw DLD
        # official area name (e.g. "Al Yelayiss 1") when one exists — every
        # reply builder reads intel["area_name_en"] directly, so fixing it
        # once here is the single source of truth instead of patching each
        # builder separately.
        if area_id in AREA_DISPLAY_NAMES:
            intel["area_name_en"] = AREA_DISPLAY_NAMES[area_id]
        intel["gross_yield_pct"] = sanitize_yield(intel.get("gross_yield_pct"))
        safe_trend, flagged = _sanity_bound_trend(intel.get("price_trend_pct"), intel)
        if flagged:
            context_data["price_trend_flagged_implausible"] = True
            context_data["price_trend_raw_value"] = intel.get("price_trend_pct")
        intel["price_trend_pct"] = safe_trend
        context_data["area_intelligence"] = intel
    if dev_records: context_data["developer_track_records"]     = dev_records
    if shock_data:  context_data["historical_shock_resilience"] = shock_data

    if property_type:
        context_data["property_type_filtered"] = bool(area_data)

    # If the user asked about a specific property type, the headline yield
    # shown at the top of the card must reflect that type — not the
    # area-wide blended average across all unit types (mostly apartments).
    if property_type and intel:
        by_type = intel.get("rental_yield_by_unit_type") or {}
        if property_type == "Townhouse":
            matched_key = next((k for k in by_type if "th" in k.lower()), None)
        elif property_type == "Villa":
            matched_key = next((k for k in by_type if "th" not in k.lower() and property_type.lower() not in k.lower() and "br" in k.lower()), None)
        else:
            matched_key = next((k for k in by_type if property_type.lower() in k.lower()), None)
        if matched_key and by_type.get(matched_key):
            intel["gross_yield_pct"] = by_type[matched_key]
            intel["_yield_is_type_specific"] = True
            intel["_yield_source_label"] = matched_key
        else:
            intel["_yield_caveat"] = (
                f"Blended across all unit types — {property_type.lower()}-specific "
                f"yield not separately available"
            )

    if area_data:
        overall = next((r for r in area_data if r["bucket"] == "ALL"), None)
        bedroom_rows = [r for r in area_data if r["bucket"] != "ALL"]

        overall_avg_worth = float(overall["avg_worth"]) if overall and overall.get("avg_worth") else None

        def outlier_ok(med):
            if med is None or overall_avg_worth is None: return True
            return float(med) <= max(20_000_000, 5 * overall_avg_worth)

        bedroom_avg_psm, median_price_by_bedroom = {}, {}
        for r in bedroom_rows:
            if not outlier_ok(r.get("median_worth")): continue
            if r.get("avg_psm") is not None:
                bedroom_avg_psm[r["bucket"]] = round(float(r["avg_psm"]), 0)
            if r.get("median_worth") is not None:
                median_price_by_bedroom[r["bucket"]] = round(float(r["median_worth"]), 0)

        year_map = defaultdict(list)
        for r in year_trend_rows:
            if r.get("sale_year") and r.get("price_per_sqm"):
                year_map[int(r["sale_year"])].append(float(r["price_per_sqm"]))

        context_data["transaction_stats"] = {
            "count":                   int(overall["txn_count"]) if overall else sum(r["txn_count"] for r in bedroom_rows),
            "avg_price_sqm":           round(float(overall["avg_psm"]), 0) if overall and overall.get("avg_psm") else None,
            "min_price_sqm":           round(float(overall["min_psm"]), 0) if overall and overall.get("min_psm") else None,
            "max_price_sqm":           round(float(overall["max_psm"]), 0) if overall and overall.get("max_psm") else None,
            "avg_worth_aed":           round(overall_avg_worth, 0) if overall_avg_worth else None,
            "bedroom_avg_psm":         bedroom_avg_psm,
            "yearly_avg_psm":          {str(k): round(sum(v)/len(v), 0) for k, v in sorted(year_map.items())},
            "median_price_by_bedroom": median_price_by_bedroom,
        }
        # Reconcile the stored area-wide "fair price" benchmark with the
        # live per-bedroom averages just computed, so the headline stat
        # and the bedroom table never contradict each other in the same
        # response. Only overrides when we actually have bedroom-level
        # data — falls back to the stored value otherwise.
        if context_data.get("area_intelligence"):
            stats_ref = context_data["transaction_stats"]
            bpsm_vals = list(stats_ref["bedroom_avg_psm"].values())
            if bpsm_vals:
                context_data["area_intelligence"]["truvalu_psm"] = round(sum(bpsm_vals) / len(bpsm_vals), 0)
            elif stats_ref.get("avg_price_sqm"):
                # No usable bedroom-level breakdown (e.g. villa-only areas
                # after Step 1's outlier guard) — fall back to the live
                # area-wide per-sqm average so the hero card still agrees
                # with the "Area average" figure shown in the report body.
                context_data["area_intelligence"]["truvalu_psm"] = stats_ref["avg_price_sqm"]

    if history:
        year_avg = defaultdict(list)
        for r in history: year_avg[r["sale_year"]].append(r["psf"])
        context_data["price_history_by_year"] = {str(y): round(sum(v)/len(v), 0) for y, v in sorted(year_avg.items())}
    elif context_data.get("transaction_stats", {}).get("yearly_avg_psm"):
        # price_history_manual is empty — fall back to real avm-derived yearly averages
        context_data["price_history_by_year"] = context_data["transaction_stats"]["yearly_avg_psm"]

    # If area_intelligence.price_trend_pct is missing, derive it from real avm-based
    # yearly averages (same-source, consecutive-year comparison — no unit mixing).
    if context_data.get("area_intelligence") and not context_data["area_intelligence"].get("price_trend_pct"):
        yearly = context_data.get("price_history_by_year") or {}
        if len(yearly) >= 2:
            years = sorted(yearly.keys())
            old_v = yearly[years[-2]]
            new_v = yearly[years[-1]]
            if old_v:
                derived_trend = round(((new_v - old_v) / old_v) * 100, 1)
                safe_trend, flagged = _sanity_bound_trend(derived_trend, context_data["area_intelligence"])
                if flagged:
                    context_data["price_trend_flagged_implausible"] = True
                    context_data["price_trend_raw_value"] = derived_trend
                else:
                    context_data["area_intelligence"]["price_trend_pct"] = safe_trend
                    context_data["price_trend_is_derived"] = True

    catalysts = catalysts or []
    context_data["area_catalysts"] = catalysts
    cutoff = (date.today() + timedelta(days=730)).isoformat()
    confirmed_soon = [
        c for c in catalysts
        if (c.get("confidence") or "").lower() == "confirmed"
        and c.get("expected_date") and c["expected_date"] <= cutoff
    ]
    context_data["confirmed_catalyst_count"] = len(confirmed_soon)
    if context_data.get("area_intelligence") is not None:
        total = len(catalysts)
        context_data["area_intelligence"]["catalyst_score"] = (
            round((len(confirmed_soon) / total) * 100) if total else 0
        )
    if projects:  context_data["top_projects"]   = [{"name": p[0], "transactions": p[1]} for p in projects]


# ─────────────────────────────────────────────────────────────────
# REPLY BUILDERS (unchanged from your working version)
# ─────────────────────────────────────────────────────────────────

# ─────────────────────────────────────────────────────────────────
# REPLY BUILDERS (unchanged from your working version)
# ─────────────────────────────────────────────────────────────────

# Shared by build_lifestyle_reply's text output AND the structured
# lifestyle_data payload sent to the UI — one source of truth so both
# surfaces stay in sync instead of duplicating/drifting.
SCHOOL_MAP = {
    "Dubai Hills Estate": "GEMS New Millennium, King's College School Dubai",
    "Jumeirah": "Jumeirah English Speaking School (JESS), Dubai College",
    "Jumeirah Park": "Regent International School, Dubai British School",
    "Arabian Ranches": "JESS Arabian Ranches, Ranches Primary School",
    "Arabian Ranches 2": "JESS Arabian Ranches, Ranches Primary School",
    "Jumeirah Village Circle (JVC)": "JSS International School, Sunmarke School",
    "Palm Jumeirah": "Dubai English Speaking School, GEMS Wellington Primary",
    "Dubai Marina": "Dubai British School, Emirates International School",
}

def build_lifestyle_reply(ctx: dict, bedrooms: str) -> str:
    lines = []
    lifestyle_tags = ctx.get("_lifestyle_tags", [])
    nat_tag = next((t for t in lifestyle_tags if t in NATIONALITY_KEYWORDS), None)
    if nat_tag:
        tag_str = f"{nat_tag.title()} Community Living"
    else:
        priority_tags = [t for t in lifestyle_tags if t in ("family", "school", "kids", "children", "expat", "luxury", "beach", "golf")]
        tag_str = " & ".join(t.title() for t in priority_tags[:2]) + " Living" if priority_tags else "Family Living"

    # Collect lifestyle sub-contexts
    areas = []
    for k, v in ctx.items():
        if k.startswith("lifestyle_") and isinstance(v, dict):
            intel = v.get("area_intelligence") or {}
            stats = v.get("transaction_stats") or {}
            cats  = v.get("area_catalysts") or []
            hist  = v.get("price_history_by_year") or {}
            devs  = v.get("developer_track_records") or []
            name  = intel.get("area_name_en") or v.get("detected_area", "")
            if name:
                areas.append({
                    "name": name, "intel": intel, "stats": stats,
                    "cats": cats, "hist": hist, "devs": devs,
                })

    if not areas:
        return build_general_reply(ctx, bedrooms)

    lines.append(f"📌 DIRECT ANSWER")
    who_str = f"{nat_tag.title()} " if nat_tag else ""
    lines.append(f"• Here are the top {len(areas)} areas where {who_str}families actually live in Dubai — based on real buyer nationality data, school proximity, and DLD closed-sale prices")
    if ctx.get("_commute_ref_name"):
        lines.append(f"• All shortlisted areas are roughly {ctx.get('_commute_min')}–{ctx.get('_commute_max')} min from {ctx.get('_commute_ref_name')}")
    lines.append(f"• All prices are real DLD closed sales — not asking prices, not agent estimates")

    lines.append(f"\n💡 YOUR OPTIONS — {len(areas)} Areas to Consider")

    for i, area in enumerate(areas, 1):
        name  = area["name"]
        intel = area["intel"]
        stats = area["stats"]
        cats  = area["cats"]
        hist  = area["hist"]
        devs  = area["devs"]

        score   = intel.get("investment_score")
        yld     = intel.get("gross_yield_pct")
        verdict = (intel.get("verdict") or "").upper()
        trend   = intel.get("price_trend_pct")
        rank    = intel.get("ranking_rank")
        parks   = intel.get("parks_info") or ""
        retail  = intel.get("retail_info") or ""
        nats    = intel.get("buyer_nationalities") or []
        devlist = intel.get("key_developers") or []
        off_plan= intel.get("active_project_names") or []
        bmed    = stats.get("median_price_by_bedroom") or {}
        bpsm    = stats.get("bedroom_avg_psm") or {}

        lines.append(f"\nOption {i} — {name}")

        # Score + verdict
        if score:
            lines.append(f"• Investment Score: {score}/100" + (f" — Verdict: {verdict}" if verdict else ""))
        

        # Yield
        if yld:
            diff = round(float(yld) - 6.1, 2)
            lines.append(f"• Gross Yield: {yld}% ({'+' if diff>=0 else ''}{diff}% vs Dubai avg 6.1%)")

        # Price trend
        if trend is not None:
            direction = "Rising ↑" if float(trend) > 0 else "Cooling ↓"
            lines.append(f"• Price Trend: {'+' if float(trend)>0 else ''}{trend}% YoY ({direction})")

        # Community
        if parks:  lines.append(f"• Green spaces: {parks}")
        if retail: lines.append(f"• Amenities: {retail}")

       # Nationalities — show the searched nationality % prominently if present
        if nats:
            matched_nat = next((n for n in nats if nat_tag and nat_tag in n.get("name","").lower()), None)
            top2 = nats[:2]
            nat_str = " · ".join([f"{n.get('flag','')} {n.get('name','')} {n.get('pct','')}%" for n in top2])
            lines.append(f"• Who buys here: {nat_str}")
            if matched_nat:
                lines.append(f"• {matched_nat.get('name','')} presence: {matched_nat.get('flag','')} {matched_nat.get('pct','')}% of all buyers — strong community here")

        # Developers
        if devlist:
            lines.append(f"• Key developers: {' · '.join(devlist[:3])}")

        # Off-plan projects
        if off_plan:
            lines.append(f"• Active off-plan projects: {' · '.join(off_plan[:3])}")
        else:
            lines.append(f"• Off-plan: No active launches — secondary market only")

        # Entry prices by bedroom
        target_br, disclosure = resolve_bedroom_filter(bedrooms)
        if disclosure and i == 1:
            lines.append(f"• {disclosure}")
        if bmed:
            med = bmed.get(target_br) or bmed.get("2 BR") or (list(bmed.values())[0] if bmed else None)
            psm = bpsm.get(target_br) or bpsm.get("2 BR") or (list(bpsm.values())[0] if bpsm else None)
            if med:
                line = f"• {target_br} typical price: {fmt_aed(med)} (real DLD closed sale)"
                if psm: line += f" · {fmt_psm(psm)}"
                lines.append(line)
            # Show all bedroom types
            for br in ["2 BR", "3 BR", "4 BR"]:
                if br == target_br or br not in bmed: continue
                lines.append(f"• {br}: {fmt_aed(bmed[br])}" + (f" · {fmt_psm(bpsm[br])}" if br in bpsm else ""))

        # Past → Present → Future
        if hist and len(hist) >= 2:
            years = sorted(hist.keys())
            old_v = hist[years[0]]; new_v = hist[years[-1]]
            chg   = round(((new_v - old_v) / old_v) * 100, 1) if old_v else 0
            lines.append(f"• Past → Present: {fmt_psm(old_v)} ({years[0]}) → {fmt_psm(new_v)} ({years[-1]}) = {'+' if chg>0 else ''}{chg}%")
            if chg != 0:
                projected = round(float(new_v) * (1 + chg / 100), 0)
                lines.append(f"• Future (projected ~{int(years[-1])+1}): ~{fmt_psm(projected)} at current trend rate")
        elif trend is not None and bpsm:
            avg_psm = list(bpsm.values())[0]
            projected = round(float(avg_psm) * (1 + float(trend) / 100), 0)
            lines.append(f"• Future (projected): ~{fmt_psm(projected)} in 12 months at {'+' if float(trend)>0 else ''}{trend}% trend")

       # Developer track records
        if devs:
            for d in devs[:2]:
                flag = " ⚠️ delay risk" if (d.get("on_time_pct") or 100) < 70 else ""
                lines.append(f"• {d['developer_name']}: {d.get('on_time_pct','?')}% on-time · {d.get('star_rating','?')}★{flag}")

       # Nearby schools
        if name in SCHOOL_MAP:
            lines.append(f"• Nearby schools: {SCHOOL_MAP[name]}")

        # Top catalyst
        if cats:
            cat = cats[0]
            desc = cat.get("description") or ""
            desc_str = f" — {desc}" if desc else ""
            lines.append(f"• Upcoming: {cat.get('name','')} ({cat.get('expected_date','soon')}){desc_str}")

    # Budget summary from best area
    lines.append(f"\n💰 YOUR REALISTIC NUMBERS")
    best = areas[0]
    bmed = best["stats"].get("median_price_by_bedroom") or {}
    all_meds = sorted([v for v in bmed.values() if v])
    if all_meds:
        lines.append(f"• Estimated property budget: {fmt_aed(min(all_meds))} – {fmt_aed(max(all_meds))}")
    lines.append(f"• Minimum cash needed: AED 100,000+ (DLD 4% transfer fee mandatory regardless of financing)")
    best_names = " · ".join([a["name"] for a in areas[:3]])
    lines.append(f"• Best areas for your profile: {best_names}")

    lines.append(f"\n⚠️ CRITICAL WARNINGS")
    lines.append("• Check school catchment zones BEFORE committing — not all schools accept from all communities")
    lines.append("• Service charges: 10–20 AED/sqft/year — always confirm before signing SPA")

    return "\n".join(lines)



def build_comparison_reply(ctx: dict, bedrooms: str) -> str:
    lines = []
    comparison_keys = [k for k in ctx if k.startswith("comparison_")]

    areas = []
    for k in comparison_keys:
        sub = ctx[k]
        if not isinstance(sub, dict): continue
        intel = sub.get("area_intelligence") or {}
        stats = sub.get("transaction_stats") or {}
        cats  = sub.get("area_catalysts") or []
        hist  = sub.get("price_history_by_year") or {}
        name  = intel.get("area_name_en") or sub.get("detected_area", "")
        if name:
            areas.append({"name": name, "intel": intel, "stats": stats, "cats": cats, "hist": hist})

    if len(areas) < 2:
        return build_general_reply(ctx, bedrooms)

    a, b = areas[0], areas[1]
    target_br = bedrooms or "2 BR"

    yld_a = a["intel"].get("gross_yield_pct"); yld_b = b["intel"].get("gross_yield_pct")
    score_a = a["intel"].get("investment_score"); score_b = b["intel"].get("investment_score")
    trend_a = a["intel"].get("price_trend_pct"); trend_b = b["intel"].get("price_trend_pct")

    lines.append("📌 DIRECT ANSWER")
    lines.append(
        f"I pulled real DLD closed-sale data for both {a['name']} and {b['name']} — no asking-price "
        f"guesswork, just what actually sold. Here's how they compare."
    )

    # ── Price history, written as prose, addressing both areas together ──
    hist_sentences = []
    for area in (a, b):
        hist = area.get("hist", {})
        if hist and len(hist) >= 2:
            years = sorted(hist.keys())
            old_v = hist[years[0]]; new_v = hist[years[-1]]
            chg = round(((new_v - old_v) / old_v) * 100, 1) if old_v else 0
            direction = "climbed" if chg > 0 else "eased back"
            sentence = (
                f"{area['name']} has {direction} from {fmt_psm(old_v)} in {years[0]} to "
                f"{fmt_psm(new_v)} in {years[-1]} — a {'+' if chg>0 else ''}{chg}% move"
            )
            if chg != 0:
                projected = round(float(new_v) * (1 + chg / 100), 0)
                sentence += f", putting it on track for roughly {fmt_psm(projected)} by {int(years[-1])+1} if the trend holds"
            hist_sentences.append(sentence + ".")
        else:
            hist_sentences.append(
                f"{area['name']} doesn't have enough historical DLD records yet to chart a reliable price trend — "
                f"once more transactions land, that'll fill in."
            )

    if hist_sentences:
        lines.append("\n📈 HOW PRICES HAVE MOVED")
        lines.append(" ".join(hist_sentences))

    # ── Analysis, written conversationally ──
    lines.append("\n🔍 WHAT THIS TELLS US")
    analysis_bits = []
    if yld_a and yld_b:
        if float(yld_a) != float(yld_b):
            better_yield = a["name"] if float(yld_a) > float(yld_b) else b["name"]
            worse_yield_val = min(float(yld_a), float(yld_b))
            better_yield_val = max(float(yld_a), float(yld_b))
            analysis_bits.append(
                f"On rental income, {better_yield} is the stronger of the two — {better_yield_val}% "
                f"gross yield versus {worse_yield_val}%, so an investor chasing cash flow would lean that way."
            )
        else:
            analysis_bits.append(f"Both areas post an identical {yld_a}% gross yield, so yield alone won't decide it for you.")

    if score_a and score_b:
        if float(score_a) != float(score_b):
            better_score = a["name"] if float(score_a) > float(score_b) else b["name"]
            analysis_bits.append(
                f"On overall investment fundamentals, {better_score} scores higher "
                f"({max(float(score_a), float(score_b)):.0f}/100 vs {min(float(score_a), float(score_b)):.0f}/100)."
            )
        else:
            analysis_bits.append(
                f"Both areas land at the same {score_a}/100 investment score, so this really comes down to "
                f"yield, price point, and what kind of tenant or buyer you're targeting."
            )

    if analysis_bits:
        lines.append(" ".join(analysis_bits))
    else:
        lines.append(f"Both {a['name']} and {b['name']} are active, well-established Dubai markets — the choice comes down to your budget and what you're optimizing for.")

    # ── Bottom line, written as a direct recommendation ──
    lines.append("\n✅ BOTTOM LINE")
    if score_a and score_b and float(score_a) != float(score_b):
        winner = a if float(score_a) > float(score_b) else b
        lines.append(
            f"If I had to pick one on the numbers today, it's {winner['name']} — the stronger investment "
            f"score at {winner['intel'].get('investment_score')}/100. That said, book a viewing in both: "
            f"see {a['name']} and {b['name']} side by side before you commit, since a good unit in the "
            f"'weaker' area can still outperform a mediocre one in the stronger area."
        )
    elif yld_a and yld_b and float(yld_a) != float(yld_b):
        better_yield_area = a['name'] if float(yld_a) > float(yld_b) else b['name']
        lines.append(
            f"With fundamentals tied, yield breaks the tie — {better_yield_area} edges it out for rental "
            f"income. If capital growth matters more to you than monthly cash flow, it's worth comparing "
            f"specific buildings in both before deciding."
        )
    else:
        lines.append(
            f"Both {a['name']} and {b['name']} hold up well on the data available. Your best move is to "
            f"book viewings in both and compare actual units at the same price point — the headline numbers "
            f"only tell part of the story."
        )

    return "\n".join(lines)


def build_comparison_charts(ctx: dict) -> list:
    comparison_keys = [k for k in ctx if k.startswith("comparison_")]
    areas = []
    for k in comparison_keys:
        sub = ctx[k]
        if not isinstance(sub, dict): continue
        intel = sub.get("area_intelligence") or {}
        stats = sub.get("transaction_stats") or {}
        name = intel.get("area_name_en")
        if name:
            areas.append((name, intel, stats))
    if len(areas) < 2:
        return []
    charts = []
    score_data = [{"label": n, "value": float(i.get("investment_score") or 0)} for n, i, s in areas]
    if any(d["value"] > 0 for d in score_data):
        charts.append({"type": "bar", "title": "Investment Score Comparison", "data": score_data})
    yield_data = [{"label": n, "value": float(i.get("gross_yield_pct") or 0)} for n, i, s in areas]
    if any(d["value"] > 0 for d in yield_data):
        charts.append({"type": "bar", "title": "Gross Yield Comparison (%)", "data": yield_data})
    price_data = [{"label": n, "value": float(i.get("truvalu_psm") or s.get("avg_price_sqm") or 0)} for n, i, s in areas]
    if any(d["value"] > 0 for d in price_data):
        charts.append({"type": "bar", "title": "Avg Price per sqm (AED)", "data": price_data})
    return charts

def build_buyer_reply(ctx: dict, bedrooms: str) -> str:
    intel = ctx.get("area_intelligence", {})
    stats = ctx.get("transaction_stats", {})
    area  = ctx.get("detected_area", "this area")
    lines = []

    lines.append("🏠 IS THIS RIGHT FOR YOU?")
    vibe_map = {
        "Dubai Marina": "an upscale waterfront community — high-rises, dining, beach access",
        "Jumeirah Village Circle (JVC)": "a family-friendly suburban community — quiet, gated, well-maintained",
        "Downtown Dubai": "a city-centre luxury district — iconic skyline, walkable, high-energy",
        "Business Bay": "an urban professional hub — canal views, close to DIFC",
        "Palm Jumeirah": "a premium island community — private beaches, villa living",
        "Dubai Hills Estate": "a green master-planned community — parks, schools, golf",
        "Jumeirah Lake Towers (JLT)": "a mixed-use lakeside community — metro access, restaurants, community feel",
    }
    vibe = vibe_map.get(area, "an established Dubai residential community")
    lines.append(f"• {area} is {vibe}")
    target_br, disclosure = resolve_bedroom_filter(bedrooms)
    if disclosure:
        lines.append(f"• {disclosure}")
    bedroom_med_all = stats.get("median_price_by_bedroom", {})
    median_br = (bedroom_med_all.get(target_br) if target_br else None) or stats.get("avg_worth_aed")
    if median_br and target_br:
        lines.append(f"• Verdict: GOOD BUY — {target_br} typical price is {fmt_aed(median_br)}, real DLD closed-sale price")
    elif median_br:
        lines.append(f"• Verdict: GOOD BUY — overall average sale price across all unit types is {fmt_aed(median_br)} (total price, not per sqm — see per-sqm rate below), real DLD closed-sale data")

    lines.append("\n💰 WHAT YOUR MONEY GETS YOU")
    if ctx.get("property_type_fallback_used"):
        lines.append("• Note: figures below are area-wide (all unit types) — no separately-filtered villa/townhouse sales available")
    bedroom_psm = stats.get("bedroom_avg_psm", {})
    bedroom_med = stats.get("median_price_by_bedroom", {})
    if target_br and target_br in bedroom_psm:
        lines.append(f"• {target_br}: {fmt_psm(bedroom_psm[target_br])} | Typical closed sale: {fmt_aed(bedroom_med.get(target_br))}")
    if stats.get("avg_price_sqm"):
        lines.append(f"• Area average: {fmt_psm(stats['avg_price_sqm'])}")
    if bedroom_med:
        all_meds = [v for v in bedroom_med.values() if v]
        if all_meds:
            lines.append(f"• Unit price range: {fmt_aed(min(all_meds))} – {fmt_aed(max(all_meds))}")
    for br, psm in bedroom_psm.items():
        if br == target_br: continue
        med = bedroom_med.get(br)
        line = f"• {br}: {fmt_psm(psm)}"
        if med: line += f" | Median: {fmt_aed(med)}"
        lines.append(line)

    lines.append("\n🏘️ COMMUNITY & LIFESTYLE")
    community_map = {
        "Jumeirah Village Circle (JVC)": ("Family-friendly, quiet, gated — popular with South Asian and European expat families", "20–25 min to Downtown via Al Khail Road"),
        "Dubai Marina":                  ("Urban, vibrant, mixed expat — young professionals and couples", "25 min to Downtown via Sheikh Zayed Road"),
        "Downtown Dubai":                ("City-centre cosmopolitan — tourists, professionals, luxury buyers", "Walking distance to DIFC and Dubai Mall"),
        "Business Bay":                  ("Professional urban community — canal views, close to DIFC", "10 min to Downtown, direct metro access"),
        "Palm Jumeirah":                 ("Premium island — wealthy expats, high-net-worth families", "25–35 min to Downtown via Sheikh Zayed Road"),
        "Dubai Hills Estate":            ("Green, family-oriented — British families, school-age children", "20 min to Downtown via Al Khail Road"),
        "Jumeirah Lake Towers (JLT)":   ("Mixed expat lakeside community — professionals, families", "Metro access, 5 min to Dubai Marina"),
    }
    comm, commute = community_map.get(area, ("Established mixed expat community", "20–30 min to Downtown"))
    lines.append(f"• Who lives here: {comm}")
    if intel.get("parks_info"):   lines.append(f"• Green spaces: {intel['parks_info']}")
    if intel.get("retail_info"):  lines.append(f"• Retail/amenities: {intel['retail_info']}")
    lines.append(f"• Commute to Downtown Dubai: {commute}")

    lines.append("\n📈 IS IT A GOOD TIME TO BUY?")
    trend = intel.get("price_trend_pct")
    hist  = ctx.get("price_history_by_year", {})
    if trend is not None:
        direction = "Rising" if float(trend) > 0 else "Cooling"
        lines.append(f"• Price trend: {'+' if float(trend)>0 else ''}{trend}% year-on-year ({direction})")
        if float(trend) > 0:
            lines.append("• What this means: Market is rising — buying sooner gives you a better entry price")
        else:
            lines.append("• What this means: Prices cooling — you have stronger negotiation power right now")
    elif hist:
        years = sorted(hist.keys())
        if len(years) >= 2:
            old_v = hist[years[0]]; new_v = hist[years[-1]]
            chg = round(((new_v - old_v) / old_v) * 100, 1) if old_v else 0
            lines.append(f"• Price moved {fmt_psm(old_v)} ({years[0]}) → {fmt_psm(new_v)} ({years[-1]}): {'+' if chg>0 else ''}{chg}%")
            lines.append(f"• What this means: {'Rising trend — buy sooner' if chg > 0 else 'Stable — good negotiation window'}")
        else:
            lines.append(f"• Current price: {fmt_psm(list(hist.values())[0])} — stable market, good entry point")
    else:
        lines.append("• Market is active with strong transaction volume — buyer demand is consistent in this area")
        lines.append("• What this means: Competitive market — move quickly on a unit you like")

    devs = ctx.get("developer_track_records", [])
    if devs:
        lines.append("\n🏗️ DEVELOPER TRACK RECORD")
        for d in devs[:3]:
            flag = " ⚠️" if (d.get("on_time_pct") or 100) < 70 else ""
            lines.append(f"• {d['developer_name']}: {d.get('on_time_pct','?')}% on-time · {d.get('star_rating','?')}★{flag}")

    lines.append("\n✅ BUYER VERDICT")
    lifestyle_fit = {
        "Jumeirah Village Circle (JVC)": "families and first-time buyers wanting space and community feel under AED 2M",
        "Dubai Marina":                  "professionals wanting waterfront lifestyle with walkable dining and beach",
        "Downtown Dubai":                "buyers wanting iconic address and city-centre access",
        "Business Bay":                  "professionals wanting proximity to DIFC and canal views",
        "Palm Jumeirah":                 "buyers wanting premium island lifestyle and private beach access",
        "Dubai Hills Estate":            "families wanting green spaces, British schools, and a planned community",
        "Jumeirah Lake Towers (JLT)":   "buyers wanting metro access and lakeside community feel",
    }
    lines.append(f"• Right for you if: {lifestyle_fit.get(area, 'you want a well-connected Dubai residential community')}")
    lines.append("• Watch out for: Service charges and parking costs — confirm both before signing")
    if median_br:
        asking_est = round(float(median_br) * 1.10)
        lines.append(f"• Negotiation tip: DLD typical price is {fmt_aed(median_br)} — asking prices run ~10% higher ({fmt_aed(asking_est)}), push back hard")
    lines.append("• Next step: Book 2–3 viewings this week — compare layouts and floor levels at the same price point")

    lines.extend(build_rental_section(ctx))

    return "\n".join(lines)


def build_seller_reply(ctx: dict, bedrooms: str) -> str:
    intel = ctx.get("area_intelligence", {})
    stats = ctx.get("transaction_stats", {})
    area  = ctx.get("detected_area", "this area")
    hist  = ctx.get("price_history_by_year", {})
    cats  = ctx.get("area_catalysts", [])
    user_price = ctx.get("user_budget_aed")   # the price the seller actually listed at
    lines = []

    bedroom_med = stats.get("median_price_by_bedroom", {})
    br_order = ["Studio", "1 BR", "2 BR", "3 BR", "4 BR", "5 BR"]
    available_brs = [br for br in br_order if br in bedroom_med]

    target_br = bedrooms  # None if user didn't say a size
    median_v  = bedroom_med.get(target_br) if target_br else None
    avg_psm   = intel.get("truvalu_psm") or stats.get("avg_price_sqm")
    trend     = intel.get("price_trend_pct")

    lines.append("📌 SELL NOW OR WAIT?")
    if trend is not None and float(trend) > 0:
        lines.append("• Decision: Sell now")
        lines.append(f"• Reason: Prices rising +{trend}% year-on-year — sell into strength before the market peaks")
    elif trend is not None and float(trend) < 0:
        lines.append("• Decision: Price carefully or wait")
        lines.append(f"• Reason: Market cooling {trend}% YoY — buyers have leverage, price at or below median")
    else:
        lines.append("• Decision: Good time to sell")
        lines.append("• Reason: Market is stable with active buyer demand — list now to catch current interest")


    if user_price:
        bedroom_med = stats.get("median_price_by_bedroom", {})
        benchmark = bedroom_med.get(bedrooms) if bedrooms else None
        benchmark_label = f"{bedrooms} typical price" if benchmark else None
        if not benchmark:
            benchmark = intel.get("truvalu_psm") and stats.get("avg_price_sqm")
            benchmark = stats.get("avg_worth_aed")
            benchmark_label = "area-wide average (all unit types — not bedroom-specific)"

        lines.append("\n💵 IS YOUR ASKING PRICE RIGHT?")
        lines.append(f"• Your listed price: {fmt_aed(user_price)}")
        if benchmark:
            diff_pct = round((float(user_price) - float(benchmark)) / float(benchmark) * 100, 1)
            lines.append(f"• DLD benchmark ({benchmark_label}): {fmt_aed(benchmark)}")
            if diff_pct > 15:
                lines.append(f"• Verdict: {diff_pct}% above benchmark — this is likely why buyers are calling it high. Premium features (view, renovation) can justify some gap, but {diff_pct}% is a large premium to defend without strong comps.")
            elif diff_pct > 5:
                lines.append(f"• Verdict: {diff_pct}% above benchmark — reasonable if the unit has real upgrades, but be ready to justify it to buyers.")
            elif diff_pct < -5:
                lines.append(f"• Verdict: actually {abs(diff_pct)}% BELOW benchmark — you may be underpricing.")
            else:
                lines.append(f"• Verdict: within {abs(diff_pct)}% of benchmark — in line with the market.")
        else:
            lines.append("• Not enough DLD data to benchmark this precisely yet — treat 'too high' feedback as opinion, not data.")

    lines.append("\n📈 PRICE MOMENTUM")
    if avg_psm: lines.append(f"• Current average: {fmt_psm(avg_psm)}")
    if trend is not None:
        direction = "Rising ↑" if float(trend) > 0 else "Cooling ↓"
        lines.append(f"• Year-on-year trend: {'+' if float(trend)>0 else ''}{trend}% ({direction})")
    if hist:
        years = sorted(hist.keys())
        price_parts = [f"{y}: {fmt_psm(hist[y])}" for y in years[-3:]]
        lines.append(f"• Price history: {' → '.join(price_parts)}")
    tx = intel.get("tx_7d"); tx_delta = intel.get("tx_7d_delta_pct")
    if tx:
        delta_str = f" ({'+' if float(tx_delta or 0)>0 else ''}{tx_delta}% WoW)" if tx_delta else ""
        lines.append(f"• Weekly transactions: {tx} deals{delta_str}")

    lines.append("\n💰 YOUR REALISTIC ASKING PRICE")
    if target_br and median_v:
        recommended = round(float(median_v) * 1.06)
        lines.append(f"• Typical DLD closed sale for {target_br}: {fmt_aed(median_v)}")
        lines.append(f"• Recommended list price: {fmt_aed(recommended)} (6% above typical price — leaves negotiation room)")
    elif available_brs:
        lines.append(f"• You didn't mention a unit size, so here's every size we have real DLD closed-sale data for in {area}:")
        for br in available_brs:
            med = bedroom_med[br]
            rec = round(float(med) * 1.06)
            lines.append(f"• {br}: Typical {fmt_aed(med)} → Recommended list {fmt_aed(rec)}")
    elif avg_psm:
        recommended_psm = round(float(avg_psm) * 1.06)
        lines.append(
            f"• We don't have enough closed sales broken down by exact bedroom count for {area} right now — "
            f"here's the overall benchmark instead: {fmt_psm(avg_psm)}."
        )
        lines.append(f"• Recommended list rate: AED {recommended_psm:,}/sqm (6% above average — leaves negotiation room)")
    else:
        lines.append(f"• Not enough recent DLD transaction data for {area} yet to give a reliable price estimate.")
    distress = intel.get("distress_pct")
    if distress:
        lines.append(f"• Distress sales in area: {distress}% — {'high, price competitively' if float(distress) > 10 else 'low — healthy market for sellers'}")

    if cats:
        lines.append("\n⚡ WHAT COULD HELP YOUR SALE")
        for c in cats[:3]:
            lines.append(f"• {c.get('name') or 'Catalyst'} — {c.get('expected_date') or 'upcoming'} — {c.get('description') or 'infrastructure uplift expected'}")

    lines.append("\n✅ SELLER ACTION PLAN")
    if target_br and median_v:
        lines.append(f"• Step 1: List at {fmt_aed(round(float(median_v)*1.06))} — anchored to real DLD data")
    elif available_brs:
        mid_br = available_brs[len(available_brs) // 2]
        lines.append(f"• Step 1: Tell us your unit size for an exact number — a {mid_br} here typically lists around {fmt_aed(round(float(bedroom_med[mid_br])*1.06))}")
    lines.append(f"• Step 2: {'List immediately — rising market rewards early movers' if trend and float(trend)>0 else 'List now — stable demand, avoid waiting for an uncertain uptick'}")
    lines.append("• Step 3: RERA-registered agent — get NOC ready before listing to avoid delays")
    if target_br and median_v:
        lines.append(f"• Bottom line: Expect 3–5 viewings in first 2 weeks at {fmt_aed(round(float(median_v)*1.06))}")

    lines.extend(build_rental_section(ctx))

    return "\n".join(lines)


def build_investor_reply(ctx: dict, bedrooms: str) -> str:
    intel  = ctx.get("area_intelligence", {})
    stats  = ctx.get("transaction_stats", {})
    area   = ctx.get("detected_area", "")
    hist   = ctx.get("price_history_by_year", {})
    cats   = ctx.get("area_catalysts", [])
    shocks = ctx.get("historical_shock_resilience", [])
    devs   = ctx.get("developer_track_records", [])
    top_yield = ctx.get("top_yield_areas", [])
    top_areas = ctx.get("top_areas", [])
    lines = []

    if top_yield or top_areas:
        data = top_yield or top_areas
        target_br, _ = resolve_bedroom_filter(bedrooms)
        lines.append("📌 INVESTMENT VERDICT")
        lines.append("• Signal: BUY — ranked below are Dubai's top-performing areas by real DLD investment data")
        if target_br:
            lines.append(f"• Best play: Buy-to-let a {target_br} here for rental income above the 6.1% Dubai average")
        else:
            lines.append("• Best play: Buy-to-let for rental income above the 6.1% Dubai average — tell me your preferred unit size to narrow this down")
        lines.append("\n📊 TOP AREAS BY ROI — Real DLD Data")
        for i, a in enumerate(data[:8], 1):
            name  = a.get("area_name_en", "")
            score = a.get("investment_score")
            yld   = a.get("gross_yield_pct")
            trend = a.get("price_trend_pct")
            psm   = a.get("truvalu_psm")
            tx    = a.get("tx_7d")
            parts = []
            if tx:    parts.append(f"{tx} sales/wk")
            if score: parts.append(f"Score {score}/100")
            if yld:   parts.append(f"Yield {yld}%")
            if trend is not None: parts.append(f"Trend {'+' if float(trend)>0 else ''}{trend}%")
            if psm:   parts.append(f"Avg {fmt_psm(psm)}")
            if parts: lines.append(f"• #{i} {name} — {' · '.join(parts)} → https://www.acqar.com/areas/{area_to_slug(name)}")
        lines.append("\n✅ INVESTOR DECISION")
        if data:
            top = data[0]
            yld_top = top.get("gross_yield_pct", "")
            score_top = top.get("investment_score", "")
            diff = round(float(yld_top) - 6.1, 2) if yld_top else 0
            lines.append(f"• Best entry: {top.get('area_name_en','')} — {yld_top}% gross yield ({'+' if diff>=0 else ''}{diff}% above Dubai avg)")
            if score_top: lines.append(f"• Investment Score: {score_top}/100 — strongest fundamentals in Dubai right now")
        lines.append("• Rule: Only invest in areas beating the 6.1% Dubai average yield threshold")
        if target_br:
            lines.append(f"• Unit type: {target_br} (as requested) — note the scores/yields above are area-wide averages across all unit types, not {target_br}-specific")
        else:
            lines.append("• Unit type: not specified — Studio/1BR units tend to show the highest yield-to-price ratio, but let me know your preferred size for a tighter match")

        return "\n".join(lines)

    lines.append("📌 INVESTMENT VERDICT")
    score = intel.get("investment_score"); yld = intel.get("gross_yield_pct")
    trend = intel.get("price_trend_pct"); rank = intel.get("ranking_rank")
    signal = "STRONG BUY" if (score and float(score) >= 75) else "BUY" if (score and float(score) >= 60) else "HOLD"
    if yld and float(yld) > 6.1:
        diff = round(float(yld) - 6.1, 2)
        lines.append(f"• Signal: {signal} — {yld}% gross yield is +{diff}% above Dubai average of 6.1%")
    elif score:
        lines.append(f"• Signal: {signal} — Investment Score {score}/100")
    else:
        lines.append(f"• Signal: {signal} — active transaction market in {area}")
    lines.append("• Best play: Buy-to-let for rental income + capital appreciation")

    lines.append("\n📊 INVESTMENT SCORECARD")
    if score: lines.append(f"• Investment Score: {score}/100")
    if yld:
        diff = round(float(yld) - 6.1, 2)
        above = "above" if diff >= 0 else "below"
        lines.append(f"• Gross Yield: {yld}% — Dubai avg 6.1%, this is {abs(diff)}% {above} average")
    if trend is not None: lines.append(f"• Price Trend: {'+' if float(trend)>0 else ''}{trend}% year-on-year")
    distress = intel.get("distress_pct")
    if distress: lines.append(f"• Distress Sales: {distress}% — {'opportunity: motivated sellers' if float(distress)>10 else 'stable market'}")
    abs_rate = intel.get("absorption_rate_pct")
    if abs_rate: lines.append(f"• Absorption Rate: {abs_rate}% — {'fast-moving demand' if float(abs_rate)>50 else 'balanced supply/demand'}")

    bpsm = stats.get("bedroom_avg_psm", {}); bmed = stats.get("median_price_by_bedroom", {})
    entry_rows = [br for br in ["Studio", "1 BR", "2 BR", "3 BR"] if br in bpsm]
    if entry_rows:
        lines.append("\n💰 ENTRY PRICES — Real DLD Closed Sales")
        if ctx.get("property_type_fallback_used"):
            lines.append("• Note: figures below are area-wide (all unit types) — no separately-filtered villa/townhouse sales available")
        lines.append("| Type | AED/sqm | Typical Unit |")
        lines.append("|------|---------|--------------|")
        for br in entry_rows:
            med_str = fmt_aed(bmed[br]) if br in bmed else "—"
            lines.append(f"| {br} | {fmt_psm(bpsm[br])} | {med_str} |")
    else:
        lines.append("\n💰 ENTRY PRICES")
        lines.append("• Browse actual closed-sale prices for this project.")

    if hist and len(hist) >= 1:
        lines.append("\n📈 CAPITAL APPRECIATION")
        years = sorted(hist.keys())
        lines.append("| Year | AED/sqm |")
        lines.append("|------|---------|")
        for y in years:
            lines.append(f"| {y} | {fmt_psm(hist[y])} |")
        if len(years) >= 2:
            old_v = hist[years[0]]; new_v = hist[years[-1]]
            chg = round(((new_v-old_v)/old_v)*100, 1) if old_v else 0
            safe_chg, chg_flagged = _sanity_bound_trend(chg, intel)
            if chg_flagged:
                lines.append(f"\n• Change from {years[0]} to {years[-1]}: data inconsistent for this period — under review")
            else:
                lines.append(f"\n• Change from {years[0]} to {years[-1]}: {'+' if safe_chg>0 else ''}{safe_chg}%")

    if cats:
        lines.append("\n⚡ CATALYSTS — Price Drivers")
        for c in cats[:3]:
            lines.append(f"• {c.get('name') or ''} — {c.get('expected_date') or 'upcoming'} — {c.get('description') or 'uplift expected'}")

    if shocks:
        lines.append("\n🛡️ DOWNSIDE RISK")
        for s in shocks[:2]:
            lines.append(f"• {s.get('event_name','')}: dropped {s.get('price_impact_pct','')}%, recovered in {s.get('recovery_months','')} months")

    if devs:
        lines.append("\n🏗️ DEVELOPER RISK")
        for d in devs[:3]:
            flag = " ⚠️ (delay risk)" if (d.get("on_time_pct") or 100) < 70 else ""
            lines.append(f"• {d['developer_name']}: {d.get('on_time_pct','?')}% on-time · {d.get('star_rating','?')}★{flag}")

    lines.append("\n✅ INVESTOR DECISION")
    best_br = pick_target_bedroom(bedrooms, bmed)
    if bedrooms and best_br is None and bmed:
        lines.append(f"• We don't have DLD-verified {bedrooms} sales for {area} yet — showing the closest available size instead")
        best_br = pick_target_bedroom(None, bmed)
    if best_br and best_br in bmed:
        tag = "as requested" if best_br == bedrooms else "highest yield-to-price ratio among available sizes"
        lines.append(f"• Best entry: {best_br} at {fmt_aed(bmed[best_br])} — {tag}")
    if yld: lines.append(f"• Expected gross yield: {yld}% annually")
    lines.append(f"• Watch: Monitor new supply launches — oversupply can compress yields")
    if best_br and best_br in bmed:
        lines.append(f"• Bottom line: {fmt_aed(bmed[best_br])} entry on {best_br} in {area} is the strongest risk-adjusted play right now")

    lines.extend(build_rental_section(ctx))

    return "\n".join(lines)


def build_broker_reply(ctx: dict, bedrooms: str) -> str:
    intel = ctx.get("area_intelligence", {})
    stats = ctx.get("transaction_stats", {})
    area  = ctx.get("detected_area", "this area")
    hist  = ctx.get("price_history_by_year", {})
    cats  = ctx.get("area_catalysts", [])
    devs  = ctx.get("developer_track_records", [])
    projs = ctx.get("top_projects", [])
    lines = []

    lines.append(f"📋 AREA BRIEFING — {area}")
    score   = intel.get("investment_score"); rank    = intel.get("ranking_rank")
    verdict = intel.get("verdict");          yld     = intel.get("gross_yield_pct")
    trend   = intel.get("price_trend_pct"); avg_psm = intel.get("truvalu_psm") or stats.get("avg_price_sqm")
    tx      = intel.get("tx_7d");           tx_delta= intel.get("tx_7d_delta_pct")
    distress= intel.get("distress_pct")

    if score or rank:
        score_str = f"Investment Score: {score}/100" if score else ""
        rank_str  = f"Ranking: #{rank} in Dubai" if rank else ""
        lines.append(f"• {' · '.join(filter(None, [score_str, rank_str]))}")
    if verdict or yld:
        verdict_str = f"Verdict: {verdict}" if verdict else ""
        yld_str     = f"Gross Yield: {yld}%" if yld else ""
        lines.append(f"• {' · '.join(filter(None, [verdict_str, yld_str]))}")
    if trend is not None or avg_psm:
        trend_str = f"Price Trend: {'+' if trend and float(trend)>0 else ''}{trend}% YoY" if trend is not None else ""
        psm_str   = f"Avg PSM: {fmt_psm(avg_psm)}" if avg_psm else ""
        lines.append(f"• {' · '.join(filter(None, [trend_str, psm_str]))}")
    if tx:
        delta_str = f" ({'+' if float(tx_delta or 0)>0 else ''}{tx_delta}% WoW)" if tx_delta else ""
        lines.append(f"• Weekly DLD Volume: {tx} transactions{delta_str}")
    if distress: lines.append(f"• Distress Sales: {distress}%")

    lines.append("\n💰 DLD TRANSACTION COMPARABLES")
    bpsm = stats.get("bedroom_avg_psm", {}); bmed = stats.get("median_price_by_bedroom", {})
    for br in ["Studio", "1 BR", "2 BR", "3 BR", "4 BR"]:
        if br in bpsm:
            line = f"• {br}: {fmt_psm(bpsm[br])}"
            if br in bmed: line += f" | Typical deal: {fmt_aed(bmed[br])}"
            lines.append(line)

    if hist:
        lines.append("\n📈 PRICE MOMENTUM — Client Talking Points")
        years = sorted(hist.keys())
        parts = [f"{y}: {fmt_psm(hist[y])}" for y in years[-3:]]
        lines.append(f"• {' → '.join(parts)}")
        if trend is not None:
            if float(trend) > 0:
                lines.append(f"• Direction: Rising +{trend}% — tell buyers: 'prices are up, this is the entry window'")
            else:
                lines.append(f"• Direction: Cooling {trend}% — tell buyers: 'good value entry, negotiate from DLD median'")

    if cats:
        lines.append("\n⚡ UPCOMING CATALYSTS — For Pitch Decks")
        for c in cats[:4]:
            lines.append(f"• {c.get('name') or ''} — {c.get('expected_date') or 'upcoming'} — {c.get('description') or 'demand uplift expected'}")

    if devs:
        lines.append("\n🏗️ DEVELOPER DATA — For Off-Plan Pitching")
        for d in devs[:4]:
            flag = " ⚠️ Disclose delay risk to client" if (d.get("on_time_pct") or 100) < 70 else ""
            lines.append(f"• {d['developer_name']}: {d.get('on_time_pct','?')}% on-time · {d.get('star_rating','?')}★ · {d.get('total_projects','?')} projects{flag}")

    if projs:
        lines.append("\n🏙️ TOP PROJECTS BY DLD VOLUME")
        for p in projs[:5]:
            lines.append(f"• {p['name']} — {p['transactions']} DLD transactions")

    lines.append("\n✅ BROKER TALKING POINTS")
    top_med = None
    if bedrooms and bedrooms in bmed:
        top_med = (bedrooms, bmed[bedrooms])
    else:
        for br in ["1 BR", "Studio", "2 BR"]:
            if br in bmed: top_med = (br, bmed[br]); break
    if top_med:
        asking_est = round(float(top_med[1]) * 1.10)
        lines.append(f'• For buyer clients: "DLD typical price for {top_med[0]} is {fmt_aed(top_med[1])} — asking prices run ~10% higher ({fmt_aed(asking_est)}), negotiate hard"')
    if trend is not None and bmed:
        direction_word = "rising" if float(trend) > 0 else "cooling"
        first_med = float(list(bmed.values())[0])
        rec_price = round(first_med * 1.06) if float(trend) > 0 else round(first_med * 1.0)
        lines.append(f'• For seller clients: "Market {direction_word} {trend}% — list at {fmt_aed(rec_price)} to attract serious buyers quickly"')
    if yld:
        diff = round(float(yld) - 6.1, 2)
        above = "above" if diff >= 0 else "below"
        lines.append(f'• For investor clients: "{yld}% gross yield — {abs(diff)}% {above} Dubai 6.1% average — strong buy-to-let case"')
    lines.append(f'• Objection "Is {area} overpriced?": DLD typical price is the real number — asking prices average 8–12% above actual closed sales')

    lines.extend(build_rental_section(ctx))

    return "\n".join(lines)


def build_budget_reply(ctx: dict, bedrooms: str, budget: float) -> str:
    lines = []
    target_br, disclosure = resolve_bedroom_filter(bedrooms)
    target_br_label = target_br or "All Unit Types"
    budget_label = fmt_aed(budget)
    areas = ctx.get("budget_search_areas") or ctx.get("top_areas") or []

    lines.append("📌 DIRECT ANSWER")
    if target_br:
        lines.append(f"• Searching for {target_br} apartments under {budget_label} — here are the best-value areas from real DLD closed sales")
    else:
        lines.append(f"• Searching for apartments under {budget_label} — here are the best-value areas from real DLD closed sales")
        lines.append(f"• {disclosure}")
    feasibility_warning = check_budget_feasibility(budget, bedrooms, areas)
    if feasibility_warning:
        lines.append(f"• {feasibility_warning}")
    lines.append(f"• All prices below are actual DLD closed-sale transactions — not asking prices")

    # Filter and rank areas by whether their median 2BR fits the budget
    matched = []
    for a in areas:
        name  = a.get("area_name_en", "")
        score = a.get("investment_score")
        yld   = a.get("gross_yield_pct")
        psm   = a.get("truvalu_psm")
        trend = a.get("price_trend_pct")
        if name:
            matched.append((name, score, yld, psm, trend))

    lines.append(f"\n💡 BEST AREAS FOR {target_br_label} UNDER {budget_label}")

    shown = 0
    for name, score, yld, psm, trend in matched[:10]:
        if shown >= 5: break
        lines.append(f"\n• {name}")
        if score: lines.append(f"  — Investment Score: {score}/100" + (f" · Yield: {yld}%" if yld else ""))
        if psm:   lines.append(f"  — Avg price: {fmt_psm(psm)}")
        if trend is not None:
            direction = "Rising ↑" if float(trend) > 0 else "Cooling ↓"
            lines.append(f"  — Price Trend: {'+' if float(trend)>0 else ''}{trend}% YoY ({direction})")
        shown += 1

    lines.append(f"\n💰 YOUR BUDGET BREAKDOWN")
    lines.append(f"• Target: {target_br_label} under {budget_label}")
    lines.append(f"• DLD transfer fee (mandatory): {fmt_aed(budget * 0.04)} (4% of purchase price)")
    lines.append(f"• Agent fee: ~{fmt_aed(budget * 0.02)} (2% typical)")
    lines.append(f"• Minimum cash needed upfront: {fmt_aed(budget * 0.06)} (fees) + down payment if mortgaging")
    lines.append(f"• If mortgaging: 20% down = {fmt_aed(budget * 0.20)} minimum for expats")

    

    lines.append(f"\n⚠️ WATCH OUT FOR")
    lines.append(f"• Service charges vary widely — confirm AED/sqft/year before signing")
    lines.append(f"• Off-plan under {budget_label} may have 5–8% post-handover price jumps — buy ready when possible")

   

    return "\n".join(lines)



def build_portfolio_strategy_reply(ctx: dict, budget: float) -> str:
    areas = ctx.get("strategy_candidate_areas", [])[:4]
    lines = []

    lines.append("📌 DIRECT ANSWER")
    lines.append(f"• With {fmt_aed(budget)} to deploy, splitting across several mid-market units "
                 f"generally beats a single trophy asset if cash flow and risk mitigation matter most to you.")
    lines.append(f"• A single trophy property is the better call if capital preservation, prestige, "
                 f"or long-term appreciation is the priority over yield.")

    lines.append("\n⚖️ TRADE-OFFS")
    lines.append("• Single trophy asset: lower gross yield (~3–4%), one buyer pool at exit (slower "
                 "liquidity), lower management overhead, strongest long-term appreciation potential.")
    lines.append("• Diversified mid-market units: higher blended yield (~6–8%), vacancy/tenant risk "
                 "spread across several units instead of concentrated in one, faster individual resale, "
                 "more hands-on management (multiple tenants, multiple service charges).")

    if areas:
        lines.append(f"\n💡 CANDIDATE AREAS TO SPLIT ACROSS {fmt_aed(budget)}")
        for a in areas:
            name  = a.get("area_name_en", "")
            score = a.get("investment_score")
            yld   = a.get("gross_yield_pct")
            psm   = a.get("truvalu_psm")
            if not name: continue
            parts = []
            if score: parts.append(f"Score {score}/100")
            if yld:   parts.append(f"Yield {yld}%")
            if psm:   parts.append(f"Avg {fmt_psm(psm)}")
            lines.append(f"• {name} — {' · '.join(parts)}")

    lines.append("\n✅ BOTTOM LINE")
    lines.append("• If rental income and risk spread are the priority: diversify across 3–5 mid-market units.")
    lines.append("• If prestige and long-term capital preservation matter more than yield: a single trophy asset is defensible.")
    lines.append("• A hybrid split (e.g. 60% into one strong asset, 40% spread across 2–3 mid-market units) "
                 "is also a reasonable middle ground.")

    return "\n".join(lines)

# Any English question word, wherever it starts the sentence — covers virtually
# any way a follow-up question can be phrased, not just a fixed set of phrases.
FOLLOWUP_QUESTION_WORDS = (
    "what", "how", "can", "is", "are", "does", "do", "will", "should",
    "why", "where", "when", "who", "which", "would", "could", "did",
    "was", "were", "has", "have", "may", "shall",
)

FOLLOWUP_COMMAND_STARTERS = (
    "show me", "show", "give me", "list", "tell me", "compare",
    "break down", "breakdown", "explain", "summarize", "walk me through",
)

SPECIFIC_CONCERN_MARKERS = [
    "already own", "i own a", "should i be worried", "should i worry",
    "still make sense", "does it still make sense", "eating into my",
    "eating my rental", "am i overpaying", "is this still a good",
]

def is_specific_followup(message: str, history: list) -> bool:
    """True when this is a narrow follow-up question (or a short data/info
    request like 'show me X') that should get a direct answer instead of the
    full templated area report — regardless of whether it's the first message
    or a later one in the conversation."""
    m = message.strip().lower()
    is_question_mark = m.endswith("?") or m.endswith("؟")
    words = m.split()
    first_word = words[0].strip(".,!?؟") if words else ""
    is_question_word_start = first_word in FOLLOWUP_QUESTION_WORDS
    is_command_start = m.startswith(FOLLOWUP_COMMAND_STARTERS)
    is_short_request = (is_question_mark or is_question_word_start or is_command_start) \
        and len(words) <= 25
    is_fresh_intent = any(k in m for k in [
        "i want to buy", "i want to sell", "i'm looking to",
        "should i buy", "should i sell",
    ])

    PRICE_QUESTION_PATTERNS = [
        "going price", "what's the price", "what is the price",
        "price of", "how much is", "how much for", "asking price",
        "sq ft", "sqft", "square feet", "sq m", "sqm",
    ]
    is_price_question = any(p in m for p in PRICE_QUESTION_PATTERNS)

    # A personal ownership concern is always a narrow, specific question —
    # length alone shouldn't route it into the generic templated report.
    is_ownership_concern = is_question_mark and any(p in m for p in SPECIFIC_CONCERN_MARKERS)

    return (is_short_request or is_price_question or is_ownership_concern) and not is_fresh_intent

def classify_message_intent(message: str, history: list) -> dict:
    """
    Reads the FULL current message against the FULL previous message (not
    just keywords) to decide:
      - mode: 'specific' -> narrow follow-up, answer directly (no full report)
              'full'     -> fresh/open request, build the complete report
      - topic_changed: True only when CURRENT is genuinely unrelated to what
        was just discussed. False for natural follow-ups/comparisons/refinements.
    Returns {"mode": None, "topic_changed": False} on failure so callers can
    fall back to the keyword heuristic.
    """
    if not history:
        return {"mode": "full", "topic_changed": False}

    prior_msgs = [h.get("content", "") for h in history if h.get("role") == "user" and h.get("content")]
    if not prior_msgs:
        return {"mode": "full", "topic_changed": False}
    prior = prior_msgs[-1]

    sys = (
        "You are a routing classifier for a Dubai real-estate chat assistant. "
        "Read the PREVIOUS user message and the CURRENT user message in full — "
        "not just keywords — and decide:\n"
        "1. mode: 'specific' if CURRENT is a narrow follow-up building on the same "
        "property/area/topic (asking for a number, detail, comparison, clarification). "
        "'full' if CURRENT is a fresh, open-ended request deserving a complete report.\n"
        "2. topic_changed: true ONLY if CURRENT is about a genuinely different subject "
        "than PREVIOUS (different area, different property, unrelated intent) with no "
        "clear connection. False for natural follow-ups, comparisons, refinements, or "
        "clarifications — even if worded differently.\n"
        "Reply with ONLY JSON: {\"mode\":\"specific|full\",\"topic_changed\":true|false}"
    )
    messages = [
        {"role": "system", "content": sys},
        {"role": "user", "content": f"PREVIOUS: {prior}\n\nCURRENT: {message}"},
    ]
    try:
        resp = groq_client.chat.completions.create(
            model=FALLBACK_MODEL, messages=messages, temperature=0,
            max_tokens=50, response_format={"type": "json_object"},
        )
        data = json.loads(resp.choices[0].message.content.strip())
        mode = data.get("mode")
        if mode not in ("specific", "full"):
            mode = None
        return {"mode": mode, "topic_changed": bool(data.get("topic_changed", False))}
    except Exception as e:
        print(f"[ACQAR] intent classification error: {e}")
        return {"mode": None, "topic_changed": False}

DATA_VIZ_KEYWORDS = (
    "compare", "comparison", "breakdown", "by bedroom", "each bedroom",
    "price history", "show me", "chart", "graph", "table", "over time",
    "per sqft", "per sqm", "trend", "yield by", "price by",
)

def wants_data_visual(message: str) -> bool:
    m = message.strip().lower()
    return any(k in m for k in DATA_VIZ_KEYWORDS)



SPECIFIC_ANSWER_PROMPT = """You are ACQAR Intelligence. The user already has the full area report —
do NOT repeat it. Answer ONLY the specific question below.

Rules:
- The AREA DATA FACTS JSON has a "transaction_stats" object containing
  "bedroom_avg_psm" (price per sqm, keyed by "Studio"/"1 BR"/"2 BR"/etc.) and
  "median_price_by_bedroom" (median total sale price, same keys). If the
  question asks about price by bedroom/unit size, you MUST read these two
  nested fields and list each bedroom type found there with its number —
  never say the breakdown isn't available if bedroom_avg_psm has entries.
- If "project_search_term" is present in AREA DATA FACTS but "transaction_stats" 
  represents area-wide data (not project-specific — you can tell because the 
  reply would otherwise silently present area-wide numbers as if they were 
  specific to that project), your first bullet MUST state plainly that no 
  DLD-registered sales were found under that project/cluster name, and that 
  the figures shown are area-wide instead — before giving any numbers.
- If the question asks for an investment verdict, opinion, or "is this worth
  it / cheap for a reason" judgment, and "area_intelligence" in AREA DATA
  FACTS contains real values for gross_yield_pct, price_trend_pct, or
  distress_pct, your verdict MUST explicitly cite those exact numbers —
  do not write a generic mid-tier-developer risk assessment when specific
  DLD-derived numbers are available. A negative price_trend_pct or an
  elevated distress_pct are the most direct evidence for "cheap for a
  reason" and must be addressed head-on, not glossed over with vague
  language about "resale liquidity" or "cash flow" instead of the number
  itself.
- NEVER name a specific nearby infrastructure project, metro line, airport
  expansion, road, or any other catalyst UNLESS it appears in the
  "area_catalysts" list in AREA DATA FACTS. If area_catalysts is empty or
  absent, say plainly that no confirmed catalysts are on record for this
  area rather than naming a plausible-sounding real-world project — an
  invented catalyst is a fabrication even if the project genuinely exists
  somewhere in Dubai, because it is not verified as relevant to THIS area
  in the data you were given.
- If "user_stated_unit_sqft" is present, calculate an estimated price for
  THAT exact unit size by multiplying it by the matching bedroom type's
  AED/sqm from bedroom_avg_psm (convert sqft to sqm by dividing by 10.7639
  first, since bedroom_avg_psm is priced per sqm). State this as "For a
  [size] sqft [bedroom type] here, that's approximately AED [X]" and clearly
  label it as an estimate derived from the real per-sqm rate for THIS
  project — not a direct DLD sale of that exact size.
- To convert AED/sqm to AED/sqft, divide by 10.7639.
- The AREA DATA FACTS JSON has a "developer_track_records" list — each entry
  has developer_name, on_time_pct, star_rating, total_projects, market_segment.
  If asked to compare/list developers, use ONLY the developers present in
  that list, with ONLY the numbers given there. NEVER add a developer that
  isn't in developer_track_records, and NEVER invent price ranges, project
  counts, or percentages for any developer — those fields are not provided
  and must not be fabricated. If developer_track_records is empty, say
  developer data isn't available for this area rather than making it up.
  Generic statements about "mid-tier developer risk" or "typical delivery
  risk" are not a substitute for the real gross_yield_pct/price_trend_pct/
  distress_pct numbers when those are present — lead with the numbers,
  and only add developer-track-record commentary as a secondary point if
  developer_track_records actually has entries.
- If the question asks for a specific BUILDING, PROJECT, or DEVELOPMENT to
  buy into (e.g. "best building", "which development", "the address that
  matters"), you MUST name an actual project from "top_projects_by_volume"
  (ranked by real DLD transaction count — the top entry is the area's most
  established, most liquid address) or "active_off_plan_projects" (current
  launches). NEVER say you can't recommend a building if either list has
  entries. If the question signals prestige/status rather than yield,
  weight your pick toward the project with the strongest developer track
  record in "developer_track_records" (star_rating, on_time_pct) combined
  with the highest transaction volume, and say explicitly why. If BOTH
  lists are empty, say plainly that project-level DLD data isn't available
  for this area yet — never invent a building name.
- If the question is about something the data doesn't cover (legal rules, visa
  eligibility, financing regulations, process steps, etc.), answer from accurate
  general Dubai real-estate knowledge - do not say "I don't have data," just answer
  it correctly. "Correctly" means accurate general principles. You MUST NOT
  invent or state ANY specific legal citation (law numbers, article numbers,
  regulation numbers like "RERA Regulation No. X" or "Article Y of Law No. Z")
  and MUST NOT state any specific numeric deadline, limitation period, or
  monetary threshold (e.g. "6 months," "2 years," "AED 500,000") for legal
  processes. This rule has NO exception — do not include these even if you
  believe them correct. Instead say the process/protection exists in general
  terms and instruct the user to confirm exact citations, deadlines, and
  thresholds with RERA/DLD or a licensed UAE lawyer.
- When telling the user where to verify something (a developer's standing, an
  escrow account, a permit, a platform's regulatory status, etc.), describe the
  TYPE of source generically with "e.g." examples rather than confidently naming
  ONE specific portal/system as THE definitive place to check — unless you are
  certain that system is correct and current for that exact purpose. If unsure,
  say "confirm the exact portal/system with RERA/DLD directly."
- CONSISTENCY: if you hedge a named regulator or portal anywhere in your answer
  (e.g. in a reference table), you MUST use that exact same hedge every other
  time you reference it — in bullets, action-plan steps, AND the closing
  CTA/insight. Stating something as unqualified fact in one place ("ensure it's
  registered with the DFSA") while hedging it elsewhere ("confirm the exact
  portal with RERA/DLD") is a self-contradiction and a failure of this rule —
  pick the hedge, then apply it everywhere that name appears, including any
  closing action line.
- NEVER state specific figures (minimum investment amount, historical/
  projected returns %, fees, AUM, project count) for a named third-party
  commercial platform (e.g. a fractional-ownership app, brokerage, or
  investment portal) unless those exact figures appear in the Verified
  reference framework passed to you. This applies even if the user named
  the platform first — naming it back to acknowledge the question is fine,
  citing numbers for it is not. NEVER tell the user to sign up, open an
  account, or register on that platform either way. If relevant, describe
  the category generically ("some fractional-ownership platforms offer...")
  and direct the user to confirm minimums/returns/fees on the platform's
  own site.
- This also covers unqualified claims of legal authority without a citation,
  e.g. "the bank must provide X" or "UAE law requires Y" — do not assert what
  a law or institution permits or requires unless you can name the specific,
  verified source; otherwise hedge with "generally" or "typically."
- For contract-default / forfeiture questions specifically: you MUST present
  BOTH sides — (a) the real risk, that a developer can pursue termination
  and retain some payments, AND (b) that Dubai regulation generally caps/
  limits retention rather than allowing unlimited forfeiture (describe the
  cap qualitatively — tied to construction stage — never as a flat "you
  lose everything"). Presenting only the worst-case outcome as the whole
  picture is a failure, especially when the AREA DATA FACTS or question
  signals financial vulnerability (fixed income, "can I afford this,"
  "will I lose everything").
- For "why did X happen" questions where the actual cause cannot be determined
  from the information given (e.g. a bank/agency's internal decision), do NOT
  assert a single definitive cause as fact. List the 2-3 most common causes
  as possibilities ("this is typically due to A, B, or C") and instruct the
  user to request the specific reason in writing from the institution —
  rather than picking one plausible mechanism and presenting it as the
  confirmed explanation.
- NEVER describe one property-linked visa product as a required
  prerequisite stage for another (e.g. "first get a standard visa, live in
  Dubai 6 months, then apply for the Golden Visa") unless that exact
  sequential dependency is explicitly stated in the
  verified_reference_framework passed to you. Treat the Golden Visa and the
  standard investor visa as alternative products a buyer chooses between,
  not sequential steps, unless told otherwise.
- NEVER invent, name, or describe any property-linked visa or residency
  product that is not one of the two products explicitly named in
  verified_reference_framework (the long-term Golden Visa and the standard
  property investor visa). Do not introduce a third product (e.g. an
  "interim residency visa," a "provisional visa," a "3-year residency
  visa tied to the property") as a required stage, prerequisite, or
  intermediate step. If you do not have documented information about a
  process stage, omit that stage entirely rather than inventing one to
  fill a gap.
- Do NOT state a specific AED property-value threshold for the Golden Visa
  or standard investor visa as settled fact under any circumstances, not
  even hedged with an approximate qualifier — this includes numbers you
  recall from training that may now be outdated or wrong. Always phrase it
  as "a minimum property value applies (confirm the current figure with
  GDRFA/DLD)" — never write a specific number like "AED 1 million" or
  "AED 2 million," even as an illustrative example.
- Visa/residency questions: Dubai has multiple distinct property-linked visa
  products (e.g. a long-term Golden Visa vs a shorter standard investor visa)
  with DIFFERENT eligibility timing rules. NEVER merge them into a single
  undifferentiated "the investor visa" answer — if the question doesn't
  specify which one, briefly name both and give the correct pre-handover
  eligibility for EACH separately. When more than one visa type is relevant,
  lead with a markdown table (pipe-delimited, with a "---|---|---|---"
  separator row) with columns Visa Type | Validity | Off-Plan Qualified
  Before Handover? | Key Requirements, then explain in bullets below it.
  Never put a specific AED number inside a table cell as settled fact —
  use "a set minimum (confirm with GDRFA/DLD)" instead. If a
  "verified_reference_framework" for visas is present in AREA DATA FACTS,
  follow its structure exactly rather than inventing your own AED
  thresholds. Never state as settled fact whether selling a qualifying
  property causes automatic loss, a grace period, or continued validity —
  this is case-specific and depends on current GDRFA practice; say so
  explicitly and direct the user to confirm with GDRFA/DLD or an
  immigration lawyer, the same way you'd hedge a legal citation.
  If "user_stated_foreign_currency" is present in AREA DATA FACTS (has "usd"
  and "aed_approx"), your FIRST bullet must state the approximate AED
  conversion as its own clean sentence (e.g. "Your $1M converts to roughly
  AED 3.67M at current exchange rates"), labeled as an approximation, and
  never nest that conversion inside the same parenthesis as an unrelated
  hedge — write the conversion and the threshold hedge as two separate
  clauses, never "$1M (≈a set minimum...)" style constructions.
- If "requires_visa_cost_tradeoff_verdict" is true in AREA DATA FACTS, this
  is a HARD STRUCTURAL REQUIREMENT, not a style suggestion: your "reply"
  MUST open with a section literally titled "💰 IS IT WORTH IT?" placed
  BEFORE the visa comparison table, containing exactly this verdict in
  your own words: state plainly that the visa is pass/fail (a property
  either clears the minimum or it doesn't — there is no bonus for spending
  more), so the capital-efficient move is a minimum-spec freehold unit at
  or near the threshold, and that paying more than the minimum ONLY makes
  sense if the pricier unit has its own independent investment case (yield,
  appreciation potential, personal use) — never because it helps with the
  visa itself, since it doesn't. This verdict must be a real answer to
  "is it worth it," not a restatement like "a cheaper unit can also meet
  the threshold" — that sentence alone does NOT satisfy this requirement.
  If you output a reply for this case that does not contain this explicit
  verdict as its own section before the table, you have failed the task.
- This ban applies EQUALLY to "summary" and "insight" — do not compress the
  answer into "X days" or "the Y-day window" in those fields even as
  shorthand, even if you hedged correctly in "reply". If "reply" says a
  deadline is uncertain, "summary" and "insight" must carry that same
  hedge (e.g. "you can enforce it via RERA or court — confirm exact
  deadlines with a lawyer"), never restate a specific number as settled fact.
- If the specific number the user asked for is missing from the AREA DATA
  FACTS (rent, price, yield, developer stats, catalyst info, or anything
  else), do NOT say the data isn't available and stop there. Instead, give a
  realistic estimate using general Dubai real-estate market knowledge for
  that area/bedroom type, and clearly label it as a market estimate rather
  than a verified DLD figure — e.g. "DLD doesn't have registered rent
  contracts for this area yet, but based on typical Dubai market rates, a 1BR
  in JVC usually rents for approximately AED X–Y/year." Never invent a fake
  DLD contract count, transaction count, or pretend an estimate is registered
  data — the distinction between "real DLD data" and "market estimate" must
  always be explicit in the wording.
- The AREA DATA FACTS JSON may include "user_stated_price_aed" — a price the
  user themselves listed or was quoted. If present, your answer MUST directly
  compare that price against the most relevant DLD benchmark available
  (bedroom-specific median if present in median_price_by_bedroom, otherwise
  the area-wide average — and clearly say which one you're using), give an
  explicit percentage difference, and a direct verdict (too high / fair /
  underpriced). This comparison is the most important part of the answer —
  don't bury it under general advice.
- If "has_unverified_second_area" is true in AREA DATA FACTS, the question
  compares the verified area above against a second area you have NO DLD
  data for.
  - DEFAULT (when "allow_rough_estimate" is false): Do NOT invent specific
    price/sqm, median price, or yield figures for that second area — not
    even labeled as "estimate." State plainly that you don't have verified
    DLD data for it, and offer to pull a shortlist of areas you do have
    real data for as an alternative.
  - OPT-IN (when "allow_rough_estimate" is true, meaning the user explicitly
    asked for a rough number anyway): If "cached_second_area_estimate" is
    present, you MUST reuse those exact same figures verbatim — do not
    regenerate or vary them. If it is absent, you may give ONE rough,
    round-number estimate (e.g. "roughly AED 10,000/sqm", not a precise
    figure like "AED 10,247/sqm" — precision implies verified data) using
    general Dubai market knowledge, and you MUST label it clearly as an
    unverified estimate every single time you state it, not just once at
    the top of the answer.
- If "price_verdict" is present in the facts JSON and not null, you MUST use
  its verdict/diff_pct/benchmark values exactly as given — do not recompute
  or re-derive the comparison yourself.
- If the user's message points out an inconsistency, contradiction, or error
  in your own prior response (e.g. two different numbers shown for what
  should be the same benchmark, or a figure that doesn't match a table shown
  elsewhere), you MUST address it directly and explicitly as the FIRST part
  of your reply — state plainly which figure is correct/more reliable and
  briefly why, before anything else. Do NOT ignore the correction and pivot
  straight to a new question or a generic closing_question; acknowledging
  the discrepancy takes priority over offering a new follow-up.
- Property type: if "user_property_type" is present in AREA DATA FACTS
  (Villa/Townhouse/Apartment), your primary recommendation and headline
  price/yield figures MUST come from that property type only. If
  "property_type_filtered" is false (no matching sales found for that
  type), say plainly that you don't have verified DLD data for that
  specific property type in this area — do NOT substitute apartment
  bedroom-count data as if it answers a villa/townhouse question. Never
  pick "highest yield-to-price ratio" unit type as the headline
  recommendation when the user named a specific property type — answer
  their type, not the best-yielding one.
- Service charges: if "verified_reference_framework" for service charges is
  present in AREA DATA FACTS, follow it exactly. NEVER express a service
  charge as a percentage of the unit's rental income (e.g. "0.5-1% of
  rent") — Dubai service charges are set per AED/sqft of built-up area or
  as a rough percentage of PROPERTY VALUE, never of rent. If you need to
  show impact on rental yield, subtract the AED/year charge from the AED
  rent directly, never compute it as a rent percentage. If a prior turn in
  this conversation already stated a service-charge estimate for the same
  unit/area, reuse that same figure rather than deriving a new, different
  one.
- The AREA DATA FACTS JSON's "area_intelligence" object contains the ONLY
  verified gross_yield_pct, price_trend_pct, and truvalu_psm for this area.
  If you mention yield, price trend, or price/sqm anywhere in your answer,
  you MUST use these exact figures — NEVER state a different derived yield,
  a different "Dubai average" benchmark, or a different price/sqm figure
  for the same area in the same response. The Dubai-wide average gross
  yield benchmark is 6.1% — never substitute a different Dubai-average
  number. If area_intelligence doesn't contain a figure you'd like to
  cite, say the data isn't available rather than estimating a plausible
  substitute — a specific-sounding number reads as verified even when it
  isn't, and users cannot tell it apart from the real DLD data shown
  elsewhere in the same response.
- Do NOT cite specific historical year data (e.g. "2023 average price was
  X," "2024 Q1 trend was Y%") unless that exact year and figure appear in
  "price_history_by_year" or "transaction_stats" in AREA DATA FACTS. Your
  training data may contain outdated Dubai real-estate figures from years
  before the current data shown in this response — stating them alongside
  real current-year figures without any distinction misleads the user into
  treating stale numbers as live ones. If you don't have provided historical
  data for a specific year, describe the trend qualitatively instead (e.g.
  "prices have grown steadily over recent years") or omit it.
- If the question asks for a total timeframe, duration, or "how long until
  X," and you have a genuine basis for the individual phases (i.e. they're
  supported by verified_reference_framework or other provided facts), your
  reply's first bullet MUST state a single bottom-line range before any
  phase-by-phase breakdown — never make the user infer the total themselves.
  If you do NOT have a real basis for the individual phases (e.g. GDRFA/DLD
  processing speed is not something you have verified data on), do NOT
  invent a fabricated multi-step timeline to satisfy this rule — instead
  state plainly that you don't have a verified processing-time breakdown,
  give only the structural eligibility facts you do have, and direct the
  user to GDRFA/DLD for actual current timelines.
- Write in plain, everyday language — say "typical price" instead of the
  technical term "median," say "price per square meter/foot" instead of
  "psm/psf" on first use, and avoid jargon a non-expert wouldn't know.
- If you calculate or estimate any price/benchmark range in your answer, your
  final verdict (too high / fair / underpriced) MUST be logically consistent
  with where the user's stated price falls within that range. If the user's
  price falls within or below your calculated range, do NOT call it "too
  high" — say it looks fair or possibly underpriced instead. Double-check this
  before finalizing your answer.
- NEVER write flowing paragraphs. Every sentence goes on its own line, starting
  with "• ". A wall of prose is a hard failure of this prompt — even a 2-sentence
  answer must be two separate bullet lines, not one paragraph.
- If the answer groups items into categories (e.g. red flags, risk types), put
  each category name on its own line wrapped in double asterisks, e.g.
  "**Pricing Anomalies**", and start each bullet under it with a short bold
  lead-in phrase followed by a colon, e.g. "• **Under-Market Pricing:** ...".
- Do NOT build a "RECENT TRANSACTIONS" or "PRICE BY BEDROOM TYPE" table yourself —
  these are appended automatically after your reply. Just answer the question in
  bullets; do not mention or summarize the raw transaction/bedroom data as a table.
- Keep it tight: answer the actual question first in 2-4 bullets, then the
  recent transactions section, then the bedroom table if data supports it.
  No paragraphs anywhere, no repeated full area report.
- "summary" is REQUIRED and must never be empty — always give a one-sentence version of the answer there.
- "summary" must be phrased differently from the first line(s) of "reply" —
  do not copy the DIRECT ANSWER bullet verbatim into summary. They render
  in different places in the UI, so exact duplication reads as a bug to
  the user.
- Also output "closing_question": one short, natural follow-up specific to what
  THIS answer covered (e.g. a legal answer offers to help draft a demand letter
  or explain next steps; a price-verdict answer offers to check a different
  bedroom size or another area). Do NOT default to a generic bedroom/area
  question unless the question was genuinely about bedroom types or areas.
- Output JSON only: {"summary":"","reply":"","insight":"","closing_question":""}

- If "prior_assistant_reply_do_not_repeat" is present in AREA DATA FACTS,
  your reply must NOT reprint the visa comparison table, the visa mechanics
  verdict, or content substantially the same as that prior text — the user
  has already seen it. Either deliver the new content actually promised (a
  real list, real areas, real next steps) or ask one short clarifying
  question if a required detail (like area) is missing. A near-duplicate of
  the prior reply is a failed response.
"""
def render_recent_transactions_table(txns: list) -> list:
    if not txns: return []
    lines = ["\n📋 RECENT TRANSACTIONS — Real DLD Closed Sales"]
    lines.append("| Type | Price | AED/sqm | Project | Date |")
    lines.append("|------|-------|---------|---------|------|")
    for t in txns:
        br = _room_label(t.get("rooms_en")) or "—"
        worth = t.get("actual_worth")
        if not worth and t.get("price_per_sqm") and t.get("procedure_area"):
            worth = float(t["price_per_sqm"]) * float(t["procedure_area"])
        price = fmt_aed(worth) if worth else "—"
        psm = fmt_psm(t.get("price_per_sqm")) if t.get("price_per_sqm") else "—"
        project = t.get("project_name_en") or "—"
        y, m = t.get("sale_year"), t.get("sale_month")
        date_str = f"{y}-{int(m):02d}" if y and m else "—"
        lines.append(f"| {br} | {price} | {psm} | {project} | {date_str} |")
    return lines


def render_bedroom_breakdown_table(stats: dict, bedrooms: str = None) -> list:
    bpsm = stats.get("bedroom_avg_psm", {}) or {}
    bmed = stats.get("median_price_by_bedroom", {}) or {}
    br_order = ["Studio", "1 BR", "2 BR", "3 BR", "4 BR", "5 BR"]
    if bedrooms and bedrooms in br_order:
        br_order = [bedrooms] + [b for b in br_order if b != bedrooms]
    rows = [br for br in br_order if br in bpsm or br in bmed]
    if not rows: return []
    lines = ["\n📊 PRICE BY BEDROOM TYPE — Real DLD Data"]
    lines.append("| Type | AED/sqm | Typical Price |")
    lines.append("|------|---------|--------------|")
    for br in rows:
        psm_str = fmt_psm(bpsm[br]) if br in bpsm else "—"
        med_str = fmt_aed(bmed[br]) if br in bmed else "—"
        lines.append(f"| {br} | {psm_str} | {med_str} |")
    return lines


def build_transactions_only_reply(ctx: dict, bedrooms: str = None) -> str:
    """Deterministic reply for pure transaction-listing queries — never
    calls the LLM, so it can't fail the way build_specific_answer can.
    Does NOT embed a markdown table — the frontend renders its own
    RECENT TRANSACTIONS / PRICE BY BEDROOM widgets from the
    recent_transactions / bedroom_avg_psm / median_price_by_bedroom
    fields already attached to the result dict. Embedding a table here
    too would duplicate it (see SPECIFIC_ANSWER_PROMPT's same rule)."""
    area = ctx.get("detected_area", "this area")
    proj = ctx.get("_searched_project_name")
    txns = ctx.get("recent_transactions", [])
    lines = ["📌 DIRECT ANSWER"]
    if proj:
        lines.append(f"• Showing real DLD closed sales for {proj} in {area} — not the wider shared zone")
    else:
        lines.append(f"• Showing real DLD closed sales in {area}")
    if not txns:
        lines.append("• No recent DLD-registered transactions found for this exact filter")
    else:
        lines.append(f"• {len(txns)} recent transactions pulled up below")
    return "\n".join(lines)


def compute_price_verdict(user_price, bedroom_med, recent_txns, bedrooms):
    if user_price is None:
        return None
    benchmark = bedroom_med.get(bedrooms) if bedrooms else None
    source = f"{bedrooms} median" if benchmark else None
    if not benchmark and recent_txns:
        matched = [t for t in recent_txns if _room_label(t.get("rooms_en")) == bedrooms]
        worths = [t["actual_worth"] for t in matched if t.get("actual_worth")]
        if worths:
            benchmark = median_val(worths)
            source = f"{bedrooms} recent transactions"
    if not benchmark:
        return None
    diff_pct = round((user_price - benchmark) / benchmark * 100, 1)
    verdict = "too high" if diff_pct > 15 else "fair" if diff_pct > -5 else "underpriced"
    return {"benchmark": benchmark, "source": source, "diff_pct": diff_pct, "verdict": verdict}

def build_specific_answer(question: str, context_data: dict, bedrooms: str, prior_reply: str = None) -> dict:
    facts = {
        "area": context_data.get("detected_area"),
        "project_search_term": context_data.get("_searched_project_name"),
        "user_stated_foreign_currency": extract_foreign_currency_amount(question),
        "prior_assistant_reply_do_not_repeat": prior_reply,
        "user_property_type": context_data.get("user_property_type"),
        "property_type_filtered": context_data.get("property_type_filtered"),
        "has_unverified_second_area": context_data.get("_unverified_comparison_area", False),
        "allow_rough_estimate": context_data.get("_allow_rough_estimate", False),
        "cached_second_area_estimate": context_data.get("_cached_second_area_estimate_text"),
        "user_stated_price_aed": context_data.get("user_budget_aed"),
        "user_stated_unit_sqft": context_data.get("user_unit_sqft"),
        "area_intelligence": context_data.get("area_intelligence", {}),
        "transaction_stats": context_data.get("transaction_stats", {}),
        "rental_stats": context_data.get("rental_stats", {}),
        "developer_track_records": context_data.get("developer_track_records", []),
        "area_catalysts": context_data.get("area_catalysts", []),
        "recent_transactions": context_data.get("recent_transactions", []),
        "top_projects_by_volume": context_data.get("top_projects", []),
        "active_off_plan_projects": (context_data.get("area_intelligence") or {}).get("active_project_names", []),
        "requested_bedroom_type": bedrooms,
        "price_verdict": compute_price_verdict(
            context_data.get("user_budget_aed"),
            context_data.get("transaction_stats", {}).get("median_price_by_bedroom", {}),
            context_data.get("recent_transactions", []),
            bedrooms,
        ),
    }
    if is_investment_verdict_query(question.lower()):
        facts["is_investment_verdict_question"] = True
    if any(k in question.lower() for k in VISA_QUERY_KEYWORDS) and is_visa_cost_tradeoff_query(question.lower()):
        facts["requires_visa_cost_tradeoff_verdict"] = True
    if any(k in question.lower() for k in OFFPLAN_DEFAULT_KEYWORDS):
        facts["verified_reference_framework"] = OFFPLAN_DEFAULT_FACTS
    if any(k in question.lower() for k in VISA_QUERY_KEYWORDS):
        facts["verified_reference_framework"] = VISA_RULES_FACTS

    if any(k in question.lower() for k in BUYER_PROTECTION_KEYWORDS):
        facts["verified_reference_framework"] = BUYER_PROTECTION_FACTS
    if any(k in question.lower() for k in SERVICE_CHARGE_KEYWORDS):
        facts["verified_reference_framework"] = SERVICE_CHARGE_FACTS

    if any(k in question.lower() for k in FRACTIONAL_INVESTING_KEYWORDS):
        facts["verified_reference_framework"] = FRACTIONAL_INVESTING_FACTS
    def call(model, facts_payload):
        msgs = [
            {"role": "system", "content": SPECIFIC_ANSWER_PROMPT},
            {"role": "user", "content": f"AREA DATA FACTS:\n{json.dumps(facts_payload, default=str)}\n\nQUESTION: {question}"},
        ]
        resp = groq_client.chat.completions.create(
            model=model, messages=msgs, temperature=0.2,
            max_tokens=2200, response_format={"type": "json_object"},
        )
        return resp.choices[0].message.content.strip()

    try:
        try:
            raw = call(PRIMARY_MODEL, facts)
        except Exception:
            # FALLBACK_MODEL has an 8000 TPM cap shared across ALL Groq calls
            # in this org (translate, intent classification, grading calls,
            # etc.) — trim the facts payload before retrying so this call
            # alone doesn't blow the budget on top of everything else.
            trimmed_facts = dict(facts)
            trimmed_facts["recent_transactions"] = facts.get("recent_transactions", [])[:3]
            trimmed_facts["developer_track_records"] = facts.get("developer_track_records", [])[:3]
            trimmed_facts["area_catalysts"] = facts.get("area_catalysts", [])[:2]
            prior = trimmed_facts.get("prior_assistant_reply_do_not_repeat")
            if prior and len(prior) > 300:
                trimmed_facts["prior_assistant_reply_do_not_repeat"] = prior[:300] + "…(truncated)"
            trimmed_facts.pop("rental_stats", None)
            raw = call(FALLBACK_MODEL, trimmed_facts)
        return extract_json(raw)
    except Exception as e:
        print(f"[ACQAR] specific-answer error: {e}")
        return {"summary": "", "reply": "Sorry, I hit an error answering that — could you rephrase?", "insight": ""}


def scrub_legal_citations(text: str, short: bool = False, force: bool = False) -> str:
    if text and "ACQAR Note" not in text and (
        force or LEGAL_CITATION_PATTERN.search(text)
        or LEGAL_OBLIGATION_PATTERN.search(text)
        or PORTAL_NAME_PATTERN.search(text)
    ):
        note = (
            " (verify exact deadlines, figures, and thresholds with RERA/DLD, a UAE lawyer, or the relevant platform)" if short else
            "\n\n⚠️ **ACQAR Note: specific law/article numbers, named portals/systems, deadlines, financial ratios, "
            "service charge rates, and visa timeframes/thresholds above should be independently verified with "
            "RERA/DLD, a licensed UAE lawyer, or the relevant platform before you rely on them.**"
        )
        text += note
    return text


def scrub_fabricated_metrics(text: str, short: bool = False) -> str:
    """Flags invented financial/operational thresholds (e.g. 'debt-to-equity
    above 1.5') that ACQAR has no data source for — these are hallucinated
    even when phrased as a plausible rule of thumb."""
    if text and "ACQAR Note" not in text and FABRICATED_METRIC_PATTERN.search(text):
        note = (
            " (treat any specific ratio/percentage thresholds above as illustrative, not verified)" if short else
            "\n\n⚠️ **ACQAR Note: specific financial ratios or percentage thresholds above are illustrative, "
            "not verified figures from a developer's actual financials — confirm independently before relying on them.**"
        )
        text += note
    return text

def scrub_visa_thresholds(text: str, is_visa_query: bool) -> str:
    """Prevents inconsistent AED visa thresholds (e.g. AED 2M vs AED 5M
    across turns) from ever reaching the user — VISA_RULES_FACTS hedges the
    prompt, but nothing stops the LLM from inventing a figure anyway."""
    if not (is_visa_query and text):
        return text

    def _replace(m):
        # Skip matches already sitting inside an open parenthesis (e.g.
        # "$1M (≈AED 3.67M)") — substituting inside an existing parenthetical
        # produces broken, nested-paren text. Leave those untouched; the
        # unhedged figure inside a currency-conversion aside is low-risk
        # since it's the user's own converted number, not an asserted threshold.
        start = m.start()
        if text[:start].count("(") > text[:start].count(")"):
            return m.group(0)
        # The pattern now also consumes a leading article/quantifier
        # ("a", "an", "one", "a single") when present, right along with the
        # AED figure — this prevents leftover double-articles like
        # "a single AED 2M property" -> "a single a set minimum (...) property".
        # Since the article is now part of the match, the replacement text
        # (which supplies its own article) is grammatically correct on its own.
        return "a set minimum (confirm current figure with GDRFA/DLD)"

    return VISA_AED_THRESHOLD_PATTERN.sub(_replace, text)


def scrub_visa_retention_claims(text: str, is_visa_query: bool) -> str:
    """Visa continuity/loss-on-sale is not a settled fact in VISA_RULES_FACTS
    — flag unhedged claims about keeping/losing the visa after selling the
    qualifying property, since this varies by case and GDRFA practice."""
    if is_visa_query and text and VISA_RETENTION_CLAIM_PATTERN.search(text) \
            and "confirm" not in text.lower() and "GDRFA" not in text:
        text += (
            "\n\n⚠️ **ACQAR Note: whether selling your qualifying property "
            "affects your Golden Visa status depends on your specific visa "
            "terms and current GDRFA practice — confirm directly with "
            "GDRFA/DLD or an immigration lawyer before selling.**"
        )
    return text

def scrub_visa_timeframes(text: str, is_visa_query: bool) -> str:
    """Flags invented specific week/month processing timeframes for visa
    steps — GDRFA/DLD processing speed is not something ACQAR has verified
    data on, so a precise 'X-Y weeks' figure is fabricated even when it
    sounds plausible."""
    if not (is_visa_query and text) or "ACQAR Note" in text:
        return text
    if VISA_TIMEFRAME_PATTERN.search(text):
        text += (
            "\n\n⚠️ **ACQAR Note: the processing timeframes above are rough, "
            "unverified estimates — actual GDRFA/DLD processing times vary "
            "by case; confirm current timelines with GDRFA/DLD or an "
            "immigration lawyer.**"
        )
    return text

def scrub_platform_ctas(text: str) -> str:
    """Strips CTAs that pair a named third-party commercial platform with a
    sign-up/account prompt — ACQAR has no disclosed relationship with these
    platforms, so this reads as an undisclosed endorsement plus unverified
    stats."""
    if text and THIRD_PARTY_PLATFORM_PATTERN.search(text):
        text = THIRD_PARTY_PLATFORM_PATTERN.sub(
            r"\1 (confirm current terms directly with the provider)", text
        )
    return text

def scrub_platform_stats(text: str, short: bool = False) -> str:
    """Flags named third-party platform + unverified figure combos that have
    no accompanying sign-up CTA nearby, so scrub_platform_ctas wouldn't
    catch them (e.g. 'Smartcrowd let you start with as little as AED 5,000')."""
    if text and "ACQAR Note" not in text and THIRD_PARTY_PLATFORM_STAT_PATTERN.search(text):
        note = (
            " (figures for third-party platforms above are not independently verified — confirm on the platform's own site)" if short else
            "\n\n⚠️ **ACQAR Note: figures cited for third-party investment platforms above "
            "are not independently verified — confirm current minimums, fees, and returns "
            "directly on the platform's own site or app before relying on them.**"
        )
        text += note
    return text


def scrub_fractional_category_stats(text: str, short: bool = False) -> str:
    """Flags fractional/crowdfunding SECTOR statistics (total capital raised,
    investor counts, yield ranges, fee %) stated as fact with no platform
    name in proximity — the pattern that slipped past scrub_platform_stats
    because the number and the trigger word were >80 chars apart."""
    if text and "ACQAR Note" not in text and FRACTIONAL_CATEGORY_STAT_PATTERN.search(text):
        note = (
            " (fractional/crowdfunding sector figures above are not verified — confirm independently)" if short else
            "\n\n⚠️ **ACQAR Note: figures describing the fractional/crowdfunding real estate "
            "sector above (capital raised, investor counts, yield ranges, fees) are not "
            "independently verified — confirm current numbers directly with the relevant "
            "platform(s) before relying on them.**"
        )
        text += note
    return text

SERVICE_CHARGE_PCT_OF_RENT_PATTERN = re.compile(
    r'\d+(?:\.\d+)?\s*[-–—]?\s*\d*(?:\.\d+)?\s*%\s*of\s+(?:the\s+)?(?:annual\s+)?rent\b',
    re.IGNORECASE
)

def scrub_service_charge_basis(text: str, short: bool = False) -> str:
    """Catches service charges expressed as a % of rent — not how Dubai
    service charges are actually set (they're AED/sqft of built-up area,
    or roughly % of property value). This framing produces figures an
    order of magnitude too small and has slipped through as a fabricated
    benchmark before."""
    if text and "ACQAR Note" not in text and SERVICE_CHARGE_PCT_OF_RENT_PATTERN.search(text):
        note = (
            " (service charges are set per sqft or % of property value, not % of rent — confirm the exact rate on your OA statement)" if short else
            "\n\n⚠️ **ACQAR Note: service charges in Dubai are set as AED per sqft of built-up "
            "area (or roughly as a % of property value) — not as a percentage of rent. Confirm "
            "the exact rate on your owners association statement or the RERA service charge index.**"
        )
        text += note
    return text



def build_rental_section(ctx: dict) -> list:
    rent = ctx.get("rental_stats")
    if not rent: return []
    lines = ["\n🏠 RENTAL MARKET DATA — Real DLD Ejari Contracts"]
    if rent.get("count"): lines.append(f"• Based on {rent['count']} real rental contracts registered with DLD")
    if rent.get("avg_annual_rent"): lines.append(f"• Average annual rent: {fmt_aed(rent['avg_annual_rent'])}")
    if rent.get("median_annual_rent"): lines.append(f"• Median annual rent: {fmt_aed(rent['median_annual_rent'])}")
    for br in ["Studio", "1 BR", "2 BR", "3 BR", "4 BR", "5 BR"]:
        d = rent.get("rent_by_bedroom", {}).get(br)
        if d: lines.append(f"• {br}: Avg {fmt_aed(d['avg'])}/yr · Median {fmt_aed(d['median'])}/yr ({d['count']} contracts)")
    rtype = rent.get("rent_by_type", {})
    if rtype:
        top = sorted(rtype.items(), key=lambda x: -x[1])[:3]
        lines.append(f"• By property type: {' · '.join(f'{k}: {fmt_aed(v)}/yr' for k, v in top)}")
    vr = rent.get("new_vs_renewed", {})
    if vr: lines.append(f"• Lease mix: {' · '.join(f'{k}: {v}' for k, v in vr.items())}")
    return lines


CLOSING_QUESTIONS = {
    "buyer":    "Want a breakdown by bedroom type, or a comparison with another area?",
    "seller":   "Want me to benchmark this against a specific recent sale, or check another area?",
    "investor": "Want a breakdown by bedroom type, or a yield comparison against another area?",
    "broker":   "Need comps for a specific client budget, or another area pulled for comparison?",
    "general":  "Want more detail on a specific bedroom type, or a comparison with another area?",
}

def build_closing_question(user_type: str, ctx: dict, bedrooms: str = None, prior_reply: str = None) -> str:
    q = _build_closing_question_inner(user_type, ctx, bedrooms)
    if prior_reply and q and q.strip().lower() in prior_reply.lower():
        return None
    return q


def _build_closing_question_inner(user_type: str, ctx: dict, bedrooms: str = None) -> str:
    area = ctx.get("detected_area")

    if ctx.get("_is_visa_query"):
        return "Want a checklist of the documents to prepare in advance, or a deeper look at any one step?"

    if ctx.get("_is_legal_fallback"):
        return "Want help drafting the demand letter, or more detail on the RERA complaint process?"

    if ctx.get("_lifestyle_tags"):
        ref = ctx.get("_commute_ref_name")
        if ref:
            return f"Want me to widen the search beyond {ref}, or narrow it by budget?"
        return "Want me to narrow this down by budget, or a specific bedroom size?"

    comp_keys = [k for k in ctx if k.startswith("comparison_")]
    if comp_keys:
        names = []
        for k in comp_keys:
            sub = ctx[k]
            n = (sub.get("area_intelligence") or {}).get("area_name_en") or sub.get("detected_area")
            if n: names.append(n)
        if len(names) >= 2:
            return f"Want me to bring in a third area alongside {names[0]} and {names[1]}?"
        return "Want me to bring in a third area for comparison?"

    if ctx.get("strategy_candidate_areas"):
        return "Want a hybrid split calculated (e.g. one core asset + several mid-market units), or a deeper look at one of these candidate areas?"
    if ctx.get("budget_search_areas"):
        br = bedrooms or "2 BR"
        return f"Want me to narrow this to one specific area, or check {br} pricing in one of these?"

    top_list = ctx.get("top_yield_areas") or ctx.get("top_areas")
    if top_list:
        name = top_list[0].get("area_name_en")
        if name:
            return f"Want a deeper dive into {name}, or a different budget/yield range?"
        return "Want me to filter these by budget or bedroom type?"

    if area:
        if bedrooms:
            return f"Want me to compare {area} against another area, or check a different bedroom size?"
        return f"Want a breakdown by bedroom type in {area}, or a comparison with another area?"

    return CLOSING_QUESTIONS.get(user_type, CLOSING_QUESTIONS["general"])

def build_general_reply(ctx: dict, bedrooms: str) -> str:
    intel = ctx.get("area_intelligence", {})
    stats = ctx.get("transaction_stats", {})
    area  = ctx.get("detected_area", "this area")
    hist  = ctx.get("price_history_by_year", {})
    cats  = ctx.get("area_catalysts", [])
    lines = []

    lines.append("📌 QUICK ANSWER")
    verdict = intel.get("verdict", "BUY"); score = intel.get("investment_score")
    lines.append(f"• {area} is an active Dubai residential market with strong transaction volume")
    lines.append(f"• Verdict: {verdict}" + (f" — Investment Score {score}/100" if score else ""))

    yld = intel.get("gross_yield_pct"); trend = intel.get("price_trend_pct"); rank = intel.get("ranking_rank")
    distress = intel.get("distress_pct")
    snapshot_lines = []
    if score:   snapshot_lines.append(f"• Investment Score: {score}/100")
    if yld:     snapshot_lines.append(f"• Gross Yield: {yld}%")
    if trend is not None: snapshot_lines.append(f"• Price Trend: {'+' if float(trend)>0 else ''}{trend}% year-on-year")
   
    if distress: snapshot_lines.append(f"• Distress Sales: {distress}%")
    if snapshot_lines:
        lines.append("\n📊 MARKET SNAPSHOT"); lines.extend(snapshot_lines)

    bpsm = stats.get("bedroom_avg_psm", {}); bmed = stats.get("median_price_by_bedroom", {})
    price_lines = []
    if stats.get("avg_price_sqm"): price_lines.append(f"• Average: {fmt_psm(stats['avg_price_sqm'])}")
    for br in ["Studio", "1 BR", "2 BR", "3 BR"]:
        if br in bpsm:
            line = f"• {br}: {fmt_psm(bpsm[br])}"
            if br in bmed: line += f" | Median: {fmt_aed(bmed[br])}"
            price_lines.append(line)
    if price_lines:
        lines.append("\n💰 PRICES"); lines.extend(price_lines)

    if hist:
        years = sorted(hist.keys())
        lines.append("\n📈 PRICE HISTORY")
        parts = [f"{y}: {fmt_psm(hist[y])}" for y in years[-4:]]
        lines.append(f"• {' → '.join(parts)}")

    if cats:
        lines.append("\n⚡ CATALYSTS")
        for c in cats[:3]:
            lines.append(f"• {c.get('name') or ''} — {c.get('expected_date') or 'upcoming'}")

    lines.append("\n✅ VERDICT")
    lines.append("• Best for: Investors and end-users looking for an established Dubai community")
    if bmed:
        best_br = pick_target_bedroom(bedrooms, bmed)
        if best_br:
            tag = "" if best_br == bedrooms else " (closest available size)" if bedrooms else ""
            lines.append(f"• Entry play: {best_br} at {fmt_aed(bmed[best_br])}{tag}")
    lines.append("• Watch out for: Service charges and new supply pipeline in the area")

    lines.extend(build_rental_section(ctx))

    return "\n".join(lines)


def build_summary(user_type: str, ctx: dict, bedrooms: str) -> str:
    # ── Lifestyle override ──
    lifestyle_areas = []
    for k, v in ctx.items():
        if k.startswith("lifestyle_") and isinstance(v, dict):
            name = (v.get("area_intelligence") or {}).get("area_name_en") or v.get("detected_area", "")
            if name: lifestyle_areas.append(name)
    if lifestyle_areas:
        tags = ctx.get("_lifestyle_tags", [])
        nat_tag = next((t for t in tags if t in NATIONALITY_KEYWORDS), None)
        if nat_tag:
            tag_str = f"{nat_tag.title()} community"
        else:
            priority_tags = [t for t in tags if t in ("family", "school", "kids", "children", "expat", "luxury", "beach", "golf")]
            tag_str = " & ".join(t.title() for t in priority_tags[:2]) if priority_tags else "your profile"
        names = " · ".join(lifestyle_areas[:3])
        commute_str = ""
        if ctx.get("_commute_ref_name"):
            commute_str = f" — {ctx.get('_commute_min')}–{ctx.get('_commute_max')} min from {ctx.get('_commute_ref_name')}"
        return f"Top areas for {tag_str} living in Dubai: {names}{commute_str} — ranked by real DLD data, buyer nationality mix, and investment score."

    # ── Portfolio strategy override ──
    if ctx.get("strategy_candidate_areas"):
        budget = ctx.get("user_budget_aed")
        budget_label = fmt_aed(budget) if budget else "your budget"
        return f"Diversifying {budget_label} across several mid-market units generally beats a single trophy property for yield and risk — details below."
   # ── Budget override ──
    if ctx.get("budget_search_areas"):
        budget = ctx.get("user_budget_aed")
        budget_label = fmt_aed(budget) if budget else "your budget"
        if bedrooms:
            return f"Searching for {bedrooms} apartments under {budget_label} in Dubai — top areas by value, yield, and real DLD transaction volume below."
        return f"Searching for apartments under {budget_label} in Dubai — top areas across unit types by value, yield, and real DLD transaction volume below."

    # ── Comparison override ──
    comparison_areas = []
    for k, v in ctx.items():
        if k.startswith("comparison_") and isinstance(v, dict):
            name = (v.get("area_intelligence") or {}).get("area_name_en") or v.get("detected_area", "")
            if name: comparison_areas.append(name)
    if len(comparison_areas) >= 2:
        return f"Comparing {comparison_areas[0]} vs {comparison_areas[1]} on real DLD closed-sale data — investment scores, yields, and prices side by side below."

    intel = ctx.get("area_intelligence", {})
    stats = ctx.get("transaction_stats", {})
    area  = ctx.get("detected_area", "this area")
    yld   = intel.get("gross_yield_pct"); trend = intel.get("price_trend_pct")
    br    = bedrooms
    bedroom_med_all = stats.get("median_price_by_bedroom", {})
    med   = (bedroom_med_all.get(br) if br else None) or stats.get("avg_worth_aed")
    br_label = f"{br} " if br else ""

    if user_type == "buyer":
        if med:
            trend_str = ('Prices rising +' + str(trend) + '% — buy sooner.') if trend and float(trend) > 0 else ('Market stable — good time to negotiate hard.' if trend is not None else 'Stable community with strong owner-occupier demand.')
            return f"{area} is a good choice for home buyers — the typical {br_label}closed sale price is {fmt_aed(med)} on real DLD data. {trend_str}"
        return f"{area} is a well-established Dubai community suited for home buyers and families."

    elif user_type == "seller":
        if br and med:
            return f"It's {'a good' if trend is None or float(trend or 0)>=0 else 'a cautious'} time to sell your {br} in {area} — typical DLD closed sale price is {fmt_aed(med)}. {'Market trending up — sell into strength.' if trend and float(trend)>0 else 'Stable market with active buyer demand.'}"
        if bedroom_med_all:
            all_meds = sorted([v for v in bedroom_med_all.values() if v])
            return f"It's {'a good' if trend is None or float(trend or 0)>=0 else 'a cautious'} time to sell in {area} — DLD closed sales here range {fmt_aed(all_meds[0])} to {fmt_aed(all_meds[-1])} depending on size. {'Market trending up — sell into strength.' if trend and float(trend)>0 else 'Stable market with active buyer demand.'}"
        return f"Current market conditions in {area} support a sale — list at or above the typical DLD price to attract serious buyers."

    elif user_type == "investor":
        top_yield = ctx.get("top_yield_areas", []) or ctx.get("top_areas", [])
        if top_yield:
            top = top_yield[0]
            return f"Dubai's top ROI areas are led by {top.get('area_name_en','')} at {top.get('gross_yield_pct','')}% gross yield — well above the 6.1% Dubai average. These are the strongest buy-to-let plays right now based on real DLD data."
        if yld:
            diff = float(yld) - 6.1
            comp = "above" if diff > 0.05 else ("below" if diff < -0.05 else "at")
            return f"{area} offers {yld}% gross yield — {comp} the Dubai average of 6.1%. {'Strong BUY for rental income.' if float(yld)>6.5 else 'Solid for capital appreciation.'}"
        return f"{area} shows active transaction volume — evaluate based on your target yield threshold vs Dubai's 6.1% average."

    elif user_type == "broker":
        avg_psm = intel.get("truvalu_psm") or stats.get("avg_price_sqm")
        if avg_psm and med:
            trend_str = f" Price trend {trend}% YoY." if trend is not None else ""
            return f"{area} market report: average {fmt_psm(avg_psm)}, {br_label}typical price {fmt_aed(med)} on DLD closed sales.{trend_str} Use these numbers to anchor client negotiations."
        return f"Full {area} market data from DLD closed sales — use these comparables for client pitches and pricing."

    else:
        score = intel.get("investment_score"); verdict = intel.get("verdict","BUY")
        if score and med:
            return f"{area} scores {score}/100 for investment — the typical {br_label}price is {fmt_aed(med)} on real DLD data. Verdict: {verdict}."
        return f"{area} is an active Dubai market — real DLD transaction data and market insights below."

def build_insight(user_type: str, ctx: dict, bedrooms: str) -> str:
    # ── Lifestyle override ──
    lifestyle_areas = []
    for k, v in ctx.items():
        if k.startswith("lifestyle_") and isinstance(v, dict):
            intel_sub = v.get("area_intelligence") or {}
            name  = intel_sub.get("area_name_en") or v.get("detected_area", "")
            score = intel_sub.get("investment_score")
            yld   = intel_sub.get("gross_yield_pct")
            if name and score:
                lifestyle_areas.append((name, score, yld))
    if lifestyle_areas:
        best = sorted(lifestyle_areas, key=lambda x: float(x[1] or 0), reverse=True)[0]
        name, score, yld = best
        yld_str = f" with {yld}% gross yield" if yld else ""
        return f"Start with {name} — Score {score}/100{yld_str} — visit on a weekend to check school zones and community feel before committing."


    # ── Portfolio strategy override ──
    if ctx.get("strategy_candidate_areas"):
        return "Start by shortlisting 3–5 mid-market units across different areas to spread vacancy risk instead of concentrating in one asset."
    # ── Budget override ──
    if ctx.get("budget_search_areas"):
        budget = ctx.get("user_budget_aed")
        budget_label = fmt_aed(budget) if budget else "your budget"
        top_areas = ctx.get("budget_search_areas") or []
        top_name = top_areas[0].get("area_name_en") if top_areas else None
        if not top_name:
            return f"Verify the real market value before making any offer at acqar.com/valuation"
        if bedrooms:
            return f"{top_name} has strong {bedrooms} inventory under {budget_label} — verify the real market value before making any offer at acqar.com/valuation"
        return f"{top_name} shows the best value across unit types under {budget_label} — verify the real market value before making any offer at acqar.com/valuation"

    # ── Comparison override ──
    comparison_areas = []
    for k, v in ctx.items():
        if k.startswith("comparison_") and isinstance(v, dict):
            intel_sub = v.get("area_intelligence") or {}
            name  = intel_sub.get("area_name_en") or v.get("detected_area", "")
            score = intel_sub.get("investment_score")
            yld   = intel_sub.get("gross_yield_pct")
            if name: comparison_areas.append((name, score, yld))
    if len(comparison_areas) >= 2:
        by_yield = sorted(comparison_areas, key=lambda x: float(x[2] or 0), reverse=True)
        top = by_yield[0]
        return f"{top[0]} has the stronger yield ({top[2]}%) — book a viewing there first if rental income is your priority."

    intel = ctx.get("area_intelligence", {})
    stats = ctx.get("transaction_stats", {})
    area  = ctx.get("detected_area", "this area")
    br    = bedrooms
    bedroom_med_all = stats.get("median_price_by_bedroom", {})
    med   = (bedroom_med_all.get(br) if br else None) or stats.get("avg_worth_aed")
    yld   = intel.get("gross_yield_pct")
    br_label = f"the {br} " if br else "the typical "   # grammatical whether or not bedroom type is known

    if user_type == "buyer" and med:
        asking = round(float(med) * 1.10)
        label = f"{br_label[3:].capitalize()}" if br_label.startswith("the ") else br_label.capitalize()
        return f"{br_label.capitalize()}DLD price is {fmt_aed(med)} — asking prices typically reach {fmt_aed(asking)}, giving you {fmt_aed(round(float(med)*0.10))} of negotiation room."
    elif user_type == "seller":
        if br and med:
            list_price = round(float(med) * 1.06)
            return f"List your {br} at {fmt_aed(list_price)} — 6% above the typical DLD price of {fmt_aed(med)} — and expect 3–5 viewings in the first 2 weeks."
        if bedroom_med_all:
            mid_br = sorted(bedroom_med_all.keys(), key=lambda k: bedroom_med_all[k])[len(bedroom_med_all)//2]
            list_price = round(float(bedroom_med_all[mid_br]) * 1.06)
            return f"Tell us your exact unit size for a precise number — a {mid_br} in {area} would list around {fmt_aed(list_price)}."
    elif user_type == "investor":
        top_yield = ctx.get("top_yield_areas", []) or ctx.get("top_areas", [])
        if top_yield:
            top = top_yield[0]
            yld_top = top.get("gross_yield_pct", 6.1)
            diff = round(float(yld_top) - 6.1, 2)
            return f"#1 pick: {top.get('area_name_en','')} at {yld_top}% yield — {'+' if diff>=0 else ''}{diff}% above Dubai average on real DLD rental data."
        if yld and med:
            annual_rent = round(float(med) * float(yld) / 100)
            return f"{area} {yld}% yield on {fmt_aed(med)} entry = approx {fmt_aed(annual_rent)}/year rental income based on DLD data."
    elif user_type == "broker" and med:
        return f"The {br_label[4:] if br_label.startswith('the ') else br_label}DLD price is {fmt_aed(med)} — use this as your negotiation anchor: buyers paying asking price pay ~10% above actual closed-sale market."

    if br and med:
        return f"Typical DLD price for {br} in {area} is {fmt_aed(med)} — actual closed-sale price, not the asking price."
    return f"{area} has active DLD transaction volume — use the data above to make a confident, data-backed decision."


def build_charts(ctx: dict, user_type: str) -> list:
    charts = []
    stats = ctx.get("transaction_stats", {})
    hist  = ctx.get("price_history_by_year", {})
    devs  = ctx.get("developer_track_records", [])

    bpsm = stats.get("bedroom_avg_psm", {})
    if bpsm:
        charts.append({"type": "bar", "title": "Price by Bedroom (AED/sqm)",
            "data": [{"label": k, "value": int(v)} for k, v in bpsm.items() if v]})

    if hist:
        charts.append({"type": "line", "title": "Price History (AED/sqm)",
            "data": [{"label": str(y), "value": int(v)} for y, v in sorted(hist.items()) if v]})

    if user_type in ("broker", "investor") and devs:
        dev_data = [{"label": d["developer_name"], "value": int(d["on_time_pct"])} for d in devs if d.get("on_time_pct")]
        if dev_data:
            charts.append({"type": "bar", "title": "Developer On-Time Delivery %", "data": dev_data})

    top_yield = ctx.get("top_yield_areas", []) or ctx.get("top_areas", [])
    if top_yield:
        charts = []
        charts.append({"type": "bar", "title": "Top Areas by Gross Yield (%)",
            "data": [{"label": a.get("area_name_en",""), "value": float(a.get("gross_yield_pct",0))} for a in top_yield[:8] if a.get("gross_yield_pct")]})
        charts.append({"type": "bar", "title": "Investment Score by Area",
            "data": [{"label": a.get("area_name_en",""), "value": int(a.get("investment_score",0))} for a in top_yield[:8] if a.get("investment_score")]})

    return charts


# ── CHANGE 2: Comprehensive fallback system prompt ────────────────
FALLBACK_SYSTEM_PROMPT = """You are ACQAR Intelligence — Dubai's senior real estate expert with 15+ years of market knowledge.

You answer ANY question about Dubai real estate with the depth and specificity of a top-tier consultant.
When DB data is unavailable, use your expert knowledge — be confident, specific, and actionable.
DO NOT say "I don't have data" or be vague. Give real answers like Gemini or Claude would.

OUTPUT: Valid JSON only → {"summary":"...","reply":"...","charts":[],"insight":"...","closing_question":"..."}
Use \\n for line breaks. Use • for bullets. Emoji header for every section.

═══════════════════════════════
FORMAT FOR FINANCING / MORTGAGE / DOWN PAYMENT QUERIES
═══════════════════════════════

📋 DIRECT ANSWER
- [One honest sentence answering exactly what they asked — if the actual cause of
  a decision (e.g. a bank withdrawing an approval) cannot be confirmed from what
  the user told you, do NOT assert a single cause here; name 2-3 likely reasons
  and say the user should request the specific reason in writing. Rule 9 overrides
  the "one sentence, one cause" framing in that case.]
- Key legal fact: [state generally/typically — never as an unqualified "must" or
  "is required to" without a named, verified source]

💡 YOUR OPTIONS — [X] Ways to Do This

Option 1 — [Name of scheme/approach]
• How it works: [2–3 specific sentences with real details]
• Best for: [who this suits exactly]
• The catch: [one honest downside]

Option 2 — [Name]
• How it works: [specific details]
• Best for: [who]
• The catch: [downside]

Option 3 — [Name] (if applicable)
• [same structure]

💰 YOUR REALISTIC NUMBERS
- Monthly payment capacity: AED [X]
- Estimated property budget: AED [X] – AED [X]
- Minimum cash you MUST have: AED [X] (DLD 4% is mandatory regardless)
- Best areas in this budget: [Area 1] · [Area 2] · [Area 3] (ONLY include this
  bullet if the user's question itself asked about affordability/budget/areas —
  omit it entirely for fee, commission, process, or legal questions)

⚠️ CRITICAL WARNINGS
- [Most important legal or financial risk with specific number]
- [Second risk if applicable]

═══════════════════════════════
FORMAT FOR PROCESS / HOW-TO QUERIES (buying steps, fees, visa, NOC, etc.)
═══════════════════════════════

📋 HOW TO [ACTION] IN DUBAI — Step by Step

Step 1 — [Action name]
• [Specific detail. Timeline or cost if known.]

Step 2 — [Action name]
• [Specific detail.]

(continue all steps, typically 5–8 steps)

💰 COST BREAKDOWN
• [Fee name]: [exact % or amount]
• [Fee name]: [exact % or amount]
• Total upfront on AED 1M property: AED [X]

📄 DOCUMENTS NEEDED
• [Document 1 — who needs it]
• [Document 2]

⚠️ COMMON MISTAKES
• [Mistake 1 people make and how to avoid it]
• [Mistake 2]

✅ KEY TAKEAWAY
• [One actionable bottom line]

═══════════════════════════════
FORMAT FOR LEGAL / OWNERSHIP / VISA QUERIES
═══════════════════════════════

📋 DIRECT ANSWER
- [Specific answer to their exact question — if it's a "why did X happen" question
  whose cause you cannot confirm (e.g. why a bank/agency made an internal decision),
  list 2-3 likely causes instead of asserting one, and tell the user to request the
  specific reason in writing]

📜 THE RULES — What UAE Law Says
- [General legal principle/protection, stated plainly with "generally"/"typically"
  hedging — NO law numbers, article numbers, regulation numbers, specific numeric
  deadlines/limitation periods/monetary thresholds, or unqualified "must"/"is
  required to" claims under any circumstances, even if you believe them correct]
- [Another general rule, same restriction — end with: "Confirm exact citations,
  deadlines, and thresholds with RERA/DLD or a licensed UAE lawyer."]
- For contract-default / forfeiture questions specifically: you MUST present
  BOTH sides — (a) the real risk, that a developer can pursue termination
  and retain some payments, AND (b) that Dubai regulation generally caps/
  limits retention rather than allowing unlimited forfeiture (describe the
  cap qualitatively — tied to construction stage — never as a flat "you
  lose everything"). Presenting only the worst-case outcome as the whole
  picture is a failure, especially when the user has signaled financial
  vulnerability (fixed income, "can I afford this," "will I lose
  everything").

✅ WHAT TO DO
• Step 1: [action]
• Step 2: [action]
• Step 3: [action]

⚠️ WATCH OUT FOR
• [Specific risk]



═══════════════════════════════
FORMAT FOR DUE-DILIGENCE / RISK-CHECKING QUERIES
(e.g. "how do I check if a developer is at risk", "what red flags should I look for",
"how do I verify X before I sign")
═══════════════════════════════

📌 DIRECT ANSWER
- [One sentence: what category of signals to check]

Critical Risk Indicators & Considerations
Group into 2-4 short categories. Each category name MUST be its own line,
wrapped in double asterisks so it renders bold, e.g.:
**Pricing & Payment Plan Anomalies**
Under each category, 2-3 bullets. Each bullet MUST start with a short bold
lead-in phrase naming the pattern, followed by a colon, then the explanation
— e.g.:
- **Aggressive Under-Market Pricing:** Prices set well below market average
  often signal a developer needing immediate cash flow.
Never a specific number/statistic unless it's in your provided context.
NEVER state a numeric threshold as a rule of thumb (e.g. do NOT write
"debt-to-equity above 1.5" or "occupancy below 70%" or "15% to 30% below
market") — describe the direction/pattern only ("a debt-to-equity ratio
markedly higher than peers", "priced noticeably below market average").
You have no verified developer financial data, so any such number is
fabricated — this applies even inside a bold lead-in phrase.

📋 HOW TO VERIFY — Reference Table
Output as a markdown table:
| Check Area | What to Verify | Where to Check |
|---|---|---|
| [area] | [what] | [describe the TYPE of source generically, e.g.
  "the local land/property registry", "the developer's audited financials",
  "a credit rating agency" — do NOT name one specific portal as THE answer
  unless you are certain it is correct and current; if unsure, say
  "confirm the exact portal/system with RERA/DLD directly"] |

✅ ACTION PLAN
- [3-4 concrete next steps before signing]


═══════════════════════════════
FORMAT FOR VISA / RESIDENCY COMPARISON QUERIES
(e.g. "does off-plan qualify for a visa", "golden visa vs investor visa",
"do I need to wait for handover to get a residency visa")
═══════════════════════════════

📌 DIRECT ANSWER
- [One sentence directly answering what was asked — if the question implies
  a single visa, still note there are multiple distinct products if relevant]
- [If the question asks whether spending MORE than the visa's minimum
  property value is "worth it" or for a "smarter way" to hit the threshold:
  this is a HARD requirement, not optional — your direct answer must state
  that the visa is pass/fail (no bonus for a pricier property), so a
  minimum-spec freehold unit near the threshold is the capital-efficient
  choice, and paying more only makes sense if that pricier unit has its own
  independent investment merits. A sentence like "a cheaper unit can also
  qualify" does NOT satisfy this — you must give the actual verdict.]

Then include a markdown table summarizing the relevant visa types, formatted
EXACTLY like this (pipe-delimited, header row, then a "---|---|---|---"
separator row):

| Visa Type | Validity | Off-Plan Qualified Before Handover? | Key Requirements |
|---|---|---|---|
| Golden Visa | 10 Years | YES | Property value above a set minimum (confirm current AED figure with GDRFA/DLD) · RERA-approved developer · DLD initial registration (Oqood certificate) |
| Standard Investor Visa | 2 Years | NO | Requires a completed/registered property · Official DLD Title Deed issued after handover |

Only include rows for visa types actually relevant to the question — do not
pad with irrelevant types. NEVER put a specific AED number inside a table
cell as settled fact; use "a set minimum" or "above a threshold" and note to
confirm with GDRFA/DLD, consistent with Rule 1d below.

After the table, continue with:

📜 THE RULES — What This Means
- [1-2 bullets per visa type, explaining the table qualitatively, same
  hedging rules as the LEGAL/OWNERSHIP format above]

✅ WHAT TO DO
- Step 1: [action]
- Step 2: [action]
- Step 3: [action]

⚠️ WATCH OUT FOR
- [Specific risk, e.g. applying for the wrong visa type with the wrong document]
═══════════════════════════════
FORMAT FOR GENERAL MARKET / TREND / OPINION QUERIES
═══════════════════════════════

📌 DIRECT ANSWER
- [Answer the question directly in one sentence]

📊 THE DATA BEHIND IT
- [Specific market fact with number]
- [Another data point]
- [Another data point]

🔍 ANALYSIS
- [What this means for the user]
- [Comparison or context]

✅ BOTTOM LINE
- [Actionable conclusion]
- [Next step if relevant]

═══════════════════════════════
FORMAT FOR "THEN VS NOW" / TIME-PERIOD COMPARISON QUERIES
═══════════════════════════════
Use this format whenever the question compares two time periods (e.g.
"compared to a couple years ago", "vs 2021", "how has X changed"),
IN ADDITION TO the general market format above.

📌 DIRECT ANSWER
- [One sentence answering the comparison directly]

Then include a markdown table comparing the two periods, formatted EXACTLY
like this (pipe-delimited, header row, then a "---|---|---" separator row):

| Factor | [Earlier period] | [Current period] |
|---|---|---|
| [Factor 1] | [value/description] | [value/description] |
| [Factor 2] | [value/description] | [value/description] |
| [Factor 3] | [value/description] | [value/description] |

Include 4-6 rows covering the most relevant factors (e.g. market momentum,
price appreciation, supply/risk, regulation, buyer protection). Only use
factors and values you can support qualitatively or from the DB context —
never invent precise statistics (see rule 1 below).

After the table, continue with:

🔍 WHAT'S CHANGED
- [2-3 bullets synthesizing the table into plain-language takeaways]

✅ BOTTOM LINE
- [Actionable conclusion for the user today]

═══════════════════════════════
RULES FOR ALL RESPONSES
═══════════════════════════════
0. Pick the template that matches what was actually asked. A question about
   commission, fees, legal process, or a named company is NOT a financing/
   mortgage/area-recommendation question — do not use the FINANCING template's
   "Best areas" bullet, and do not name specific areas (Downtown Dubai, Dubai
   Marina, Palm Jumeirah, etc.) anywhere in the answer unless the user's
   question was actually about choosing or comparing areas. Commission rates,
   RERA rules, and legal fees apply the same Dubai-wide — they have nothing to
   do with any particular neighborhood.
0b. If the question asks HOW TO CHECK, VERIFY, or SPOT RISK SIGNALS for something
   (rather than asking what the legal rules/process are), use the DUE-DILIGENCE /
   RISK-CHECKING format above instead of the LEGAL/OWNERSHIP format — grouping
   red flags by category and using a verification table reads far better for
   "what should I check" questions than prose "What UAE Law Says" bullets.
0c. If the question is about property-linked visas/residency and could involve
   more than one visa product (Golden Visa, standard investor visa, etc.), use
   the VISA / RESIDENCY COMPARISON format instead of the plain LEGAL/OWNERSHIP
   format — the table makes the pre-handover eligibility difference clear at a
   glance, which plain bullets tend to blur together (this was a real failure
   mode: merging two visa types into one undifferentiated answer).
1. Be specific and concrete, but NEVER invent exact statistics (percentages,
   default rates, retention caps, penalty rates, before/after numbers, dates)
   that aren't present in the ACQAR Dubai Market Context or Verified reference
   framework passed to you. If no such figure was provided and the topic needs
   one, describe the structure/mechanism qualitatively instead of inventing a
   number — e.g. "retention is capped and rises with construction progress"
   not "up to 5% per annum." Only cite a number if it's in context you were
   given — never one you're estimating live.
1a. This applies with extra force to financial ratios and operational metrics
   in due-diligence answers (debt-to-equity, current ratio, occupancy rate,
   default rate, etc.) — you have NO developer financial data source, so any
   numeric threshold for these is always fabricated. Describe direction only.
1b. Legal/regulatory citations: NEVER state a specific law number, article number,
   regulation number, limitation period, or monetary threshold for a legal process —
   not even ones you believe are correct. There is no "if certain" exception. Always
   describe the general right/process/protection in plain language and direct the
   user to confirm specifics with RERA/DLD or a licensed UAE lawyer. This ban
   applies equally to the "summary" and "insight" fields — do not compress the
   answer into a specific deadline number there either, even as shorthand, even
   if the full "reply" correctly hedged it. [NEW:] This also covers unqualified
   claims of legal authority without a citation, e.g. "UAE banking law allows X"
   or "banks generally must provide X" — do not assert an obligation exists at
   all unless you can name the specific, verified source. Instead, frame it as
   common practice, not a right: e.g. "banks will often explain a reversal if
   asked, though this isn't guaranteed — request it in writing and escalate to
   RERA/DLD or the Central Bank if refused." The words "generally" or "typically"
   attached to "must"/"is required to" are NOT sufficient hedging — replace the
   obligation verb itself (must/required/have to) with practice language
   (often/will usually/tend to).
- When telling the user where to verify something (a developer's standing, an
  escrow account, a permit, a platform's regulatory status, etc.), describe the
  TYPE of source generically with "e.g." examples rather than confidently naming
  ONE specific portal/system as THE definitive place to check — unless you are
  certain that system is correct and current for that exact purpose. If unsure,
  say "confirm the exact portal/system with RERA/DLD directly."
- CONSISTENCY: if you hedge a named regulator or portal anywhere in your answer
  (e.g. in a reference table), you MUST use that exact same hedge every other
  time you reference it — in bullets, action-plan steps, AND the closing
  CTA/insight. Stating something as unqualified fact in one place ("ensure it's
  registered with the DFSA") while hedging it elsewhere ("confirm the exact
  portal with RERA/DLD") is a self-contradiction and a failure of this rule —
  pick the hedge, then apply it everywhere that name appears, including any
  closing action line.
1c2. NEVER describe one property-linked visa product as a required
   prerequisite stage for another (e.g. "get a standard visa first, then
   after 6 months apply for the Golden Visa") unless that exact sequential
   dependency is explicitly stated in the Verified reference framework
   provided. They are alternative products, not sequential steps.
1c3. Do NOT state a specific AED property-value threshold for any Golden
   Visa or investor visa product as settled fact, not even hedged — this
   includes figures you recall from training that may be outdated. Always
   write "a minimum property value applies (confirm the current figure
   with GDRFA/DLD)" instead of a specific number.
1c4. NEVER invent, name, or describe any property-linked visa or residency
   product beyond the two named in the Verified reference framework
   (Golden Visa, standard investor visa). Do not introduce a third,
   undocumented product as a prerequisite stage. If a process stage isn't
   documented, omit it rather than fabricating one.
1d. Visa/residency questions: Dubai has multiple distinct property-linked
   visa products (e.g. a long-term Golden Visa vs a shorter standard
   investor visa) with DIFFERENT eligibility timing rules. NEVER merge
   them into a single undifferentiated "the investor visa" answer — if
   the question doesn't specify which one, briefly name both and give
   the correct pre-handover eligibility for EACH separately, using the
   VISA / RESIDENCY COMPARISON table format (see above) whenever more
   than one visa type is relevant. If a Verified reference framework for
   visas is provided, follow its structure exactly rather than inventing
   your own AED thresholds — including inside table cells.
1e. "Has this changed / how likely is this today" buyer-protection questions
   (e.g. double-selling, escrow misuse, developer defaults): NEVER state an
   exact escrow percentage, performance-bond percentage, retention cap, or
   numeric risk probability ("X% risk") as settled fact, and NEVER attach a
   specific year ("Since 2020, RERA requires...") to a legal requirement
   unless it is in the Verified reference framework provided. Describe the
   protective MECHANISM (interim registration, escrow, milestone-based
   release, regulatory oversight of stalled projects) qualitatively instead.
   When the question explicitly asks what has changed over time, prefer a
   "then vs now" table (same format as the THEN VS NOW template) with rows
   per risk area, rather than a flat "What UAE Law Says" bullet list —
   it communicates the change more clearly and reduces the temptation to
   invent a specific date or number to fill a bullet.
1f. If a "Dubai average" yield/price benchmark is provided in the ACQAR
   Dubai Market Context or AREA DATA FACTS, use that exact figure every
   time you reference it in the SAME response — never state two different
   numbers for the same benchmark. Do not cite specific dated historical
   figures (e.g. "2023 prices were X") unless that year/figure is present
   in the context passed to you — your training data may be stale relative
   to the current-dated data shown elsewhere in the response, and mixing
   the two without distinction misleads the user about what's live vs.
   outdated.
1h. Property type: if the user names a specific property type (villa,
   townhouse, apartment), your primary recommendation and headline price/
   yield figures must come from that property type only — never default to
   whichever unit type or bedroom count has the best yield-to-price ratio
   overall. If you have no verified data for that exact property type in
   this area, say so plainly rather than substituting apartment or
   different-bedroom-count data as if it answers the question.
1g. Service charges: NEVER express a service charge as a percentage of the
   unit's rental income (e.g. "0.5-1% of rent") — this has no basis in how
   Dubai service charges are actually set. They are published per AED/sqft
   of built-up area per year (roughly AED 10-20/sqft/year for mid-market,
   higher for premium buildings), or as a rough 1-2% of property value. If
   a Verified reference framework for service charges is provided, follow
   its structure and ranges exactly rather than inventing your own. If the
   prior turn in this conversation already estimated service charges for
   the same property, reuse that same figure rather than generating a
   different one.

2b. If the user names a specific real estate company, brokerage, or agent and
   asks about it, do NOT fabricate facts about that specific business — you do
   not have verified, live company records (RERA status, service areas, past
   performance, size). Say plainly that you don't have verified data on that
   specific company, then give general guidance on how anyone can verify a
   Dubai real-estate company (check its RERA/DLD broker registration number,
   look it up on the DLD's Trakheesi system, check reviews). NEVER attach
   unrelated area investment scores/yields to a company-identity question —
   those numbers describe areas, not the company.
2c. NEVER state specific figures (minimum investment amount, historical/
   projected returns %, fees, AUM, project count) for a named third-party
   commercial platform unless those exact figures appear in the Verified
   reference framework passed to you. This applies even if the user named
   the platform first — naming it back to acknowledge the question is fine,
   citing numbers for it is not. If asked for such figures, say you don't
   have verified current data on that platform and direct the user to
   confirm minimums/returns/fees directly on the platform's own site or app.
   NEVER include a sign-up/account-creation call-to-action for it either way.
2. If budget is mentioned (salary/EMI/monthly), calculate the property budget and show the math

3. Never write more than 2 lines per bullet
4. Never write paragraphs — use bullet points under emoji headers, EXCEPT
   when the "THEN VS NOW" format above applies — there, output the markdown
   pipe table exactly as specified (with the header separator row), not bullets.
5. summary: 2 sentences — direct answer + most useful number. This is shown
   SEPARATELY from "reply" (e.g. as a preview/notification), so it must NOT
   be a verbatim or near-verbatim copy of the DIRECT ANSWER bullet(s) in
   "reply" — write it as a distinct, standalone summary in different
   wording. If you find yourself writing the same sentence twice, rephrase
   one of them.
6. insight: 1 sentence — one specific action the user can take TODAY
7. NEVER include URLs or markdown links in your reply text. Do not write [text](url) or https:// links inside reply. Area links are added automatically.
8. closing_question: one short, natural follow-up question specific to what THIS
   answer actually covered (e.g. a legal answer offers to help draft a demand
   letter or explain the next escalation step; a financing answer offers a
   different scheme or to calculate a specific budget; a how-to answer offers
   the next step's detail or a related document). NEVER default to a generic
   "want a bedroom breakdown / area comparison" question unless the topic was
   genuinely about choosing or comparing areas — most fallback answers are not.
9. For "why did X happen" questions where the actual cause cannot be determined
   from the information given (e.g. a bank/agency's internal decision), do NOT
   assert a single definitive cause as fact. List the 2-3 most common causes
   as possibilities ("this is typically due to A, B, or C") and instruct the
   user to request the specific reason in writing from the institution —
   rather than picking one plausible mechanism and presenting it as the
   confirmed explanation.
10. If the CURRENT user message is a short affirmative reply ("yes", "sure",
   "please", "go ahead", "ok") to a question YOU asked at the end of your
   PREVIOUS turn (visible in the conversation history above), do NOT repeat
   or re-explain the previous answer. Directly fulfill what you offered —
   e.g. if you offered a demand letter template, write the actual template
   now; if you offered to explain the RERA complaint process, walk through
   that process now. The reply must contain genuinely new content, not a
   restatement of the prior turn.
11. If the user's message points out an inconsistency, contradiction, or
   error in your own prior response (e.g. two different figures shown for
   what should be the same number), address it directly and explicitly as
   the FIRST thing in your reply — state which figure is correct and why —
   before anything else. Do not pivot to a new topic or a generic closing
   question without acknowledging the discrepancy first.
12. If the question asks for a total timeframe, duration, or "how long until
  X," and you have a genuine basis for the individual phases, your reply's
  first bullet MUST state a single bottom-line range before any
  phase-by-phase breakdown. If you do NOT have a real basis for the
  individual phases (e.g. GDRFA/DLD processing speed is not something you
  have verified data on), do NOT invent a fabricated multi-step timeline to
  satisfy this rule — instead state plainly that you don't have a verified
  processing-time breakdown and direct the user to GDRFA/DLD for actual
  current timelines.
  13. If "project_search_term" is present in AREA DATA FACTS but "transaction_stats" 
  represents area-wide data (not project-specific — you can tell because the 
  reply would otherwise silently present area-wide numbers as if they were 
  specific to that project), your first bullet MUST state plainly that no 
  DLD-registered sales were found under that project/cluster name, and that 
  the figures shown are area-wide instead — before giving any numbers."""


# ─────────────────────────────────────────────────────────────────
# MAIN ENDPOINT
# ─────────────────────────────────────────────────────────────────

@router.post("/intelligence/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        audio_bytes = await file.read()

        def call_whisper():
            return groq_client.audio.transcriptions.create(
                file=(file.filename or "audio.webm", audio_bytes),
                model="whisper-large-v3",
            )

        result = await _run(call_whisper)
        return {"text": result.text.strip()}
    except Exception as e:
        print(f"[ACQAR] transcribe error: {e}")
        return {"text": "", "error": "Transcription failed"}




@router.post("/intelligence/chat")
async def intelligence_chat(req: ChatRequest):
    message = req.message.strip()
    if not message:
        return {"type": "text", "reply": "Please ask a question about Dubai real estate."}

    user_lang, user_dir = detect_language(message)
    detection_message = message
    if user_lang != "en":
        detection_message = await _run(translate_to_english, message)
        print(f"[ACQAR] translated query: {detection_message}")
    msg_lower    = detection_message.lower()
    context_data = {}
    raw          = ""
    if any(k in msg_lower for k in LEGAL_QUERY_MARKERS) or any(k in msg_lower for k in OFFPLAN_DEFAULT_KEYWORDS):
        context_data["_is_legal_fallback"] = True
    if any(k in msg_lower for k in VISA_QUERY_KEYWORDS):
        context_data["_is_legal_fallback"] = True
        context_data["_is_visa_query"] = True
    if any(k in msg_lower for k in BUYER_PROTECTION_KEYWORDS):
        context_data["_is_legal_fallback"] = True

# ── FOLLOW-UP CONTEXT CARRY ──
    # Only pull context from earlier turns when the CURRENT message looks like a
    # short follow-up ("what about the yield?"). A long, self-contained question
    # (like a full property description) is a fresh topic and must never inherit
    # an area/project from an earlier, unrelated question in the same chat.
    is_probable_followup = len(detection_message.split()) <= 15

    _t_followup_start = time.monotonic()
    if req.history and is_probable_followup:
        prior_user_msgs = [
            h.get("content", "") for h in req.history
            if h.get("role") == "user" and h.get("content")
        ]
        if prior_user_msgs:
            cur_all_areas    = get_all_area_ids(msg_lower)
            carried_area_ids = {aid for aid, _ in cur_all_areas}
            # Only pull an area from history when the CURRENT message names
            # NONE of its own — e.g. "what about the yield?" truly needs the
            # prior area. If the user already named a specific area (even a
            # different one), that's a deliberate topic switch, not a
            # comparison request — never merge in a second area from history.
            should_carry_area = len(cur_all_areas) == 0
            cur_bedrooms     = extract_bedrooms(detection_message)
            cur_budget       = extract_budget(detection_message)
            ROLE_KWS         = SELLER_KEYWORDS + BUYER_KEYWORDS + INVESTOR_KEYWORDS + BROKER_KEYWORDS
            cur_role_hit     = any(k in msg_lower for k in ROLE_KWS)

            recent_prior = list(reversed(prior_user_msgs[-4:]))
            langs = [detect_language(p)[0] for p in recent_prior]
            translate_jobs = [_run(translate_to_english, p) for p, l in zip(recent_prior, langs) if l != "en"]
            translated_results = await asyncio.gather(*translate_jobs) if translate_jobs else []
            _ti = iter(translated_results)
            prior_en_msgs = [next(_ti) if l != "en" else p for p, l in zip(recent_prior, langs)]

            carry = []
            for p_en in prior_en_msgs:
                p = p_en.lower()

                # Only carry a PRIOR area forward when the current message has
                # zero areas of its own — never top up to 2 when the user
                # already switched to a new, specific area.
                if should_carry_area and len(carried_area_ids) < 1:
                    for aid, pkw in get_all_area_ids(p):
                        if aid not in carried_area_ids:
                            carry.append(pkw)
                            carried_area_ids.add(aid)
                            break  # only need the single most recent area

                if not cur_bedrooms:
                    pb = extract_bedrooms(p_en)
                    if pb:
                        carry.append(pb.lower())
                        cur_bedrooms = pb

                if not cur_budget:
                    pbud = extract_budget(p_en)
                    if pbud:
                        # FIX: serialize as "X.XX million aed" — extract_budget's
                        # own patterns reliably re-match this on re-parse, unlike
                        # a raw "aed 800000" which fails for budgets under 1M.
                        carry.append(f"{pbud/1_000_000:.2f} million aed")
                        cur_budget = pbud

                if not cur_role_hit and any(k in p for k in ROLE_KWS):
                    carry.append(p_en)
                    cur_role_hit = True

                if len(carried_area_ids) >= 2 and cur_bedrooms and cur_budget and cur_role_hit:
                    break

            if carry:
                detection_message = f"{detection_message} {' '.join(carry)}"
                msg_lower = detection_message.lower()
                print(f"[ACQAR] follow-up merged: {detection_message}")
    

    print(f"[ACQAR TIMING] followup_carry_block: {time.monotonic() - _t_followup_start:.2f}s")

    intent = {"mode": None, "topic_changed": False}
    if req.history and is_probable_followup:
        _t_intent_start = time.monotonic()
        intent = await _run(classify_message_intent, detection_message, req.history)
        print(f"[ACQAR TIMING] classify_message_intent: {time.monotonic() - _t_intent_start:.2f}s")

    if intent.get("topic_changed"):
        clar = {
            "type": "text",
            "is_topic_change": True,
            "summary": "Looks like this is a new topic.",
            "reply": (
                "Looks like you've switched to something different from what we were "
                "just discussing. Want me to go with your new question, or pick back "
                "up where we left off?"
            ),
            "charts": [], "insight": "",
        }
        if user_lang != "en":
            clar = translate_result_texts(clar, user_lang)
        clar["language"]  = user_lang
        clar["direction"] = user_dir
        return clar

    if is_investment_verdict_query(msg_lower):
        context_data["_is_investment_verdict"] = True

   # Due-diligence-style questions ("what should I watch out for", "how do I
    # verify...") are unambiguous narrow follow-ups even when the LLM intent
    # classifier misreads them as a fresh/full request — the classifier has
    # no visibility into these strong keyword signals, so let them override it.
    is_due_diligence_style = any(k in msg_lower for k in DUE_DILIGENCE_MARKERS) or \
        any(p in detection_message.strip().lower() for p in SPECIFIC_CONCERN_MARKERS)

    # Computed here (not just later, where it was before) so use_specific_mode
    # can route a bare "yes"/"sure" reply to the specific-answer path instead
    # of a fresh templated report. The later block still runs — it's now a
    # no-op recomputation, kept so nothing downstream that expects this
    # variable name/timing changes.
    is_transactions_query = is_transactions_only_query(msg_lower)
    is_affirmative_followup = _is_affirmative_message(message) and bool(req.history)

    use_specific_mode = (
        True
        if (is_due_diligence_style or is_affirmative_followup or is_transactions_query)
        else (
            intent["mode"] == "specific"
            if intent.get("mode")
            else (
                is_specific_followup(detection_message, req.history)
                or context_data.get("_is_investment_verdict")
            )
        )
    )

 # ── Detect commute reference FIRST, then strip it before area detection ──
    # ── Detect commute reference FIRST, then strip it before area detection ──
    commute_info         = extract_commute_reference(msg_lower)
    msg_lower_for_area    = strip_commute_reference(msg_lower, commute_info)

    literal_area_id, literal_kw = get_area_id(msg_lower_for_area)
    area_id, detected_area = literal_area_id, literal_kw
    matched_project_name   = None
    area_mismatch_note     = None

    if not area_id:
        proj_area_id, matched_project_name = await _run(get_project_match, detection_message)
        if proj_area_id:
            area_id, detected_area = proj_area_id, matched_project_name
    elif area_id:
        # Check the ACTUAL project match FIRST — this is what catches
        # "Odara" being registered under DAMAC Hills 2, not DAMAC Hills,
        # even though DAMAC Hills also has its own real projects.
        proj_area_id, proj_name = await _run(get_project_match, detection_message, 1)
        if (
            proj_area_id
            and proj_name
            and proj_area_id != literal_area_id
            and _project_name_plausible(proj_name, msg_lower)
        ):
            area_mismatch_note = (proj_area_id, proj_name, literal_area_id, literal_kw)
            area_id, detected_area = proj_area_id, proj_name
            matched_project_name = proj_name
        else:
            shared_zone_filter = await _run(get_project_filter_for_shared_zone_cached, area_id, detected_area)
            if shared_zone_filter:
                matched_project_name = shared_zone_filter
            elif proj_area_id and proj_name:
                matched_project_name = proj_name

    all_area_ids           = get_all_area_ids(msg_lower_for_area)
    # Catch "Fiji 2 in Dubai Island" style mentions — a second, DIFFERENT
    # literal area named in the same message that the resolved area_id
    # doesn't match. This is separate from the project-vs-keyword mismatch
    # above (area_mismatch_note may already be set by that path).
    if area_mismatch_note is None and area_id and len(all_area_ids) >= 2:
        other_kw = next((kw for aid, kw in all_area_ids if aid != area_id), None)
        if other_kw:
            area_mismatch_note = (area_id, detected_area, None, other_kw)
    # Strip the detected area/project name before keyword-scoring user type —
    # area names (e.g. "Dubai Land Residence Complex", "Jumeirah Beach
    # Residence") can contain generic English words that collide with
    # BUYER/SELLER/INVESTOR keyword lists and cause false classification.
    msg_for_user_type = msg_lower
    if detected_area:
        stripped = msg_lower.replace(detected_area.lower(), " ")
        if stripped != msg_lower:
            msg_for_user_type = stripped
        elif matched_project_name and matched_project_name.lower() != detected_area.lower():
            # DB project name didn't literally match the user's text (casing/
            # spacing differs) — try the raw matched_project_name too before
            # giving up and scoring the untouched message.
            stripped2 = msg_lower.replace(matched_project_name.lower(), " ")
            if stripped2 != msg_lower:
                msg_for_user_type = stripped2
    user_type = detect_user_type(msg_for_user_type)
    budget                 = extract_budget(detection_message)
    bedrooms               = extract_bedrooms(detection_message)
    property_type          = extract_property_type(detection_message)
    unit_sqft               = extract_sqft(detection_message)
    nationality             = detect_nationality(msg_lower)
    is_lifestyle           = (
        not area_id
        and (
            any(p in msg_lower for p in LIFESTYLE_INTENT_PATTERNS)
            or sum(1 for w in LIFESTYLE_STRONG_SIGNALS if w in msg_lower) >= 2
        )
        and (any(w in msg_lower for w in LIFESTYLE_KEYWORDS) or bool(nationality))
    )
    if any(k in msg_lower for k in LEGAL_QUERY_MARKERS) or any(k in msg_lower for k in OFFPLAN_DEFAULT_KEYWORDS):
        context_data["_is_legal_fallback"] = True
    AMBIGUOUS_AREA_PAIRS = [({"damac hills 2", "akoya by damac"}, {"damac hills", "akoya oxygen", "akoya"})]

    def _detect_area_conflict(text_lower: str):
        for group_a, group_b in AMBIGUOUS_AREA_PAIRS:
            # Mask out group_a matches first — "damac hills 2" contains
            # "damac hills" as a literal substring, so checking group_b on
            # the raw text false-matches the SAME phrase and wrongly
            # flags a conflict even when only "Damac Hills 2" was named.
            # NOTE: uses \b word-boundary regex, not plain substring `in`,
            # so "damac hills 2" does NOT false-match inside "damac hills
            # 2162" (where the "2" is glued to another digit).
            masked = text_lower
            found_a = False
            for kw in group_a:
                pattern = r'\b' + re.escape(kw) + r'\b'
                if re.search(pattern, masked):
                    found_a = True
                    masked = re.sub(pattern, lambda m: " " * len(m.group(0)), masked)
            if not found_a:
                continue
            found_b = any(re.search(r'\b' + re.escape(kw) + r'\b', masked) for kw in group_b)
            if found_b:
                return True
        return False

    if _detect_area_conflict(msg_lower_for_area):
        clar = {
            "type": "text",
            "is_clarifying": True,
            "summary": "DAMAC Hills 2 and Akoya Oxygen are two different DLD communities — which one is this?",
            "reply": (
                "Quick check before I pull numbers — 'DAMAC Hills 2 (Akoya by DAMAC)' and "
                "'Akoya Oxygen' are registered as two separate communities in DLD data, with "
                "different pricing:\n\n"
                "1. DAMAC Hills 2 (Akoya by DAMAC) — the newer, more affordable community\n"
                "2. DAMAC Hills / Akoya Oxygen — the original, more established community\n\n"
                "Which one is the villa in?"
            ),
            "charts": [], "insight": "",
        }
        if user_lang != "en":
            clar = translate_result_texts(clar, user_lang)
        clar["language"] = user_lang; clar["direction"] = user_dir
        return clar

    if any(k in msg_lower for k in LEGAL_QUERY_MARKERS) or any(k in msg_lower for k in OFFPLAN_DEFAULT_KEYWORDS):
        context_data["_is_legal_fallback"] = True

    if any(k in msg_lower for k in VISA_QUERY_KEYWORDS):
        context_data["_is_legal_fallback"] = True
        context_data["_is_visa_query"] = True

    if any(k in msg_lower for k in BUYER_PROTECTION_KEYWORDS):
        context_data["_is_legal_fallback"] = True

    

    if any(k in msg_lower for k in DUE_DILIGENCE_MARKERS):
        context_data["_is_due_diligence"] = True

    if is_investment_verdict_query(msg_lower):
        context_data["_is_investment_verdict"] = True

    

    # NEW — detect if this message is a direct answer to our own
    # "What price are you being quoted?" clarifying question from last turn.
    last_assistant_msg = ""
    if req.history:
        for h in reversed(req.history):
            if h.get("role") == "assistant" and h.get("content"):
                last_assistant_msg = str(h["content"])
                break
    is_answering_price_prompt = bool(budget) and "being quoted" in last_assistant_msg.lower()
    print(f"[ACQAR DEBUG] is_answering_price_prompt={is_answering_price_prompt}")


    is_affirmative_followup = _is_affirmative_message(message) and bool(req.history)
    print(f"[ACQAR DEBUG] is_affirmative_followup={is_affirmative_followup}")

    GOLDEN_VISA_MIN_AED = 2_000_000  # capital-efficient threshold used only to seed a real area search

    prior_offer_type = None
    if is_affirmative_followup and last_assistant_msg:
        _prior_lines = [l.strip() for l in last_assistant_msg.split("\n") if l.strip()]
        _prior_question = next((l for l in reversed(_prior_lines) if l.endswith("?")), None)
        if _prior_question:
            prior_offer_type = _classify_prior_offer(_prior_question)

    _EXPLICIT_COMPARISON_WORDS = ["comparing", "compare", "which is better", "better buy", "better option"]
    has_explicit_comparison_language = bool(re.search(r'\bvs\.?\b|\bversus\b', msg_lower)) or \
        any(w in msg_lower for w in _EXPLICIT_COMPARISON_WORDS)

    is_comparison = (
        len(all_area_ids) >= 2 or
        bool(re.search(r'\bvs\.?\b|\bversus\b', msg_lower))
    )

    if is_comparison and (unit_sqft or bedrooms) and not has_explicit_comparison_language:
        is_comparison = False
        all_area_ids = [(aid, kw) for aid, kw in all_area_ids if aid == area_id]

    # A "second area" mismatch fired from plain co-occurrence (not real
    # comparison intent) — e.g. "Fiji 2 in Dubai Island" just misnames the
    # parent area of a real project. The user isn't asking to compare two
    # areas; they typed one place, wrong qualifier. Downgrade to a
    # single-area answer on the CORRECTLY resolved area and let the
    # mismatch note (added later) explain the correction, instead of
    # silently building a full two-area comparison nobody asked for.
    if (
        is_comparison
        and area_mismatch_note is not None
        and not has_explicit_comparison_language
    ):
        is_comparison = False
        all_area_ids = [(aid, kw) for aid, kw in all_area_ids if aid == area_id]

    print(f"[ACQAR DEBUG] area_id={area_id}, detected_area={detected_area}, nationality={nationality}, is_lifestyle={is_lifestyle}, commute_info={commute_info}, bedrooms={bedrooms}, all_area_ids={all_area_ids}, is_comparison={is_comparison}")

    # "comparing X and Y" or "X or Y, which is better" signal comparison
    # intent even without "vs"/"versus" — if only ONE area actually resolved
    # to a known AREA_ID_MAP entry, the second named area has no verified
    # data and must not be silently treated as a single-area query.
    COMPARISON_INTENT_WORDS = ["comparing", "compare", "which is better", "better buy", "better option"]
    mentions_comparison_intent = any(w in msg_lower for w in COMPARISON_INTENT_WORDS)

    ROUGH_ESTIMATE_REQUEST_WORDS = [
        "your best estimate", "rough estimate", "ballpark", "estimate anyway",
        "your guess", "give me a number anyway", "even a rough number",
    ]
    wants_rough_estimate = any(w in msg_lower for w in ROUGH_ESTIMATE_REQUEST_WORDS)

    if mentions_comparison_intent and len(all_area_ids) == 1 and not is_comparison:
        context_data["_unverified_comparison_area"] = True
        context_data["_allow_rough_estimate"] = wants_rough_estimate

    if context_data.get("_allow_rough_estimate"):
        # Reuse a prior estimate from this conversation if one exists, so the
        # LLM doesn't regenerate different numbers on a later turn.
        for h in reversed(req.history or []):
            if h.get("role") == "assistant" and "estimate" in (h.get("content") or "").lower():
                context_data["_cached_second_area_estimate_text"] = h["content"]
                break
    if is_vague(msg_lower, area_id, is_lifestyle):
        is_seller = any(k in msg_lower for k in SELLER_KEYWORDS)
        if is_seller:
            clar = {
                "type": "text",
                "is_clarifying": True,
                "summary": "Which area is your apartment in? I'll pull real DLD data and give you an exact listing price.",
                "reply": (
                    "To give you accurate selling data, I need one detail:\n\n"
                    "1. Which area is your apartment in? (e.g. Dubai Marina, JVC, Downtown Dubai, Business Bay)\n\n"
                    "Once I know the area, I'll pull the real DLD median price, recommended listing price, "
                    "weekly transaction volume, and tell you exactly whether to sell now or wait — with real numbers."
                ),
                "charts": [], "insight": "",
            }
            if user_lang != "en":
                clar = translate_result_texts(clar, user_lang)
            clar["language"]  = user_lang
            clar["direction"] = user_dir
            return clar
        clar = {
            "type": "text",
            "is_clarifying": True,
            "summary": "Let me get a few details to find the best match for you.",
            "reply": (
                "To give you a data-backed answer, I need a few quick details:\n\n"
                "1. What is your budget? (e.g. AED 1M–2M, AED 3M–5M, AED 5M+)\n"
                "2. Are you buying to live in, or investing for rental income?\n"
                "3. Any lifestyle preferences? (beach, city centre, family community, schools, golf)\n"
                "4. How many bedrooms do you need?\n\n"
                "Once I know these, I'll pull real DLD closed-sale data and give you a shortlist with actual numbers — not asking prices."
            ),
            "charts": [], "insight": "",
        }
        if user_lang != "en":
            clar = translate_result_texts(clar, user_lang)
        clar["language"]  = user_lang
        clar["direction"] = user_dir
        return clar

    PRICE_CHECK_PHRASES = [
        "worth the price", "worth it", "fair price", "overpaying",
        "overpriced", "is it worth", "good deal", "too expensive",
    ]
    needs_price_clarification = any(p in msg_lower for p in PRICE_CHECK_PHRASES) and not budget
    if budget:
        context_data["user_budget_aed"]   = budget
        context_data["user_budget_label"] = f"AED {budget/1_000_000:.2f}M"
    if bedrooms:
        context_data["user_bedrooms"] = bedrooms
    if unit_sqft:
        context_data["user_unit_sqft"] = unit_sqft

    if area_id and not is_comparison:
        await build_area_context_async(area_id, detected_area, context_data, matched_project_name, property_type, bedrooms)
    elif is_comparison and len(all_area_ids) >= 2:
        sub_tasks = []
        for aid, kw in all_area_ids[:3]:
            sub = {}
            key = f"comparison_{preferred_name(aid, kw).replace(' ','_').lower()}"
            if key not in context_data: sub_tasks.append((key, aid, kw, sub))
        await asyncio.gather(*[build_area_context_async(aid, kw, sub, bedrooms=bedrooms) for _, aid, kw, sub in sub_tasks])
        for key, _, _, sub in sub_tasks: context_data[key] = sub
    elif is_lifestyle and not area_id:
        context_data["query_type"]      = "lifestyle"
        context_data["_lifestyle_tags"] = [w for w in LIFESTYLE_KEYWORDS if w in msg_lower]

        if nationality:
            context_data["_lifestyle_tags"].append(nationality)
            lifestyle_ids = await _run(fetch_areas_by_nationality, nationality)
        else:
            lifestyle_ids = []

        if not lifestyle_ids:
            lifestyle_ids = get_lifestyle_areas(msg_lower)

        # Villa/townhouse buyers shouldn't get apartment-dominant areas
        # mixed into a family-home shortlist — intersect against areas
        # actually known for villa/townhouse stock. Falls back to the
        # unfiltered list if the intersection is empty, so this never
        # produces zero results.
        if property_type in ("Villa", "Townhouse") and lifestyle_ids:
            villa_ids = set(LIFESTYLE_AREA_MAP.get("villa", []))
            filtered_ids = [aid for aid in lifestyle_ids if aid in villa_ids]
            if filtered_ids:
                lifestyle_ids = filtered_ids

        if not lifestyle_ids:
            # Absolute last resort so this branch never silently returns
            # nothing and falls through to the generic LLM answer.
            top = await _run(fetch_top_areas_intelligence, 6)
            lifestyle_ids = [a["area_id"] for a in top if a.get("area_id")]

        lifestyle_ids = filter_by_commute(lifestyle_ids, commute_info)[:4]

        if commute_info:
            context_data["_commute_ref_name"] = commute_info["ref_area_name"]
            context_data["_commute_min"]      = commute_info["min"]
            context_data["_commute_max"]      = commute_info["max"]

        subs = [{} for _ in lifestyle_ids]
        await asyncio.gather(*[
            build_area_context_async(lid, "", sub, property_type=property_type, bedrooms=bedrooms)
            for lid, sub in zip(lifestyle_ids, subs)
        ])
        for lid, sub in zip(lifestyle_ids, subs):
            name = sub.get("area_intelligence", {}).get("area_name_en") or preferred_name(lid)
            context_data[f"lifestyle_{name.replace(' ','_').lower()}"] = sub

    is_financing_question = any(k in msg_lower for k in NO_DP_KEYWORDS + FINANCING_KEYWORDS)

    if any(w in msg_lower for w in YIELD_KEYWORDS) and not area_id and not is_financing_question:
        top = await _run(fetch_top_yield_areas)
        if top: context_data["top_yield_areas"] = top

    if is_volume_query(msg_lower) and not is_lifestyle and not is_comparison and not area_id and not is_financing_question:
        top = await _run(fetch_top_areas_by_volume)
        if top: context_data["top_areas"] = top
    elif has_market_keyword(msg_lower) and not is_lifestyle and not is_comparison and not area_id and not is_financing_question:
        top = await _run(fetch_top_areas_intelligence)
        if top: context_data["top_areas"] = top

    is_strategy_q = bool(budget) and is_portfolio_strategy_question(msg_lower) and not area_id

    if is_strategy_q:
        top = await _run(fetch_top_areas_intelligence, 15)
        if top: context_data["strategy_candidate_areas"] = top
    elif budget and not area_id and not is_lifestyle and not is_financing_question and not context_data.get("_is_legal_fallback"):
        top = await _run(fetch_top_areas_intelligence, 30)
        if top: context_data["budget_search_areas"] = top
    elif prior_offer_type == "needs_unit_shortlist" and not area_id and not budget:
        budget = GOLDEN_VISA_MIN_AED
        context_data["user_budget_aed"] = budget
        context_data["user_budget_label"] = f"AED {budget/1_000_000:.2f}M"
        context_data["_is_visa_query"] = True
        context_data["_is_legal_fallback"] = True
        top = await _run(fetch_top_areas_intelligence, 30)
        if top: context_data["budget_search_areas"] = top

   # Also check lifestyle sub-contexts

   # Also check lifestyle sub-contexts
    _lifestyle_keys   = [k for k in context_data if k.startswith("lifestyle_")]
    _comparison_keys  = [k for k in context_data if k.startswith("comparison_")]

    has_area_data = bool(
    context_data.get("area_intelligence") or
    context_data.get("transaction_stats") or
    context_data.get("top_yield_areas") or
    context_data.get("top_areas") or
    context_data.get("budget_search_areas") or
    context_data.get("strategy_candidate_areas") or
    _lifestyle_keys or
    _comparison_keys
)

    if needs_price_clarification:
        stats = context_data.get("transaction_stats", {})
        intel = context_data.get("area_intelligence", {})
        bmed  = stats.get("median_price_by_bedroom", {})
        area_label = detected_area or "this property"
        target_br  = bedrooms or "4 BR"

        # NEW — matches the compact UI style: short intro + numbered question,
        # instead of a paragraph-style reference dump inline.
        reply_lines = [
            "To tell you if this is a fair price, I need one more detail:",
            "",
            f"1. What price are you being quoted for {area_label.lower()}?",
            "",
            "Once I have that, I'll compare it against real DLD closed-sale data "
            "for the exact project and bedroom size.",
        ]
        if bmed or context_data.get("recent_transactions"):
            reply_lines += [
                "",
                "By the way — I already have the bedroom pricing and recent "
                "transactions for this area pulled up below.",
            ]
        



        result = {
            "type":          "structured",
            "user_type":     user_type,
            "response_mode": "specific_answer",
            "is_clarifying": True,
            "summary":       f"What price are you being quoted for {area_label}? I'll benchmark it against real DLD sales.",
            "reply":         "\n".join(reply_lines),
            "charts":        [],
            "insight":       "",
            "bedroom_avg_psm":         stats.get("bedroom_avg_psm", {}),
            "median_price_by_bedroom": bmed,
            "recent_transactions":     context_data.get("recent_transactions", []),
        }
        if intel.get("area_name_en"):
            result["score"]              = intel.get("investment_score")
            result["verdict"]            = intel.get("verdict")
            result["yield_pct"]          = intel.get("gross_yield_pct")
            result["price_trend"]        = intel.get("price_trend_pct")
            result["area_intelligence"]  = intel
            result["transaction_stats"]  = stats
            result["area_catalysts"]     = context_data.get("area_catalysts", [])
            result["price_history"]      = context_data.get("price_history_by_year", {})
        if detected_area:
            result["area_links"] = [{"name": detected_area, "url": f"https://www.acqar.com/areas/{area_to_slug(detected_area)}"}]
        result["closing_question"] = build_closing_question(user_type, context_data, bedrooms, prior_reply=last_assistant_msg)
        if user_lang != "en":
            result = translate_result_texts(result, user_lang)
        result["language"]  = user_lang
        result["direction"] = user_dir
        result["data_found"] = bool(has_area_data)
        return result

    # ── CHANGE 3: If no area data, still fetch top areas for context ──
    if not has_area_data and not area_id:
        top = await _run(fetch_top_areas_intelligence, 10)
        if top:
            context_data["dubai_market_context"] = top

    seller_has_price_question = user_type == "seller" and budget and any(
        k in msg_lower for k in ["is that", "too high", "too low", "fair price", "overpaying", "overpriced", "how can i sell", "sell it"]
    )

    # Build a properly grounded question when this message is just a bare
    # price answering our own clarifying prompt — "2M" alone is too weak a
    # question to hand the LLM; reconstruct what's actually being asked.
    effective_question = detection_message
    if is_answering_price_prompt:
        area_label = detected_area or "this property"
        effective_question = (
            f"Is {fmt_aed(budget)} a fair price for a "
            f"{bedrooms + ' ' if bedrooms else ''}property in {area_label}? "
            f"Compare it against the real DLD median and give a clear verdict."
        )

    specific_answer_failed = False
    result = None
    # A bare "yes"/"sure" answering our own closing_question offer carries no
    # content on its own — reconstruct what was actually being agreed to
    # before handing it to build_specific_answer, mirroring how the
    # LLM-fallback branch already handles is_affirmative_followup below.
    if is_affirmative_followup and last_assistant_msg and effective_question == detection_message:
        prior_lines = [l.strip() for l in last_assistant_msg.split("\n") if l.strip()]
        prior_question = next((l for l in reversed(prior_lines) if l.endswith("?")), None)
        if prior_question:
            offer_type = prior_offer_type or _classify_prior_offer(prior_question)
            has_area = bool(context_data.get("detected_area"))
            if offer_type == "needs_area" and not has_area:
                effective_question = (
                    f"The user replied \"{message}\" agreeing to this offer: "
                    f"\"{prior_question}\" — but no specific area has been named yet. "
                    f"Do NOT repeat the visa mechanics or the table you already gave. "
                    f"Ask ONE short, direct follow-up question asking which area(s) "
                    f"they're considering (e.g. JVC, Dubai South, International City), "
                    f"or offer 2-3 known affordable freehold areas near the visa "
                    f"threshold as quick options, then stop and wait for their answer."
                )
            elif offer_type == "needs_unit_shortlist":
                effective_question = (
                    f"The user replied \"{message}\" agreeing to see a shortlist of "
                    f"freehold units/areas near the Golden Visa minimum property value. "
                    f"Real candidate areas and prices are provided in AREA DATA FACTS — "
                    f"present them as an actual shortlist with names and prices. Do NOT "
                    f"repeat the visa mechanics table or eligibility explanation again — "
                    f"the user has already seen it."
                )
            else:
                effective_question = (
                    f"The user replied \"{message}\" — agreeing to this offer from your "
                    f"previous turn: \"{prior_question}\". Fulfill that offer directly now "
                    f"with real, complete content (e.g. the actual list of items offered, "
                    f"the actual document, the actual next steps). Do NOT repeat or "
                    f"re-summarize your previous answer. Do NOT reprint the visa "
                    f"mechanics table again — the user has already seen it."
                )
    if has_area_data and is_transactions_query and not _comparison_keys:
        stats = context_data.get("transaction_stats", {})
        result = {
            "type":          "structured",
            "user_type":     user_type,
            "response_mode": "specific_answer",
            "summary":       f"Recent DLD transactions for {context_data.get('detected_area','this area')}.",
            "reply":         build_transactions_only_reply(context_data, bedrooms),
            "charts":        [],
            "insight":       "",
            "bedroom_avg_psm":         stats.get("bedroom_avg_psm", {}),
            "median_price_by_bedroom": stats.get("median_price_by_bedroom", {}),
            "recent_transactions":     context_data.get("recent_transactions", []),
        }
    elif has_area_data and (use_specific_mode or seller_has_price_question or is_answering_price_prompt) and not _comparison_keys:
        ans = build_specific_answer(effective_question, context_data, bedrooms, prior_reply=last_assistant_msg)
        summary = _coerce_text(ans.get("summary"))
        reply_text = _coerce_text(ans.get("reply"))
        closing_q = _coerce_text(ans.get("closing_question"))
        specific_answer_failed = reply_text == "Sorry, I hit an error answering that — could you rephrase?"
        
    

        if not summary and reply_text:
            first_sentence = reply_text.split(". ")[0].strip()
            summary = first_sentence if len(first_sentence) <= 140 else first_sentence[:137] + "..."

        stats = context_data.get("transaction_stats", {})
        has_bedroom_table = bool(stats.get("bedroom_avg_psm") or stats.get("median_price_by_bedroom"))
        has_txn_table = bool(context_data.get("recent_transactions"))
        if has_bedroom_table and has_txn_table:
            reply_text = reply_text.rstrip() + (
                "\n\nBy the way — I already have the bedroom pricing and recent "
                "transactions for this area pulled up below."
            )

        if specific_answer_failed:
            result = None
        else:
            specific_charts = build_charts(context_data, user_type) if wants_data_visual(detection_message) else []
            result = {
                "type":          "structured",
                "user_type":     user_type,
                "response_mode": "specific_answer",
                "summary":       summary,
                "reply":         reply_text,
                "charts":        specific_charts,
                "insight":       _coerce_text(ans.get("insight")),
                "bedroom_avg_psm":         stats.get("bedroom_avg_psm", {}),
                "median_price_by_bedroom": stats.get("median_price_by_bedroom", {}),
                "recent_transactions":     context_data.get("recent_transactions", []),
            }
            if closing_q:
                result["closing_question"] = closing_q
    if result is None and has_area_data:
        is_multi_area = bool(_comparison_keys) or bool(_lifestyle_keys) or bool(context_data.get("budget_search_areas")) or \
                 bool(context_data.get("strategy_candidate_areas")) or \
                 bool(context_data.get("top_yield_areas") or context_data.get("top_areas"))

        if _comparison_keys:                              reply = build_comparison_reply(context_data, bedrooms)
        elif _lifestyle_keys:                              reply = build_lifestyle_reply(context_data, bedrooms)
        elif context_data.get("strategy_candidate_areas"): reply = build_portfolio_strategy_reply(context_data, budget)
        elif context_data.get("budget_search_areas"):    reply = build_budget_reply(context_data, bedrooms, budget)
        elif context_data.get("top_yield_areas") or context_data.get("top_areas"):
            # Ranked area list (no single area detected) — always use the
            # ranked-list builder, regardless of detected user_type.
            reply = build_investor_reply(context_data, bedrooms)
        elif user_type == "buyer":                       reply = build_buyer_reply(context_data, bedrooms)
        elif user_type == "seller":                      reply = build_seller_reply(context_data, bedrooms)
        elif user_type == "investor":                    reply = build_investor_reply(context_data, bedrooms)
        elif user_type == "broker":                      reply = build_broker_reply(context_data, bedrooms)
        else:
            reply = build_general_reply(context_data, bedrooms)

        result = {
            "type":          "structured",
            "user_type":     user_type,
            "response_mode": "multi_area" if is_multi_area else "single_area",
            "summary":       build_summary(user_type, context_data, bedrooms),
            "reply":         reply,
            "charts":        [] if _comparison_keys else build_charts(context_data, user_type),
            "insight":       build_insight(user_type, context_data, bedrooms),
        }

        if _comparison_keys:
            comparison_data = []
            for k in _comparison_keys:
                sub = context_data[k]
                intel = sub.get("area_intelligence", {})
                if intel.get("area_name_en"):
                    comparison_data.append({
                        "name": intel.get("area_name_en"),
                        "score": intel.get("investment_score"),
                        "verdict": intel.get("verdict"),
                        "yield_pct": intel.get("gross_yield_pct"),
                        "avg_psm": intel.get("truvalu_psm") or sub.get("transaction_stats", {}).get("avg_price_sqm"),
                        "price_trend": intel.get("price_trend_pct"),
                        "bedroom_avg_psm": sub.get("transaction_stats", {}).get("bedroom_avg_psm", {}),
                        "median_price_by_bedroom": sub.get("transaction_stats", {}).get("median_price_by_bedroom", {}),
                        "price_history": sub.get("price_history_by_year", {}),
                    })
            result["comparison_data"] = comparison_data

        if _lifestyle_keys:
            lifestyle_data = []
            for k in _lifestyle_keys:
                sub = context_data[k]
                intel = sub.get("area_intelligence", {})
                stats = sub.get("transaction_stats", {})
                name = intel.get("area_name_en") or sub.get("detected_area", "")
                if name:
                    lifestyle_data.append({
                        "name":                     name,
                        "score":                    intel.get("investment_score"),
                        "verdict":                  intel.get("verdict"),
                        "yield_pct":                intel.get("gross_yield_pct"),
                        "avg_psm":                  intel.get("truvalu_psm") or stats.get("avg_price_sqm"),
                        "price_trend":              intel.get("price_trend_pct"),
                        "bedroom_avg_psm":          stats.get("bedroom_avg_psm", {}),
                        "median_price_by_bedroom":  stats.get("median_price_by_bedroom", {}),
                        "price_history":            sub.get("price_history_by_year", {}),
                        "buyer_nationalities":      intel.get("buyer_nationalities", []),
                        "key_developers":           intel.get("key_developers", []),
                        "active_project_names":     intel.get("active_project_names", []),
                        "developer_track_records":  sub.get("developer_track_records", []),
                        "area_catalysts":           sub.get("area_catalysts", []),
                        "parks_info":               intel.get("parks_info"),
                        "retail_info":              intel.get("retail_info"),
                        "nearby_schools":           SCHOOL_MAP.get(name),
                        "property_type_fallback_used": sub.get("property_type_fallback_used", False),
                    })
            result["lifestyle_data"] = lifestyle_data
    if result is None:
        # No area data at all (specific-answer didn't run/failed, AND no
        # templated report was built above) — LLM answers with full expert
        # knowledge + market context. Must be an independent check, not an
        # else, so it never overwrites a successful specific-answer result.
        db_context = ""
        wants_area_recommendations = has_market_keyword(msg_lower) or any(w in msg_lower for w in YIELD_KEYWORDS)
        if context_data.get("dubai_market_context") and wants_area_recommendations:
            top_areas = context_data["dubai_market_context"]
            area_list = ", ".join([
                f"{a.get('area_name_en','')} (Score {a.get('investment_score','')}/100, Yield {a.get('gross_yield_pct','')}%)"
                for a in top_areas[:5] if a.get("area_name_en")
            ])
            db_context = f"\n\nACQAR Dubai Market Context (real DLD data):\nTop areas by score: {area_list}\nUse these real area names and data points where relevant in your answer."

        if budget:
            db_context += f"\n\nUser's estimated budget from message: AED {budget:,.0f}"

        if any(k in msg_lower for k in OFFPLAN_DEFAULT_KEYWORDS):
            db_context += f"\n\n{OFFPLAN_DEFAULT_FACTS}"

        if any(k in msg_lower for k in VISA_QUERY_KEYWORDS):
            db_context += f"\n\n{VISA_RULES_FACTS}"
            if is_visa_cost_tradeoff_query(msg_lower):
                db_context += (
                    "\n\nThis question asks whether spending MORE than the visa's "
                    "minimum property value is worth it, or for a smarter/cheaper "
                    "way to hit the threshold. This REQUIRES an explicit verdict: "
                    "state that the visa is pass/fail with no bonus for a pricier "
                    "property, so a minimum-spec freehold unit near the threshold "
                    "is the capital-efficient choice, and paying more only makes "
                    "sense if that unit has its own independent investment merits "
                    "(yield, appreciation, personal use). Do not just restate that "
                    "a cheaper unit also qualifies — that is not a verdict."
                )




        if any(k in msg_lower for k in BUYER_PROTECTION_KEYWORDS):
            db_context += f"\n\n{BUYER_PROTECTION_FACTS}"

        if any(k in msg_lower for k in SERVICE_CHARGE_KEYWORDS):
            db_context += f"\n\n{SERVICE_CHARGE_FACTS}"

        if any(k in msg_lower for k in FRACTIONAL_INVESTING_KEYWORDS):
            db_context += f"\n\n{FRACTIONAL_INVESTING_FACTS}"

        if context_data.get("_is_investment_verdict"):
            db_context += (
                "\n\nThis question asks for an investment VERDICT on a specific project or "
                "developer (e.g. 'is the case strong, or am I just paying a brand premium'). "
                "Use the GENERAL MARKET / TREND / OPINION format (📌 DIRECT ANSWER → "
                "📊 THE DATA BEHIND IT → 🔍 ANALYSIS → ✅ BOTTOM LINE) — do NOT use the "
                "due-diligence/red-flags checklist format for this. Give an actual opinion/"
                "verdict on THIS project, not a generic list of things to check.\n"
                "CRITICAL: You have NO verified pricing, yield, occupancy, or delivery data "
                "for this specific project — none was provided to you. Rule 1 (never invent "
                "exact statistics not present in provided context) applies in FULL here. This "
                "means: do NOT state any specific AED/sqft price, percentage yield, percentage "
                "price-growth figure, occupancy rate, or on-time-delivery rate for this specific "
                "project or its 'comparable' projects — not even hedged as an estimate, and "
                "NEVER attributed to a source like 'reported by agents' or 'agents report' when "
                "no such source was given to you. Describe the investment case qualitatively "
                "only: brand reputation effects, location/demand fundamentals you're confident "
                "are true in general terms, typical trade-offs of buying an Emaar/branded "
                "project vs a mid-tier developer. If the person wants actual numbers, say "
                "plainly that you don't have verified pricing/yield data for this specific "
                "project and suggest they pull comparable DLD transactions for the area or "
                "confirm current pricing directly with the developer's sales team."
            )

        MAX_HISTORY_MSG_CHARS = 600
        messages = [{"role": "system", "content": FALLBACK_SYSTEM_PROMPT}]
        for h in (req.history or [])[-4:]:
            if h.get("role") in ("user","assistant") and h.get("content"):
                content = str(h["content"])
                if len(content) > MAX_HISTORY_MSG_CHARS:
                    content = content[:MAX_HISTORY_MSG_CHARS] + " …(truncated)"
                messages.append({"role": h["role"], "content": content})
        lang_instr = ""
        if user_lang != "en":
            lang_instr = (
                f"\n\nIMPORTANT: Write summary, reply, and insight entirely in {LANG_NAMES[user_lang]}. "
                f"Translate the section headers too, but ALWAYS keep the emoji as the first character of each header line. "
                f"Keep numbers, AED amounts, percentages, area names, developer names, and URLs in Latin script unchanged."
            )

        if is_affirmative_followup and last_assistant_msg:
            prior_lines = [l.strip() for l in last_assistant_msg.split("\n") if l.strip()]
            prior_question = next((l for l in reversed(prior_lines) if l.endswith("?")), None)
            if prior_question:
                effective_ask = (
                    f"The user replied \"{message}\" — agreeing to this offer you made at the end of "
                    f"your previous turn: \"{prior_question}\". Fulfill that offer directly now with "
                    f"real, complete content (e.g. write the actual document/template/steps offered). "
                    f"Do NOT repeat or re-summarize your previous answer."
                )
            else:
                effective_ask = f"Question: {message}"
        else:
            effective_ask = f"Question: {message}"

        messages.append({
            "role": "user",
            "content": f"{effective_ask}{db_context}{lang_instr}\n\nAnswer this fully and specifically. Reply with JSON only."
        })

        def call_groq(model: str, msgs: list) -> str:
            resp = groq_client.chat.completions.create(
                model=model, messages=msgs, temperature=0.2,
                max_tokens=1800, response_format={"type": "json_object"},
            )
            return resp.choices[0].message.content.strip()

        try:
            _t_llm_start = time.monotonic()
            try:
                raw = await _run(call_groq, PRIMARY_MODEL, messages)
                print(f"[ACQAR TIMING] primary_model_call: {time.monotonic() - _t_llm_start:.2f}s")
            except Exception as e1:
                print(f"[ACQAR TIMING] primary_model_FAILED_after: {time.monotonic() - _t_llm_start:.2f}s | {e1}")
                try:
                    _t_fallback_start = time.monotonic()
                    fallback_messages = [messages[0], messages[-1]]
                    raw = await _run(call_groq, FALLBACK_MODEL, fallback_messages)
                    print(f"[ACQAR TIMING] fallback_model_call: {time.monotonic() - _t_fallback_start:.2f}s")
                except Exception as e2:
                    # Both models rejected the SAME prompt near-instantly with
                    # empty output — a content-refusal pattern, not a length/
                    # formatting issue. Retrying identically fails again.
                    # Strip db_context (likely trigger), drop json_object mode
                    # (so a refusal returns text instead of a hard 400), and
                    # use a short neutral instruction instead.
                    print(f"[ACQAR] both models refused | {e2} | msg='{message[:200]}'")
                    raw = await _run(call_groq_plain, message)
            result = extract_json(raw)
            result["summary"] = _coerce_text(result.get("summary"))
            result["reply"]   = _strip_dangling_fragment(_coerce_text(result.get("reply")))
            result["insight"] = _coerce_text(result.get("insight"))
            result["_db_context_for_audit"] = db_context
            result["closing_question"] = _coerce_text(result.get("closing_question")) or None
            if not result["closing_question"]:
                result.pop("closing_question", None)
            result["_llm_answered"] = True
            result["type"] = "structured"; result["user_type"] = user_type
            result["response_mode"] = "multi_area" if context_data.get("dubai_market_context") else "single_area"
            result.pop("data_source", None)
            # NOTE: hero area (score/verdict/yield_pct/area_intelligence) is now promoted
            # uniformly below via pick_hero_area() — no manual promotion needed here.

            # Prefer area names the LLM actually mentioned in its own reply — this
            # correctly links a genuine "top areas" answer and correctly adds NO
            # links to unrelated FAQ/company questions.
            top_fallback = (
                context_data.get("top_yield_areas") or
                context_data.get("top_areas") or
                context_data.get("dubai_market_context") or
                []
            )
            reply_text = result.get("reply", "")
            extracted_links = []
            extracted_area_ids = []
            if not is_developer_query(msg_lower) and wants_area_recommendations:
                for pos, area_id_val, area_name in find_areas_in_reply(reply_text.lower()):
                    display = AREA_DISPLAY_NAMES.get(area_id_val, area_name.title())
                    url = f"https://www.acqar.com/areas/{area_to_slug(display)}"
                    if not any(l["url"] == url for l in extracted_links):
                        extracted_links.append({"name": display, "url": url})
                    extracted_area_ids.append((area_id_val, area_name))
                    if len(extracted_links) >= 8:
                        break
            if extracted_links:
                result["area_links"] = extracted_links
            elif top_fallback and wants_area_recommendations and not is_developer_query(msg_lower):
                # Only fall back to generic top-ranked areas when the question
                # actually asked for area recommendations.
                result["area_links"] = [
                    {
                        "name": a.get("area_name_en", ""),
                        "url": f"https://www.acqar.com/areas/{area_to_slug(a.get('area_name_en', ''))}"
                    }
                    for a in top_fallback[:8] if a.get("area_name_en")
                ]

            if extracted_area_ids and wants_area_recommendations:
                fetch_targets = extracted_area_ids[:10]
                multi_subs = [{} for _ in fetch_targets]
                await asyncio.gather(*[
                    build_area_context_async(aid, kw, sub, bedrooms=bedrooms)
                    for (aid, kw), sub in zip(fetch_targets, multi_subs)
                ])
                multi_area_data = []
                for (aid, kw), sub in zip(fetch_targets, multi_subs):
                    intel_sub = sub.get("area_intelligence") or {}
                    stats_sub = sub.get("transaction_stats") or {}
                    name = intel_sub.get("area_name_en") or sub.get("detected_area", "") or preferred_name(aid, kw)
                    if not name:
                        continue
                    multi_area_data.append({
                        "name":                     name,
                        "score":                    intel_sub.get("investment_score"),
                        "verdict":                  intel_sub.get("verdict"),
                        "yield_pct":                intel_sub.get("gross_yield_pct"),
                        "avg_psm":                  intel_sub.get("truvalu_psm") or stats_sub.get("avg_price_sqm"),
                        "price_trend":              intel_sub.get("price_trend_pct"),
                        "bedroom_avg_psm":          stats_sub.get("bedroom_avg_psm", {}),
                        "median_price_by_bedroom":  stats_sub.get("median_price_by_bedroom", {}),
                        "price_history":            sub.get("price_history_by_year", {}),
                        "buyer_nationalities":      intel_sub.get("buyer_nationalities", []),
                        "key_developers":           intel_sub.get("key_developers", []),
                        "active_project_names":     intel_sub.get("active_project_names", []),
                        "developer_track_records":  sub.get("developer_track_records", []),
                        "area_catalysts":           sub.get("area_catalysts", []),
                        "parks_info":               intel_sub.get("parks_info"),
                        "retail_info":              intel_sub.get("retail_info"),
                        "recent_transactions":      sub.get("recent_transactions", []),
                    })
                if multi_area_data:
                    result["lifestyle_data"] = multi_area_data
                    result["response_mode"] = "multi_area"
        except Exception as e:
            print(f"[ACQAR] LLM error: {e} | msg='{message[:200]}' | legal={context_data.get('_is_legal_fallback')} | visa={context_data.get('_is_visa_query')} | due_diligence={context_data.get('_is_due_diligence')} | verdict={context_data.get('_is_investment_verdict')}")
            result = {"type":"text","summary":"","reply":"I hit an error. Please try rephrasing your question.","charts":[],"insight":""}
    
   

    is_specific_answer_mode = result.get("response_mode") == "specific_answer"
    hero  = pick_hero_area(context_data)
    intel = hero["intel"]

    # Hero data taken directly from a detected area (context_data["area_intelligence"])
    # is always trustworthy — the whole report is about that area. But when hero falls
    # back to a top-ranked area from dubai_market_context/top_areas/top_yield_areas
    # (i.e. no area was actually detected in the user's message), only attach it if the
    # reply genuinely mentions that area — otherwise we're stapling unrelated area
    # stats/badges onto a question that has nothing to do with that area.
    hero_is_real_detected_area = bool(context_data.get("area_intelligence"))
    reply_check = (result.get("reply") or "").lower().replace(" ", "")
    hero_area_check = (intel.get("area_name_en") or "").lower().replace(" ", "").replace("(", "").replace(")", "")
    hero_area_relevant = hero_is_real_detected_area or (hero_area_check and hero_area_check in reply_check)

    if intel and intel.get("area_name_en") and hero_area_relevant:
        result["score"]        = intel.get("investment_score")
        result["verdict"]      = intel.get("verdict")
        result["yield_pct"]    = intel.get("gross_yield_pct")
        result["price_trend"]  = intel.get("price_trend_pct")
        result["ranking"]      = intel.get("ranking_rank")
        result["distress_pct"] = intel.get("distress_pct")
        y = intel.get("gross_yield_pct")
        if y: result["yield_vs_dubai_avg"] = round(float(y) - 6.1, 2)
        result["area_intelligence"]  = intel
        result["transaction_stats"]  = hero["stats"]
        if context_data.get("recent_transactions") and "recent_transactions" not in result:
            result["recent_transactions"] = context_data["recent_transactions"]
        result["area_catalysts"]     = hero["cats"]
        result["price_history"]      = hero["hist"]
        result["developer_track_records"] = context_data.get("developer_track_records", [])
        result["confirmed_catalyst_count"] = context_data.get("confirmed_catalyst_count")
       # Only flag the "data incomplete" banner when the CORE numbers are
        # missing (score/yield). Bedroom breakdown, price history, and
        # catalysts are routinely thin for single-project villa communities —
        # showing a warning every time is noise, not useful signal.
        missing = []
        if not intel.get("investment_score"): missing.append("Investment Score")
        if not intel.get("gross_yield_pct"):   missing.append("Rental Yield")
        if missing:
            result["data_incomplete"] = True
            result["missing_fields"] = missing

# ── Area links — only areas actually in the reply ──
    reply_text = result.get("reply", "")
    reply_lower = reply_text.lower().replace(" ", "").replace("(", "").replace(")", "")

    final_links = []
    seen_urls   = set()

    if not is_developer_query(msg_lower):
      # 1. Comparison + Lifestyle areas — only those mentioned in reply
        for k in context_data:
            if k.startswith("lifestyle_") or k.startswith("comparison_"):
                sub  = context_data[k]
                if not isinstance(sub, dict): continue
                name = (sub.get("area_intelligence") or {}).get("area_name_en") or sub.get("detected_area", "")
                if not name: continue
                check = name.lower().replace(" ", "").replace("(", "").replace(")", "")
                if check in reply_lower:
                    url = f"https://www.acqar.com/areas/{area_to_slug(name)}"
                    if url not in seen_urls:
                        final_links.append({"name": name, "url": url})
                        seen_urls.add(url)

        # 2. Top yield / top areas — only if mentioned in reply
        if not final_links:
            top_yield      = context_data.get("top_yield_areas", [])
            top_areas_list = context_data.get("top_areas", [])
            top_data       = top_yield or top_areas_list or context_data.get("dubai_market_context", [])
            for a in top_data:
                name = a.get("area_name_en", "")
                if not name: continue
                check = name.lower().replace(" ", "").replace("(", "").replace(")", "")
                if check in reply_lower:
                    url = f"https://www.acqar.com/areas/{area_to_slug(name)}"
                    if url not in seen_urls:
                        final_links.append({"name": name, "url": url})
                        seen_urls.add(url)

       # 3. Single detected area fallback — skip for specific answers
        if not final_links and not is_specific_answer_mode:
            detected = context_data.get("detected_area", "")
            if detected:
                url = f"https://www.acqar.com/areas/{area_to_slug(detected)}"
                final_links.append({"name": detected, "url": url})
                seen_urls.add(url)

       # 4. LLM reply fallback — scan reply text for any known area names.
        # Word-boundary match + skip names that only appear parenthetically
        # attached to a DIFFERENT area name (e.g. "Liwan (Deira)" should not
        # link Deira — it's a sub-locality note, not a separate area mention).
        if not final_links:
            reply_scan = reply_text.lower()
            for area_name in sorted(AREA_ID_MAP, key=len, reverse=True):
                pattern = r'\b' + re.escape(area_name) + r'\b'
                if re.search(pattern, reply_scan) and f"({area_name}" not in reply_scan:
                    area_id_val = AREA_ID_MAP[area_name]
                    display = AREA_DISPLAY_NAMES.get(area_id_val, area_name.title())
                    url = f"https://www.acqar.com/areas/{area_to_slug(display)}"
                    if url not in seen_urls:
                        final_links.append({"name": display, "url": url})
                        seen_urls.add(url)
                if len(final_links) >= 6: break

    if final_links:
        result["area_links"] = final_links[:6]
        # Single source of truth for area chips — only the "Explore Areas"
        # pill bar should render this. Do not also render a card grid from
        # the same array.
        result["area_links_display"] = "pills_only"

    detected = context_data.get("detected_area", "")
    if detected and not is_developer_query(msg_lower):
        result["area_url"] = f"https://www.acqar.com/areas/{area_to_slug(detected)}"

    print(f"[DEBUG] top_yield count: {len(context_data.get('top_yield_areas', []))}")
    print(f"[DEBUG] top_areas count: {len(context_data.get('top_areas', []))}")
    print(f"[DEBUG] dubai_market_context count: {len(context_data.get('dubai_market_context', []))}")
    print(f"[DEBUG] has_area_data: {has_area_data}")
    print(f"[ACQAR DEBUG] area_id={area_id}, detected_area={detected_area}, nationality={nationality}, is_lifestyle={is_lifestyle}, commute_info={commute_info}, bedrooms={bedrooms}")

    is_legal_topic     = bool(context_data.get("_is_legal_fallback"))
    is_due_diligence   = bool(context_data.get("_is_due_diligence"))
    is_fractional_topic = any(k in msg_lower for k in FRACTIONAL_INVESTING_KEYWORDS)
    force_scrub        = is_legal_topic or is_due_diligence or is_fractional_topic

    # Applies to every response, not just visa queries — third-party
    # platform CTAs and unverified stats can appear in any investment-
    # comparison answer.
    if result.get("reply"):
        result["reply"] = scrub_platform_ctas(result["reply"])
        result["reply"] = scrub_platform_stats(result["reply"])
        result["reply"] = scrub_fractional_category_stats(result["reply"])
    if result.get("summary"):
        result["summary"] = scrub_platform_ctas(result["summary"])
        result["summary"] = scrub_platform_stats(result["summary"], short=True)
        result["summary"] = scrub_fractional_category_stats(result["summary"], short=True)
    if result.get("insight"):
        result["insight"] = scrub_platform_ctas(result["insight"])
        result["insight"] = scrub_platform_stats(result["insight"], short=True)
        result["insight"] = scrub_fractional_category_stats(result["insight"], short=True)

    if result.get("reply"):
        result["reply"] = scrub_legal_citations(result["reply"], force=force_scrub)
        result["reply"] = scrub_fabricated_metrics(result["reply"])
    if result.get("summary"):
        result["summary"] = scrub_legal_citations(result["summary"], short=True, force=force_scrub)
        result["summary"] = scrub_fabricated_metrics(result["summary"], short=True)
    if result.get("insight"):
        result["insight"] = scrub_legal_citations(result["insight"], short=True, force=force_scrub)
        result["insight"] = scrub_fabricated_metrics(result["insight"], short=True)

    is_visa_topic = bool(context_data.get("_is_visa_query"))
    if is_visa_topic:
        if result.get("reply"):
            result["reply"] = scrub_visa_timeframes(result["reply"], True)
            result["reply"] = scrub_visa_thresholds(result["reply"], True)
            result["reply"] = scrub_visa_retention_claims(result["reply"], True)
        if result.get("summary"):
            result["summary"] = scrub_visa_thresholds(result["summary"], True)
            result["summary"] = scrub_visa_retention_claims(result["summary"], True)
        if result.get("insight"):
            result["insight"] = scrub_visa_thresholds(result["insight"], True)
            result["insight"] = scrub_visa_retention_claims(result["insight"], True)

   # Applies to every response, not just visa queries — third-party
    # platform CTAs and unverified stats can appear in any investment-
    # comparison answer.
    if result.get("reply"):
        result["reply"] = scrub_platform_ctas(result["reply"])
        result["reply"] = scrub_platform_stats(result["reply"])
    if result.get("summary"):
        result["summary"] = scrub_platform_ctas(result["summary"])
        result["summary"] = scrub_platform_stats(result["summary"], short=True)
    if result.get("insight"):
        result["insight"] = scrub_platform_ctas(result["insight"])
        result["insight"] = scrub_platform_stats(result["insight"], short=True)

    if result.get("reply"):
        result["reply"] = scrub_service_charge_basis(result["reply"])
    if result.get("summary"):
        result["summary"] = scrub_service_charge_basis(result["summary"], short=True)
    if result.get("insight"):
        result["insight"] = scrub_service_charge_basis(result["insight"], short=True)

    result["is_legal_topic"] = is_legal_topic
    result["is_due_diligence"] = is_due_diligence

    if result.get("reply") and not result["reply"].rstrip().endswith(("?", "؟")) and "closing_question" not in result:
        cq = build_closing_question(user_type, context_data, bedrooms, prior_reply=last_assistant_msg)
        if cq:
            result["closing_question"] = cq

    

    skip_translate = result.pop("_llm_answered", False)
    if user_lang != "en" and not skip_translate:
        result = translate_result_texts(result, user_lang)
    result["language"]  = user_lang
    result["direction"] = user_dir
    result["data_found"] = bool(has_area_data)
    # Relevance grading is only used for internal admin review, not shown to
    # the user — run it in the background instead of making them wait for it.
    result["relevance_score"] = None
    asyncio.create_task(_run(grade_relevance, message, result.get("reply", "")))
    audit_ctx = result.pop("_db_context_for_audit", None)
    if audit_ctx:
        asyncio.create_task(_run(grade_fact_grounding, result.get("reply", ""), audit_ctx))

    for k in ("confirmed_catalyst_count",):
        if result.get(k) is None:
            result[k] = 0

    # ── Area-mismatch disclosure ──────────────────────────────────────
    # Must be the LAST mutation before return, so nothing downstream
    # (translation, widget attachment, etc.) can silently drop it.
    if area_mismatch_note:
        proj_area_id_v, proj_name_v, literal_area_id_v, literal_kw_v = area_mismatch_note
        if literal_area_id_v is None:
            # Two literal areas named in one message (e.g. "Fiji 2" + "Dubai Island")
            note_line = (
                f"📍 {proj_name_v} is in {preferred_name(proj_area_id_v)} — "
                f"not {literal_kw_v.title()}.\n\n"
            )
        else:
            # Project registered under a different area than the literal keyword named
            note_line = (
                f"📍 {proj_name_v} is actually in {preferred_name(proj_area_id_v)}, "
                f"not {literal_kw_v.title()}.\n\n"
            )
        for key in ("reply", "summary", "insight"):
            if result.get(key):
                result[key] = note_line + result[key]
        result["area_mismatch"] = True  # flag for frontend, in case it reads a separate field

    result["language"] = user_lang
    result["direction"] = user_dir
    return result

 
    
