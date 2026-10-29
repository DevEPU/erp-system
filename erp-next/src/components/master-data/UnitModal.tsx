"use client";

import { useState, useEffect } from "react";
import { X, Save, AlertCircle } from "lucide-react";
import SearchableSelect from "../ui/SearchableSelect";
import api from "@/lib/api";

type Unit = {
  id?: number;
  name: string;
  short_name: string;
  operator?: string;
  operation_value?: number;
};

type UnitModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  unitToEdit?: Unit | null;
};

export default function UnitModal({
  isOpen,
  onClose,
  onSuccess,
  unitToEdit,
}: UnitModalProps) {
  const [formData, setFormData] = useState<Unit>({
    name: "",
    short_name: "",
    operator: "*",
    operation_value: 1,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (unitToEdit) {
        setFormData(unitToEdit);
      } else {
        setFormData({
          name: "",
          short_name: "",
          operator: "*",
          operation_value: 1,
        });
      }
    }
  }, [isOpen, unitToEdit]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (unitToEdit) {
        await api.express.put(`/units/${unitToEdit.id}`, formData);
      } else {
        await api.express.post("/units", formData);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save unit.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">
            {unitToEdit ? "Edit Unit" : "Add Unit"}
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

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Unit Name
            </label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Kilogram"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Short Name
            </label>
            <input
              name="short_name"
              value={formData.short_name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="kg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Operator
              </label>
              <SearchableSelect
                label=""
                placeholder="Select Operator"
                value={formData.operator!}
                onChange={(val) =>
                  setFormData((prev) => ({ ...prev, operator: val.toString() }))
                }
                options={[
                  { value: "*", label: "* (Multiply)" },
                  { value: "/", label: "/ (Divide)" },
                  { value: "+", label: "+ (Add)" },
                  { value: "-", label: "- (Subtract)" },
                ]}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Value
              </label>
              <input
                type="number"
                name="operation_value"
                value={formData.operation_value ?? ""}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
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
