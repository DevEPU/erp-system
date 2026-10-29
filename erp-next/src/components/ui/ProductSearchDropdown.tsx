"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Package, X } from "lucide-react";

export type ProductOption = {
  id: number;
  product_name: string;
  product_code?: string;
  product_unit?: string;
  product_price?: number;
  sell_price_l1?: number;
  sale_price?: number;
  is_asset?: boolean | number;
  category?: { id: number; category_name: string };
  [key: string]: any;
};

type Props = {
  products: ProductOption[];
  value: number | string | null | undefined;
  onChange: (product: ProductOption) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Show sale_price instead of product_price in badge */
  useSalePrice?: boolean;
};

export default function ProductSearchDropdown({
  products,
  value,
  onChange,
  placeholder = "Pilih Produk...",
  disabled = false,
  className = "",
  useSalePrice = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, "");

  const filtered = products.filter((p) => {
    const q = normalize(search);
    return (
      normalize(p.product_name || "").includes(q) ||
      normalize(p.product_code || "").includes(q) ||
      normalize(p.category?.category_name || "").includes(q)
    );
  });

  const selected = products.find((p) => String(p.id) === String(value));

  const displayPrice = (p: ProductOption) => {
    const price = useSalePrice
      ? Number(p.sell_price_l1 || p.sale_price || p.product_price || 0)
      : Number(p.product_price || 0);
    return price > 0 ? `Rp ${price.toLocaleString("id-ID")}` : "–";
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen((o) => !o);
            setSearch("");
          }
        }}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 border rounded-xl bg-white text-left transition-all
          ${disabled ? "opacity-60 cursor-not-allowed bg-gray-50" : "hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"}
          ${isOpen ? "border-emerald-500 ring-2 ring-emerald-100" : "border-gray-200"}`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {selected ? (
            <>
              <div className="shrink-0 w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Package size={12} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter block leading-none">
                  {selected.category?.category_name || "–"}
                </span>
                <span className="text-sm font-bold text-gray-900 truncate block">
                  {selected.product_name}
                </span>
              </div>
              {selected.product_code && (
                <span className="shrink-0 text-[9px] font-black bg-gray-100 border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                  {selected.product_code}
                </span>
              )}
            </>
          ) : (
            <span className="text-gray-400 text-sm font-medium">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {selected && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                // Reset by sending a dummy — parent should handle
                onChange({ id: 0, product_name: "", product_code: "" } as ProductOption);
              }}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.click()}
              className="p-0.5 rounded-full hover:bg-gray-100 text-gray-300 hover:text-red-400 transition-colors"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={15}
            className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute z-[9999] top-full left-0 w-full min-w-[320px] mt-1 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-50 bg-gray-50/60">
            <Search size={14} className="text-emerald-500 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Cari nama / kode / kategori..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-300 font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-gray-300 hover:text-gray-500"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Counter */}
          <div className="px-3 py-1 bg-gray-50/40 border-b border-gray-50 text-[10px] text-gray-400 font-bold">
            {filtered.length} produk ditemukan
          </div>

          {/* Options list */}
          <div className="max-h-72 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400 font-medium">
                Produk tidak ditemukan
              </div>
            ) : (
              filtered.map((p) => {
                const isSelected = String(p.id) === String(value);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onChange(p);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`w-full flex items-start justify-between gap-3 px-4 py-3 text-left border-b border-gray-50 last:border-0 transition-colors
                      ${isSelected
                        ? "bg-emerald-50 text-emerald-800"
                        : "hover:bg-gray-50 text-gray-700"
                      }`}
                  >
                    {/* Left: category + name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-blue-600 uppercase tracking-tighter leading-none mb-0.5">
                        {p.category?.category_name || "Tanpa Kategori"}
                      </p>
                      <p className={`font-bold text-sm truncate ${isSelected ? "text-emerald-900" : "text-gray-800"}`}>
                        {p.product_name}
                      </p>
                      {p.product_code && (
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{p.product_code}</p>
                      )}
                    </div>

                    {/* Right: badges */}
                    <div className="shrink-0 flex flex-col items-end gap-1 mt-0.5">
                      <span
                        className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border
                          ${p.is_asset
                            ? "bg-orange-100 text-orange-600 border-orange-200"
                            : "bg-blue-100 text-blue-600 border-blue-200"
                          }`}
                      >
                        {p.is_asset ? "ASSET" : "NON-ASSET"}
                      </span>
                      <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {p.product_unit || "–"}
                      </span>
                      <span className="text-[9px] font-black text-emerald-700">
                        {displayPrice(p)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
