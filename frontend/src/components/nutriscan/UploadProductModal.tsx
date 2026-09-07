import React, { useState, useRef } from 'react';
import { X, UploadCloud, Image as ImageIcon, Sparkles, CheckCircle2, Loader2, ArrowRight, RefreshCw, FileText, Camera, Plus, Trash2, Layers } from 'lucide-react';
import { FairPackAPI } from '../../services/api';
import { AuditReport } from '../../types/compliance';

interface UploadProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuditComplete: (report: AuditReport) => void;
}

export const UploadProductModal: React.FC<UploadProductModalProps> = ({
  isOpen,
  onClose,
  onAuditComplete,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const addFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles).filter((f) => f.type.startsWith('image/') || f.name.endsWith('.pdf'));
    if (fileArray.length === 0) return;

    const newUrls = fileArray.map((f) => URL.createObjectURL(f));
    setSelectedFiles((prev) => [...prev, ...fileArray]);
    setPreviewUrls((prev) => [...prev, ...newUrls]);
  };

  const handleRemoveFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    if (activePreviewIndex >= index && activePreviewIndex > 0) {
      setActivePreviewIndex((prev) => prev - 1);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleRunAudit = async () => {
    if (selectedFiles.length === 0) return;

    setIsProcessing(true);
    setProgressPercent(10);
    setProcessingStage(`Reading ${selectedFiles.length} packaging panel(s)...`);

    try {
      // Execute real multi-image OCR & deterministic audit
      const report = await FairPackAPI.uploadImageAndAudit(selectedFiles, (stage, percent) => {
        setProcessingStage(stage);
        setProgressPercent(percent);
      });

      setIsProcessing(false);
      onAuditComplete(report);
      onClose();

      // Reset state
      setSelectedFiles([]);
      setPreviewUrls([]);
      setActivePreviewIndex(0);
      setProgressPercent(0);
    } catch (err) {
      console.error('Audit processing failed:', err);
      setIsProcessing(false);
      setProcessingStage('Error reading label. Please try another image.');
    }
  };

  const handleUseSample = async (svgPath: string, fileName: string) => {
    try {
      const res = await fetch(svgPath);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: 'image/svg+xml' });
      addFiles([file]);
    } catch {
      // Fallback
    }
  };

  const getPanelLabel = (idx: number) => {
    if (idx === 0) return 'Panel 1: Front Display';
    if (idx === 1) return 'Panel 2: Back / Details';
    if (idx === 2) return 'Panel 3: Side / Crimp / MRP';
    return `Panel ${idx + 1}: Packaging Detail`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#F7F5EC] border border-zinc-300 rounded-[32px] shadow-2xl overflow-hidden flex flex-col text-zinc-900">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-200/80 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0E1118] text-[#D5FF3F] flex items-center justify-center font-black shadow-sm">
              <Camera className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-zinc-900 tracking-tight leading-tight">
                  Multi-Panel Label Scanner
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#D5FF3F]/40 border border-[#D5FF3F] text-zinc-900 text-[10px] font-black uppercase tracking-wider">
                  Multi-Image
                </span>
              </div>
              <p className="text-[11px] font-semibold text-zinc-500 mt-0.5">
                Upload multiple photos (front, back, crimp, MRP stamp) to audit all panels together
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* File Input (Hidden, supports multiple) */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                addFiles(e.target.files);
                e.target.value = '';
              }
            }}
            className="hidden"
          />

          {/* Drag & Drop Zone (if no files chosen yet) */}
          {selectedFiles.length === 0 ? (
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 bg-white ${
                isDragOver
                  ? 'border-[#D5FF3F] bg-[#D5FF3F]/10 scale-[1.01]'
                  : 'border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50/80'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-[#0E1118] text-[#D5FF3F] flex items-center justify-center mb-3 shadow-md group-hover:scale-105 transition-transform">
                <UploadCloud className="w-7 h-7 stroke-[2.2]" />
              </div>

              <h4 className="font-black text-sm text-zinc-900 tracking-tight">
                Upload product packaging photos
              </h4>
              <p className="text-xs text-zinc-500 font-medium mt-1 max-w-xs">
                Select 1 or more photos. Front display, back nutrition/address, side crimp or MRP stamp.
              </p>

              <div className="flex items-center gap-2 mt-4">
                <span className="px-2.5 py-1 rounded-full bg-zinc-100 text-[10px] font-mono text-zinc-600 font-bold border border-zinc-200">
                  Select Multiple Files
                </span>
                <span className="px-2.5 py-1 rounded-full bg-zinc-100 text-[10px] font-mono text-zinc-600 font-bold border border-zinc-200">
                  PNG / JPG / WebP
                </span>
              </div>
            </div>
          ) : (
            /* Selected Files: Active Specimen + Thumbnail Gallery */
            <div className="space-y-3">
              {/* Active Image Preview Screen */}
              <div className="relative w-full h-[230px] rounded-2xl bg-black overflow-hidden border border-zinc-300 flex items-center justify-center">
                {previewUrls[activePreviewIndex] && (
                  <img
                    src={previewUrls[activePreviewIndex]}
                    alt={`Packaging Panel ${activePreviewIndex + 1}`}
                    className="w-full h-full object-contain p-2"
                  />
                )}

                {/* Panel Overlay Tag */}
                <div className="absolute top-3 left-3 px-3 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-lg">
                  <Layers className="w-3.5 h-3.5 text-[#D5FF3F]" />
                  <span>{getPanelLabel(activePreviewIndex)}</span>
                  <span className="text-zinc-400">({activePreviewIndex + 1}/{selectedFiles.length})</span>
                </div>

                {/* Scanning Laser Animation if Processing */}
                {isProcessing && (
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#D5FF3F] to-transparent shadow-[0_0_20px_#D5FF3F] animate-[bounce_1.5s_infinite]" />
                )}

                {/* Add More Button overlay */}
                {!isProcessing && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-black/75 hover:bg-black text-[#D5FF3F] text-xs font-bold backdrop-blur-sm transition-all flex items-center gap-1.5 border border-white/10"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Panel</span>
                  </button>
                )}
              </div>

              {/* Multi-Panel Thumbnail Strip */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-600 px-1">
                  <span>Uploaded Panels ({selectedFiles.length})</span>
                  <span className="text-[10px] text-zinc-400 font-medium">Click thumbnail to inspect</span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      onClick={() => setActivePreviewIndex(idx)}
                      className={`group relative shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 cursor-pointer transition-all bg-black ${
                        activePreviewIndex === idx
                          ? 'border-[#D5FF3F] shadow-[0_0_10px_rgba(213,255,63,0.5)] scale-[1.02]'
                          : 'border-zinc-300 hover:border-zinc-400 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={previewUrls[idx]}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 inset-x-0 bg-black/75 px-1 py-0.5 text-[9px] font-bold text-white truncate text-center">
                        P{idx + 1}
                      </div>

                      {/* Remove Button */}
                      {!isProcessing && (
                        <button
                          type="button"
                          onClick={(e) => handleRemoveFile(idx, e)}
                          title="Remove panel"
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                        >
                          <X className="w-3 h-3 stroke-[3]" />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Add Panel Slot */}
                  {!isProcessing && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-zinc-300 hover:border-zinc-500 bg-white hover:bg-zinc-50 flex flex-col items-center justify-center gap-1 text-zinc-600 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="text-[10px] font-bold">+ Panel</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Informative helper callout */}
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-zinc-700 space-y-1">
                <p className="font-bold text-amber-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Cross-Panel Verification Enabled</span>
                </p>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  MRP, Batch No, and Expiry are often stamped on the top/bottom crimp, while Net Qty is on the front. Gemini Multi-Vision synthesizes all {selectedFiles.length} panel(s) together.
                </p>
              </div>

              {/* Processing Progress Bar */}
              {isProcessing && (
                <div className="p-3.5 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-zinc-700 flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF2A85]" />
                      {processingStage}
                    </span>
                    <span className="text-[#FF2A85] font-mono">{progressPercent}%</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#FF2A85] to-[#D5FF3F] transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Preset Test Shortcuts */}
          {selectedFiles.length === 0 && (
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">
                Or choose test packaging specimen:
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleUseSample('/presets/compliant_biscuit.svg', 'Compliant_Biscuit_Pack.svg')}
                  className="p-2.5 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200/90 text-left transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-[#D5FF3F] inline-block mr-1" />
                  <span className="font-bold text-zinc-900 block truncate">Biscuit Pack</span>
                  <span className="text-[10px] text-zinc-500 font-mono">100% Pass</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUseSample('/presets/violating_face_cream.svg', 'Face_Cream_Missing_USP.svg')}
                  className="p-2.5 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200/90 text-left transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-[#FF2A85] inline-block mr-1" />
                  <span className="font-bold text-zinc-900 block truncate">Face Cream</span>
                  <span className="text-[10px] text-zinc-500 font-mono">No USP</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUseSample('/presets/imported_chocolate.svg', 'Swiss_Choco_Mismatch.svg')}
                  className="p-2.5 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200/90 text-left transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-[#8B5CF6] inline-block mr-1" />
                  <span className="font-bold text-zinc-900 block truncate">Swiss Choco</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Math Error</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-white border-t border-zinc-200/80 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleRunAudit}
            disabled={selectedFiles.length === 0 || isProcessing}
            className={`px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md ${
              selectedFiles.length === 0 || isProcessing
                ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                : 'bg-[#0E1118] text-[#D5FF3F] hover:bg-black active:scale-95'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#D5FF3F]" />
                <span>Auditing {selectedFiles.length} Panel(s)...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#D5FF3F]" />
                <span>
                  {selectedFiles.length > 1
                    ? `Audit All ${selectedFiles.length} Panels`
                    : 'Run Multi-Vision Audit'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
