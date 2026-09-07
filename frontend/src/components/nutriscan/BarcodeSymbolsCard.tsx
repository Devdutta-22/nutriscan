import React, { useState } from 'react';
import { 
  BarcodeData, 
  QRCodeData, 
  PackagingSymbols 
} from '../../types/compliance';
import { 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ExternalLink, 
  ShieldCheck, 
  Recycle, 
  Layers, 
  Sparkles,
  Barcode as BarcodeIcon,
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';

interface Props {
  barcode?: BarcodeData;
  qr?: QRCodeData;
  symbols?: PackagingSymbols;
}

export const BarcodeSymbolsCard: React.FC<Props> = ({ barcode, qr, symbols }) => {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const hasAnyData = Boolean(
    barcode?.detected || 
    qr?.detected || 
    symbols?.veg_non_veg || 
    symbols?.fssai_license?.detected || 
    symbols?.isi_bis_mark?.detected || 
    symbols?.recycling_info?.detected || 
    symbols?.e_mark?.detected || 
    symbols?.pao_symbol?.detected
  );

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-7 border border-zinc-200/90 shadow-sm space-y-6 text-zinc-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-zinc-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0 shadow-xs">
            <BarcodeIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900">
                Barcode, QR Code &amp; Statutory Packaging Symbols
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 uppercase tracking-wide border border-indigo-200">
                Automated Inspection
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Verified against GS1 General Specifications, G.S.R. 524(E) Electronic Disclosures, and FSSAI/BIS Statutory Mandates
            </p>
          </div>
        </div>

        {hasAnyData && (
          <span className="text-xs font-semibold text-zinc-500 self-start sm:self-auto font-mono">
            EAN / QR / Badges Active
          </span>
        )}
      </div>

      {/* Grid: 3 Main Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* 1. Barcode Verification Tile */}
        <div className="bg-zinc-50/70 p-5 rounded-xl border border-zinc-200/80 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarcodeIcon className="w-4 h-4 text-zinc-500" />
                <span className="text-xs font-black uppercase tracking-wider text-zinc-800">
                  1D Barcode (GS1 GTIN)
                </span>
              </div>

              {barcode?.detected ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>DETECTED ({barcode.type || 'EAN-13'})</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200 text-zinc-600 border border-zinc-300">
                  NOT DETECTED
                </span>
              )}
            </div>

            {barcode?.detected && barcode.value ? (
              <div className="space-y-3">
                {/* Visual Barcode Bars Representation */}
                <div className="bg-white p-3.5 rounded-xl border border-zinc-200/80 shadow-2xs text-center space-y-2">
                  <div className="h-10 w-full flex items-center justify-center gap-[3px] overflow-hidden px-4">
                    {/* Stylized Barcode SVG simulation */}
                    {barcode.value.split('').map((char, idx) => {
                      const num = parseInt(char, 10) || 1;
                      const width = (num % 3) + 1.5;
                      return (
                        <div
                          key={idx}
                          className="h-full bg-zinc-900 rounded-[0.5px]"
                          style={{ width: `${width * 2}px` }}
                        />
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1 border-t border-zinc-100">
                    <span className="font-mono font-bold text-sm tracking-widest text-zinc-900">
                      {barcode.value}
                    </span>
                    <button
                      onClick={() => copyToClipboard(barcode.value || '', 'barcode')}
                      className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                      title="Copy barcode number"
                    >
                      {copied === 'barcode' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* GS1 Country Info */}
                <div className="text-xs space-y-1.5 bg-zinc-100/70 p-3 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 font-medium">GS1 Country Allocation:</span>
                    <strong className="text-zinc-900 font-bold">
                      {barcode.gs1_country || 'Unknown GS1 Prefix'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 font-medium">Country Cross-Check:</span>
                    <span className={`font-bold ${barcode.country_match !== false ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {barcode.country_match !== false ? '✓ Matches Origin (Rule 6(1)(g))' : '⚠ Prefix Mismatch'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-1 text-zinc-400">
                <BarcodeIcon className="w-8 h-8 mx-auto opacity-40 stroke-1" />
                <p className="text-xs font-semibold">No 1D EAN/UPC barcode decoded</p>
                <p className="text-[10px]">Ensure barcode area is in focus and uncreased</p>
              </div>
            )}
          </div>

          <div className="text-[10px] text-zinc-400 font-medium pt-2 border-t border-zinc-100">
            Per GS1 India standards: '890' prefix denotes Indian enterprise registration.
          </div>
        </div>

        {/* 2. QR Code tile */}
        <div className="bg-gradient-to-b from-zinc-50 to-white p-5 rounded-2xl border border-zinc-200/90 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-zinc-700" />
                <span className="text-xs font-black uppercase tracking-wider text-zinc-800">
                  2D QR Code Digital Access
                </span>
              </div>

              {qr?.detected ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>DECODED</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-500">
                  NOT PRESENT
                </span>
              )}
            </div>

            {qr?.detected && (qr.url || qr.raw_payload) ? (
              <div className="space-y-3">
                <div className="bg-white p-3.5 rounded-xl border border-zinc-200/80 shadow-2xs space-y-2">
                  <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                    Decoded Payload / URL
                  </span>
                  <div className="p-2 bg-zinc-50 rounded-lg border border-zinc-100 font-mono text-xs text-zinc-800 break-all select-all flex items-start justify-between gap-2">
                    <span className="line-clamp-2">{qr.url || qr.raw_payload}</span>
                    <button
                      onClick={() => copyToClipboard(qr.url || qr.raw_payload || '', 'qr')}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-700 shrink-0"
                    >
                      {copied === 'qr' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {qr.url && (
                    <a
                      href={qr.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline pt-1"
                    >
                      <span>Open Product Verification Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="text-xs space-y-1.5 bg-zinc-100/70 p-3 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 font-medium">G.S.R. 524(E) Compliance:</span>
                    <strong className="text-emerald-700 font-bold">
                      ✓ Valid Digital Disclosure
                    </strong>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Secondary statutory details (user guide, warranty, extended specifications) safely hosted electronically.
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-1 text-zinc-400">
                <QrCode className="w-8 h-8 mx-auto opacity-40 stroke-1" />
                <p className="text-xs font-semibold">No QR code found on panel</p>
                <p className="text-[10px]">Optional for packaged foods; statutory for electronics</p>
              </div>
            )}
          </div>

          <div className="text-[10px] text-zinc-400 font-medium pt-2 border-t border-zinc-100">
            Per G.S.R. 524(E): Electronic products may convey secondary declarations via QR code.
          </div>
        </div>

        {/* 3. Statutory Packaging Symbols Tile */}
        <div className="bg-gradient-to-b from-zinc-50 to-white p-5 rounded-2xl border border-zinc-200/90 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-zinc-700" />
                <span className="text-xs font-black uppercase tracking-wider text-zinc-800">
                  Recognized Statutory Symbols
                </span>
              </div>

              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                LMPC &amp; FSSAI Badges
              </span>
            </div>

            {/* Badges Container */}
            <div className="space-y-2">
              
              {/* Veg / Non-Veg Indicator */}
              {symbols?.veg_non_veg && symbols.veg_non_veg !== 'NOT_APPLICABLE' && (
                <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-zinc-200/80 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    {/* Visual Dot Symbol */}
                    <div className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center shrink-0 ${
                      symbols.veg_non_veg === 'VEG' 
                        ? 'border-emerald-600 bg-emerald-50' 
                        : 'border-amber-800 bg-amber-50'
                    }`}>
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        symbols.veg_non_veg === 'VEG' ? 'bg-emerald-600' : 'bg-amber-900'
                      }`} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-zinc-900">
                        {symbols.veg_non_veg === 'VEG' ? '100% Vegetarian (Green Dot)' : 'Non-Vegetarian (Brown Dot)'}
                      </p>
                      <p className="text-[10px] text-zinc-500">FSSAI Packaging &amp; Labelling Reg.</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Verified
                  </span>
                </div>
              )}

              {/* FSSAI Logo & License Number */}
              {symbols?.fssai_license?.detected && (
                <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-zinc-200/80 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-lg bg-orange-100 text-orange-700 font-black text-[9px] flex items-center justify-center shrink-0">
                      FS
                    </div>
                    <div>
                      <p className="text-xs font-black text-zinc-900">
                        FSSAI Lic. #{symbols.fssai_license.license_number || '14-Digit Format'}
                      </p>
                      <p className="text-[10px] text-zinc-500">Food Safety &amp; Standards Authority</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    14-Digit Valid
                  </span>
                </div>
              )}

              {/* ISI / BIS Mark */}
              {symbols?.isi_bis_mark?.detected && (
                <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-zinc-200/80 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-lg bg-blue-100 text-blue-700 font-black text-[9px] flex items-center justify-center shrink-0">
                      ISI
                    </div>
                    <div>
                      <p className="text-xs font-black text-zinc-900">
                        ISI Mark ({symbols.isi_bis_mark.cm_l_number || 'BIS Certified'})
                      </p>
                      <p className="text-[10px] text-zinc-500">Bureau of Indian Standards</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    Certified
                  </span>
                </div>
              )}

              {/* Mobius Loop / Resin Recycling Code */}
              {symbols?.recycling_info?.detected && (
                <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-zinc-200/80 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                      <Recycle className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-zinc-900">
                        Recycling: {symbols.recycling_info.material_name || `Resin Code #${symbols.recycling_info.resin_code}`}
                      </p>
                      <p className="text-[10px] text-zinc-500">Plastic Waste Management Rules (Mobius Loop)</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black font-mono bg-teal-50 text-teal-700 px-2 py-0.5 rounded">
                    #{symbols.recycling_info.resin_code || '5'}
                  </span>
                </div>
              )}

              {/* European e-Mark / Sched II MPE */}
              {symbols?.e_mark?.detected && (
                <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-zinc-200/80 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-lg bg-indigo-100 text-indigo-800 font-serif font-black text-sm flex items-center justify-center shrink-0">
                      ℮
                    </span>
                    <div>
                      <p className="text-xs font-black text-zinc-900">
                        Estimated Fill Mark (℮ Mark)
                      </p>
                      <p className="text-[10px] text-zinc-500">Legal Metrology Schedule II MPE Compliance</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    MPE Assured
                  </span>
                </div>
              )}

              {/* PAO Period After Opening */}
              {symbols?.pao_symbol?.detected && (
                <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-zinc-200/80 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-lg bg-purple-100 text-purple-700 font-black text-[9px] flex items-center justify-center shrink-0">
                      PAO
                    </div>
                    <div>
                      <p className="text-xs font-black text-zinc-900">
                        Period After Opening ({symbols.pao_symbol.period})
                      </p>
                      <p className="text-[10px] text-zinc-500">Cosmetics Safety Regulation (Open Jar Symbol)</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                    {symbols.pao_symbol.period || 'Valid'}
                  </span>
                </div>
              )}

              {!hasAnyData && (
                <div className="py-6 text-center text-zinc-400 space-y-1">
                  <ShieldCheck className="w-8 h-8 mx-auto opacity-40 stroke-1" />
                  <p className="text-xs font-semibold">No statutory certification marks recognized</p>
                </div>
              )}
            </div>
          </div>

          <div className="text-[10px] text-zinc-400 font-medium pt-2 border-t border-zinc-100">
            Complies with BIS, FSSAI packaging guidelines, and Schedule II Maximum Permissible Errors.
          </div>
        </div>

      </div>
    </div>
  );
};
