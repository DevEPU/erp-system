"use client";

import { useState, useEffect } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import SearchableSelect from "../ui/SearchableSelect";
import api from "@/lib/api";

type CreateRequestModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function CreateRequestModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateRequestModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    product_name: "",
    product_unit: "",
    is_asset: 0, // 0: Non-Asset, 1: Asset
    is_mandatory: 0, // 0: No, 1: Yes
  });

  const [units, setUnits] = useState<any[]>([]);

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setFormData({
        product_name: "",
        product_unit: "",
        is_asset: 0,
        is_mandatory: 0,
      });
      fetchUnits();
    }
  }, [isOpen]);

  const fetchUnits = async () => {
    try {
      const res = await api.express.get("/product-requests/form-data");
      if (res.data && res.data.units) {
        setUnits(res.data.units);
      }
    } catch (error) {
      console.error("Failed to fetch units", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const userStr = localStorage.getItem("user");
    let userId = null;
    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        userId = userObj.id;
      } catch (e) {
        console.error("Failed to parse user", e);
      }
    }

    try {
      await api.express.post("/product-requests", {
        ...formData,
        user_id: userId,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || "Failed to create request");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] w-full max-w-xl shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-gray-100 overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-50 bg-gray-50/50">
          <div>
            <h3 className="text-xl font-black text-gray-800 tracking-tight">Buat Produk Baru</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Request registration for new item</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
            <AlertTriangle
              className="text-amber-600 shrink-0 mt-0.5"
              size={18}
            />
            <div className="text-[11px] text-amber-800 font-bold leading-relaxed">
              PASTIKAN DATA BELUM ADA: Harap cek master data terlebih dahulu untuk menghindari duplikasi produk di sistem.
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Nama Produk <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={formData.product_name}
                onChange={(e) =>
                  setFormData({ ...formData, product_name: e.target.value })
                }
                className="w-full px-5 py-3 rounded-2xl border-2 border-gray-50 bg-gray-50/50 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold text-gray-700"
                placeholder="Contoh: Laptop Dell XPS 15"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Satuan (Unit)
                </label>
                <SearchableSelect
                  label=""
                  placeholder="Pilih Satuan"
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

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Jenis Barang
                </label>
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
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Wajib Diisi (Mandatory)?
                </label>
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
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 rounded-2xl transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 text-xs font-black uppercase tracking-widest text-white bg-emerald-600 rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Menyimpan..." : "Kirim Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
