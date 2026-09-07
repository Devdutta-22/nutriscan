import React from 'react';
import { Home, PieChart, Layers, User, Scan } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onCenterAction: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  onCenterAction,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none pb-0 sm:pb-3 px-0 sm:px-4">
      <div className="w-full max-w-[430px] bg-[#111827]/95 backdrop-blur-xl border-t sm:border border-slate-800 shadow-[0_-8px_30px_rgba(0,0,0,0.6)] rounded-t-3xl sm:rounded-full px-5 py-2 flex items-center justify-between pointer-events-auto relative">
        {/* Tab 1: Home */}
        <button
          onClick={() => onSelectTab('home')}
          className={`flex flex-col items-center gap-1 py-1 px-2 transition-all active:scale-95 ${
            activeTab === 'home' ? 'text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className={`w-5 h-5 stroke-[2.2] ${activeTab === 'home' ? 'text-cyan-400' : ''}`} />
          <span className="text-[10px] font-mono">Console</span>
        </button>

        {/* Tab 2: Insights */}
        <button
          onClick={() => onSelectTab('insights')}
          className={`flex flex-col items-center gap-1 py-1 px-2 transition-all active:scale-95 ${
            activeTab === 'insights' ? 'text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <PieChart className={`w-5 h-5 stroke-[2.2] ${activeTab === 'insights' ? 'text-cyan-400' : ''}`} />
          <span className="text-[10px] font-mono">Analytics</span>
        </button>

        {/* Center Floating Scan Button */}
        <div className="relative -top-5">
          <button
            onClick={onCenterAction}
            title="Instant Live Scanner"
            className="w-[54px] h-[54px] rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 border-[3px] border-[#0B0F17] shadow-[0_0_20px_rgba(16,185,129,0.5)] flex items-center justify-center text-slate-950 active:scale-90 hover:scale-105 transition-all group"
          >
            <Scan className="w-6 h-6 text-slate-950 stroke-[2.5] group-hover:rotate-12 transition-transform" />
          </button>
        </div>

        {/* Tab 3: Category */}
        <button
          onClick={() => onSelectTab('category')}
          className={`flex flex-col items-center gap-1 py-1 px-2 transition-all active:scale-95 ${
            activeTab === 'category' ? 'text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className={`w-5 h-5 stroke-[2.2] ${activeTab === 'category' ? 'text-cyan-400' : ''}`} />
          <span className="text-[10px] font-mono">Classes</span>
        </button>

        {/* Tab 4: Profile */}
        <button
          onClick={() => onSelectTab('profile')}
          className={`flex flex-col items-center gap-1 py-1 px-2 transition-all active:scale-95 ${
            activeTab === 'profile' ? 'text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className={`w-5 h-5 stroke-[2.2] ${activeTab === 'profile' ? 'text-cyan-400' : ''}`} />
          <span className="text-[10px] font-mono">Officer</span>
        </button>
      </div>
    </div>
  );
};
