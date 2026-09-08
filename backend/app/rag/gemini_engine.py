"""
Gemini-Powered Compliance Reasoning Engine for LMPC Audit Reports.

Uses Google Gemini 2.0 Flash API for context-grounded compliance analysis.
All reasoning is strictly grounded in retrieved statutory rule chunks — 
no hallucinated citations or fabricated rule references.

Falls back gracefully to None when no API key is configured,
allowing the synthesizer to use deterministic-only analysis.
"""

import json
import logging
import asyncio
import urllib.request
import urllib.parse
import urllib.error
from typing import Dict, Any, List, Optional

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False

from app.config import Settings

logger = logging.getLogger(__name__)

# Strict anti-hallucination system prompt for compliance reasoning
COMPLIANCE_SYSTEM_PROMPT = """You are a Senior Legal Metrology Inspector appointed under the Legal Metrology Act, 2009, Government of India. You are conducting a compliance audit of a packaged commodity label.

CRITICAL INSTRUCTIONS:
1. Your ONLY source of truth is the STATUTORY RULES provided below. Do NOT cite any rule, section, or provision not present in the retrieved context.
2. Do NOT hallucinate or fabricate rule numbers, gazette references, or penalty amounts.
3. STATUTORY EXEMPTION RULE 26(a): Under Rule 26(a) of Legal Metrology (Packaged Commodities) Rules, 2011, small packages containing net weight/measure of 10g or 10ml or less (except tobacco and pan masala) are statutory exemptions from Chapter II declarations. Do NOT flag small sachets (<=10g, e.g., 6g spice sachet) as violations for declarations exempted under Rule 26(a).
4. DATE & BATCH CODING: Look for manufacturing/packaging date and use-by/expiry dates on margin seals, inkjet stamps, and coding areas (e.g., 'JUL/26', '07/26', 'JUL/26-MAR/27'). If a date is declared anywhere on the package or coding area, mark as COMPLIANT.
5. CONSUMER REDRESSAL: If a phone number (e.g. toll-free '1800 103 1947') and email (e.g. 'wecare@in.nestle.com') are both provided, consumer care is COMPLIANT under Rule 6(1)(h). Spaces in phone numbers are standard formatting.
6. For each mandatory declaration, analyze whether the extracted label data satisfies the statutory requirement.
7. Use precise legal terminology from the rules.
8. If a field is missing or ambiguous, classify it as a VIOLATION or WARNING with the specific rule reference.
9. Always include the applicable penalty provision.

OUTPUT FORMAT: You must respond with valid JSON matching the schema below. No markdown, no explanation outside the JSON.
"""

COMPLIANCE_ANALYSIS_SCHEMA = {
    "type": "object",
    "properties": {
        "findings": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "mandate_id": {"type": "string", "description": "Mandate identifier (e.g., mfg_address, generic_name)"},
                    "rule_ref": {"type": "string", "description": "Exact rule reference (e.g., Rule 6(1)(a))"},
                    "status": {"type": "string", "enum": ["COMPLIANT", "WARNING", "VIOLATION"]},
                    "reasoning": {"type": "string", "description": "Detailed legal reasoning grounded in retrieved rules"},
                    "verbatim_citation": {"type": "string", "description": "Exact text quoted from the statutory rule"},
                    "corrective_action": {"type": "string", "description": "Recommended action to achieve compliance"},
                    "penalty_ref": {"type": "string", "description": "Applicable penalty provision"}
                },
                "required": ["mandate_id", "rule_ref", "status", "reasoning", "penalty_ref"]
            }
        },
        "overall_assessment": {
            "type": "string",
            "description": "Executive summary of compliance status"
        },
        "improvement_notice_warranted": {
            "type": "boolean",
            "description": "Whether a formal Improvement Notice under Section 36 is warranted"
        },
        "total_penalty_exposure": {
            "type": "string",
            "description": "Maximum aggregate penalty exposure (e.g., 'Up to ₹25,000 under Rule 32')"
        }
    },
    "required": ["findings", "overall_assessment", "improvement_notice_warranted"]
}


class GeminiComplianceEngine:
    """
    Lightweight Gemini API client for context-grounded compliance reasoning.
    
    Uses httpx for async HTTP calls to the Gemini REST API directly,
    avoiding the heavy google-generativeai SDK. Designed for Vercel serverless.
    """

    def __init__(self):
        self._api_key = Settings.GEMINI_API_KEY
        self._model = Settings.GEMINI_MODEL
        self._base_url = Settings.GEMINI_API_BASE

    @property
    def is_available(self) -> bool:
        """Check if Gemini API key is configured and non-empty."""
        return Settings.is_gemini_available()

    def _call_gemini_urllib(self, url: str, params: dict, payload: dict) -> Optional[dict]:
        """Synchronous urllib POST to Gemini API (run via asyncio.to_thread)."""
        full_url = f"{url}?{urllib.parse.urlencode(params)}"
        req_data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            full_url,
            data=req_data,
            headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=60.0) as resp:
                if resp.status != 200:
                    logger.warning(f"Gemini API returned status {resp.status}")
                    return None
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            logger.warning(f"Gemini API urllib call failed: {e}")
            return None

    def _build_prompt(
        self,
        label_data: Dict[str, Any],
        retrieved_chunks: List[Dict[str, Any]],
        product_name: str
    ) -> str:
        """
        Builds the context-grounded prompt with retrieved statutory rules
        and extracted label data.
        """
        # Format retrieved rules
        rules_text = ""
        for i, chunk in enumerate(retrieved_chunks, 1):
            rules_text += f"\n--- STATUTORY RULE {i} ---\n"
            rules_text += f"ID: {chunk.get('id', 'N/A')}\n"
            rules_text += f"Title: {chunk.get('title', 'N/A')}\n"
            rules_text += f"Act/Rule: {chunk.get('act_rule', 'N/A')}\n"
            rules_text += f"Gazette Reference: {chunk.get('gazette_ref', 'N/A')}\n"
            rules_text += f"Verbatim Text: {chunk.get('verbatim_text', 'N/A')}\n"
            rules_text += f"Officer Guidance: {chunk.get('officer_guidance', 'N/A')}\n"
            rules_text += f"Penalty: {chunk.get('penalty_rule', 'N/A')}\n"
            if chunk.get('effective_date'):
                rules_text += f"Effective Date: {chunk['effective_date']}\n"

        # Format label data
        label_text = f"\nProduct Name: {product_name}\n"
        field_labels = {
            "generic_name": "Generic/Common Name",
            "net_quantity": "Net Quantity",
            "mrp": "Maximum Retail Price (MRP)",
            "unit_sale_price": "Unit Sale Price (USP)",
            "mfg_date": "Date of Manufacture/Packing",
            "expiry_date": "Best Before / Expiry Date",
            "manufacturer_address": "Manufacturer Address",
            "importer_address": "Importer Address",
            "consumer_care_phone": "Consumer Care Phone",
            "consumer_care_email": "Consumer Care Email",
            "country_of_origin": "Country of Origin",
            "language_detected": "Language(s) Detected",
        }
        for key, label in field_labels.items():
            value = label_data.get(key, "NOT DETECTED / MISSING")
            if not value or str(value).strip().lower() in ["", "none", "missing", "n/a"]:
                value = "NOT DETECTED / MISSING"
            label_text += f"  {label}: {value}\n"

        prompt = f"""
RETRIEVED STATUTORY RULES (Your ONLY source of truth):
{rules_text}

EXTRACTED LABEL DATA FROM PACKAGED COMMODITY:
{label_text}

TASK: Analyze each mandatory declaration field against the applicable statutory rules.
For each finding, cite the EXACT rule number and quote relevant verbatim statutory text.
Classify each as COMPLIANT, WARNING, or VIOLATION.
State the applicable penalty under Rule 32 / Section 36 of the LM Act, 2009.

Respond with valid JSON matching the required schema. Do NOT include any text outside the JSON object.
"""
        return prompt

    async def analyze_compliance(
        self,
        label_data: Dict[str, Any],
        retrieved_chunks: List[Dict[str, Any]],
        product_name: str = "Packaged Commodity"
    ) -> Optional[Dict[str, Any]]:
        """
        Sends label data and retrieved statutory chunks to Gemini for
        context-grounded compliance analysis.
        
        Returns structured findings dict, or None if API is unavailable/errors.
        """
        if not self.is_available:
            logger.info("Gemini API not available — skipping LLM synthesis")
            return None

        prompt = self._build_prompt(label_data, retrieved_chunks, product_name)

        # Build Gemini API request
        url = f"{self._base_url}/models/{self._model}:generateContent"
        params = {"key": self._api_key}

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": COMPLIANCE_SYSTEM_PROMPT + "\n\n" + prompt}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "topP": 0.8,
                "maxOutputTokens": 4096,
                "responseMimeType": "application/json",
                "responseSchema": COMPLIANCE_ANALYSIS_SCHEMA,
            }
        }

        try:
            if HAS_HTTPX:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(url, params=params, json=payload)
                    if response.status_code != 200:
                        logger.warning(
                            f"Gemini API returned {response.status_code}: {response.text[:200]}"
                        )
                        return None
                    data = response.json()
            else:
                data = await asyncio.to_thread(self._call_gemini_urllib, url, params, payload)
                if not data:
                    return None

            # Extract generated text from Gemini response
            candidates = data.get("candidates", [])
            if not candidates:
                logger.warning("Gemini returned no candidates")
                return None

            content = candidates[0].get("content", {})
            parts = content.get("parts", [])
            if not parts:
                logger.warning("Gemini returned empty parts")
                return None

            generated_text = parts[0].get("text", "")

            # Parse JSON response
            try:
                result = json.loads(generated_text)
                return result
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse Gemini JSON response: {generated_text[:200]}")
                return None

        except Exception as e:
            logger.warning(f"Gemini API call failed: {e}")
            return None

    async def extract_label_from_image(
        self,
        image_bytes: bytes,
        mime_type: str = "image/jpeg"
    ) -> Optional[Dict[str, Any]]:
        """
        Multimodal Perception: Uses Gemini Vision to read raw text from packaging image
        without hallucinating compliance judgments.
        Returns extracted key-value fields for the deterministic engine to judge.
        """
        if not self.is_available:
            logger.info("Gemini API not available — skipping multimodal vision extraction")
            return None

        import base64
        b64_data = base64.b64encode(image_bytes).decode("utf-8")

        vision_prompt = """You are an OCR and Packaging Text Transcription System for Indian pre-packaged commodities.
Read all printed text, barcodes, QR codes, and statutory symbols from this packaging image carefully, including text on curves, folds, reflective plastic, or barcode areas.

SPECIAL INSTRUCTIONS FOR CHALLENGING PACKAGING (DARK WRAPPERS & SHINY FOILS):
- For dark background packaging (e.g., dark brown toffee wrappers, dark chocolate packs, black foil with white/gold/yellow text), carefully read inverted light-on-dark text and reverse-contrast printing.
- For shiny, metallic, crinkled, or reflective wrappers (e.g., foil toffees, metallic pouches), ignore glare reflections and extract all visible printing along seams, folds, and margins.
- If the image contains an inverted or light-colored QR code on a dark wrapper, decode its contents accurately.

Transcribe and extract the following exact fields if present on the label:
- is_packaged_commodity: boolean (MUST be false if the image shows a human face, selfie, person, body part, animal, room, furniture, wall, or anything that is NOT a commercial pre-packaged consumer product or label; true ONLY if it is a packaged commodity/retail product label).
- invalid_reason: string or null (if is_packaged_commodity is false, explain concisely why, e.g., 'Image shows a human face/person, not a pre-packaged consumer commodity label.')
- generic_name: The common or generic commodity name (e.g., 'RATLAMI SEV', 'POTATO CHIPS'). NOT just the brand logo.
- net_quantity: The declared net quantity or weight in SI units (e.g., '200 g', '100 ml', '1 N'). Do NOT use 'per 100g' from the nutrition table.
- mrp: Maximum retail price (e.g., 'Rs. 55.00' or '₹55.00 (INCL. OF ALL TAXES)').
- unit_sale_price: Unit sale price if printed (e.g., 'Rs. 0.28 per g' or '₹0.28 / g').
- mfg_date: Date/month of packaging, manufacture, or import (e.g., '09/08/2026', 'AUG 2026', 'JUL/26'). Look closely at the coding area, margin seal, inkjet/dot-matrix stamp (e.g., in strings like 'JUL/26-MAR/27' or 'MFD. JUL/26', extract 'JUL/26').
- expiry_date: Best before date, expiry date, or use-by date (e.g., 'Best Before 6 Months', 'MAR/27', '2027-01-05'). If coding stamp says 'JUL/26-MAR/27', extract 'MAR/27'.
- manufacturer_address: Complete name and address of manufacturer, packer, or marketer, including PIN code.
- importer_address: Complete name and address of Indian importer if imported product.
- consumer_care_phone: Helpline or customer care phone number (e.g., '1800 103 1947'). Do not omit if separated by spaces.
- consumer_care_email: Official customer care email address (e.g., 'wecare@in.nestle.com').
- country_of_origin: Declared country of manufacture/origin (e.g., 'India', 'Malaysia').
- language_detected: Primary language of printed text (e.g., 'English', 'Hindi').
- mrp_values: List of distinct MRP prices if more than one is printed on the package.
- barcode_data: Object with:
    - detected: boolean
    - type: "EAN-13" or "UPC-A" or "CODE-128" or "OTHER"
    - value: string of decoded numbers under the barcode (e.g. '8901030383847')
    - gs1_country: detected country based on GS1 prefix (e.g. 'India' for 890, 'USA/Canada' for 000-139)
- qr_data: Object with:
    - detected: boolean
    - raw_payload: string payload or URL encoded in the QR code
    - url: url if payload is a link
    - is_url: boolean
    - satisfies_electronic_disclosure: boolean (true if electronic item secondary info)
- packaging_symbols: Object with:
    - veg_non_veg: "VEG" (green dot in green square) | "NON_VEG" (brown/red dot or triangle) | "NOT_APPLICABLE" | "NOT_FOUND"
    - fssai_license: Object with { detected: boolean, license_number: string or null, is_valid_format: boolean }
    - isi_bis_mark: Object with { detected: boolean, cm_l_number: string or null }
    - recycling_info: Object with { detected: boolean, resin_code: string (1-7), material_name: string (e.g. 'PET', 'PP'), mobius_loop: boolean, tidyman_symbol: boolean }
    - e_mark: Object with { detected: boolean, details: string or null }
    - pao_symbol: Object with { detected: boolean, period: string or null }
- nutrition: Object or null (for food commodities declaring a nutritional table or panel) with:
    - calories: number or null (energy value in kcal, e.g. 446)
    - fat: number or null (total fat in g, e.g. 14.5)
    - carbs: number or null (total carbohydrates in g, e.g. 68.2)
    - protein: number or null (protein in g, e.g. 7.8)
    - sugar: number or null (sugars in g, e.g. 18.5)
    - serving_size: string or null (e.g. 'Per 100g' or 'Per 30g')
- calories: number or null (energy in kcal e.g. 446)
- total_fat: number or null (total fat in g e.g. 14.5)
- carbohydrates: number or null (carbs in g e.g. 68.2)
- protein: number or null (protein in g e.g. 7.8)
- sugars: number or null (sugars in g e.g. 18.5)

Respond with valid JSON. If a field is not visible, return null for that field. Do not invent details."""

        url = f"{self._base_url}/models/{self._model}:generateContent"
        params = {"key": self._api_key}

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": vision_prompt},
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": b64_data
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.0,
                "topP": 0.8,
                "maxOutputTokens": 2048,
                "responseMimeType": "application/json",
            }
        }

        try:
            if HAS_HTTPX:
                async with httpx.AsyncClient(timeout=45.0) as client:
                    response = await client.post(url, params=params, json=payload)
                    if response.status_code != 200:
                        logger.warning(f"Gemini Vision API returned {response.status_code}")
                        return None
                    data = response.json()
            else:
                data = await asyncio.to_thread(self._call_gemini_urllib, url, params, payload)
                if not data:
                    return None

            candidates = data.get("candidates", [])
            if not candidates:
                return None

            content = candidates[0].get("content", {})
            p_list = content.get("parts", [])
            if not p_list:
                return None

            generated_text = p_list[0].get("text", "")
            res = json.loads(generated_text)
            if isinstance(res, dict):
                nut = res.get("nutrition")
                if isinstance(nut, dict):
                    if not res.get("calories") and nut.get("calories") is not None:
                        res["calories"] = nut.get("calories")
                    if not res.get("total_fat") and nut.get("fat") is not None:
                        res["total_fat"] = nut.get("fat")
                    if not res.get("carbohydrates") and nut.get("carbs") is not None:
                        res["carbohydrates"] = nut.get("carbs")
                    if not res.get("protein") and nut.get("protein") is not None:
                        res["protein"] = nut.get("protein")
                    if not res.get("sugars") and nut.get("sugar") is not None:
                        res["sugars"] = nut.get("sugar")
            return res
        except Exception as e:
            logger.warning(f"Gemini Single-Vision extraction failed: {e}")
            return None

    async def extract_label_from_images(
        self,
        images: List[tuple[bytes, str]]
    ) -> Optional[Dict[str, Any]]:
        """
        Multi-Image Multimodal Perception:
        Accepts multiple photos of the SAME product (e.g. Front display panel + Back details + Side flap).
        Sends all images together to Gemini Vision in a single multimodal turn so declarations scattered
        across different panels (MRP on top/bottom, Net Qty on front, Consumer Care on back) are all synthesized.
        Also extracts Barcode numbers, QR codes, and Packaging Certification symbols (Veg/Non-Veg, FSSAI, ISI, Mobius loop).
        """
        if not self.is_available or not images:
            return None

        import base64

        vision_prompt = """You are an OCR, Barcode/QR, and Packaging Symbol Inspection System for Indian pre-packaged commodities.
You are given MULTIPLE images/panels of the SAME physical product package (e.g., front panel, back information panel, side panel, top/bottom flap).

Combine and transcribe all visible statutory declarations and packaging symbols from ALL provided images into a single unified JSON:
- generic_name: Common or generic commodity name (e.g., 'RATLAMI SEV', 'POTATO CHIPS'). NOT just the brand logo.
- net_quantity: The declared net quantity or weight in standard metric SI units (e.g., '200 g', '100 ml', '1 N'). Do NOT use 'per 100g' from the nutrition table.
- mrp: Maximum retail price (e.g., 'Rs. 55.00' or '₹55.00 (INCL. OF ALL TAXES)').
- unit_sale_price: Unit sale price if printed (e.g., 'Rs. 0.28 per g' or '₹0.28 / g').
- mfg_date: Date/month of packaging, manufacture, or import (e.g., '09/08/2026', 'AUG 2026', 'JUL/26'). Look closely at the coding area, margin seal, inkjet/dot-matrix stamp (e.g., in strings like 'JUL/26-MAR/27' or 'MFD. JUL/26', extract 'JUL/26').
- expiry_date: Best before date, expiry date, or use-by period (e.g., 'Best Before 6 Months', 'MAR/27', '2027-01-05'). If coding stamp says 'JUL/26-MAR/27', extract 'MAR/27'.
- manufacturer_address: Complete name and address of manufacturer, packer, or marketer, including 6-digit postal PIN code.
- importer_address: Complete name and address of registered Indian importer with PIN code (if imported product).
- consumer_care_phone: Helpline or customer service phone/telephone number (e.g., '1800 103 1947'). Do not omit if separated by spaces.
- consumer_care_email: Official customer care email address (e.g., 'wecare@in.nestle.com').
- country_of_origin: Declared country of origin/manufacture (e.g., 'India', 'Malaysia').
- language_detected: Primary language of printed statutory declarations (e.g., 'English', 'Hindi').
- mrp_values: List of all distinct MRP prices printed across any of the panels.
- barcode_data: Object with:
    - detected: boolean
    - type: "EAN-13" or "UPC-A" or "CODE-128" or "OTHER"
    - value: string of decoded numbers under the barcode (e.g. '8901030383847')
    - gs1_country: detected country based on GS1 prefix (e.g. 'India' for 890, 'USA/Canada' for 000-139)
- qr_data: Object with:
    - detected: boolean
    - raw_payload: string payload or URL encoded in the QR code
    - url: url if payload is a link
    - is_url: boolean
    - satisfies_electronic_disclosure: boolean (true if electronic item secondary info per GSR 524(E))
- packaging_symbols: Object with:
    - veg_non_veg: "VEG" (green dot in green square) | "NON_VEG" (brown/red dot or triangle) | "NOT_APPLICABLE" | "NOT_FOUND"
    - fssai_license: Object with { detected: boolean, license_number: string or null, is_valid_format: boolean }
    - isi_bis_mark: Object with { detected: boolean, cm_l_number: string or null }
    - recycling_info: Object with { detected: boolean, resin_code: string (1-7), material_name: string (e.g. 'PET', 'PP'), mobius_loop: boolean, tidyman_symbol: boolean }
    - e_mark: Object with { detected: boolean, details: string or null }
    - pao_symbol: Object with { detected: boolean, period: string or null }
- nutrition: Object or null (for food commodities declaring a nutritional table or panel) with:
    - calories: number or null (energy value in kcal, e.g. 446)
    - fat: number or null (total fat in g, e.g. 14.5)
    - carbs: number or null (total carbohydrates in g, e.g. 68.2)
    - protein: number or null (protein in g, e.g. 7.8)
    - sugar: number or null (sugars in g, e.g. 18.5)
    - serving_size: string or null (e.g. 'Per 100g' or 'Per 30g')
- calories: number or null (energy in kcal e.g. 446)
- total_fat: number or null (total fat in g e.g. 14.5)
- carbohydrates: number or null (carbs in g e.g. 68.2)
- protein: number or null (protein in g e.g. 7.8)
- sugars: number or null (sugars in g e.g. 18.5)

Respond with valid JSON. If a declaration cannot be found on ANY of the provided images, return null for that field. Do not fabricate details."""

        # Build parts array with prompt + all image objects
        parts: List[Dict[str, Any]] = [{"text": vision_prompt}]
        for idx, (img_bytes, mime_type) in enumerate(images, 1):
            b64_data = base64.b64encode(img_bytes).decode("utf-8")
            parts.append({
                "inline_data": {
                    "mime_type": mime_type or "image/jpeg",
                    "data": b64_data
                }
            })

        url = f"{self._base_url}/models/{self._model}:generateContent"
        params = {"key": self._api_key}

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": parts
                }
            ],
            "generationConfig": {
                "temperature": 0.0,
                "topP": 0.8,
                "maxOutputTokens": 2048,
                "responseMimeType": "application/json",
            }
        }

        try:
            if HAS_HTTPX:
                async with httpx.AsyncClient(timeout=45.0) as client:
                    response = await client.post(url, params=params, json=payload)
                    if response.status_code != 200:
                        logger.warning(f"Gemini Multi-Vision API returned {response.status_code}: {response.text[:200]}")
                        return None
                    data = response.json()
            else:
                data = await asyncio.to_thread(self._call_gemini_urllib, url, params, payload)
                if not data:
                    return None

            candidates = data.get("candidates", [])
            if not candidates:
                return None

            content = candidates[0].get("content", {})
            p_list = content.get("parts", [])
            if not p_list:
                return None

            generated_text = p_list[0].get("text", "")
            res = json.loads(generated_text)
            if isinstance(res, dict):
                nut = res.get("nutrition")
                if isinstance(nut, dict):
                    if not res.get("calories") and nut.get("calories") is not None:
                        res["calories"] = nut.get("calories")
                    if not res.get("total_fat") and nut.get("fat") is not None:
                        res["total_fat"] = nut.get("fat")
                    if not res.get("carbohydrates") and nut.get("carbs") is not None:
                        res["carbohydrates"] = nut.get("carbs")
                    if not res.get("protein") and nut.get("protein") is not None:
                        res["protein"] = nut.get("protein")
                    if not res.get("sugars") and nut.get("sugar") is not None:
                        res["sugars"] = nut.get("sugar")
            return res

        except Exception as e:
            logger.warning(f"Gemini Multi-Vision extraction failed: {e}")
            return None


# Global singleton
gemini_engine = GeminiComplianceEngine()
