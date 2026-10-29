"use client";

import { useState, useEffect } from "react";
import { X, Save, AlertCircle, TrendingUp, Calendar } from "lucide-react";
import SearchableSelect from "../ui/SearchableSelect";
import api from "@/lib/api";

type TargetSalesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetToEdit?: any | null;
};

export default function TargetSalesModal({
  isOpen,
  onClose,
  onSuccess,
  targetToEdit,
}: TargetSalesModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    month: (new Date().getMonth() + 1).toString(),
    year: new Date().getFullYear().toString(),
    target_amount: "0",
    description: "",
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (targetToEdit) {
        setFormData({
          month: targetToEdit.month.toString(),
          year: targetToEdit.year.toString(),
          target_amount: targetToEdit.target_amount.toString(),
          description: targetToEdit.description || "",
        });
      } else {
        setFormData({
          month: (new Date().getMonth() + 1).toString(),
          year: new Date().getFullYear().toString(),
          target_amount: "0",
          description: "",
        });
      }
    }
  }, [isOpen, targetToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const url = targetToEdit
        ? `/target-sales/${targetToEdit.id}`
        : `/target-sales`;
      
      const userStr = localStorage.getItem("user");
      let userId = null;
      if (userStr) {
        const user = JSON.parse(userStr);
        userId = user.id;
      }

      if (targetToEdit) {
        await api.put(url, { ...formData, user_id: userId });
      } else {
        await api.post(url, { ...formData, user_id: userId });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to save target sales.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const years = [
    new Date().getFullYear() - 1,
    new Date().getFullYear(),
    new Date().getFullYear() + 1,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col scale-100 animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <TrendingUp size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              {targetToEdit ? "Edit Target Sales" : "Add Target Sales"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {targetToEdit?.status?.toLowerCase() === "approved" && (
            <div className="bg-orange-50 border border-orange-100 text-orange-600 p-4 rounded-2xl text-sm flex items-start gap-3">
              <AlertCircle className="mt-0.5 shrink-0" size={18} />
              <div className="space-y-1">
                <p className="font-bold uppercase text-[10px] tracking-wider">
                  Perhatian: Re-Approval Diperlukan
                </p>
                <p className="leading-relaxed">
                  Data ini sudah berstatus <strong>Approved</strong>. Mengubah
                  data ini akan membatalkan status approval saat ini dan
                  mengulang kembali alur approval dari awal.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-gray-500 flex items-center gap-1">
                <Calendar size={12} /> Bulan
              </label>
              <SearchableSelect
                label=""
                value={formData.month}
                onChange={(val) =>
                  setFormData((p) => ({
                    ...p,
                    month: val.toString(),
                  }))
                }
                options={months.map((m, i) => ({
                  value: i + 1,
                  label: m,
                }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-gray-500">
                Tahun
              </label>
              <SearchableSelect
                label=""
                value={formData.year}
                onChange={(val) =>
                  setFormData((p) => ({
                    ...p,
                    year: val.toString(),
                  }))
                }
                options={years.map((y) => ({
                  value: y,
                  label: y.toString(),
                }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-gray-500">
              Target Amount (Rp)
            </label>
            <input
              type="number"
              value={formData.target_amount}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  target_amount: e.target.value,
                }))
              }
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-lg font-bold"
              placeholder="0"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-gray-500">
              Keterangan
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  description: e.target.value,
                }))
              }
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 min-h-[100px] text-sm"
              placeholder="Opsional..."
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 font-bold transition-all"
            >
              Batal
            </button>
            <button
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-70 transition-all shadow-lg active:scale-95"
            >
              {submitting ? (
                "Saving..."
              ) : (
                <>
                  <Save size={18} /> Simpan Target
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
