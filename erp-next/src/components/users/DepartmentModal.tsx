"use client";

import { useState, useEffect } from "react";
import { X, Save, AlertCircle } from "lucide-react";
import api from "@/lib/api";

type Department = {
  id?: number;
  department_code: string;
  department_name: string;
};

type DepartmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  departmentToEdit?: Department | null;
};

export default function DepartmentModal({
  isOpen,
  onClose,
  onSuccess,
  departmentToEdit,
}: DepartmentModalProps) {
  const [formData, setFormData] = useState<Department>({
    department_code: "",
    department_name: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (departmentToEdit) {
        setFormData(departmentToEdit);
      } else {
        setFormData({
          department_code: "",
          department_name: "",
        });
      }
    }
  }, [isOpen, departmentToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (departmentToEdit) {
        await api.express.put(`/departments/${departmentToEdit.id}`, formData);
      } else {
        await api.express.post("/departments", formData);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save department.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">
            {departmentToEdit ? "Edit Department" : "Add Department"}
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
              Department Code <span className="text-red-500">*</span>
            </label>
            <input
              name="department_code"
              value={formData.department_code}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              placeholder="DEPT-001"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Department Name <span className="text-red-500">*</span>
            </label>
            <input
              name="department_name"
              value={formData.department_name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              placeholder="Engineering"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-70 transition-all shadow-sm active:scale-95"
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
