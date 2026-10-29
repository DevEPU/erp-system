"use client";

import { useState, useEffect } from "react";
import { X, Search, Package, Info, Tag, Layers, CheckCircle2, Box, BadgeCheck } from "lucide-react";
import { API_BASE_URL } from "@/lib/constants";
import api from "@/lib/api";

type Product = {
  id: number;
  product_code: string;
  product_name: string;
  product_unit: string;
  product_price: number;
  is_asset: number | boolean;
  is_mandatory: number | boolean;
};

type Category = {
  id: number;
  category_code: string;
  category_name: string;
  parent_name?: string;
  valuation_method?: string;
};

interface ProductCategoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
}

export default function ProductCategoryDetailModal({
  isOpen,
  onClose,
  category,
}: ProductCategoryDetailModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [assetFilter, setAssetFilter] = useState<string>("all");
  const [mandatoryFilter, setMandatoryFilter] = useState<string>("all");

  const backendUrl = `${API_BASE_URL}/api`;

  useEffect(() => {
    if (isOpen && category) {
      fetchCategoryDetails();
    }
  }, [isOpen, category]);

  const fetchCategoryDetails = async () => {
    if (!category) return;
    setLoading(true);
    try {
      const res = await api.express.get(`/product-categories/${category.id}`);
      const json = res.data;
      console.log("[CategoryModal] API Response:", json);
      
      // Try multiple structures for robustness
      const productList = json.products || json.data?.products || (Array.isArray(json.data) ? json.data : []);
      console.log(`[CategoryModal] Found ${productList.length} products`);
      
      setProducts(productList);
    } catch (error) {
      console.error("[CategoryModal] Fetch Exception:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !category) return null;

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.product_code?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    
    const isAsset = !!p.is_asset;
    const matchesAsset = 
      assetFilter === "all" || 
      (assetFilter === "asset" && isAsset) || 
      (assetFilter === "non-asset" && !isAsset);

    const isMandatory = !!p.is_mandatory;
    const matchesMandatory = 
      mandatoryFilter === "all" || 
      (mandatoryFilter === "mandatory" && isMandatory) || 
      (mandatoryFilter === "others" && !isMandatory);

    return matchesSearch && matchesAsset && matchesMandatory;
  });

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300 flex flex-col">
        
        {/* Header */}
        <div className="bg-linear-to-br from-emerald-600 to-teal-700 p-8 pb-6 text-white relative shrink-0">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2 bg-white/20 w-fit px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">
                <Tag size={12} />
                Category Details
              </div>
              <h2 className="text-3xl font-black tracking-tight mt-2">{category.category_name}</h2>
              <p className="text-emerald-50/70 text-sm font-medium">
                Code: {category.category_code} {category.parent_name && `• Parent: ${category.parent_name}`}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
               <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl px-4 py-3 flex items-center gap-3">
                    <Package className="text-emerald-200" size={20} />
                    <div>
                        <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-tighter">Total Products</p>
                        <p className="text-lg font-black leading-none">{products.length}</p>
                    </div>
               </div>
               {category.valuation_method && (
                 <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl px-4 py-3 flex items-center gap-3">
                      <Layers className="text-emerald-200" size={20} />
                      <div>
                          <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-tighter">Valuation Method</p>
                          <p className="text-lg font-black leading-none">{category.valuation_method}</p>
                      </div>
                 </div>
               )}
          </div>
        </div>

        {/* Filters Area */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row gap-4 shrink-0">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search product name or code..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select 
              className="px-4 py-3 rounded-2xl border border-gray-100 bg-white text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value)}
            >
              <option value="all">Semua Tipe</option>
              <option value="asset">Asset Only</option>
              <option value="non-asset">Non Assets</option>
            </select>
            <select 
              className="px-4 py-3 rounded-2xl border border-gray-100 bg-white text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
              value={mandatoryFilter}
              onChange={(e) => setMandatoryFilter(e.target.value)}
            >
              <option value="all">Semua Urgensi</option>
              <option value="mandatory">Mandatory</option>
              <option value="others">Others</option>
            </select>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-gray-400">
               <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
               <p className="text-sm font-bold uppercase tracking-widest">Fetching Products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-gray-400">
               <div className="p-6 bg-gray-50 rounded-full">
                  <Package size={48} className="opacity-20" />
               </div>
               <p className="text-sm font-bold uppercase tracking-widest">No products found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredProducts.map((p, idx) => (
                <div key={`${p.id}_${idx}`} className="p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                   <div className="flex items-start gap-4">
                      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                         <Box size={24} />
                      </div>
                      <div>
                         <p className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{p.product_code || "NO CODE"}</p>
                         <h4 className="text-lg font-black text-gray-900 tracking-tight">{p.product_name}</h4>
                         <div className="flex flex-wrap gap-2 mt-2">
                             {!!p.is_asset && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest border border-blue-100 flex items-center gap-1">
                                    <Layers size={10} /> Asset
                                </span>
                             )}
                             {!!p.is_mandatory && (
                                <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 text-[10px] font-black uppercase tracking-widest border border-orange-100 flex items-center gap-1">
                                    <BadgeCheck size={10} /> Mandatory
                                </span>
                             )}
                             <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest border border-gray-100">
                                Unit: {p.product_unit || "-"}
                             </span>
                         </div>
                      </div>
                   </div>
                   <div className="text-right">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Standard Price</p>
                       <p className="text-xl font-black text-gray-900">Rp {p.product_price?.toLocaleString() || 0}</p>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 text-gray-400">
             <Info size={14} />
             <p className="text-[10px] font-bold uppercase tracking-widest">Showing {filteredProducts.length} of {products.length} products</p>
          </div>
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-gray-200"
          >
            Close Detail
          </button>
        </div>
      </div>
    </div>
  );
}
