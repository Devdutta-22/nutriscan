import React, { useState } from 'react';
import { Copy, Check, FileText, Sparkles, Terminal } from 'lucide-react';

interface OCRRawTextViewerProps {
  rawText?: string;
  extractedFields?: any;
}

export const OCRRawTextViewer: React.FC<OCRRawTextViewerProps> = ({
  rawText,
  extractedFields,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!rawText) return;
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#D5FF3F]" />
          <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700">
            Real OCR Token Stream
          </h4>
        </div>
        {rawText && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] font-bold text-zinc-600 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 px-2 py-1 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </button>
        )}
      </div>

      {/* Raw OCR Text Box */}
      <div className="bg-zinc-100 rounded-2xl p-4 border border-zinc-200 font-mono text-xs text-zinc-800 max-h-[220px] overflow-y-auto whitespace-pre-wrap leading-relaxed select-text shadow-inner">
        {rawText ? (
          rawText
        ) : (
          <span className="text-zinc-500 italic">
            [No direct text string captured. Scan or upload a package label to inspect optical text tokens.]
          </span>
        )}
      </div>

      {/* Extracted LMPC Key-Values Grid */}
      {extractedFields && (
        <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-sm space-y-2">
          <p className="text-[11px] font-black uppercase text-zinc-400 tracking-wider">
            Heuristic Parser Output
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-200/80">
              <span className="text-[10px] text-zinc-500 font-bold block">Generic Title</span>
              <span className="font-bold text-zinc-900 truncate block">
                {extractedFields.generic_name || 'N/A'}
              </span>
            </div>
            <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-200/80">
              <span className="text-[10px] text-zinc-500 font-bold block">Net Measure</span>
              <span className="font-bold text-zinc-900 truncate block">
                {extractedFields.net_quantity || 'N/A'}
              </span>
            </div>
            <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-200/80">
              <span className="text-[10px] text-zinc-500 font-bold block">Declared MRP</span>
              <span className="font-bold text-zinc-900 truncate block">
                {extractedFields.mrp || 'N/A'}
              </span>
            </div>
            <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-200/80">
              <span className="text-[10px] text-zinc-500 font-bold block">Printed USP</span>
              <span className="font-bold text-zinc-900 truncate block">
                {extractedFields.unit_sale_price || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
