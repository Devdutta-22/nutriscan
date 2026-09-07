import React, { useState, useRef } from 'react';
import { 
  UploadCloud, X, Sparkles, CheckCircle2, AlertTriangle, 
  Layers, Camera, ArrowRight, Loader2, Plus, Trash2, Database, ShieldCheck
} from 'lucide-react';
import { AuditReport } from '../../types/compliance';
import { FairPackAPI } from '../../services/api';

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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const addFiles = (newFiles: FileList | File[]) => {
    const validFiles: File[] = [];
    const validUrls: string[] = [];

    Array.from(newFiles).forEach((file) => {
      // Allow up to 5 panel images per specimen
      if (validFiles.length + selectedFiles.length < 5) {
        if (file.type.startsWith('image/') || file.type === 'application/pdf') {
          validFiles.push(file);
          validUrls.push(URL.createObjectURL(file));
        }
      }
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    setPreviewUrls((prev) => [...prev, ...validUrls]);
  };

  const removeFile = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== idx));
    if (activePreviewIndex >= idx && activePreviewIndex > 0) {
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
      // Execute real multi-image OCR & deterministic audit, permanently saved in DB
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
    if (idx === 1) return 'Panel 2: Back / Declarations';
    if (idx === 2) return 'Panel 3: Side Crimp / MRP';
    return `Panel ${idx + 1}: Packaging Detail`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#111827] border border-slate-800 rounded-[32px] shadow-2xl overflow-hidden flex flex-col text-slate-100">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-[#0B0F17]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-black shadow-xs">
              <Camera className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white tracking-tight leading-tight">
                  Upload Specimen Photos
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1">
                  <Database className="w-2.5 h-2.5" />
                  <span>Permanent DB</span>
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                Saved permanently in database & immediately visible on Home dashboard
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#161F30] hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-slate-700/60"
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
              className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 bg-[#0E1524] ${
                isDragOver
                  ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
                  : 'border-slate-700 hover:border-cyan-500/50 hover:bg-[#161F30]'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-[#111827] border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-3 shadow-md">
                <UploadCloud className="w-7 h-7 stroke-[2.2]" />
              </div>

              <h4 className="font-black text-sm text-white tracking-tight">
                Upload product packaging photos
              </h4>
              <p className="text-xs text-slate-400 font-mono mt-1 max-w-xs">
                Select 1 or more photos. Front display, back nutrition/address, side crimp or MRP stamp.
              </p>

              <div className="flex items-center gap-2 mt-4">
                <span className="px-2.5 py-1 rounded-full bg-[#161F30] text-[10px] font-mono text-cyan-300 font-bold border border-slate-700">
                  Multiple Panels (1-5)
                </span>
                <span className="px-2.5 py-1 rounded-full bg-[#161F30] text-[10px] font-mono text-slate-300 font-bold border border-slate-700">
                  PNG / JPG / WebP
                </span>
              </div>

              {/* Permanent storage badge notice */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-[10px] font-mono text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Uploaded images & audit results are stored permanently into the database.</span>
              </div>
            </div>
          ) : (
            /* Selected Files: Active Specimen + Thumbnail Gallery */
            <div className="space-y-3">
              {/* Active Image Preview Screen */}
              <div className="relative w-full h-[230px] rounded-2xl bg-black overflow-hidden border border-slate-700 flex items-center justify-center">
                {previewUrls[activePreviewIndex] && (
                  <img
                    src={previewUrls[activePreviewIndex]}
                    alt={`Packaging Panel ${activePreviewIndex + 1}`}
                    className="w-full h-full object-contain p-2"
                  />
                )}

                {/* Panel Overlay Tag */}
                <div className="absolute top-3 left-3 px-3 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 text-white text-[11px] font-mono font-bold flex items-center gap-1.5 shadow-lg">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{getPanelLabel(activePreviewIndex)}</span>
                  <span className="text-slate-400">({activePreviewIndex + 1}/{selectedFiles.length})</span>
                </div>

                {/* Scanning Laser Animation if Processing */}
                {isProcessing && (
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_#06b6d4] animate-[bounce_1.5s_infinite]" />
                )}

                {/* Add More Button overlay */}
                {!isProcessing && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-black/75 hover:bg-black text-cyan-400 text-xs font-mono font-bold backdrop-blur-sm transition-all flex items-center gap-1.5 border border-white/10"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Panel</span>
                  </button>
                )}
              </div>

              {/* Multi-Panel Thumbnail Strip */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold font-mono text-slate-400 px-1">
                  <span>Uploaded Panels ({selectedFiles.length})</span>
                  <span className="text-[10px] text-slate-500 font-medium">Click thumbnail to inspect</span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      onClick={() => setActivePreviewIndex(idx)}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden cursor-pointer border-2 shrink-0 transition-all ${
                        activePreviewIndex === idx
                          ? 'border-cyan-400 ring-2 ring-cyan-500/20 scale-105'
                          : 'border-slate-700 opacity-70 hover:opacity-100 hover:border-slate-500'
                      }`}
                    >
                      <img
                        src={previewUrls[idx]}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0 inset-x-0 text-center bg-black/70 text-[9px] font-mono text-white py-0.5">
                        P{idx + 1}
                      </span>
                      {!isProcessing && (
                        <button
                          onClick={(e) => removeFile(idx, e)}
                          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] hover:scale-110 transition-transform"
                          title="Remove image"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Processing Progress Bar & Status */}
              {isProcessing && (
                <div className="p-3.5 rounded-2xl bg-[#0E1524] border border-cyan-500/30 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      {processingStage}
                    </span>
                    <span className="text-slate-400 font-mono font-bold">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Demo Samples for Testing */}
          {selectedFiles.length === 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-500 tracking-wider">
                Or test with sample packaging labels:
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleUseSample('/presets/compliant_biscuit.svg', 'Digestive_Biscuit_Compliant.svg')}
                  className="p-2.5 rounded-xl bg-[#161F30] hover:bg-[#1e2d44] border border-slate-800 text-left transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block mr-1" />
                  <span className="font-bold text-slate-200 block truncate">Biscuit Pack</span>
                  <span className="text-[10px] text-slate-500 font-mono">100% Pass</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUseSample('/presets/violating_face_cream.svg', 'Face_Cream_Missing_USP.svg')}
                  className="p-2.5 rounded-xl bg-[#161F30] hover:bg-[#1e2d44] border border-slate-800 text-left transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-400 inline-block mr-1" />
                  <span className="font-bold text-slate-200 block truncate">Face Cream</span>
                  <span className="text-[10px] text-slate-500 font-mono">No USP</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUseSample('/presets/imported_chocolate.svg', 'Swiss_Choco_Mismatch.svg')}
                  className="p-2.5 rounded-xl bg-[#161F30] hover:bg-[#1e2d44] border border-slate-800 text-left transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block mr-1" />
                  <span className="font-bold text-slate-200 block truncate">Swiss Choco</span>
                  <span className="text-[10px] text-slate-500 font-mono">Math Error</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-[#0B0F17] border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2.5 rounded-2xl bg-[#161F30] hover:bg-slate-800 text-slate-300 font-bold text-xs transition-colors border border-slate-700/60"
          >
            Cancel
          </button>

          <button
            onClick={handleRunAudit}
            disabled={selectedFiles.length === 0 || isProcessing}
            className={`px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md ${
              selectedFiles.length === 0 || isProcessing
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 hover:opacity-90 active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Auditing & Saving to DB...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>
                  {selectedFiles.length > 1
                    ? `Audit & Store ${selectedFiles.length} Panels`
                    : 'Audit & Store In Database'}
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
