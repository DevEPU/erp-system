import { useState, useEffect } from "react";
import api from "@/lib/api";

type Ppn = { id: number; name: string; rate: number; };

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  itemToEdit: Ppn | null;
}

export default function PpnModal({ isOpen, onClose, onSuccess, itemToEdit }: Props) {
  const [name, setName] = useState<string>("");
  const [rate, setRate] = useState<number | "">("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name ?? "");
      setRate(itemToEdit.rate ?? "");
    } else {
      setName("");
      setRate("");
    }
  }, [itemToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name,
        rate,
      };
      if (itemToEdit) {
        await api.express.put(`/ppn/${itemToEdit.id}`, payload);
      } else {
        await api.express.post("/ppn", payload);
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      alert(error?.response?.data?.message || "Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">
            {itemToEdit ? "Edit Ppn" : "Add Ppn"}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rate (%)</label>
            <input
              type="number"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
