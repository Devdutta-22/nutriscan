import json
import logging
import asyncio
import urllib.request
import urllib.parse
from typing import Dict, Any, Optional

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False

from app.config import Settings

logger = logging.getLogger(__name__)

REFEREE_SYSTEM_PROMPT = """You are an independent, neutral Legal Metrology Referee. Your task is to evaluate the provided label data of a packaged commodity against the 11 key mandates of the Legal Metrology (Packaged Commodities) Rules, 2011.

You must evaluate each of the following 11 mandates independently:
1. mfg_address
2. generic_name
3. net_quantity
4. mrp
5. mfg_date
6. usp
7. consumer_care
8. country_of_origin
9. best_before
10. language
11. dual_mrp

For each mandate, determine if the extracted label data indicates compliance.
Return COMPLIANT, WARNING, or VIOLATION for each mandate, along with your reasoning based purely on standard Legal Metrology principles.

OUTPUT FORMAT: You must respond with valid JSON matching the schema below. No markdown, no explanation outside the JSON.
"""

REFEREE_SCHEMA = {
    "type": "object",
    "properties": {
        "mandates": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "mandate_id": {"type": "string"},
                    "status": {"type": "string", "enum": ["COMPLIANT", "WARNING", "VIOLATION"]},
                    "reasoning": {"type": "string"}
                },
                "required": ["mandate_id", "status", "reasoning"]
            }
        },
        "overall_assessment": {
            "type": "string"
        }
    },
    "required": ["mandates", "overall_assessment"]
}

class RefereeEngine:
    def __init__(self):
        self._api_key = Settings.GEMINI_API_KEY
        self._model = "gemini-flash-latest"
        self._base_url = Settings.GEMINI_API_BASE

    @property
    def is_available(self) -> bool:
        return bool(self._api_key and self._api_key.strip())

    def _call_gemini_urllib(self, url: str, params: dict, payload: dict) -> Optional[dict]:
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
                    logger.warning(f"Referee Gemini API returned status {resp.status}")
                    return None
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            logger.warning(f"Referee Gemini API urllib call failed: {e}")
            return None

    def _build_prompt(self, label_data: Dict[str, Any], product_name: str) -> str:
        label_text = f"\nProduct Name: {product_name}\n"
        for key, value in label_data.items():
            if not value or str(value).strip().lower() in ["", "none", "missing", "n/a"]:
                value = "NOT DETECTED / MISSING"
            label_text += f"  {key}: {value}\n"

        prompt = f"""
EXTRACTED LABEL DATA:
{label_text}

Evaluate each of the 11 LMPC mandates independently. Return COMPLIANT, WARNING, or VIOLATION for each with reasoning.
"""
        return prompt

    async def evaluate(self, label_data: Dict[str, Any], product_name: str) -> Optional[Dict[str, Any]]:
        if not self.is_available:
            logger.info("Gemini API not available — skipping referee synthesis")
            return None

        prompt = self._build_prompt(label_data, product_name)
        url = f"{self._base_url}/models/{self._model}:generateContent"
        params = {"key": self._api_key}

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": REFEREE_SYSTEM_PROMPT + "\n\n" + prompt}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json",
                "responseSchema": REFEREE_SCHEMA,
            }
        }

        try:
            if HAS_HTTPX:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(url, params=params, json=payload)
                    if response.status_code != 200:
                        logger.warning(f"Referee Gemini API returned {response.status_code}")
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
            parts = content.get("parts", [])
            if not parts:
                return None

            generated_text = parts[0].get("text", "")
            try:
                result = json.loads(generated_text)
                return result
            except json.JSONDecodeError:
                logger.warning("Failed to parse Referee JSON response")
                return None

        except Exception as e:
            logger.warning(f"Referee Gemini API call failed: {e}")
            return None
