import React, { useState } from 'react';
import { Wheat, Coffee, Cookie, Image as ImageIcon, Trash2, Database, ChevronDown, RefreshCw } from 'lucide-react';
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
    icon: Wheat,
    iconBg: 'bg-[#F4FBD6] text-zinc-900',
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
    icon: Coffee,
    iconBg: 'bg-[#D7F9FB] text-zinc-900',
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
    icon: Cookie,
    iconBg: 'bg-[#FDE2EC] text-zinc-900',
    presetId: 'imported-chocolate',
    image_url: '/banners/banner_chocolate.jpg',
  },
];

const ItemThumbnail: React.FC<{
  imageUrl?: string;
  name: string;
  IconComponent: any;
  iconBg?: string;
}> = ({ imageUrl, name, IconComponent, iconBg }) => {
  const [hasError, setHasError] = useState(false);

  if (imageUrl && !hasError) {
    return (
      <div className="w-11 h-11 rounded-xl bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0 shadow-inner group-hover:scale-105 transition-transform flex items-center justify-center relative">
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setHasError(true)}
        />
        <span className="absolute bottom-0.5 right-0.5 text-[8px] font-mono text-[#D5FF3F] font-black px-1 rounded bg-black/80">
          IMG
        </span>
      </div>
    );
  }

  return (
    <div
      className={`w-11 h-11 rounded-2xl ${iconBg || 'bg-zinc-100 text-zinc-800'} flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform`}
    >
      <IconComponent className="w-5 h-5 stroke-[2.2]" />
    </div>
  );
};

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
          <h3 className="text-base font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
            <span>Database Records & Specimens</span>
            <span className="text-[10px] font-mono bg-zinc-100 text-zinc-700 border border-zinc-200 px-2 py-0.5 rounded-full font-bold">
              {items.length} records
            </span>
          </h3>
        </div>

        {/* Filter chips & View all button */}
        <div className="flex items-center gap-2">
          <div className="bg-white p-0.5 rounded-xl border border-zinc-200/90 shadow-2xs flex items-center text-[10px] font-mono font-bold">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterMode === 'all'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setFilterMode('uploaded')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                filterMode === 'uploaded'
                  ? 'bg-[#0E1118] text-[#D5FF3F] shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Database className="w-3 h-3 text-[#D5FF3F]" />
              <span>Uploaded ({uploadedCount})</span>
            </button>
          </div>

          {onSeeAll && (
            <button
              onClick={onSeeAll}
              className="text-xs font-black text-[#8B5CF6] uppercase tracking-wider hover:opacity-80 transition-opacity"
            >
              SEE ALL
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2.5">
        {displayedItems.length === 0 ? (
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 text-center text-zinc-500 font-mono text-xs shadow-2xs">
            <p className="font-bold text-zinc-800">No uploaded label specimens found yet.</p>
            <p className="text-[11px] text-zinc-500 mt-1">
              Upload a label image from the top button to store it permanently into the database.
            </p>
          </div>
        ) : (
          displayedItems.map((item) => {
            const IconComponent = item.icon || ImageIcon;

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="bg-white rounded-2xl p-3 sm:p-3.5 border border-zinc-200/90 shadow-sm flex items-center justify-between gap-3 cursor-pointer hover:border-zinc-300 hover:shadow-md active:scale-[0.99] transition-all group relative overflow-hidden"
              >
                {/* Left: Thumbnail or Icon and Details */}
                <div className="flex items-center gap-3 min-w-0">
                  <ItemThumbnail
                    imageUrl={item.image_url}
                    name={item.name}
                    IconComponent={IconComponent}
                    iconBg={item.iconBg}
                  />

                  <div className="truncate">
                    <div className="flex items-center gap-1.5 truncate">
                      <h4 className="font-extrabold text-[13px] sm:text-sm text-zinc-900 leading-snug truncate">
                        {item.name}
                      </h4>
                      {item.is_database_record && (
                        <span className="text-[9px] font-mono font-bold bg-[#D5FF3F] text-zinc-950 px-1.5 py-0.2 rounded-full shrink-0">
                          DB
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-medium text-zinc-500 mt-0.5 truncate">
                      {item.category} · {item.timeAgo}
                    </p>
                  </div>
                </div>

                {/* Right: Grade Badge & Delete Button */}
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`inline-flex items-center justify-center px-2.5 py-1 min-w-[32px] h-[28px] rounded-full text-xs shadow-xs ${item.gradeBg} ${item.gradeColor}`}
                  >
                    {item.grade}
                  </span>

                  {onDeleteItem && item.is_database_record && (
                    <button
                      onClick={(e) => onDeleteItem(item.id, e)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete record from database"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Load More Packet Button */}
        {onLoadMore && hasMore && (
          <div className="pt-2 flex justify-center">
            <button
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="w-full py-2.5 px-4 rounded-xl bg-white border border-zinc-300 hover:border-zinc-800 text-zinc-900 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs hover:shadow-xs transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {isLoadingMore ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#8B5CF6]" />
                  <span>Fetching Next Packet...</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Load More Records (Packet of 8)</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
