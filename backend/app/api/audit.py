from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
import uuid
import base64
import time
from datetime import datetime, timezone
from app.data.presets import DEMO_PRESETS
from app.compliance.synthesizer import AuditSynthesizer
from app.api.storage import (
    get_specimens_from_db,
    insert_specimen_to_db,
    delete_specimen_from_db,
    upload_image_to_r2,
    is_r2_enabled,
    is_supabase_enabled
)

router = APIRouter(prefix="/audit", tags=["Audit"])

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
async def get_stored_specimens(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """
    Returns stored label records from Supabase in fast packets.
    """
    records = get_specimens_from_db(limit=limit, offset=offset)
    return {
        "count": len(records),
        "limit": limit,
        "offset": offset,
        "has_more": len(records) == limit,
        "supabase_connected": is_supabase_enabled(),
        "specimens": records
    }

@router.delete("/specimens/{specimen_id}")
async def delete_stored_specimen(specimen_id: str):
    """
    Deletes a stored specimen record by ID from Supabase.
    """
    success = delete_specimen_from_db(specimen_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Specimen '{specimen_id}' not found")
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

    product_name = req.product_name or "Custom Packaged Commodity"
    label_data = req.label_data or {}

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
    Multi-Image upload endpoint for label compliance audit.
    1. Uploads label image to Cloudflare R2 (or Data URL fallback).
    2. Runs Gemini Vision & Statutory RAG audit.
    3. Saves record into Supabase PostgreSQL.
    """
    uploaded_files: List[UploadFile] = []
    if files:
        uploaded_files.extend(files)
    if file and file not in uploaded_files:
        uploaded_files.append(file)

    if not uploaded_files:
        raise HTTPException(status_code=400, detail="No image file provided for audit")

    images_payload: List[tuple[bytes, str]] = []
    final_image_urls: List[str] = []
    total_size_kb = 0.0
    primary_filename = uploaded_files[0].filename or "Specimen"

    for f in uploaded_files:
        contents = await f.read()
        size_kb = round(len(contents) / 1024, 1)
        total_size_kb += size_kb
        mime = f.content_type or "image/jpeg"
        images_payload.append((contents, mime))
        
        # 1. Try Cloudflare R2 upload if configured
        r2_url = None
        if is_r2_enabled():
            r2_url = await upload_image_to_r2(contents, f.filename or "specimen.jpg", mime)

        # 2. Fallback to Data URL if R2 is not configured
        if r2_url:
            final_image_urls.append(r2_url)
        else:
            b64 = base64.b64encode(contents).decode("utf-8")
            final_image_urls.append(f"data:{mime};base64,{b64}")

    label_data = {}
    if label_data_json:
        try:
            label_data = json.loads(label_data_json)
        except json.JSONDecodeError:
            label_data = {}

    vision_worked = False
    if gemini_engine.is_available and len(images_payload) > 0:
        vision_fields = await gemini_engine.extract_label_from_images(images_payload)
        if vision_fields:
            vision_worked = True
            for k, v in vision_fields.items():
                if v and (not label_data.get(k) or str(label_data.get(k)).strip().lower() in ["", "none", "missing", "n/a", "[not found]"]):
                    label_data[k] = v

    # 1. Validation gate: Check if image is an actual packaged commodity
    is_valid_packaging = True
    invalid_reason = None

    if vision_worked and vision_fields:
        if vision_fields.get("is_packaged_commodity") is False:
            is_valid_packaging = False
            invalid_reason = vision_fields.get("invalid_reason") or "Image appears to be a person, face, or non-packaging object."

    # 2. Heuristic check: Count essential packaging declarations
    essential_fields = [
        label_data.get("mrp"),
        label_data.get("net_quantity"),
        label_data.get("manufacturer_address"),
        label_data.get("consumer_care_phone"),
        label_data.get("consumer_care_email"),
        label_data.get("mfg_date"),
        label_data.get("expiry_date"),
        label_data.get("unit_sale_price"),
    ]
    detected_count = sum(1 for f in essential_fields if f and str(f).strip().lower() not in ["", "none", "missing", "n/a", "[not found]", "null"])
    has_barcode = bool(label_data.get("barcode_data", {}).get("detected"))

    if detected_count == 0 and not has_barcode:
        is_valid_packaging = False
        if not invalid_reason:
            invalid_reason = "No statutory packaging declarations (MRP, Net Quantity, Manufacturer Address) or product barcodes detected."

    # Don't auto-assign generic name if it is an invalid scan or default filename
    if not label_data.get("generic_name") and is_valid_packaging:
        clean_name = primary_filename.replace(".jpg", "").replace(".png", "").replace(".jpeg", "")
        ignore_prefixes = ("IMG", "upload", "Camera", "Panel", "photo", "image", "frame")
        if not any(clean_name.startswith(p) for p in ignore_prefixes):
            label_data["generic_name"] = clean_name

    bounding_boxes = label_data.pop("bounding_boxes", [])

    report = await AuditSynthesizer.synthesize_report_with_llm(
        product_name=label_data.get("generic_name") or ("Non-Packaging Specimen" if not is_valid_packaging else primary_filename or product_name),
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
    report["gemini_vision_used"] = vision_worked
    report["vision_provider"] = "Gemini Vision 3.1 Multimodal AI" if vision_worked else "Client OCR"
    report["panel_count"] = len(uploaded_files)
    report["is_valid_packaging"] = is_valid_packaging

    if not is_valid_packaging:
        report["invalid_reason"] = invalid_reason
        report["legal_status"] = "INVALID_SPECIMEN"
        report["status_text"] = f"🚫 Invalid Image: {invalid_reason} (This photo was NOT saved to database)"
        report["compliance_score"] = 0
        report["grade"] = "F"
        for item in report.get("checklist", []):
            item["status"] = "VIOLATION"
            item["extracted_text"] = "[NO PACKAGING DETECTED]"
            item["reason"] = f"Not a packaged commodity: {invalid_reason}"
        report["summary"] = {
            "total_mandates_checked": len(report.get("checklist", [])),
            "compliant_count": 0,
            "warnings_count": 0,
            "violations_count": len(report.get("checklist", [])),
            "is_lawful_for_sale": False
        }
        if final_image_urls:
            report["image_url"] = final_image_urls[0]
        # CRITICAL: DO NOT PERSIST TO SUPABASE!
        print(f"⚠️ Specimen rejected from database: {invalid_reason}")
        return report

    if final_image_urls:
        report["image_url"] = final_image_urls[0]
        if len(final_image_urls) > 1:
            report["additional_image_urls"] = final_image_urls[1:]

    # Save permanently into Supabase PostgreSQL (only valid packaged commodities)
    try:
        score = report.get("compliance_score", 0)
        if score >= 95: grade = "A+"
        elif score >= 85: grade = "A"
        elif score >= 75: grade = "B+"
        elif score >= 65: grade = "B"
        elif score >= 55: grade = "C+"
        elif score >= 45: grade = "C"
        elif score >= 35: grade = "D"
        else: grade = "F"
        
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
            "image_url": final_image_urls[0] if final_image_urls else None,
            "additional_image_urls": final_image_urls[1:] if len(final_image_urls) > 1 else [],
            "panel_count": len(uploaded_files),
            "summary": report.get("summary", {}),
            "report": report
        }

        insert_specimen_to_db(specimen_entry)
    except Exception as err:
        print(f"Failed to persist specimen record to Supabase: {err}")

    return report
