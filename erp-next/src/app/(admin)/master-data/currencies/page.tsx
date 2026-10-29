"use client";

import { useState, useEffect } from "react";
import TablePagination from "@/components/ui/TablePagination";
import { Plus, Search, Coins, Edit2, Trash2 } from "lucide-react";
import CurrencyModal from "@/components/master-data/CurrencyModal";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import api from "@/lib/api";

type Currency = {
  id: number;
  currency_name: string;
  code: string;
  symbol: string;
  thousand_separator: string;
  decimal_separator: string;
  exchange_rate: number;
};

export default function CurrenciesPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(
    null,
  );

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

  const fetchCurrencies = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/currencies");
      setCurrencies(res.data.data || res.data);
    } catch (error) {
      console.error("Failed to fetch currencies", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const handleAdd = () => {
    setSelectedCurrency(null);
    setIsModalOpen(true);
  };

  const handleEdit = (curr: Currency) => {
    setSelectedCurrency(curr);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    showConfirm(
      "Delete Currency?",
      "Are you sure you want to delete this currency? This might affect pricing data.",
      () => performDelete(id),
      "Delete Now",
      "Keep it",
    );
  };

  const performDelete = async (id: number) => {
    setActionLoading(true);
    try {
      await api.express.delete(`/currencies/${id}`);
      showSuccess("Deleted!", "Currency has been removed successfully.");
      fetchCurrencies();
    } catch (error: any) {
      showError("Delete Failed", error.message || "Failed to delete.");
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = currencies.filter(
    (c) =>
      c.currency_name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-500">
      <CurrencyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchCurrencies();
          showSuccess(
            "Success!",
            selectedCurrency
              ? "Currency updated successfully."
              : "Currency created successfully.",
          );
        }}
        currencyToEdit={selectedCurrency}
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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
              <Coins className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              System <span className="text-emerald-600">Currencies</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Kelola mata uang sistem dan kurs nilai tukar untuk transaksi internasional.
          </p>
        </div>

        <button
          onClick={handleAdd}
          className="group relative flex items-center gap-3 bg-gray-900 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-emerald-200 active:scale-95 overflow-hidden"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Tambah Mata Uang</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <div className="relative w-full max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search currency..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-emerald-500 outline-none sm:text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Code
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Name
                </th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Symbol
                </th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Rate
                </th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-4">
                    Loading...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50/80 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {c.code}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {c.currency_name}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">
                      {c.symbol}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">
                      {c.exchange_rate}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(c)}
                          className="p-1.5 text-emerald-500 hover:text-emerald-600 rounded-lg"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 text-red-500 hover:text-red-600 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    No currencies found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination totalItems={filtered.length} />
      </div>
    </div>
  );
}
