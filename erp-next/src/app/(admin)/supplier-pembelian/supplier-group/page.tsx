"use client";

import { useState, useEffect } from "react";
import TablePagination from "@/components/ui/TablePagination";
import { Plus, Search, Edit2, Trash2, UsersRound, Package, Archive, ShieldAlert, Coins, Truck, Tags } from "lucide-react";
import SupplierGroupModal from "@/components/master-data/SupplierGroupModal";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import api from "@/lib/api";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";

type SupplierGroup = { id: number; code: string; name: string; description: string; };

export default function SupplierGroupsPage() {
  const [data, setData] = useState<SupplierGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SupplierGroup | null>(null);

  const {
    isOpen: isStatusModalOpen, type: modalType, title: modalTitle, message: modalMessage,
    onConfirm: modalOnConfirm, showSuccess, showError, showConfirm, closeModal,
    isLoading: isActionLoading, setIsLoading: setActionLoading,
  } = useStatusModal();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/supplier-groups");
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
      await api.express.delete(`/supplier-groups/${id}`);
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
      <SupplierGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => { fetchData(); showSuccess("Success!", "Item saved successfully."); }}
        itemToEdit={selectedItem}
      />
      <StatusModal
        isOpen={isStatusModalOpen} type={modalType} title={modalTitle} message={modalMessage}
        onConfirm={modalOnConfirm} onClose={closeModal} isLoading={isActionLoading}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
              <UsersRound className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Supplier <span className="text-emerald-600">Group</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Kategorikan supplier Anda ke dalam grup untuk kemudahan manajemen dan pelaporan.
          </p>
        </div>
        <button 
          onClick={() => { setSelectedItem(null); setIsModalOpen(true); }} 
          className="group relative flex items-center gap-3 bg-gray-900 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-emerald-200 active:scale-95 overflow-hidden"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Tambah Grup Baru</span>
        </button>
      </div>

      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 mb-6 hide-scrollbar">
        <StatCard icon={<UsersRound size={20} />} iconBgColor="bg-emerald-50" iconColor="text-emerald-600" label="TOTAL GRUP" value={data.length} />
      </div>

      <div className="mb-8">
        <FilterBar 
          searchPlaceholder="Cari grup berdasarkan nama..." 
          searchValue={search} 
          onSearchChange={setSearch} 
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Code</th><th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Name</th><th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 flex-1">
              {loading ? (<tr><td colSpan={10} className="text-center py-4">Loading...</td></tr>) : filtered.length > 0 ? (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600">{item.code}</td><td className="px-6 py-4 text-sm text-gray-600">{item.name}</td><td className="px-6 py-4 text-sm text-gray-600">{item.description}</td>
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
