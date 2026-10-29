"use client";

import { useState, useEffect } from "react";
import TablePagination from "@/components/ui/TablePagination";
import { Plus, Search, Edit2, Trash2, CreditCard } from "lucide-react";
import PaymentTermModal from "@/components/master-data/PaymentTermModal";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import api from "@/lib/api";

type PaymentTerm = { id: number; name: string; days: number; description: string; };

export default function PaymentTermsPage() {
  const [data, setData] = useState<PaymentTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PaymentTerm | null>(null);

  const {
    isOpen: isStatusModalOpen, type: modalType, title: modalTitle, message: modalMessage,
    onConfirm: modalOnConfirm, showSuccess, showError, showConfirm, closeModal,
    isLoading: isActionLoading, setIsLoading: setActionLoading,
  } = useStatusModal();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/payment-terms");
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
      await api.express.delete(`/payment-terms/${id}`);
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
      <PaymentTermModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => { fetchData(); showSuccess("Success!", "Item saved successfully."); }}
        itemToEdit={selectedItem}
      />
      <StatusModal
        isOpen={isStatusModalOpen} type={modalType} title={modalTitle} message={modalMessage}
        onConfirm={modalOnConfirm} onClose={closeModal} isLoading={isActionLoading}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
              <CreditCard className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Payment <span className="text-emerald-600">Terms</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Kelola termin pembayaran untuk transaksi pembelian dan penjualan perusahaan.
          </p>
        </div>
        
        <button
          onClick={() => { setSelectedItem(null); setIsModalOpen(true); }}
          className="group relative flex items-center gap-3 bg-gray-900 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-emerald-200 active:scale-95 overflow-hidden"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Tambah Termin Baru</span>
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
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Name</th><th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Days</th><th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (<tr><td colSpan={10} className="text-center py-4">Loading...</td></tr>) : filtered.length > 0 ? (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600">{item.name}</td><td className="px-6 py-4 text-sm text-gray-600">{item.days}</td><td className="px-6 py-4 text-sm text-gray-600">{item.description}</td>
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
