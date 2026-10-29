"use client";

import { useState, useEffect } from "react";
import TablePagination from "@/components/ui/TablePagination";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import PphModal from "@/components/master-data/PphModal";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import api from "@/lib/api";

type Pph = { id: number; name: string; rate: number; };

export default function PphsPage() {
  const [data, setData] = useState<Pph[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Pph | null>(null);

  const {
    isOpen: isStatusModalOpen, type: modalType, title: modalTitle, message: modalMessage,
    onConfirm: modalOnConfirm, showSuccess, showError, showConfirm, closeModal,
    isLoading: isActionLoading, setIsLoading: setActionLoading,
  } = useStatusModal();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/pph");
      setData(res.data.data || res.data);
    } catch (error) {
      console.error("Failed to fetch", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = (id: number) => {
    showConfirm("Delete Item?", "Are you sure you want to delete this?", () => performDelete(id), "Delete Now", "Keep it");
  };

  const performDelete = async (id: number) => {
    setActionLoading(true);
    try {
      await api.express.delete(`/pph/${id}`);
      showSuccess("Deleted!", "Item has been removed.");
      fetchData();
    } catch (error: any) {
      showError("Delete Failed", error.message || "Failed to delete.");
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = data.filter(d => d.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-500">
      <PphModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => { fetchData(); showSuccess("Success!", "Item saved successfully."); }}
        itemToEdit={selectedItem}
      />
      <StatusModal
        isOpen={isStatusModalOpen} type={modalType} title={modalTitle} message={modalMessage}
        onConfirm={modalOnConfirm} onClose={closeModal} isLoading={isActionLoading}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            Pphs
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage pphs</p>
        </div>
        <button onClick={() => { setSelectedItem(null); setIsModalOpen(true); }} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm text-sm font-medium">
          <Plus size={18} /><span>Add New</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <div className="relative w-full max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input type="text" placeholder="Search..." className="block w-full pl-10 pr-3 py-2 border rounded-lg bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Name</th><th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Rate (%)</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (<tr><td colSpan={10} className="text-center py-4">Loading...</td></tr>) : filtered.length > 0 ? (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600">{item.name}</td><td className="px-6 py-4 text-sm text-gray-600">{item.rate}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => { setSelectedItem(item); setIsModalOpen(true); }} className="p-1.5 text-emerald-500 hover:text-emerald-600 rounded-lg"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-500 hover:text-red-600 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (<tr><td colSpan={10} className="text-center py-8 text-gray-500">No data found.</td></tr>)}
            </tbody>
          </table>
        </div>
        <TablePagination totalItems={filtered.length} />
      </div>
    </div>
  );
}
