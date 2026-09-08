from fastapi import APIRouter, HTTPException, Query, Body
from typing import Dict, Any, List, Optional
import json
import urllib.request
import urllib.parse
from app.api.storage import SUPABASE_URL, _supabase_headers
from app.compliance.referee_engine import RefereeEngine

router = APIRouter(prefix="/validation", tags=["validation"])

def get_supabase_specimen(specimen_id: str) -> Optional[Dict[str, Any]]:
    try:
        url = f"{SUPABASE_URL}/rest/v1/specimens?or=(id.eq.{specimen_id},audit_id.eq.{specimen_id})"
        req = urllib.request.Request(url, headers=_supabase_headers(use_service_key=True))
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data and isinstance(data, list) and len(data) > 0:
                return data[0]
    except Exception as e:
        print(f"Error fetching specimen {specimen_id} from Supabase: {e}")

    # Fallback to local storage
    try:
        from app.api.storage import get_specimens_from_db
        all_specs = get_specimens_from_db(limit=50, offset=0)
        for s in all_specs:
            if s.get("id") == specimen_id or s.get("audit_id") == specimen_id:
                return s
    except Exception as e:
        print(f"Fallback specimen fetch error: {e}")

    return None

def get_supabase_validation(specimen_id: str) -> Optional[Dict[str, Any]]:
    try:
        url = f"{SUPABASE_URL}/rest/v1/validations?specimen_id=eq.{specimen_id}"
        req = urllib.request.Request(url, headers=_supabase_headers(use_service_key=False))
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data and isinstance(data, list):
                return data[0]
    except Exception as e:
        print(f"Error fetching validation {specimen_id}: {e}")
    return None

@router.post("/run/{specimen_id}")
async def run_validation(specimen_id: str):
    specimen = get_supabase_specimen(specimen_id)
    if not specimen:
        raise HTTPException(status_code=404, detail="Specimen not found")

    report = specimen.get("report", {})
    checklist = report.get("checklist", [])
    label_data = report.get("label_data", {})
    product_name = report.get("product_name", "Unknown Product")

    engine_results = {}
    for item in checklist:
        mandate_id = item.get("mandate_id") or item.get("id")
        if mandate_id:
            engine_results[mandate_id] = {
                "mandate_id": mandate_id,
                "name": item.get("name", ""),
                "rule": item.get("rule", ""),
                "status": item.get("status"),
                "reason": item.get("reason", item.get("reasoning", ""))
            }


    referee = RefereeEngine()
    referee_raw = await referee.evaluate(label_data, product_name)

    # Build per-mandate referee lookup
    referee_dict = {}
    if referee_raw and "mandates" in referee_raw:
        for m in referee_raw["mandates"]:
            referee_dict[m["mandate_id"]] = m

    # Merge into unified per-mandate list for frontend 3-column display
    merged_engine = []
    merged_referee = []
    all_mandate_ids = list(engine_results.keys())
    for mid in referee_dict:
        if mid not in all_mandate_ids:
            all_mandate_ids.append(mid)

    for mid in all_mandate_ids:
        eng = engine_results.get(mid, {})
        ref = referee_dict.get(mid, {})
        merged_engine.append({
            "mandate_id": mid,
            "name": eng.get("name", mid),
            "rule": eng.get("rule", ""),
            "status": eng.get("status", "COMPLIANT"),
            "reason": eng.get("reason", ""),
        })
        merged_referee.append({
            "mandate_id": mid,
            "name": eng.get("name", mid),
            "rule": eng.get("rule", ""),
            "status": ref.get("status", "COMPLIANT"),
            "reasoning": ref.get("reasoning", ""),
        })

    validation_record = {
        "specimen_id": specimen_id,
        "product_name": product_name,
        "image_url": specimen.get("image_url"),
        "engine_results": merged_engine,
        "referee_results": merged_referee,
        "referee_model": "gemini-flash-latest",
        "human_verdicts": None,
        "accuracy_metrics": None,
        "status": "awaiting_human_verification",
    }

    # Persist to Supabase validations table (with upsert)
    try:
        url = f"{SUPABASE_URL}/rest/v1/validations?on_conflict=specimen_id"
        payload = json.dumps(validation_record).encode("utf-8")
        headers = _supabase_headers(use_service_key=True)
        headers["Prefer"] = "resolution=merge-duplicates"
        req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            pass

    except Exception as e:
        # Non-fatal: still return the record even if persistence fails
        print(f"Warning: Failed to save validation to Supabase: {e}")

    return validation_record


@router.put("/verify/{specimen_id}")
async def verify_validation(specimen_id: str, body: Dict[str, Any] = Body(...)):
    human_verdicts = body.get("verdicts", {})
    verified_by = body.get("verified_by", "unknown")

    validation = get_supabase_validation(specimen_id)
    if not validation:
        raise HTTPException(status_code=404, detail="Validation record not found")

    engine_results_list = validation.get("engine_results", [])
    referee_results_list = validation.get("referee_results", [])

    # Build mandate_id -> status dicts from the lists
    engine_dict = {}
    for item in (engine_results_list if isinstance(engine_results_list, list) else []):
        engine_dict[item.get("mandate_id", "")] = item.get("status", "COMPLIANT")

    referee_dict = {}
    for item in (referee_results_list if isinstance(referee_results_list, list) else []):
        referee_dict[item.get("mandate_id", "")] = item.get("status", "COMPLIANT")

    def compute_metrics(predictions: dict, ground_truth: dict):
        tp = tn = fp = fn = 0
        per_mandate = {}
        for m_id, true_status in ground_truth.items():
            true_violation = (true_status in ["VIOLATION", "WARNING"])
            pred_status = predictions.get(m_id, "COMPLIANT")
            pred_violation = (pred_status in ["VIOLATION", "WARNING"])

            if true_violation and pred_violation:
                tp += 1; per_mandate[m_id] = "TP"
            elif not true_violation and not pred_violation:
                tn += 1; per_mandate[m_id] = "TN"
            elif not true_violation and pred_violation:
                fp += 1; per_mandate[m_id] = "FP"
            elif true_violation and not pred_violation:
                fn += 1; per_mandate[m_id] = "FN"

        total = tp + tn + fp + fn
        accuracy = (tp + tn) / total if total > 0 else 0
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

        return {
            "accuracy": accuracy,
            "precision": precision,
            "recall": recall,
            "f1_score": f1,
            "per_mandate": per_mandate,
            "tp": tp, "tn": tn, "fp": fp, "fn": fn
        }

    engine_metrics = compute_metrics(engine_dict, human_verdicts)
    referee_metrics = compute_metrics(referee_dict, human_verdicts)

    update_payload = {
        "human_verdicts": human_verdicts,
        "human_verified_by": verified_by,
        "accuracy_metrics": engine_metrics,
        "referee_accuracy_metrics": referee_metrics,
        "status": "verified"
    }

    try:
        url = f"{SUPABASE_URL}/rest/v1/validations?specimen_id=eq.{specimen_id}"
        payload = json.dumps(update_payload).encode("utf-8")
        headers = _supabase_headers(use_service_key=True)
        req = urllib.request.Request(url, data=payload, headers=headers, method="PATCH")
        with urllib.request.urlopen(req, timeout=10) as resp:
            pass
    except Exception as e:
        print(f"Warning: Failed to update validation in Supabase: {e}")

    validation.update(update_payload)
    return validation

@router.get("/status/{specimen_id}")
async def get_validation_status(specimen_id: str):
    validation = get_supabase_validation(specimen_id)
    if not validation:
        raise HTTPException(status_code=404, detail="Validation record not found")
    return validation

@router.get("/accuracy")
async def get_accuracy_metrics():
    try:
        url = f"{SUPABASE_URL}/rest/v1/validations?human_verdicts=not.is.null"
        req = urllib.request.Request(url, headers=_supabase_headers(use_service_key=False))
        with urllib.request.urlopen(req, timeout=10) as resp:
            validations = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch validations: {e}")

    engine_tp = engine_tn = engine_fp = engine_fn = 0
    referee_tp = referee_tn = referee_fp = referee_fn = 0
    engine_per_mandate_counts = {}
    referee_per_mandate_counts = {}

    for val in validations:
        em = val.get("accuracy_metrics") or val.get("engine_metrics") or {}
        engine_tp += em.get("tp", 0)
        engine_tn += em.get("tn", 0)
        engine_fp += em.get("fp", 0)
        engine_fn += em.get("fn", 0)
        for m_id, res in em.get("per_mandate", {}).items():
            if m_id not in engine_per_mandate_counts:
                engine_per_mandate_counts[m_id] = {"tp": 0, "tn": 0, "fp": 0, "fn": 0}
            if str(res).lower() in engine_per_mandate_counts[m_id]:
                engine_per_mandate_counts[m_id][str(res).lower()] += 1

        rm = val.get("referee_accuracy_metrics") or val.get("referee_metrics") or {}
        referee_tp += rm.get("tp", 0)
        referee_tn += rm.get("tn", 0)
        referee_fp += rm.get("fp", 0)
        referee_fn += rm.get("fn", 0)
        for m_id, res in rm.get("per_mandate", {}).items():
            if m_id not in referee_per_mandate_counts:
                referee_per_mandate_counts[m_id] = {"tp": 0, "tn": 0, "fp": 0, "fn": 0}
            if str(res).lower() in referee_per_mandate_counts[m_id]:
                referee_per_mandate_counts[m_id][str(res).lower()] += 1


    def agg_metrics(tp, tn, fp, fn):
        total = tp + tn + fp + fn
        accuracy = (tp + tn) / total if total > 0 else 0
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
        return {"accuracy": accuracy, "precision": precision, "recall": recall, "f1": f1, "counts": {"tp":tp, "tn":tn, "fp":fp, "fn":fn}}

    engine_agg = agg_metrics(engine_tp, engine_tn, engine_fp, engine_fn)
    referee_agg = agg_metrics(referee_tp, referee_tn, referee_fp, referee_fn)

    engine_pm = {m: agg_metrics(**c) for m, c in engine_per_mandate_counts.items()}
    referee_pm = {m: agg_metrics(**c) for m, c in referee_per_mandate_counts.items()}

    engine_agg["per_mandate"] = engine_pm
    referee_agg["per_mandate"] = referee_pm

    return {
        "total_verified": len(validations),
        "engine_metrics": engine_agg,
        "referee_metrics": referee_agg
    }

@router.get("/all")
async def get_all_validations(limit: int = Query(10), offset: int = Query(0)):
    try:
        url = f"{SUPABASE_URL}/rest/v1/validations?select=*&order=specimen_id.desc&limit={limit}&offset={offset}"
        req = urllib.request.Request(url, headers=_supabase_headers(use_service_key=False))
        with urllib.request.urlopen(req, timeout=10) as resp:
            validations = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch validations: {e}")

    return {
        "validations": validations,
        "count": len(validations),
        "has_more": len(validations) == limit
    }
