import { DemoPreset } from '../types/compliance';

export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: "compliant-biscuit",
    title: "Compliant Biscuit Pack",
    category: "Packaged Food",
    description: "Standard 400g biscuit pack with flawless Big-8 compliance and verified statutory USP.",
    image_url: "/presets/compliant_biscuit.svg",
    compliance_target: "100% COMPLIANT",
    expected_score: 100,
    label_data: {
      generic_name: "Digestive Whole Wheat Biscuits",
      net_quantity: "400g",
      mrp: "₹80.00 (inclusive of all taxes)",
      unit_sale_price: "₹0.20/g",
      mfg_date: "03/2024",
      manufacturer_address: "Sunlight Confectioneries Ltd., Plot 14, Phase II, Peenya Industrial Area, Bengaluru, Karnataka - 560058",
      consumer_care_phone: "+91-80-28394000",
      consumer_care_email: "care@sunlightbiscuits.in",
      country_of_origin: "India",
      calories: 446,
      total_fat: 14.5,
      carbohydrates: 68.2,
      protein: 7.8,
      sugars: 18.5,
      serving_size: "Per 100g",
      nutrition: {
        calories: 446,
        fat: 14.5,
        carbs: 68.2,
        protein: 7.8,
        sugar: 18.5,
        serving_size: "Per 100g",
      },
      barcode_data: {
        detected: true,
        type: "EAN-13",
        value: "8901030383847",
        gs1_country: "India",
        is_valid_gs1: true,
        country_match: true,
      },
      qr_data: {
        detected: true,
        raw_payload: "https://sunlightbiscuits.in/trace/lot-400g-2024",
        url: "https://sunlightbiscuits.in/trace/lot-400g-2024",
        is_url: true,
        satisfies_electronic_disclosure: true,
      },
      packaging_symbols: {
        veg_non_veg: "VEG",
        fssai_license: {
          detected: true,
          license_number: "10014022002758",
          is_valid_format: true,
        },
        isi_bis_mark: {
          detected: true,
          cm_l_number: "CM/L-8294719",
        },
        recycling_info: {
          detected: true,
          resin_code: "5",
          material_name: "PP (Polypropylene)",
          mobius_loop: true,
          tidyman_symbol: true,
        },
        e_mark: {
          detected: true,
          details: "European ℮ Average Fill Mark (Schedule II MPE Conforming)",
        },
      },
    },
    bounding_boxes: [
      {
        id: "box_generic_name",
        mandate_id: "generic_name",
        label: "Generic Name",
        text: "Digestive Whole Wheat Biscuits",
        status: "COMPLIANT",
        bbox: { x: 45, y: 35, w: 510, h: 48 },
        color: "#10b981"
      },
      {
        id: "box_net_quantity",
        mandate_id: "net_quantity",
        label: "Net Quantity",
        text: "Net Weight: 400 g",
        status: "COMPLIANT",
        bbox: { x: 45, y: 105, w: 235, h: 42 },
        color: "#10b981"
      },
      {
        id: "box_mrp",
        mandate_id: "mrp",
        label: "MRP Declaration",
        text: "MRP ₹80.00 (incl. of all taxes)",
        status: "COMPLIANT",
        bbox: { x: 300, y: 105, w: 255, h: 42 },
        color: "#10b981"
      },
      {
        id: "box_usp",
        mandate_id: "usp",
        label: "Unit Sale Price (USP)",
        text: "USP: ₹0.20 / g",
        status: "COMPLIANT",
        bbox: { x: 45, y: 165, w: 235, h: 42 },
        color: "#10b981"
      },
      {
        id: "box_mfg_date",
        mandate_id: "mfg_date",
        label: "Date of Packaging",
        text: "Pkg Date: 03/2024",
        status: "COMPLIANT",
        bbox: { x: 300, y: 165, w: 255, h: 42 },
        color: "#10b981"
      },
      {
        id: "box_mfg_address",
        mandate_id: "mfg_address",
        label: "Manufacturer Address",
        text: "Mfd by: Sunlight Confectioneries Ltd., Plot 14, Phase II, Peenya Industrial Area, Bengaluru, Karnataka - 560058",
        status: "COMPLIANT",
        bbox: { x: 45, y: 228, w: 510, h: 65 },
        color: "#10b981"
      },
      {
        id: "box_consumer_care",
        mandate_id: "consumer_care",
        label: "Consumer Care",
        text: "Consumer Care: +91-80-28394000 | care@sunlightbiscuits.in",
        status: "COMPLIANT",
        bbox: { x: 45, y: 312, w: 510, h: 45 },
        color: "#10b981"
      },
      {
        id: "box_country_of_origin",
        mandate_id: "country_of_origin",
        label: "Country of Origin",
        text: "Country of Origin: India",
        status: "COMPLIANT",
        bbox: { x: 45, y: 375, w: 250, h: 36 },
        color: "#10b981"
      }
    ]
  },
  {
    id: "violating-face-cream",
    title: "Violating Face Cream (No USP)",
    category: "Cosmetics",
    description: "50ml cosmetic cream missing mandatory Unit Sale Price (USP) and consumer care email address.",
    image_url: "/presets/violating_face_cream.svg",
    compliance_target: "75% - STATUTORY VIOLATION",
    expected_score: 75,
    label_data: {
      generic_name: "Hydrating Radiance Face Cream",
      net_quantity: "50ml",
      mrp: "₹450.00 (incl. of all taxes)",
      unit_sale_price: "Missing",
      mfg_date: "01/2024",
      manufacturer_address: "Aura Naturals Cosmetics Pvt Ltd, Sector 62, Noida, UP - 201309",
      consumer_care_phone: "1800-200-9988",
      consumer_care_email: "",
      country_of_origin: "India",
      barcode_data: {
        detected: true,
        type: "EAN-13",
        value: "8904005900124",
        gs1_country: "India",
        is_valid_gs1: true,
        country_match: true,
      },
      packaging_symbols: {
        veg_non_veg: "NOT_APPLICABLE",
        pao_symbol: {
          detected: true,
          period: "12M (12 Months After Opening)",
        },
        recycling_info: {
          detected: true,
          resin_code: "2",
          material_name: "HDPE (High-Density Polyethylene)",
          mobius_loop: true,
        },
      },
    },
    bounding_boxes: [
      {
        id: "box_generic_name",
        mandate_id: "generic_name",
        label: "Generic Name",
        text: "Hydrating Radiance Face Cream",
        status: "COMPLIANT",
        bbox: { x: 45, y: 35, w: 510, h: 48 },
        color: "#10b981"
      },
      {
        id: "box_net_quantity",
        mandate_id: "net_quantity",
        label: "Net Quantity",
        text: "Net Volume: 50 ml",
        status: "COMPLIANT",
        bbox: { x: 45, y: 105, w: 235, h: 42 },
        color: "#10b981"
      },
      {
        id: "box_mrp",
        mandate_id: "mrp",
        label: "MRP Declaration",
        text: "MRP: ₹450.00 (incl. of all taxes)",
        status: "COMPLIANT",
        bbox: { x: 300, y: 105, w: 255, h: 42 },
        color: "#10b981"
      },
      {
        id: "box_usp_missing",
        mandate_id: "usp",
        label: "Missing Unit Sale Price (USP)",
        text: "[VIOLATION: Rule 6(1)(s) - Required ₹9.00/ml or ₹900.00/100ml absent]",
        status: "VIOLATION",
        bbox: { x: 45, y: 165, w: 510, h: 48 },
        color: "#f43f5e"
      },
      {
        id: "box_mfg_date",
        mandate_id: "mfg_date",
        label: "Date of Packaging",
        text: "Mfg Date: 01/2024",
        status: "COMPLIANT",
        bbox: { x: 45, y: 235, w: 235, h: 40 },
        color: "#10b981"
      },
      {
        id: "box_mfg_address",
        mandate_id: "mfg_address",
        label: "Manufacturer Address",
        text: "Mfd by: Aura Naturals Cosmetics Pvt Ltd, Sector 62, Noida, UP - 201309",
        status: "COMPLIANT",
        bbox: { x: 45, y: 295, w: 510, h: 58 },
        color: "#10b981"
      },
      {
        id: "box_consumer_care_warning",
        mandate_id: "consumer_care",
        label: "Consumer Care Incomplete",
        text: "Care Toll-Free: 1800-200-9988 (Email address missing)",
        status: "WARNING",
        bbox: { x: 45, y: 370, w: 510, h: 45 },
        color: "#fbbf24"
      },
      {
        id: "box_country_of_origin",
        mandate_id: "country_of_origin",
        label: "Country of Origin",
        text: "Made in India",
        status: "COMPLIANT",
        bbox: { x: 45, y: 432, w: 210, h: 36 },
        color: "#10b981"
      }
    ]
  },
  {
    id: "imported-chocolate",
    title: "Imported Swiss Chocolate",
    category: "Confectionery / Imported",
    description: "Imported chocolate declaring Swiss manufacturer but lacking registered Indian Importer postal address and PIN code.",
    image_url: "/presets/imported_chocolate.svg",
    compliance_target: "62% - HIGH RISK NON-COMPLIANCE",
    expected_score: 62,
    label_data: {
      generic_name: "Artisanal Dark Chocolate 70% Cocoa",
      net_quantity: "100g",
      mrp: "₹350.00",
      unit_sale_price: "₹5.50/g", // Mismatch! ₹350 / 100g = ₹3.50/g
      mfg_date: "11/2023",
      manufacturer_address: "Alpine Chocolatier AG, Bahnhofstrasse 42, 8001 Zurich, Switzerland",
      importer_address: "",
      consumer_care_phone: "+41-44-211-0000",
      consumer_care_email: "",
      country_of_origin: "Switzerland",
      calories: 565,
      total_fat: 41.5,
      carbohydrates: 36.0,
      protein: 8.2,
      sugars: 28.0,
      serving_size: "Per 100g",
      nutrition: {
        calories: 565,
        fat: 41.5,
        carbs: 36.0,
        protein: 8.2,
        sugar: 28.0,
        serving_size: "Per 100g",
      },
      barcode_data: {
        detected: true,
        type: "EAN-13",
        value: "7610000001234",
        gs1_country: "Switzerland",
        is_valid_gs1: true,
        country_match: true,
      },
      packaging_symbols: {
        veg_non_veg: "VEG",
        e_mark: {
          detected: true,
          details: "European ℮ Average Fill Mark (Packaged under EU Council Directive / LM Sched. II)",
        },
        recycling_info: {
          detected: true,
          resin_code: "21",
          material_name: "PAP (Paperboard / Aluminum Foil)",
          mobius_loop: true,
          tidyman_symbol: true,
        },
      },
    },
    bounding_boxes: [
      {
        id: "box_generic_name",
        mandate_id: "generic_name",
        label: "Generic Name",
        text: "Artisanal Dark Chocolate 70% Cocoa",
        status: "COMPLIANT",
        bbox: { x: 45, y: 35, w: 510, h: 48 },
        color: "#10b981"
      },
      {
        id: "box_net_quantity",
        mandate_id: "net_quantity",
        label: "Net Quantity",
        text: "Net Weight: 100 g",
        status: "COMPLIANT",
        bbox: { x: 45, y: 105, w: 235, h: 42 },
        color: "#10b981"
      },
      {
        id: "box_mrp",
        mandate_id: "mrp",
        label: "MRP (Missing Tax Inclusion)",
        text: "MRP ₹350.00 (Missing 'incl. of all taxes')",
        status: "WARNING",
        bbox: { x: 300, y: 105, w: 255, h: 42 },
        color: "#fbbf24"
      },
      {
        id: "box_usp_mismatch",
        mandate_id: "usp",
        label: "Mathematical USP Mismatch",
        text: "USP: ₹5.50 / g (Actual: ₹350 ÷ 100g = ₹3.50 / g)",
        status: "VIOLATION",
        bbox: { x: 45, y: 165, w: 510, h: 48 },
        color: "#f43f5e"
      },
      {
        id: "box_mfg_foreign",
        mandate_id: "mfg_address",
        label: "Missing Indian Importer Details",
        text: "Mfd in Switzerland by Alpine Chocolatier AG. [VIOLATION: No Indian Importer Address]",
        status: "VIOLATION",
        bbox: { x: 45, y: 235, w: 510, h: 58 },
        color: "#f43f5e"
      },
      {
        id: "box_consumer_care_foreign",
        mandate_id: "consumer_care",
        label: "No Indian Consumer Care",
        text: "Swiss Helpline: +41-44-211-0000 [VIOLATION: No Indian email/phone for redressal]",
        status: "VIOLATION",
        bbox: { x: 45, y: 312, w: 510, h: 50 },
        color: "#f43f5e"
      },
      {
        id: "box_country_of_origin",
        mandate_id: "country_of_origin",
        label: "Country of Origin",
        text: "Country of Origin: Switzerland",
        status: "COMPLIANT",
        bbox: { x: 45, y: 382, w: 260, h: 36 },
        color: "#10b981"
      }
    ]
  }
];
