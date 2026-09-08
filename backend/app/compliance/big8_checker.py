"""
Big-8 Mandatory Compliance Checker under Legal Metrology (Packaged Commodities) Rules, 2011.
Evaluates the 8 core statutory declarations, detects importer requirements, and flags defects.
"""

from typing import Dict, Any, List, Optional
from app.compliance.math_engine import DeterministicMathEngine
import re

class Big8Checker:
    """
    Validates the 8 mandatory declarations required on retail packages.
    """

    MANDATES = [
        {"id": "mfg_address", "name": "Manufacturer / Importer Address", "rule": "Rule 6(1)(a)"},
        {"id": "generic_name", "name": "Generic or Common Name", "rule": "Rule 6(1)(b)"},
        {"id": "net_quantity", "name": "Net Quantity (Standard SI Units)", "rule": "Rule 6(1)(c)"},
        {"id": "mrp", "name": "Maximum Retail Price (Incl. of all taxes)", "rule": "Rule 6(1)(d)"},
        {"id": "mfg_date", "name": "Date of Manufacture / Packing", "rule": "Rule 6(1)(e)"},
        {"id": "usp", "name": "Unit Sale Price (USP)", "rule": "Rule 6(1)(s)"},
        {"id": "consumer_care", "name": "Consumer Care Details (Phone & Email)", "rule": "Rule 6(1)(h)"},
        {"id": "country_of_origin", "name": "Country of Origin & Importer", "rule": "Rule 6(1)(g)"},
        {"id": "best_before", "name": "Best Before / Expiry Date", "rule": "Rule 6(1)(f)"},
        {"id": "language", "name": "Language Compliance", "rule": "Rule 9(4)"},
        {"id": "dual_mrp", "name": "Dual MRP Detection", "rule": "Rule 18(2A)"},
    ]

    @classmethod
    def evaluate(cls, label_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Runs comprehensive checks on extracted or declared label attributes.
        """
        results: List[Dict[str, Any]] = []
        violations_count = 0
        warnings_count = 0
        compliant_count = 0
        critical_count = 0

        # Rule 26(a) Small Package Statutory Exemption Evaluation
        raw_net_qty = label_data.get("net_quantity", "")
        parsed_qty = DeterministicMathEngine.parse_quantity(raw_net_qty)
        
        text_corpus = f"{label_data.get('generic_name', '')} {label_data.get('product_name', '')} {label_data.get('raw_text', '')} {label_data.get('product_category', '')}".lower()
        
        confectionery_keywords = [
            "chewing gum", "bubble gum", "toffee", "candy", "candies",
            "eclair", "eclairs", "mint", "mints", "lozenge", "lozenges",
            "lollipop", "lollypop", "sugar cube", "single piece", "chocobite",
            "liquid filled chewing gum", "center fresh", "center fruit", "pulse candy",
            "alpenliebe", "happydent", "mentos", "boomer", "orbit", "clorets"
        ]
        
        tobacco_pan_masala_keywords = [
            "pan masala", "gutkha", "khaini", "tobacco", "zarda", "bidi", "beedi",
            "cigarette", "cigar", "chewing tobacco", "snuff"
        ]
        is_tobacco_or_pan_masala = any(k in text_corpus for k in tobacco_pan_masala_keywords)
        
        is_declared_under_10 = bool(
            parsed_qty and 
            parsed_qty[1] in ['g', 'gm', 'gms', 'gram', 'grams', 'ml', 'mls', 'millilitre', 'millilitres'] and 
            parsed_qty[0] <= 10.0
        )
        is_single_confectionery = any(k in text_corpus for k in confectionery_keywords) and not is_tobacco_or_pan_masala
        
        is_small_pack_exempt = (is_declared_under_10 or is_single_confectionery) and not is_tobacco_or_pan_masala

        # 1. Manufacturer / Importer Address (Rule 6(1)(a))
        mfg_val = label_data.get("manufacturer_address", "")
        importer_val = label_data.get("importer_address", "")
        country = label_data.get("country_of_origin", "").strip()
        is_imported = bool(country and country.lower() not in ["india", "in", "ind", "bharat", "missing", "none"])

        if is_imported:
            if not importer_val or importer_val.strip().lower() in ["missing", "none", ""]:
                results.append({
                    "mandate_id": "mfg_address",
                    "name": "Importer Name & Address",
                    "rule": "Rule 6(1)(a) & 6(1)(g)",
                    "status": "VIOLATION",
                    "extracted_text": mfg_val or "Foreign Manufacturer only",
                    "reason": f"Imported commodity from '{country}' requires name and complete postal address of the Indian Importer.",
                    "severity": "CRITICAL",
                    "citation_key": "rule_6_1_a"
                })
                critical_count += 1
                violations_count += 1
            else:
                if not re.search(r'\d{6}', importer_val):
                    results.append({
                        "mandate_id": "mfg_address",
                        "name": "Manufacturer & Importer Address",
                        "rule": "Rule 6(1)(a)",
                        "status": "WARNING",
                        "extracted_text": f"Mfg: {mfg_val} | Importer: {importer_val}",
                        "reason": "Importer address is present but missing a 6-digit PIN code (Rule 10 requirement).",
                        "severity": "MEDIUM",
                        "citation_key": "rule_6_1_a"
                    })
                    warnings_count += 1
                else:
                    results.append({
                        "mandate_id": "mfg_address",
                        "name": "Manufacturer & Importer Address",
                        "rule": "Rule 6(1)(a)",
                        "status": "COMPLIANT",
                        "extracted_text": f"Mfg: {mfg_val} | Importer: {importer_val}",
                        "reason": "Both foreign manufacturer and registered Indian importer postal details declared.",
                        "severity": "LOW",
                        "citation_key": "rule_6_1_a"
                    })
                    compliant_count += 1
        else:
            if not mfg_val or len(mfg_val.strip()) < 8:
                results.append({
                    "mandate_id": "mfg_address",
                    "name": "Manufacturer Address",
                    "rule": "Rule 6(1)(a)",
                    "status": "VIOLATION",
                    "extracted_text": mfg_val or "Missing",
                    "reason": "Complete postal address of manufacturer is missing or incomplete.",
                    "severity": "HIGH",
                    "citation_key": "rule_6_1_a"
                })
                violations_count += 1
            else:
                if not re.search(r'\d{6}', mfg_val):
                    results.append({
                        "mandate_id": "mfg_address",
                        "name": "Manufacturer Address",
                        "rule": "Rule 6(1)(a)",
                        "status": "WARNING",
                        "extracted_text": mfg_val,
                        "reason": "Manufacturer address is present but missing a 6-digit PIN code (Rule 10 requirement).",
                        "severity": "MEDIUM",
                        "citation_key": "rule_6_1_a"
                    })
                    warnings_count += 1
                else:
                    results.append({
                        "mandate_id": "mfg_address",
                        "name": "Manufacturer Address",
                        "rule": "Rule 6(1)(a)",
                        "status": "COMPLIANT",
                        "extracted_text": mfg_val,
                        "reason": "Manufacturer postal address properly declared.",
                        "severity": "LOW",
                        "citation_key": "rule_6_1_a"
                    })
                    compliant_count += 1

        # 2. Generic Name (Rule 6(1)(b))
        gen_name = label_data.get("generic_name", "")
        if not gen_name or gen_name.strip().lower() in ["missing", "none"]:
            results.append({
                "mandate_id": "generic_name",
                "name": "Generic or Common Name",
                "rule": "Rule 6(1)(b)",
                "status": "VIOLATION",
                "extracted_text": "Missing",
                "reason": "Generic or common name of commodity is omitted.",
                "severity": "HIGH",
                "citation_key": "rule_6_1_b"
            })
            violations_count += 1
        else:
            results.append({
                "mandate_id": "generic_name",
                "name": "Generic or Common Name",
                "rule": "Rule 6(1)(b)",
                "status": "COMPLIANT",
                "extracted_text": gen_name,
                "reason": f"Generic name declared: '{gen_name}'.",
                "severity": "LOW",
                "citation_key": "rule_6_1_b"
            })
            compliant_count += 1

        # 3. Net Quantity (Rule 6(1)(c))
        net_qty = label_data.get("net_quantity", "")
        parsed_qty = DeterministicMathEngine.parse_quantity(net_qty)
        
        prohibited_qualifiers = ['approx', 'approximately', 'minimum', 'min.', 'when packed', 'average']
        has_prohibited = any(q in str(net_qty).lower() for q in prohibited_qualifiers)

        if is_small_pack_exempt and (not parsed_qty or parsed_qty[0] <= 10.0):
            results.append({
                "mandate_id": "net_quantity",
                "name": "Net Quantity",
                "rule": "Rule 6(1)(c)",
                "status": "COMPLIANT",
                "extracted_text": net_qty or "Exempt (≤ 10g)",
                "reason": "Statutorily exempt from net quantity declaration on individual wrapper under Rule 26(a) of LMPC Rules 2011 (commodity ≤ 10g). Quantity is declared on master container/dispenser jar.",
                "severity": "LOW",
                "citation_key": "rule_26_a"
            })
            compliant_count += 1
        elif not parsed_qty:
            results.append({
                "mandate_id": "net_quantity",
                "name": "Net Quantity",
                "rule": "Rule 6(1)(c)",
                "status": "VIOLATION",
                "extracted_text": net_qty or "Missing",
                "reason": "Net quantity not declared in standard metric units (g, kg, ml, L, or piece).",
                "severity": "HIGH",
                "citation_key": "rule_6_1_c"
            })
            violations_count += 1
        elif has_prohibited:
            results.append({
                "mandate_id": "net_quantity",
                "name": "Net Quantity",
                "rule": "Rule 6(1)(c)",
                "status": "WARNING",
                "extracted_text": net_qty,
                "reason": "Net quantity contains prohibited qualifiers (approx, min, when packed, etc.) as per Rule 12(6).",
                "severity": "MEDIUM",
                "citation_key": "rule_6_1_c"
            })
            warnings_count += 1
        else:
            results.append({
                "mandate_id": "net_quantity",
                "name": "Net Quantity",
                "rule": "Rule 6(1)(c)",
                "status": "COMPLIANT",
                "extracted_text": net_qty,
                "reason": f"Standard metric unit declared ({parsed_qty[0]} {parsed_qty[1]}).",
                "severity": "LOW",
                "citation_key": "rule_6_1_c"
            })
            compliant_count += 1

        # 4. Maximum Retail Price (Rule 6(1)(d))
        mrp = label_data.get("mrp", "")
        parsed_mrp = DeterministicMathEngine.parse_price(mrp)
        if is_small_pack_exempt and not parsed_mrp:
            results.append({
                "mandate_id": "mrp",
                "name": "Maximum Retail Price (MRP)",
                "rule": "Rule 6(1)(d)",
                "status": "COMPLIANT",
                "extracted_text": mrp or "Exempt (≤ 10g)",
                "reason": "Statutorily exempt from MRP declaration on individual unit under Rule 26(a) of LMPC Rules 2011 (Net weight ≤ 10g/10ml). Retail price is governed by master container under Rule 18(1).",
                "severity": "LOW",
                "citation_key": "rule_26_a"
            })
            compliant_count += 1
        elif not parsed_mrp:
            results.append({
                "mandate_id": "mrp",
                "name": "Maximum Retail Price (MRP)",
                "rule": "Rule 6(1)(d)",
                "status": "VIOLATION",
                "extracted_text": mrp or "Missing",
                "reason": "MRP must be clearly declared inclusive of all taxes.",
                "severity": "HIGH",
                "citation_key": "rule_6_1_d"
            })
            violations_count += 1
        else:
            raw_mrp_str = str(mrp).lower()
            if "exclusive of taxes" in raw_mrp_str or "excl" in raw_mrp_str:
                results.append({
                    "mandate_id": "mrp",
                    "name": "Maximum Retail Price (MRP)",
                    "rule": "Rule 6(1)(d)",
                    "status": "VIOLATION",
                    "extracted_text": mrp,
                    "reason": "MRP explicitly states 'exclusive of taxes', which violates the requirement to be inclusive of all taxes.",
                    "severity": "HIGH",
                    "citation_key": "rule_6_1_d"
                })
                violations_count += 1
            else:
                # Check for tax inclusion declaration
                tax_declared = "incl" in raw_mrp_str or "taxes" in raw_mrp_str or label_data.get("mrp_inclusive_taxes", True)
                if not tax_declared:
                    results.append({
                        "mandate_id": "mrp",
                        "name": "Maximum Retail Price (MRP)",
                        "rule": "Rule 6(1)(d)",
                        "status": "WARNING",
                        "extracted_text": mrp,
                        "reason": "Mandatory statement 'inclusive of all taxes' or 'incl. of all taxes' is ambiguous.",
                        "severity": "MEDIUM",
                        "citation_key": "rule_6_1_d"
                    })
                    warnings_count += 1
                else:
                    results.append({
                        "mandate_id": "mrp",
                        "name": "Maximum Retail Price (MRP)",
                        "rule": "Rule 6(1)(d)",
                        "status": "COMPLIANT",
                        "extracted_text": f"₹{parsed_mrp:.2f} (inclusive of all taxes)",
                        "reason": "MRP with mandatory tax inclusion declared.",
                        "severity": "LOW",
                        "citation_key": "rule_6_1_d"
                    })
                    compliant_count += 1

        # 5. Date of Manufacture / Packing (Rule 6(1)(e))
        mfg_date = label_data.get("mfg_date", "")
        # Fallback check across expiry_date or raw text / coding area if mfg_date is missing or contains batch info
        if not mfg_date:
            raw_text_scan = label_data.get("raw_text", "") or label_data.get("expiry_date", "")
            if raw_text_scan:
                coding_stamp_match = re.search(r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\/\s\.\-]+(20\d{2}|\d{2})\b', raw_text_scan, re.IGNORECASE)
                if coding_stamp_match:
                    mfg_date = coding_stamp_match.group(0)

        date_audit = DeterministicMathEngine.verify_date_format(mfg_date)
        if is_small_pack_exempt and (date_audit["status"] == "VIOLATION" or not mfg_date):
            results.append({
                "mandate_id": "mfg_date",
                "name": "Date of Manufacture / Packing",
                "rule": "Rule 6(1)(e)",
                "status": "COMPLIANT",
                "extracted_text": mfg_date or "Exempt (≤ 10g)",
                "reason": "Statutorily exempt from Date of Packaging on individual piece under Rule 26(a). Batch & mfg details apply to master container.",
                "severity": "LOW",
                "citation_key": "rule_26_a"
            })
            compliant_count += 1
        elif date_audit["status"] == "VIOLATION":
            results.append({
                "mandate_id": "mfg_date",
                "name": "Date of Manufacture / Packing",
                "rule": "Rule 6(1)(e)",
                "status": "VIOLATION",
                "extracted_text": mfg_date or "Missing",
                "reason": date_audit["reason"],
                "severity": "HIGH",
                "citation_key": "rule_6_1_e"
            })
            violations_count += 1
        elif date_audit["status"] == "WARNING":
            results.append({
                "mandate_id": "mfg_date",
                "name": "Date of Manufacture / Packing",
                "rule": "Rule 6(1)(e)",
                "status": "WARNING",
                "extracted_text": mfg_date,
                "reason": date_audit["reason"],
                "severity": "MEDIUM",
                "citation_key": "rule_6_1_e"
            })
            warnings_count += 1
        else:
            matched_display = date_audit.get("matched_date", mfg_date)
            results.append({
                "mandate_id": "mfg_date",
                "name": "Date of Manufacture / Packing",
                "rule": "Rule 6(1)(e)",
                "status": "COMPLIANT",
                "extracted_text": matched_display,
                "reason": date_audit["reason"],
                "severity": "LOW",
                "citation_key": "rule_6_1_e"
            })
            compliant_count += 1

        # 6. Unit Sale Price (Rule 6(1)(s) - 2024 Amendment)
        usp_str = label_data.get("unit_sale_price", "")
        if is_small_pack_exempt:
            usp_verification = {
                "status": "COMPLIANT",
                "is_valid": True,
                "reason": "Statutorily exempt from Unit Sale Price (USP) under Rule 26(a) and Rule 6(11) (Package ≤ 10g/10ml).",
                "statutory_rule": "Rule 26(a)",
                "printed": usp_str or "Exempt (≤ 10g)"
            }
            results.append({
                "mandate_id": "usp",
                "name": "Unit Sale Price (USP)",
                "rule": "Rule 6(1)(s)",
                "status": "COMPLIANT",
                "extracted_text": usp_str or "Exempt (≤ 10g)",
                "reason": "Statutorily exempt from Unit Sale Price (USP) under Rule 26(a) and Rule 6(11) (Package ≤ 10g/10ml).",
                "severity": "LOW",
                "details": usp_verification,
                "citation_key": "rule_26_a"
            })
            compliant_count += 1
        else:
            usp_verification = DeterministicMathEngine.verify_usp(mrp, net_qty, usp_str)
            if usp_verification["status"] == "VIOLATION":
                results.append({
                    "mandate_id": "usp",
                    "name": "Unit Sale Price (USP)",
                    "rule": "Rule 6(1)(s)",
                    "status": "VIOLATION",
                    "extracted_text": usp_str or "Missing",
                    "reason": usp_verification["reason"],
                    "severity": "HIGH",
                    "details": usp_verification,
                    "citation_key": "rule_6_1_s"
                })
                violations_count += 1
            elif usp_verification["status"] == "WARNING":
                results.append({
                    "mandate_id": "usp",
                    "name": "Unit Sale Price (USP)",
                    "rule": "Rule 6(1)(s)",
                    "status": "WARNING",
                    "extracted_text": usp_str,
                    "reason": usp_verification["reason"],
                    "severity": "MEDIUM",
                    "details": usp_verification,
                    "citation_key": "rule_6_1_s"
                })
                warnings_count += 1
            elif usp_verification["status"] == "ERROR":
                results.append({
                    "mandate_id": "usp",
                    "name": "Unit Sale Price (USP)",
                    "rule": "Rule 6(1)(s)",
                    "status": "VIOLATION",
                    "extracted_text": usp_str or "Missing",
                    "reason": "MRP and/or Net Quantity are missing from label; statutory Unit Sale Price (USP) cannot be computed or verified.",
                    "severity": "HIGH",
                    "details": usp_verification,
                    "citation_key": "rule_6_1_s"
                })
                violations_count += 1
            else:
                results.append({
                    "mandate_id": "usp",
                    "name": "Unit Sale Price (USP)",
                    "rule": "Rule 6(1)(s)",
                    "status": "COMPLIANT",
                    "extracted_text": usp_verification.get("printed", usp_str),
                    "reason": usp_verification["reason"],
                    "severity": "LOW",
                    "details": usp_verification,
                    "citation_key": "rule_6_1_s"
                })
                compliant_count += 1

        # 7. Consumer Care Details (Rule 6(1)(h))
        care_phone = str(label_data.get("consumer_care_phone", "") or "")
        care_email = str(label_data.get("consumer_care_email", "") or "")
        
        # Strip non-digits to verify at least 7-11 digits (e.g. 1800 103 1947 or standard landlines/mobiles)
        phone_digits = re.sub(r'\D', '', care_phone)
        has_phone = len(phone_digits) >= 7 or bool(re.search(r'[\d\s\-\+\(\)]{7,}', care_phone) and len(re.findall(r'\d', care_phone)) >= 7)
        has_email = bool(re.search(r'[\w\.-]+@[\w\.-]+\.\w+', care_email))

        clean_display_phone = re.sub(r'^(?:phone|tel|call|care|contact)?\s*[:\.\-]?\s*', '', care_phone, flags=re.IGNORECASE).strip()
        clean_display_email = re.sub(r'^(?:email|mail)?\s*[:\.\-]?\s*', '', care_email, flags=re.IGNORECASE).strip()

        if is_small_pack_exempt and (not has_phone and not has_email):
            results.append({
                "mandate_id": "consumer_care",
                "name": "Consumer Care Details",
                "rule": "Rule 6(1)(h)",
                "status": "COMPLIANT",
                "extracted_text": (clean_display_phone or clean_display_email) or "Exempt (≤ 10g)",
                "reason": "Statutorily exempt from consumer helpline declaration on small wrapper under Rule 26(a). Consumer care details declared on master pack.",
                "severity": "LOW",
                "citation_key": "rule_26_a"
            })
            compliant_count += 1
        elif not has_phone and not has_email:
            results.append({
                "mandate_id": "consumer_care",
                "name": "Consumer Care Details",
                "rule": "Rule 6(1)(h)",
                "status": "VIOLATION",
                "extracted_text": "Missing phone & email",
                "reason": "Both telephone number and email address for consumer complaints are missing.",
                "severity": "HIGH",
                "citation_key": "rule_6_1_h"
            })
            violations_count += 1
        elif not has_phone or not has_email:
            missing_item = "email address" if not has_email else "telephone number"
            results.append({
                "mandate_id": "consumer_care",
                "name": "Consumer Care Details",
                "rule": "Rule 6(1)(h)",
                "status": "WARNING",
                "extracted_text": f"Phone: {clean_display_phone or 'Missing'} | Email: {clean_display_email or 'Missing'}",
                "reason": f"Rule 6(1)(h) mandates both telephone and email. Missing {missing_item}.",
                "severity": "MEDIUM",
                "citation_key": "rule_6_1_h"
            })
            warnings_count += 1
        else:
            results.append({
                "mandate_id": "consumer_care",
                "name": "Consumer Care Details",
                "rule": "Rule 6(1)(h)",
                "status": "COMPLIANT",
                "extracted_text": f"Tel: {clean_display_phone} | Email: {clean_display_email}",
                "reason": "Complete contact details for consumer redressal declared (verified phone helpline and email).",
                "severity": "LOW",
                "citation_key": "rule_6_1_h"
            })
            compliant_count += 1

        # 8. Country of Origin (Rule 6(1)(g))
        barcode_info = label_data.get("barcode_data") or {}
        barcode_val = str(barcode_info.get("value", "")).strip()
        gs1_country = barcode_info.get("gs1_country", "")

        # Infer GS1 prefix if raw value provided
        if not gs1_country and barcode_val and len(barcode_val) >= 3:
            prefix = barcode_val[:3]
            if prefix == "890":
                gs1_country = "India"
            elif prefix in ["690", "691", "692", "693", "694", "695"]:
                gs1_country = "China"
            elif prefix.startswith("0") or prefix.startswith("1"):
                gs1_country = "USA / Canada"

        if not country or country.strip().lower() in ["missing", "none"]:
            results.append({
                "mandate_id": "country_of_origin",
                "name": "Country of Origin",
                "rule": "Rule 6(1)(g)",
                "status": "VIOLATION",
                "extracted_text": f"Barcode: {barcode_val or 'None'} (GS1: {gs1_country or 'Unknown'}) | Label: Missing",
                "reason": "Country of origin must be declared on all pre-packed commodities as per Rule 6(1)(g).",
                "severity": "HIGH",
                "citation_key": "rule_6_1_g"
            })
            violations_count += 1
        else:
            # Check GS1 prefix alignment if barcode is present
            if gs1_country and barcode_val:
                is_india_declared = country.lower() in ["india", "in", "ind", "bharat"]
                is_india_barcode = gs1_country.lower() == "india"

                if is_india_declared and not is_india_barcode:
                    results.append({
                        "mandate_id": "country_of_origin",
                        "name": "Country of Origin & Barcode Discrepancy",
                        "rule": "Rule 6(1)(g)",
                        "status": "WARNING",
                        "extracted_text": f"Label declares '{country}', but GS1 Barcode prefix ({barcode_val[:3]}) denotes '{gs1_country}'",
                        "reason": f"GS1 Barcode prefix mismatch: Package barcode indicates {gs1_country}, yet origin is declared as {country}. Requires traceability verification.",
                        "severity": "MEDIUM",
                        "citation_key": "rule_6_1_g"
                    })
                    warnings_count += 1
                elif not is_india_declared and is_india_barcode:
                    results.append({
                        "mandate_id": "country_of_origin",
                        "name": "Country of Origin & Barcode Discrepancy",
                        "rule": "Rule 6(1)(g)",
                        "status": "WARNING",
                        "extracted_text": f"Label declares imported from '{country}', but GS1 Barcode is 890 (GS1 India registered)",
                        "reason": "Product is declared imported, but uses an Indian GS1 (890) barcode prefix (possible domestic repacking or license).",
                        "severity": "MEDIUM",
                        "citation_key": "rule_6_1_g"
                    })
                    warnings_count += 1
                else:
                    results.append({
                        "mandate_id": "country_of_origin",
                        "name": "Country of Origin",
                        "rule": "Rule 6(1)(g)",
                        "status": "COMPLIANT",
                        "extracted_text": f"Origin: {country} (GS1 {barcode_val[:3]} confirms {gs1_country})",
                        "reason": f"Country of origin declared as '{country}', verified with GS1 barcode prefix.",
                        "severity": "LOW",
                        "citation_key": "rule_6_1_g"
                    })
                    compliant_count += 1
            else:
                results.append({
                    "mandate_id": "country_of_origin",
                    "name": "Country of Origin",
                    "rule": "Rule 6(1)(g)",
                    "status": "COMPLIANT",
                    "extracted_text": country,
                    "reason": f"Country of origin explicitly declared as '{country}'.",
                    "severity": "LOW",
                    "citation_key": "rule_6_1_g"
                })
                compliant_count += 1

        # 9. Best Before / Expiry Date (Rule 6(1)(f))
        expiry = label_data.get("expiry_date") or label_data.get("best_before")
        product_cat = label_data.get("product_category", "general").lower()
        perishable_keywords = ['food', 'perishable', 'beverage', 'edible', 'dairy', 'meat', 'bakery']
        is_perishable = any(kw in product_cat for kw in perishable_keywords)

        if is_small_pack_exempt and not expiry:
            results.append({
                "mandate_id": "best_before",
                "name": "Best Before / Expiry Date",
                "rule": "Rule 6(1)(f)",
                "status": "COMPLIANT",
                "extracted_text": "Exempt (≤ 10g)",
                "reason": "Statutorily exempt from expiry date on individual small unit under Rule 26(a). Best before/expiry declared on master wholesale container.",
                "severity": "LOW",
                "citation_key": "rule_26_a"
            })
            compliant_count += 1
        elif expiry:
            results.append({
                "mandate_id": "best_before",
                "name": "Best Before / Expiry Date",
                "rule": "Rule 6(1)(f)",
                "status": "COMPLIANT",
                "extracted_text": expiry,
                "reason": "Best before or expiry date is declared.",
                "severity": "LOW",
                "citation_key": "rule_6_1_f"
            })
            compliant_count += 1
        else:
            if is_perishable:
                results.append({
                    "mandate_id": "best_before",
                    "name": "Best Before / Expiry Date",
                    "rule": "Rule 6(1)(f)",
                    "status": "VIOLATION",
                    "extracted_text": "Missing",
                    "reason": "Perishable commodity missing mandatory Best Before / Expiry date under Rule 6(1)(f).",
                    "severity": "HIGH",
                    "citation_key": "rule_6_1_f"
                })
                violations_count += 1
            elif not gen_name and not mrp and not net_qty:
                results.append({
                    "mandate_id": "best_before",
                    "name": "Best Before / Expiry Date",
                    "rule": "Rule 6(1)(f)",
                    "status": "VIOLATION",
                    "extracted_text": "Missing",
                    "reason": "No packaging declarations or product shelf-life/expiry dates found.",
                    "severity": "HIGH",
                    "citation_key": "rule_6_1_f"
                })
                violations_count += 1
            else:
                results.append({
                    "mandate_id": "best_before",
                    "name": "Best Before / Expiry Date",
                    "rule": "Rule 6(1)(f)",
                    "status": "COMPLIANT",
                    "extracted_text": "Not required",
                    "reason": "Not a perishable commodity; expiry date may not be strictly required.",
                    "severity": "LOW",
                    "citation_key": "rule_6_1_f"
                })
                compliant_count += 1

        # 10. Language Compliance (Rule 9(4))
        lang_detected = str(label_data.get("language_detected", "")).lower()
        has_any_text = bool(label_data.get("raw_text") or gen_name or mfg_val or mrp or net_qty)

        if not has_any_text:
            results.append({
                "mandate_id": "language",
                "name": "Language Compliance",
                "rule": "Rule 9(4)",
                "status": "VIOLATION",
                "extracted_text": "No text detected",
                "reason": "No legible statutory text or declarations found on the scanned image.",
                "severity": "HIGH",
                "citation_key": "rule_9_4"
            })
            violations_count += 1
        elif "english" in lang_detected or "hindi" in lang_detected:
            results.append({
                "mandate_id": "language",
                "name": "Language Compliance",
                "rule": "Rule 9(4)",
                "status": "COMPLIANT",
                "extracted_text": lang_detected,
                "reason": "Declarations are in English or Hindi.",
                "severity": "LOW",
                "citation_key": "rule_9_4"
            })
            compliant_count += 1
        elif not lang_detected:
            results.append({
                "mandate_id": "language",
                "name": "Language Compliance",
                "rule": "Rule 9(4)",
                "status": "WARNING",
                "extracted_text": "Unknown",
                "reason": "Language information unavailable; could not be verified from OCR alone.",
                "severity": "MEDIUM",
                "citation_key": "rule_9_4"
            })
            warnings_count += 1
        else:
            results.append({
                "mandate_id": "language",
                "name": "Language Compliance",
                "rule": "Rule 9(4)",
                "status": "VIOLATION",
                "extracted_text": lang_detected,
                "reason": "Declarations appear to be entirely in a language other than English or Hindi.",
                "severity": "HIGH",
                "citation_key": "rule_9_4"
            })
            violations_count += 1

        # 11. Dual MRP Detection (Rule 18(2A))
        mrp_values = label_data.get("mrp_values", [])
        if isinstance(mrp_values, list) and len(set(mrp_values)) > 1:
            results.append({
                "mandate_id": "dual_mrp",
                "name": "Dual MRP Detection",
                "rule": "Rule 18(2A)",
                "status": "VIOLATION",
                "extracted_text": ", ".join(map(str, mrp_values)),
                "reason": "Multiple distinct MRP values detected on the same package (Dual MRP prohibition under Rule 18(2A)).",
                "severity": "HIGH",
                "citation_key": "rule_18_2a"
            })
            violations_count += 1
        else:
            results.append({
                "mandate_id": "dual_mrp",
                "name": "Dual MRP Detection",
                "rule": "Rule 18(2A)",
                "status": "COMPLIANT",
                "extracted_text": str(mrp_values[0]) if (isinstance(mrp_values, list) and len(mrp_values) == 1) else (mrp or "Uniform pricing"),
                "reason": "Uniform single pricing verified. No dual pricing detected on package (Rule 18(2A)).",
                "severity": "LOW",
                "citation_key": "rule_18_2a"
            })
            compliant_count += 1

        # Calculate overall compliance score (0 - 100%)
        # Violations subtract 12.5%, warnings subtract 5%
        raw_score = 100 - (violations_count * 12.5) - (warnings_count * 5.0)
        compliance_score = max(0, min(100, int(round(raw_score))))

        return {
            "compliance_score": compliance_score,
            "checklist": results,
            "is_small_pack_exempt": is_small_pack_exempt,
            "summary": {
                "total_mandates": len(cls.MANDATES),
                "compliant": compliant_count,
                "warnings": warnings_count,
                "violations": violations_count,
                "critical": critical_count,
                "is_lawful_for_sale": violations_count == 0,
                "is_small_pack_exempt": is_small_pack_exempt,
                "exemption_rule": "Rule 26(a)" if is_small_pack_exempt else None
            },
            "usp_verification": usp_verification,
            "barcode_data": label_data.get("barcode_data"),
            "qr_data": label_data.get("qr_data"),
            "packaging_symbols": label_data.get("packaging_symbols")
        }
