import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Trash2, Database, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
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
  {
    id: '4',
    name: 'Sparkling Orange Soda',
    category: 'Beverages',
    timeAgo: '3 days ago',
    grade: 'A',
    gradeBg: 'bg-[#10B981]',
    gradeColor: 'text-white font-black',
    presetId: 'orange-soda',
    image_url: '/banners/banner_soda.jpg',
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const displayedItems = items.filter((item) => {
    if (filterMode === 'uploaded') {
      return item.is_database_record || Boolean(item.image_url);
    }
    return true;
  });

  const uploadedCount = items.filter((i) => i.is_database_record || Boolean(i.image_url)).length;

  // Group items into pages / chunks of 4 (2x2 grid each)
  const chunks: ScannedItem[][] = [];
  for (let i = 0; i < displayedItems.length; i += 4) {
    chunks.push(displayedItems.slice(i, i + 4));
  }

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -scrollRef.current.clientWidth * 0.95 : scrollRef.current.clientWidth * 0.95;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-3">
      {/* Header Bar */}
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

          {/* Navigation scroll arrows (shows when multiple 2x2 pages exist) */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleScroll('left')}
              className="w-7 h-7 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 active:scale-95 transition-all shadow-2xs cursor-pointer"
              title="Previous 4 products"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              className="w-7 h-7 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 active:scale-95 transition-all shadow-2xs cursor-pointer"
              title="Next 4 products"
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

      {/* Horizontal Carousel of 2x2 Rectangular Product Grid Blocks (Blinkit / Zepto style) */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto pb-1.5 scrollbar-none snap-x snap-mandatory scroll-smooth -mx-1 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {chunks.length === 0 ? (
          <div className="w-full bg-white rounded-3xl p-12 border border-zinc-200 text-center text-zinc-400 font-mono text-xs">
            No scanned specimens found in this view.
          </div>
        ) : (
          chunks.map((chunk, chunkIndex) => (
            <div
              key={chunkIndex}
              // Each rectangular container holds a 2x2 grid of 4 square items, snapped on horizontal scroll
              className="snap-start shrink-0 w-full max-w-[420px] sm:max-w-[480px] bg-white rounded-3xl p-3 sm:p-4 border border-zinc-200/90 shadow-sm flex flex-col justify-between"
            >
              {/* 2x2 Grid of 4 Square Product Cards */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {chunk.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    className="group bg-zinc-50/80 hover:bg-white rounded-2xl p-2 sm:p-2.5 border border-zinc-200/70 hover:border-zinc-300 hover:shadow-md active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between"
                  >
                    {/* 1. Square Image Container */}
                    <div className="w-full aspect-square rounded-xl bg-white overflow-hidden relative border border-zinc-100 shadow-inner flex items-center justify-center">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-zinc-400">
                          <ImageIcon className="w-8 h-8 stroke-[1.5]" />
                        </div>
                      )}

                      {/* Top-Right Grade Badge */}
                      <span
                        className={`absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full text-[9.5px] font-black shadow-xs ${item.gradeBg} ${item.gradeColor}`}
                      >
                        {item.grade}
                      </span>

                      {/* Top-Left Database Indicator */}
                      {item.is_database_record && (
                        <span className="absolute top-1.5 left-1.5 px-1 py-0.2 rounded-md bg-black/75 text-[#D5FF3F] text-[7.5px] font-mono font-bold tracking-wider backdrop-blur-xs">
                          DB
                        </span>
                      )}
                    </div>

                    {/* 2. Product Name & Category */}
                    <div className="pt-2 pb-0.5 space-y-0.5">
                      <h4 className="font-extrabold text-[12px] sm:text-[13px] text-zinc-900 leading-snug line-clamp-1 group-hover:text-indigo-600 transition-colors">
                        {item.name}
                      </h4>
                      <p className="text-[10px] font-medium text-zinc-400 truncate">
                        {item.category}
                      </p>
                    </div>

                    {/* 3. Bottom Row: Timestamp & Delete Action */}
                    <div className="pt-1 border-t border-zinc-200/50 flex items-center justify-between mt-1">
                      <span className="text-[8.5px] font-mono font-medium text-zinc-400">
                        {item.timeAgo}
                      </span>

                      {onDeleteItem && item.is_database_record && (
                        <button
                          onClick={(e) => onDeleteItem(item.id, e)}
                          className="p-1 rounded text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                          title="Delete record"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Fill empty spots in chunk with blank placeholders if chunk has < 4 items */}
                {Array.from({ length: Math.max(0, 4 - chunk.length) }).map((_, emptyIdx) => (
                  <div
                    key={`empty-${emptyIdx}`}
                    className="rounded-2xl border border-dashed border-zinc-200/60 p-2 flex flex-col items-center justify-center text-center opacity-40"
                  >
                    <div className="w-full aspect-square rounded-xl bg-zinc-50 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-zinc-300" />
                    </div>
                    <span className="text-[10px] text-zinc-300 font-mono mt-1">—</span>
                  </div>
                ))}
              </div>

              {/* Bottom Card Footer with page indicator */}
              <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <span>Batch {chunkIndex + 1} of {chunks.length}</span>
                <span className="font-bold text-zinc-500">4 items</span>
              </div>
            </div>
          ))
        )}

        {/* Load More Next Batch Tile */}
        {onLoadMore && hasMore && (
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="snap-start shrink-0 w-36 sm:w-44 bg-white hover:bg-zinc-50 rounded-3xl p-4 border border-dashed border-zinc-300 hover:border-zinc-400 flex flex-col items-center justify-center text-center gap-2 text-zinc-600 transition-all active:scale-[0.98] cursor-pointer shadow-sm"
          >
            <div className="w-10 h-10 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center shadow-xs">
              <Plus className={`w-5 h-5 text-zinc-700 ${isLoadingMore ? 'animate-spin' : ''}`} />
            </div>
            <span className="text-xs font-bold text-zinc-800 leading-tight">
              {isLoadingMore ? 'Fetching...' : 'Load More Products'}
            </span>
            <span className="text-[9px] font-mono text-zinc-400">+8 records</span>
          </button>
        )}
      </div>
    </div>
  );
};
