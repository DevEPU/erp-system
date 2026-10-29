"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, FileText, X, Eye } from "lucide-react";
import api from "@/lib/api";
import TablePagination from "@/components/ui/TablePagination";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import SearchableSelect from "@/components/ui/SearchableSelect";

type TransaksiAr = {
  id?: number;
  reference?: string;
  customer_id: number | "";
  customer_name?: string;
  invoice_reference: string;
  amount: number;
  payment_method: string;
  date: string;
  note?: string;
  status: string;
};

export default function TransaksiArPage() {
  const [data, setData] = useState<TransaksiAr[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { isOpen, type, title, message, onConfirm, showSuccess, showError, showConfirm, closeModal, isLoading: isActionLoading } = useStatusModal();

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TransaksiAr | null>(null);
  const [formData, setFormData] = useState<TransaksiAr>({
    customer_id: "",
    invoice_reference: "",
    amount: 0,
    payment_method: "Transfer Bank",
    date: new Date().toISOString().split("T")[0],
    note: "",
    status: "Draft"
  });

  const [customers, setCustomers] = useState<any[]>([]);

  const fetchCustomers = async () => {
    try {
      const res = await api.express.get("/customers-list");
      setCustomers((res.data.data || []).map((c: any) => ({ value: c.id, label: c.customer_name })));
    } catch (err) {
      console.error("Error fetching customers:", err);
    }
  };

  const fetchData = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.express.get("/transaksi-ar", { page: p, search });
      setData(res.data.data || []);
      setPage(res.data.current_page || 1);
      setTotalPages(res.data.last_page || 1);
    } catch { 
      setData([]); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchCustomers();
    const t = setTimeout(() => fetchData(1), 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleOpenCreate = () => {
    setFormData({
      customer_id: "",
      invoice_reference: "",
      amount: 0,
      payment_method: "Transfer Bank",
      date: new Date().toISOString().split("T")[0],
      note: "",
      status: "Draft"
    });
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = async (id: number) => {
    try {
      const res = await api.express.get(`/transaksi-ar/${id}`);
      if (res.data.success) {
        setFormData(res.data.data);
        setSelectedItem(res.data.data);
        setIsModalOpen(true);
      }
    } catch (err: any) {
      showError("Error", err.message || "Failed to load details.");
    }
  };

  const handleOpenDetail = async (id: number) => {
    try {
      const res = await api.express.get(`/transaksi-ar/${id}`);
      if (res.data.success) {
        setSelectedItem(res.data.data);
        setIsDetailOpen(true);
      }
    } catch (err: any) {
      showError("Error", err.message || "Failed to load details.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id) return showError("Validation Error", "Pilih customer terlebih dahulu.");
    if (!formData.invoice_reference) return showError("Validation Error", "Masukkan nomor referensi invoice.");
    if (formData.amount <= 0) return showError("Validation Error", "Jumlah pembayaran piutang harus lebih besar dari 0.");

    try {
      if (selectedItem?.id) {
        await api.express.put(`/transaksi-ar/${selectedItem.id}`, formData);
        showSuccess("Success", "Transaksi AR berhasil diperbarui.");
      } else {
        await api.express.post("/transaksi-ar", formData);
        showSuccess("Success", "Transaksi AR baru berhasil disimpan.");
      }
      setIsModalOpen(false);
      fetchData(page);
    } catch (err: any) {
      showError("Error", err.response?.data?.message || err.message || "Gagal menyimpan data.");
    }
  };

  const handleDelete = (id: number) => {
    showConfirm("Confirm Delete", "Apakah Anda yakin ingin menghapus transaksi piutang AR ini?", async () => {
      try {
        await api.express.delete(`/transaksi-ar/${id}`);
        showSuccess("Success", "Transaksi berhasil dihapus.");
        fetchData(page);
      } catch (err: any) {
        showError("Error", err.response?.data?.message || err.message || "Gagal menghapus data.");
      }
    });
  };

  const totalOutstanding = data.reduce((s, i) => s + Number(i.amount || 0), 0);

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-500">
      <StatusModal isOpen={isOpen} type={type} title={title} message={message} onConfirm={onConfirm} onClose={closeModal} isLoading={isActionLoading} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-sky-600 rounded-2xl shadow-lg shadow-sky-200">
              <FileText className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Transaksi <span className="text-sky-600">A.R.</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">Kelola pencatatan dan penerimaan piutang (Accounts Receivable) dari customer.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-3 bg-gray-900 hover:bg-sky-600 hover:shadow-sky-200 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl active:scale-95"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Tambah Baru</span>
        </button>
      </div>

      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 mb-6 hide-scrollbar">
        <StatCard icon={<FileText size={20} />} iconBgColor="bg-sky-50" iconColor="text-sky-600" label="TOTAL TRANSAKSI" value={data.length} />
        <StatCard icon={<FileText size={20} />} iconBgColor="bg-emerald-50" iconColor="text-emerald-600" label="TOTAL PIUTANG DITERIMA" value={`Rp ${totalOutstanding.toLocaleString()}`} />
      </div>

      <div className="mb-8">
        <FilterBar searchPlaceholder="Cari data transaksi a.r...." searchValue={search} onSearchChange={setSearch} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">No</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">No. AR Ref</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Invoice Ref</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Jumlah</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Metode</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Tanggal</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Memuat data...</td></tr>
              ) : data.length > 0 ? (
                data.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-400 font-mono">{(page - 1) * 10 + idx + 1}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{item.reference}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{item.customer_name || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">{item.invoice_reference}</td>
                    <td className="px-6 py-4 text-sm font-black text-indigo-600">Rp {Number(item.amount).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.payment_method}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.date}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleOpenDetail(item.id!)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye size={16} /></button>
                        <button onClick={() => handleOpenEdit(item.id!)} className="p-1.5 text-sky-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(item.id!)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center">
                        <FileText size={28} className="text-sky-600" />
                      </div>
                      <p className="font-semibold">Belum ada transaksi piutang AR</p>
                      <p className="text-xs text-gray-300">Klik tombol "Tambah Baru" untuk mencatat penerimaan piutang pertama</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} totalItems={(page - 1) * 10 + data.length} onPageChange={fetchData} />
      </div>

      {/* FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-gray-800">
                  {selectedItem ? "Edit Transaksi AR" : "Tambah Transaksi AR Baru"}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Customer</label>
                <SearchableSelect
                  options={customers}
                  placeholder="Pilih Customer..."
                  value={formData.customer_id}
                  onChange={(val) => setFormData({ ...formData, customer_id: val })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Nomor Invoice</label>
                <input
                  type="text"
                  required
                  placeholder="Masukkan Nomor Invoice..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-sky-100 focus:border-sky-500 outline-none text-sm font-semibold transition-all"
                  value={formData.invoice_reference}
                  onChange={(e) => setFormData({ ...formData, invoice_reference: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Jumlah Penerimaan (Rp)</label>
                  <input
                    type="number"
                    required
                    placeholder="Contoh: 5000000"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-sky-100 focus:border-sky-500 outline-none text-sm font-black transition-all"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Tanggal</label>
                  <input
                    type="date"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-sky-100 focus:border-sky-500 outline-none text-sm font-semibold transition-all"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Metode Pembayaran</label>
                <SearchableSelect
                  options={[
                    { value: "Transfer Bank", label: "Transfer Bank" },
                    { value: "Kas Kecil", label: "Kas Kecil (Cash)" },
                    { value: "Giro / Cheque", label: "Giro / Cheque" },
                    { value: "Lainnya", label: "Lainnya" }
                  ]}
                  placeholder="Pilih Metode..."
                  value={formData.payment_method}
                  onChange={(val) => setFormData({ ...formData, payment_method: String(val) })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Keterangan / Memo</label>
                <textarea
                  rows={2}
                  placeholder="Memo transaksi..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-sky-100 focus:border-sky-500 outline-none text-sm font-medium transition-all"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">
                  Batal
                </button>
                <button type="submit" className="px-6 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-sm font-bold text-white shadow-lg transition-all active:scale-95">
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {isDetailOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-black tracking-widest text-sky-600 uppercase font-mono">Detail Transaksi AR</span>
                <h3 className="text-xl font-black text-gray-800 mt-0.5">{selectedItem.reference}</h3>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-4">
              <div>
                <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Customer</span>
                <span className="font-extrabold text-gray-800 text-sm">{selectedItem.customer_name || "-"}</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Invoice Reference</span>
                <span className="font-extrabold text-gray-800 text-sm font-mono">{selectedItem.invoice_reference}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Jumlah</span>
                  <span className="font-black text-indigo-600 text-lg">Rp {Number(selectedItem.amount).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Tanggal</span>
                  <span className="font-extrabold text-gray-800 text-sm">{selectedItem.date}</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Metode Pembayaran</span>
                <span className="font-extrabold text-gray-800 text-sm">{selectedItem.payment_method}</span>
              </div>
              {selectedItem.note && (
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Memo / Keterangan</span>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-xl text-sm border border-gray-100 mt-1">{selectedItem.note}</p>
                </div>
              )}
            </div>

            <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button onClick={() => setIsDetailOpen(false)} className="px-6 py-2 bg-gray-900 hover:bg-black text-white text-sm font-bold shadow-md transition-all">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
