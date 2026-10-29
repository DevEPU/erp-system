"use client";

import { useState, useEffect } from "react";
import { Loader2, X, Check, AlertCircle, Search } from "lucide-react";
import api from "@/lib/api";

interface ProductGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  groupToEdit?: any;
}

export default function ProductGroupModal({
  isOpen,
  onClose,
  onSuccess,
  groupToEdit,
}: ProductGroupModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState("");

  const [form, setForm] = useState({
    name: "",
    categories: [] as number[],
    products: [] as number[],
  });

  useEffect(() => {
    if (isOpen) {
      fetchFormData();
      if (groupToEdit) {
        setForm({
          name: groupToEdit.name,
          categories: groupToEdit.categories || [],
          products: groupToEdit.products || [],
        });
      } else {
        setForm({
          name: "",
          categories: [],
          products: [],
        });
      }
    }
  }, [isOpen, groupToEdit]);

  const fetchFormData = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/users/form-data");
      setCategories(res.data.categories || []);
      setProducts(res.data.products || []);
    } catch (e) {
      console.error("Failed to fetch form data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryToggle = (id: number) => {
    setForm((prev) => {
      const current = prev.categories;
      return {
        ...prev,
        categories: current.includes(id)
          ? current.filter((i) => i !== id)
          : [...current, id],
      };
    });
  };

  const handleProductToggle = (id: number) => {
    setForm((prev) => {
      const current = prev.products;
      return {
        ...prev,
        products: current.includes(id)
          ? current.filter((i) => i !== id)
          : [...current, id],
      };
    });
  };

  const filteredProducts = products.filter(
    (p) =>
      p.product_name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.product_code?.toLowerCase().includes(productSearch.toLowerCase()),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (groupToEdit) {
        await api.express.put(`/users/groups/${groupToEdit.id}`, form);
      } else {
        await api.express.post("/users/groups", form);
      }
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.message || "Gagal menyimpan group produk.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl scale-100 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-3xl">
          <h2 className="text-xl font-bold text-gray-800">
            {groupToEdit ? "Edit Group Produk" : "Tambah Group Produk Template"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 flex-1">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Group Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-gray-500">
                Nama Group Template
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder="Misal: Team Purchasing"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category Selection */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase text-gray-500">
                  Pilih Category
                </label>
                <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/30 max-h-64 overflow-y-auto space-y-2">
                  {categories.length > 0 ? (
                    categories.map((cat) => (
                      <label
                        key={cat.id}
                        className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-100"
                      >
                        <input
                          type="checkbox"
                          checked={form.categories.includes(cat.id)}
                          onChange={() => handleCategoryToggle(cat.id)}
                          className="form-checkbox h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-gray-700">
                          {cat.category_name}
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="text-xs text-center text-gray-400 py-4">
                      Memuat data category...
                    </p>
                  )}
                </div>
              </div>

              {/* Product Selection */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase text-gray-500 flex justify-between">
                  <span>Pilih Produk Langsung</span>
                  <span className="text-emerald-600 italic">
                    {form.products.length} terpilih
                  </span>
                </label>
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-2.5 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Search product..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/30 max-h-48 overflow-y-auto space-y-2">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((prod) => (
                      <label
                        key={prod.id}
                        className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-100"
                      >
                        <input
                          type="checkbox"
                          checked={form.products.includes(prod.id)}
                          onChange={() => handleProductToggle(prod.id)}
                          className="form-checkbox h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-700 font-medium line-clamp-1">
                            {prod.product_name}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {prod.product_code}
                          </span>
                        </div>
                      </label>
                    ))
                  ) : (
                    <p className="text-xs text-center text-gray-400 py-4">
                      Produk tidak ditemukan.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
              <p className="text-xs text-emerald-700 leading-relaxed italic">
                * Group produk ini dapat dipanggil saat menambahkan user baru
                untuk mempercepat pengisian hak akses kategori dan produk.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-lg hover:shadow-emerald-200 shadow-emerald-100/50 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                Simpan Group
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
