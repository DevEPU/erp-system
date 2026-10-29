"use client";

import { useState, useEffect } from "react";
import { X, Save, AlertCircle } from "lucide-react";
import api from "@/lib/api";

type Category = {
  id?: number;
  category_code: string;
  category_name: string;
  parent_id?: number | null;
  valuation_method?: string;
  description?: string;
  is_active?: boolean | number;
};

type CategoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categoryToEdit?: Category | null;
};

export default function CategoryModal({
  isOpen,
  onClose,
  onSuccess,
  categoryToEdit,
}: CategoryModalProps) {
  const [formData, setFormData] = useState<Category>({
    category_code: "",
    category_name: "",
    parent_id: null,
    valuation_method: "AVCO",
    description: "",
    is_active: true,
  });

  const [parentCategories, setParentCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      fetchCategories();
      if (categoryToEdit) {
        setFormData({
          ...categoryToEdit,
          parent_id: categoryToEdit.parent_id || null,
          valuation_method: categoryToEdit.valuation_method || "AVCO",
          description: categoryToEdit.description || "",
          is_active: categoryToEdit.is_active !== undefined ? !!categoryToEdit.is_active : true,
        });
      } else {
        setFormData({
          category_code: "",
          category_name: "",
          parent_id: null,
          valuation_method: "AVCO",
          description: "",
          is_active: true,
        });
      }
    }
  }, [isOpen, categoryToEdit]);

  const fetchCategories = async () => {
    try {
      const res = await api.express.get("/product-categories");
      const cats = res.data.data || [];
      // Filter out self if editing
      setParentCategories(cats.filter((c: Category) => c.id !== categoryToEdit?.id && c.id !== 0));
    } catch (err) {
      console.error("Failed to fetch parent categories:", err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        parent_id: formData.parent_id ? Number(formData.parent_id) : null,
      };

      if (categoryToEdit) {
        await api.express.put(`/product-categories/${categoryToEdit.id}`, payload);
      } else {
        await api.express.post("/product-categories", payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save category.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">
            {categoryToEdit ? "Edit Category" : "Add Category"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-start gap-2">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                Kode Kategori *
              </label>
              <input
                name="category_code"
                value={formData.category_code}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium"
                placeholder="CAT-001"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                Nama Kategori *
              </label>
              <input
                name="category_name"
                value={formData.category_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium"
                placeholder="Electronics"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                Induk Kategori (Parent)
              </label>
              <select
                name="parent_id"
                value={formData.parent_id || ""}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium bg-white"
              >
                <option value="">-- Tanpa Induk (Utama) --</option>
                {parentCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.category_name} ({c.category_code})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                Metode Valuasi Stok
              </label>
              <select
                name="valuation_method"
                value={formData.valuation_method || "AVCO"}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium bg-white"
              >
                <option value="AVCO">AVCO (Moving Average)</option>
                <option value="FIFO">FIFO (First-In First-Out)</option>
                <option value="STANDARD">Standard Costing</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
              Deskripsi / Keterangan
            </label>
            <textarea
              name="description"
              value={formData.description || ""}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium resize-none"
              placeholder="Catatan mengenai kategori produk..."
            />
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={!!formData.is_active}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </div>
              <span className="text-sm font-bold text-gray-700 group-hover:text-emerald-600 transition-colors">
                Status Kategori Aktif
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 font-medium text-sm"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-70 text-sm shadow-md shadow-emerald-200"
            >
              {submitting ? (
                "Saving..."
              ) : (
                <>
                  <Save size={18} /> Simpan Kategori
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
