"use client";

import { useState, useEffect } from "react";
import { X, Package, Warehouse, Info, Tag, ClipboardList, TrendingUp, History, Download, Calendar, DollarSign, Search, Building2, Users, Layers, ShieldCheck, Edit } from "lucide-react";
import api from "@/lib/api";
import GoodsReceiptModal from "../supplier-pembelian/GoodsReceiptModal";

type ProductUnit = {
  level: number;
  barcode: string;
  unit_code: string;
  tax_unit: string;
  conversion_qty: number;
  color: string;
  buy_price: number;
  sell_price: number;
};

type ProductLocation = {
  warehouse_name: string;
  warehouse_short_name?: string;
  aisle: string;
  stock: number;
  min_qty: number;
  max_qty: number;
  hpp?: number;
};

type Product = {
  id: number;
  product_name: string;
  product_code?: string;
  product_type?: string;
  bom_code?: string;
  category_id?: number;
  product_stock_alert?: number;
  category?: { category_name: string };
  supplier?: { id?: number | string; supplier_name: string; supplier_code: string };
  product_price: number;
  product_quantity: number;
  min_qty: number;
  max_qty: number;
  product_unit: string;
  product_note?: string;
  is_asset: boolean | number;
  is_mandatory: boolean | number;
  units?: ProductUnit[];
  locations?: ProductLocation[];
  buy_price_l1?: number;
  sell_price_l1?: number;
  brand?: string;
  barcode?: string;
  hsn_sat_code?: string;
  purchase_price?: number;
  weight_kg?: number;
  volume_m3?: number;
  shelf_life_days?: number;
  lead_time_days?: number;
  valuation_method?: string;
};

type ProductDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onEdit?: (product: any) => void;
};

export default function ProductDetailModal({ isOpen, onClose, product: productProp, onEdit }: ProductDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"persediaan" | "transaksi">("persediaan");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [selectedGR, setSelectedGR] = useState<number | null>(null);

  const [detailProduct, setDetailProduct] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!productProp) return;
      setLoadingDetail(true);
      try {
        const supplierParam = productProp.supplier && productProp.supplier.id ? `?supplier_id=${productProp.supplier.id}` : '';
        const res = await api.express.get(`/products/${productProp.id}${supplierParam}`);
        const data = res.data.data;
        
        // If it is a Sub-Item (supplier is present on the clicked product row)
        if (productProp.supplier) {
          const subBuyPrice1 = productProp.buy_price_l1 || productProp.product_price || 0;
          const subSellPrice1 = productProp.sell_price_l1 || 0;
          
          const parentBuyPrice1 = data.product_price || 0;
          const parentSellPrice1 = data.units?.[0]?.sell_price || 0;

          // Scale units
          const scaledUnits = (data.units || []).map((u: any) => {
            let buy_price = Number(u.buy_price) || 0;
            let sell_price = Number(u.sell_price) || 0;

            if (u.level === 1) {
              buy_price = subBuyPrice1;
              sell_price = subSellPrice1;
            } else {
              // Scale buy price
              if (parentBuyPrice1 > 0) {
                buy_price = buy_price * (subBuyPrice1 / parentBuyPrice1);
              } else {
                buy_price = subBuyPrice1 * (Number(u.conversion_qty) || 1);
              }

              // Scale sell price
              if (parentSellPrice1 > 0) {
                sell_price = sell_price * (subSellPrice1 / parentSellPrice1);
              } else {
                sell_price = subSellPrice1 * (Number(u.conversion_qty) || 1);
              }
            }

            return {
              ...u,
              buy_price: Math.round(buy_price),
              sell_price: Math.round(sell_price)
            };
          });

          setDetailProduct({
            ...data,
            product_name: productProp.product_name,
            product_code: productProp.product_code,
            supplier: productProp.supplier,
            buy_price_l1: subBuyPrice1,
            sell_price_l1: subSellPrice1,
            product_price: subBuyPrice1,
            units: scaledUnits
          });
        } else {
          setDetailProduct(data);
        }
      } catch (err) {
        console.error("Error fetching product detail:", err);
      } finally {
        setLoadingDetail(false);
      }
    };

    if (isOpen && productProp) {
      fetchDetail();
    } else {
      setDetailProduct(null);
    }
  }, [isOpen, productProp]);

  useEffect(() => {
    if (isOpen && productProp && activeTab === "transaksi") {
      fetchTransactions();
    }
  }, [isOpen, productProp, activeTab]);

  const fetchTransactions = async () => {
    if (!productProp) return;
    setLoadingTransactions(true);
    try {
      const res = await api.express.get(`/products/${productProp.id}/transactions`);
      setTransactions(res.data.data || []);
      setStats(res.data.stats || null);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  if (!isOpen || !productProp) return null;

  const product = detailProduct || productProp;

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-gray-50 last:border-0 gap-1 sm:gap-4">
      <span className="text-[10px] font-black text-gray-400 w-1/3 uppercase tracking-widest">{label}</span>
      <span className="text-sm font-bold text-gray-800 flex-1">{value || <span className="text-gray-300 italic">Tidak ada</span>}</span>
    </div>
  );

  const displayCode = product.product_code || "Tanpa Kode";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white rounded-[2.5rem] w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-gray-100/80"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-slate-50/60">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl shadow-md shadow-emerald-200">
                <Package size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Detail Spesifikasi Produk</h2>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5 font-mono">{displayCode}</p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex bg-white p-1 rounded-2xl border border-gray-200 shadow-sm ml-4">
              <button
                onClick={() => setActiveTab("persediaan")}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === "persediaan" ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" : "text-gray-400 hover:text-emerald-600"
                }`}
              >
                Rincian Persediaan
              </button>
              <button
                onClick={() => setActiveTab("transaksi")}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === "transaksi" ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" : "text-gray-400 hover:text-emerald-600"
                }`}
              >
                Rincian Transaksi
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(detailProduct || product);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs transition-all shadow-md shadow-emerald-600/20 active:scale-95 border border-emerald-500 cursor-pointer"
              >
                <Edit size={15} strokeWidth={2.5} />
                <span>Edit Produk</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar flex flex-col gap-8">
          {/* Header Info - Always Visible */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-gray-100 pb-8">
            <div className="space-y-4 flex-1">
              <h3 className="text-3xl font-black text-gray-900 leading-tight">{product.product_name}</h3>
              <div className="flex flex-wrap gap-2">
                <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-widest">
                  <Tag size={12} /> {product.category?.category_name || "Tanpa Kategori"}
                </span>
                <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-widest">
                  <Info size={12} /> {product.product_type || "Raw Material"}
                </span>
                {product.bom_code && (
                  <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black bg-purple-50 text-purple-600 border border-purple-100 uppercase tracking-widest">
                    <ClipboardList size={12} /> BOM: {product.bom_code}
                  </span>
                )}
                {!!product.is_asset && (
                  <span className="px-3 py-1.5 rounded-xl bg-orange-50 text-orange-600 text-[10px] font-black uppercase tracking-widest border border-orange-100">
                    Asset
                  </span>
                )}
                {!!product.is_mandatory && (
                  <span className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-600 text-[10px] font-black uppercase tracking-widest border border-teal-100">
                    Mandatory
                  </span>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-1 gap-3 shrink-0">
              <div className="bg-emerald-50 p-4 rounded-[1.5rem] border border-emerald-100 text-center min-w-[140px]">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Stok</p>
                <p className="text-2xl font-black text-emerald-700">{Math.round(product.product_quantity || 0)} <span className="text-xs">{product.product_unit}</span></p>
              </div>
            </div>
          </div>

          {activeTab === "persediaan" ? (
            <>
              {/* SECTION 1: Mapping Supplier & Quota Arrangement */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                    <h4 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                      <Building2 size={16} className="text-indigo-600" />
                      Mapping Supplier & Quota Arrangement Vendor
                    </h4>
                  </div>
                  <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-widest">
                    {product.product_suppliers?.length || (product.supplier ? 1 : 0)} Supplier Terhubung
                  </span>
                </div>

                <div className="bg-gray-50/50 rounded-3xl border border-gray-100 overflow-hidden shadow-sm p-6">
                  {product.product_suppliers && product.product_suppliers.length > 0 ? (
                    <div className="overflow-x-auto rounded-2xl border border-gray-200/60 bg-white">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            <th className="px-5 py-3.5">Nama Vendor / Supplier</th>
                            <th className="px-5 py-3.5">Part No Vendor</th>
                            <th className="px-5 py-3.5 text-right">Harga Beli</th>
                            <th className="px-5 py-3.5 text-right">Harga Jual</th>
                            <th className="px-5 py-3.5 text-center">Quota (%)</th>
                            <th className="px-5 py-3.5 text-center">Min Qty (MOQ)</th>
                            <th className="px-5 py-3.5 text-center">Max Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs font-bold">
                          {product.product_suppliers.map((ps: any, idx: number) => (
                            <tr key={idx} className="hover:bg-indigo-50/20 transition-colors">
                              <td className="px-5 py-4">
                                <div className="font-black text-gray-900">{ps.supplier_name || "-"}</div>
                                <div className="text-[10px] font-bold text-gray-400 font-mono">{ps.supplier_code || "-"}</div>
                              </td>
                              <td className="px-5 py-4 font-mono font-black text-indigo-700">
                                {ps.supplier_part_number || ps.product_code || "-"}
                              </td>
                              <td className="px-5 py-4 text-right font-black text-gray-900">
                                Rp {Number(ps.purchase_price || 0).toLocaleString("id-ID")}
                              </td>
                              <td className="px-5 py-4 text-right font-black text-emerald-600">
                                Rp {Number(ps.sell_price || 0).toLocaleString("id-ID")}
                              </td>
                              <td className="px-5 py-4 text-center">
                                <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  {ps.quota_percent || ps.split_percent || (100 / product.product_suppliers.length).toFixed(0)}%
                                </span>
                              </td>
                              <td className="px-5 py-4 text-center font-mono text-gray-700">
                                {(Number(ps.min_qty) || 0).toLocaleString("id-ID")}
                              </td>
                              <td className="px-5 py-4 text-center font-mono text-gray-700">
                                {(Number(ps.max_qty) || 0).toLocaleString("id-ID")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : product.supplier ? (
                    <div className="bg-white p-5 rounded-2xl border border-gray-200/60 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                          <Building2 size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-900">{product.supplier.supplier_name}</p>
                          <p className="text-[10px] font-bold text-gray-400 font-mono">Kode Vendor: {product.supplier.supplier_code || "-"}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Harga Beli Utama</p>
                        <p className="text-sm font-black text-emerald-700">Rp {Number(product.product_price || 0).toLocaleString("id-ID")}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs font-bold text-gray-400 italic bg-white rounded-2xl border border-dashed border-gray-200">
                      Belum ada vendor/supplier yang di-mapping pada produk ini.
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION: Detail Umum (Visualizing exactly like the user's reference mockup grid) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-emerald-600 rounded-full"></div>
                  <h4 className="text-sm font-black text-gray-800 uppercase tracking-wider">
                    Informasi Produk & Spesifikasi
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-gray-50/50 rounded-3xl border border-gray-100 p-8 shadow-sm">
                  {/* Row 1 */}
                  <div className="col-span-1 md:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama Produk *</label>
                    <div className="px-5 py-3.5 rounded-2xl bg-white border border-gray-200/60 font-black text-gray-800 text-sm shadow-sm transition-all hover:border-emerald-300">
                      {product.product_name}
                    </div>
                  </div>
                  <div className="col-span-1 space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kode Barang</label>
                    <div className="px-5 py-3.5 rounded-2xl bg-white border border-gray-200/60 font-mono font-black text-gray-800 text-sm shadow-sm transition-all hover:border-emerald-300">
                      {product.product_code || "-"}
                    </div>
                  </div>
                  <div className="col-span-1 space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Part Number</label>
                    <div className="px-5 py-3.5 rounded-2xl bg-white border border-gray-200/60 font-black text-gray-800 text-sm shadow-sm transition-all hover:border-emerald-300">
                      {product.part_number || (productProp.supplier ? productProp.product_code : null) || "-"}
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div className="col-span-1 space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipe Barang *</label>
                    <div className="px-5 py-3.5 rounded-2xl bg-white border border-gray-200/60 font-black text-gray-800 text-sm shadow-sm transition-all hover:border-emerald-300">
                      {product.product_type || "Raw Material"}
                    </div>
                  </div>
                  <div className="col-span-1 space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kategori *</label>
                    <div className="px-5 py-3.5 rounded-2xl bg-white border border-gray-200/60 font-black text-gray-800 text-sm shadow-sm transition-all hover:border-emerald-300">
                      {product.category?.category_name || "-"}
                    </div>
                  </div>
                  <div className="col-span-1 space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kode Barang Pajak</label>
                    <div className="px-5 py-3.5 rounded-2xl bg-white border border-gray-200/60 font-black text-gray-800 text-sm shadow-sm transition-all hover:border-emerald-300">
                      {product.tax_item_code || "-"}
                    </div>
                  </div>
                  <div className="col-span-1 space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Supplier Utama</label>
                    <div className="px-5 py-3.5 rounded-2xl bg-white border border-gray-200/60 font-black text-gray-800 text-sm shadow-sm transition-all hover:border-emerald-300">
                      {product.supplier?.supplier_name || "-"}
                    </div>
                  </div>

                  {/* Row 3 */}
                  <div className="col-span-1 space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kode BOM</label>
                    <div className="px-5 py-3.5 rounded-2xl bg-white border border-gray-200/60 font-black text-gray-800 text-sm shadow-sm transition-all hover:border-emerald-300">
                      {product.bom_code || "-"}
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2 flex gap-4 pt-4 shrink-0">
                    <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-gray-200/60 shadow-sm flex-1 justify-between transition-all hover:border-emerald-300">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Asset</span>
                      <div className={`w-12 h-6 flex items-center rounded-full p-1 transition-all ${!!product.is_asset ? 'bg-blue-500 justify-end' : 'bg-gray-200 justify-start'}`}>
                        <div className="bg-white w-4 h-4 rounded-full shadow-md"></div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-gray-200/60 shadow-sm flex-1 justify-between transition-all hover:border-emerald-300">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Mandatory</span>
                      <div className={`w-12 h-6 flex items-center rounded-full p-1 transition-all ${!!product.is_mandatory ? 'bg-teal-500 justify-end' : 'bg-gray-200 justify-start'}`}>
                        <div className="bg-white w-4 h-4 rounded-full shadow-md"></div>
                      </div>
                    </div>
                  </div>
                  {/* Empty spacer for alignment */}
                  <div className="hidden md:block col-span-1"></div>
                </div>
              </div>

              {/* SECTION 2: Warehouse Locations & Other Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Warehouse Locations */}
                <div className="space-y-6">
                  <div className="bg-gray-50/50 rounded-3xl border border-gray-100 p-6">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Warehouse size={14} /> Lokasi Stok
                    </h4>
                    {product.locations && product.locations.length > 0 ? (
                      <div className="space-y-3">
                        {product.locations.map((loc: any, i: number) => (
                          <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-2 transition-all hover:shadow-md">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-xs font-black text-gray-800">{loc.warehouse_short_name || loc.warehouse_name}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aisle: {loc.aisle || "-"}</p>
                              </div>
                              <div className="flex gap-4">
                                <div className="text-right">
                                  <p className="text-[8px] font-black text-blue-600 uppercase">Harga Pokok</p>
                                  <p className="text-xs font-black text-blue-800">Rp {Number(loc.hpp || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[8px] font-black text-emerald-600 uppercase">Stok</p>
                                  <p className="text-xs font-black text-emerald-700">{Math.round(loc.stock || 0)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[8px] font-black text-gray-400 uppercase">Min</p>
                                  <p className="text-xs font-black text-gray-800">{Math.round(loc.min_qty || 0)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[8px] font-black text-gray-400 uppercase">Max</p>
                                  <p className="text-xs font-black text-gray-800">{Math.round(loc.max_qty || 0)}</p>
                                </div>
                              </div>
                            </div>
                            {loc.conditions && (
                              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-50 text-[9px] font-black">
                                {loc.conditions.ok > 0 && (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                    OK: {loc.conditions.ok}
                                  </span>
                                )}
                                {loc.conditions.ng > 0 && (
                                  <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200/60">
                                    NG: {loc.conditions.ng}
                                  </span>
                                )}
                                {loc.conditions.hold > 0 && (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">
                                    Hold: {loc.conditions.hold}
                                  </span>
                                )}
                                {loc.conditions.quarantine > 0 && (
                                  <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200/60">
                                    Quarantine: {loc.conditions.quarantine}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs font-bold text-gray-400 italic py-4 text-center">Belum ada lokasi gudang yang tercatat</p>
                    )}
                  </div>
                </div>

                {/* Right Column: Cost and Notes */}
                <div className="space-y-6">
                  <div className="bg-gray-50/50 rounded-3xl border border-gray-100 p-6 space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Tag size={14} /> Informasi Tambahan
                    </h4>
                    <div className="space-y-1">
                      <InfoRow label="Harga Beli L1 / Dasar" value={`Rp ${Number(product.product_price || 0).toLocaleString('id-ID')}`} />
                      <InfoRow label="Satuan Utama (UOM)" value={product.product_unit} />
                    </div>
                  </div>

                  {product.product_note && (
                    <div className="bg-gray-50/50 rounded-3xl border border-gray-100 p-6">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Catatan</h4>
                      <p className="text-sm font-bold text-gray-600 italic">"{product.product_note}"</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Jenis Satuan Dan Harga (5-level Grid) */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-emerald-600 rounded-full"></div>
                  <h4 className="text-sm font-black text-gray-800 uppercase tracking-wider">
                    Jenis Satuan Dan Harga
                  </h4>
                </div>
                <div className="bg-gray-50/50 rounded-3xl border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/70 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          <th className="px-6 py-4">Level</th>
                          <th className="px-6 py-4">Barcode</th>
                          <th className="px-6 py-4">Satuan *</th>
                          <th className="px-6 py-4">Satuan Pajak</th>
                          <th className="px-6 py-4 text-center">Konversi</th>
                          <th className="px-6 py-4">Warna</th>
                          <th className="px-6 py-4 text-right">Harga Beli</th>
                          <th className="px-6 py-4 text-right">Harga Jual</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(() => {
                          const levels = [1, 2, 3, 4, 5];
                          const baseUnitCode = product.units?.find((u: any) => u.level === 1)?.unit_code || product.product_unit || "PCS";
                          
                          return levels.map((lvl) => {
                            const u = product.units?.find((item: any) => item.level === lvl);
                            const levelLabel = lvl === 1 ? "Satuan Dasar" : `U/M ${lvl}`;
                            const barcode = u?.barcode || "";
                            const unitCode = u?.unit_code || (lvl === 1 ? baseUnitCode : "KODE SATUAN");
                            const taxUnit = u?.tax_unit || "";
                            const conversionQty = u ? Number(u.conversion_qty) : (lvl === 1 ? 1 : 0);
                            const color = u?.color || "";
                            const buyPrice = u ? Number(u.buy_price) : 0;
                            const sellPrice = u ? Number(u.sell_price) : 0;
                            
                            const isDefault = !u;

                            return (
                              <tr key={lvl} className="hover:bg-white/50 transition-colors text-xs font-bold text-gray-700">
                                <td className="px-6 py-4 text-gray-900 font-black whitespace-nowrap">
                                  {levelLabel}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap ${isDefault || !barcode ? "text-gray-300 italic font-medium" : "text-gray-600 font-mono font-bold"}`}>
                                  {barcode || "Barcode"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${isDefault ? "bg-gray-100/60 text-gray-400 border border-gray-200" : "bg-emerald-50 text-emerald-700 border border-emerald-100"}`}>
                                    {unitCode}
                                  </span>
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap ${isDefault || !taxUnit ? "text-gray-300 italic font-medium" : "text-gray-600 font-bold"}`}>
                                  {taxUnit || "Satuan Pajak"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <div className="flex flex-col items-center">
                                    <span className="text-gray-800 font-black">{conversionQty.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}</span>
                                    <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 whitespace-nowrap">
                                      x 1 {baseUnitCode}
                                    </span>
                                  </div>
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap ${isDefault || !color ? "text-gray-300 italic font-medium" : "text-gray-600 font-bold"}`}>
                                  {color || "Warna"}
                                </td>
                                <td className="px-6 py-4 text-right text-gray-900 font-black whitespace-nowrap">
                                  Rp {buyPrice.toLocaleString('id-ID')}
                                </td>
                                <td className="px-6 py-4 text-right text-emerald-600 font-black whitespace-nowrap">
                                  Rp {sellPrice.toLocaleString('id-ID')}
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
              {/* Stats Summary Sections (Matching Mockup exactly) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Qty Summary */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="space-y-3">
                    {[
                      { label: "Qty Awal", val: stats?.qty_awal },
                      { label: "Qty Masuk", val: stats?.qty_masuk },
                      { label: "Qty Keluar", val: stats?.qty_keluar },
                      { label: "Qty Akhir", val: stats?.qty_akhir, highlight: true }
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center border-b border-gray-50 pb-2 last:border-0">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{item.label}</span>
                        <span className={`text-sm font-black ${item.highlight ? "text-emerald-600 text-lg" : "text-gray-900"}`}>
                          {Math.round(item.val || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Value Summary (Jlh) */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="space-y-3">
                    {[
                      { label: "Jlh Awal", val: stats?.jlh_awal },
                      { label: "Jlh Masuk", val: stats?.jlh_masuk },
                      { label: "Jlh Keluar", val: stats?.jlh_keluar },
                      { label: "Jlh Akhir", val: stats?.jlh_akhir, highlight: true }
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center border-b border-gray-50 pb-2 last:border-0">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{item.label}</span>
                        <span className={`text-sm font-black ${item.highlight ? "text-blue-600 text-lg" : "text-gray-900"}`}>
                          {Math.round(item.val || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Penjualan Per-Tahun */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 text-center uppercase tracking-widest mb-3 pb-1 border-b border-gray-50">Penjualan Per-Tahun</p>
                  <div className="space-y-3">
                    {[
                      { label: "Jlh Penjualan NET", val: stats?.jlh_penjualan_net_tahun },
                      { label: "Jlh Harga Pokok NET", val: stats?.jlh_hpp_net_tahun },
                      { label: "Profit Per-Tahun", val: stats?.profit_tahun, highlight: true }
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center border-b border-gray-50 pb-2 last:border-0">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{item.label}</span>
                        <span className={`text-sm font-black ${item.highlight ? "text-emerald-600" : "text-gray-900"}`}>
                          {Math.round(item.val || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Back Order Stats */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="space-y-3">
                    {[
                      { label: "Qty Back Order PO", val: stats?.back_order_po },
                      { label: "Qty Netto", val: stats?.qty_netto },
                      { label: "Qty Back Order SO", val: stats?.back_order_so },
                      { label: "Qty Siap Jual", val: stats?.qty_siap_jual, highlight: true }
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center border-b border-gray-50 pb-2 last:border-0">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{item.label}</span>
                        <span className={`text-sm font-black ${item.highlight ? "text-orange-600 text-lg" : "text-gray-900"}`}>
                          {Math.round(item.val || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Annual/Monthly Qty Summary */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="space-y-3">
                    {[
                      { label: "Qty Penjualan Per-Tahun", val: stats?.qty_penjualan_tahun },
                      { label: "Qty Pembelian Per-Tahun", val: stats?.qty_pembelian_tahun },
                      { label: "Qty Pembelian Per-Bulan", val: stats?.qty_pembelian_bulan },
                      { label: "Qty Penjualan Per-Bulan", val: stats?.qty_penjualan_bulan }
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center border-b border-gray-50 pb-2 last:border-0">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{item.label}</span>
                        <span className="text-sm font-black text-gray-900 text-right">
                          {Math.round(item.val || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 6. Penjualan Per-Bulan */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 text-center uppercase tracking-widest mb-3 pb-1 border-b border-gray-50">Penjualan Per-Bulan</p>
                  <div className="space-y-3">
                    {[
                      { label: "Jlh Penjualan NET", val: stats?.jlh_penjualan_net_bulan },
                      { label: "Jlh Harga Pokok NET", val: stats?.jlh_hpp_net_bulan },
                      { label: "Profit Per-Bulan", val: stats?.profit_bulan, highlight: true }
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center border-b border-gray-50 pb-2 last:border-0">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{item.label}</span>
                        <span className={`text-sm font-black ${item.highlight ? "text-emerald-600 text-lg" : "text-gray-900"}`}>
                          {Math.round(item.val || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Advanced Transaction Table */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
                <div className="p-4 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <select className="px-3 py-2 bg-gray-50 border-none rounded-xl text-xs font-bold text-gray-600 outline-none">
                      <option>10</option>
                      <option>25</option>
                      <option>50</option>
                    </select>
                    <div className="relative flex-1 md:w-64">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Pencarian Global" 
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/10 transition-all"
                      />
                    </div>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                    <Download size={14} /> Export CSV
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1600px]">
                    <thead>
                      <tr className="bg-white border-b border-gray-100">
                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tgl. Trn.</th>
                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipe Transaksi</th>
                        <th className="px-2 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Kode Dept.</th>
                        <th className="px-2 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Gudang</th>
                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">No. Transaksi</th>
                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaksi Dgn</th>
                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Harga Pokok Penjualan</th>
                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Harga Beli</th>
                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Harga Jual</th>
                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qty Terima</th>
                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qty Keluar</th>
                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">U/M</th>
                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Import</th>
                        <th className="px-4 py-4 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-right bg-emerald-50/20">Qty Akhir (Satuan Dasar)</th>
                        <th className="px-4 py-4 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-right bg-emerald-50/20">Nilai Akhir (Satuan Dasar)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {loadingTransactions ? (
                         Array.from({ length: 5 }).map((_, i) => (
                           <tr key={i} className="animate-pulse">
                             <td colSpan={15} className="px-4 py-4"><div className="h-8 bg-gray-50 rounded-xl w-full"></div></td>
                           </tr>
                         ))
                      ) : (() => {
                        let runningQty = stats?.qty_awal || 0;
                        let runningValue = stats?.jlh_awal || 0;
                        
                        const rows = [];
                        // Initial Saldo Awal row
                        rows.push(
                          <tr key="saldo-awal" className="hover:bg-gray-50/50 transition-colors group">
                            <td className="px-4 py-3 text-[10px] font-bold text-gray-400 whitespace-nowrap">01/05/2026 00:00:00</td>
                            <td className="px-4 py-3 text-[10px] font-bold text-gray-700">Saldo Awal</td>
                            <td className="px-2 py-3 text-[10px] font-bold text-gray-400 text-center">-</td>
                            <td className="px-2 py-3 text-[10px] font-black text-gray-700 text-center">{product?.locations?.[0]?.warehouse_short_name || "RM"}</td>
                            <td className="px-4 py-3 text-[10px] font-bold text-gray-400">-</td>
                            <td className="px-4 py-3 text-[10px] font-bold text-gray-400">-</td>
                            <td className="px-4 py-3 text-[10px] font-bold text-gray-700 text-center">{Math.round(stats?.current_price || 0).toLocaleString('id-ID')}</td>
                            <td className="px-4 py-3 text-[10px] font-bold text-gray-400 text-center">-</td>
                            <td className="px-4 py-3 text-[10px] font-bold text-gray-400 text-center">-</td>
                            <td className="px-4 py-3 text-[10px] font-bold text-gray-400 text-center">-</td>
                            <td className="px-4 py-3 text-[10px] font-bold text-gray-400 text-center">-</td>
                            <td className="px-4 py-3 text-[10px] font-bold text-gray-700 text-center">{product?.product_unit || "PCS"}</td>
                            <td className="px-4 py-3 text-center">-</td>
                            <td className="px-4 py-3 text-[10px] font-black text-gray-700 text-right bg-emerald-50/10">{Math.round(runningQty).toLocaleString('id-ID')},00</td>
                            <td className="px-4 py-3 text-[10px] font-black text-gray-700 text-right bg-emerald-50/10">{Math.round(runningValue).toLocaleString('id-ID')},00</td>
                          </tr>
                        );

                        transactions.forEach((t, i) => {
                          runningQty += (Number(t.qty_in) - Number(t.qty_out));
                          const cost = t.type === 'Pembelian' ? Number(t.buy_price) : Number(t.hpp);
                          runningValue += (Number(t.qty_in) * cost) - (Number(t.qty_out) * Number(t.hpp));
                          
                          rows.push(
                            <tr key={i} className="hover:bg-emerald-50/30 transition-colors group">
                              <td className="px-4 py-3 text-[10px] font-medium text-gray-500 whitespace-nowrap">{new Date(t.date).toLocaleString('id-ID')}</td>
                              <td className="px-4 py-3 text-[10px] font-bold text-gray-800">{t.type}</td>
                              <td className="px-2 py-3 text-[10px] font-black text-orange-600 text-center">{t.dept_name || "-"}</td>
                              <td className="px-2 py-3 text-[10px] font-black text-gray-700 text-center">{t.warehouse_code || "-"}</td>
                              <td className="px-4 py-3">
                                <button 
                                  onClick={() => {
                                    if (t.gr_id) setSelectedGR(t.gr_id);
                                  }}
                                  className="px-3 py-1.5 bg-[#3b82f6] text-white text-[10px] font-black rounded-md hover:bg-blue-600 transition-all shadow-sm flex items-center gap-2"
                                >
                                  {t.ref_no}
                                </button>
                              </td>
                              <td className="px-4 py-3 text-[10px] font-bold text-gray-600 truncate max-w-[150px] uppercase">{t.partner || "-"}</td>
                              <td className="px-4 py-3 text-[10px] font-black text-gray-700 text-center">{Math.round(t.hpp || 0).toLocaleString('id-ID')}</td>
                              <td className="px-4 py-3 text-[10px] font-bold text-gray-500 text-center">{t.buy_price > 0 ? Math.round(t.buy_price).toLocaleString('id-ID') : "-"}</td>
                              <td className="px-4 py-3 text-[10px] font-bold text-gray-500 text-center">{t.sell_price > 0 ? Math.round(t.sell_price).toLocaleString('id-ID') : "-"}</td>
                              <td className="px-4 py-3 text-[10px] font-black text-gray-700 text-center">{t.qty_in > 0 ? Math.round(t.qty_in).toLocaleString('id-ID') : "-"}</td>
                              <td className="px-4 py-3 text-[10px] font-black text-gray-700 text-center">{t.qty_out > 0 ? Math.round(t.qty_out).toLocaleString('id-ID') : "-"}</td>
                              <td className="px-4 py-3 text-[10px] font-bold text-gray-700 text-center">{t.uom}</td>
                              <td className="px-4 py-3 text-center">-</td>
                              <td className="px-4 py-3 text-[10px] font-black text-gray-700 text-right bg-emerald-50/10">{Math.round(runningQty).toLocaleString('id-ID')},00</td>
                              <td className="px-4 py-3 text-[10px] font-black text-gray-700 text-right bg-emerald-50/10">{Math.round(runningValue).toLocaleString('id-ID')},00</td>
                            </tr>
                          );
                        });

                        return rows;
                      })()}
                    </tbody>
                    <tfoot className="bg-gray-50/50">
                      <tr className="border-t-2 border-gray-100">
                        <td colSpan={9} className="px-4 py-4 text-xs font-black text-gray-900 uppercase">Grand Total :</td>
                        <td className="px-4 py-4 text-[10px] font-black text-gray-900 text-center">{Math.round(stats?.qty_masuk || 0).toLocaleString('id-ID')},00</td>
                        <td className="px-4 py-4 text-[10px] font-black text-gray-900 text-center">{Math.round(stats?.qty_keluar || 0).toLocaleString('id-ID')},00</td>
                        <td colSpan={4}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* View Goods Receipt Modal Integration */}
              {selectedGR && (
                <GoodsReceiptModal 
                  isOpen={!!selectedGR} 
                  onClose={() => setSelectedGR(null)}
                  onSuccess={() => {}} // View only
                  grToEdit={transactions.find(t => t.gr_id === selectedGR)}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
