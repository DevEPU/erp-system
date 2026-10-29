"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check } from "lucide-react";

type Option = {
  value: string | number;
  label: string;
};

type Props = {
  options: Option[];
  value: string | number | string[] | number[] | null | undefined;
  onChange: (value: any) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  isMulti?: boolean;
};

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  label,
  className,
  disabled = false,
  isMulti = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const normalize = (str: string) => str.toLowerCase().replace(/\s+/g, "");

  const filtered = options.filter((opt) =>
    normalize(opt.label).includes(normalize(search)),
  );

  const isSelected = (opt: Option) => {
    if (isMulti && Array.isArray(value)) {
      return value.some((v) => String(v) === String(opt.value));
    }
    if (value === null || value === undefined || value === "") {
      return false;
    }
    return String(opt.value) === String(value);
  };

  const selectedOptions = options.filter((opt) => isSelected(opt));
  
  const displayLabel = () => {
    if (selectedOptions.length === 0) return placeholder;
    if (isMulti) {
      return selectedOptions.map(o => o.label).join(", ");
    }
    return selectedOptions[0].label;
  };

  return (
    <div className={`space-y-1.5 ${className}`} ref={wrapperRef}>
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full text-left px-3 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all flex justify-between items-center ${
            disabled ? "opacity-60 cursor-not-allowed bg-gray-50" : ""
          }`}
        >
          <span className={`truncate ${selectedOptions.length > 0 ? "text-gray-900" : "text-gray-400"}`}>
            {displayLabel()}
          </span>
          <ChevronDown size={16} className="text-gray-400 shrink-0" />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden animate-in zoom-in-95 duration-100">
            <div className="p-2 border-b border-gray-50 flex items-center gap-2">
              <Search size={14} className="text-gray-400" />
              <input
                type="text"
                className="w-full text-sm outline-none placeholder:text-gray-300"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filtered.length > 0 ? (
                filtered.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      if (isMulti) {
                        const current = Array.isArray(value) ? [...value] : [];
                        const index = current.findIndex(v => String(v) === String(opt.value));
                        if (index > -1) {
                            current.splice(index, 1);
                        } else {
                            current.push(opt.value);
                        }
                        onChange(current);
                      } else {
                        onChange(opt.value);
                        setIsOpen(false);
                        setSearch("");
                      }
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between ${
                      isSelected(opt)
                        ? "bg-emerald-50 text-emerald-700 font-medium"
                        : "text-gray-600"
                    }`}
                  >
                    {opt.label}
                    {isSelected(opt) && (
                      <Check size={14} />
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-sm text-gray-400">
                  No options found.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
