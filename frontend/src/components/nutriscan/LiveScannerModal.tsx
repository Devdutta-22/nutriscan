import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Camera, Sparkles, RefreshCw, Zap, CheckCircle2, UploadCloud, 
  SwitchCamera, Plus, Trash2, Layers, Sun, Moon, Contrast, Sliders, Image as ImageIcon 
} from 'lucide-react';
import { AuditReport } from '../../types/compliance';
import { FairPackAPI } from '../../services/api';

type PackagingFilter = 'normal' | 'invert' | 'antiglare' | 'bw';

interface LiveScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete?: (presetId: string) => void;
  onAuditComplete?: (report: AuditReport) => void;
  onFileUpload: (file: File) => void;
}

export const LiveScannerModal: React.FC<LiveScannerModalProps> = ({
  isOpen,
  onClose,
  onAuditComplete,
  onFileUpload,
}) => {
  const [activeFilter, setActiveFilter] = useState<PackagingFilter>('normal');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingStage, setAnalyzingStage] = useState('Position packaging inside frame');
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [capturedPanels, setCapturedPanels] = useState<{ file: File; url: string }[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFilterCss = (filter: PackagingFilter): string => {
    switch (filter) {
      case 'invert':
        return 'invert(1) contrast(1.4) brightness(1.05)';
      case 'antiglare':
        return 'contrast(1.6) brightness(0.92) saturate(0.8)';
      case 'bw':
        return 'grayscale(1) contrast(2.2) brightness(1.1)';
      default:
        return 'none';
    }
  };

  // Initialize real device camera stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isOpen) {
      navigator.mediaDevices
        ?.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })
        .then((s) => {
          stream = s;
          setCameraAvailable(true);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch((err) => {
          console.warn('Camera access denied or unavailable:', err);
          setCameraAvailable(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, facingMode]);

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

      const filterCss = getFilterCss(activeFilter);
      if (filterCss !== 'none') {
        ctx.filter = filterCss;
      }

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
    if (!file) {
      fileInputRef.current?.click();
      return;
    }
    await handleAuditAllPanels([file]);
  };

  // Manual File Upload with Filter Baking
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    e.target.value = '';

    if (activeFilter !== 'normal') {
      try {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        await new Promise((res, rej) => {
          img.onload = () => res(true);
          img.onerror = rej;
          img.src = objectUrl;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 800;
        canvas.height = img.naturalHeight || 600;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.filter = getFilterCss(activeFilter);
          ctx.drawImage(img, 0, 0);
          const filteredBlob = await new Promise<Blob | null>((res) =>
            canvas.toBlob(res, 'image/jpeg', 0.92)
          );
          URL.revokeObjectURL(objectUrl);
          if (filteredBlob) {
            const filteredFile = new File([filteredBlob], `Filtered_${file.name}`, { type: 'image/jpeg' });
            const url = URL.createObjectURL(filteredFile);
            setCapturedPanels((prev) => [...prev, { file: filteredFile, url }]);
            return;
          }
        }
      } catch (err) {
        console.warn('Filter bake failed on uploaded file, using original:', err);
      }
    }

    const url = URL.createObjectURL(file);
    setCapturedPanels((prev) => [...prev, { file, url }]);
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#0E1118] border border-white/15 rounded-[32px] shadow-2xl overflow-hidden flex flex-col text-white">
        
        {/* Hidden File Input for fallback or device upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileInputChange}
          className="hidden"
        />

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
        <div className="relative w-full h-[300px] sm:h-[340px] bg-black flex items-center justify-center overflow-hidden">
          {cameraAvailable ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ filter: getFilterCss(activeFilter) }}
              className="w-full h-full object-cover transition-all duration-300"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 bg-zinc-950 w-full h-full">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-200">Camera Access Unavailable</p>
                <p className="text-[11px] text-zinc-400 max-w-xs mt-1">
                  Upload a photo of your packaging label or toffee wrapper below to run the audit.
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-[#D5FF3F] text-zinc-950 font-bold text-xs hover:bg-[#c6f332] transition-colors flex items-center gap-1.5"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload Packaging Photo</span>
              </button>
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

          {/* Camera Flip / Switch Button */}
          {cameraAvailable && (
            <button
              onClick={toggleCameraFacing}
              className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-zinc-900/80 backdrop-blur-md border border-white/20 text-xs font-bold text-white hover:bg-zinc-800 transition-colors flex items-center gap-1.5 z-20 shadow-md"
              title="Switch between front and back camera"
            >
              <SwitchCamera className="w-3.5 h-3.5 text-[#26E1E8]" />
              <span>Flip Camera</span>
            </button>
          )}

          {/* Active Filter Indicator Badge */}
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/85 backdrop-blur-md border border-white/20 text-[10px] font-mono font-bold flex items-center gap-1.5 z-20 shadow-md">
            <span
              className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                activeFilter === 'normal'
                  ? 'bg-[#D5FF3F]'
                  : activeFilter === 'invert'
                  ? 'bg-[#26E1E8]'
                  : activeFilter === 'antiglare'
                  ? 'bg-amber-400'
                  : 'bg-purple-400'
              }`}
            />
            <span
              className={
                activeFilter === 'normal'
                  ? 'text-[#D5FF3F]'
                  : activeFilter === 'invert'
                  ? 'text-[#26E1E8]'
                  : activeFilter === 'antiglare'
                  ? 'text-amber-300'
                  : 'text-purple-300'
              }
            >
              LENS: {activeFilter.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Action Controls Footer: 4 Specific Case Buttons & Multi-Panel Tray */}
        <div className="p-4 sm:p-5 bg-zinc-900/90 border-t border-white/10 space-y-3.5">
          
          {/* Packaging Filter Cases Section (Replaces Old Category Section) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#26E1E8]" />
                Select Packaging Filter Case:
              </span>
              <span className="text-[10px] font-mono text-[#D5FF3F] bg-[#D5FF3F]/10 px-2 py-0.5 rounded-full border border-[#D5FF3F]/20">
                {activeFilter === 'normal' && 'Standard optical feed'}
                {activeFilter === 'invert' && 'Inverted: dark brown / black wrapper'}
                {activeFilter === 'antiglare' && 'Anti-glare: metallic & shiny foil'}
                {activeFilter === 'bw' && 'B&W Boost: faint stamps & dot-matrix'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Button 1: Normal */}
              <button
                type="button"
                onClick={() => setActiveFilter('normal')}
                className={`p-2.5 rounded-2xl text-left transition-all border flex flex-col justify-between ${
                  activeFilter === 'normal'
                    ? 'bg-zinc-800 border-[#D5FF3F] shadow-[0_0_15px_rgba(213,255,63,0.18)] ring-1 ring-[#D5FF3F]'
                    : 'bg-zinc-950/60 border-white/10 hover:border-white/20 hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                    activeFilter === 'normal' ? 'bg-[#D5FF3F] text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    <Sun className="w-4 h-4" />
                  </div>
                  {activeFilter === 'normal' && (
                    <span className="w-2 h-2 rounded-full bg-[#D5FF3F] animate-pulse" />
                  )}
                </div>
                <div className="font-bold text-xs text-white truncate">Standard / Light</div>
                <div className="text-[10px] text-zinc-400 leading-tight">White &amp; light labels</div>
              </button>

              {/* Button 2: Invert (Dark Wrapper) */}
              <button
                type="button"
                onClick={() => setActiveFilter('invert')}
                className={`p-2.5 rounded-2xl text-left transition-all border flex flex-col justify-between ${
                  activeFilter === 'invert'
                    ? 'bg-zinc-800 border-[#26E1E8] shadow-[0_0_15px_rgba(38,225,232,0.22)] ring-1 ring-[#26E1E8]'
                    : 'bg-zinc-950/60 border-white/10 hover:border-white/20 hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                    activeFilter === 'invert' ? 'bg-[#26E1E8] text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    <Moon className="w-4 h-4" />
                  </div>
                  {activeFilter === 'invert' && (
                    <span className="w-2 h-2 rounded-full bg-[#26E1E8] animate-pulse" />
                  )}
                </div>
                <div className="font-bold text-xs text-white truncate">Dark Wrapper</div>
                <div className="text-[10px] text-zinc-400 leading-tight">Dark brown &amp; black</div>
              </button>

              {/* Button 3: Anti-Glare (Shiny Foil) */}
              <button
                type="button"
                onClick={() => setActiveFilter('antiglare')}
                className={`p-2.5 rounded-2xl text-left transition-all border flex flex-col justify-between ${
                  activeFilter === 'antiglare'
                    ? 'bg-zinc-800 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.22)] ring-1 ring-amber-400'
                    : 'bg-zinc-950/60 border-white/10 hover:border-white/20 hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                    activeFilter === 'antiglare' ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    <Zap className="w-4 h-4" />
                  </div>
                  {activeFilter === 'antiglare' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </div>
                <div className="font-bold text-xs text-white truncate">Shiny Foil</div>
                <div className="text-[10px] text-zinc-400 leading-tight">Anti-glare reflection</div>
              </button>

              {/* Button 4: B&W Contrast */}
              <button
                type="button"
                onClick={() => setActiveFilter('bw')}
                className={`p-2.5 rounded-2xl text-left transition-all border flex flex-col justify-between ${
                  activeFilter === 'bw'
                    ? 'bg-zinc-800 border-purple-400 shadow-[0_0_15px_rgba(192,132,252,0.22)] ring-1 ring-purple-400'
                    : 'bg-zinc-950/60 border-white/10 hover:border-white/20 hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                    activeFilter === 'bw' ? 'bg-purple-400 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    <Contrast className="w-4 h-4" />
                  </div>
                  {activeFilter === 'bw' && (
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  )}
                </div>
                <div className="font-bold text-xs text-white truncate">B&amp;W Contrast</div>
                <div className="text-[10px] text-zinc-400 leading-tight">Faint dot-matrix</div>
              </button>
            </div>
          </div>

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
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleAddCameraPanel}
              disabled={isAnalyzing}
              className="px-3.5 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 border border-white/15 shrink-0"
              title="Capture multiple sides (e.g. front + back crimp)"
            >
              <Plus className="w-4 h-4 text-[#D5FF3F]" />
              <span>+ Snap {capturedPanels.length === 0 ? 'Panel' : 'Another'}</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
              className="px-3 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 border border-white/15 shrink-0"
              title="Upload photo from device"
            >
              <ImageIcon className="w-4 h-4 text-[#26E1E8]" />
              <span className="hidden sm:inline">Upload</span>
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
      </div>
    </div>
  );
};
