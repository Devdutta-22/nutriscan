export type ComplianceStatus = 'COMPLIANT' | 'WARNING' | 'VIOLATION';

export interface BoundingBox {
  id: string;
  mandate_id: string;
  label: string;
  text: string;
  status: ComplianceStatus;
  bbox: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  color: string;
}

export interface GazetteCitation {
  rule: string;
  gazette_ref: string;
  verbatim_clause?: string;
  verbatim_text?: string;
  officer_guidance: string;
  penalty_rule: string;
}

export interface USPVerification {
  status: ComplianceStatus;
  is_valid: boolean;
  reason: string;
  statutory_rule: string;
  violation_code?: string;
  discrepancy?: string;
  printed?: string | null;
  calculated?: {
    expected_usp_value: number;
    expected_usp_unit: string;
    expected_display: string;
    alt_usp_value?: number | null;
    alt_usp_unit?: string | null;
    alt_display?: string | null;
    formula: string;
  };
}

export interface ChecklistItem {
  mandate_id: string;
  name: string;
  rule: string;
  status: ComplianceStatus;
  extracted_text: string;
  reason: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  citation_key?: string;
  gazette_citation?: any;
  details?: any;
}

export interface BarcodeData {
  detected: boolean;
  type?: 'EAN-13' | 'UPC-A' | 'CODE-128' | 'EAN-8' | 'OTHER';
  value?: string;
  gs1_country?: string;
  is_valid_gs1?: boolean;
  country_match?: boolean;
}

export interface QRCodeData {
  detected: boolean;
  raw_payload?: string;
  url?: string;
  is_url?: boolean;
  satisfies_electronic_disclosure?: boolean; // Rule G.S.R. 524(E)
}

export interface PackagingSymbols {
  veg_non_veg?: 'VEG' | 'NON_VEG' | 'NOT_APPLICABLE' | 'NOT_FOUND';
  fssai_license?: {
    detected: boolean;
    license_number?: string;
    is_valid_format?: boolean; // 14-digit
  };
  isi_bis_mark?: {
    detected: boolean;
    cm_l_number?: string;
  };
  recycling_info?: {
    detected: boolean;
    resin_code?: string; // e.g., '1' (PETE), '2' (HDPE), '5' (PP)
    material_name?: string;
    mobius_loop?: boolean;
    tidyman_symbol?: boolean;
  };
  e_mark?: {
    detected: boolean; // European ℮ average fill mark / LM Sched II MPE
    details?: string;
  };
  pao_symbol?: {
    detected: boolean; // Period After Opening e.g. "12M"
    period?: string;
  };
}

export interface AuditReport {
  audit_id: string;
  audit_timestamp: string;
  product_name: string;
  product_category?: string;
  legal_status: string;
  status_text?: string;
  compliance_score: number;
  corpus_version?: string;
  summary: {
    total_mandates_checked: number;
    compliant_count: number;
    warnings_count: number;
    violations_count: number;
    is_lawful_for_sale?: boolean;
  };
  checklist: ChecklistItem[];
  usp_verification: USPVerification;
  violations: ChecklistItem[];
  warnings: ChecklistItem[];
  bounding_boxes: BoundingBox[];
  image_url?: string;
  additional_image_urls?: string[];
  panel_count?: number;
  preset_id?: string;
  label_data?: any;
  is_live_upload?: boolean;
  gemini_vision_used?: boolean;
  llm_enhanced?: boolean;
  vision_provider?: string;
  raw_ocr_text?: string;
  barcode_data?: BarcodeData;
  qr_data?: QRCodeData;
  packaging_symbols?: PackagingSymbols;
  is_valid_packaging?: boolean;
  invalid_reason?: string;
}

export interface DemoPreset {
  id: string;
  title: string;
  category: string;
  description: string;
  image_url: string;
  compliance_target: string;
  expected_score: number;
  label_data: {
    generic_name: string;
    net_quantity: string;
    mrp: string;
    unit_sale_price: string;
    mfg_date: string;
    manufacturer_address: string;
    importer_address?: string;
    consumer_care_phone: string;
    consumer_care_email: string;
    country_of_origin: string;
    calories?: number;
    total_fat?: number;
    carbohydrates?: number;
    protein?: number;
    sugars?: number;
    serving_size?: string;
    nutrition?: {
      calories?: number;
      fat?: number;
      carbs?: number;
      protein?: number;
      sugar?: number;
      serving_size?: string;
    };
    barcode_data?: BarcodeData;
    qr_data?: QRCodeData;
    packaging_symbols?: PackagingSymbols;
  };
  bounding_boxes: BoundingBox[];
}

// ─── Accuracy Validation System Types ────────────────────────────────

export interface ValidationMandateResult {
  mandate_id: string;
  name: string;
  rule: string;
  engine_status: ComplianceStatus;
  engine_reason: string;
  referee_status: ComplianceStatus;
  referee_reasoning: string;
  human_verdict?: ComplianceStatus;
}

export interface MandateAccuracy {
  mandate_id: string;
  name: string;
  accuracy: number;
  tp: number;
  tn: number;
  fp: number;
  fn: number;
  total: number;
}

export interface AccuracyMetricsBlock {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  tp: number;
  tn: number;
  fp: number;
  fn: number;
  per_mandate: Record<string, MandateAccuracy>;
}

export interface AccuracyMetrics {
  total_verified: number;
  engine_metrics: AccuracyMetricsBlock;
  referee_metrics: AccuracyMetricsBlock;
}

export interface ValidationRecord {
  specimen_id: string;
  product_name?: string;
  image_url?: string;
  engine_results: ValidationMandateResult[];
  referee_results?: ValidationMandateResult[];
  human_verdicts?: Record<string, ComplianceStatus>;
  accuracy_metrics?: AccuracyMetricsBlock;
  referee_model?: string;
  human_verified_by?: string;
  created_at?: string;
  updated_at?: string;
}

