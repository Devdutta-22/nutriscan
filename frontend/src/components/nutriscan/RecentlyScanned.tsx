import React, { useState } from 'react';
import { Wheat, Coffee, Cookie, Image as ImageIcon, Trash2, Database, ExternalLink } from 'lucide-react';
import { AuditReport } from '../../types/compliance';

export interface ScannedItem {
  id: string;
  name: string;
  category: string;
  timeAgo: string;
  grade: string;
  gradeBg: string;
  gradeColor: string;
  icon?: any;
  iconBg?: string;
  presetId: string;
  report?: AuditReport;
  image_url?: string;
  is_database_record?: boolean;
}

interface RecentlyScannedProps {
  items?: ScannedItem[];
  onSelectItem: (item: ScannedItem) => void;
  onSeeAll?: () => void;
  onDeleteItem?: (id: string, e: React.MouseEvent) => void;
}

export const RECENT_ITEMS: ScannedItem[] = [
  {
    id: '1',
    name: 'Multigrain Crackers',
    category: 'Packaged Foods',
    timeAgo: '2h ago',
    grade: 'A+',
    gradeBg: 'bg-emerald-500/15 border border-emerald-500/30 shadow-sm shadow-emerald-500/10',
    gradeColor: 'text-emerald-400 font-black font-mono',
    icon: Wheat,
    iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    presetId: 'compliant-biscuit',
  },
  {
    id: '2',
    name: 'Iced Energy Drink',
    category: 'Beverages',
    timeAgo: 'Yesterday',
    grade: 'C',
    gradeBg: 'bg-rose-500/15 border border-rose-500/30 shadow-sm shadow-rose-500/10',
    gradeColor: 'text-rose-400 font-black font-mono',
    icon: Coffee,
    iconBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    presetId: 'violating-face-cream',
  },
  {
    id: '3',
    name: 'Choco Chip Cookies',
    category: 'Snacks & Sweets',
    timeAgo: '2 days ago',
    grade: 'B-',
    gradeBg: 'bg-amber-500/15 border border-amber-500/30 shadow-sm shadow-amber-500/10',
    gradeColor: 'text-amber-400 font-black font-mono',
    icon: Cookie,
    iconBg: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    presetId: 'imported-chocolate',
  },
];

export const RecentlyScanned: React.FC<RecentlyScannedProps> = ({
  items = RECENT_ITEMS,
  onSelectItem,
  onSeeAll,
  onDeleteItem,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'uploaded'>('all');

  const displayedItems = items.filter((item) => {
    if (filterMode === 'uploaded') {
      return item.is_database_record || Boolean(item.image_url);
    }
    return true;
  });

  const uploadedCount = items.filter((i) => i.is_database_record || Boolean(i.image_url)).length;

  return (
    <div className="pt-4 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <div>
            <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Database Specimen Archives</span>
              <span className="text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-bold">
                {items.length} records
              </span>
            </h3>
          </div>
        </div>

        {/* Filter chips & View all button */}
        <div className="flex items-center gap-2">
          <div className="bg-[#111827] p-0.5 rounded-xl border border-slate-800 flex items-center text-[10px] font-mono font-bold">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterMode === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setFilterMode('uploaded')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                filterMode === 'uploaded'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3 h-3 text-emerald-400" />
              <span>Permanent ({uploadedCount})</span>
            </button>
          </div>

          {onSeeAll && (
            <button
              onClick={onSeeAll}
              className="text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider transition-colors flex items-center gap-1"
            >
              <span>SEE ALL</span>
              <span className="text-[10px]">→</span>
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2.5">
        {displayedItems.length === 0 ? (
          <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-6 text-center text-slate-400 font-mono text-xs">
            <p className="font-bold text-slate-300">No uploaded label specimens found yet.</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Upload a label image from the top button to permanently store it into the regulatory database.
            </p>
          </div>
        ) : (
          displayedItems.map((item) => {
            const IconComponent = item.icon || ImageIcon;
            const hasImage = Boolean(item.image_url);

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="bg-[#111827] hover:bg-[#161F30] rounded-2xl p-3 sm:p-3.5 border border-slate-800 hover:border-cyan-500/40 shadow-sm hover:shadow-cyan-500/5 flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] transition-all group relative overflow-hidden"
              >
                {/* Database permanently stored indicator ribbon */}
                {item.is_database_record && (
                  <div className="absolute top-0 right-0 w-2 h-2 bg-emerald-400 rounded-bl-full shadow-xs" title="Stored permanently in database" />
                )}

                {/* Left: Thumbnail / Icon and Details */}
                <div className="flex items-center gap-3 min-w-0">
                  {hasImage ? (
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700/80 overflow-hidden shrink-0 shadow-inner group-hover:scale-105 transition-transform flex items-center justify-center relative">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback on broken image
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                      <span className="absolute bottom-0.5 right-0.5 text-[8px] font-mono text-cyan-300 font-black px-1 rounded bg-black/70">
                        IMG
                      </span>
                    </div>
                  ) : (
                    <div
                      className={`w-11 h-11 rounded-2xl ${item.iconBg || 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'} flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform`}
                    >
                      <IconComponent className="w-5 h-5 stroke-[2.2]" />
                    </div>
                  )}

                  <div className="truncate">
                    <div className="flex items-center gap-1.5 truncate">
                      <h4 className="font-extrabold text-[13px] sm:text-sm text-slate-100 group-hover:text-white leading-snug truncate">
                        {item.name}
                      </h4>
                      {item.is_database_record && (
                        <span className="text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded shrink-0">
                          DB
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                      {item.category} · {item.timeAgo}
                    </p>
                  </div>
                </div>

                {/* Right: Grade Badge & Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`inline-flex items-center justify-center px-2.5 py-1 min-w-[34px] h-[28px] rounded-xl text-xs ${item.gradeBg} ${item.gradeColor}`}
                  >
                    {item.grade}
                  </span>

                  {onDeleteItem && item.is_database_record && (
                    <button
                      onClick={(e) => onDeleteItem(item.id, e)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete permanent record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
