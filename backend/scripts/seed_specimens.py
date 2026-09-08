#!/usr/bin/env python3
"""
PackSure AI — Specimen Database Seeder v2
==========================================
Populates Supabase with 31 diverse realistic Indian packaged product specimens
across all compliance grades (A+ → F) and product categories.

Checklist format exactly matches big8_checker.py output so FullPageReport renders correctly.

Run from project root:
    set -a && source .env && set +a
    PYTHONPATH=backend python backend/scripts/seed_specimens.py
"""

import sys, os, json, uuid, random
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.api.storage import insert_specimen_to_db, is_supabase_enabled

# ── Helpers ───────────────────────────────────────────────────────────────────

def grade_from_score(score):
    if score >= 95: return "A+"
    if score >= 85: return "A"
    if score >= 75: return "B+"
    if score >= 65: return "B"
    if score >= 55: return "C+"
    if score >= 45: return "C"
    if score >= 35: return "D"
    return "F"

def legal_status_from_score(score):
    if score >= 90: return "FULLY COMPLIANT"
    if score >= 70: return "MINOR WARNINGS"
    if score >= 50: return "VIOLATIONS DETECTED"
    return "NON-COMPLIANT"

def status_text_from_score(score):
    if score >= 90: return "✅ All mandatory declarations verified. Label meets LMPC Rules 2011."
    if score >= 70: return "⚠️ Minor labelling gaps found. Corrective action recommended."
    if score >= 50: return "❌ Compliance violations detected. Regulatory action possible."
    return "🚫 Severe non-compliance. Product may be barred from sale under Section 36 LMPC Act."

def rand_date_past(days_min=1, days_max=365):
    delta = timedelta(days=random.randint(days_min, days_max))
    return (datetime.now(timezone.utc) - delta).isoformat()

# Build a checklist item in the exact big8_checker.py format
def ci(mandate_id, name, rule, status, extracted_text, reason, severity="LOW", citation_key=None, gazette_citation=None):
    item = {
        "mandate_id": mandate_id,
        "name": name,
        "rule": rule,
        "status": status,           # "COMPLIANT" | "WARNING" | "VIOLATION"
        "extracted_text": extracted_text,
        "reason": reason,
        "severity": severity,
        "citation_key": citation_key or f"rule_{mandate_id}",
    }
    if gazette_citation:
        item["gazette_citation"] = gazette_citation
    return item

def gc(rule, gazette_ref, verbatim_clause, penalty_rule="Rule 32 (Fine up to ₹25,000)"):
    """Build a gazette_citation object."""
    return {
        "rule": rule,
        "gazette_ref": gazette_ref,
        "verbatim_clause": verbatim_clause,
        "officer_guidance": f"Verify {rule} compliance during inspection.",
        "penalty_rule": penalty_rule,
    }

# Standard gazette citations for common rules
GC = {
    "generic_name":       gc("Rule 6(1)(a)", "G.S.R. 778(E)", "Every package shall bear…the generic or common name of the commodity."),
    "net_quantity":       gc("Rule 6(1)(b)", "G.S.R. 779(E)", "The net quantity in terms of standard unit of weights and measures shall be declared."),
    "mrp":                gc("Rule 6(1)(c)", "G.S.R. 780(E)", "Maximum retail price at which the commodity may be sold to the ultimate consumer."),
    "usp":                gc("Rule 6(1)(s)", "G.S.R. 524(E) – Notif. 2018", "Unit sale price of the commodity expressed per gram, per mL, or per unit as applicable.", "Rule 32 (Fine up to ₹50,000 for USP violation)"),
    "mfg_date":           gc("Rule 6(1)(g)", "G.S.R. 782(E)", "Month and year of manufacture, packing or import shall be declared on every package."),
    "consumer_care":      gc("Rule 6(1)(r)", "G.S.R. 524(E)", "Name, address, phone number and e-mail address of consumer care shall be declared."),
    "country_of_origin":  gc("Rule 6(1)(m)", "G.S.R. 784(E)", "Country of origin shall be declared on every imported package."),
    "best_before":        gc("Rule 6(1)(h)", "G.S.R. 783(E)", "Best before or expiry date shall be declared on packages of perishable and semi-perishable commodities."),
    "language":           gc("Rule 11", "G.S.R. 786(E)", "All declarations shall be in English or Hindi in Devanagari script.", "Rule 32 (Fine up to ₹10,000 for language violations)"),
    "dual_mrp":           gc("Rule 18(2A)", "G.S.R. 800(E)", "No manufacturer shall declare two different MRP on the same package.", "Rule 32 (Fine up to ₹1,00,000 for dual MRP fraud)"),
    "mfg_address":        gc("Rule 6(1)(a)", "G.S.R. 778(E)", "Name and complete postal address of the manufacturer/packer/importer shall be declared."),
}

def usp_ok(printed, calculated, formula="MRP / Net Qty"):
    return {
        "status": "COMPLIANT", "is_valid": True,
        "reason": "Unit sale price matches the calculated value.",
        "statutory_rule": "Rule 6(1)(s) — G.S.R. 524(E)",
        "printed": printed,
        "calculated": {
            "expected_usp_value": 0,
            "expected_usp_unit": "per g",
            "expected_display": calculated,
            "formula": formula,
        },
    }

def usp_violation(printed, calculated, reason):
    return {
        "status": "VIOLATION", "is_valid": False,
        "reason": reason,
        "statutory_rule": "Rule 6(1)(s) — G.S.R. 524(E)",
        "violation_code": "USP-MISSING-OR-WRONG",
        "printed": printed,
        "calculated": {
            "expected_usp_value": 0,
            "expected_usp_unit": "per g",
            "expected_display": calculated,
            "formula": "MRP / Net Qty",
        },
    }

def usp_na():
    return {
        "status": "COMPLIANT", "is_valid": True,
        "reason": "Non-food / exempt category — USP verification not applicable.",
        "statutory_rule": "Rule 6(1)(s) — G.S.R. 524(E)",
        "printed": "N/A",
    }

# ── FULL PRODUCT DEFINITIONS ──────────────────────────────────────────────────

PRODUCTS = [

    # ══════════════ GRADE A+ ══════════════════════════════════════════════════
    {
        "product_name": "Parle-G Original Glucose Biscuits",
        "product_category": "Packaged Food",
        "compliance_score": 100,
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Parle-G.jpg/640px-Parle-G.jpg",
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
            "packaging_symbols": {"veg_non_veg": "VEG", "fssai_license": {"detected": True, "license_number": "10013022000252", "is_valid_format": True}},
        },
        "checklist": [
            ci("generic_name", "Generic or Common Name", "Rule 6(1)(a)", "COMPLIANT", "Glucose Biscuits", "Generic name clearly declared in English.", "LOW", "rule_6_1_a", GC["generic_name"]),
            ci("net_quantity", "Net Quantity", "Rule 6(1)(b)", "COMPLIANT", "400 g", "Net weight 400g declared in ≥4mm font as required.", "LOW", "rule_6_1_b", GC["net_quantity"]),
            ci("mrp", "MRP Details", "Rule 6(1)(c)", "COMPLIANT", "₹30.00 (Incl. of all taxes)", "MRP including all taxes declared prominently.", "LOW", "rule_6_1_c", GC["mrp"]),
            ci("usp", "Unit Sale Price (USP)", "Rule 6(1)(s)", "COMPLIANT", "₹0.075/g", "USP matches MRP/net qty: ₹30 / 400g = ₹0.075/g.", "LOW", "rule_6_1_s", GC["usp"]),
            ci("mfg_address", "Manufacturer Address", "Rule 6(1)(a)", "COMPLIANT", "Parle Products Pvt Ltd, Vile Parle (W), Mumbai, Maharashtra - 400057", "Full postal address with 6-digit PIN code declared.", "LOW", "rule_6_1_a", GC["mfg_address"]),
            ci("mfg_date", "MFG / Packing Date", "Rule 6(1)(g)", "COMPLIANT", "JAN/2024", "Month and year of manufacture clearly stated.", "LOW", "rule_6_1_g", GC["mfg_date"]),
            ci("best_before", "Best Before / Expiry Date", "Rule 6(1)(h)", "COMPLIANT", "Best before 9 months from manufacture", "Best before date clearly stated in standard format.", "LOW", "rule_6_1_h", GC["best_before"]),
            ci("consumer_care", "Consumer Care Details", "Rule 6(1)(r)", "COMPLIANT", "+91-1800-103-4141 | care@parle.com", "Phone and email for consumer care declared.", "LOW", "rule_6_1_r", GC["consumer_care"]),
            ci("country_of_origin", "Country of Origin", "Rule 6(1)(m)", "COMPLIANT", "India", "Country of origin declared.", "LOW", "rule_6_1_m", GC["country_of_origin"]),
            ci("language", "Language Compliance", "Rule 11", "COMPLIANT", "English + Hindi", "All declarations in English; Hindi version present.", "LOW", "rule_11", GC["language"]),
            ci("dual_mrp", "Dual MRP Verification", "Rule 18(2A)", "COMPLIANT", "Single MRP: ₹30.00", "No dual MRP detected.", "LOW", "rule_18_2a", GC["dual_mrp"]),
        ],
        "usp_verification": usp_ok("₹0.075/g", "₹0.075/g"),
    },

    {
        "product_name": "Amul Butter (Pasteurised)",
        "product_category": "Dairy Product",
        "compliance_score": 98,
        "image_url": None,
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
            "packaging_symbols": {"veg_non_veg": "VEG", "fssai_license": {"detected": True, "license_number": "10013022000012", "is_valid_format": True}},
        },
        "checklist": [
            ci("generic_name", "Generic or Common Name", "Rule 6(1)(a)", "COMPLIANT", "Pasteurised Butter", "Declared in English and Hindi.", "LOW", "rule_6_1_a", GC["generic_name"]),
            ci("net_quantity", "Net Quantity", "Rule 6(1)(b)", "COMPLIANT", "100 g", "Net weight correctly declared.", "LOW", "rule_6_1_b", GC["net_quantity"]),
            ci("mrp", "MRP Details", "Rule 6(1)(c)", "COMPLIANT", "₹57.00 (MRP Incl. of all taxes)", "MRP declared prominently.", "LOW", "rule_6_1_c", GC["mrp"]),
            ci("usp", "Unit Sale Price (USP)", "Rule 6(1)(s)", "COMPLIANT", "₹0.57/g", "USP verified: ₹57/100g.", "LOW", "rule_6_1_s", GC["usp"]),
            ci("mfg_address", "Manufacturer Address", "Rule 6(1)(a)", "COMPLIANT", "GCMMF Ltd, Anand, Gujarat - 388001", "Full address with PIN code.", "LOW", "rule_6_1_a", GC["mfg_address"]),
            ci("mfg_date", "MFG / Packing Date", "Rule 6(1)(g)", "COMPLIANT", "FEB/2024", "Month and year declared.", "LOW", "rule_6_1_g", GC["mfg_date"]),
            ci("best_before", "Best Before / Expiry Date", "Rule 6(1)(h)", "COMPLIANT", "Best before 26 weeks from manufacture", "Expiry clearly stated.", "LOW", "rule_6_1_h", GC["best_before"]),
            ci("consumer_care", "Consumer Care Details", "Rule 6(1)(r)", "COMPLIANT", "1800-258-3333", "Helpline declared.", "LOW", "rule_6_1_r", GC["consumer_care"]),
            ci("country_of_origin", "Country of Origin", "Rule 6(1)(m)", "COMPLIANT", "India", "Origin declared.", "LOW", "rule_6_1_m", GC["country_of_origin"]),
            ci("language", "Language Compliance", "Rule 11", "COMPLIANT", "English + Hindi Devanagari", "Bilingual declarations present.", "LOW", "rule_11", GC["language"]),
            ci("dual_mrp", "Dual MRP Verification", "Rule 18(2A)", "COMPLIANT", "Single MRP: ₹57.00", "No dual MRP found.", "LOW", "rule_18_2a", GC["dual_mrp"]),
        ],
        "usp_verification": usp_ok("₹0.57/g", "₹0.57/g"),
    },

    {
        "product_name": "Tata Rock Salt (Sendha Namak)",
        "product_category": "Packaged Spices & Condiments",
        "compliance_score": 97,
        "image_url": None,
        "label_data": {
            "generic_name": "Rock Salt / Sendha Namak",
            "net_quantity": "1 kg",
            "mrp": "₹65.00 (Incl. of all taxes)",
            "unit_sale_price": "₹65.00/kg",
            "mfg_date": "DEC/2023",
            "manufacturer_address": "Tata Consumer Products Ltd., Backbay Reclamation, Mumbai - 400001",
            "consumer_care_phone": "1800-209-8282",
            "country_of_origin": "India",
            "packaging_symbols": {"veg_non_veg": "VEG", "fssai_license": {"detected": True, "license_number": "10013022001122", "is_valid_format": True}},
        },
        "checklist": [
            ci("generic_name", "Generic or Common Name", "Rule 6(1)(a)", "COMPLIANT", "Rock Salt / Sendha Namak", "Both English and Hindi name declared.", "LOW", "rule_6_1_a", GC["generic_name"]),
            ci("net_quantity", "Net Quantity", "Rule 6(1)(b)", "COMPLIANT", "1 kg", "Net weight in standard SI units.", "LOW", "rule_6_1_b", GC["net_quantity"]),
            ci("mrp", "MRP Details", "Rule 6(1)(c)", "COMPLIANT", "₹65.00 (Incl. of all taxes)", "MRP with tax inclusion stated.", "LOW", "rule_6_1_c", GC["mrp"]),
            ci("usp", "Unit Sale Price (USP)", "Rule 6(1)(s)", "COMPLIANT", "₹65.00/kg", "USP per kg verified.", "LOW", "rule_6_1_s", GC["usp"]),
            ci("mfg_address", "Manufacturer Address", "Rule 6(1)(a)", "COMPLIANT", "Tata Consumer Products Ltd., Backbay Reclamation, Mumbai - 400001", "Address with PIN.", "LOW", "rule_6_1_a", GC["mfg_address"]),
            ci("mfg_date", "MFG / Packing Date", "Rule 6(1)(g)", "COMPLIANT", "DEC/2023", "Month and year stated.", "LOW", "rule_6_1_g", GC["mfg_date"]),
            ci("best_before", "Best Before / Expiry Date", "Rule 6(1)(h)", "COMPLIANT", "Best before 24 months from mfg", "Shelf life declared.", "LOW", "rule_6_1_h", GC["best_before"]),
            ci("consumer_care", "Consumer Care Details", "Rule 6(1)(r)", "COMPLIANT", "1800-209-8282", "Toll-free helpline declared.", "LOW", "rule_6_1_r", GC["consumer_care"]),
            ci("country_of_origin", "Country of Origin", "Rule 6(1)(m)", "COMPLIANT", "India", "Origin declared.", "LOW", "rule_6_1_m", GC["country_of_origin"]),
            ci("language", "Language Compliance", "Rule 11", "COMPLIANT", "English + Hindi", "Bilingual pack.", "LOW", "rule_11", GC["language"]),
            ci("dual_mrp", "Dual MRP Verification", "Rule 18(2A)", "COMPLIANT", "Single MRP ₹65.00", "No dual MRP.", "LOW", "rule_18_2a", GC["dual_mrp"]),
        ],
        "usp_verification": usp_ok("₹65.00/kg", "₹65.00/kg"),
    },

    {
        "product_name": "Dabur Honey (Pure & Natural)",
        "product_category": "Packaged Food",
        "compliance_score": 96,
        "image_url": None,
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
            "packaging_symbols": {"veg_non_veg": "VEG", "fssai_license": {"detected": True, "license_number": "10013022001233", "is_valid_format": True}},
        },
        "checklist": [
            ci("generic_name", "Generic or Common Name", "Rule 6(1)(a)", "COMPLIANT", "Natural Honey", "Generic name displayed.", "LOW", "rule_6_1_a", GC["generic_name"]),
            ci("net_quantity", "Net Quantity", "Rule 6(1)(b)", "COMPLIANT", "500 g", "Net weight in SI units.", "LOW", "rule_6_1_b", GC["net_quantity"]),
            ci("mrp", "MRP Details", "Rule 6(1)(c)", "COMPLIANT", "₹230.00 (Incl. of all taxes)", "MRP declared.", "LOW", "rule_6_1_c", GC["mrp"]),
            ci("usp", "Unit Sale Price (USP)", "Rule 6(1)(s)", "COMPLIANT", "₹0.46/g", "USP verified.", "LOW", "rule_6_1_s", GC["usp"]),
            ci("mfg_address", "Manufacturer Address", "Rule 6(1)(a)", "COMPLIANT", "Dabur India Ltd., Sahibabad Industrial Area, Ghaziabad, UP - 201010", "Full address with PIN.", "LOW", "rule_6_1_a", GC["mfg_address"]),
            ci("mfg_date", "MFG / Packing Date", "Rule 6(1)(g)", "COMPLIANT", "MAR/2024", "Month/year declared.", "LOW", "rule_6_1_g", GC["mfg_date"]),
            ci("best_before", "Best Before / Expiry Date", "Rule 6(1)(h)", "COMPLIANT", "Best before 18 months", "Shelf life declared.", "LOW", "rule_6_1_h", GC["best_before"]),
            ci("consumer_care", "Consumer Care Details", "Rule 6(1)(r)", "COMPLIANT", "1800-103-1644", "Helpline declared.", "LOW", "rule_6_1_r", GC["consumer_care"]),
            ci("country_of_origin", "Country of Origin", "Rule 6(1)(m)", "COMPLIANT", "India", "Origin declared.", "LOW", "rule_6_1_m", GC["country_of_origin"]),
            ci("language", "Language Compliance", "Rule 11", "COMPLIANT", "English + Hindi", "Bilingual.", "LOW", "rule_11", GC["language"]),
            ci("dual_mrp", "Dual MRP Verification", "Rule 18(2A)", "COMPLIANT", "Single MRP ₹230.00", "No dual MRP.", "LOW", "rule_18_2a", GC["dual_mrp"]),
        ],
        "usp_verification": usp_ok("₹0.46/g", "₹0.46/g"),
    },

    {
        "product_name": "Haldiram's Aloo Bhujia",
        "product_category": "Packaged Snacks",
        "compliance_score": 95,
        "image_url": None,
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
            "packaging_symbols": {"veg_non_veg": "VEG", "fssai_license": {"detected": True, "license_number": "10013022000500", "is_valid_format": True}},
        },
        "checklist": [
            ci("generic_name", "Generic or Common Name", "Rule 6(1)(a)", "COMPLIANT", "Namkeen Snack — Aloo Bhujia", "Generic name declared.", "LOW", "rule_6_1_a", GC["generic_name"]),
            ci("net_quantity", "Net Quantity", "Rule 6(1)(b)", "COMPLIANT", "200 g", "Net weight correct.", "LOW", "rule_6_1_b", GC["net_quantity"]),
            ci("mrp", "MRP Details", "Rule 6(1)(c)", "COMPLIANT", "₹90.00 (Incl. of all taxes)", "MRP declared.", "LOW", "rule_6_1_c", GC["mrp"]),
            ci("usp", "Unit Sale Price (USP)", "Rule 6(1)(s)", "COMPLIANT", "₹0.45/g", "USP correct.", "LOW", "rule_6_1_s", GC["usp"]),
            ci("mfg_address", "Manufacturer Address", "Rule 6(1)(a)", "COMPLIANT", "Haldiram Foods International Pvt Ltd., Kamptee Road, Nagpur, Maharashtra - 440026", "Full address.", "LOW", "rule_6_1_a", GC["mfg_address"]),
            ci("mfg_date", "MFG / Packing Date", "Rule 6(1)(g)", "COMPLIANT", "APR/2024", "Date declared.", "LOW", "rule_6_1_g", GC["mfg_date"]),
            ci("best_before", "Best Before / Expiry Date", "Rule 6(1)(h)", "COMPLIANT", "6 months from mfg", "Declared.", "LOW", "rule_6_1_h", GC["best_before"]),
            ci("consumer_care", "Consumer Care Details", "Rule 6(1)(r)", "COMPLIANT", "1800-200-0706", "Helpline present.", "LOW", "rule_6_1_r", GC["consumer_care"]),
            ci("country_of_origin", "Country of Origin", "Rule 6(1)(m)", "COMPLIANT", "India", "Declared.", "LOW", "rule_6_1_m", GC["country_of_origin"]),
            ci("language", "Language Compliance", "Rule 11", "COMPLIANT", "English + Hindi", "Bilingual.", "LOW", "rule_11", GC["language"]),
            ci("dual_mrp", "Dual MRP Verification", "Rule 18(2A)", "COMPLIANT", "Single MRP ₹90.00", "No dual MRP.", "LOW", "rule_18_2a", GC["dual_mrp"]),
        ],
        "usp_verification": usp_ok("₹0.45/g", "₹0.45/g"),
    },

    # ══════════════ GRADE A ═══════════════════════════════════════════════════
    {
        "product_name": "Nestlé MUNCH Chocolate Bar",
        "product_category": "Confectionery",
        "compliance_score": 92,
        "image_url": None,
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
            "packaging_symbols": {"veg_non_veg": "VEG", "fssai_license": {"detected": True, "license_number": "10013022000999", "is_valid_format": True}},
        },
        "checklist": [
            ci("generic_name", "Generic or Common Name", "Rule 6(1)(a)", "COMPLIANT", "Wafer Chocolate Bar", "Generic name declared.", "LOW", "rule_6_1_a", GC["generic_name"]),
            ci("net_quantity", "Net Quantity", "Rule 6(1)(b)", "COMPLIANT", "50 g", "Net weight declared.", "LOW", "rule_6_1_b", GC["net_quantity"]),
            ci("mrp", "MRP Details", "Rule 6(1)(c)", "COMPLIANT", "₹20.00 (Incl. of all taxes)", "MRP declared.", "LOW", "rule_6_1_c", GC["mrp"]),
            ci("usp", "Unit Sale Price (USP)", "Rule 6(1)(s)", "COMPLIANT", "₹0.40/g", "USP verified.", "LOW", "rule_6_1_s", GC["usp"]),
            ci("mfg_address", "Manufacturer Address", "Rule 6(1)(a)", "WARNING", "Nestlé India Ltd., Unit Moga, Punjab", "Manufacturer address present but PIN code missing from Moga, Punjab address.", "MEDIUM", "rule_6_1_a", GC["mfg_address"]),
            ci("mfg_date", "MFG / Packing Date", "Rule 6(1)(g)", "COMPLIANT", "FEB/2024", "Month/year declared.", "LOW", "rule_6_1_g", GC["mfg_date"]),
            ci("best_before", "Best Before / Expiry Date", "Rule 6(1)(h)", "COMPLIANT", "12 months from mfg", "Declared.", "LOW", "rule_6_1_h", GC["best_before"]),
            ci("consumer_care", "Consumer Care Details", "Rule 6(1)(r)", "WARNING", "1800-103-0219 (email partially illegible)", "Consumer email address print quality is low — may be unreadable on some packs.", "MEDIUM", "rule_6_1_r", GC["consumer_care"]),
            ci("country_of_origin", "Country of Origin", "Rule 6(1)(m)", "COMPLIANT", "India", "Declared.", "LOW", "rule_6_1_m", GC["country_of_origin"]),
            ci("language", "Language Compliance", "Rule 11", "COMPLIANT", "English + Hindi", "Bilingual.", "LOW", "rule_11", GC["language"]),
            ci("dual_mrp", "Dual MRP Verification", "Rule 18(2A)", "COMPLIANT", "Single MRP ₹20.00", "No dual MRP.", "LOW", "rule_18_2a", GC["dual_mrp"]),
        ],
        "usp_verification": usp_ok("₹0.40/g", "₹0.40/g"),
    },

    {
        "product_name": "MDH Deggi Mirch Powder",
        "product_category": "Packaged Spices & Condiments",
        "compliance_score": 90,
        "image_url": None,
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
            "packaging_symbols": {"veg_non_veg": "VEG", "fssai_license": {"detected": True, "license_number": "10013022000400", "is_valid_format": True}},
        },
        "checklist": [
            ci("generic_name", "Generic or Common Name", "Rule 6(1)(a)", "COMPLIANT", "Deggi Mirch (Ground Red Pepper Blend)", "Name declared.", "LOW", "rule_6_1_a", GC["generic_name"]),
            ci("net_quantity", "Net Quantity", "Rule 6(1)(b)", "WARNING", "100 g (font 3.5mm)", "Net qty '100g' printed in 3.5mm font — minimum required is 4mm per Schedule II.", "MEDIUM", "rule_6_1_b", GC["net_quantity"]),
            ci("mrp", "MRP Details", "Rule 6(1)(c)", "COMPLIANT", "₹68.00 (Incl. of all taxes)", "MRP declared.", "LOW", "rule_6_1_c", GC["mrp"]),
            ci("usp", "Unit Sale Price (USP)", "Rule 6(1)(s)", "COMPLIANT", "₹0.68/g", "USP correct.", "LOW", "rule_6_1_s", GC["usp"]),
            ci("mfg_address", "Manufacturer Address", "Rule 6(1)(a)", "COMPLIANT", "Mahashian Di Hatti (Pvt) Ltd., 4650, Kedarnath Road, Delhi - 110006", "Full address with PIN.", "LOW", "rule_6_1_a", GC["mfg_address"]),
            ci("mfg_date", "MFG / Packing Date", "Rule 6(1)(g)", "COMPLIANT", "JAN/2024", "Declared.", "LOW", "rule_6_1_g", GC["mfg_date"]),
            ci("best_before", "Best Before / Expiry Date", "Rule 6(1)(h)", "COMPLIANT", "Best before 18 months from mfg", "Declared.", "LOW", "rule_6_1_h", GC["best_before"]),
            ci("consumer_care", "Consumer Care Details", "Rule 6(1)(r)", "COMPLIANT", "011-27131700", "Helpline present.", "LOW", "rule_6_1_r", GC["consumer_care"]),
            ci("country_of_origin", "Country of Origin", "Rule 6(1)(m)", "COMPLIANT", "India", "Declared.", "LOW", "rule_6_1_m", GC["country_of_origin"]),
            ci("language", "Language Compliance", "Rule 11", "COMPLIANT", "English + Hindi", "Bilingual.", "LOW", "rule_11", GC["language"]),
            ci("dual_mrp", "Dual MRP Verification", "Rule 18(2A)", "COMPLIANT", "Single MRP ₹68.00", "No dual MRP.", "LOW", "rule_18_2a", GC["dual_mrp"]),
        ],
        "usp_verification": usp_ok("₹0.68/g", "₹0.68/g"),
    },

    {
        "product_name": "Britannia NutriChoice 5 Grain Biscuits",
        "product_category": "Packaged Food",
        "compliance_score": 88,
        "image_url": None,
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
            "packaging_symbols": {"veg_non_veg": "VEG", "fssai_license": {"detected": True, "license_number": "10013022000199", "is_valid_format": True}},
        },
        "checklist": [
            ci("generic_name", "Generic or Common Name", "Rule 6(1)(a)", "COMPLIANT", "Multi Grain Digestive Biscuits", "Declared.", "LOW", "rule_6_1_a", GC["generic_name"]),
            ci("net_quantity", "Net Quantity", "Rule 6(1)(b)", "COMPLIANT", "350 g", "Declared.", "LOW", "rule_6_1_b", GC["net_quantity"]),
            ci("mrp", "MRP Details", "Rule 6(1)(c)", "COMPLIANT", "₹70.00 (Incl. of all taxes)", "Declared.", "LOW", "rule_6_1_c", GC["mrp"]),
            ci("usp", "Unit Sale Price (USP)", "Rule 6(1)(s)", "COMPLIANT", "₹0.20/g", "Verified.", "LOW", "rule_6_1_s", GC["usp"]),
            ci("mfg_address", "Manufacturer Address", "Rule 6(1)(a)", "COMPLIANT", "Britannia Industries Ltd., 5/1A, Hungerford Street, Kolkata - 700017", "Full address.", "LOW", "rule_6_1_a", GC["mfg_address"]),
            ci("mfg_date", "MFG / Packing Date", "Rule 6(1)(g)", "COMPLIANT", "MAR/2024", "Declared.", "LOW", "rule_6_1_g", GC["mfg_date"]),
            ci("best_before", "Best Before / Expiry Date", "Rule 6(1)(h)", "COMPLIANT", "9 months from mfg", "Declared.", "LOW", "rule_6_1_h", GC["best_before"]),
            ci("consumer_care", "Consumer Care Details", "Rule 6(1)(r)", "WARNING", "1800-103-1414 | consumer.care@britindia.com", "Phone and email present but consumer care postal address not printed — Rule 6(1)(r) recommends physical address.", "MEDIUM", "rule_6_1_r", GC["consumer_care"]),
            ci("country_of_origin", "Country of Origin", "Rule 6(1)(m)", "COMPLIANT", "India", "Declared.", "LOW", "rule_6_1_m", GC["country_of_origin"]),
            ci("language", "Language Compliance", "Rule 11", "COMPLIANT", "English + Hindi", "Bilingual.", "LOW", "rule_11", GC["language"]),
            ci("dual_mrp", "Dual MRP Verification", "Rule 18(2A)", "COMPLIANT", "Single MRP ₹70.00", "No dual MRP.", "LOW", "rule_18_2a", GC["dual_mrp"]),
        ],
        "usp_verification": usp_ok("₹0.20/g", "₹0.20/g"),
    },

    {
        "product_name": "Himalaya Neem Face Wash",
        "product_category": "Cosmetics & Personal Care",
        "compliance_score": 93,
        "image_url": None,
        "label_data": {
            "generic_name": "Herbal Face Wash",
            "net_quantity": "100 mL",
            "mrp": "₹115.00 (Incl. of all taxes)",
            "unit_sale_price": "₹1.15/mL",
            "mfg_date": "FEB/2024",
            "manufacturer_address": "The Himalaya Drug Company, Makali, Bengaluru, Karnataka - 560010",
            "consumer_care_phone": "1800-180-5447",
            "country_of_origin": "India",
            "packaging_symbols": {"veg_non_veg": "NOT_APPLICABLE", "pao_symbol": {"detected": True, "period": "12M"}},
        },
        "checklist": [
            ci("generic_name", "Generic or Common Name", "Rule 6(1)(a)", "COMPLIANT", "Herbal Face Wash", "Generic name declared.", "LOW", "rule_6_1_a", GC["generic_name"]),
            ci("net_quantity", "Net Quantity", "Rule 6(1)(b)", "COMPLIANT", "100 mL", "Volume declared.", "LOW", "rule_6_1_b", GC["net_quantity"]),
            ci("mrp", "MRP Details", "Rule 6(1)(c)", "COMPLIANT", "₹115.00 (Incl. of all taxes)", "Declared.", "LOW", "rule_6_1_c", GC["mrp"]),
            ci("usp", "Unit Sale Price (USP)", "Rule 6(1)(s)", "COMPLIANT", "₹1.15/mL", "USP verified.", "LOW", "rule_6_1_s", GC["usp"]),
            ci("mfg_address", "Manufacturer Address", "Rule 6(1)(a)", "COMPLIANT", "The Himalaya Drug Company, Makali, Bengaluru, Karnataka - 560010", "Full address with PIN.", "LOW", "rule_6_1_a", GC["mfg_address"]),
            ci("mfg_date", "MFG / Packing Date", "Rule 6(1)(g)", "COMPLIANT", "FEB/2024", "Declared.", "LOW", "rule_6_1_g", GC["mfg_date"]),
            ci("best_before", "Best Before / Expiry Date", "Rule 6(1)(h)", "COMPLIANT", "36 months from mfg", "Declared.", "LOW", "rule_6_1_h", GC["best_before"]),
            ci("consumer_care", "Consumer Care Details", "Rule 6(1)(r)", "WARNING", "1800-180-5447", "Only phone provided — consumer care postal address also recommended per Rule 6(1)(r).", "MEDIUM", "rule_6_1_r", GC["consumer_care"]),
            ci("country_of_origin", "Country of Origin", "Rule 6(1)(m)", "COMPLIANT", "India", "Declared.", "LOW", "rule_6_1_m", GC["country_of_origin"]),
            ci("language", "Language Compliance", "Rule 11", "COMPLIANT", "English + Hindi", "Bilingual.", "LOW", "rule_11", GC["language"]),
            ci("dual_mrp", "Dual MRP Verification", "Rule 18(2A)", "COMPLIANT", "Single MRP ₹115.00", "No dual MRP.", "LOW", "rule_18_2a", GC["dual_mrp"]),
        ],
        "usp_verification": usp_ok("₹1.15/mL", "₹1.15/mL"),
    },

    {
        "product_name": "Lay's Classic Salted Chips",
        "product_category": "Packaged Snacks",
        "compliance_score": 94,
        "image_url": None,
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
            "packaging_symbols": {"veg_non_veg": "VEG", "fssai_license": {"detected": True, "license_number": "10013022000222", "is_valid_format": True}},
        },
        "checklist": [
            ci("generic_name", "Generic or Common Name", "Rule 6(1)(a)", "COMPLIANT", "Potato Chips Salted", "Declared.", "LOW", "rule_6_1_a", GC["generic_name"]),
            ci("net_quantity", "Net Quantity", "Rule 6(1)(b)", "COMPLIANT", "52 g", "Declared.", "LOW", "rule_6_1_b", GC["net_quantity"]),
            ci("mrp", "MRP Details", "Rule 6(1)(c)", "COMPLIANT", "₹20.00 (Incl. of all taxes)", "Declared.", "LOW", "rule_6_1_c", GC["mrp"]),
            ci("usp", "Unit Sale Price (USP)", "Rule 6(1)(s)", "COMPLIANT", "₹0.384/g", "Verified.", "LOW", "rule_6_1_s", GC["usp"]),
            ci("mfg_address", "Manufacturer Address", "Rule 6(1)(a)", "COMPLIANT", "PepsiCo India Holdings Pvt Ltd, Thudiyalur Road, Coimbatore, Tamil Nadu - 641687", "Full address.", "LOW", "rule_6_1_a", GC["mfg_address"]),
            ci("mfg_date", "MFG / Packing Date", "Rule 6(1)(g)", "COMPLIANT", "MAR/2024", "Declared.", "LOW", "rule_6_1_g", GC["mfg_date"]),
            ci("best_before", "Best Before / Expiry Date", "Rule 6(1)(h)", "COMPLIANT", "6 months from mfg", "Declared.", "LOW", "rule_6_1_h", GC["best_before"]),
            ci("consumer_care", "Consumer Care Details", "Rule 6(1)(r)", "COMPLIANT", "1800-180-0200", "Helpline present.", "LOW", "rule_6_1_r", GC["consumer_care"]),
            ci("country_of_origin", "Country of Origin", "Rule 6(1)(m)", "COMPLIANT", "India", "Declared.", "LOW", "rule_6_1_m", GC["country_of_origin"]),
            ci("language", "Language Compliance", "Rule 11", "COMPLIANT", "English + Hindi", "Bilingual.", "LOW", "rule_11", GC["language"]),
            ci("dual_mrp", "Dual MRP Verification", "Rule 18(2A)", "COMPLIANT", "Single MRP ₹20.00", "No dual MRP.", "LOW", "rule_18_2a", GC["dual_mrp"]),
        ],
        "usp_verification": usp_ok("₹0.384/g", "₹0.384/g"),
    },

    # ══════════════ GRADE B+ ══════════════════════════════════════════════════
    {
        "product_name": "Patanjali Ghee (Pure Cow Ghee)",
        "product_category": "Dairy Product",
        "compliance_score": 82,
        "image_url": None,
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
            "packaging_symbols": {"veg_non_veg": "VEG"},
        },
        "checklist": [
            ci("generic_name", "Generic or Common Name", "Rule 6(1)(a)", "COMPLIANT", "Pure Cow Ghee", "Declared.", "LOW", "rule_6_1_a", GC["generic_name"]),
            ci("net_quantity", "Net Quantity", "Rule 6(1)(b)", "COMPLIANT", "500 mL", "Declared.", "LOW", "rule_6_1_b", GC["net_quantity"]),
            ci("mrp", "MRP Details", "Rule 6(1)(c)", "COMPLIANT", "₹290.00 (Incl. of all taxes)", "Declared.", "LOW", "rule_6_1_c", GC["mrp"]),
            ci("usp", "Unit Sale Price (USP)", "Rule 6(1)(s)", "VIOLATION", "₹0.58/mL (printed)", "Printed USP ₹0.58/mL; correct value ₹290/500 = ₹0.58 — discrepancy due to rounding. Even minor rounding is non-compliant per Rule 6(1)(s).", "HIGH", "rule_6_1_s", GC["usp"]),
            ci("mfg_address", "Manufacturer Address", "Rule 6(1)(a)", "COMPLIANT", "Patanjali Ayurved Ltd., Haridwar, Uttarakhand - 249401", "Full address with PIN.", "LOW", "rule_6_1_a", GC["mfg_address"]),
            ci("mfg_date", "MFG / Packing Date", "Rule 6(1)(g)", "COMPLIANT", "JAN/2024", "Declared.", "LOW", "rule_6_1_g", GC["mfg_date"]),
            ci("best_before", "Best Before / Expiry Date", "Rule 6(1)(h)", "COMPLIANT", "18 months from mfg", "Declared.", "LOW", "rule_6_1_h", GC["best_before"]),
            ci("consumer_care", "Consumer Care Details", "Rule 6(1)(r)", "COMPLIANT", "1860-2660-111", "Helpline present.", "LOW", "rule_6_1_r", GC["consumer_care"]),
            ci("country_of_origin", "Country of Origin", "Rule 6(1)(m)", "COMPLIANT", "India", "Declared.", "LOW", "rule_6_1_m", GC["country_of_origin"]),
            ci("language", "Language Compliance", "Rule 11", "COMPLIANT", "English + Hindi", "Bilingual.", "LOW", "rule_11", GC["language"]),
            ci("dual_mrp", "Dual MRP Verification", "Rule 18(2A)", "WARNING", "Batch/lot number absent", "Batch/lot number not printed — Rule 6(1)(i) requires batch number for traceability.", "MEDIUM", "rule_18_2a", GC["dual_mrp"]),
        ],
        "usp_verification": usp_violation("₹0.58/mL", "₹0.580/mL", "Minor rounding discrepancy in USP — even fractions are non-compliant per Rule 6(1)(s)."),
    },

    {
        "product_name": "Maggi 2-Minute Noodles Masala",
        "product_category": "Packaged Food",
        "compliance_score": 80,
        "image_url": None,
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
            "packaging_symbols": {"veg_non_veg": "VEG", "fssai_license": {"detected": True, "license_number": "10013022000888", "is_valid_format": True}},
        },
        "checklist": [
            ci("generic_name", "Generic or Common Name", "Rule 6(1)(a)", "COMPLIANT", "Instant Noodles with Tastemaker", "Declared.", "LOW", "rule_6_1_a", GC["generic_name"]),
            ci("net_quantity", "Net Quantity", "Rule 6(1)(b)", "COMPLIANT", "70 g", "Declared.", "LOW", "rule_6_1_b", GC["net_quantity"]),
            ci("mrp", "MRP Details", "Rule 6(1)(c)", "COMPLIANT", "₹14.00 (Incl. of all taxes)", "Declared.", "LOW", "rule_6_1_c", GC["mrp"]),
            ci("usp", "Unit Sale Price (USP)", "Rule 6(1)(s)", "VIOLATION", "Serving size stated as '1 cake'", "Serving size must be in grams or mL per Rule 22B(3) — '1 cake' is not a standard metric unit.", "HIGH", "rule_6_1_s", GC["usp"]),
            ci("mfg_address", "Manufacturer Address", "Rule 6(1)(a)", "COMPLIANT", "Nestlé India Ltd., Bichhwal Industrial Area, Bikaner, Rajasthan - 334006", "Full address.", "LOW", "rule_6_1_a", GC["mfg_address"]),
            ci("mfg_date", "MFG / Packing Date", "Rule 6(1)(g)", "COMPLIANT", "MAR/2024", "Declared.", "LOW", "rule_6_1_g", GC["mfg_date"]),
            ci("best_before", "Best Before / Expiry Date", "Rule 6(1)(h)", "COMPLIANT", "12 months from mfg", "Declared.", "LOW", "rule_6_1_h", GC["best_before"]),
            ci("consumer_care", "Consumer Care Details", "Rule 6(1)(r)", "COMPLIANT", "1800-103-0219", "Helpline present.", "LOW", "rule_6_1_r", GC["consumer_care"]),
            ci("country_of_origin", "Country of Origin", "Rule 6(1)(m)", "COMPLIANT", "India", "Declared.", "LOW", "rule_6_1_m", GC["country_of_origin"]),
            ci("language", "Language Compliance", "Rule 11", "WARNING", "Allergy statement font below minimum", "'Contains Wheat (Gluten)' allergy text is 1.5mm — minimum 1.8mm required per FSS Labelling Regulations 2020.", "MEDIUM", "rule_11", GC["language"]),
            ci("dual_mrp", "Dual MRP Verification", "Rule 18(2A)", "COMPLIANT", "Single MRP ₹14.00", "No dual MRP.", "LOW", "rule_18_2a", GC["dual_mrp"]),
        ],
        "usp_verification": usp_violation("₹0.20/g", "₹0.20/g", "Serving size declared as '1 cake' instead of grams — non-standard unit violates Rule 22B(3)."),
    },

    # ══════════════ GRADE B ═══════════════════════════════════════════════════
    {
        "product_name": "Kurkure Masala Munch (Regional Brand)",
        "product_category": "Packaged Snacks",
        "compliance_score": 72,
        "image_url": None,
        "label_data": {
            "generic_name": "Puffed Corn Snack",
            "net_quantity": "60g",
            "mrp": "₹20.00 (Incl. of all taxes)",
            "mfg_date": "JAN/2024",
            "manufacturer_address": "PepsiCo India Holdings Pvt Ltd, DLF Cyber City, Phase II, Gurugram, Haryana - 122002",
            "consumer_care_phone": "1800-180-0200",
            "country_of_origin": "India",
            "calories": 507, "total_fat": 24.0, "carbohydrates": 64.0, "protein": 5.8, "sugars": 2.8, "serving_size": "Per 100g",
            "packaging_symbols": {"veg_non_veg": "VEG"},
        },
        "checklist": [
            ci("generic_name", "Generic or Common Name", "Rule 6(1)(a)", "COMPLIANT", "Puffed Corn Snack", "Declared.", "LOW", "rule_6_1_a", GC["generic_name"]),
            ci("net_quantity", "Net Quantity", "Rule 6(1)(b)", "COMPLIANT", "60 g", "Declared.", "LOW", "rule_6_1_b", GC["net_quantity"]),
            ci("mrp", "MRP Details", "Rule 6(1)(c)", "COMPLIANT", "₹20.00 (Incl. of all taxes)", "Declared.", "LOW", "rule_6_1_c", GC["mrp"]),
            ci("usp", "Unit Sale Price (USP)", "Rule 6(1)(s)", "VIOLATION", "[NOT DETECTED ON LABEL]", "Mandatory unit sale price (₹/g) is entirely absent from packaging — Rule 6(1)(s) violation.", "CRITICAL", "rule_6_1_s", GC["usp"]),
            ci("mfg_address", "Manufacturer Address", "Rule 6(1)(a)", "COMPLIANT", "PepsiCo India Holdings Pvt Ltd, Gurugram, Haryana - 122002", "Full address.", "LOW", "rule_6_1_a", GC["mfg_address"]),
            ci("mfg_date", "MFG / Packing Date", "Rule 6(1)(g)", "COMPLIANT", "JAN/2024", "Declared.", "LOW", "rule_6_1_g", GC["mfg_date"]),
            ci("best_before", "Best Before / Expiry Date", "Rule 6(1)(h)", "COMPLIANT", "6 months from mfg", "Declared.", "LOW", "rule_6_1_h", GC["best_before"]),
            ci("consumer_care", "Consumer Care Details", "Rule 6(1)(r)", "WARNING", "1800-180-0200 (email absent)", "Only phone provided — Rule 6(1)(r) requires phone AND email address.", "MEDIUM", "rule_6_1_r", GC["consumer_care"]),
            ci("country_of_origin", "Country of Origin", "Rule 6(1)(m)", "COMPLIANT", "India", "Declared.", "LOW", "rule_6_1_m", GC["country_of_origin"]),
            ci("language", "Language Compliance", "Rule 11", "COMPLIANT", "English + Hindi", "Bilingual.", "LOW", "rule_11", GC["language"]),
            ci("dual_mrp", "Dual MRP Verification", "Rule 18(2A)", "WARNING", "Barcode partially obscured by sticker", "Barcode partially covered by a promotional sticker — may not scan correctly.", "MEDIUM", "rule_18_2a", GC["dual_mrp"]),
        ],
        "usp_verification": usp_violation("[MISSING]", "₹0.333/g", "Unit sale price is entirely absent from packaging."),
    },

    {
        "product_name": "Imported Lindt Excellence 70% Dark Chocolate",
        "product_category": "Imported Confectionery",
        "compliance_score": 73,
        "image_url": None,
        "label_data": {
            "generic_name": "Dark Chocolate 70% Cocoa",
            "net_quantity": "100g",
            "mrp": "₹450.00 (Incl. of all taxes)",
            "mfg_date": "JAN/2024",
            "manufacturer_address": "Lindt & Sprüngli AG, Kilchberg, Switzerland | Importer: Mondelez India Foods, Mumbai",
            "country_of_origin": "Switzerland",
            "calories": 598, "total_fat": 43.0, "carbohydrates": 45.0, "protein": 8.0, "sugars": 27.0, "serving_size": "Per 100g",
            "packaging_symbols": {"veg_non_veg": "NOT_APPLICABLE", "fssai_license": {"detected": True, "license_number": "10012012345678", "is_valid_format": True}},
        },
        "checklist": [
            ci("generic_name", "Generic or Common Name", "Rule 6(1)(a)", "COMPLIANT", "Dark Chocolate 70% Cocoa", "Declared in English on sticker.", "LOW", "rule_6_1_a", GC["generic_name"]),
            ci("net_quantity", "Net Quantity", "Rule 6(1)(b)", "COMPLIANT", "100 g", "Declared.", "LOW", "rule_6_1_b", GC["net_quantity"]),
            ci("mrp", "MRP Details", "Rule 6(1)(c)", "COMPLIANT", "₹450.00 (Incl. of all taxes) — stickered", "MRP stickered for Indian market.", "LOW", "rule_6_1_c", GC["mrp"]),
            ci("usp", "Unit Sale Price (USP)", "Rule 6(1)(s)", "VIOLATION", "[NOT DETECTED ON LABEL]", "Original Swiss label USP not applicable for Indian pricing — stickered MRP added but USP per 100g not printed as required by Rule 6(1)(s).", "CRITICAL", "rule_6_1_s", GC["usp"]),
            ci("mfg_address", "Manufacturer & Importer Address", "Rule 6(1)(a)", "WARNING", "Lindt & Sprüngli AG, Switzerland | Importer: Mondelez India Foods, Mumbai", "Indian importer address present but lacks PIN code — full postal address required.", "MEDIUM", "rule_6_1_a", GC["mfg_address"]),
            ci("mfg_date", "MFG / Packing Date", "Rule 6(1)(g)", "COMPLIANT", "JAN/2024 (English sticker over German original)", "Month/year on sticker.", "LOW", "rule_6_1_g", GC["mfg_date"]),
            ci("best_before", "Best Before / Expiry Date", "Rule 6(1)(h)", "COMPLIANT", "12 months from mfg", "Declared.", "LOW", "rule_6_1_h", GC["best_before"]),
            ci("consumer_care", "Consumer Care Details", "Rule 6(1)(r)", "WARNING", "+41-21-924-2811 (Swiss number)", "Swiss helpline only — Indian toll-free number required for Indian market consumers.", "MEDIUM", "rule_6_1_r", GC["consumer_care"]),
            ci("country_of_origin", "Country of Origin", "Rule 6(1)(m)", "COMPLIANT", "Switzerland", "Declared.", "LOW", "rule_6_1_m", GC["country_of_origin"]),
            ci("language", "Language Compliance", "Rule 11", "COMPLIANT", "English sticker + German original", "English sticker covers original German — acceptable.", "LOW", "rule_11", GC["language"]),
            ci("dual_mrp", "Dual MRP Verification", "Rule 18(2A)", "COMPLIANT", "Single stickered MRP ₹450.00", "No dual MRP.", "LOW", "rule_18_2a", GC["dual_mrp"]),
        ],
        "usp_verification": usp_violation("[MISSING]", "₹4.50/g", "Unit sale price per gram not printed on Indian import label."),
    },

    # ══════════════ GRADE C+ ══════════════════════════════════════════════════
    {
        "product_name": "Imported Korean Instant Ramen (Shin Ramyun)",
        "product_category": "Imported Packaged Food",
        "compliance_score": 58,
        "image_url": None,
        "label_data": {
            "generic_name": "Instant Noodles Hot & Spicy",
            "net_quantity": "120g",
            "mrp": "₹120.00 (Incl. of all taxes)",
            "mfg_date": "NOV/2023",
            "country_of_origin": "Republic of Korea",
            "calories": 500, "total_fat": 16.0, "carbohydrates": 72.0, "protein": 11.0, "sugars": 3.0, "serving_size": "Per 100g",
            "packaging_symbols": {"fssai_license": {"detected": True, "license_number": "10001012000123", "is_valid_format": True}},
        },
        "checklist": [
            ci("generic_name", "Generic or Common Name", "Rule 6(1)(a)", "COMPLIANT", "Instant Noodles Hot & Spicy Flavour", "Name declared.", "LOW", "rule_6_1_a", GC["generic_name"]),
            ci("net_quantity", "Net Quantity", "Rule 6(1)(b)", "COMPLIANT", "120 g", "Declared.", "LOW", "rule_6_1_b", GC["net_quantity"]),
            ci("mrp", "MRP Details", "Rule 6(1)(c)", "COMPLIANT", "₹120.00 (Incl. of all taxes) — stickered", "MRP stickered.", "LOW", "rule_6_1_c", GC["mrp"]),
            ci("usp", "Unit Sale Price (USP)", "Rule 6(1)(s)", "VIOLATION", "[NOT DETECTED ON LABEL]", "Unit sale price per 100g not printed — Rule 6(1)(s) violation.", "CRITICAL", "rule_6_1_s", GC["usp"]),
            ci("mfg_address", "Importer Name & Address", "Rule 6(1)(a)", "VIOLATION", "[NOT DETECTED ON LABEL]", "Imported product must declare full Indian importer name + complete postal address — absent per Rule 6(1)(e) read with Rule 2(q).", "CRITICAL", "rule_6_1_a", GC["mfg_address"]),
            ci("mfg_date", "MFG / Packing Date", "Rule 6(1)(g)", "COMPLIANT", "NOV/2023 (in Korean)", "Month and year present.", "LOW", "rule_6_1_g", GC["mfg_date"]),
            ci("best_before", "Best Before / Expiry Date", "Rule 6(1)(h)", "COMPLIANT", "12 months from mfg", "Declared.", "LOW", "rule_6_1_h", GC["best_before"]),
            ci("consumer_care", "Consumer Care Details", "Rule 6(1)(r)", "WARNING", "Korean customer care only", "Consumer care details not translated to English/Hindi as required for Indian market.", "MEDIUM", "rule_6_1_r", GC["consumer_care"]),
            ci("country_of_origin", "Country of Origin", "Rule 6(1)(m)", "COMPLIANT", "Republic of Korea", "Declared.", "LOW", "rule_6_1_m", GC["country_of_origin"]),
            ci("language", "Language Compliance", "Rule 11", "VIOLATION", "Korean language only — no English/Hindi translations", "All mandatory declarations must be in English or Hindi — Korean-only labels are not compliant per Rule 11.", "HIGH", "rule_11", GC["language"]),
            ci("dual_mrp", "Dual MRP Verification", "Rule 18(2A)", "COMPLIANT", "Single stickered MRP ₹120.00", "No dual MRP.", "LOW", "rule_18_2a", GC["dual_mrp"]),
        ],
        "usp_verification": usp_violation("[MISSING]", "₹1.00/g", "Unit sale price entirely absent."),
    },

    {
        "product_name": "Local Kirana Store Besan (Gram Flour)",
        "product_category": "Packaged Food (Pulses & Flour)",
        "compliance_score": 62,
        "image_url": None,
        "label_data": {
            "generic_name": "Besan / Gram Flour",
            "net_quantity": "500g",
            "mfg_date": "FEB/2024",
            "manufacturer_address": "Shri Laxmi Mills, Jaipur, Rajasthan",
            "country_of_origin": "India",
            "calories": 387, "total_fat": 6.7, "carbohydrates": 58.0, "protein": 22.5, "sugars": 10.9, "serving_size": "Per 100g",
            "packaging_symbols": {"veg_non_veg": "VEG"},
        },
        "checklist": [
            ci("generic_name", "Generic or Common Name", "Rule 6(1)(a)", "COMPLIANT", "Besan / Gram Flour", "Declared.", "LOW", "rule_6_1_a", GC["generic_name"]),
            ci("net_quantity", "Net Quantity", "Rule 6(1)(b)", "COMPLIANT", "500 g", "Declared.", "LOW", "rule_6_1_b", GC["net_quantity"]),
            ci("mrp", "MRP Details", "Rule 6(1)(c)", "VIOLATION", "[NOT DETECTED ON LABEL]", "No Maximum Retail Price printed on packaging — selling without MRP is an offence under LMPC Act.", "CRITICAL", "rule_6_1_c", GC["mrp"]),
            ci("usp", "Unit Sale Price (USP)", "Rule 6(1)(s)", "VIOLATION", "[NOT DETECTED ON LABEL]", "Unit sale price entirely absent — Rule 6(1)(s) violation.", "CRITICAL", "rule_6_1_s", GC["usp"]),
            ci("mfg_address", "Manufacturer Address", "Rule 6(1)(a)", "WARNING", "Shri Laxmi Mills, Jaipur, Rajasthan", "Only city name given — full postal address with PIN code required per Rule 6(1)(e).", "MEDIUM", "rule_6_1_a", GC["mfg_address"]),
            ci("mfg_date", "MFG / Packing Date", "Rule 6(1)(g)", "COMPLIANT", "FEB/2024", "Declared.", "LOW", "rule_6_1_g", GC["mfg_date"]),
            ci("best_before", "Best Before / Expiry Date", "Rule 6(1)(h)", "COMPLIANT", "6 months", "Declared.", "LOW", "rule_6_1_h", GC["best_before"]),
            ci("consumer_care", "Consumer Care Details", "Rule 6(1)(r)", "WARNING", "[NOT DETECTED ON LABEL]", "No consumer helpline number, email or address printed — Rule 6(1)(r) violation.", "MEDIUM", "rule_6_1_r", GC["consumer_care"]),
            ci("country_of_origin", "Country of Origin", "Rule 6(1)(m)", "COMPLIANT", "India", "Implied.", "LOW", "rule_6_1_m", GC["country_of_origin"]),
            ci("language", "Language Compliance", "Rule 11", "COMPLIANT", "Hindi handwritten label", "Hindi used.", "LOW", "rule_11", GC["language"]),
            ci("dual_mrp", "Dual MRP Verification", "Rule 18(2A)", "COMPLIANT", "No MRP present at all", "No dual MRP.", "LOW", "rule_18_2a", GC["dual_mrp"]),
        ],
        "usp_verification": usp_violation("[MISSING]", "Not calculable — MRP absent", "MRP not declared so USP cannot be verified."),
    },

    # ══════════════ GRADE C ═══════════════════════════════════════════════════
    {
        "product_name": "Duplicate MRP Stickered Olive Oil (Dual MRP Fraud)",
        "product_category": "Packaged Edible Oil",
        "compliance_score": 50,
        "image_url": None,
        "label_data": {
            "generic_name": "Extra Virgin Olive Oil",
            "net_quantity": "500 mL",
            "mrp": "₹650.00 (stickered over original ₹485)",
            "mfg_date": "SEP/2023",
            "manufacturer_address": "Borges India Pvt Ltd, Mumbai, Maharashtra",
            "country_of_origin": "Spain",
            "calories": 884, "total_fat": 100.0, "carbohydrates": 0.0, "protein": 0.0, "sugars": 0.0, "serving_size": "Per 100 mL",
        },
        "checklist": [
            ci("generic_name", "Generic or Common Name", "Rule 6(1)(a)", "COMPLIANT", "Extra Virgin Olive Oil", "Declared.", "LOW", "rule_6_1_a", GC["generic_name"]),
            ci("net_quantity", "Net Quantity", "Rule 6(1)(b)", "COMPLIANT", "500 mL", "Declared.", "LOW", "rule_6_1_b", GC["net_quantity"]),
            ci("mrp", "MRP Details", "Rule 6(1)(c)", "VIOLATION", "₹650.00 stickered (original ₹485 visible underneath)", "Original ₹485 overwritten by sticker showing ₹650 — dual MRP is prohibited under LMPC Act Section 36.", "CRITICAL", "rule_6_1_c", GC["mrp"]),
            ci("usp", "Unit Sale Price (USP)", "Rule 6(1)(s)", "VIOLATION", "USP reflects original price — inconsistent", "USP not updated to match stickered MRP of ₹650 — inconsistency violates Rule 6(1)(s).", "HIGH", "rule_6_1_s", GC["usp"]),
            ci("mfg_address", "Manufacturer Address", "Rule 6(1)(a)", "COMPLIANT", "Borges India Pvt Ltd, Mumbai, Maharashtra", "Importer address present.", "LOW", "rule_6_1_a", GC["mfg_address"]),
            ci("mfg_date", "MFG / Packing Date", "Rule 6(1)(g)", "COMPLIANT", "SEP/2023", "Declared.", "LOW", "rule_6_1_g", GC["mfg_date"]),
            ci("best_before", "Best Before / Expiry Date", "Rule 6(1)(h)", "COMPLIANT", "24 months from mfg", "Declared.", "LOW", "rule_6_1_h", GC["best_before"]),
            ci("consumer_care", "Consumer Care Details", "Rule 6(1)(r)", "WARNING", "Website only — no phone/email", "Only website provided — no phone or email address as required by Rule 6(1)(r).", "MEDIUM", "rule_6_1_r", GC["consumer_care"]),
            ci("country_of_origin", "Country of Origin", "Rule 6(1)(m)", "COMPLIANT", "Spain", "Declared.", "LOW", "rule_6_1_m", GC["country_of_origin"]),
            ci("language", "Language Compliance", "Rule 11", "COMPLIANT", "English", "English declarations present.", "LOW", "rule_11", GC["language"]),
            ci("dual_mrp", "Dual MRP Verification", "Rule 18(2A)", "VIOLATION", "Original ₹485 + stickered ₹650 = DUAL MRP", "Two different MRPs visible on same package — serious violation of Section 36 LMPC Act.", "CRITICAL", "rule_18_2a", GC["dual_mrp"]),
        ],
        "usp_verification": usp_violation("₹0.97/mL (original)", "₹1.30/mL (stickered)", "USP based on original price — does not match stickered MRP."),
    },

    {
        "product_name": "Unbranded Loose Turmeric Powder (Repacked)",
        "product_category": "Packaged Spices & Condiments",
        "compliance_score": 48,
        "image_url": None,
        "label_data": {
            "generic_name": "Haldi / Turmeric Powder",
            "net_quantity": "200g",
            "mfg_date": "2024",
            "country_of_origin": "India",
            "calories": 354, "total_fat": 9.9, "carbohydrates": 67.9, "protein": 7.8, "sugars": 3.2, "serving_size": "Per 100g",
        },
        "checklist": [
            ci("generic_name", "Generic or Common Name", "Rule 6(1)(a)", "COMPLIANT", "Haldi / Turmeric Powder", "Declared.", "LOW", "rule_6_1_a", GC["generic_name"]),
            ci("net_quantity", "Net Quantity", "Rule 6(1)(b)", "WARNING", "200g — handwritten label", "Net quantity declared on handwritten label — print quality and permanence not meeting LMPC standard.", "MEDIUM", "rule_6_1_b", GC["net_quantity"]),
            ci("mrp", "MRP Details", "Rule 6(1)(c)", "VIOLATION", "[NOT DETECTED ON LABEL]", "No MRP printed — product sold without mandatory Maximum Retail Price.", "CRITICAL", "rule_6_1_c", GC["mrp"]),
            ci("usp", "Unit Sale Price (USP)", "Rule 6(1)(s)", "VIOLATION", "[NOT DETECTED ON LABEL]", "No unit sale price — mandatory under Rule 6(1)(s).", "CRITICAL", "rule_6_1_s", GC["usp"]),
            ci("mfg_address", "Manufacturer Address", "Rule 6(1)(a)", "VIOLATION", "[NOT DETECTED ON LABEL]", "No manufacturer or packer name/address — Rule 6(1)(e) violation.", "HIGH", "rule_6_1_a", GC["mfg_address"]),
            ci("mfg_date", "MFG / Packing Date", "Rule 6(1)(g)", "WARNING", "2024 (year only — month missing)", "Only year '2024' printed — Rule 6(1)(g) requires both month AND year.", "MEDIUM", "rule_6_1_g", GC["mfg_date"]),
            ci("best_before", "Best Before / Expiry Date", "Rule 6(1)(h)", "COMPLIANT", "6 months handwritten", "Declared.", "LOW", "rule_6_1_h", GC["best_before"]),
            ci("consumer_care", "Consumer Care Details", "Rule 6(1)(r)", "VIOLATION", "[NOT DETECTED ON LABEL]", "No consumer helpline details anywhere on packaging.", "HIGH", "rule_6_1_r", GC["consumer_care"]),
            ci("country_of_origin", "Country of Origin", "Rule 6(1)(m)", "COMPLIANT", "India (assumed)", "Domestic product.", "LOW", "rule_6_1_m", GC["country_of_origin"]),
            ci("language", "Language Compliance", "Rule 11", "COMPLIANT", "Hindi", "Hindi handwritten.", "LOW", "rule_11", GC["language"]),
            ci("dual_mrp", "Dual MRP Verification", "Rule 18(2A)", "COMPLIANT", "No MRP at all", "No dual MRP.", "LOW", "rule_18_2a", GC["dual_mrp"]),
        ],
        "usp_verification": usp_violation("[MISSING]", "Not calculable", "MRP absent — USP cannot be verified."),
    },

    # ══════════════ GRADE D ═══════════════════════════════════════════════════
    {
        "product_name": "Grey Market Chinese Smartphone Charger",
        "product_category": "Electronics & Electrical",
        "compliance_score": 40,
        "image_url": None,
        "label_data": {
            "generic_name": "USB-C Fast Charger 65W",
            "mfg_date": "2023",
            "country_of_origin": "China (concealed under sticker)",
            "packaging_symbols": {"veg_non_veg": "NOT_APPLICABLE"},
        },
        "checklist": [
            ci("generic_name", "Generic or Common Name", "Rule 6(1)(a)", "COMPLIANT", "USB-C Fast Charger 65W", "Generic name present.", "LOW", "rule_6_1_a", GC["generic_name"]),
            ci("net_quantity", "Net Quantity", "Rule 6(1)(b)", "WARNING", "[NOT DETECTED ON LABEL]", "Weight/dimensions not declared for electronics — not strictly mandatory for this category but recommended.", "MEDIUM", "rule_6_1_b", GC["net_quantity"]),
            ci("mrp", "MRP Details", "Rule 6(1)(c)", "VIOLATION", "[NOT DETECTED ON LABEL]", "No Maximum Retail Price printed — mandatory for all goods sold in India under LMPC Act.", "CRITICAL", "rule_6_1_c", GC["mrp"]),
            ci("usp", "Unit Sale Price (USP)", "Rule 6(1)(s)", "VIOLATION", "[NOT DETECTED ON LABEL]", "No unit sale price — Rule 6(1)(s) violation.", "HIGH", "rule_6_1_s", GC["usp"]),
            ci("mfg_address", "Indian Importer Address", "Rule 6(1)(a)", "VIOLATION", "[NOT DETECTED ON LABEL]", "Imported electronics must show Indian importer/authorised representative name + full postal address — entirely absent.", "CRITICAL", "rule_6_1_a", GC["mfg_address"]),
            ci("mfg_date", "MFG / Packing Date", "Rule 6(1)(g)", "WARNING", "DOM 2023 (year only)", "Only year printed — month required per Rule 6(1)(g).", "MEDIUM", "rule_6_1_g", GC["mfg_date"]),
            ci("best_before", "Best Before / Expiry Date", "Rule 6(1)(h)", "COMPLIANT", "N/A — Electronics", "Not applicable for electronic goods.", "LOW", "rule_6_1_h", GC["best_before"]),
            ci("consumer_care", "Consumer Care Details", "Rule 6(1)(r)", "WARNING", "+86-xxx Chinese support number", "Only Chinese support number provided — Indian contact number required.", "MEDIUM", "rule_6_1_r", GC["consumer_care"]),
            ci("country_of_origin", "Country of Origin", "Rule 6(1)(m)", "VIOLATION", "Concealed under sticker — originally 'Made in China'", "'Made in China' concealed under sticker — mandatory declaration per Rule 6(1)(m) cannot be hidden.", "CRITICAL", "rule_6_1_m", GC["country_of_origin"]),
            ci("language", "Language Compliance", "Rule 11", "COMPLIANT", "English label", "English used.", "LOW", "rule_11", GC["language"]),
            ci("dual_mrp", "BIS/ISI Certification Mark", "BIS Act 2016", "VIOLATION", "[NOT DETECTED ON LABEL]", "USB chargers require mandatory BIS certification (IS 13252) — no BIS mark found on product or packaging.", "CRITICAL", "rule_18_2a", GC["dual_mrp"]),
        ],
        "usp_verification": usp_violation("[MISSING]", "Not calculable", "MRP absent — USP cannot be determined."),
    },

    {
        "product_name": "Counterfeit Protein Supplement Powder",
        "product_category": "Health & Nutrition Supplements",
        "compliance_score": 38,
        "image_url": None,
        "label_data": {
            "generic_name": "Whey Protein Isolate",
            "net_quantity": "1 kg",
            "mfg_date": "2024",
            "manufacturer_address": "123 Protein Street, Bodybuilding Nagar, India",
            "country_of_origin": "India (claimed)",
            "calories": 380, "total_fat": 2.5, "carbohydrates": 6.0, "protein": 78.0, "sugars": 2.0, "serving_size": "Per 100g",
            "packaging_symbols": {"veg_non_veg": "VEG"},
        },
        "checklist": [
            ci("generic_name", "Generic or Common Name", "Rule 6(1)(a)", "COMPLIANT", "Whey Protein Isolate", "Generic name declared.", "LOW", "rule_6_1_a", GC["generic_name"]),
            ci("net_quantity", "Net Quantity", "Rule 6(1)(b)", "COMPLIANT", "1 kg", "Declared.", "LOW", "rule_6_1_b", GC["net_quantity"]),
            ci("mrp", "MRP Details", "Rule 6(1)(c)", "VIOLATION", "[NOT DETECTED ON LABEL]", "No MRP printed — LMPC violation.", "CRITICAL", "rule_6_1_c", GC["mrp"]),
            ci("usp", "Unit Sale Price (USP)", "Rule 6(1)(s)", "VIOLATION", "[NOT DETECTED ON LABEL]", "No unit sale price — Rule 6(1)(s) violation.", "HIGH", "rule_6_1_s", GC["usp"]),
            ci("mfg_address", "Manufacturer Address", "Rule 6(1)(a)", "VIOLATION", "123 Protein Street, Bodybuilding Nagar, India", "Address '123 Protein Street, Bodybuilding Nagar' is not a valid postal address — likely fabricated.", "CRITICAL", "rule_6_1_a", GC["mfg_address"]),
            ci("mfg_date", "MFG / Packing Date", "Rule 6(1)(g)", "WARNING", "2024 (year only)", "Only year — month required per Rule 6(1)(g).", "MEDIUM", "rule_6_1_g", GC["mfg_date"]),
            ci("best_before", "Best Before / Expiry Date", "Rule 6(1)(h)", "COMPLIANT", "24 months", "Declared.", "LOW", "rule_6_1_h", GC["best_before"]),
            ci("consumer_care", "Consumer Care Details", "Rule 6(1)(r)", "VIOLATION", "[NOT DETECTED ON LABEL]", "No contact details whatsoever.", "HIGH", "rule_6_1_r", GC["consumer_care"]),
            ci("country_of_origin", "Country of Origin", "Rule 6(1)(m)", "COMPLIANT", "India (claimed)", "Declared.", "LOW", "rule_6_1_m", GC["country_of_origin"]),
            ci("language", "Language Compliance", "Rule 11", "COMPLIANT", "English", "English used.", "LOW", "rule_11", GC["language"]),
            ci("dual_mrp", "Dual MRP Verification", "Rule 18(2A)", "VIOLATION", "No batch/lot number", "No batch or lot number — Rule 6(1)(i) violation — traceability impossible.", "HIGH", "rule_18_2a", GC["dual_mrp"]),
        ],
        "usp_verification": usp_violation("[MISSING]", "Not calculable", "MRP absent — USP cannot be verified."),
    },

    # ══════════════ GRADE F ═══════════════════════════════════════════════════
    {
        "product_name": "Unlabelled Loose Cashew Nuts (Bulk Repack)",
        "product_category": "Packaged Dry Fruits & Nuts",
        "compliance_score": 25,
        "image_url": None,
        "label_data": {
            "generic_name": "Cashew Nuts W240",
            "net_quantity": "250g approx",
            "country_of_origin": "Unknown",
        },
        "checklist": [
            ci("generic_name", "Generic or Common Name", "Rule 6(1)(a)", "COMPLIANT", "Cashew Nuts W240", "Generic name present.", "LOW", "rule_6_1_a", GC["generic_name"]),
            ci("net_quantity", "Net Quantity", "Rule 6(1)(b)", "WARNING", "250g approx", "Labelled as '250g approx' — exact declared weight required, not approximate.", "MEDIUM", "rule_6_1_b", GC["net_quantity"]),
            ci("mrp", "MRP Details", "Rule 6(1)(c)", "VIOLATION", "[NOT DETECTED ON LABEL]", "No MRP — product sold without Maximum Retail Price.", "CRITICAL", "rule_6_1_c", GC["mrp"]),
            ci("usp", "Unit Sale Price (USP)", "Rule 6(1)(s)", "VIOLATION", "[NOT DETECTED ON LABEL]", "No unit sale price.", "CRITICAL", "rule_6_1_s", GC["usp"]),
            ci("mfg_address", "Manufacturer Address", "Rule 6(1)(a)", "VIOLATION", "[NOT DETECTED ON LABEL]", "No manufacturer or packer name/address.", "HIGH", "rule_6_1_a", GC["mfg_address"]),
            ci("mfg_date", "MFG / Packing Date", "Rule 6(1)(g)", "VIOLATION", "[NOT DETECTED ON LABEL]", "No manufacturing date — product traceability impossible.", "HIGH", "rule_6_1_g", GC["mfg_date"]),
            ci("best_before", "Best Before / Expiry Date", "Rule 6(1)(h)", "VIOLATION", "[NOT DETECTED ON LABEL]", "No expiry or best before date — serious food safety risk.", "CRITICAL", "rule_6_1_h", GC["best_before"]),
            ci("consumer_care", "Consumer Care Details", "Rule 6(1)(r)", "VIOLATION", "[NOT DETECTED ON LABEL]", "No helpline or contact details.", "HIGH", "rule_6_1_r", GC["consumer_care"]),
            ci("country_of_origin", "Country of Origin", "Rule 6(1)(m)", "WARNING", "Unknown / Not declared", "Origin not stated — unverified source.", "MEDIUM", "rule_6_1_m", GC["country_of_origin"]),
            ci("language", "Language Compliance", "Rule 11", "COMPLIANT", "No language (no label)", "N/A.", "LOW", "rule_11", GC["language"]),
            ci("dual_mrp", "Dual MRP Verification", "Rule 18(2A)", "VIOLATION", "No batch/lot number", "No batch number — traceability violation per Rule 6(1)(i).", "HIGH", "rule_18_2a", GC["dual_mrp"]),
        ],
        "usp_verification": usp_violation("[MISSING]", "Not calculable", "MRP absent — USP impossible to verify."),
    },

    {
        "product_name": "Spurious Ghee (Adulterated Vanaspati in Ghee Packaging)",
        "product_category": "Packaged Edible Oil",
        "compliance_score": 15,
        "image_url": None,
        "label_data": {
            "generic_name": "Pure Cow Ghee (FRAUDULENT — actually Vanaspati)",
            "net_quantity": "1 litre",
            "country_of_origin": "Unknown",
            "calories": 900, "total_fat": 100.0, "carbohydrates": 0.0, "protein": 0.0, "sugars": 0.0, "serving_size": "Per 100g",
        },
        "checklist": [
            ci("generic_name", "Generic or Common Name", "Rule 6(1)(a)", "VIOLATION", "Pure Cow Ghee (label claim — actually Vanaspati)", "Label claims 'Pure Cow Ghee' but product is partially hydrogenated vegetable oil (Vanaspati) — criminal food fraud under FSS Act Section 52 and LMPC Act Section 36.", "CRITICAL", "rule_6_1_a", GC["generic_name"]),
            ci("net_quantity", "Net Quantity", "Rule 6(1)(b)", "COMPLIANT", "1 litre", "Declared.", "LOW", "rule_6_1_b", GC["net_quantity"]),
            ci("mrp", "MRP Details", "Rule 6(1)(c)", "VIOLATION", "[NOT DETECTED ON LABEL]", "No MRP printed.", "CRITICAL", "rule_6_1_c", GC["mrp"]),
            ci("usp", "Unit Sale Price (USP)", "Rule 6(1)(s)", "VIOLATION", "[NOT DETECTED ON LABEL]", "No unit sale price.", "CRITICAL", "rule_6_1_s", GC["usp"]),
            ci("mfg_address", "Manufacturer Address", "Rule 6(1)(a)", "VIOLATION", "[NOT DETECTED ON LABEL]", "No manufacturer or packer details.", "CRITICAL", "rule_6_1_a", GC["mfg_address"]),
            ci("mfg_date", "MFG / Packing Date", "Rule 6(1)(g)", "VIOLATION", "[NOT DETECTED ON LABEL]", "No manufacturing date.", "HIGH", "rule_6_1_g", GC["mfg_date"]),
            ci("best_before", "Best Before / Expiry Date", "Rule 6(1)(h)", "VIOLATION", "[NOT DETECTED ON LABEL]", "No expiry date — serious public health risk.", "CRITICAL", "rule_6_1_h", GC["best_before"]),
            ci("consumer_care", "Consumer Care Details", "Rule 6(1)(r)", "VIOLATION", "[NOT DETECTED ON LABEL]", "No helpline details.", "HIGH", "rule_6_1_r", GC["consumer_care"]),
            ci("country_of_origin", "Country of Origin", "Rule 6(1)(m)", "WARNING", "Unknown / Not declared", "Origin not stated.", "MEDIUM", "rule_6_1_m", GC["country_of_origin"]),
            ci("language", "Language Compliance", "Rule 11", "COMPLIANT", "N/A", "N/A.", "LOW", "rule_11", GC["language"]),
            ci("dual_mrp", "Dual MRP Verification", "Rule 18(2A)", "VIOLATION", "No barcode or batch number", "No barcode, batch number — traceability impossible.", "HIGH", "rule_18_2a", GC["dual_mrp"]),
        ],
        "usp_verification": usp_violation("[MISSING]", "Not calculable", "MRP absent — USP impossible to verify."),
    },

    # ══════════════ ADDITIONAL VARIETY ════════════════════════════════════════
    {
        "product_name": "Nestle Cerelac Baby Cereal (Rice)",
        "product_category": "Infant & Baby Food",
        "compliance_score": 97,
        "image_url": None,
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
            "packaging_symbols": {"veg_non_veg": "VEG", "fssai_license": {"detected": True, "license_number": "10013022000300", "is_valid_format": True}},
        },
        "checklist": [
            ci("generic_name", "Generic or Common Name", "Rule 6(1)(a)", "COMPLIANT", "Infant Cereal — Rice Starter", "Declared.", "LOW", "rule_6_1_a", GC["generic_name"]),
            ci("net_quantity", "Net Quantity", "Rule 6(1)(b)", "COMPLIANT", "300 g", "Declared.", "LOW", "rule_6_1_b", GC["net_quantity"]),
            ci("mrp", "MRP Details", "Rule 6(1)(c)", "COMPLIANT", "₹295.00 (Incl. of all taxes)", "Declared.", "LOW", "rule_6_1_c", GC["mrp"]),
            ci("usp", "Unit Sale Price (USP)", "Rule 6(1)(s)", "COMPLIANT", "₹0.983/g", "Verified.", "LOW", "rule_6_1_s", GC["usp"]),
            ci("mfg_address", "Manufacturer Address", "Rule 6(1)(a)", "COMPLIANT", "Nestlé India Ltd., Ponda, Goa - 403401", "Full address.", "LOW", "rule_6_1_a", GC["mfg_address"]),
            ci("mfg_date", "MFG / Packing Date", "Rule 6(1)(g)", "COMPLIANT", "MAR/2024", "Declared.", "LOW", "rule_6_1_g", GC["mfg_date"]),
            ci("best_before", "Best Before / Expiry Date", "Rule 6(1)(h)", "COMPLIANT", "18 months from mfg", "Declared.", "LOW", "rule_6_1_h", GC["best_before"]),
            ci("consumer_care", "Consumer Care Details", "Rule 6(1)(r)", "COMPLIANT", "1800-103-0219 | nestleindia.com", "Declared.", "LOW", "rule_6_1_r", GC["consumer_care"]),
            ci("country_of_origin", "Country of Origin", "Rule 6(1)(m)", "COMPLIANT", "India", "Declared.", "LOW", "rule_6_1_m", GC["country_of_origin"]),
            ci("language", "Language Compliance", "Rule 11", "COMPLIANT", "English + Hindi", "Bilingual.", "LOW", "rule_11", GC["language"]),
            ci("dual_mrp", "Dual MRP Verification", "Rule 18(2A)", "COMPLIANT", "Single MRP ₹295.00", "No dual MRP.", "LOW", "rule_18_2a", GC["dual_mrp"]),
        ],
        "usp_verification": usp_ok("₹0.983/g", "₹0.983/g"),
    },

    {
        "product_name": "Paper Boat Aam Panna Drink",
        "product_category": "Packaged Beverage",
        "compliance_score": 87,
        "image_url": None,
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
            "packaging_symbols": {"veg_non_veg": "VEG", "fssai_license": {"detected": True, "license_number": "10013022001500", "is_valid_format": True}},
        },
        "checklist": [
            ci("generic_name", "Generic or Common Name", "Rule 6(1)(a)", "COMPLIANT", "Aam Panna — Raw Mango Drink", "Declared.", "LOW", "rule_6_1_a", GC["generic_name"]),
            ci("net_quantity", "Net Quantity", "Rule 6(1)(b)", "COMPLIANT", "250 mL", "Declared.", "LOW", "rule_6_1_b", GC["net_quantity"]),
            ci("mrp", "MRP Details", "Rule 6(1)(c)", "COMPLIANT", "₹30.00 (Incl. of all taxes)", "Declared.", "LOW", "rule_6_1_c", GC["mrp"]),
            ci("usp", "Unit Sale Price (USP)", "Rule 6(1)(s)", "COMPLIANT", "₹120.00/L", "Verified.", "LOW", "rule_6_1_s", GC["usp"]),
            ci("mfg_address", "Manufacturer Address", "Rule 6(1)(a)", "COMPLIANT", "Hector Beverages Pvt Ltd, Sector 32, Gurugram, Haryana - 122002", "Full address.", "LOW", "rule_6_1_a", GC["mfg_address"]),
            ci("mfg_date", "MFG / Packing Date", "Rule 6(1)(g)", "COMPLIANT", "FEB/2024", "Declared.", "LOW", "rule_6_1_g", GC["mfg_date"]),
            ci("best_before", "Best Before / Expiry Date", "Rule 6(1)(h)", "COMPLIANT", "9 months from mfg", "Declared.", "LOW", "rule_6_1_h", GC["best_before"]),
            ci("consumer_care", "Consumer Care Details", "Rule 6(1)(r)", "COMPLIANT", "0124-4900100 | hello@paperboat.in", "Phone and email declared.", "LOW", "rule_6_1_r", GC["consumer_care"]),
            ci("country_of_origin", "Country of Origin", "Rule 6(1)(m)", "COMPLIANT", "India", "Declared.", "LOW", "rule_6_1_m", GC["country_of_origin"]),
            ci("language", "Language Compliance", "Rule 11", "WARNING", "'No preservatives' claim unsubstantiated", "Front-of-pack claim 'No preservatives' must have basis — Rule 26 FSSR 2011 requires substantiation for such claims.", "MEDIUM", "rule_11", GC["language"]),
            ci("dual_mrp", "Dual MRP Verification", "Rule 18(2A)", "COMPLIANT", "Single MRP ₹30.00", "No dual MRP.", "LOW", "rule_18_2a", GC["dual_mrp"]),
        ],
        "usp_verification": usp_ok("₹120.00/L", "₹120.00/L"),
    },
]

# ── Build full AuditReport-shaped record ──────────────────────────────────────

def build_report(p):
    score = p["compliance_score"]
    checklist = p["checklist"]
    violations_list = [c for c in checklist if c["status"] == "VIOLATION"]
    warnings_list   = [c for c in checklist if c["status"] == "WARNING"]
    compliant_list  = [c for c in checklist if c["status"] == "COMPLIANT"]

    audit_id = f"seed-{uuid.uuid4().hex[:12]}"

    return {
        "audit_id": audit_id,
        "audit_timestamp": rand_date_past(1, 365),
        "product_name": p["product_name"],
        "product_category": p["product_category"],
        "compliance_score": score,
        "grade": grade_from_score(score),
        "legal_status": legal_status_from_score(score),
        "status_text": status_text_from_score(score),
        "corpus_version": "LMPC-2011-v2.1",
        "checklist": checklist,
        "violations": violations_list,
        "warnings": warnings_list,
        "usp_verification": p.get("usp_verification", usp_na()),
        "bounding_boxes": [],
        "label_data": p.get("label_data", {}),
        "summary": {
            "total_mandates_checked": len(checklist),
            "compliant_count": len(compliant_list),
            "warnings_count": len(warnings_list),
            "violations_count": len(violations_list),
            "is_lawful_for_sale": score >= 70,
        },
        "is_demo": True,
        "is_seeded": True,
        "gemini_vision_used": False,
        "vision_provider": "Seeded Demo Data",
        "llm_enhanced": False,
        "panel_count": 1,
        "image_url": p.get("image_url"),
        "additional_image_urls": [],
        "rag_citations": [],
    }


def main():
    print(f"🌱 PackSure AI — Specimen Seeder v2")
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
    print(f"✅ Done! {len(PRODUCTS)} specimens seeded with full checklist data.")
    print("   Click any specimen card in the app to see full report with checklist.")


if __name__ == "__main__":
    main()
