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
        className="w-full bg-[#0E1118] p-1.5 rounded-[22px] shadow-sm hover:shadow-md transition-all active:scale-[0.98] group"
      >
        <div className="bg-[#D5FF3F] hover:bg-[#c9f635] text-zinc-950 font-black text-sm sm:text-base py-3 px-4 rounded-[18px] flex items-center justify-center gap-2.5 transition-colors">
          <Camera className="w-5 h-5 stroke-[2.5]" />
          <span>Scan Product Label</span>
        </div>
      </button>

      {/* Secondary Two Action Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Upload Photo (Triggers interactive Upload Modal) */}
        <button
          onClick={onUploadClick}
          className="bg-white hover:bg-zinc-50 border border-zinc-200/90 rounded-2xl py-3 px-3 shadow-sm flex items-center justify-center gap-2 font-bold text-xs text-zinc-800 transition-all active:scale-[0.98] group"
        >
          <div className="w-6 h-6 rounded-lg bg-[#FF2A85]/10 flex items-center justify-center text-[#FF2A85] group-hover:scale-110 transition-transform">
            <ImageIcon className="w-3.5 h-3.5 text-[#FF2A85]" />
          </div>
          <span>Upload Photo</span>
        </button>

        {/* Recent Scans */}
        <button
          onClick={onRecentScansClick}
          className="bg-white hover:bg-zinc-50 border border-zinc-200/90 rounded-2xl py-3 px-3 shadow-sm flex items-center justify-center gap-2 font-bold text-xs text-zinc-800 transition-all active:scale-[0.98] group"
        >
          <div className="w-6 h-6 rounded-lg bg-[#26E1E8]/10 flex items-center justify-center text-[#26E1E8] group-hover:scale-110 transition-transform">
            <History className="w-3.5 h-3.5 text-[#26E1E8]" />
          </div>
          <span>Recent Scans</span>
        </button>
      </div>

      {/* Tertiary: Consumer Grievance & Government Enforcement Portal */}
      <div className="grid grid-cols-3 gap-2 pt-0.5">
        {onOpenComplaint && (
          <button
            onClick={onOpenComplaint}
            className="bg-rose-50/80 hover:bg-rose-100/80 border border-rose-200/80 rounded-2xl py-2.5 px-2 shadow-xs flex flex-col items-center justify-center gap-1 font-black text-[11px] text-rose-700 transition-all active:scale-[0.97]"
          >
            <Flag className="w-3.5 h-3.5 text-rose-600" />
            <span>File Complaint</span>
          </button>
        )}

        {onOpenTracker && (
          <button
            onClick={onOpenTracker}
            className="bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200/80 rounded-2xl py-2.5 px-2 shadow-xs flex flex-col items-center justify-center gap-1 font-black text-[11px] text-amber-800 transition-all active:scale-[0.97]"
          >
            <Search className="w-3.5 h-3.5 text-amber-600" />
            <span>Track Status</span>
          </button>
        )}

        {onOpenGovPortal && (
          <button
            onClick={onOpenGovPortal}
            className="bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-200/80 rounded-2xl py-2.5 px-2 shadow-xs flex flex-col items-center justify-center gap-1 font-black text-[11px] text-indigo-700 transition-all active:scale-[0.97]"
          >
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            <span>Gov Officer</span>
          </button>
        )}
      </div>
    </div>
  );
};
