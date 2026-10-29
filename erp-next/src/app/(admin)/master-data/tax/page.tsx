"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Percent, Edit2, Trash2 } from "lucide-react";
import PpnModal from "@/components/master-data/PpnModal";
import PphModal from "@/components/master-data/PphModal";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import api from "@/lib/api";

type Ppn = {
  id: number;
  name: string;
  rate: number;
};
type Pph = {
  id: number;
  name: string;
  rate: number;
};

export default function TaxPage() {
  const [activeTab, setActiveTab] = useState<"ppn" | "pph">("ppn");

  const [ppns, setPpns] = useState<Ppn[]>([]);
  const [pphs, setPphs] = useState<Pph[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal State
  const [isPpnModalOpen, setIsPpnModalOpen] = useState(false);
  const [selectedPpn, setSelectedPpn] = useState<Ppn | null>(null);

  const [isPphModalOpen, setIsPphModalOpen] = useState(false);
  const [selectedPph, setSelectedPph] = useState<Pph | null>(null);

  const {
    isOpen: isStatusModalOpen,
    type: modalType,
    title: modalTitle,
    message: modalMessage,
    onConfirm: modalOnConfirm,
    showSuccess,
    showError,
    showConfirm,
    closeModal,
    isLoading: isActionLoading,
    setIsLoading: setActionLoading,
  } = useStatusModal();

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "ppn") {
        const res = await api.express.get("/ppn");
        setPpns(res.data.data || res.data);
      } else {
        const res = await api.express.get("/pph");
        setPphs(res.data.data || res.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleAdd = () => {
    if (activeTab === "ppn") {
      setSelectedPpn(null);
      setIsPpnModalOpen(true);
    } else {
      setSelectedPph(null);
      setIsPphModalOpen(true);
    }
  };

  const handleEditPpn = (ppn: Ppn) => {
    setSelectedPpn(ppn);
    setIsPpnModalOpen(true);
  };

  const handleEditPph = (pph: Pph) => {
    setSelectedPph(pph);
    setIsPphModalOpen(true);
  };

  const handleDelete = (id: number) => {
    showConfirm(
      "Delete Tax?",
      `Are you sure you want to delete this ${activeTab.toUpperCase()}? It may affect existing data.`,
      () => performDelete(id),
      "Delete Now",
      "Cancel",
    );
  };

  const performDelete = async (id: number) => {
    setActionLoading(true);
    try {
      const endpoint = activeTab === "ppn" ? "ppn" : "pph";
      await api.express.delete(`/${endpoint}/${id}`);
      showSuccess("Deleted!", "Tax has been removed successfully.");
      fetchData();
    } catch (error: any) {
      showError("Delete Failed", error.message || "Failed to delete.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredPpns = ppns.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredPphs = pphs.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-500">
      <PpnModal
        isOpen={isPpnModalOpen}
        onClose={() => setIsPpnModalOpen(false)}
        onSuccess={() => {
          fetchData();
          showSuccess(
            "Success!",
            selectedPpn
              ? "PPN updated successfully."
              : "PPN created successfully.",
          );
        }}
        itemToEdit={selectedPpn}
      />

      <PphModal
        isOpen={isPphModalOpen}
        onClose={() => setIsPphModalOpen(false)}
        onSuccess={() => {
          fetchData();
          showSuccess(
            "Success!",
            selectedPph
              ? "PPH updated successfully."
              : "PPH created successfully.",
          );
        }}
        itemToEdit={selectedPph}
      />

      <StatusModal
        isOpen={isStatusModalOpen}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
        onConfirm={modalOnConfirm}
        onClose={closeModal}
        isLoading={isActionLoading}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
              <Percent className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Daftar <span className="text-emerald-600">{activeTab === 'ppn' ? 'PPN' : 'PPH'}</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Kelola persentase {activeTab === 'ppn' ? 'Pajak Pertambahan Nilai' : 'Pajak Penghasilan'} untuk transaksi perusahaan.
          </p>
        </div>
        
        <button
          onClick={handleAdd}
          className="group relative flex items-center gap-3 bg-gray-900 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-emerald-200 active:scale-95 overflow-hidden"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Tambah {activeTab.toUpperCase()} Baru</span>
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
        {/* TABS */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => {
              setActiveTab("ppn");
              setSearch("");
            }}
            className={`flex-1 py-4 text-sm font-semibold transition-colors ${activeTab === "ppn" ? "text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/30" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
          >
            VAT (PPN)
          </button>
          <button
            onClick={() => {
              setActiveTab("pph");
              setSearch("");
            }}
            className={`flex-1 py-4 text-sm font-semibold transition-colors ${activeTab === "pph" ? "text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/30" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
          >
            Income Tax (PPH)
          </button>
        </div>

        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <div className="relative w-full max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={`Search ${activeTab.toUpperCase()}...`}
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-emerald-500 outline-none sm:text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">
                  Rate (%)
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={3} className="text-center py-4">
                    Loading...
                  </td>
                </tr>
              ) : (activeTab === "ppn" ? filteredPpns : filteredPphs).length >
                0 ? (
                (activeTab === "ppn" ? filteredPpns : filteredPphs).map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-emerald-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                      {p.name}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block px-3 py-1 bg-gray-100 rounded-lg text-xs font-black text-gray-600">
                        {p.rate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() =>
                            activeTab === "ppn"
                              ? handleEditPpn(p)
                              : handleEditPph(p)
                          }
                          className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm"
                          title="Edit Tax"
                        >
                          <Edit2 size={16} strokeWidth={3} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-2.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm"
                          title="Delete Tax"
                        >
                          <Trash2 size={16} strokeWidth={3} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-center py-8 text-gray-500">
                    No taxes found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
