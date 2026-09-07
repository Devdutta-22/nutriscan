"""
Deterministic Math Engine for LMPC Packaging Compliance (Rule 6(1)(s) and Legal Metrology Rules).
Zero LLM reliance for calculations - purely mathematical, deterministic verification.
"""

from typing import Dict, Any, Optional, Tuple
import re

class DeterministicMathEngine:
    """
    Pure Python math engine for verifying Unit Sale Price (USP),
    unit standardization, and date format compliance.
    """

    @staticmethod
    def parse_quantity(quantity_str: str) -> Optional[Tuple[float, str]]:
        """
        Parses strings like '400g', '400 g', '1.5 kg', '500 ml', '1 L', '10 pcs'
        Returns (numeric_value, standard_unit).
        """
        if not quantity_str:
            return None
        clean = quantity_str.strip().lower()
        match = re.search(r'([\d\.]+)\s*([a-zA-Z]+)', clean)
        if not match:
            return None
        try:
            val = float(match.group(1))
            unit = match.group(2).lower()
            return val, unit
        except ValueError:
            return None

    @staticmethod
    def parse_price(price_str: str) -> Optional[float]:
        """
        Extracts numeric price from strings like '₹80', 'Rs. 80.00', '₹50.00 (incl. of all taxes)'
        """
        if not price_str:
            return None
        match = re.search(r'(\d+(?:\.\d+)?)', price_str)
        if not match:
            return None
        try:
            return float(match.group(1))
        except ValueError:
            return None

    @classmethod
    def calculate_expected_usp(
        cls, mrp: float, net_qty: float, unit: str
    ) -> Dict[str, Any]:
        """
        Calculates the statutory required Unit Sale Price as per Rule 6(1)(s) (2024 Amendment):
        - For weight < 1000g: ₹/g (or ₹/100g)
        - For weight >= 1000g: ₹/kg
        - For volume < 1000ml: ₹/ml (or ₹/100ml)
        - For volume >= 1000ml: ₹/L
        - For pieces/units: ₹/piece
        """
        unit = unit.lower()
        
        # Grams / Kilograms
        if unit in ['g', 'gm', 'gms', 'gram', 'grams']:
            if net_qty < 1000:
                # Per gram
                usp_val = mrp / net_qty
                target_unit = "g"
                alt_usp_val = usp_val * 100
                alt_unit = "100g"
            else:
                # Per kg
                qty_in_kg = net_qty / 1000.0
                usp_val = mrp / qty_in_kg
                target_unit = "kg"
                alt_usp_val = None
                alt_unit = None
        elif unit in ['kg', 'kgs', 'kilogram', 'kilograms']:
            # Per kg
            usp_val = mrp / net_qty
            target_unit = "kg"
            alt_usp_val = None
            alt_unit = None
        # Millilitres / Litres
        elif unit in ['ml', 'mls', 'millilitre', 'millilitres']:
            if net_qty < 1000:
                usp_val = mrp / net_qty
                target_unit = "ml"
                alt_usp_val = usp_val * 100
                alt_unit = "100ml"
            else:
                qty_in_l = net_qty / 1000.0
                usp_val = mrp / qty_in_l
                target_unit = "L"
                alt_usp_val = None
                alt_unit = None
        elif unit in ['l', 'ltr', 'litre', 'litres']:
            usp_val = mrp / net_qty
            target_unit = "L"
            alt_usp_val = None
            alt_unit = None
        # Pieces / Units / Count
        elif unit in ['piece', 'pieces', 'pc', 'pcs', 'unit', 'units', 'n', 'no', 'nos']:
            usp_val = mrp / net_qty
            target_unit = "piece"
            alt_usp_val = None
            alt_unit = None
        else:
            # Fallback direct division
            usp_val = mrp / net_qty if net_qty > 0 else 0
            target_unit = unit
            alt_usp_val = None
            alt_unit = None

        return {
            "expected_usp_value": round(usp_val, 2),
            "expected_usp_unit": target_unit,
            "expected_display": f"₹{round(usp_val, 2):.2f}/{target_unit}",
            "alt_usp_value": round(alt_usp_val, 2) if alt_usp_val else None,
            "alt_usp_unit": alt_unit,
            "alt_display": f"₹{round(alt_usp_val, 2):.2f}/{alt_unit}" if alt_usp_val else None,
            "formula": f"MRP (₹{mrp:.2f}) ÷ Net Qty ({net_qty}{unit})",
        }

    @classmethod
    def verify_usp(
        cls,
        mrp_str: str,
        qty_str: str,
        printed_usp_str: Optional[str]
    ) -> Dict[str, Any]:
        """
        Compares printed USP against deterministic statutory calculation.
        Returns complete audit structure.
        """
        mrp = cls.parse_price(mrp_str)
        parsed_qty = cls.parse_quantity(qty_str)

        if mrp is None or parsed_qty is None:
            return {
                "status": "ERROR",
                "is_valid": False,
                "reason": "Could not parse MRP or Net Quantity accurately.",
                "details": None
            }

        qty_val, qty_unit = parsed_qty
        calc = cls.calculate_expected_usp(mrp, qty_val, qty_unit)

        if not printed_usp_str or printed_usp_str.strip().lower() in ["none", "n/a", "missing", ""]:
            return {
                "status": "VIOLATION",
                "is_valid": False,
                "violation_code": "LMPC-RULE-6-1-S",
                "reason": "Unit Sale Price (USP) is missing completely on the packaging.",
                "calculated": calc,
                "printed": None,
                "discrepancy": "Missing declaration required under Rule 6(1)(s) (2024 Amendment).",
                "statutory_rule": "Rule 6(1)(s)"
            }

        # Parse printed USP
        printed_price = cls.parse_price(printed_usp_str)
        if printed_price is None:
            return {
                "status": "WARNING",
                "is_valid": False,
                "violation_code": "LMPC-RULE-6-1-S-FORMAT",
                "reason": f"Printed USP '{printed_usp_str}' could not be decoded numerically.",
                "calculated": calc,
                "printed": printed_usp_str,
                "statutory_rule": "Rule 6(1)(s)"
            }

        expected_val = calc["expected_usp_value"]
        alt_val = calc.get("alt_usp_value")

        # Tolerances: 2% or 0.05 absolute due to rounding
        diff_primary = abs(printed_price - expected_val)
        diff_alt = abs(printed_price - alt_val) if alt_val is not None else 9999.0

        matches_primary = diff_primary <= max(0.05, expected_val * 0.02)
        matches_alt = diff_alt <= max(0.05, (alt_val or 0) * 0.02)

        if matches_primary or matches_alt:
            return {
                "status": "COMPLIANT",
                "is_valid": True,
                "reason": "Printed Unit Sale Price accurately matches calculated statutory value.",
                "calculated": calc,
                "printed": f"₹{printed_price:.2f}",
                "statutory_rule": "Rule 6(1)(s)"
            }
        else:
            return {
                "status": "VIOLATION",
                "is_valid": False,
                "violation_code": "LMPC-RULE-6-1-S-MISMATCH",
                "reason": f"USP mismatch: Printed ₹{printed_price:.2f} differs from calculated {calc['expected_display']}.",
                "calculated": calc,
                "printed": f"₹{printed_price:.2f}",
                "discrepancy": f"Overstated or inaccurate unit rate (Difference: ₹{abs(printed_price - expected_val):.2f}).",
                "statutory_rule": "Rule 6(1)(s)"
            }

    @staticmethod
    def verify_date_format(date_str: str) -> Dict[str, Any]:
        """
        Verifies compliance with Rule 6(1)(e):
        Month and year of manufacture/packing/import must be declared.
        Permitted patterns: 'MM/YYYY', 'MM-YYYY', 'MMM YYYY', 'Month YYYY'.
        """
        if not date_str:
            return {
                "is_valid": False,
                "status": "VIOLATION",
                "reason": "Date of manufacture/packing is missing."
            }
        
        clean = date_str.strip()
        # Check standard formats (both exact and embedded in coding/batch strings)
        patterns = [
            r'\b(0[1-9]|[12]\d|3[01])[\/\-](0[1-9]|1[0-2])[\/\-](20\d{2}|\d{2})\b', # DD/MM/YYYY or DD-MM-YY
            r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\/\s\.\-]+(20\d{2}|\d{2})\b', # JUL/26, March 2024, JUL-26
            r'\b(0[1-9]|1[0-2])[\/\-](20\d{2}|\d{2})\b', # 03/2024 or 03/24
        ]
        
        for pat in patterns:
            m = re.search(pat, clean, re.IGNORECASE)
            if m:
                matched_date = m.group(0)
                return {
                    "is_valid": True,
                    "status": "COMPLIANT",
                    "reason": f"Valid date declaration matching Rule 6(1)(e): '{matched_date}'",
                    "matched_date": matched_date
                }

        return {
            "is_valid": False,
            "status": "WARNING",
            "reason": f"Ambiguous date format '{clean}'. Rule 6(1)(e) specifies Month & Year must be unambiguous."
        }

