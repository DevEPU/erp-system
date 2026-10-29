"use client";

import { useState, useEffect } from "react";
import { X, Search, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";

interface PR {
  id: number;
  reference: string;
  date: string;
  department_name: string;
  total_amount: number;
  status: string;
}

interface PRSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selectedPrIds: number[]) => void;
  availablePrItems: any[];
}

export default function PRSelectionModal({ isOpen, onClose, onSelect, availablePrItems }: PRSelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  // Extract unique PRs from available items
  const [prs, setPrs] = useState<PR[]>([]);

  useEffect(() => {
    if (isOpen) {
      const uniquePrMap = new Map();
      availablePrItems.forEach(item => {
        if (!uniquePrMap.has(item.purchase_id)) {
          uniquePrMap.set(item.purchase_id, {
            id: item.purchase_id,
            reference: item.pr_reference,
            date: item.pr_date,
            department_name: item.department_name,
            total_amount: 0, // We don't necessarily have the full total here, but we can compute it from items
            status: "Approved"
          });
        }
        // Sum items for this PR
        const pr = uniquePrMap.get(item.purchase_id);
        pr.total_amount += (item.remaining_quantity * item.unit_price);
      });
      setPrs(Array.from(uniquePrMap.values()));
    }
  }, [isOpen, availablePrItems]);

  const filteredPrs = prs.filter(pr => 
    pr.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pr.department_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredPrs.map(pr => pr.id));
    } else {
      setSelectedIds([]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <CheckCircle2 size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Pilih Permintaan Pembelian (PR)</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari nomer PR atau departemen..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 font-medium text-sm transition-all shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4 w-12 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        onChange={handleSelectAll}
                        checked={selectedIds.length === filteredPrs.length && filteredPrs.length > 0}
                      />
                    </th>
                    <th className="px-6 py-4">No. Permintaan</th>
                    <th className="px-6 py-4">Tgl. Permintaan</th>
                    <th className="px-6 py-4">Departemen</th>
                    <th className="px-6 py-4 text-right">Estimasi Nilai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {filteredPrs.map((pr) => (
                    <tr 
                      key={pr.id} 
                      className={`hover:bg-blue-50/50 transition-colors cursor-pointer ${selectedIds.includes(pr.id) ? 'bg-blue-50/30' : ''}`}
                      onClick={() => toggleSelect(pr.id)}
                    >
                      <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          checked={selectedIds.includes(pr.id)}
                          onChange={() => toggleSelect(pr.id)}
                        />
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-800">{pr.reference}</td>
                      <td className="px-6 py-4 font-medium text-gray-500">{pr.date}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold uppercase">
                          {pr.department_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-blue-600">
                        Rp {pr.total_amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {filteredPrs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-gray-400 italic">
                        Tidak ada PR yang disetujui ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <p className="text-xs font-bold text-gray-500">
            Terpilih <span className="text-blue-600">{selectedIds.length}</span> Permintaan
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 px-8 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all text-xs uppercase tracking-widest"
            >
              Batal
            </button>
            <button
              onClick={() => onSelect(selectedIds)}
              disabled={selectedIds.length === 0}
              className="bg-blue-600 text-white px-8 py-2 rounded-xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95 disabled:opacity-50 disabled:shadow-none text-xs uppercase tracking-widest"
            >
              Pilih ({selectedIds.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
