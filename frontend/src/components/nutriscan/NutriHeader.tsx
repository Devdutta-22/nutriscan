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
    <header className="relative pt-2.5 pb-2.5 border-b border-zinc-200/60 sm:border-none z-30">
      <div className="flex items-center justify-between">
        {/* Brand: NutriScan with leaf logo + Jago Grahak Jago Emblem */}
        <div className="flex items-center gap-3">
          <div 
            onClick={() => onSelectTab('home')}
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer active:scale-95 transition-transform"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#0E1118] flex items-center justify-center shadow-md shrink-0">
              <Leaf className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#D5FF3F] fill-[#D5FF3F]" />
            </div>
            <div className="flex items-center text-xl sm:text-2xl font-black tracking-tight text-[#0E1118]">
              <span>Nutri</span>
              <span className="text-[#FF2A85]">Scan</span>
            </div>
            <span className="hidden xs:inline-block sm:inline-block bg-[#D5FF3F] text-zinc-950 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider ml-1">
              PWA
            </span>
          </div>

          {/* Official Jago Grahak Jago Emblem beside brand on larger screens */}
          <div className="h-6 w-px bg-zinc-300 hidden xl:block" />
          <div className="hidden xl:flex items-center">
            <JagoGrahakJagoLogo size={30} />
          </div>
        </div>

        {/* Desktop Navigation Tabs (visible on md/lg screens) */}
        <nav className="hidden md:flex items-center gap-1 bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border border-zinc-200 shadow-sm">
          {[
            { id: 'home', label: 'Home' },
            { id: 'insights', label: 'Insights' },
            { id: 'category', label: 'Category' },
            { id: 'gazette', label: 'Government Gazette' },
            { id: 'profile', label: 'Profile' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-[#0E1118] text-white shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Consumer Grievance Tracker */}
          {onOpenTracker && (
            <button
              onClick={onOpenTracker}
              title="Track Complaint Status"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-xs font-bold text-amber-900 shadow-xs transition-all active:scale-95"
            >
              <Search className="w-3.5 h-3.5 text-amber-700" />
              <span>Track Complaint</span>
            </button>
          )}

          {/* Government Officer Dashboard */}
          {onOpenGovPortal && (
            <button
              onClick={onOpenGovPortal}
              title="Government Officer Dashboard"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 text-xs font-bold text-indigo-900 shadow-xs transition-all active:scale-95"
            >
              <Shield className="w-3.5 h-3.5 text-indigo-700" />
              <span>Gov Portal</span>
            </button>
          )}

          {/* Device Viewport Preview Toggle on larger screens */}
          <button
            onClick={onToggleFrameMode}
            title={isMobileFrameMode ? 'Switch to Fullscreen Responsive' : 'Switch to Mobile Frame'}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 shadow-sm transition-all"
          >
            {isMobileFrameMode ? (
              <>
                <Monitor className="w-3.5 h-3.5 text-[#8B5CF6]" />
                <span>Full Viewport</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-[#FF2A85]" />
                <span>Mobile Phone Frame</span>
              </>
            )}
          </button>

          {/* Quick Scan Action button on mobile & desktop */}
          <button
            onClick={onScanClick}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-[#D5FF3F] hover:bg-[#cbf432] text-zinc-950 text-xs font-black shadow-sm transition-transform active:scale-95"
          >
            <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            <span>Scan</span>
          </button>

          {/* Mobile Instant Features Quick Menu Button (Visible only on mobile/tablet) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`md:hidden w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
              isMobileMenuOpen 
                ? 'bg-zinc-900 text-white shadow-sm' 
                : 'bg-white border border-zinc-200 text-zinc-800 shadow-sm active:scale-95'
            }`}
            aria-label="Toggle Quick Features"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          {/* Profile Avatar (Priya) */}
          <button
            onClick={onProfileClick}
            className="relative rounded-full ring-2 ring-zinc-900/80 p-0.5 overflow-hidden transition-transform active:scale-95 shrink-0"
          >
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80"
              alt="Priya Avatar"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
            />
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Feature Navbar for Instant 1-Tap Access */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-2xl border border-zinc-200/90 shadow-2xl rounded-2xl p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
              Instant PWA Features
            </p>
            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
              Online • Live OCR
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Quick Live Scanner */}
            <button
              onClick={() => handleMobileAction(onScanClick)}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0E1118] text-white text-left active:scale-95 transition-transform"
            >
              <div className="w-7 h-7 rounded-lg bg-[#D5FF3F] text-zinc-950 flex items-center justify-center shrink-0">
                <Camera className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <p className="text-white font-black text-xs truncate">Live Scanner</p>
                <p className="text-[9px] text-[#D5FF3F] truncate">Instant OCR</p>
              </div>
            </button>

            {/* Quick Upload Photo */}
            <button
              onClick={() => handleMobileAction(onUploadClick)}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-left active:scale-95 transition-transform"
            >
              <div className="w-7 h-7 rounded-lg bg-[#FF2A85]/10 text-[#FF2A85] flex items-center justify-center shrink-0">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-zinc-900 font-bold text-xs truncate">Upload Label</p>
                <p className="text-[9px] text-zinc-500 truncate">Deskew &amp; Check</p>
              </div>
            </button>
          </div>

          {/* Quick Feature Navigation links */}
          <div className="space-y-1 pt-1 border-t border-zinc-100">
            <button
              onClick={() => handleMobileAction(() => onSelectTab('insights'))}
              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-zinc-50 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-[#FF2A85]" />
                <span className="text-xs font-bold text-zinc-800">Big-8 Nutritional Intelligence</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            <button
              onClick={() => handleMobileAction(() => onSelectTab('category'))}
              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-zinc-50 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
                <span className="text-xs font-bold text-zinc-800">Category Comparison &amp; Presets</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            <button
              onClick={() => handleMobileAction(() => onSelectTab('gazette'))}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-indigo-50/70 hover:bg-indigo-100/70 transition-colors text-left text-indigo-900 font-bold text-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-indigo-600" />
                <span>Government Gazette &amp; Legal Guarantee</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
            </button>

            {onOpenNotice && (
              <button
                onClick={() => handleMobileAction(onOpenNotice)}
                className="w-full flex items-center justify-between p-2 rounded-xl bg-rose-50/70 hover:bg-rose-50 transition-colors text-left text-rose-600 font-bold text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-3.5 h-3.5 text-rose-600" />
                  <span>Rule 32 Non-Compliance Order</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-rose-400" />
              </button>
            )}

            {onOpenTracker && (
              <button
                onClick={() => handleMobileAction(onOpenTracker)}
                className="w-full flex items-center justify-between p-2 rounded-xl bg-amber-50/70 hover:bg-amber-100/70 transition-colors text-left text-amber-900 font-bold text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Search className="w-3.5 h-3.5 text-amber-600" />
                  <span>Track Complaint Status</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
              </button>
            )}

            {onOpenGovPortal && (
              <button
                onClick={() => handleMobileAction(onOpenGovPortal)}
                className="w-full flex items-center justify-between p-2 rounded-xl bg-indigo-50/70 hover:bg-indigo-100/70 transition-colors text-left text-indigo-900 font-bold text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Legal Metrology Officer Portal</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
