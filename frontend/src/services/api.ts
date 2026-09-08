import { AuditReport, DemoPreset, ChecklistItem, BoundingBox } from '../types/compliance';
import { DEMO_PRESETS } from '../data/demoPresets';
import { STATUTORY_RULES } from '../data/gazetteRules';
import { ClientMathEngine } from './mathEngine';
import { ClientOCREngine, RealOCRResult } from './ocrEngine';
import { ClientBarcodeEngine } from './barcodeEngine';

const API_BASE = '/api';

export class FairPackAPI {
  static async getStoredSpecimens(limit: number = 50): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/audit/specimens?limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        return data.specimens || [];
      }
    } catch {
      // Fallback
    }
    return [];
  }

  static async deleteStoredSpecimen(specimenId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/audit/specimens/${specimenId}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  static async getPresets(): Promise<DemoPreset[]> {
    try {
      const res = await fetch(`${API_BASE}/audit/presets`);
      if (res.ok) {
        const data = await res.json();
        return data.presets;
      }
    } catch {
      // Fallback to local
    }
    return DEMO_PRESETS;
  }

  static async runAudit(
    presetId?: string,
    labelData?: any,
    productName?: string,
    boundingBoxes?: any[]
  ): Promise<AuditReport> {
    try {
      const res = await fetch(`${API_BASE}/audit/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset_id: presetId,
          product_name: productName,
          label_data: labelData,
          bounding_boxes: boundingBoxes,
        }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Backend not reached, run client-side synthesis
    }

    return this.synthesizeClientReport(presetId, labelData, productName, boundingBoxes);
  }

  /**
   * Real label scan & audit:
   * 1. Runs optical character recognition (OCR) via ClientOCREngine in the browser/worker.
   * 2. Tries to send to backend /api/audit/run with real extracted tokens.
   * 3. Runs deterministic mathematical audit on extracted MRP, Net Qty & USP.
   */
  static async uploadImageAndAudit(
    fileOrFiles: File | File[],
    onProgress?: (stage: string, percent: number) => void
  ): Promise<AuditReport> {
    const files = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
    const primaryFile = files[0];
    const previewUrl = URL.createObjectURL(primaryFile);

    try {
      // 1. Send all image files to backend multimodal vision pipeline
      const panelLabel = files.length > 1 ? ` (${files.length} panels)` : '';
      onProgress?.(`Sending ${files.length} panel image(s) to Gemini Vision & Statutory RAG...`, 25);
      
      // Also concurrently scan with native browser BarcodeDetector API if available
      const localCodeDetectionPromise = ClientBarcodeEngine.detectCodes(primaryFile).catch(() => ({
        barcode: { detected: false },
        qr: { detected: false },
      }));

      try {
        const formData = new FormData();
        for (const f of files) {
          formData.append('files', f);
        }
        formData.append('product_name', primaryFile.name.replace(/\.[^/.]+$/, '') + panelLabel);
        formData.append('product_category', 'food');

        const uploadRes = await fetch(`${API_BASE}/audit/upload`, {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const report = await uploadRes.json();
          // Use permanent image_url from backend if returned, else local preview
          if (!report.image_url) {
            report.image_url = previewUrl;
          }
          if (!report.additional_image_urls || report.additional_image_urls.length === 0) {
            report.additional_image_urls = files.slice(1).map((f) => URL.createObjectURL(f));
          }

          // Merge local browser barcode/QR detection if backend didn't pick it up
          const localCodes = await localCodeDetectionPromise;
          if (localCodes.barcode?.detected && !report.barcode_data?.detected) {
            report.barcode_data = localCodes.barcode;
          }
          if (localCodes.qr?.detected && !report.qr_data?.detected) {
            report.qr_data = localCodes.qr;
          }

          onProgress?.('Audit complete & specimen stored permanently!', 100);
          return report;
        }
      } catch (uploadErr) {
        console.warn('Backend multi-image upload failed, falling back to local OCR:', uploadErr);
      }

      // 2. Client-side OCR fallback on primary image if backend is unreachable
      onProgress?.('Initializing client-side OCR fallback...', 40);
      const [ocrResult, localCodes] = await Promise.all([
        ClientOCREngine.scanImage(primaryFile, onProgress),
        localCodeDetectionPromise,
      ]);

      const parsedSymbols = ClientBarcodeEngine.parseSymbolsFromText(ocrResult.fields.raw_text || '');

      // Try /api/audit/run with client extracted tokens
      try {
        const res = await fetch(`${API_BASE}/audit/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_name: ocrResult.fields.generic_name || primaryFile.name.replace(/\.[^/.]+$/, ''),
            label_data: {
              ...ocrResult.fields,
              barcode_data: localCodes.barcode?.detected ? localCodes.barcode : undefined,
              qr_data: localCodes.qr?.detected ? localCodes.qr : undefined,
              packaging_symbols: parsedSymbols,
            },
            bounding_boxes: ocrResult.boundingBoxes,
          }),
        });

        if (res.ok) {
          const report = await res.json();
          report.image_url = previewUrl;
          report.raw_ocr_text = ocrResult.fields.raw_text;
          if (!report.barcode_data && localCodes.barcode?.detected) {
            report.barcode_data = localCodes.barcode;
          }
          if (!report.qr_data && localCodes.qr?.detected) {
            report.qr_data = localCodes.qr;
          }
          if (!report.packaging_symbols) {
            report.packaging_symbols = parsedSymbols;
          }
          return report;
        }
      } catch {
        // Fallback to client synthesis
      }

      // 3. Deterministic client synthesis using real extracted values
      const clientReport = this.synthesizeClientReport(
        undefined,
        {
          ...ocrResult.fields,
          barcode_data: localCodes.barcode,
          qr_data: localCodes.qr,
          packaging_symbols: parsedSymbols,
        },
        ocrResult.fields.generic_name || primaryFile.name.replace(/\.[^/.]+$/, ''),
        ocrResult.boundingBoxes,
        true
      );

      clientReport.image_url = previewUrl;
      clientReport.raw_ocr_text = ocrResult.fields.raw_text;
      clientReport.barcode_data = localCodes.barcode;
      clientReport.qr_data = localCodes.qr;
      clientReport.packaging_symbols = parsedSymbols;
      return clientReport;
    } catch (err) {
      console.warn('OCR error, falling back to heuristic parsing:', err);
      return this.synthesizeClientReport(undefined, undefined, primaryFile.name, undefined, true);
    }
  }

  static synthesizeClientReport(
    presetId?: string,
    data?: any,
    name?: string,
    boxes?: any[],
    isLiveUpload?: boolean
  ): AuditReport {
    const preset = DEMO_PRESETS.find((p) => p.id === presetId) || DEMO_PRESETS[0];
    const labelData = isLiveUpload ? (data || {}) : (data || preset.label_data);
    const productName = name || (isLiveUpload ? 'Scanned Packaging Specimen' : preset.title);
    const boundingBoxes = boxes || (isLiveUpload ? [] : preset.bounding_boxes);

    const uspVerification = ClientMathEngine.verifyUsp(
      labelData.mrp,
      labelData.net_quantity,
      labelData.unit_sale_price
    );
    const hasUspBaseData = Boolean(labelData.mrp && labelData.net_quantity);
    const resolvedUspStatus = hasUspBaseData ? uspVerification.status : 'VIOLATION';
    const resolvedUspReason = hasUspBaseData 
      ? uspVerification.reason 
      : 'MRP and/or Net Quantity missing from packaging; Unit Sale Price (USP) cannot be computed or verified.';

    const checklist: ChecklistItem[] = [
      {
        mandate_id: 'generic_name',
        name: 'Generic Commodity Name',
        rule: 'Rule 6(1)(b)',
        status: labelData.generic_name ? 'COMPLIANT' : 'VIOLATION',
        extracted_text: labelData.generic_name || '[NOT FOUND]',
        reason: labelData.generic_name
          ? `Standard generic title '${labelData.generic_name}' identified on principal display panel.`
          : 'Generic or common name is missing or obscured on front packaging.',
        severity: 'HIGH',
        citation_key: 'rule_6_1_b',
        gazette_citation: STATUTORY_RULES.find((r) => r.id === 'rule_6_1_b'),
      },
      {
        mandate_id: 'net_quantity',
        name: 'Net Quantity in Standard Units',
        rule: 'Rule 6(1)(c)',
        status: labelData.net_quantity ? 'COMPLIANT' : 'VIOLATION',
        extracted_text: labelData.net_quantity || '[NOT FOUND]',
        reason: labelData.net_quantity
          ? `Net content declared in legal SI units: ${labelData.net_quantity}.`
          : 'Net quantity declaration missing or using non-standard units (e.g. absent metric measure).',
        severity: 'HIGH',
        citation_key: 'rule_6_1_c',
        gazette_citation: STATUTORY_RULES.find((r) => r.id === 'rule_6_1_c'),
      },
      {
        mandate_id: 'mrp',
        name: 'Maximum Retail Price (Incl. of all taxes)',
        rule: 'Rule 6(1)(d)',
        status:
          labelData.mrp && /incl/i.test(labelData.mrp)
            ? 'COMPLIANT'
            : labelData.mrp
            ? 'WARNING'
            : 'VIOLATION',
        extracted_text: labelData.mrp || '[NOT FOUND]',
        reason:
          labelData.mrp && /incl/i.test(labelData.mrp)
            ? `MRP explicitly includes all statutory taxes: ${labelData.mrp}.`
            : labelData.mrp
            ? "MRP declared without mandatory 'inclusive of all taxes' or 'incl. of all taxes' clause."
            : 'MRP declaration is completely absent on the package.',
        severity: 'HIGH',
        citation_key: 'rule_6_1_d',
        gazette_citation: STATUTORY_RULES.find((r) => r.id === 'rule_6_1_d'),
      },
      {
        mandate_id: 'usp',
        name: 'Unit Sale Price (USP)',
        rule: 'Rule 6(1)(s)',
        status: resolvedUspStatus,
        extracted_text: labelData.unit_sale_price || '[NOT FOUND]',
        reason: resolvedUspReason,
        severity: resolvedUspStatus === 'VIOLATION' ? 'CRITICAL' : 'LOW',
        details: uspVerification,
        citation_key: 'rule_6_1_s',
        gazette_citation: STATUTORY_RULES.find((r) => r.id === 'rule_6_1_s'),
      },
      {
        mandate_id: 'mfg_date',
        name: 'Date of Manufacture / Packing',
        rule: 'Rule 6(1)(e)',
        status: labelData.mfg_date ? 'COMPLIANT' : 'VIOLATION',
        extracted_text: labelData.mfg_date || '[NOT FOUND]',
        reason: labelData.mfg_date
          ? `Packaging date valid: ${labelData.mfg_date}.`
          : 'Month and year of manufacture or packaging is missing.',
        severity: 'HIGH',
        citation_key: 'rule_6_1_e',
        gazette_citation: STATUTORY_RULES.find((r) => r.id === 'rule_6_1_e'),
      },
      {
        mandate_id: 'mfg_address',
        name: 'Manufacturer / Importer Address with PIN Code',
        rule: 'Rule 6(1)(a)',
        status:
          labelData.manufacturer_address && /\d{6}/.test(labelData.manufacturer_address)
            ? 'COMPLIANT'
            : labelData.manufacturer_address
            ? 'WARNING'
            : 'VIOLATION',
        extracted_text: labelData.manufacturer_address || '[NOT FOUND]',
        reason:
          labelData.manufacturer_address && /\d{6}/.test(labelData.manufacturer_address)
            ? 'Complete manufacturer/importer address with postal PIN code verified.'
            : labelData.manufacturer_address
            ? 'Address declared but postal PIN code is missing.'
            : 'Manufacturer or registered Indian importer address is missing.',
        severity: 'HIGH',
        citation_key: 'rule_6_1_a',
        gazette_citation: STATUTORY_RULES.find((r) => r.id === 'rule_6_1_a'),
      },
      {
        mandate_id: 'consumer_care',
        name: 'Consumer Care (Email & Helpline)',
        rule: 'Rule 6(1)(h)',
        status:
          labelData.consumer_care_email && labelData.consumer_care_phone
            ? 'COMPLIANT'
            : labelData.consumer_care_email || labelData.consumer_care_phone
            ? 'WARNING'
            : 'VIOLATION',
        extracted_text: `Phone: ${labelData.consumer_care_phone || 'None'} | Email: ${labelData.consumer_care_email || 'None'}`,
        reason:
          labelData.consumer_care_email && labelData.consumer_care_phone
            ? 'Both telephone and email address present for consumer redressal.'
            : labelData.consumer_care_email || labelData.consumer_care_phone
            ? 'Consumer care incomplete (either phone or email address is missing).'
            : 'Consumer care contact details completely missing.',
        severity: 'HIGH',
        citation_key: 'rule_6_1_h',
        gazette_citation: STATUTORY_RULES.find((r) => r.id === 'rule_6_1_h'),
      },
      {
        mandate_id: 'country_of_origin',
        name: 'Country of Origin',
        rule: 'Rule 6(1)(g)',
        status: labelData.country_of_origin ? 'COMPLIANT' : 'VIOLATION',
        extracted_text: labelData.country_of_origin || '[NOT FOUND]',
        reason: labelData.country_of_origin
          ? `Country of origin explicitly declared: ${labelData.country_of_origin}.`
          : 'Country of origin is not declared on the package.',
        severity: 'HIGH',
        citation_key: 'rule_6_1_g',
        gazette_citation: STATUTORY_RULES.find((r) => r.id === 'rule_6_1_g'),
      },
      {
        mandate_id: 'best_before',
        name: 'Best Before / Expiry Date',
        rule: 'Rule 6(1)(f)',
        status: labelData.expiry_date || labelData.best_before ? 'COMPLIANT' : 'VIOLATION',
        extracted_text: labelData.expiry_date || labelData.best_before || '[NOT DECLARED]',
        reason: labelData.expiry_date || labelData.best_before
          ? `Best before / use-by date present: ${labelData.expiry_date || labelData.best_before}.`
          : 'Best before / expiry date or shelf life declaration is absent.',
        severity: 'HIGH',
        citation_key: 'rule_6_1_f',
        gazette_citation: STATUTORY_RULES.find((r) => r.id === 'rule_6_1_f'),
      },
      {
        mandate_id: 'language',
        name: 'Language Compliance',
        rule: 'Rule 9(4)',
        status:
          labelData.language_detected && /english|hindi/i.test(labelData.language_detected)
            ? 'COMPLIANT'
            : !labelData.raw_text && !labelData.generic_name
            ? 'VIOLATION'
            : labelData.language_detected
            ? 'VIOLATION'
            : 'WARNING',
        extracted_text: labelData.language_detected || (labelData.raw_text ? 'Unknown' : '[NO TEXT DETECTED]'),
        reason:
          labelData.language_detected && /english|hindi/i.test(labelData.language_detected)
            ? 'Mandatory declarations verified in official statutory language (English/Hindi).'
            : !labelData.raw_text && !labelData.generic_name
            ? 'No legible text detected on the image to verify statutory language.'
            : 'Declarations appear to be in an unauthorized language.',
        severity: 'HIGH',
        citation_key: 'rule_9_4',
        gazette_citation: STATUTORY_RULES.find((r) => r.id === 'rule_9_4'),
      },
      {
        mandate_id: 'dual_mrp',
        name: 'Dual MRP Detection',
        rule: 'Rule 18(2A)',
        status:
          Array.isArray(labelData.mrp_values) && labelData.mrp_values.length > 1
            ? 'VIOLATION'
            : !labelData.mrp
            ? 'VIOLATION'
            : 'COMPLIANT',
        extracted_text: labelData.mrp || '[NO MRP DETECTED]',
        reason:
          Array.isArray(labelData.mrp_values) && labelData.mrp_values.length > 1
            ? 'Dual MRP detected on same product unit, strictly prohibited by Rule 18(2A).'
            : !labelData.mrp
            ? 'No retail price detected on package to verify pricing consistency.'
            : 'Uniform single pricing verified. No dual pricing detected.',
        severity: 'CRITICAL',
        citation_key: 'rule_18_2a',
        gazette_citation: STATUTORY_RULES.find((r) => r.id === 'rule_18_2a'),
      },
    ];

    const violations = checklist.filter((c) => c.status === 'VIOLATION');
    const warnings = checklist.filter((c) => c.status === 'WARNING');
    const compliant = checklist.filter((c) => c.status === 'COMPLIANT');

    // Calculate score
    let score = Math.round((compliant.length / checklist.length) * 100);
    if (violations.some((v) => v.mandate_id === 'usp')) {
      score = Math.min(score, 65);
    }

    return {
      audit_id: `AUD-${Date.now().toString(36).toUpperCase()}`,
      product_name: productName,
      audit_timestamp: new Date().toISOString(),
      compliance_score: score,
      legal_status:
        violations.length === 0 && warnings.length === 0
          ? 'FULLY COMPLIANT'
          : violations.length === 0
          ? 'PARTIALLY COMPLIANT (WARNINGS)'
          : 'STATUTORY NON-COMPLIANCE (RULE 32)',
      summary: {
        total_mandates_checked: checklist.length,
        compliant_count: compliant.length,
        violations_count: violations.length,
        warnings_count: warnings.length,
      },
      checklist,
      usp_verification: uspVerification,
      violations,
      warnings,
      bounding_boxes: boundingBoxes,
      image_url: preset.image_url,
      label_data: labelData,
      is_live_upload: isLiveUpload,
      barcode_data: labelData.barcode_data,
      qr_data: labelData.qr_data,
      packaging_symbols: labelData.packaging_symbols,
    };
  }
}
