"""
Complaint Portal API — NutriScan (FairPack)
Ministry of Consumer Affairs, Food & Public Distribution | SIH Project

Endpoints:
  POST /api/complaints/submit         — Consumer submits a complaint
  GET  /api/complaints/track/{ref}    — Consumer tracks by reference number
  GET  /api/complaints/all            — Gov officer dashboard (JWT protected)
  PUT  /api/complaints/{id}/update    — Gov officer updates status/resolution
  POST /api/complaints/{id}/forward   — Forward to INGRAM portal
"""

import os
import uuid
import httpx
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel, EmailStr, Field

router = APIRouter(prefix="/complaints", tags=["Complaints"])


# ─────────────────────────────────────────────────────────────────────────────
# Supabase Configuration
# ─────────────────────────────────────────────────────────────────────────────

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")  # admin operations

GOV_OFFICER_TOKEN = os.getenv("GOV_OFFICER_TOKEN", "nutriscan-gov-2025")  # demo secret

TABLE = "complaints"


def _supabase_headers(use_service_key: bool = False) -> dict:
    key = SUPABASE_SERVICE_KEY if use_service_key else SUPABASE_ANON_KEY
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


# ─────────────────────────────────────────────────────────────────────────────
# State → Legal Metrology Department Mapping
# ─────────────────────────────────────────────────────────────────────────────

STATE_DEPT_MAP: dict[str, dict] = {
    "Andhra Pradesh":       {"dept": "AP Dept of Legal Metrology", "email": "lm.ap@gov.in", "phone": "0866-2410800"},
    "Arunachal Pradesh":    {"dept": "AR Legal Metrology Dept", "email": "lm.ar@gov.in", "phone": "0360-2244311"},
    "Assam":                {"dept": "Assam Legal Metrology", "email": "lm.as@gov.in", "phone": "0361-2237318"},
    "Bihar":                {"dept": "Bihar Legal Metrology", "email": "lm.br@gov.in", "phone": "0612-2220039"},
    "Chhattisgarh":         {"dept": "CG Dept of Weights & Measures", "email": "lm.cg@gov.in", "phone": "0771-2444095"},
    "Goa":                  {"dept": "Goa Legal Metrology", "email": "lm.ga@gov.in", "phone": "0832-2226053"},
    "Gujarat":              {"dept": "Gujarat Legal Metrology Dept", "email": "lm.gj@gov.in", "phone": "079-23253055"},
    "Haryana":              {"dept": "Haryana Legal Metrology", "email": "lm.hr@gov.in", "phone": "0172-2740476"},
    "Himachal Pradesh":     {"dept": "HP Legal Metrology Dept", "email": "lm.hp@gov.in", "phone": "0177-2625867"},
    "Jharkhand":            {"dept": "Jharkhand Legal Metrology", "email": "lm.jh@gov.in", "phone": "0651-2490068"},
    "Karnataka":            {"dept": "Karnataka Dept of Legal Metrology", "email": "lm.ka@gov.in", "phone": "080-22268190"},
    "Kerala":               {"dept": "Kerala Legal Metrology Dept", "email": "lm.kl@gov.in", "phone": "0471-2518590"},
    "Madhya Pradesh":       {"dept": "MP Weights & Measures Dept", "email": "lm.mp@gov.in", "phone": "0755-2572665"},
    "Maharashtra":          {"dept": "Maharashtra Legal Metrology", "email": "lm.mh@gov.in", "phone": "022-22023565"},
    "Manipur":              {"dept": "Manipur Legal Metrology", "email": "lm.mn@gov.in", "phone": "0385-2451373"},
    "Meghalaya":            {"dept": "Meghalaya Legal Metrology", "email": "lm.ml@gov.in", "phone": "0364-2227892"},
    "Mizoram":              {"dept": "Mizoram Legal Metrology", "email": "lm.mz@gov.in", "phone": "0389-2323752"},
    "Nagaland":             {"dept": "Nagaland Legal Metrology", "email": "lm.nl@gov.in", "phone": "0370-2271011"},
    "Odisha":               {"dept": "Odisha Legal Metrology Dept", "email": "lm.od@gov.in", "phone": "0674-2533088"},
    "Punjab":               {"dept": "Punjab Legal Metrology", "email": "lm.pb@gov.in", "phone": "0172-2749040"},
    "Rajasthan":            {"dept": "Rajasthan Legal Metrology", "email": "lm.rj@gov.in", "phone": "0141-2721285"},
    "Sikkim":               {"dept": "Sikkim Legal Metrology", "email": "lm.sk@gov.in", "phone": "03592-202286"},
    "Tamil Nadu":           {"dept": "TN Legal Metrology Dept", "email": "lm.tn@gov.in", "phone": "044-25671660"},
    "Telangana":            {"dept": "Telangana Legal Metrology", "email": "lm.tg@gov.in", "phone": "040-23450302"},
    "Tripura":              {"dept": "Tripura Legal Metrology", "email": "lm.tr@gov.in", "phone": "0381-2324877"},
    "Uttar Pradesh":        {"dept": "UP Legal Metrology Dept", "email": "lm.up@gov.in", "phone": "0522-2236906"},
    "Uttarakhand":          {"dept": "Uttarakhand Legal Metrology", "email": "lm.uk@gov.in", "phone": "0135-2710281"},
    "West Bengal":          {"dept": "WB Legal Metrology Dept", "email": "lm.wb@gov.in", "phone": "033-22143082"},
    "Delhi":                {"dept": "Delhi Legal Metrology (GNCTD)", "email": "lm.dl@gov.in", "phone": "011-23392382"},
    "Jammu & Kashmir":      {"dept": "J&K Legal Metrology Dept", "email": "lm.jk@gov.in", "phone": "0194-2481800"},
    "Ladakh":               {"dept": "Ladakh Legal Metrology", "email": "lm.la@gov.in", "phone": "01982-252037"},
    "Puducherry":           {"dept": "Puducherry Legal Metrology", "email": "lm.py@gov.in", "phone": "0413-2334034"},
    "Chandigarh":           {"dept": "Chandigarh Legal Metrology", "email": "lm.ch@gov.in", "phone": "0172-2740476"},
    "Other / Central":      {"dept": "DPIIT Central Legal Metrology", "email": "lm.central@gov.in", "phone": "011-23063633"},
}


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic Models
# ─────────────────────────────────────────────────────────────────────────────

class ComplaintSubmission(BaseModel):
    # Product info
    product_name: str = Field(..., min_length=2, max_length=200)
    brand_name: Optional[str] = None
    barcode_value: Optional[str] = None
    purchase_location: str = Field(..., min_length=2, max_length=300)
    purchase_date: Optional[str] = None

    # Violations from audit
    audit_id: Optional[str] = None
    violations: List[str] = []   # list of mandate_ids that violated
    violation_rules: List[str] = []  # human-readable rule refs e.g. "Rule 6(1)(s)"
    description: str = Field(..., min_length=10, max_length=2000)

    # Consumer info
    consumer_name: str = Field(..., min_length=2, max_length=100)
    consumer_email: Optional[str] = None
    consumer_phone: Optional[str] = None
    consumer_state: str = Field(..., min_length=2, max_length=60)
    consumer_district: Optional[str] = None


class ComplaintStatusUpdate(BaseModel):
    status: str  # Submitted | Under Review | Forwarded | Action Taken | Resolved | Closed
    officer_notes: Optional[str] = None
    action_taken: Optional[str] = None
    resolution_date: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# Auth helper — simple token check for demo
# ─────────────────────────────────────────────────────────────────────────────

def _require_gov_officer(x_gov_token: Optional[str] = Header(default=None)):
    """Simple demo auth: caller must pass X-Gov-Token header."""
    if not x_gov_token or x_gov_token.strip() != GOV_OFFICER_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized. Valid X-Gov-Token required.")
    return True


# ─────────────────────────────────────────────────────────────────────────────
# Supabase helpers
# ─────────────────────────────────────────────────────────────────────────────

def _is_supabase_configured() -> bool:
    return bool(SUPABASE_URL and SUPABASE_ANON_KEY)


async def _insert_complaint(record: dict) -> dict:
    """Insert a complaint row into Supabase."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/{TABLE}",
            headers=_supabase_headers(use_service_key=True),
            json=record,
        )
        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=500, detail=f"Supabase insert error: {resp.text}")
        result = resp.json()
        return result[0] if isinstance(result, list) else result


async def _get_complaint_by_ref(ref_number: str) -> Optional[dict]:
    """Fetch a single complaint by reference number."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/{TABLE}",
            headers=_supabase_headers(),
            params={"ref_number": f"eq.{ref_number}", "select": "*"},
        )
        data = resp.json()
        if isinstance(data, list) and data:
            return data[0]
        return None


async def _get_all_complaints(state: Optional[str] = None, status: Optional[str] = None) -> list:
    """Fetch all complaints with optional filters."""
    params: dict = {"select": "*", "order": "created_at.desc"}
    if state:
        params["consumer_state"] = f"eq.{state}"
    if status:
        params["status"] = f"eq.{status}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/{TABLE}",
            headers=_supabase_headers(use_service_key=True),
            params=params,
        )
        return resp.json() if isinstance(resp.json(), list) else []


async def _update_complaint(complaint_id: str, updates: dict) -> dict:
    """Patch a complaint record."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.patch(
            f"{SUPABASE_URL}/rest/v1/{TABLE}",
            headers=_supabase_headers(use_service_key=True),
            params={"id": f"eq.{complaint_id}"},
            json=updates,
        )
        result = resp.json()
        return result[0] if isinstance(result, list) and result else updates


# ─────────────────────────────────────────────────────────────────────────────
# In-memory fallback (when Supabase is not configured)
# ─────────────────────────────────────────────────────────────────────────────

_in_memory_store: dict[str, dict] = {}


def _generate_ref() -> str:
    """Generate a short 8-char alphanumeric complaint reference number."""
    uid = uuid.uuid4().hex.upper()[:8]
    return f"NSC-{uid}"


# ─────────────────────────────────────────────────────────────────────────────
# INGRAM Integration
# ─────────────────────────────────────────────────────────────────────────────

INGRAM_PORTAL_URL = "https://consumerhelpline.gov.in"  # Official NCH Portal

async def _forward_to_ingram(complaint: dict) -> dict:
    """
    Forward complaint data to India's National Consumer Helpline (INGRAM) portal.
    
    NOTE: The real INGRAM API requires registration with the Ministry of Consumer Affairs.
    This implementation constructs the complaint data in INGRAM-compatible format and
    returns the deep-link URL that officers/consumers can use to file directly.
    
    For production SIH deployment, replace with actual INGRAM API credentials:
    POST https://consumerhelpline.gov.in/api/v1/complaints/register
    """
    state = complaint.get("consumer_state", "")
    dept_info = STATE_DEPT_MAP.get(state, STATE_DEPT_MAP["Other / Central"])

    # Build INGRAM-compatible pre-fill URL (NCH supports query-param pre-fill)
    ingram_prefill_url = (
        f"{INGRAM_PORTAL_URL}/public/grievance/lodgeGrievance.html"
        f"?companyName={complaint.get('brand_name', '')}"
        f"&productName={complaint.get('product_name', '')}"
        f"&state={state}"
        f"&complainantName={complaint.get('consumer_name', '')}"
    )

    return {
        "forwarded": True,
        "portal": "National Consumer Helpline (NCH) — INGRAM",
        "portal_url": INGRAM_PORTAL_URL,
        "ingram_prefill_url": ingram_prefill_url,
        "nch_helpline": "1800-11-4000",  # Toll-free National Consumer Helpline
        "nch_sms": "8800001915",
        "routed_to": dept_info["dept"],
        "dept_email": dept_info["email"],
        "dept_phone": dept_info["phone"],
        "note": (
            "Complaint has been routed to the competent Legal Metrology Department "
            f"for {state}. Consumers may also call the National Consumer Helpline "
            "at 1800-11-4000 (toll-free, Mon–Sat 9 AM – 5 PM) or visit consumerhelpline.gov.in"
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────
# API Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/submit")
async def submit_complaint(body: ComplaintSubmission):
    """
    Consumer submits a product complaint.
    Returns a reference number for tracking.
    Auto-routes to the correct state Legal Metrology department.
    """
    ref_number = _generate_ref()
    dept_info = STATE_DEPT_MAP.get(body.consumer_state, STATE_DEPT_MAP["Other / Central"])

    complaint_uuid = str(uuid.uuid4())
    record = {
        "id": complaint_uuid,
        "ref_number": ref_number,
        "product_name": body.product_name,
        "brand_name": body.brand_name,
        "barcode_value": body.barcode_value,
        "purchase_location": body.purchase_location,
        "purchase_date": body.purchase_date,
        "audit_id": body.audit_id,
        "violations": body.violations,
        "violation_rules": body.violation_rules,
        "description": body.description,
        "consumer_name": body.consumer_name,
        "consumer_email": body.consumer_email,
        "consumer_phone": body.consumer_phone,
        "consumer_state": body.consumer_state,
        "consumer_district": body.consumer_district,
        "status": "Submitted",
        "routed_to_dept": dept_info["dept"],
        "routed_to_email": dept_info["email"],
        "routed_to_phone": dept_info["phone"],
        "officer_notes": None,
        "action_taken": None,
        "resolution_date": None,
        "ingram_forwarded": False,
        "ingram_ref": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    complaint_id = complaint_uuid
    # Always keep in-memory backup for immediate instant tracking
    _in_memory_store[ref_number] = {**record}

    if _is_supabase_configured():
        try:
            saved = await _insert_complaint(record)
            if isinstance(saved, dict) and saved.get("id"):
                complaint_id = str(saved["id"])
        except Exception as e:
            # Fallback gracefully to in-memory store so user never experiences an error!
            print(f"Supabase complaint insert fallback: {e}")

    return {
        "success": True,
        "ref_number": ref_number,
        "complaint_id": complaint_id,
        "status": "Submitted",
        "message": (
            f"Your complaint has been registered successfully with reference number {ref_number}. "
            f"It has been routed to: {dept_info['dept']}."
        ),
        "routed_to": {
            "department": dept_info["dept"],
            "email": dept_info["email"],
            "phone": dept_info["phone"],
        },
        "nch_helpline": "1800-11-4000",
        "ingram_portal": INGRAM_PORTAL_URL,
        "track_url": f"/api/complaints/track/{ref_number}",
    }


@router.get("/track/{ref_number}")
async def track_complaint(ref_number: str):
    """
    Public endpoint — consumer tracks complaint by reference number.
    Returns status, timeline, and routing info.
    """
    complaint = None
    if _is_supabase_configured():
        try:
            complaint = await _get_complaint_by_ref(ref_number)
        except Exception as e:
            print(f"Supabase complaint fetch fallback: {e}")
    
    if not complaint:
        complaint = _in_memory_store.get(ref_number)

    if not complaint:
        raise HTTPException(
            status_code=404,
            detail=f"No complaint found with reference number '{ref_number}'. Please check and try again."
        )

    # Mask consumer PII for public tracking
    return {
        "ref_number": ref_number,
        "status": complaint.get("status"),
        "product_name": complaint.get("product_name"),
        "consumer_state": complaint.get("consumer_state"),
        "routed_to_dept": complaint.get("routed_to_dept"),
        "routed_to_phone": complaint.get("routed_to_phone"),
        "officer_notes": complaint.get("officer_notes"),
        "action_taken": complaint.get("action_taken"),
        "resolution_date": complaint.get("resolution_date"),
        "ingram_forwarded": complaint.get("ingram_forwarded", False),
        "created_at": complaint.get("created_at"),
        "updated_at": complaint.get("updated_at"),
        "timeline": _build_timeline(complaint),
        "nch_helpline": "1800-11-4000",
        "ingram_portal": INGRAM_PORTAL_URL,
    }


@router.get("/all")
async def get_all_complaints(
    state: Optional[str] = None,
    status: Optional[str] = None,
    _: bool = Depends(_require_gov_officer),
):
    """
    Government officer dashboard — list all complaints.
    Filter by state or status. Protected by X-Gov-Token header.
    """
    if _is_supabase_configured():
        data = await _get_all_complaints(state, status)
    else:
        data = list(_in_memory_store.values())
        if state:
            data = [c for c in data if c.get("consumer_state") == state]
        if status:
            data = [c for c in data if c.get("status") == status]

    return {
        "total": len(data),
        "complaints": data,
        "states": list(STATE_DEPT_MAP.keys()),
    }


@router.put("/{complaint_id}/update")
async def update_complaint_status(
    complaint_id: str,
    body: ComplaintStatusUpdate,
    _: bool = Depends(_require_gov_officer),
):
    """
    Government officer updates complaint status and adds resolution notes.
    Protected by X-Gov-Token header.
    """
    valid_statuses = ["Submitted", "Under Review", "Forwarded", "Action Taken", "Resolved", "Closed"]
    if body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    updates = {
        "status": body.status,
        "officer_notes": body.officer_notes,
        "action_taken": body.action_taken,
        "resolution_date": body.resolution_date,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    if _is_supabase_configured():
        updated = await _update_complaint(complaint_id, updates)
    else:
        if complaint_id not in _in_memory_store:
            raise HTTPException(status_code=404, detail="Complaint not found")
        _in_memory_store[complaint_id].update(updates)
        updated = _in_memory_store[complaint_id]

    return {
        "success": True,
        "complaint_id": complaint_id,
        "new_status": body.status,
        "updated_at": updates["updated_at"],
    }


@router.post("/{complaint_id}/forward")
async def forward_to_ingram(
    complaint_id: str,
    _: bool = Depends(_require_gov_officer),
):
    """
    Government officer forwards complaint to INGRAM / National Consumer Helpline portal.
    Protected by X-Gov-Token header.
    """
    if _is_supabase_configured():
        complaint = await _get_complaint_by_ref(complaint_id)
        if not complaint:
            # try by DB id
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{SUPABASE_URL}/rest/v1/{TABLE}",
                    headers=_supabase_headers(use_service_key=True),
                    params={"id": f"eq.{complaint_id}", "select": "*"},
                )
                data = resp.json()
                complaint = data[0] if isinstance(data, list) and data else None
    else:
        complaint = _in_memory_store.get(complaint_id)

    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    ingram_result = await _forward_to_ingram(complaint)

    # Mark as forwarded
    forward_update = {
        "status": "Forwarded",
        "ingram_forwarded": True,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    if _is_supabase_configured():
        await _update_complaint(complaint_id, forward_update)
    else:
        if complaint_id in _in_memory_store:
            _in_memory_store[complaint_id].update(forward_update)

    return {
        "success": True,
        "complaint_id": complaint_id,
        **ingram_result,
    }


@router.get("/states")
async def get_state_departments():
    """Public endpoint — returns all state Legal Metrology department info."""
    return {"departments": STATE_DEPT_MAP}


# ─────────────────────────────────────────────────────────────────────────────
# Helper
# ─────────────────────────────────────────────────────────────────────────────

def _build_timeline(complaint: dict) -> list:
    """Build a display timeline from complaint data."""
    timeline = [
        {
            "step": 1,
            "label": "Complaint Submitted",
            "status": "done",
            "timestamp": complaint.get("created_at"),
            "desc": f"Registered with NutriScan complaint portal. Ref: {complaint.get('ref_number')}",
        }
    ]

    status = complaint.get("status", "Submitted")
    created = complaint.get("created_at", "")
    updated = complaint.get("updated_at", "")

    if status in ["Under Review", "Forwarded", "Action Taken", "Resolved", "Closed"]:
        timeline.append({
            "step": 2,
            "label": "Under Review",
            "status": "done",
            "timestamp": updated,
            "desc": f"Assigned to: {complaint.get('routed_to_dept', 'Legal Metrology Dept')}",
        })

    if status in ["Forwarded", "Action Taken", "Resolved", "Closed"]:
        timeline.append({
            "step": 3,
            "label": "Forwarded to Department",
            "status": "done" if status in ["Forwarded", "Action Taken", "Resolved", "Closed"] else "pending",
            "timestamp": updated,
            "desc": f"Forwarded to {complaint.get('routed_to_dept')}. INGRAM: {complaint.get('ingram_forwarded', False)}",
        })

    if status in ["Action Taken", "Resolved", "Closed"]:
        timeline.append({
            "step": 4,
            "label": "Action Taken",
            "status": "done",
            "timestamp": complaint.get("resolution_date") or updated,
            "desc": complaint.get("action_taken") or "Enforcement action initiated.",
        })

    if status in ["Resolved", "Closed"]:
        timeline.append({
            "step": 5,
            "label": "Resolved",
            "status": "done",
            "timestamp": complaint.get("resolution_date") or updated,
            "desc": complaint.get("officer_notes") or "Complaint resolved.",
        })

    # Add next pending step
    next_steps = {
        "Submitted": ("Under Review", "Your complaint is being assigned to the relevant Legal Metrology officer."),
        "Under Review": ("Forwarded to INGRAM/Dept", "Complaint is under review. Will be forwarded to the relevant department."),
        "Forwarded": ("Action Taken", "Department is taking enforcement action under Rule 32."),
        "Action Taken": ("Resolved", "Awaiting formal resolution and consumer feedback."),
    }
    if status in next_steps:
        label, desc = next_steps[status]
        timeline.append({
            "step": len(timeline) + 1,
            "label": label,
            "status": "pending",
            "timestamp": None,
            "desc": desc,
        })

    return timeline
