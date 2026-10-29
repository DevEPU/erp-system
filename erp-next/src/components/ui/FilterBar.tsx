import { Search, Filter } from "lucide-react";

interface FilterBarProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onFilterClick?: () => void;
  filterBadgeCount?: number;
}

export default function FilterBar({
  searchPlaceholder = "Cari berdasarkan nama atau kode...",
  searchValue,
  onSearchChange,
  onFilterClick,
  filterBadgeCount = 0,
}: FilterBarProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-1.5 shadow-sm flex flex-col md:flex-row items-center gap-2 transition-all focus-within:ring-2 focus-within:ring-emerald-500/10 focus-within:border-emerald-500">
      <div className="flex-1 relative group w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={16} />
        <input
          type="text"
          placeholder={searchPlaceholder}
          className="w-full pl-10 pr-4 py-2.5 bg-transparent outline-none text-sm font-medium text-gray-700 placeholder-gray-400"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <button
        onClick={onFilterClick}
        className="relative w-full md:w-auto px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 group"
      >
        <Filter size={14} strokeWidth={3} className="group-hover:rotate-12 transition-transform" />
        Sort & Filter
        {filterBadgeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-emerald-600 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-in zoom-in duration-300">
            {filterBadgeCount}
          </span>
        )}
      </button>
    </div>
  );
}
