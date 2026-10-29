"use client";

import { useState, useEffect } from "react";
import { X, Save, AlertCircle } from "lucide-react";
import api from "@/lib/api";

type Currency = {
  id?: number;
  currency_name: string;
  code: string;
  symbol: string;
  thousand_separator: string;
  decimal_separator: string;
  exchange_rate?: number;
};

type CurrencyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currencyToEdit?: Currency | null;
};

export default function CurrencyModal({
  isOpen,
  onClose,
  onSuccess,
  currencyToEdit,
}: CurrencyModalProps) {
  const [formData, setFormData] = useState<Currency>({
    currency_name: "",
    code: "",
    symbol: "",
    thousand_separator: ".",
    decimal_separator: ",",
    exchange_rate: 1,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (currencyToEdit) {
        setFormData(currencyToEdit);
      } else {
        setFormData({
          currency_name: "",
          code: "",
          symbol: "",
          thousand_separator: ".",
          decimal_separator: ",",
          exchange_rate: 1,
        });
      }
    }
  }, [isOpen, currencyToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (currencyToEdit) {
        await api.express.put(`/currencies/${currencyToEdit.id}`, formData);
      } else {
        await api.express.post("/currencies", formData);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save currency.");
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
            {currencyToEdit ? "Edit Currency" : "Add Currency"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-start gap-2">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-semibold text-gray-700">
                Name
              </label>
              <input
                name="currency_name"
                value={formData.currency_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Rupiah"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Code
              </label>
              <input
                name="code"
                value={formData.code}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="IDR"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Symbol
              </label>
              <input
                name="symbol"
                value={formData.symbol}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Rp"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Thousand Separator
              </label>
              <input
                name="thousand_separator"
                value={formData.thousand_separator}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Decimal Separator
              </label>
              <input
                name="decimal_separator"
                value={formData.decimal_separator}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-semibold text-gray-700">
                Exchange Rate
              </label>
              <input
                type="number"
                name="exchange_rate"
                value={formData.exchange_rate}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="1"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-70"
            >
              {submitting ? (
                "Saving..."
              ) : (
                <>
                  <Save size={18} /> Save
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
