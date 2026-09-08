import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Sparkles, RefreshCw, Zap, CheckCircle2, UploadCloud, Video, SwitchCamera, Plus, Trash2, Layers } from 'lucide-react';
import { AuditReport } from '../../types/compliance';
import { FairPackAPI } from '../../services/api';

interface LiveScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (presetId: string) => void;
  onAuditComplete?: (report: AuditReport) => void;
  onFileUpload: (file: File) => void;
}

export const LiveScannerModal: React.FC<LiveScannerModalProps> = ({
  isOpen,
  onClose,
  onScanComplete,
  onAuditComplete,
  onFileUpload,
}) => {
  const [useRealCamera, setUseRealCamera] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingStage, setAnalyzingStage] = useState('Position packaging inside frame');
  const [selectedPreset, setSelectedPreset] = useState<string>('compliant-biscuit');
  const [capturedPanels, setCapturedPanels] = useState<{ file: File; url: string }[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize real device camera stream if requested
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isOpen && useRealCamera) {
      navigator.mediaDevices
        ?.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch((err) => {
          console.warn('Camera access denied or unavailable:', err);
          setUseRealCamera(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, useRealCamera]);

  if (!isOpen) return null;

  const snapCurrentFrame = (): Promise<File | null> => {
    return new Promise((resolve) => {
      if (!videoRef.current) return resolve(null);
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return resolve(null);
        const panelNumber = capturedPanels.length + 1;
        const file = new File([blob], `Panel_${panelNumber}_Camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
        resolve(file);
      }, 'image/jpeg', 0.92);
    });
  };

  const handleAddCameraPanel = async () => {
    const file = await snapCurrentFrame();
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCapturedPanels((prev) => [...prev, { file, url }]);
  };

  const handleRemovePanel = (index: number) => {
    setCapturedPanels((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleAuditAllPanels = async (explicitFiles?: File[]) => {
    const filesToAudit = explicitFiles || capturedPanels.map((p) => p.file);
    if (filesToAudit.length === 0) return;

    setIsAnalyzing(true);
    setAnalyzingStage(`Auditing ${filesToAudit.length} packaging panel(s)...`);

    try {
      const report = await FairPackAPI.uploadImageAndAudit(filesToAudit, (stage) => {
        setAnalyzingStage(stage);
      });

      setIsAnalyzing(false);
      if (onAuditComplete) {
        onAuditComplete(report);
      } else {
        onFileUpload(filesToAudit[0]);
      }
      onClose();
    } catch (err) {
      console.error('Camera OCR failed:', err);
      setIsAnalyzing(false);
    }
  };

  // Real Camera Snapshot & Live OCR
  const handleCaptureRealCamera = async () => {
    if (capturedPanels.length > 0) {
      await handleAuditAllPanels();
      return;
    }

    const file = await snapCurrentFrame();
    if (!file) return;
    await handleAuditAllPanels([file]);
  };

  const handleSimulateScan = (presetId: string) => {
    setIsAnalyzing(true);
    setSelectedPreset(presetId);
    setAnalyzingStage('Extracting tokens and bounding boxes...');
    setTimeout(() => {
      setIsAnalyzing(false);
      onScanComplete(presetId);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#0E1118] border border-white/15 rounded-[32px] shadow-2xl overflow-hidden flex flex-col text-white">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#D5FF3F] text-zinc-950 flex items-center justify-center shadow-[0_0_15px_rgba(213,255,63,0.4)]">
              <Camera className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base tracking-tight">
                Live Label &amp; Camera Scanner
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                Real-time Optical OCR &amp; Statutory Compliance Engine
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Viewfinder Screen */}
        <div className="relative w-full h-[300px] sm:h-[350px] bg-black flex items-center justify-center overflow-hidden">
          {useRealCamera ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            /* Synthetic High-Tech Packaging Viewfinder */
            <div className="relative w-full h-full flex items-center justify-center bg-zinc-950">
              <img
                src={
                  selectedPreset === 'compliant-biscuit'
                    ? '/presets/compliant_biscuit.svg'
                    : selectedPreset === 'violating-face-cream'
                    ? '/presets/violating_face_cream.svg'
                    : '/presets/imported_chocolate.svg'
                }
                alt="Scanning Specimen"
                className="w-full h-full object-contain p-4 opacity-75"
              />

              {/* Grid overlay */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage:
                    'linear-gradient(#D5FF3F 1px, transparent 1px), linear-gradient(90deg, #D5FF3F 1px, transparent 1px)',
                  backgroundSize: '30px 30px',
                }}
              />
            </div>
          )}

          {/* Animated Scanning Laser Line */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#D5FF3F] to-transparent shadow-[0_0_20px_#D5FF3F] animate-[bounce_2s_infinite]" />

          {/* Targeting Corner Reticles */}
          <div className="absolute inset-6 sm:inset-10 pointer-events-none border-2 border-dashed border-[#D5FF3F]/40 rounded-2xl flex flex-col justify-between p-2">
            <div className="flex justify-between">
              <div className="w-6 h-6 border-t-4 border-l-4 border-[#D5FF3F] -mt-1 -ml-1 rounded-tl-lg" />
              <div className="w-6 h-6 border-t-4 border-r-4 border-[#D5FF3F] -mt-1 -mr-1 rounded-tr-lg" />
            </div>
            
            {/* Center Status Badge */}
            <div className="self-center px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-[#D5FF3F]/40 text-[#D5FF3F] text-[11px] font-mono font-bold flex items-center gap-1.5 shadow-lg max-w-[85%] truncate">
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span className="truncate">{analyzingStage}</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#D5FF3F] animate-pulse shrink-0" />
                  <span className="truncate">{analyzingStage}</span>
                </>
              )}
            </div>

            <div className="flex justify-between">
              <div className="w-6 h-6 border-b-4 border-l-4 border-[#D5FF3F] -mb-1 -ml-1 rounded-bl-lg" />
              <div className="w-6 h-6 border-b-4 border-r-4 border-[#D5FF3F] -mb-1 -mr-1 rounded-br-lg" />
            </div>
          </div>

          {/* Camera Mode Toggle Button */}
          <button
            onClick={() => setUseRealCamera(!useRealCamera)}
            className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-zinc-900/80 backdrop-blur-md border border-white/20 text-xs font-bold text-white hover:bg-zinc-800 transition-colors flex items-center gap-1.5 z-20"
          >
            {useRealCamera ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-[#D5FF3F]" />
                <span>Show Demo Target</span>
              </>
            ) : (
              <>
                <Video className="w-3.5 h-3.5 text-[#26E1E8]" />
                <span>Enable Phone / Web Camera</span>
              </>
            )}
          </button>
        </div>

        {/* Action Controls Footer */}
        <div className="p-4 sm:p-5 bg-zinc-900/80 border-t border-white/10 space-y-3">
          {useRealCamera ? (
            /* Real Camera Multi-Panel Capture Controls */
            <div className="space-y-3">
              {/* Captured Panels Tray */}
              {capturedPanels.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-zinc-300">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#D5FF3F]" />
                      Captured Panels ({capturedPanels.length})
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">Snap front + back/crimp</span>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
                    {capturedPanels.map((panel, idx) => (
                      <div
                        key={idx}
                        className="group relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-[#D5FF3F]/60 bg-black shadow-md"
                      >
                        <img
                          src={panel.url}
                          alt={`Panel ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[9px] font-bold text-center text-[#D5FF3F] py-0.5">
                          {idx === 0 ? 'P1: Front' : idx === 1 ? 'P2: Back' : `P${idx + 1}`}
                        </span>

                        {!isAnalyzing && (
                          <button
                            type="button"
                            onClick={() => handleRemovePanel(idx)}
                            className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center text-[10px] shadow"
                            title="Remove panel"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddCameraPanel}
                  disabled={isAnalyzing}
                  className="px-3.5 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 border border-white/15 shrink-0"
                >
                  <Plus className="w-4 h-4 text-[#D5FF3F]" />
                  <span>+ Snap {capturedPanels.length === 0 ? 'Panel' : 'Another Panel'}</span>
                </button>

                <button
                  onClick={handleCaptureRealCamera}
                  disabled={isAnalyzing}
                  className="flex-1 py-3 rounded-2xl bg-[#D5FF3F] hover:bg-[#cbf432] text-zinc-950 font-black text-xs sm:text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-zinc-950" />
                      <span>Running Audit...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 stroke-[2.5]" />
                      <span>
                        {capturedPanels.length > 0
                          ? `Audit All ${capturedPanels.length} Panels`
                          : 'Snap & Run Instant Audit'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Synthetic Scan Mode with Presets */
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-zinc-400">
                  Select specimen to scan:
                </span>
                <span className="text-[10px] font-mono text-[#D5FF3F]">
                  Tap to scan instantly
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleSimulateScan('compliant-biscuit')}
                  className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-left transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block mr-1" />
                  <span className="font-bold text-xs block text-white truncate">Biscuit Pack</span>
                  <span className="text-[10px] text-zinc-400 font-mono">100% Pass</span>
                </button>

                <button
                  onClick={() => handleSimulateScan('violating-face-cream')}
                  className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-left transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-400 inline-block mr-1" />
                  <span className="font-bold text-xs block text-white truncate">Face Cream</span>
                  <span className="text-[10px] text-zinc-400 font-mono">Missing USP</span>
                </button>

                <button
                  onClick={() => handleSimulateScan('imported-chocolate')}
                  className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-left transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block mr-1" />
                  <span className="font-bold text-xs block text-white truncate">Swiss Choco</span>
                  <span className="text-[10px] text-zinc-400 font-mono">Math Error</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
