import React from 'react';
import { Camera, Image as ImageIcon, History, Flag, Search, Shield } from 'lucide-react';

interface ActionButtonsProps {
  onScanClick: () => void;
  onUploadClick: () => void;
  onRecentScansClick: () => void;
  onOpenComplaint?: () => void;
  onOpenTracker?: () => void;
  onOpenGovPortal?: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onScanClick,
  onUploadClick,
  onRecentScansClick,
  onOpenComplaint,
  onOpenTracker,
  onOpenGovPortal,
}) => {
  return (
    <div className="pt-3 space-y-2.5">
      {/* Primary Big Scan Button */}
      <button
        onClick={onScanClick}
        className="w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 p-0.5 rounded-2xl shadow-xl shadow-emerald-500/15 hover:shadow-emerald-500/25 transition-all active:scale-[0.99] group"
      >
        <div className="bg-[#0B0F17] hover:bg-[#111827] text-white font-black text-sm sm:text-base py-3 px-4 rounded-[14px] flex items-center justify-center gap-3 transition-colors">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
            <Camera className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="tracking-wide">Initiate Packaging Audit Scan</span>
        </div>
      </button>

      {/* Secondary Two Action Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Upload Specimen Photo */}
        <button
          onClick={onUploadClick}
          className="bg-[#111827] hover:bg-[#161F30] border border-slate-800 rounded-2xl py-3 px-3 shadow-md flex items-center justify-center gap-2.5 font-bold text-xs text-slate-200 transition-all active:scale-[0.98] group"
        >
          <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
            <ImageIcon className="w-3.5 h-3.5" />
          </div>
          <span>Upload Specimen</span>
        </button>

        {/* Recent Scans Dossier */}
        <button
          onClick={onRecentScansClick}
          className="bg-[#111827] hover:bg-[#161F30] border border-slate-800 rounded-2xl py-3 px-3 shadow-md flex items-center justify-center gap-2.5 font-bold text-xs text-slate-200 transition-all active:scale-[0.98] group"
        >
          <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
            <History className="w-3.5 h-3.5" />
          </div>
          <span>Audit Log Archive</span>
        </button>
      </div>

      {/* Tertiary: Consumer Grievance & Government Enforcement Portal */}
      <div className="grid grid-cols-3 gap-2 pt-0.5">
        {onOpenComplaint && (
          <button
            onClick={onOpenComplaint}
            className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-2xl py-2.5 px-2 shadow-xs flex flex-col items-center justify-center gap-1 font-bold text-[11px] text-rose-300 transition-all active:scale-[0.97]"
          >
            <Flag className="w-3.5 h-3.5 text-rose-400" />
            <span>File Grievance</span>
          </button>
        )}

        {onOpenTracker && (
          <button
            onClick={onOpenTracker}
            className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-2xl py-2.5 px-2 shadow-xs flex flex-col items-center justify-center gap-1 font-bold text-[11px] text-amber-300 transition-all active:scale-[0.97]"
          >
            <Search className="w-3.5 h-3.5 text-amber-400" />
            <span>Track Dossier</span>
          </button>
        )}

        {onOpenGovPortal && (
          <button
            onClick={onOpenGovPortal}
            className="bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-2xl py-2.5 px-2 shadow-xs flex flex-col items-center justify-center gap-1 font-bold text-[11px] text-indigo-300 transition-all active:scale-[0.97]"
          >
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>Officer Portal</span>
          </button>
        )}
      </div>
    </div>
  );
};
