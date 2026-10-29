"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import SearchableSelect from "../ui/SearchableSelect";
import { API_BASE_URL } from "@/lib/constants";

type PermissionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  permissionToEdit?: any | null;
};

export default function PermissionModal({
  isOpen,
  onClose,
  onSuccess,
  permissionToEdit,
}: PermissionModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    guard_name: "web",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const backendUrl = `${API_BASE_URL}/api`;

  useEffect(() => {
    if (isOpen) {
      if (permissionToEdit) {
        setFormData({
          name: permissionToEdit.name,
          guard_name: permissionToEdit.guard_name || "web",
        });
      } else {
        setFormData({
          name: "",
          guard_name: "web",
        });
      }
      setError("");
    }
  }, [isOpen, permissionToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = permissionToEdit
        ? `${backendUrl}/permissions/${permissionToEdit.id}`
        : `${backendUrl}/permissions`;

      const method = permissionToEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setError(data.message || "Failed to save permission");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-2xl font-black text-gray-900">
            {permissionToEdit ? "Edit Permission" : "Create Permission"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permission Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  name: e.target.value,
                })
              }
              placeholder="e.g., manage_users, view_reports"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              pattern="[a-z_]+"
              title="Lowercase letters and underscores only"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use lowercase letters and underscores only
            </p>
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-2">
            Guard Name
          </label>
          <SearchableSelect
            label=""
            placeholder="Select Guard"
            value={formData.guard_name}
            onChange={(val) =>
              setFormData({
                ...formData,
                guard_name: val.toString(),
              })
            }
            options={[
              { value: "web", label: "Web" },
              { value: "api", label: "API" },
            ]}
            disabled={!!permissionToEdit}
          />
          {permissionToEdit && (
            <p className="text-xs text-gray-500 mt-1">
              Guard name cannot be changed after creation
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? "Saving..." : permissionToEdit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
