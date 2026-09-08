import { BarcodeData, QRCodeData, PackagingSymbols } from '../types/compliance';

export class ClientBarcodeEngine {
  /**
   * Scans an image File/Blob for 1D Barcodes (EAN-13, UPC-A, Code 128)
   * and 2D QR Codes using the browser's hardware-accelerated BarcodeDetector API.
   * Gracefully returns empty detection if not supported by browser.
   */
  static async detectCodes(file: File | Blob): Promise<{
    barcode?: BarcodeData;
    qr?: QRCodeData;
  }> {
    const result: { barcode?: BarcodeData; qr?: QRCodeData } = {
      barcode: { detected: false },
      qr: { detected: false },
    };

    // Check if window.BarcodeDetector is natively supported in the browser
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const BarcodeDetectorClass = (window as any).BarcodeDetector;
        const formats = await BarcodeDetectorClass.getSupportedFormats();
        
        const detector = new BarcodeDetectorClass({
          formats: formats.length > 0 ? formats : ['ean_13', 'upc_a', 'code_128', 'qr_code'],
        });

        const imageBitmap = await createImageBitmap(file);
        let barcodes = await detector.detect(imageBitmap);

        // Pass 2: If nothing detected, run an Inverted pass (critical for white QR codes / light text on dark wrappers)
        if (barcodes.length === 0 && typeof document !== 'undefined') {
          try {
            const offscreen = document.createElement('canvas');
            offscreen.width = imageBitmap.width;
            offscreen.height = imageBitmap.height;
            const offCtx = offscreen.getContext('2d');
            if (offCtx) {
              offCtx.filter = 'invert(1) contrast(1.4)';
              offCtx.drawImage(imageBitmap, 0, 0);
              const invertedBitmap = await createImageBitmap(offscreen);
              barcodes = await detector.detect(invertedBitmap);
            }
          } catch (invErr) {
            // Non-blocking fallback
          }
        }

        for (const item of barcodes) {
          const rawVal = item.rawValue || '';
          const format = (item.format || '').toLowerCase();

          if (format.includes('qr')) {
            const isUrl = /^https?:\/\//i.test(rawVal);
            result.qr = {
              detected: true,
              raw_payload: rawVal,
              url: isUrl ? rawVal : undefined,
              is_url: isUrl,
              satisfies_electronic_disclosure: true,
            };
          } else {
            const type = format.includes('ean_13')
              ? 'EAN-13'
              : format.includes('upc')
              ? 'UPC-A'
              : format.includes('128')
              ? 'CODE-128'
              : 'OTHER';

            let gs1Country = 'Unknown';
            if (rawVal.startsWith('890')) {
              gs1Country = 'India';
            } else if (/^(690|691|692|693|694|695)/.test(rawVal)) {
              gs1Country = 'China';
            } else if (/^(00|01|02|03|04|05|06|07|08|09|10|11|12|13)/.test(rawVal)) {
              gs1Country = 'USA / Canada';
            } else if (/^(40|41|42|43|44)/.test(rawVal)) {
              gs1Country = 'Germany';
            } else if (/^(50)/.test(rawVal)) {
              gs1Country = 'United Kingdom';
            }

            result.barcode = {
              detected: true,
              type,
              value: rawVal,
              gs1_country: gs1Country,
              is_valid_gs1: rawVal.length === 13 || rawVal.length === 12,
              country_match: gs1Country === 'India',
            };
          }
        }
      } catch (err) {
        console.warn('Native BarcodeDetector encountered an issue:', err);
      }
    }

    return result;
  }

  /**
   * Parses OCR text for statutory packaging symbols (FSSAI 14-digit, ISI/BIS, Veg/Non-Veg keywords, Recycling code, etc.)
   */
  static parseSymbolsFromText(text: string): PackagingSymbols {
    const symbols: PackagingSymbols = {};

    // 1. Dietary Veg / Non-Veg
    const lower = text.toLowerCase();
    if (lower.includes('non-vegetarian') || lower.includes('non veg') || lower.includes('nonveg')) {
      symbols.veg_non_veg = 'NON_VEG';
    } else if (
      lower.includes('vegetarian') ||
      lower.includes('100% veg') ||
      lower.includes('green dot') ||
      lower.includes('pure veg')
    ) {
      symbols.veg_non_veg = 'VEG';
    }

    // 2. FSSAI License Number (14 digits starting with 1 or 2)
    const fssaiMatch = text.match(/(?:fssai|lic(?:ence)?\.?\s*(?:no\.?)?)\s*[:\.\-]?\s*([12]\d{13})/i);
    if (fssaiMatch) {
      symbols.fssai_license = {
        detected: true,
        license_number: fssaiMatch[1].trim(),
        is_valid_format: true,
      };
    } else {
      const any14Digit = text.match(/\b(1\d{13}|2\d{13})\b/);
      if (any14Digit) {
        symbols.fssai_license = {
          detected: true,
          license_number: any14Digit[1].trim(),
          is_valid_format: true,
        };
      }
    }

    // 3. ISI / BIS Certification Mark
    const isiMatch = text.match(/(?:isi|bis|is\s*\/?\s*iso)\s*[:\.\-]?\s*(?:cm\s*\/\s*l[\s\-:]*(\d{7,10}))?/i);
    if (isiMatch) {
      symbols.isi_bis_mark = {
        detected: true,
        cm_l_number: isiMatch[1] ? `CM/L-${isiMatch[1]}` : undefined,
      };
    }

    // 4. Recycling Mobius Loop & Resin Code
    const resinMatch = text.match(/(?:pet|pete|hdpe|pvc|ldpe|pp|ps|other)\s*(?:[-#\s]*([1-7]))?/i);
    const codeMatch = text.match(/\b(?:code|recycle)\s*[:\.\-]?\s*([1-7])\b/i);
    if (resinMatch || codeMatch) {
      const resinCode = resinMatch?.[1] || codeMatch?.[1] || '5';
      const resinNames: Record<string, string> = {
        '1': 'PETE (Polyethylene Terephthalate)',
        '2': 'HDPE (High-Density Polyethylene)',
        '3': 'PVC (Polyvinyl Chloride)',
        '4': 'LDPE (Low-Density Polyethylene)',
        '5': 'PP (Polypropylene)',
        '6': 'PS (Polystyrene)',
        '7': 'OTHER (Multi-layered Plastic)',
      };
      symbols.recycling_info = {
        detected: true,
        resin_code: resinCode,
        material_name: resinNames[resinCode] || 'Recyclable Plastic',
        mobius_loop: true,
        tidyman_symbol: lower.includes('keep your city clean') || lower.includes('dispose properly'),
      };
    }

    // 5. European ℮ Average Fill Mark (Schedule II MPE indicator)
    if (text.includes('℮') || /\b[e]\s*(?:mark)?\b/i.test(text)) {
      symbols.e_mark = {
        detected: true,
        details: 'European ℮ Average Fill Mark (Conforms to Legal Metrology Sched. II MPE Standards)',
      };
    }

    // 6. Period After Opening (PAO) for cosmetics
    const paoMatch = text.match(/\b(\d{1,2})\s*M\b/);
    if (paoMatch && (lower.includes('cosmetic') || lower.includes('lotion') || lower.includes('cream'))) {
      symbols.pao_symbol = {
        detected: true,
        period: `${paoMatch[1]} Months`,
      };
    }

    return symbols;
  }
}
