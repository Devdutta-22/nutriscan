import React, { useState } from 'react';
import { Image as ImageIcon, Trash2, Database, ChevronLeft, ChevronRight, Plus, CheckCircle2 } from 'lucide-react';
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
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export const RECENT_ITEMS: ScannedItem[] = [
  {
    id: '1',
    name: 'Multigrain Crackers',
    category: 'Packaged Foods',
    timeAgo: '2h ago',
    grade: 'A+',
    gradeBg: 'bg-[#D5FF3F]',
    gradeColor: 'text-zinc-950 font-black',
    presetId: 'compliant-biscuit',
    image_url: '/banners/banner_goodday.jpg',
  },
  {
    id: '2',
    name: 'Hydrating Face Cream',
    category: 'Cosmetics',
    timeAgo: 'Yesterday',
    grade: 'C',
    gradeBg: 'bg-[#FF2A85]',
    gradeColor: 'text-white font-black',
    presetId: 'violating-face-cream',
    image_url: '/banners/banner_cosmetic.jpg',
  },
  {
    id: '3',
    name: 'Swiss Dark Chocolate',
    category: 'Confectionery',
    timeAgo: '2 days ago',
    grade: 'B-',
    gradeBg: 'bg-[#8B5CF6]',
    gradeColor: 'text-white font-black',
    presetId: 'imported-chocolate',
    image_url: '/banners/banner_chocolate.jpg',
  },
];

export const RecentlyScanned: React.FC<RecentlyScannedProps> = ({
  items = RECENT_ITEMS,
  onSelectItem,
  onSeeAll,
  onDeleteItem,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'uploaded'>('all');
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const displayedItems = items.filter((item) => {
    if (filterMode === 'uploaded') {
      return item.is_database_record || Boolean(item.image_url);
    }
    return true;
  });

  const uploadedCount = items.filter((i) => i.is_database_record || Boolean(i.image_url)).length;

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-zinc-900" />
          <h3 className="text-base font-extrabold text-zinc-900 tracking-tight">
            Recent Scans
          </h3>
          <span className="text-[10px] font-mono font-bold bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full border border-zinc-200">
            {displayedItems.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <div className="bg-zinc-100/80 p-0.5 rounded-xl flex items-center text-[10px] font-bold">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterMode === 'all'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterMode('uploaded')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                filterMode === 'uploaded'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Database className="w-2.5 h-2.5 text-indigo-600" />
              <span>Saved ({uploadedCount})</span>
            </button>
          </div>

          {/* Navigation scroll arrows (hidden on small screens) */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => handleScroll('left')}
              className="w-7 h-7 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 active:scale-95 transition-all shadow-2xs"
              title="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              className="w-7 h-7 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 active:scale-95 transition-all shadow-2xs"
              title="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {onSeeAll && (
            <button
              onClick={onSeeAll}
              className="text-xs font-black text-zinc-600 hover:text-zinc-900 uppercase tracking-wider transition-colors ml-1"
            >
              View All
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Scrollable Carousel of Square Product Cards */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory -mx-1 px-1 scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {displayedItems.length === 0 ? (
          <div className="w-full bg-zinc-50 border border-dashed border-zinc-200 rounded-3xl p-8 text-center text-zinc-400 font-mono text-xs">
            No scanned specimens in this view.
          </div>
        ) : (
          displayedItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectItem(item)}
              className="group snap-start shrink-0 w-44 sm:w-52 bg-white rounded-3xl p-3 border border-zinc-200/90 hover:border-zinc-300 hover:shadow-md active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
            >
              {/* Top: Square Product Image & Badges */}
              <div className="space-y-2.5">
                <div className="w-full aspect-square rounded-2xl bg-zinc-100 overflow-hidden relative border border-zinc-100 shadow-inner flex items-center justify-center">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-50 text-zinc-400">
                      <ImageIcon className="w-10 h-10 stroke-[1.5]" />
                    </div>
                  )}

                  {/* Top-Right Grade Tag */}
                  <span
                    className={`absolute top-2 right-2 px-2.5 py-0.5 rounded-full text-[11px] font-black shadow-xs ${item.gradeBg} ${item.gradeColor}`}
                  >
                    {item.grade}
                  </span>

                  {/* Top-Left Database Indicator (if stored) */}
                  {item.is_database_record && (
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/75 text-[#D5FF3F] text-[9px] font-mono font-bold tracking-wider backdrop-blur-xs">
                      DB
                    </span>
                  )}
                </div>

                {/* Middle: Product Name & Category */}
                <div className="space-y-0.5">
                  <h4 className="font-extrabold text-[13px] sm:text-sm text-zinc-900 leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
                    {item.name}
                  </h4>
                  <p className="text-[11px] font-medium text-zinc-400 truncate">
                    {item.category}
                  </p>
                </div>
              </div>

              {/* Bottom: Timestamp & Delete Action */}
              <div className="pt-2.5 mt-2 border-t border-zinc-100 flex items-center justify-between">
                <span className="text-[10px] font-mono font-medium text-zinc-400">
                  {item.timeAgo}
                </span>

                {onDeleteItem && item.is_database_record && (
                  <button
                    onClick={(e) => onDeleteItem(item.id, e)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                    title="Delete record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}

        {/* Optional "Load More" Card at end of carousel */}
        {onLoadMore && hasMore && (
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="snap-start shrink-0 w-36 sm:w-44 bg-zinc-50 hover:bg-zinc-100/80 rounded-3xl p-4 border border-dashed border-zinc-300 hover:border-zinc-400 flex flex-col items-center justify-center text-center gap-2 text-zinc-600 transition-all active:scale-[0.98] cursor-pointer"
          >
            <div className="w-10 h-10 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center shadow-xs">
              <Plus className={`w-5 h-5 text-zinc-700 ${isLoadingMore ? 'animate-spin' : ''}`} />
            </div>
            <span className="text-xs font-bold text-zinc-800 leading-tight">
              {isLoadingMore ? 'Loading...' : 'Load More Records'}
            </span>
            <span className="text-[10px] font-mono text-zinc-400">+8 specimens</span>
          </button>
        )}
      </div>
    </div>
  );
};
