"use client";

import { useState, useEffect } from "react";
import { X, Save, AlertCircle } from "lucide-react";
import { API_BASE_URL } from "@/lib/constants";

type ApprovalType = {
  id?: number;
  approval_code: string;
  approval_name: string;
};

type ApprovalTypeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  typeToEdit?: ApprovalType | null;
};

export default function ApprovalTypeModal({
  isOpen,
  onClose,
  onSuccess,
  typeToEdit,
}: ApprovalTypeModalProps) {
  const [formData, setFormData] = useState<ApprovalType>({
    approval_code: "",
    approval_name: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backendUrl = `${API_BASE_URL}/api`;

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (typeToEdit) {
        setFormData(typeToEdit);
      } else {
        setFormData({
          approval_code: "",
          approval_name: "",
        });
      }
    }
  }, [isOpen, typeToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const url = typeToEdit
        ? `${backendUrl}/approval-types/${typeToEdit.id}`
        : `${backendUrl}/approval-types`;

      const method = typeToEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save type.");

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
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
            {typeToEdit ? "Edit Approval Type" : "Add Approval Type"}
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
              Approval Code <span className="text-red-500">*</span>
            </label>
            <input
              name="approval_code"
              value={formData.approval_code}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              placeholder="PR-APP"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Type Name <span className="text-red-500">*</span>
            </label>
            <input
              name="approval_name"
              value={formData.approval_name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              placeholder="Purchase Request Approval"
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
