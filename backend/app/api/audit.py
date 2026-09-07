from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
import uuid
import base64
import os
import time
from datetime import datetime, timezone
from app.data.presets import DEMO_PRESETS
from app.compliance.synthesizer import AuditSynthesizer

router = APIRouter(prefix="/audit", tags=["Audit"])

# Persistent file path for stored specimens
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
SPECIMENS_FILE = os.path.join(DATA_DIR, "specimens.json")

def _load_stored_specimens() -> List[Dict[str, Any]]:
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(SPECIMENS_FILE):
        return []
    try:
        with open(SPECIMENS_FILE, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if not content:
                return []
            return json.loads(content)
    except Exception as e:
        print(f"Error reading {SPECIMENS_FILE}: {e}")
        return []

def _save_stored_specimens(records: List[Dict[str, Any]]) -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    try:
        # Keep latest 100 specimens
        trimmed = records[:100]
        with open(SPECIMENS_FILE, "w", encoding="utf-8") as f:
            json.dump(trimmed, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error writing to {SPECIMENS_FILE}: {e}")

class AuditRequest(BaseModel):
    preset_id: Optional[str] = None
    product_name: Optional[str] = None
    label_data: Optional[Dict[str, Any]] = None
    bounding_boxes: Optional[List[Dict[str, Any]]] = None
    product_category: Optional[str] = "general"

@router.get("/presets")
async def get_presets():
    """
    Returns pre-loaded showcase presets with OCR bounding boxes and expected compliance stats.
    """
    return {
        "count": len(DEMO_PRESETS),
        "presets": DEMO_PRESETS
    }

@router.get("/specimens")
async def get_stored_specimens(limit: int = Query(50, ge=1, le=100)):
    """
    Returns all permanently stored label records and uploaded images from the database.
    """
    records = _load_stored_specimens()
    return {
        "count": len(records),
        "specimens": records[:limit]
    }

@router.delete("/specimens/{specimen_id}")
async def delete_stored_specimen(specimen_id: str):
    """
    Deletes a stored specimen record by ID.
    """
    records = _load_stored_specimens()
    filtered = [r for r in records if r.get("id") != specimen_id and r.get("audit_id") != specimen_id]
    if len(filtered) == len(records):
        raise HTTPException(status_code=404, detail=f"Specimen '{specimen_id}' not found")
    _save_stored_specimens(filtered)
    return {"success": True, "message": f"Specimen {specimen_id} deleted"}

@router.post("/run")
async def run_audit(req: AuditRequest):
    """
    Executes complete audit pipeline: Deterministic Math + Big-8+ + Hybrid RAG + Optional Gemini LLM.
    """
    if req.preset_id:
        preset = next((p for p in DEMO_PRESETS if p["id"] == req.preset_id), None)
        if not preset:
            raise HTTPException(status_code=404, detail=f"Preset '{req.preset_id}' not found")

        # Use async LLM-enhanced synthesis
        report = await AuditSynthesizer.synthesize_report_with_llm(
            product_name=preset["title"],
            label_data=preset["label_data"],
            tokens=preset.get("bounding_boxes", []),
            product_category=req.product_category or "general"
        )
        report["preset_id"] = preset["id"]
        report["image_url"] = preset.get("image_url")
        report["bounding_boxes"] = preset.get("bounding_boxes", [])
        return report

    # Ad-hoc audit with provided label data
    product_name = req.product_name or "Custom Packaged Commodity"
    label_data = req.label_data or {}

    # Use async LLM-enhanced synthesis
    report = await AuditSynthesizer.synthesize_report_with_llm(
        product_name=product_name,
        label_data=label_data,
        tokens=req.bounding_boxes or [],
        product_category=req.product_category or "general"
    )
    report["bounding_boxes"] = req.bounding_boxes or []
    return report

from app.rag.gemini_engine import gemini_engine

@router.post("/upload")
async def upload_and_audit(
    files: Optional[List[UploadFile]] = File(None),
    file: Optional[UploadFile] = File(None),
    product_name: Optional[str] = Form("Scanned Packaging Specimen"),
    product_category: Optional[str] = Form("food"),
    label_data_json: Optional[str] = Form(None)
):
    """
    Multi-Image & Single-Image upload endpoint for label compliance audit.
    Accepts 1 to 5 images representing different panels of the same physical product.
    Permanently saves the uploaded images, extracted labels, and compliance audit into database.
    """
    uploaded_files: List[UploadFile] = []
    if files:
        uploaded_files.extend(files)
    if file and file not in uploaded_files:
        uploaded_files.append(file)

    if not uploaded_files:
        raise HTTPException(status_code=400, detail="No image file provided for audit")

    images_payload: List[tuple[bytes, str]] = []
    base64_images: List[str] = []
    total_size_kb = 0.0
    primary_filename = uploaded_files[0].filename or "Specimen"

    for f in uploaded_files:
        contents = await f.read()
        size_kb = round(len(contents) / 1024, 1)
        total_size_kb += size_kb
        mime = f.content_type or "image/jpeg"
        images_payload.append((contents, mime))
        
        # Convert to persistent Data URL for direct zero-latency frontend image display
        b64 = base64.b64encode(contents).decode("utf-8")
        base64_images.append(f"data:{mime};base64,{b64}")

    label_data = {}
    if label_data_json:
        try:
            label_data = json.loads(label_data_json)
        except json.JSONDecodeError:
            label_data = {}

    # If Gemini Vision is available, run multimodal extraction on ALL photos together
    if gemini_engine.is_available and len(images_payload) > 0:
        vision_fields = await gemini_engine.extract_label_from_images(images_payload)
        if vision_fields:
            for k, v in vision_fields.items():
                if v and (not label_data.get(k) or str(label_data.get(k)).strip().lower() in ["", "none", "missing", "n/a", "[not found]"]):
                    label_data[k] = v

    # Fallback to product_name or filename if generic name still missing
    if not label_data.get("generic_name"):
        clean_name = primary_filename.replace(".jpg", "").replace(".png", "").replace(".jpeg", "")
        if not clean_name.startswith("IMG") and not clean_name.startswith("upload") and not clean_name.startswith("Camera"):
            label_data["generic_name"] = clean_name

    bounding_boxes = label_data.pop("bounding_boxes", [])

    report = await AuditSynthesizer.synthesize_report_with_llm(
        product_name=label_data.get("generic_name") or primary_filename or product_name,
        label_data=label_data,
        tokens=bounding_boxes,
        image_metadata={
            "filename": primary_filename,
            "panel_count": len(uploaded_files),
            "size_kb": round(total_size_kb, 1),
            "format": uploaded_files[0].content_type
        },
        product_category=product_category or "food"
    )
    report["bounding_boxes"] = bounding_boxes
    report["is_live_upload"] = True
    report["panel_count"] = len(uploaded_files)

    # Attach permanent Data URLs for zero-loss image display
    if base64_images:
        report["image_url"] = base64_images[0]
        if len(base64_images) > 1:
            report["additional_image_urls"] = base64_images[1:]

    # Save permanently into specimens database
    try:
        score = report.get("compliance_score", 0)
        grade = "A+" if score >= 90 else ("B-" if score >= 70 else "C")
        
        specimen_entry = {
            "id": report.get("audit_id") or f"specimen-{int(time.time() * 1000)}",
            "audit_id": report.get("audit_id"),
            "product_name": report.get("product_name"),
            "product_category": product_category or "Packaged Commodity",
            "compliance_score": score,
            "grade": grade,
            "legal_status": report.get("legal_status"),
            "status_text": report.get("status_text"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "image_url": base64_images[0] if base64_images else None,
            "additional_image_urls": base64_images[1:] if len(base64_images) > 1 else [],
            "panel_count": len(uploaded_files),
            "summary": report.get("summary", {}),
            "report": report
        }

        existing_records = _load_stored_specimens()
        # Prepend new specimen at index 0 (newest first)
        _save_stored_specimens([specimen_entry] + existing_records)
    except Exception as err:
        print(f"Failed to persist specimen record to database: {err}")

    return report
