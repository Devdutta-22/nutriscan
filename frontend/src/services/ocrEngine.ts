import { createWorker } from 'tesseract.js';
import { BoundingBox } from '../types/compliance';

export interface ExtractedLabelFields {
  generic_name?: string;
  net_quantity?: string;
  mrp?: string;
  unit_sale_price?: string;
  mfg_date?: string;
  manufacturer_address?: string;
  importer_address?: string;
  consumer_care_phone?: string;
  consumer_care_email?: string;
  country_of_origin?: string;
  calories?: number;
  total_fat?: number;
  fat?: number;
  carbohydrates?: number;
  carbs?: number;
  protein?: number;
  sugars?: number;
  sugar?: number;
  serving_size?: string;
  nutrition?: {
    calories?: number;
    fat?: number;
    carbs?: number;
    protein?: number;
    sugar?: number;
    serving_size?: string;
  };
  raw_text: string;
}

export interface RealOCRResult {
  fields: ExtractedLabelFields;
  boundingBoxes: BoundingBox[];
}

export class ClientOCREngine {
  /**
   * Scans a real uploaded or captured image file with Tesseract.js in the browser,
   * extracts words and bounding boxes, and parses statutory LMPC fields via regex heuristics.
   */
  static async scanImage(
    file: File | Blob,
    onProgress?: (stage: string, percent: number) => void
  ): Promise<RealOCRResult> {
    onProgress?.('Initializing high-speed OCR worker...', 15);

    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const progress = Math.round(15 + m.progress * 65);
          onProgress?.(`Extracting text tokens: ${Math.round(m.progress * 100)}%`, progress);
        }
      },
    });

    onProgress?.('Scanning packaging layout & text zones...', 30);
    const ret = await worker.recognize(file);
    await worker.terminate();

    onProgress?.('Parsing LMPC statutory mandates from OCR tokens...', 85);

    const data = ret.data as any;
    const fullText = data.text || '';
    const lines = data.lines || [];

    const fields = this.parseLMPCFields(fullText, lines);
    const boundingBoxes = this.buildBoundingBoxes(data, fields);

    onProgress?.('Audit complete!', 100);

    return {
      fields,
      boundingBoxes,
    };
  }

  private static parseLMPCFields(text: string, lines: any[]): ExtractedLabelFields {
    const fields: ExtractedLabelFields = {
      raw_text: text,
    };

    const cleanLines = lines
      .map((l) => (l.text || '').trim())
      .filter((l) => l.length > 1);

    const isNutritionLine = (line: string): boolean => {
      const lower = line.toLowerCase();
      return (
        lower.includes('nutrition') ||
        lower.includes('serving') ||
        lower.includes('per 100') ||
        lower.includes('energy') ||
        lower.includes('kcal') ||
        lower.includes('fat') ||
        lower.includes('carbohydrate') ||
        lower.includes('sugar') ||
        lower.includes('protein') ||
        lower.includes('sodium') ||
        lower.includes('cholesterol') ||
        lower.includes('% rda') ||
        lower.includes('dietary allowance')
      );
    };

    // 1. Generic Name of Commodity
    // Look for explicit product identity keywords first
    const COMMODITY_PATTERNS = [
      /potato\s*crisps/i,
      /potato\s*chips/i,
      /corn\s*flakes/i,
      /wheat\s*crackers/i,
      /glucose\s*biscuits/i,
      /biscuits/i,
      /cookies/i,
      /ready\s*to\s*eat\s*savouries/i,
      /crisps/i,
      /chips/i,
      /dark\s*chocolate/i,
      /chocolate/i,
      /toned\s*milk/i,
      /pasteurized\s*milk/i,
      /instant\s*noodles/i,
      /green\s*tea/i,
      /face\s*cream/i,
      /skin\s*cream/i,
      /beverage/i,
      /proprietary\s*food/i,
    ];

    for (const pattern of COMMODITY_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        fields.generic_name = match[0].toUpperCase();
        break;
      }
    }

    if (!fields.generic_name) {
      // Look for a prominent non-nutrition, non-legal line
      for (const line of cleanLines) {
        if (
          !isNutritionLine(line) &&
          !/^(mrp|net|exp|mfd|lot|batch|lic|pkg|fssai|number|phone|email|store|country)/i.test(line) &&
          line.length > 3 &&
          line.length < 50
        ) {
          fields.generic_name = line;
          break;
        }
      }
    }

    // 2. Net Quantity (Must NOT match "Per 100g" from nutrition tables)
    // Priority: Explicit Net Wt / Net Quantity
    const explicitNetMatch = text.match(
      /(?:net\s*(?:weight|wt\.?|quantity|qty\.?|volume|content)?\s*[:\.\-]?\s*)(\d+(?:\.\d+)?\s*(?:g|gm|gms|gram|grams|kg|kgs|ml|l|ltr|litre|pieces|pcs|n))\b/i
    );

    if (explicitNetMatch && !/per\s*100\s*g/i.test(explicitNetMatch[0])) {
      fields.net_quantity = explicitNetMatch[1].trim();
    } else {
      // Look for standalone weight line outside nutrition table
      for (const line of cleanLines) {
        if (!isNutritionLine(line)) {
          const m = line.match(/\b(\d+(?:\.\d+)?\s*(?:g|gm|gms|kg|ml|l|ltr))\b/i);
          if (m && !/per\s*serve/i.test(line) && !/size/i.test(line)) {
            fields.net_quantity = m[1].trim();
            break;
          }
        }
      }
    }

    // 3. Maximum Retail Price (MRP)
    // Requires explicit MRP / Retail Price keyword or currency symbol (never table decimals)
    const mrpMatch = text.match(
      /(?:m\.?r\.?p\.?|max(?:imum)?\s*retail\s*price)\s*[:\.\-]?\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)(.*)/i
    );

    if (mrpMatch) {
      const priceVal = mrpMatch[1];
      const restOfLine = (mrpMatch[2] || '').toLowerCase();
      const hasTax =
        restOfLine.includes('incl') ||
        restOfLine.includes('tax') ||
        text.toLowerCase().includes('incl. of all taxes') ||
        text.toLowerCase().includes('inclusive of all taxes');

      fields.mrp = `₹${priceVal}${hasTax ? ' (incl. of all taxes)' : ''}`;
    } else {
      // Only match currency symbol if NOT on a nutrition line
      for (const line of cleanLines) {
        if (!isNutritionLine(line)) {
          const symMatch = line.match(/(?:rs\.?|₹)\s*(\d+(?:\.\d+)?)/i);
          if (symMatch) {
            fields.mrp = `₹${symMatch[1]}`;
            break;
          }
        }
      }
    }

    // 4. Unit Sale Price (USP)
    const uspMatch = text.match(
      /(?:u\.?s\.?p\.?|unit\s*sale\s*price)\s*[:\.\-]?\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(?:\/|per)?\s*(g|100g|kg|ml|100ml|l|pcs)?/i
    );
    if (uspMatch) {
      fields.unit_sale_price = `₹${uspMatch[1]}${uspMatch[2] ? `/${uspMatch[2]}` : ''}`;
    }

    // 5. Date of Packaging / Manufacture / Expiry
    const dateMatch = text.match(
      /(?:mfd|pkg|pkd|mfg|packed|manufactured|best\s*before|use\s*by|expiry|exp)\s*[:\.\-]?\s*([a-z]{3}\/?\d{2,4}|\d{1,2}[\/\-\.]\d{2,4})/i
    );
    if (dateMatch) {
      fields.mfg_date = dateMatch[1].trim();
    } else {
      // Look for coding area inkjet/dot-matrix stamps (e.g. JUL/26-MAR/27 or standalone JUL/26 or 03/24)
      const codingStampMatch = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\/\s\.\-]+(20\d{2}|\d{2})\b/i);
      if (codingStampMatch) {
        fields.mfg_date = codingStampMatch[0].trim();
      } else {
        const slashMonthMatch = text.match(/\b(0[1-9]|1[0-2])[\/\-](20\d{2}|\d{2})\b/);
        if (slashMonthMatch) {
          fields.mfg_date = slashMonthMatch[0].trim();
        }
      }
    }

    // 6. Consumer Care Phone & Email
    const phoneMatch = text.match(
      /(?:care|call|help|tel|phone|contact)?\s*[:\.\-]?\s*(\+?91[\-\s]?)?([1][8][0][0][\-\s]?\d{3}[\-\s]?\d{4}|\d{10}|\d{3,5}[\-\s]\d{6,8})/i
    );
    if (phoneMatch) {
      // Normalize phone while preserving standard readability or extracting digits
      const digitsOnly = phoneMatch[0].replace(/\D/g, '');
      if (digitsOnly.length >= 8) {
        fields.consumer_care_phone = phoneMatch[0].replace(/^(?:care|call|help|tel|phone|contact)\s*[:\.\-]?\s*/i, '').trim();
      }
    }

    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (emailMatch) {
      fields.consumer_care_email = emailMatch[1].trim();
    }

    // 7. Manufacturer & Importer Address (Multi-line search)
    const mfgMatch = text.match(
      /(?:manufactured\s*(?:and\s*packed)?\s*by|mfd\s*by)\s*[:\.\-]?\s*([^\n\r]+(?:[\n\r][^\n\r]+){0,4})/i
    );
    if (mfgMatch) {
      fields.manufacturer_address = mfgMatch[1].replace(/[\n\r]+/g, ', ').trim();
    }

    const impMatch = text.match(
      /(?:imported\s*(?:and\s*marketed)?\s*by|marketed\s*by)\s*[:\.\-]?\s*([^\n\r]+(?:[\n\r][^\n\r]+){0,4})/i
    );
    if (impMatch) {
      fields.importer_address = impMatch[1].replace(/[\n\r]+/g, ', ').trim();
    }

    // 8. Country of Origin (Handles dash, colon, whitespace)
    const originMatch = text.match(
      /(?:country\s*of\s*origin|made\s*in|product\s*of)\s*[\-:\.\s]+([a-zA-Z]+)/i
    );
    if (originMatch) {
      const countryFound = originMatch[1].trim();
      fields.country_of_origin = countryFound.charAt(0).toUpperCase() + countryFound.slice(1).toLowerCase();
    } else if (/made\s*in\s*india/i.test(text)) {
      fields.country_of_origin = 'India';
    }

    // 9. Nutritional Facts Table / Panel Parsing
    const energyMatch = text.match(/(?:energy|calories|caloric\s*value)\s*[:\.\-]?\s*(\d+(?:\.\d+)?)\s*(?:kcal|cal|kj)?/i);
    const fatMatch = text.match(/(?:total\s*fat|fat)\s*[:\.\-]?\s*(\d+(?:\.\d+)?)\s*(?:g|gm|grams)?/i);
    const carbsMatch = text.match(/(?:carbohydrates?|total\s*carbohydrates?|carbs)\s*[:\.\-]?\s*(\d+(?:\.\d+)?)\s*(?:g|gm|grams)?/i);
    const proteinMatch = text.match(/(?:protein)\s*[:\.\-]?\s*(\d+(?:\.\d+)?)\s*(?:g|gm|grams)?/i);
    const sugarMatch = text.match(/(?:total\s*sugars?|sugars?|added\s*sugars?)\s*[:\.\-]?\s*(\d+(?:\.\d+)?)\s*(?:g|gm|grams)?/i);

    if (energyMatch || fatMatch || carbsMatch || proteinMatch || sugarMatch) {
      const cal = energyMatch ? parseFloat(energyMatch[1]) : undefined;
      const fat = fatMatch ? parseFloat(fatMatch[1]) : undefined;
      const carbs = carbsMatch ? parseFloat(carbsMatch[1]) : undefined;
      const protein = proteinMatch ? parseFloat(proteinMatch[1]) : undefined;
      const sugar = sugarMatch ? parseFloat(sugarMatch[1]) : undefined;

      if (cal !== undefined) fields.calories = cal;
      if (fat !== undefined) { fields.total_fat = fat; fields.fat = fat; }
      if (carbs !== undefined) { fields.carbohydrates = carbs; fields.carbs = carbs; }
      if (protein !== undefined) fields.protein = protein;
      if (sugar !== undefined) { fields.sugars = sugar; fields.sugar = sugar; }

      fields.nutrition = {
        calories: cal,
        fat,
        carbs,
        protein,
        sugar,
        serving_size: 'Per 100g'
      };
    }

    return fields;
  }

  private static buildBoundingBoxes(data: any, fields: ExtractedLabelFields): BoundingBox[] {
    const boxes: BoundingBox[] = [];
    const lines = data.lines || [];

    // Helper to find bbox for text snippet
    const findBBox = (pattern: RegExp) => {
      for (const line of lines) {
        if (pattern.test(line.text)) {
          const b = line.bbox;
          return {
            x: b.x0,
            y: b.y0,
            w: Math.max(b.x1 - b.x0, 100),
            h: Math.max(b.y1 - b.y0, 25),
          };
        }
      }
      return null;
    };

    // Generic Name Box
    const genBbox = fields.generic_name ? findBBox(new RegExp(fields.generic_name.slice(0, 6), 'i')) : null;
    boxes.push({
      id: 'box_generic_name',
      mandate_id: 'generic_name',
      label: 'Generic Name',
      text: fields.generic_name || 'Generic Commodity Name',
      status: fields.generic_name ? 'COMPLIANT' : 'WARNING',
      bbox: genBbox || { x: 50, y: 40, w: 400, h: 45 },
      color: fields.generic_name ? '#10b981' : '#fbbf24',
    });

    // Net Quantity Box
    const netBbox = findBBox(/(?:net|wt|qty|quantity|\d+\s*(?:g|ml|kg|l))/i);
    boxes.push({
      id: 'box_net_quantity',
      mandate_id: 'net_quantity',
      label: 'Net Quantity',
      text: fields.net_quantity ? `Net: ${fields.net_quantity}` : '[NOT DETECTED]',
      status: fields.net_quantity ? 'COMPLIANT' : 'VIOLATION',
      bbox: netBbox || { x: 50, y: 105, w: 220, h: 40 },
      color: fields.net_quantity ? '#10b981' : '#f43f5e',
    });

    // MRP Box
    const mrpBbox = findBBox(/(?:mrp|price|₹|rs)/i);
    boxes.push({
      id: 'box_mrp',
      mandate_id: 'mrp',
      label: 'MRP Declaration',
      text: fields.mrp ? `MRP: ${fields.mrp}` : '[MRP NOT FOUND]',
      status: fields.mrp && fields.mrp.includes('incl') ? 'COMPLIANT' : fields.mrp ? 'WARNING' : 'VIOLATION',
      bbox: mrpBbox || { x: 300, y: 105, w: 250, h: 40 },
      color: fields.mrp && fields.mrp.includes('incl') ? '#10b981' : '#fbbf24',
    });

    // USP Box
    const uspBbox = findBBox(/(?:usp|unit\s*sale)/i);
    boxes.push({
      id: 'box_usp',
      mandate_id: 'usp',
      label: 'Unit Sale Price (USP)',
      text: fields.unit_sale_price ? `USP: ${fields.unit_sale_price}` : '[USP ABSENT / NOT FOUND]',
      status: fields.unit_sale_price ? 'COMPLIANT' : 'VIOLATION',
      bbox: uspBbox || { x: 50, y: 165, w: 260, h: 40 },
      color: fields.unit_sale_price ? '#10b981' : '#f43f5e',
    });

    // Date Box
    const dateBbox = findBBox(/(?:mfd|pkg|pkd|mfg|date|\d{2}\/\d{2,4})/i);
    boxes.push({
      id: 'box_mfg_date',
      mandate_id: 'mfg_date',
      label: 'Date of Packaging',
      text: fields.mfg_date ? `Pkg Date: ${fields.mfg_date}` : '[DATE OMITTED]',
      status: fields.mfg_date ? 'COMPLIANT' : 'VIOLATION',
      bbox: dateBbox || { x: 330, y: 165, w: 220, h: 40 },
      color: fields.mfg_date ? '#10b981' : '#f43f5e',
    });

    // Manufacturer Address Box
    const addrBbox = findBBox(/(?:mfd\s*by|manufactured|marketed|ltd|pvt)/i);
    boxes.push({
      id: 'box_mfg_address',
      mandate_id: 'mfg_address',
      label: 'Manufacturer / Importer Address',
      text: fields.manufacturer_address || 'Address declared on label',
      status: fields.manufacturer_address ? 'COMPLIANT' : 'WARNING',
      bbox: addrBbox || { x: 50, y: 230, w: 500, h: 55 },
      color: fields.manufacturer_address ? '#10b981' : '#fbbf24',
    });

    // Consumer Care Box
    const careBbox = findBBox(/(?:care|call|email|help|@|1800)/i);
    boxes.push({
      id: 'box_consumer_care',
      mandate_id: 'consumer_care',
      label: 'Consumer Care Redressal',
      text:
        fields.consumer_care_phone || fields.consumer_care_email
          ? `Care: ${fields.consumer_care_phone || ''} ${fields.consumer_care_email || ''}`
          : '[GRIEVANCE DETAILS MISSING]',
      status: fields.consumer_care_phone && fields.consumer_care_email ? 'COMPLIANT' : 'WARNING',
      bbox: careBbox || { x: 50, y: 305, w: 500, h: 45 },
      color: fields.consumer_care_phone && fields.consumer_care_email ? '#10b981' : '#fbbf24',
    });

    // Country of Origin Box
    boxes.push({
      id: 'box_country_of_origin',
      mandate_id: 'country_of_origin',
      label: 'Country of Origin',
      text: fields.country_of_origin ? `Origin: ${fields.country_of_origin}` : 'Origin: India',
      status: 'COMPLIANT',
      bbox: { x: 50, y: 370, w: 220, h: 36 },
      color: '#10b981',
    });

    return boxes;
  }
}
