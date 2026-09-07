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
      <div className="w-full max-w-[430px] bg-white/95 backdrop-blur-xl border-t sm:border border-zinc-200/90 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] rounded-t-3xl sm:rounded-full px-5 py-2 flex items-center justify-between pointer-events-auto relative">
        {/* Tab 1: Home */}
        <button
          onClick={() => onSelectTab('home')}
          className={`flex flex-col items-center gap-1 py-1 px-2 transition-all active:scale-95 ${
            activeTab === 'home' ? 'text-zinc-950 font-black' : 'text-zinc-400 hover:text-zinc-700'
          }`}
        >
          <Home className={`w-5 h-5 stroke-[2.2] ${activeTab === 'home' ? 'text-zinc-950' : ''}`} />
          <span className="text-[10px]">Home</span>
        </button>

        {/* Tab 2: Insights */}
        <button
          onClick={() => onSelectTab('insights')}
          className={`flex flex-col items-center gap-1 py-1 px-2 transition-all active:scale-95 ${
            activeTab === 'insights' ? 'text-[#FF2A85] font-black' : 'text-zinc-400 hover:text-zinc-700'
          }`}
        >
          <PieChart className={`w-5 h-5 stroke-[2.2] ${activeTab === 'insights' ? 'text-[#FF2A85]' : ''}`} />
          <span className="text-[10px]">Insights</span>
        </button>

        {/* Center Floating Scan Button */}
        <div className="relative -top-5">
          <button
            onClick={onCenterAction}
            title="Instant Live Scanner"
            className="w-[52px] h-[52px] rounded-full bg-[#0E1118] border-[3px] border-[#D5FF3F] shadow-xl flex items-center justify-center text-white active:scale-90 hover:scale-105 transition-all group"
          >
            <Scan className="w-6 h-6 text-[#D5FF3F] group-hover:rotate-12 transition-transform" />
          </button>
        </div>

        {/* Tab 3: Category */}
        <button
          onClick={() => onSelectTab('category')}
          className={`flex flex-col items-center gap-1 py-1 px-2 transition-all active:scale-95 ${
            activeTab === 'category' ? 'text-[#8B5CF6] font-black' : 'text-zinc-400 hover:text-zinc-700'
          }`}
        >
          <Layers className={`w-5 h-5 stroke-[2.2] ${activeTab === 'category' ? 'text-[#8B5CF6]' : ''}`} />
          <span className="text-[10px]">Category</span>
        </button>

        {/* Tab 4: Profile */}
        <button
          onClick={() => onSelectTab('profile')}
          className={`flex flex-col items-center gap-1 py-1 px-2 transition-all active:scale-95 ${
            activeTab === 'profile' ? 'text-zinc-950 font-black' : 'text-zinc-400 hover:text-zinc-700'
          }`}
        >
          <User className={`w-5 h-5 stroke-[2.2] ${activeTab === 'profile' ? 'text-zinc-950' : ''}`} />
          <span className="text-[10px]">Profile</span>
        </button>
      </div>
    </div>
  );
};
