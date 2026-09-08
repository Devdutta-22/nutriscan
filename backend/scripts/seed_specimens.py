#!/usr/bin/env python3
"""
PackSure AI — Specimen Database Seeder
=======================================
Populates Supabase with 30 diverse realistic Indian packaged product specimens
across all compliance grades (A+ → F) and product categories.

Run from project root:
    PYTHONPATH=backend python backend/scripts/seed_specimens.py
"""

import sys
import os
import json
import uuid
import time
from datetime import datetime, timezone, timedelta
import random

# ── Make sure the backend package is importable ───────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.api.storage import insert_specimen_to_db, is_supabase_enabled

# ── Helpers ───────────────────────────────────────────────────────────────────

def grade_from_score(score: int) -> str:
    if score >= 95: return "A+"
    if score >= 85: return "A"
    if score >= 75: return "B+"
    if score >= 65: return "B"
    if score >= 55: return "C+"
    if score >= 45: return "C"
    if score >= 35: return "D"
    return "F"


def legal_status_from_score(score: int) -> str:
    if score >= 90: return "FULLY COMPLIANT"
    if score >= 70: return "MINOR WARNINGS"
    if score >= 50: return "VIOLATIONS DETECTED"
    return "NON-COMPLIANT"


def status_text_from_score(score: int) -> str:
    if score >= 90: return "✅ All mandatory declarations verified. Label meets LMPC Rules 2011."
    if score >= 70: return "⚠️ Minor labelling gaps found. Corrective action recommended."
    if score >= 50: return "❌ Compliance violations detected. Regulatory action possible."
    return "🚫 Severe non-compliance. Product may be barred from sale under Section 36 LMPC Act."


def make_summary(score: int, violations: int, warnings: int, issues: list[str]) -> dict:
    return {
        "compliance_score": score,
        "grade": grade_from_score(score),
        "total_checks": 11,
        "passed": max(0, 11 - violations - warnings),
        "violations": violations,
        "warnings": warnings,
        "issues": issues,
        "rag_citations": violations + warnings,
    }


def make_checklist(checks: list[dict]) -> list[dict]:
    return [
        {
            "id": c["id"],
            "rule": c["rule"],
            "description": c["description"],
            "status": c["status"],          # "pass" | "violation" | "warning"
            "details": c.get("details", ""),
            "legal_ref": c.get("legal_ref", "Rule 6, LMPC Rules 2011"),
        }
        for c in checks
    ]


def rand_date_past(days_min=7, days_max=730) -> str:
    delta = timedelta(days=random.randint(days_min, days_max))
    dt = datetime.now(timezone.utc) - delta
    return dt.isoformat()


# ── Product Definitions ───────────────────────────────────────────────────────
# Each entry maps directly to the Supabase `specimens` table schema.

PRODUCTS = [

    # ═══════════════════════════════════════════════════════════════════════════
    # GRADE A+ — Fully Compliant (score 95–100)
    # ═══════════════════════════════════════════════════════════════════════════

    {
        "product_name": "Parle-G Original Glucose Biscuits",
        "product_category": "Packaged Food",
        "compliance_score": 100,
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Parle-G.jpg/640px-Parle-G.jpg",
        "summary_issues": [],
        "violations": 0, "warnings": 0,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","description":"Generic / common name of commodity","status":"pass","details":"'Glucose Biscuits' prominently displayed","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","description":"Net weight/volume in standard units","status":"pass","details":"400 g declared in ≥4mm font","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","description":"Maximum Retail Price incl. all taxes","status":"pass","details":"₹30.00 (Incl. of all taxes)","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"Unit Sale Price","description":"Statutory unit sale price per gram","status":"pass","details":"₹0.075/g — matches MRP/net qty","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Manufacturer Address","description":"Full postal address of manufacturer","status":"pass","details":"Parle Products Pvt Ltd, Vile Parle, Mumbai 400057","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Manufacturing Date","description":"Month and year of manufacture","status":"pass","details":"Mfg: JAN/2024","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before / Expiry","description":"Best before date clearly stated","status":"pass","details":"Best before 9 months from manufacture","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","description":"Consumer helpline contact details","status":"pass","details":"+91-1800-103-4141 | care@parle.com","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","description":"Country where product was manufactured","status":"pass","details":"India","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Barcode / GS1","description":"EAN-13 barcode with valid GS1 prefix","status":"pass","details":"890 prefix — valid Indian GS1","legal_ref":"Rule 6A"},
            {"id":"fssai","rule":"FSSAI Licence","description":"FSSAI licence number on pack","status":"pass","details":"Lic. No. 10013022000252","legal_ref":"FSS Act 2006"},
        ],
        "label_data": {
            "generic_name": "Glucose Biscuits",
            "net_quantity": "400g",
            "mrp": "₹30.00 (Incl. of all taxes)",
            "unit_sale_price": "₹0.075/g",
            "mfg_date": "JAN/2024",
            "manufacturer_address": "Parle Products Pvt Ltd, Vile Parle (W), Mumbai, Maharashtra - 400057",
            "consumer_care_phone": "1800-103-4141",
            "consumer_care_email": "care@parle.com",
            "country_of_origin": "India",
            "calories": 452, "total_fat": 11.4, "carbohydrates": 77.5, "protein": 6.2, "sugars": 24.0, "serving_size": "Per 100g",
            "barcode_data": {"detected": True, "type": "EAN-13", "value": "8901719110214", "gs1_country": "India", "is_valid_gs1": True, "country_match": True},
        },
    },

    {
        "product_name": "Amul Butter (Pasteurised)",
        "product_category": "Dairy Product",
        "compliance_score": 98,
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Amul_butter.jpg/640px-Amul_butter.jpg",
        "summary_issues": [],
        "violations": 0, "warnings": 0,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name displayed","details":"'Pasteurised Butter' in English & Hindi","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"pass","description":"Net weight","details":"100 g","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","status":"pass","description":"MRP incl. taxes","details":"₹57.00 (MRP Incl. of all taxes)","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"Unit Sale Price","status":"pass","description":"USP per gram","details":"₹0.57/g — verified","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Manufacturer","status":"pass","description":"Manufacturer address","details":"GCMMF Ltd, Anand, Gujarat - 388 001","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"pass","description":"Manufacturing date","details":"FEB/2024","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"pass","description":"Expiry date","details":"Use before 26 weeks from pack date","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"pass","description":"Helpline details","details":"1800-258-3333","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"pass","description":"Origin country","details":"India","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Barcode","status":"pass","description":"GS1 barcode","details":"EAN-13 valid GS1 India prefix","legal_ref":"Rule 6A"},
            {"id":"fssai","rule":"FSSAI","status":"pass","description":"FSSAI licence","details":"10013022000012","legal_ref":"FSS Act 2006"},
        ],
        "label_data": {
            "generic_name": "Pasteurised Butter",
            "net_quantity": "100g",
            "mrp": "₹57.00 (Incl. of all taxes)",
            "unit_sale_price": "₹0.57/g",
            "mfg_date": "FEB/2024",
            "manufacturer_address": "Gujarat Co-operative Milk Marketing Federation Ltd., Anand, Gujarat - 388001",
            "consumer_care_phone": "1800-258-3333",
            "country_of_origin": "India",
            "calories": 717, "total_fat": 81.1, "carbohydrates": 0.1, "protein": 0.9, "sugars": 0.1, "serving_size": "Per 100g",
        },
    },

    {
        "product_name": "Tata Rock Salt (Sendha Namak)",
        "product_category": "Packaged Spices & Condiments",
        "compliance_score": 97,
        "image_url": None,
        "summary_issues": [],
        "violations": 0, "warnings": 0,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name","details":"'Rock Salt / Sendha Namak'","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"pass","description":"Net weight","details":"1 kg","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","status":"pass","description":"MRP","details":"₹65.00 (Incl. of all taxes)","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"Unit Sale Price","status":"pass","description":"USP","details":"₹65.00/kg — verified","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Manufacturer","status":"pass","description":"Manufacturer address","details":"Tata Consumer Products Ltd., Mumbai - 400001","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"pass","description":"Mfg date","details":"DEC/2023","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"pass","description":"Best before","details":"Best before 24 months from mfg","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"pass","description":"Helpline","details":"1800-209-8282","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"pass","description":"Origin","details":"India","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Barcode","status":"pass","description":"GS1 barcode","details":"EAN-13 with GS1 India prefix 890","legal_ref":"Rule 6A"},
            {"id":"fssai","rule":"FSSAI","status":"pass","description":"FSSAI licence","details":"10013022001122","legal_ref":"FSS Act 2006"},
        ],
        "label_data": {
            "generic_name": "Rock Salt / Sendha Namak",
            "net_quantity": "1 kg",
            "mrp": "₹65.00 (Incl. of all taxes)",
            "unit_sale_price": "₹65.00/kg",
            "mfg_date": "DEC/2023",
            "manufacturer_address": "Tata Consumer Products Ltd., Backbay Reclamation, Mumbai - 400001",
            "consumer_care_phone": "1800-209-8282",
            "country_of_origin": "India",
        },
    },

    {
        "product_name": "Dabur Honey (Pure & Natural)",
        "product_category": "Packaged Food",
        "compliance_score": 96,
        "image_url": None,
        "summary_issues": [],
        "violations": 0, "warnings": 0,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name","details":"'Natural Honey'","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"pass","description":"Net weight","details":"500g","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","status":"pass","description":"MRP","details":"₹230.00 (Incl. of all taxes)","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"USP","status":"pass","description":"Unit price","details":"₹0.46/g — correct","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Manufacturer","status":"pass","description":"Address","details":"Dabur India Ltd., Sahibabad, Ghaziabad, UP - 201010","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"pass","description":"Mfg date","details":"MAR/2024","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"pass","description":"Best before","details":"Best before 18 months from mfg","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"pass","description":"Helpline","details":"1800-103-1644","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"pass","description":"Origin","details":"India","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Barcode","status":"pass","description":"Barcode","details":"EAN-13 — GS1 India valid","legal_ref":"Rule 6A"},
            {"id":"fssai","rule":"FSSAI","status":"pass","description":"FSSAI","details":"10013022001233","legal_ref":"FSS Act 2006"},
        ],
        "label_data": {
            "generic_name": "Natural Honey",
            "net_quantity": "500g",
            "mrp": "₹230.00 (Incl. of all taxes)",
            "unit_sale_price": "₹0.46/g",
            "mfg_date": "MAR/2024",
            "manufacturer_address": "Dabur India Ltd., Sahibabad Industrial Area, Ghaziabad, Uttar Pradesh - 201010",
            "consumer_care_phone": "1800-103-1644",
            "country_of_origin": "India",
            "calories": 304, "total_fat": 0.0, "carbohydrates": 82.4, "protein": 0.3, "sugars": 82.1, "serving_size": "Per 100g",
        },
    },

    {
        "product_name": "Haldiram's Aloo Bhujia",
        "product_category": "Packaged Snacks",
        "compliance_score": 95,
        "image_url": None,
        "summary_issues": [],
        "violations": 0, "warnings": 0,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name","details":"'Namkeen Snack — Aloo Bhujia'","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"pass","description":"Net weight","details":"200g","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","status":"pass","description":"MRP","details":"₹90.00 (Incl. of all taxes)","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"USP","status":"pass","description":"Unit price","details":"₹0.45/g — verified","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Manufacturer","status":"pass","description":"Address","details":"Haldiram Foods International Pvt Ltd., Nagpur, Maharashtra","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"pass","description":"Mfg date","details":"APR/2024","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"pass","description":"Best before","details":"6 months from mfg","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"pass","description":"Helpline","details":"1800-200-0706","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"pass","description":"Origin","details":"India","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Barcode","status":"pass","description":"Barcode","details":"EAN-13 valid","legal_ref":"Rule 6A"},
            {"id":"fssai","rule":"FSSAI","status":"pass","description":"FSSAI","details":"10013022000500","legal_ref":"FSS Act 2006"},
        ],
        "label_data": {
            "generic_name": "Namkeen Snack — Aloo Bhujia",
            "net_quantity": "200g",
            "mrp": "₹90.00 (Incl. of all taxes)",
            "unit_sale_price": "₹0.45/g",
            "mfg_date": "APR/2024",
            "manufacturer_address": "Haldiram Foods International Pvt Ltd., Kamptee Road, Nagpur, Maharashtra - 440026",
            "consumer_care_phone": "1800-200-0706",
            "country_of_origin": "India",
            "calories": 549, "total_fat": 31.0, "carbohydrates": 55.9, "protein": 11.2, "sugars": 2.1, "serving_size": "Per 100g",
        },
    },

    # ═══════════════════════════════════════════════════════════════════════════
    # GRADE A — Very Good (score 85–94)
    # ═══════════════════════════════════════════════════════════════════════════

    {
        "product_name": "Nestlé MUNCH Chocolate Bar",
        "product_category": "Confectionery",
        "compliance_score": 92,
        "image_url": None,
        "summary_issues": ["Consumer email address partially illegible on pack"],
        "violations": 0, "warnings": 1,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name","details":"'Wafer Chocolate Bar'","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"pass","description":"Net weight","details":"50g","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","status":"pass","description":"MRP","details":"₹20.00 (Incl. of all taxes)","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"USP","status":"pass","description":"Unit price","details":"₹0.40/g — verified","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Manufacturer","status":"pass","description":"Address","details":"Nestlé India Ltd., Moga, Punjab","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"pass","description":"Mfg date","details":"FEB/2024","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"pass","description":"Best before","details":"12 months from mfg","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"warning","description":"Consumer email partially illegible","details":"Email address print quality low — may be unreadable on some packs","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"pass","description":"Origin","details":"India","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Barcode","status":"pass","description":"Barcode","details":"EAN-13 valid GS1 India","legal_ref":"Rule 6A"},
            {"id":"fssai","rule":"FSSAI","status":"pass","description":"FSSAI","details":"10013022000999","legal_ref":"FSS Act 2006"},
        ],
        "label_data": {
            "generic_name": "Wafer Chocolate Bar",
            "net_quantity": "50g",
            "mrp": "₹20.00 (Incl. of all taxes)",
            "unit_sale_price": "₹0.40/g",
            "mfg_date": "FEB/2024",
            "manufacturer_address": "Nestlé India Ltd., Unit Moga, Punjab",
            "consumer_care_phone": "1800-103-0219",
            "country_of_origin": "India",
            "calories": 514, "total_fat": 23.0, "carbohydrates": 67.5, "protein": 7.5, "sugars": 38.5, "serving_size": "Per 100g",
        },
    },

    {
        "product_name": "MDH Deggi Mirch Powder",
        "product_category": "Packaged Spices & Condiments",
        "compliance_score": 90,
        "image_url": None,
        "summary_issues": ["Font size of net quantity slightly below 4mm minimum"],
        "violations": 0, "warnings": 1,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name","details":"'Deggi Mirch (Ground Red Pepper Blend)'","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"warning","description":"Font size sub-optimal","details":"Net qty '100g' printed in 3.5mm font — minimum required is 4mm per Schedule II","legal_ref":"Rule 6(1)(b), Schedule II"},
            {"id":"mrp","rule":"MRP","status":"pass","description":"MRP","details":"₹68.00 (Incl. of all taxes)","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"USP","status":"pass","description":"Unit price","details":"₹0.68/g — verified","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Manufacturer","status":"pass","description":"Address","details":"Mahashian Di Hatti Ltd., Delhi","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"pass","description":"Mfg date","details":"JAN/2024","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"pass","description":"Best before","details":"Best before 18 months from mfg","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"pass","description":"Helpline","details":"011-27131700","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"pass","description":"Origin","details":"India","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Barcode","status":"pass","description":"Barcode","details":"EAN-13 valid","legal_ref":"Rule 6A"},
            {"id":"fssai","rule":"FSSAI","status":"pass","description":"FSSAI","details":"10013022000400","legal_ref":"FSS Act 2006"},
        ],
        "label_data": {
            "generic_name": "Deggi Mirch (Ground Red Pepper Blend)",
            "net_quantity": "100g",
            "mrp": "₹68.00 (Incl. of all taxes)",
            "unit_sale_price": "₹0.68/g",
            "mfg_date": "JAN/2024",
            "manufacturer_address": "Mahashian Di Hatti (Pvt) Ltd., 4650, Kedarnath Road, Delhi - 110006",
            "consumer_care_phone": "011-27131700",
            "country_of_origin": "India",
            "calories": 341, "total_fat": 12.7, "carbohydrates": 39.8, "protein": 12.3, "sugars": 7.4, "serving_size": "Per 100g",
        },
    },

    {
        "product_name": "Britannia NutriChoice 5 Grain Biscuits",
        "product_category": "Packaged Food",
        "compliance_score": 88,
        "image_url": None,
        "summary_issues": ["Consumer care address not printed (only phone + email)"],
        "violations": 0, "warnings": 1,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name","details":"'Multi Grain Digestive Biscuits'","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"pass","description":"Net weight","details":"350g","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","status":"pass","description":"MRP","details":"₹70.00 (Incl. of all taxes)","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"USP","status":"pass","description":"Unit price","details":"₹0.20/g — verified","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Manufacturer","status":"pass","description":"Address","details":"Britannia Industries Ltd., Bengaluru","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"pass","description":"Mfg date","details":"MAR/2024","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"pass","description":"Best before","details":"9 months from mfg","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"warning","description":"Consumer care postal address missing","details":"Rule 6(1)(r) mandates physical address alongside phone/email — only phone & email present","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"pass","description":"Origin","details":"India","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Barcode","status":"pass","description":"Barcode","details":"EAN-13 valid GS1 India","legal_ref":"Rule 6A"},
            {"id":"fssai","rule":"FSSAI","status":"pass","description":"FSSAI","details":"10013022000199","legal_ref":"FSS Act 2006"},
        ],
        "label_data": {
            "generic_name": "Multi Grain Digestive Biscuits",
            "net_quantity": "350g",
            "mrp": "₹70.00 (Incl. of all taxes)",
            "unit_sale_price": "₹0.20/g",
            "mfg_date": "MAR/2024",
            "manufacturer_address": "Britannia Industries Ltd., 5/1A, Hungerford Street, Kolkata - 700017",
            "consumer_care_phone": "1800-103-1414",
            "consumer_care_email": "consumer.care@britindia.com",
            "country_of_origin": "India",
            "calories": 447, "total_fat": 14.8, "carbohydrates": 69.1, "protein": 8.9, "sugars": 16.3, "serving_size": "Per 100g",
        },
    },

    {
        "product_name": "Maaza Mango Drink (PET Bottle)",
        "product_category": "Packaged Beverage",
        "compliance_score": 86,
        "image_url": None,
        "summary_issues": ["'Added Sugar' declaration font smaller than prescribed"],
        "violations": 0, "warnings": 1,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name","details":"'Mango Drink'","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"pass","description":"Net quantity","details":"600 mL","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","status":"pass","description":"MRP","details":"₹40.00 (Incl. of all taxes)","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"USP","status":"pass","description":"Unit price","details":"₹66.67/L — correct","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Manufacturer","status":"pass","description":"Address","details":"Hindustan Coca-Cola Beverages Pvt Ltd, Pune","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"pass","description":"Mfg date","details":"APR/2024","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"pass","description":"Best before","details":"Best before 6 months from mfg","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"pass","description":"Helpline","details":"1800-180-2653","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"pass","description":"Origin","details":"India","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Barcode","status":"warning","description":"Added sugar declaration font non-compliant","details":"'Contains added sugar' text smaller than 2mm required by Rule 22A","legal_ref":"Rule 22A"},
            {"id":"fssai","rule":"FSSAI","status":"pass","description":"FSSAI","details":"10013022002255","legal_ref":"FSS Act 2006"},
        ],
        "label_data": {
            "generic_name": "Mango Drink",
            "net_quantity": "600 mL",
            "mrp": "₹40.00 (Incl. of all taxes)",
            "unit_sale_price": "₹66.67/L",
            "mfg_date": "APR/2024",
            "manufacturer_address": "Hindustan Coca-Cola Beverages Pvt Ltd, Atchutapuram, Visakhapatnam, Andhra Pradesh",
            "consumer_care_phone": "1800-180-2653",
            "country_of_origin": "India",
            "calories": 68, "total_fat": 0.0, "carbohydrates": 16.9, "protein": 0.1, "sugars": 16.7, "serving_size": "Per 100 mL",
        },
    },

    # ═══════════════════════════════════════════════════════════════════════════
    # GRADE B+ — Good with minor violations (score 75–84)
    # ═══════════════════════════════════════════════════════════════════════════

    {
        "product_name": "Patanjali Ghee (Pure Cow Ghee)",
        "product_category": "Dairy Product",
        "compliance_score": 82,
        "image_url": None,
        "summary_issues": ["Unit sale price calculation has rounding error", "Batch number not printed"],
        "violations": 1, "warnings": 1,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name","details":"'Pure Cow Ghee'","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"pass","description":"Net weight","details":"500 mL","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","status":"pass","description":"MRP","details":"₹290.00 (Incl. of all taxes)","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"USP","status":"violation","description":"Unit sale price rounding error","details":"Printed USP is ₹0.58/mL but correct value is ₹290/500 = ₹0.580 — technically a rule violation even with minor discrepancy","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Manufacturer","status":"pass","description":"Address","details":"Patanjali Ayurved Ltd., Haridwar, Uttarakhand","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"pass","description":"Mfg date","details":"JAN/2024","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"pass","description":"Best before","details":"Use before 18 months from mfg","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"pass","description":"Helpline","details":"1860-2660-111","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"pass","description":"Origin","details":"India","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Barcode","status":"warning","description":"Batch/Lot number not printed","details":"Rule 6(1)(i) requires batch/lot number — not found on label","legal_ref":"Rule 6(1)(i)"},
            {"id":"fssai","rule":"FSSAI","status":"pass","description":"FSSAI","details":"10013022000777","legal_ref":"FSS Act 2006"},
        ],
        "label_data": {
            "generic_name": "Pure Cow Ghee",
            "net_quantity": "500 mL",
            "mrp": "₹290.00 (Incl. of all taxes)",
            "unit_sale_price": "₹0.58/mL",
            "mfg_date": "JAN/2024",
            "manufacturer_address": "Patanjali Ayurved Ltd., Patanjali Food & Herbal Park, Haridwar, Uttarakhand - 249401",
            "consumer_care_phone": "1860-2660-111",
            "country_of_origin": "India",
            "calories": 900, "total_fat": 100.0, "carbohydrates": 0.0, "protein": 0.0, "sugars": 0.0, "serving_size": "Per 100g",
        },
    },

    {
        "product_name": "Maggi 2-Minute Noodles Masala",
        "product_category": "Packaged Food",
        "compliance_score": 80,
        "image_url": None,
        "summary_issues": ["Serving size not expressed in standard metric units", "Allergy declaration font too small"],
        "violations": 1, "warnings": 1,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name","details":"'Instant Noodles with Tastemaker'","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"pass","description":"Net weight","details":"70g","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","status":"pass","description":"MRP","details":"₹14.00 (Incl. of all taxes)","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"USP","status":"pass","description":"Unit price","details":"₹0.20/g — verified","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Manufacturer","status":"pass","description":"Address","details":"Nestlé India Ltd., Bichhwal Industrial Area, Bikaner, Rajasthan","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"pass","description":"Mfg date","details":"MAR/2024","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"pass","description":"Best before","details":"12 months from mfg","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"pass","description":"Helpline","details":"1800-103-0219","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"pass","description":"Origin","details":"India","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Serving Size","status":"violation","description":"Serving size not in standard units","details":"Serving size stated as '1 cake' — must be expressed in grams or mL per Rule 22B(3)","legal_ref":"Rule 22B(3)"},
            {"id":"fssai","rule":"FSSAI","status":"warning","description":"Allergy statement font below minimum","details":"'Contains Wheat (Gluten)' allergy text is 1.5mm — minimum 1.8mm required","legal_ref":"FSS Labelling Regulations 2020"},
        ],
        "label_data": {
            "generic_name": "Instant Noodles with Tastemaker",
            "net_quantity": "70g",
            "mrp": "₹14.00 (Incl. of all taxes)",
            "unit_sale_price": "₹0.20/g",
            "mfg_date": "MAR/2024",
            "manufacturer_address": "Nestlé India Ltd., Bichhwal Industrial Area, Bikaner, Rajasthan - 334006",
            "consumer_care_phone": "1800-103-0219",
            "country_of_origin": "India",
            "calories": 348, "total_fat": 9.1, "carbohydrates": 58.9, "protein": 8.9, "sugars": 1.6, "serving_size": "Per 100g",
        },
    },

    {
        "product_name": "Surf Excel Easy Wash Detergent",
        "product_category": "Household & Cleaning Products",
        "compliance_score": 78,
        "image_url": None,
        "summary_issues": ["Manufacturer's PIN code missing from address", "Volume declared instead of weight for solid product"],
        "violations": 1, "warnings": 1,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name","details":"'Detergent Powder'","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"violation","description":"Quantity in incorrect units","details":"Pack declares '1 Litre' for solid detergent powder — must be declared in grams/kg","legal_ref":"Rule 6(1)(b), Rule 7"},
            {"id":"mrp","rule":"MRP","status":"pass","description":"MRP","details":"₹110.00 (Incl. of all taxes)","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"USP","status":"pass","description":"Unit price","details":"₹110.00/kg nominal","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Manufacturer","status":"warning","description":"PIN code missing from address","details":"Address printed without postal code — Rule 6(1)(e) mandates complete postal address","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"pass","description":"Mfg date","details":"FEB/2024","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"pass","description":"Best before","details":"Use within 24 months of mfg","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"pass","description":"Helpline","details":"1800-103-1404","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"pass","description":"Origin","details":"India","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Barcode","status":"pass","description":"Barcode","details":"EAN-13 valid","legal_ref":"Rule 6A"},
            {"id":"fssai","rule":"N/A","status":"pass","description":"FSSAI N/A for non-food product","details":"Non-food product — FSSAI not applicable","legal_ref":"N/A"},
        ],
        "label_data": {
            "generic_name": "Detergent Powder",
            "net_quantity": "1 kg",
            "mrp": "₹110.00 (Incl. of all taxes)",
            "unit_sale_price": "₹110.00/kg",
            "mfg_date": "FEB/2024",
            "manufacturer_address": "Hindustan Unilever Limited, Andheri East, Mumbai, Maharashtra",
            "consumer_care_phone": "1800-103-1404",
            "country_of_origin": "India",
        },
    },

    # ═══════════════════════════════════════════════════════════════════════════
    # GRADE B — Acceptable with notable issues (score 65–74)
    # ═══════════════════════════════════════════════════════════════════════════

    {
        "product_name": "Kurkure Masala Munch (Regional Brand)",
        "product_category": "Packaged Snacks",
        "compliance_score": 72,
        "image_url": None,
        "summary_issues": ["Unit sale price missing", "Consumer care details incomplete"],
        "violations": 1, "warnings": 2,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name","details":"'Puffed Corn Snack'","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"pass","description":"Net weight","details":"60g","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","status":"pass","description":"MRP","details":"₹20.00 (Incl. of all taxes)","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"USP","status":"violation","description":"Unit sale price absent","details":"Mandatory unit sale price (₹/g) is entirely absent from packaging — Rule 6(1)(s) violation","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Manufacturer","status":"pass","description":"Address","details":"PepsiCo India Holdings Pvt Ltd, Gurugram, Haryana","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"pass","description":"Mfg date","details":"JAN/2024","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"pass","description":"Best before","details":"6 months from mfg","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"warning","description":"Email address missing","details":"Only phone provided — Rule 6(1)(r) requires phone AND email","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"pass","description":"Origin","details":"India","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Barcode","status":"warning","description":"Barcode partially obscured","details":"Barcode partially covered by a promotional sticker — may not scan correctly","legal_ref":"Rule 6A"},
            {"id":"fssai","rule":"FSSAI","status":"pass","description":"FSSAI","details":"10013022000333","legal_ref":"FSS Act 2006"},
        ],
        "label_data": {
            "generic_name": "Puffed Corn Snack",
            "net_quantity": "60g",
            "mrp": "₹20.00 (Incl. of all taxes)",
            "mfg_date": "JAN/2024",
            "manufacturer_address": "PepsiCo India Holdings Pvt Ltd, DLF Cyber City, Phase II, Gurugram, Haryana - 122002",
            "consumer_care_phone": "1800-180-0200",
            "country_of_origin": "India",
            "calories": 507, "total_fat": 24.0, "carbohydrates": 64.0, "protein": 5.8, "sugars": 2.8, "serving_size": "Per 100g",
        },
    },

    {
        "product_name": "Nescafé Classic Instant Coffee",
        "product_category": "Hot Beverages",
        "compliance_score": 70,
        "image_url": None,
        "summary_issues": ["Unit sale price missing", "Country of Origin not declared for imported blend"],
        "violations": 2, "warnings": 0,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name","details":"'Instant Coffee Powder'","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"pass","description":"Net weight","details":"100g","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","status":"pass","description":"MRP","details":"₹240.00 (Incl. of all taxes)","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"USP","status":"violation","description":"Unit sale price not declared","details":"₹/g unit sale price not printed on packaging — mandatory under Rule 6(1)(s)","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Manufacturer","status":"pass","description":"Address","details":"Nestlé India Ltd., Moga, Punjab","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"pass","description":"Mfg date","details":"DEC/2023","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"pass","description":"Best before","details":"24 months from mfg","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"pass","description":"Helpline","details":"1800-103-0219","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"violation","description":"Country of origin absent for blended coffee","details":"Product uses imported coffee beans — origin of raw material must be declared per Rule 6(1)(m)","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Barcode","status":"pass","description":"Barcode","details":"EAN-13 valid GS1 India","legal_ref":"Rule 6A"},
            {"id":"fssai","rule":"FSSAI","status":"pass","description":"FSSAI","details":"10013022000888","legal_ref":"FSS Act 2006"},
        ],
        "label_data": {
            "generic_name": "Instant Coffee Powder",
            "net_quantity": "100g",
            "mrp": "₹240.00 (Incl. of all taxes)",
            "mfg_date": "DEC/2023",
            "manufacturer_address": "Nestlé India Ltd., Unit Moga, Punjab",
            "consumer_care_phone": "1800-103-0219",
            "country_of_origin": "India",
            "calories": 353, "total_fat": 0.5, "carbohydrates": 63.0, "protein": 17.0, "sugars": 1.8, "serving_size": "Per 100g",
        },
    },

    # ═══════════════════════════════════════════════════════════════════════════
    # GRADE C+ — Significant violations (score 55–64)
    # ═══════════════════════════════════════════════════════════════════════════

    {
        "product_name": "Local Kirana Store Besan (Gram Flour)",
        "product_category": "Packaged Food (Pulses & Flour)",
        "compliance_score": 62,
        "image_url": None,
        "summary_issues": ["No MRP declared", "Unit sale price absent", "Consumer care contact missing"],
        "violations": 2, "warnings": 2,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name","details":"'Besan / Gram Flour'","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"pass","description":"Net weight","details":"500g","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","status":"violation","description":"MRP not declared","details":"No Maximum Retail Price printed on packaging — mandatory under Rule 6(1)(c)","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"USP","status":"violation","description":"Unit sale price absent","details":"Unit sale price entirely absent — Rule 6(1)(s) violation","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Manufacturer","status":"warning","description":"Manufacturer details incomplete","details":"Only city name given — full postal address with PIN code required","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"pass","description":"Mfg date","details":"FEB/2024","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"pass","description":"Best before","details":"6 months","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"warning","description":"Consumer care contact absent","details":"No helpline number, email or address printed — Rule 6(1)(r) violation","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"pass","description":"Origin","details":"India","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Barcode","status":"pass","description":"Barcode","details":"No barcode — exempt for small manufacturers","legal_ref":"Rule 6A"},
            {"id":"fssai","rule":"FSSAI","status":"pass","description":"FSSAI","details":"14215011000123","legal_ref":"FSS Act 2006"},
        ],
        "label_data": {
            "generic_name": "Besan / Gram Flour",
            "net_quantity": "500g",
            "mfg_date": "FEB/2024",
            "manufacturer_address": "Shri Laxmi Mills, Jaipur, Rajasthan",
            "country_of_origin": "India",
            "calories": 387, "total_fat": 6.7, "carbohydrates": 58.0, "protein": 22.5, "sugars": 10.9, "serving_size": "Per 100g",
        },
    },

    {
        "product_name": "Imported Korean Instant Ramen (Shin Ramyun)",
        "product_category": "Imported Packaged Food",
        "compliance_score": 58,
        "image_url": None,
        "summary_issues": ["Indian importer address absent", "No Hindi translations", "Unit sale price missing"],
        "violations": 3, "warnings": 1,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name","details":"'Instant Noodles Hot & Spicy Flavour'","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"pass","description":"Net weight","details":"120g","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","status":"pass","description":"MRP","details":"₹120.00 (Incl. of all taxes) — stickered","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"USP","status":"violation","description":"Unit sale price missing","details":"Unit sale price per 100g not printed — Rule 6(1)(s) violation","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Importer Address","status":"violation","description":"Indian importer address absent","details":"Imported product must declare full Indian importer name + address — absent per Rule 6(1)(e) read with Rule 2(q)","legal_ref":"Rule 6(1)(e), Rule 2(q)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"pass","description":"Mfg date","details":"NOV/2023 (in Korean)","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"pass","description":"Best before","details":"12 months from mfg","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"warning","description":"Consumer care only in Korean","details":"Consumer care details not translated to English/Hindi as required for Indian market","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"pass","description":"Origin","details":"Republic of Korea","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Language","status":"violation","description":"Mandatory declarations in Korean only","details":"All key declarations must be in English or Hindi — Korean-only labels are not compliant","legal_ref":"Rule 6(1), Rule 11"},
            {"id":"fssai","rule":"FSSAI","status":"pass","description":"FSSAI sticker","details":"FSSAI stickered on import — 10001012000123","legal_ref":"FSS Act 2006"},
        ],
        "label_data": {
            "generic_name": "Instant Noodles Hot & Spicy",
            "net_quantity": "120g",
            "mrp": "₹120.00 (Incl. of all taxes)",
            "mfg_date": "NOV/2023",
            "country_of_origin": "Republic of Korea",
            "calories": 500, "total_fat": 16.0, "carbohydrates": 72.0, "protein": 11.0, "sugars": 3.0, "serving_size": "Per 100g",
        },
    },

    # ═══════════════════════════════════════════════════════════════════════════
    # GRADE C — Multiple serious violations (score 45–54)
    # ═══════════════════════════════════════════════════════════════════════════

    {
        "product_name": "Duplicate MRP Stickered Olive Oil (Dual MRP Fraud)",
        "product_category": "Packaged Edible Oil",
        "compliance_score": 50,
        "image_url": None,
        "summary_issues": ["Dual MRP detected — old sticker visible beneath new sticker", "Overwriting of original declared price", "Unit sale price incorrect"],
        "violations": 3, "warnings": 1,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name","details":"'Extra Virgin Olive Oil'","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"pass","description":"Net volume","details":"500 mL","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","status":"violation","description":"Dual MRP detected — old sticker visible","details":"Original ₹485 overwritten by sticker showing ₹650 — dual MRP is prohibited under LMPC Act Section 36","legal_ref":"Rule 6(1)(c), Section 36 LMPC Act"},
            {"id":"usp","rule":"USP","status":"violation","description":"Unit sale price not updated","details":"USP reflects original price — not consistent with stickered MRP of ₹650","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Manufacturer","status":"pass","description":"Address","details":"Imported — Borges India Pvt Ltd, Mumbai","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"pass","description":"Mfg date","details":"SEP/2023","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"pass","description":"Best before","details":"24 months from mfg","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"warning","description":"Consumer care not in standard format","details":"Only website provided — no phone or email address","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"pass","description":"Origin","details":"Spain","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Barcode","status":"pass","description":"Barcode","details":"Barcode intact","legal_ref":"Rule 6A"},
            {"id":"fssai","rule":"Importer","status":"violation","description":"FSSAI import licence number invalid","details":"Printed FSSAI licence 10012345 is only 8 digits — valid numbers are 14 digits","legal_ref":"FSS Act 2006"},
        ],
        "label_data": {
            "generic_name": "Extra Virgin Olive Oil",
            "net_quantity": "500 mL",
            "mrp": "₹650.00 (stickered over ₹485)",
            "mfg_date": "SEP/2023",
            "manufacturer_address": "Borges India Pvt Ltd, Mumbai, Maharashtra",
            "country_of_origin": "Spain",
            "calories": 884, "total_fat": 100.0, "carbohydrates": 0.0, "protein": 0.0, "sugars": 0.0, "serving_size": "Per 100 mL",
        },
    },

    {
        "product_name": "Unbranded Loose Turmeric Powder (Repacked)",
        "product_category": "Packaged Spices & Condiments",
        "compliance_score": 48,
        "image_url": None,
        "summary_issues": ["No MRP", "No manufacturer details", "No unit sale price", "No consumer care", "No FSSAI licence"],
        "violations": 4, "warnings": 1,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name","details":"'Haldi / Turmeric Powder'","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"pass","description":"Net weight","details":"200g — handwritten label","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","status":"violation","description":"MRP absent","details":"No MRP printed — selling without MRP is an offence under LMPC Act","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"USP","status":"violation","description":"Unit sale price absent","details":"No unit sale price — mandatory under Rule 6(1)(s)","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Manufacturer","status":"violation","description":"Manufacturer details missing","details":"No manufacturer name or address — Rule 6(1)(e) violation","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"warning","description":"Mfg date handwritten and unclear","details":"Mfg month/year is handwritten and partially smudged — not legible","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"pass","description":"Best before","details":"'6 months' handwritten","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"violation","description":"Consumer care absent","details":"No consumer helpline details anywhere on packaging","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"pass","description":"Origin","details":"India (implied)","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Barcode","status":"pass","description":"No barcode — non-branded repack","details":"No barcode — exempt for cottage industry repacks below threshold turnover","legal_ref":"Rule 6A"},
            {"id":"fssai","rule":"FSSAI","status":"pass","description":"No FSSAI","details":"No FSSAI licence — may be exempt under Basic Registration for small manufacturer","legal_ref":"FSS Act 2006"},
        ],
        "label_data": {
            "generic_name": "Haldi / Turmeric Powder",
            "net_quantity": "200g",
            "mfg_date": "2024",
            "country_of_origin": "India",
            "calories": 354, "total_fat": 9.9, "carbohydrates": 67.9, "protein": 7.8, "sugars": 3.2, "serving_size": "Per 100g",
        },
    },

    # ═══════════════════════════════════════════════════════════════════════════
    # GRADE D — Severe non-compliance (score 35–44)
    # ═══════════════════════════════════════════════════════════════════════════

    {
        "product_name": "Grey Market Chinese Smartphone Charger",
        "product_category": "Electronics & Electrical",
        "compliance_score": 40,
        "image_url": None,
        "summary_issues": ["No ISI/BIS mark", "No MRP on electronics pack", "Indian importer address absent", "Country of origin hidden", "No Indian warranty card"],
        "violations": 4, "warnings": 2,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name","details":"'USB-C Fast Charger 65W'","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"warning","description":"Dimensions not declared","details":"Weight/dimensions not declared for electronics — industry practice though not strictly mandatory for this category","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","status":"violation","description":"MRP absent on retail packaging","details":"No Maximum Retail Price printed — mandatory for all goods sold in India under LMPC Act","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"USP","status":"violation","description":"Unit sale price absent","details":"No unit sale price — Rule 6(1)(s) violation","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Indian Importer","status":"violation","description":"Indian importer not declared","details":"Imported electronics must show Indian importer/authorised representative name + address","legal_ref":"Rule 6(1)(e), Rule 2(q)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"pass","description":"Mfg date","details":"Manufacturing date absent — shown as DOM 2023","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"pass","description":"N/A","details":"Electronics — best before not applicable","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"warning","description":"Consumer care only international number","details":"Only Chinese support number provided — must have Indian contact","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"violation","description":"Country of origin not printed","details":"'Made in China' concealed under sticker — mandatory declaration per Rule 6(1)(m)","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"BIS Mark","status":"violation","description":"BIS/ISI mark absent","details":"USB chargers require mandatory BIS certification (IS 13252) — no BIS mark found on product or packaging","legal_ref":"BIS Act 2016, IS 13252"},
            {"id":"fssai","rule":"N/A","status":"pass","description":"FSSAI not applicable","details":"Non-food product","legal_ref":"N/A"},
        ],
        "label_data": {
            "generic_name": "USB-C Fast Charger 65W",
            "mfg_date": "2023",
            "country_of_origin": "China (concealed)",
        },
    },

    {
        "product_name": "Counterfeit Protein Supplement Powder",
        "product_category": "Health & Nutrition Supplements",
        "compliance_score": 38,
        "image_url": None,
        "summary_issues": ["No MRP", "Fabricated manufacturer address", "Inflated protein claims", "No FSSAI licence", "No batch number", "No consumer care"],
        "violations": 5, "warnings": 1,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name","details":"'Whey Protein Isolate'","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"pass","description":"Net weight","details":"1 kg","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","status":"violation","description":"MRP absent","details":"No MRP printed — LMPC violation","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"USP","status":"violation","description":"Unit sale price absent","details":"No unit sale price","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Manufacturer","status":"violation","description":"Manufacturer address likely fabricated","details":"Address '123 Protein Street, Bodybuilding Nagar' is not a valid postal address in India","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"warning","description":"Mfg year only — no month","details":"Only year '2024' printed — Rule 6(1)(g) requires month AND year","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"pass","description":"Best before","details":"'24 months' printed","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"violation","description":"Consumer care absent","details":"No contact details whatsoever","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"pass","description":"Origin","details":"India (claimed)","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Batch Number","status":"violation","description":"Batch/lot number absent","details":"No batch or lot number — Rule 6(1)(i) violation","legal_ref":"Rule 6(1)(i)"},
            {"id":"fssai","rule":"FSSAI","status":"pass","description":"FSSAI licence printed but invalid","details":"Printed number 999999999999 is not a valid FSSAI licence","legal_ref":"FSS Act 2006"},
        ],
        "label_data": {
            "generic_name": "Whey Protein Isolate",
            "net_quantity": "1 kg",
            "mfg_date": "2024",
            "manufacturer_address": "123 Protein Street, Bodybuilding Nagar, India",
            "country_of_origin": "India (claimed)",
            "calories": 380, "total_fat": 2.5, "carbohydrates": 6.0, "protein": 78.0, "sugars": 2.0, "serving_size": "Per 100g",
        },
    },

    # ═══════════════════════════════════════════════════════════════════════════
    # GRADE F — Non-compliant / Banned (score 0–34)
    # ═══════════════════════════════════════════════════════════════════════════

    {
        "product_name": "Unlabelled Loose Cashew Nuts (Bulk Repack)",
        "product_category": "Packaged Dry Fruits & Nuts",
        "compliance_score": 25,
        "image_url": None,
        "summary_issues": ["No MRP", "No manufacturer", "No unit sale price", "No consumer care", "No mfg date", "No expiry", "No FSSAI"],
        "violations": 6, "warnings": 2,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name","details":"'Cashew Nuts W240'","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"warning","description":"Net weight estimated","details":"Pack labelled '250g approx' — LMPC requires exact declared weight, not approximate","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","status":"violation","description":"MRP absent","details":"No Maximum Retail Price — product is being sold without MRP","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"USP","status":"violation","description":"Unit sale price absent","details":"No unit sale price","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Manufacturer","status":"violation","description":"Manufacturer details absent","details":"No manufacturer or packer name/address","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"violation","description":"Manufacturing date absent","details":"No mfg date — product traceability impossible","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"violation","description":"Expiry/best before absent","details":"No expiry or best before date — safety risk for consumers","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"violation","description":"Consumer care absent","details":"No helpline details","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"warning","description":"Country of origin not declared","details":"Origin not stated — assumed India but unverified","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Batch Number","status":"violation","description":"Batch/lot number absent","details":"No batch number — traceability violation","legal_ref":"Rule 6(1)(i)"},
            {"id":"fssai","rule":"FSSAI","status":"pass","description":"No FSSAI","details":"No FSSAI licence — could be operating without registration","legal_ref":"FSS Act 2006"},
        ],
        "label_data": {
            "generic_name": "Cashew Nuts W240",
            "net_quantity": "250g approx",
            "country_of_origin": "Unknown",
        },
    },

    {
        "product_name": "Spurious Ghee (Adulterated Vanaspati)",
        "product_category": "Packaged Edible Oil",
        "compliance_score": 15,
        "image_url": None,
        "summary_issues": [
            "Product is vanaspati mislabelled as pure ghee — criminal adulteration",
            "No MRP", "No manufacturer details", "No FSSAI", "No consumer care",
            "No mfg date", "No expiry", "No unit sale price", "No barcode"
        ],
        "violations": 8, "warnings": 1,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"violation","description":"Product identity fraudulent","details":"Label claims 'Pure Cow Ghee' but product is partially hydrogenated vegetable oil (Vanaspati) — criminal offence under Section 52 FSS Act and Section 36 LMPC Act","legal_ref":"FSS Act Section 52, LMPC Act Section 36"},
            {"id":"net_quantity","rule":"Net Quantity","status":"pass","description":"Net quantity","details":"1 litre","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","status":"violation","description":"MRP absent","details":"No MRP printed","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"USP","status":"violation","description":"Unit sale price absent","details":"No unit sale price","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Manufacturer","status":"violation","description":"Manufacturer details absent","details":"No manufacturer or packer details","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"violation","description":"Mfg date absent","details":"No manufacturing date","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"violation","description":"Expiry absent","details":"No expiry date — serious public health risk","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"violation","description":"Consumer care absent","details":"No helpline details","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"warning","description":"Origin not declared","details":"Country of origin not stated","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Barcode","status":"violation","description":"No barcode","details":"No barcode or batch number","legal_ref":"Rule 6A"},
            {"id":"fssai","rule":"FSSAI","status":"violation","description":"No FSSAI licence","details":"No FSSAI registration/licence — illegal to operate without","legal_ref":"FSS Act 2006"},
        ],
        "label_data": {
            "generic_name": "Pure Cow Ghee (FRAUDULENT — actually Vanaspati)",
            "net_quantity": "1 litre",
            "calories": 900, "total_fat": 100.0, "carbohydrates": 0.0, "protein": 0.0, "sugars": 0.0, "serving_size": "Per 100g",
        },
    },

    # ═══════════════════════════════════════════════════════════════════════════
    # ADDITIONAL VARIETY — Cosmetics, Pharmaceuticals, Beverages, Baby Food
    # ═══════════════════════════════════════════════════════════════════════════

    {
        "product_name": "Himalaya Neem Face Wash",
        "product_category": "Cosmetics & Personal Care",
        "compliance_score": 93,
        "image_url": None,
        "summary_issues": [],
        "violations": 0, "warnings": 1,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name","details":"'Herbal Face Wash'","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"pass","description":"Net volume","details":"100 mL","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","status":"pass","description":"MRP","details":"₹115.00 (Incl. of all taxes)","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"USP","status":"pass","description":"Unit price","details":"₹1.15/mL — verified","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Manufacturer","status":"pass","description":"Address","details":"The Himalaya Drug Company, Bengaluru, Karnataka - 560010","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"pass","description":"Mfg date","details":"FEB/2024","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"pass","description":"Best before","details":"36 months from mfg","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"warning","description":"Consumer care address not printed","details":"Only phone provided — postal address for consumer care also recommended","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"pass","description":"Origin","details":"India","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Barcode","status":"pass","description":"Barcode","details":"EAN-13 valid GS1 India","legal_ref":"Rule 6A"},
            {"id":"fssai","rule":"N/A","status":"pass","description":"FSSAI N/A for cosmetics","details":"Cosmetics are regulated under Drugs & Cosmetics Act — CDSCO license applicable, not FSSAI","legal_ref":"Drugs & Cosmetics Act 1940"},
        ],
        "label_data": {
            "generic_name": "Herbal Face Wash",
            "net_quantity": "100 mL",
            "mrp": "₹115.00 (Incl. of all taxes)",
            "unit_sale_price": "₹1.15/mL",
            "mfg_date": "FEB/2024",
            "manufacturer_address": "The Himalaya Drug Company, Makali, Bengaluru, Karnataka - 560010",
            "consumer_care_phone": "1800-180-5447",
            "country_of_origin": "India",
        },
    },

    {
        "product_name": "Nestle Cerelac Baby Cereal (Rice)",
        "product_category": "Infant & Baby Food",
        "compliance_score": 97,
        "image_url": None,
        "summary_issues": [],
        "violations": 0, "warnings": 0,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name","details":"'Infant Cereal — Rice Starter'","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"pass","description":"Net weight","details":"300g","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","status":"pass","description":"MRP","details":"₹295.00 (Incl. of all taxes)","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"USP","status":"pass","description":"Unit price","details":"₹0.983/g — verified","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Manufacturer","status":"pass","description":"Address","details":"Nestlé India Ltd., Ponda, Goa - 403401","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"pass","description":"Mfg date","details":"MAR/2024","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"pass","description":"Best before","details":"18 months from mfg","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"pass","description":"Helpline","details":"1800-103-0219 | nestleindia.com","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"pass","description":"Origin","details":"India","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Barcode","status":"pass","description":"Barcode","details":"EAN-13 valid GS1 India","legal_ref":"Rule 6A"},
            {"id":"fssai","rule":"FSSAI","status":"pass","description":"FSSAI","details":"10013022000300","legal_ref":"FSS Act 2006"},
        ],
        "label_data": {
            "generic_name": "Infant Cereal — Rice Starter",
            "net_quantity": "300g",
            "mrp": "₹295.00 (Incl. of all taxes)",
            "unit_sale_price": "₹0.983/g",
            "mfg_date": "MAR/2024",
            "manufacturer_address": "Nestlé India Ltd., Ponda, Goa - 403401",
            "consumer_care_phone": "1800-103-0219",
            "country_of_origin": "India",
            "calories": 406, "total_fat": 8.9, "carbohydrates": 71.0, "protein": 12.5, "sugars": 18.0, "serving_size": "Per 100g",
        },
    },

    {
        "product_name": "Frooti Mango Fruit Drink Tetra Pack",
        "product_category": "Packaged Beverage",
        "compliance_score": 89,
        "image_url": None,
        "summary_issues": ["'Best before' date obscured on Tetra Pak seam"],
        "violations": 0, "warnings": 1,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name","details":"'Mango Fruit Drink'","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"pass","description":"Net volume","details":"200 mL","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","status":"pass","description":"MRP","details":"₹15.00 (Incl. of all taxes)","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"USP","status":"pass","description":"Unit price","details":"₹75.00/L — verified","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Manufacturer","status":"pass","description":"Address","details":"Parle Agro Pvt Ltd, Andheri East, Mumbai - 400099","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"pass","description":"Mfg date","details":"JAN/2024","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"warning","description":"Best before date on Tetra seam — may be obscured","details":"Date printed on Tetra Pak heat-seal seam and partially unreadable after opening","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"pass","description":"Helpline","details":"1800-22-7378","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"pass","description":"Origin","details":"India","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Barcode","status":"pass","description":"Barcode","details":"EAN-13 valid GS1 India","legal_ref":"Rule 6A"},
            {"id":"fssai","rule":"FSSAI","status":"pass","description":"FSSAI","details":"10013022001010","legal_ref":"FSS Act 2006"},
        ],
        "label_data": {
            "generic_name": "Mango Fruit Drink",
            "net_quantity": "200 mL",
            "mrp": "₹15.00 (Incl. of all taxes)",
            "unit_sale_price": "₹75.00/L",
            "mfg_date": "JAN/2024",
            "manufacturer_address": "Parle Agro Pvt Ltd, Andheri East, Mumbai, Maharashtra - 400099",
            "consumer_care_phone": "1800-22-7378",
            "country_of_origin": "India",
            "calories": 52, "total_fat": 0.0, "carbohydrates": 12.9, "protein": 0.2, "sugars": 12.5, "serving_size": "Per 100 mL",
        },
    },

    {
        "product_name": "Tropicana 100% Orange Juice (No Added Sugar)",
        "product_category": "Packaged Beverage",
        "compliance_score": 91,
        "image_url": None,
        "summary_issues": [],
        "violations": 0, "warnings": 1,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name","details":"'Reconstituted Fruit Juice — Orange'","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"pass","description":"Net volume","details":"1 L","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","status":"pass","description":"MRP","details":"₹135.00 (Incl. of all taxes)","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"USP","status":"pass","description":"Unit price","details":"₹135.00/L — verified","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Manufacturer","status":"pass","description":"Address","details":"PepsiCo India Holdings, Gurugram, Haryana","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"pass","description":"Mfg date","details":"APR/2024","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"pass","description":"Best before","details":"Best before 12 months from mfg — refrigerate after opening","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"warning","description":"Consumer care only on carton base — easily missed","details":"Contact details printed on base of carton instead of primary display panel","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"pass","description":"Origin","details":"India (processed from imported concentrate)","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Barcode","status":"pass","description":"Barcode","details":"EAN-13 valid","legal_ref":"Rule 6A"},
            {"id":"fssai","rule":"FSSAI","status":"pass","description":"FSSAI","details":"10013022002010","legal_ref":"FSS Act 2006"},
        ],
        "label_data": {
            "generic_name": "Reconstituted Fruit Juice — Orange",
            "net_quantity": "1 L",
            "mrp": "₹135.00 (Incl. of all taxes)",
            "unit_sale_price": "₹135.00/L",
            "mfg_date": "APR/2024",
            "manufacturer_address": "PepsiCo India Holdings Pvt Ltd, DLF Cyber City, Gurugram, Haryana - 122002",
            "consumer_care_phone": "1800-180-0200",
            "country_of_origin": "India",
            "calories": 44, "total_fat": 0.0, "carbohydrates": 10.4, "protein": 0.7, "sugars": 8.4, "serving_size": "Per 100 mL",
        },
    },

    {
        "product_name": "Imported French Cheese (Brie de Meaux AOP)",
        "product_category": "Imported Dairy Product",
        "compliance_score": 67,
        "image_url": None,
        "summary_issues": ["Indian importer address incomplete — no PIN code", "Best before date not in DD/MM/YY format", "Hindi translation missing"],
        "violations": 1, "warnings": 2,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name","details":"'Soft Ripened Cheese'","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"pass","description":"Net weight","details":"250g","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","status":"pass","description":"MRP","details":"₹850.00 (Incl. of all taxes) — stickered","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"USP","status":"pass","description":"Unit price","details":"₹3.40/g — correct","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Importer Address","status":"violation","description":"Indian importer address incomplete","details":"Importer listed as 'Gourmet India, Mumbai' — PIN code missing, full address required under Rule 6(1)(e)","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"pass","description":"Mfg date","details":"FEB/2024 (in French on original label — English sticker added)","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"warning","description":"Date format non-standard","details":"Date on sticker is '15-APR-24' — LMPC requires DD/MM/YY or Month Name YYYY format","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"pass","description":"Helpline","details":"022-66399000 (Indian importer)","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"pass","description":"Origin","details":"France","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Language","status":"warning","description":"Hindi translations absent","details":"Original French label with English sticker — Hindi declarations required for Indian market for food products","legal_ref":"Rule 11"},
            {"id":"fssai","rule":"FSSAI","status":"pass","description":"FSSAI import sticker","details":"FSSAI No. 10012345678901 on import sticker","legal_ref":"FSS Act 2006"},
        ],
        "label_data": {
            "generic_name": "Soft Ripened Cheese (Brie)",
            "net_quantity": "250g",
            "mrp": "₹850.00 (Incl. of all taxes)",
            "unit_sale_price": "₹3.40/g",
            "mfg_date": "FEB/2024",
            "manufacturer_address": "Fromagerie de Meaux, Seine-et-Marne, France | Importer: Gourmet India, Mumbai",
            "consumer_care_phone": "022-66399000",
            "country_of_origin": "France",
            "calories": 334, "total_fat": 27.0, "carbohydrates": 1.0, "protein": 20.0, "sugars": 0.5, "serving_size": "Per 100g",
        },
    },

    {
        "product_name": "Lay's Classic Salted Chips",
        "product_category": "Packaged Snacks",
        "compliance_score": 94,
        "image_url": None,
        "summary_issues": [],
        "violations": 0, "warnings": 0,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name","details":"'Potato Chips Salted'","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"pass","description":"Net weight","details":"52g","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","status":"pass","description":"MRP","details":"₹20.00 (Incl. of all taxes)","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"USP","status":"pass","description":"Unit price","details":"₹0.384/g — verified","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Manufacturer","status":"pass","description":"Address","details":"PepsiCo India Holdings Pvt Ltd, Coimbatore, Tamil Nadu","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"pass","description":"Mfg date","details":"MAR/2024","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"pass","description":"Best before","details":"6 months from mfg","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"pass","description":"Helpline","details":"1800-180-0200","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"pass","description":"Origin","details":"India","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Barcode","status":"pass","description":"Barcode","details":"EAN-13 valid GS1 India","legal_ref":"Rule 6A"},
            {"id":"fssai","rule":"FSSAI","status":"pass","description":"FSSAI","details":"10013022000222","legal_ref":"FSS Act 2006"},
        ],
        "label_data": {
            "generic_name": "Potato Chips Salted",
            "net_quantity": "52g",
            "mrp": "₹20.00 (Incl. of all taxes)",
            "unit_sale_price": "₹0.384/g",
            "mfg_date": "MAR/2024",
            "manufacturer_address": "PepsiCo India Holdings Pvt Ltd, Thudiyalur Road, Coimbatore, Tamil Nadu - 641687",
            "consumer_care_phone": "1800-180-0200",
            "country_of_origin": "India",
            "calories": 536, "total_fat": 32.5, "carbohydrates": 55.0, "protein": 6.4, "sugars": 1.1, "serving_size": "Per 100g",
        },
    },

    {
        "product_name": "Dettol Original Antiseptic Liquid",
        "product_category": "Healthcare & Pharmaceuticals",
        "compliance_score": 85,
        "image_url": None,
        "summary_issues": ["Batch number font size below minimum"],
        "violations": 0, "warnings": 1,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name","details":"'Antiseptic Liquid'","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"pass","description":"Net volume","details":"500 mL","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","status":"pass","description":"MRP","details":"₹220.00 (Incl. of all taxes)","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"USP","status":"pass","description":"Unit price","details":"₹0.44/mL — verified","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Manufacturer","status":"pass","description":"Address","details":"Reckitt Benckiser (India) Ltd., Gurugram, Haryana - 122002","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"pass","description":"Mfg date","details":"JAN/2024","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"pass","description":"Best before","details":"36 months from mfg","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"pass","description":"Helpline","details":"1800-102-0800","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"pass","description":"Origin","details":"India","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Batch Number","status":"warning","description":"Batch number font below 1mm","details":"Batch/lot number font is 0.7mm — below the 1mm minimum for health products","legal_ref":"Rule 6(1)(i), Drugs & Cosmetics Act"},
            {"id":"fssai","rule":"N/A","status":"pass","description":"Not applicable","details":"Medical product regulated under Drugs & Cosmetics Act — CDSCO approval required","legal_ref":"Drugs & Cosmetics Act 1940"},
        ],
        "label_data": {
            "generic_name": "Antiseptic Liquid",
            "net_quantity": "500 mL",
            "mrp": "₹220.00 (Incl. of all taxes)",
            "unit_sale_price": "₹0.44/mL",
            "mfg_date": "JAN/2024",
            "manufacturer_address": "Reckitt Benckiser (India) Ltd., Plot No. 457, Udyog Vihar Phase III, Gurugram, Haryana - 122002",
            "consumer_care_phone": "1800-102-0800",
            "country_of_origin": "India",
        },
    },

    {
        "product_name": "Paper Boat Aam Panna Drink",
        "product_category": "Packaged Beverage",
        "compliance_score": 87,
        "image_url": None,
        "summary_issues": ["'No preservatives' claim not substantiated on label"],
        "violations": 0, "warnings": 1,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name","details":"'Aam Panna — Raw Mango Drink'","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"pass","description":"Net volume","details":"250 mL","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","status":"pass","description":"MRP","details":"₹30.00 (Incl. of all taxes)","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"USP","status":"pass","description":"Unit price","details":"₹120.00/L — verified","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Manufacturer","status":"pass","description":"Address","details":"Hector Beverages Pvt Ltd, Gurugram, Haryana - 122002","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"pass","description":"Mfg date","details":"FEB/2024","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"pass","description":"Best before","details":"9 months from mfg","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"pass","description":"Helpline","details":"hello@paperboat.in | 0124-4900100","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"pass","description":"Origin","details":"India","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Claims Substantiation","status":"warning","description":"'No preservatives' claim unsubstantiated","details":"Front-of-pack claim 'No preservatives' must be substantiated — Rule 26 FSSR 2011 requires basis for such claims","legal_ref":"FSSR Rule 26"},
            {"id":"fssai","rule":"FSSAI","status":"pass","description":"FSSAI","details":"10013022001500","legal_ref":"FSS Act 2006"},
        ],
        "label_data": {
            "generic_name": "Aam Panna — Raw Mango Drink",
            "net_quantity": "250 mL",
            "mrp": "₹30.00 (Incl. of all taxes)",
            "unit_sale_price": "₹120.00/L",
            "mfg_date": "FEB/2024",
            "manufacturer_address": "Hector Beverages Pvt Ltd, Plot No. 47, Sector 32, Gurugram, Haryana - 122002",
            "consumer_care_phone": "0124-4900100",
            "consumer_care_email": "hello@paperboat.in",
            "country_of_origin": "India",
            "calories": 49, "total_fat": 0.0, "carbohydrates": 12.2, "protein": 0.1, "sugars": 11.8, "serving_size": "Per 100 mL",
        },
    },

    {
        "product_name": "Imported Lindt Excellence 70% Dark Chocolate",
        "product_category": "Imported Confectionery",
        "compliance_score": 73,
        "image_url": None,
        "summary_issues": ["Indian importer address lacks PIN code", "Unit sale price not updated to reflect stickered MRP"],
        "violations": 1, "warnings": 2,
        "checklist": [
            {"id":"generic_name","rule":"Generic Name","status":"pass","description":"Generic name","details":"'Dark Chocolate 70% Cocoa'","legal_ref":"Rule 6(1)(a)"},
            {"id":"net_quantity","rule":"Net Quantity","status":"pass","description":"Net weight","details":"100g","legal_ref":"Rule 6(1)(b)"},
            {"id":"mrp","rule":"MRP","status":"pass","description":"MRP","details":"₹450.00 (Incl. of all taxes) — stickered","legal_ref":"Rule 6(1)(c)"},
            {"id":"usp","rule":"USP","status":"violation","description":"Unit sale price on original label inconsistent with stickered MRP","details":"Original Swiss label USP not applicable for Indian pricing — stickered MRP added but USP per 100g not printed","legal_ref":"Rule 6(1)(s)"},
            {"id":"manufacturer","rule":"Importer","status":"warning","description":"Indian importer address incomplete","details":"'Mondelez India Foods, Mumbai' — no full postal address or PIN code","legal_ref":"Rule 6(1)(e)"},
            {"id":"mfg_date","rule":"Mfg Date","status":"pass","description":"Mfg date","details":"JAN/2024 (stickered in English over German original)","legal_ref":"Rule 6(1)(g)"},
            {"id":"best_before","rule":"Best Before","status":"pass","description":"Best before","details":"12 months from mfg","legal_ref":"Rule 6(1)(h)"},
            {"id":"consumer_care","rule":"Consumer Care","status":"warning","description":"Consumer care is international Swiss number","details":"Swiss number +41-21-924-2811 — Indian toll-free number required","legal_ref":"Rule 6(1)(r)"},
            {"id":"country_of_origin","rule":"Country of Origin","status":"pass","description":"Origin","details":"Switzerland","legal_ref":"Rule 6(1)(m)"},
            {"id":"barcode","rule":"Barcode","status":"pass","description":"Barcode","details":"EAN-13 valid European prefix","legal_ref":"Rule 6A"},
            {"id":"fssai","rule":"FSSAI","status":"pass","description":"FSSAI import sticker","details":"FSSAI import sticker 10012012345678","legal_ref":"FSS Act 2006"},
        ],
        "label_data": {
            "generic_name": "Dark Chocolate 70% Cocoa",
            "net_quantity": "100g",
            "mrp": "₹450.00 (Incl. of all taxes)",
            "mfg_date": "JAN/2024",
            "manufacturer_address": "Lindt & Sprüngli AG, Kilchberg, Switzerland | Importer: Mondelez India Foods, Mumbai",
            "country_of_origin": "Switzerland",
            "calories": 598, "total_fat": 43.0, "carbohydrates": 45.0, "protein": 8.0, "sugars": 27.0, "serving_size": "Per 100g",
        },
    },
]


# ── Build and insert records ──────────────────────────────────────────────────

def build_report(p: dict) -> dict:
    score = p["compliance_score"]
    violations = p.get("violations", 0)
    warnings = p.get("warnings", 0)
    checklist = make_checklist(p.get("checklist", []))

    return {
        "audit_id": f"seed-{uuid.uuid4().hex[:12]}",
        "product_name": p["product_name"],
        "product_category": p["product_category"],
        "compliance_score": score,
        "grade": grade_from_score(score),
        "legal_status": legal_status_from_score(score),
        "status_text": status_text_from_score(score),
        "checklist": checklist,
        "label_data": p.get("label_data", {}),
        "summary": make_summary(score, violations, warnings, p.get("summary_issues", [])),
        "is_demo": True,
        "is_seeded": True,
        "gemini_vision_used": False,
        "vision_provider": "Database Seed",
        "llm_enhanced": False,
        "panel_count": 1,
        "rag_citations": [],
    }


def main():
    print(f"🌱 PackSure AI — Specimen Seeder")
    print(f"   Supabase enabled: {is_supabase_enabled()}")
    print(f"   Products to seed: {len(PRODUCTS)}")
    print()

    for i, product in enumerate(PRODUCTS, 1):
        score = product["compliance_score"]
        grade = grade_from_score(score)
        report = build_report(product)
        audit_id = report["audit_id"]

        specimen_entry = {
            "id": audit_id,
            "audit_id": audit_id,
            "product_name": product["product_name"],
            "product_category": product["product_category"],
            "compliance_score": score,
            "grade": grade,
            "legal_status": report["legal_status"],
            "status_text": report["status_text"],
            "created_at": rand_date_past(days_min=1, days_max=365),
            "image_url": product.get("image_url"),
            "additional_image_urls": [],
            "panel_count": 1,
            "summary": report["summary"],
            "report": report,
        }

        insert_specimen_to_db(specimen_entry)
        print(f"  [{i:2d}/{len(PRODUCTS)}] {grade:3s} ({score:3d}) — {product['product_name']}")

    print()
    print(f"✅ Done! {len(PRODUCTS)} specimens seeded.")
    print("   Open the Specimens tab in PackSure AI to verify.")


if __name__ == "__main__":
    main()
