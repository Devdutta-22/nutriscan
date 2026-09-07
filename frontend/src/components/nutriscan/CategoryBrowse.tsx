import React from 'react';
import { UtensilsCrossed, Milk, Cookie } from 'lucide-react';

interface CategoryBrowseProps {
  onSelectCategory?: (category: string) => void;
}

export const CategoryBrowse: React.FC<CategoryBrowseProps> = ({ onSelectCategory }) => {
  const categories = [
    {
      id: 'packaged_foods',
      title: 'Packaged Foods',
      items: '312 Items',
      iconBg: 'bg-[#D5FF3F]',
      iconColor: 'text-zinc-950',
      icon: UtensilsCrossed,
      circleColor: '#7C8733',
    },
    {
      id: 'beverages',
      title: 'Beverages',
      items: '158 Items',
      iconBg: 'bg-[#26E1E8]',
      iconColor: 'text-zinc-950',
      icon: Milk,
      circleColor: '#1F6E7B',
    },
    {
      id: 'snacks_sweets',
      title: 'Snacks & Sweets',
      items: '201 Items',
      iconBg: 'bg-[#FF2A85]',
      iconColor: 'text-white',
      icon: Cookie,
      circleColor: '#7B2447',
    },
  ];

  return (
    <div className="pt-4">
      <h3 className="text-base font-extrabold text-zinc-900 tracking-tight pb-2.5">
        Browse by Category
      </h3>

      <div className="grid grid-cols-3 gap-2.5">
        {categories.map((cat) => {
          const IconComponent = cat.icon;
          return (
            <div
              key={cat.id}
              onClick={() => onSelectCategory?.(cat.id)}
              className="bg-[#0E1118] text-white rounded-[20px] p-3 relative overflow-hidden flex flex-col justify-between h-[130px] cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm group"
            >
              {/* Overlapping decorative circle at bottom right */}
              <div
                className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full opacity-60 pointer-events-none group-hover:scale-125 transition-transform duration-300"
                style={{ backgroundColor: cat.circleColor }}
              />

              {/* Top Icon Badge */}
              <div
                className={`w-9 h-9 rounded-xl ${cat.iconBg} ${cat.iconColor} flex items-center justify-center relative z-10 shadow-sm`}
              >
                <IconComponent className="w-4 h-4 stroke-[2.5]" />
              </div>

              {/* Titles */}
              <div className="relative z-10">
                <p className="font-extrabold text-[12px] leading-tight text-white line-clamp-2">
                  {cat.title}
                </p>
                <p className="text-[9.5px] font-medium text-zinc-400 mt-1">
                  {cat.items}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
