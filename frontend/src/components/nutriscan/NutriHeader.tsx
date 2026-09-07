import React, { useState } from 'react';
import { Leaf, Camera, Image as ImageIcon, Sparkles, Smartphone, Monitor, Menu, X, FileText, ChevronRight, Flag, Search, Shield } from 'lucide-react';
import { JagoGrahakJagoLogo, NationalConsumerHelplineBadge } from '../common/GovtEmblems';

interface NutriHeaderProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onProfileClick: () => void;
  onScanClick?: () => void;
  onUploadClick?: () => void;
  onOpenNotice?: () => void;
  onOpenComplaint?: () => void;
  onOpenTracker?: () => void;
  onOpenGovPortal?: () => void;
  isMobileFrameMode: boolean;
  onToggleFrameMode: () => void;
}

export const NutriHeader: React.FC<NutriHeaderProps> = ({
  activeTab,
  onSelectTab,
  onProfileClick,
  onScanClick,
  onUploadClick,
  onOpenNotice,
  onOpenComplaint,
  onOpenTracker,
  onOpenGovPortal,
  isMobileFrameMode,
  onToggleFrameMode,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleMobileAction = (action?: () => void) => {
    setIsMobileMenuOpen(false);
    if (action) action();
  };

  return (
    <header className="relative pt-2.5 pb-2.5 border-b border-slate-800/80 sm:border-none z-30">
      <div className="flex items-center justify-between">
        {/* Brand: Statutory Legal Metrology Console */}
        <div className="flex items-center gap-3">
          <div 
            onClick={() => onSelectTab('home')}
            className="flex items-center gap-2.5 cursor-pointer active:scale-95 transition-transform"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-cyan-500 via-indigo-600 to-emerald-500 p-0.5 shadow-lg shadow-cyan-500/20 shrink-0">
              <div className="w-full h-full bg-[#0B0F17] rounded-[14px] flex items-center justify-center">
                <Shield className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-cyan-400" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center text-xl sm:text-2xl font-black tracking-tight text-white leading-none">
                <span>Fair</span>
                <span className="text-cyan-400">Pack</span>
                <span className="ml-1 text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                  LMPC 2026
                </span>
              </div>
              <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mt-0.5 font-mono">
                Legal Metrology Console
              </span>
            </div>
          </div>

          {/* Official Jago Grahak Jago Emblem beside brand on larger screens */}
          <div className="h-7 w-px bg-slate-800 hidden xl:block ml-2" />
          <div className="hidden xl:flex items-center opacity-90 hover:opacity-100 transition-opacity">
            <JagoGrahakJagoLogo size={28} />
          </div>
        </div>

        {/* Desktop Navigation Tabs (visible on md/lg screens) */}
        <nav className="hidden md:flex items-center gap-1 bg-[#111827]/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-xl shadow-black/40">
          {[
            { id: 'home', label: 'Command Deck' },
            { id: 'insights', label: 'LMPC Intelligence' },
            { id: 'category', label: 'Commodities' },
            { id: 'gazette', label: 'Statutory Gazette' },
            { id: 'profile', label: 'Officer Desk' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Consumer Grievance Tracker */}
          {onOpenTracker && (
            <button
              onClick={onOpenTracker}
              title="Track Complaint Status"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-bold text-amber-300 shadow-xs transition-all active:scale-95"
            >
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span>Track Status</span>
            </button>
          )}

          {/* Government Officer Dashboard */}
          {onOpenGovPortal && (
            <button
              onClick={onOpenGovPortal}
              title="Government Officer Dashboard"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-xs font-bold text-indigo-300 shadow-xs transition-all active:scale-95"
            >
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>Gov Portal</span>
            </button>
          )}

          {/* Device Viewport Preview Toggle on larger screens */}
          <button
            onClick={onToggleFrameMode}
            title={isMobileFrameMode ? 'Switch to Fullscreen Responsive' : 'Switch to Mobile Frame'}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161F30] border border-slate-700/60 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 shadow-xs transition-all"
          >
            {isMobileFrameMode ? (
              <>
                <Monitor className="w-3.5 h-3.5 text-indigo-400" />
                <span>Full Canvas</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                <span>Mobile Frame</span>
              </>
            )}
          </button>

          {/* Quick Scan Action button on mobile & desktop */}
          <button
            onClick={onScanClick}
            className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/20 transition-transform active:scale-95"
          >
            <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            <span>Scan Specimen</span>
          </button>
          {/* Mobile Instant Features Quick Menu Button (Visible only on mobile/tablet) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`md:hidden w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
              isMobileMenuOpen 
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' 
                : 'bg-[#161F30] border border-slate-700/60 text-slate-300 shadow-xs active:scale-95'
            }`}
            aria-label="Toggle Quick Features"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4 stroke-[2.5]" /> : <Menu className="w-4 h-4 stroke-[2.5]" />}
          </button>

          {/* Profile Avatar */}
          <button
            onClick={onProfileClick}
            className="relative rounded-full ring-2 ring-cyan-500/40 p-0.5 overflow-hidden transition-transform active:scale-95 shrink-0"
          >
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80"
              alt="Auditor Profile"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
            />
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Feature Navbar for Instant 1-Tap Access */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 mt-2 bg-[#0E1524]/98 backdrop-blur-2xl border border-slate-800 shadow-2xl rounded-2xl p-3 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200 z-50 ring-1 ring-slate-700/40">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">
              Quick Enforcement Tools
            </p>
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live OCR Active
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Quick Live Scanner */}
            <button
              onClick={() => handleMobileAction(onScanClick)}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 text-left active:scale-95 transition-transform shadow-md shadow-emerald-500/10"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-950 text-emerald-400 flex items-center justify-center shrink-0">
                <Camera className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <p className="font-black text-xs truncate">Scan Specimen</p>
                <p className="text-[9px] font-bold text-slate-900/80 truncate font-mono">Instant Audit</p>
              </div>
            </button>

            {/* Quick Upload Photo */}
            <button
              onClick={() => handleMobileAction(onUploadClick)}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-[#161F30] border border-slate-700/60 text-left active:scale-95 transition-transform"
            >
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/20">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-slate-100 font-bold text-xs truncate">Upload Specimen</p>
                <p className="text-[9px] text-slate-400 truncate font-mono">Multi-Angle OCR</p>
              </div>
            </button>
          </div>

          {/* Quick Feature Navigation links */}
          <div className="space-y-1 pt-1.5 border-t border-slate-800">
            <button
              onClick={() => handleMobileAction(() => onSelectTab('insights'))}
              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/60 transition-colors text-left text-slate-200"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-xs font-bold">LMPC Intelligence &amp; Defect Analytics</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>

            <button
              onClick={() => handleMobileAction(() => onSelectTab('category'))}
              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/60 transition-colors text-left text-slate-200"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-indigo-400" />
                <span className="text-xs font-bold">Commodity Categories &amp; Presets</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>

            <button
              onClick={() => handleMobileAction(() => onSelectTab('gazette'))}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-indigo-950/40 border border-indigo-500/20 hover:bg-indigo-900/40 transition-colors text-left text-indigo-300 font-bold text-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-indigo-400" />
                <span>Statutory Gazette Reader (90 Acts)</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
            </button>

            {onOpenNotice && (
              <button
                onClick={() => handleMobileAction(onOpenNotice)}
                className="w-full flex items-center justify-between p-2 rounded-xl bg-rose-950/40 border border-rose-500/20 hover:bg-rose-900/40 transition-colors text-left text-rose-300 font-bold text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-3.5 h-3.5 text-rose-400" />
                  <span>Rule 32 Statutory Notice Drafter</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-rose-400" />
              </button>
            )}

            {onOpenTracker && (
              <button
                onClick={() => handleMobileAction(onOpenTracker)}
                className="w-full flex items-center justify-between p-2 rounded-xl bg-amber-950/40 border border-amber-500/20 hover:bg-amber-900/40 transition-colors text-left text-amber-300 font-bold text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Search className="w-3.5 h-3.5 text-amber-400" />
                  <span>Track NSC Complaint Dossier</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
              </button>
            )}

            {onOpenGovPortal && (
              <button
                onClick={() => handleMobileAction(onOpenGovPortal)}
                className="w-full flex items-center justify-between p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/20 hover:bg-cyan-900/40 transition-colors text-left text-cyan-300 font-bold text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Legal Metrology Officer Portal</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
