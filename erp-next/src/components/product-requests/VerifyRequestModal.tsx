"use client";

import { useState, useEffect } from "react";
import { X, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import SearchableSelect from "../ui/SearchableSelect";
import api from "@/lib/api";

type VerifyRequestModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  requestToVerify: any;
};

export default function VerifyRequestModal({
  isOpen,
  onClose,
  onSuccess,
  requestToVerify,
}: VerifyRequestModalProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    product_price: 0,
    supplier_id: "",
    category_id: "",
    product_code: "",
    is_verify: true,
    product_name: "",
    product_unit: "",
    is_asset: 0,
    is_mandatory: 0,
  });

  // Fetch form data
  useEffect(() => {
    if (isOpen) {
      const fetchFormData = async () => {
        try {
          const res = await api.express.get("/product-requests/form-data");
          const data = res.data;
          setCategories(data.categories || []);
          setSuppliers(data.suppliers || []);
          setUnits(data.units || []);
        } catch (error) {
          console.error("Error fetching form data", error);
        }
      };

      fetchFormData();

      if (requestToVerify) {
        setFormData({
          product_price: requestToVerify.product_price || 0,
          supplier_id: requestToVerify.supplier_id || "",
          category_id: requestToVerify.category_id || "",
          product_code: requestToVerify.product_code || "",
          is_verify: true,
          product_name: requestToVerify.product_name || "",
          product_unit: requestToVerify.product_unit || "",
          is_asset: requestToVerify.is_asset ? 1 : 0,
          is_mandatory: requestToVerify.is_mandatory ? 1 : 0,
        });
      }
    }
  }, [isOpen, requestToVerify]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestToVerify) return;

    setLoading(true);

    try {
      await api.express.put(`/product-requests/${requestToVerify.id}/verify`, formData);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || "Failed to verify request");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-8 border-b border-gray-50 bg-gray-50/50">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl shadow-sm">
                <CheckCircle2 size={24} />
             </div>
             <div>
                <h3 className="text-xl font-black text-gray-800 tracking-tight">Verifikasi Request</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Final review before master entry</p>
             </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar">
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-4 mb-8">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div className="text-[11px] text-amber-800 font-bold leading-relaxed uppercase tracking-wider">
               Lengkapi spesifikasi teknis dan klasifikasi produk dengan benar sebelum dipublish ke sistem budgeting.
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Nama Produk Terverifikasi
                </label>
                <input
                  required
                  type="text"
                  value={formData.product_name}
                  onChange={(e) =>
                    setFormData({ ...formData, product_name: e.target.value })
                  }
                  className="w-full px-5 py-3.5 rounded-2xl border-2 border-gray-50 bg-gray-50/50 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold text-gray-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                   Satuan (UOM)
                </label>
                <SearchableSelect
                  label=""
                  placeholder="Pilih Unit"
                  value={formData.product_unit}
                  onChange={(val) =>
                    setFormData({ ...formData, product_unit: val as string })
                  }
                  options={units.map((u) => ({
                    value: u.short_name,
                    label: `${u.short_name} - ${u.name}`,
                  }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                   Kategori Produk
                </label>
                <SearchableSelect
                  label=""
                  placeholder="Pilih Kategori"
                  value={formData.category_id}
                  onChange={(val) =>
                    setFormData({ ...formData, category_id: val.toString() })
                  }
                  options={categories.map((c) => ({
                    value: c.id,
                    label: c.category_name,
                  }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Kode Produk Internal
                </label>
                <input
                  required
                  type="text"
                  value={formData.product_code}
                  onChange={(e) =>
                    setFormData({ ...formData, product_code: e.target.value })
                  }
                  className="w-full px-5 py-3.5 rounded-2xl border-2 border-gray-50 bg-gray-50/50 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold text-gray-700"
                  placeholder="e.g. PRD-XXXX"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Jenis Aset</label>
                <SearchableSelect
                  label=""
                  value={formData.is_asset}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      is_asset: val as number,
                    })
                  }
                  options={[
                    { value: 0, label: "Non-Asset (Habis Pakai)" },
                    { value: 1, label: "Asset (Inventaris)" },
                  ]}
                />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mandatory Item</label>
                <SearchableSelect
                  label=""
                  value={formData.is_mandatory}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      is_mandatory: val as number,
                    })
                  }
                  options={[
                    { value: 0, label: "Bukan Barang Wajib" },
                    { value: 1, label: "Barang Wajib / Pokok" },
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                   Harga Satuan (Estimate)
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  value={formData.product_price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      product_price: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-5 py-3.5 rounded-2xl border-2 border-gray-50 bg-gray-50/50 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold text-gray-700"
                />
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Supplier Terkait</label>
                <SearchableSelect
                  label=""
                  placeholder="Pilih Supplier"
                  value={formData.supplier_id}
                  onChange={(val) =>
                    setFormData({ ...formData, supplier_id: val.toString() })
                  }
                  options={suppliers.map((s) => ({
                    value: s.id,
                    label: s.supplier_name,
                  }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 p-5 rounded-2xl bg-emerald-50 border border-emerald-100 group transition-all">
              <input
                type="checkbox"
                id="is_verify"
                checked={formData.is_verify}
                onChange={(e) =>
                  setFormData({ ...formData, is_verify: e.target.checked })
                }
                className="w-6 h-6 text-emerald-600 rounded-lg focus:ring-emerald-500 border-emerald-200 cursor-pointer"
              />
              <label
                htmlFor="is_verify"
                className="text-xs font-black text-emerald-900 select-none cursor-pointer uppercase tracking-widest"
              >
                Tandai sebagai Terverifikasi (Siap Input)
              </label>
            </div>

            <div className="pt-8 flex justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-8 py-4 text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 rounded-2xl transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-10 py-4 text-xs font-black uppercase tracking-widest text-white bg-emerald-600 rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? "Menyimpan..." : "Publish Verifikasi"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
