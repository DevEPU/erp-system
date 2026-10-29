"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, RotateCcw, X, Trash, Eye } from "lucide-react";
import api from "@/lib/api";
import TablePagination from "@/components/ui/TablePagination";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import ProductSearchDropdown, { type ProductOption } from "@/components/ui/ProductSearchDropdown";

type ReturDetail = {
  id?: number;
  product_id?: number | null;
  product_name: string;
  product_code?: string | null;
  product_unit?: string | null;
  qty_returned: number;
};

type ReturSuratJalan = {
  id?: number;
  reference?: string;
  customer_id: number | "";
  customer_name?: string;
  sj_reference: string;
  return_date: string;
  reason?: string;
  status: string;
  details: ReturDetail[];
};

export default function ReturSuratJalanPage() {
  const [data, setData] = useState<ReturSuratJalan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { isOpen, type, title, message, onConfirm, showSuccess, showError, showConfirm, closeModal, isLoading: isActionLoading } = useStatusModal();

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedRetur, setSelectedRetur] = useState<ReturSuratJalan | null>(null);
  const [formData, setFormData] = useState<ReturSuratJalan>({
    customer_id: "",
    sj_reference: "",
    return_date: new Date().toISOString().split("T")[0],
    reason: "",
    status: "Draft",
    details: []
  });

  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [suratJalans, setSuratJalans] = useState<any[]>([]);

  const fetchDropdowns = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        api.express.get("/customers-list"),
        api.express.get("/products", { limit: 9999 })
      ]);
      setCustomers((custRes.data.data || []).map((c: any) => ({ value: c.id, label: c.customer_name })));
      setProducts(prodRes.data.data || []);
    } catch (err) {
      console.error("Error loading dropdown data:", err);
    }
  };

  const loadCustomerSuratJalans = async (customerId: number) => {
    try {
      const res = await api.express.get("/surat-jalan", { params: { customer_id: customerId, limit: 1000 } });
      if (res.data.success) {
        setSuratJalans((res.data.data || []).map((sj: any) => ({ value: sj.reference, label: sj.reference })));
      }
    } catch (err) {
      console.error("Error loading surat jalan list:", err);
    }
  };

  const fetchData = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.express.get("/retur-surat-jalan", { page: p, search });
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
    fetchDropdowns();
    const t = setTimeout(() => fetchData(1), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (formData.customer_id) {
      loadCustomerSuratJalans(Number(formData.customer_id));
    } else {
      setSuratJalans([]);
    }
  }, [formData.customer_id]);

  const handlePullSJItems = async (sjRef: string) => {
    if (!sjRef) return;
    setFormData(prev => ({ ...prev, sj_reference: sjRef }));
    try {
      const res = await api.express.get("/surat-jalan", { limit: 9999 });
      const found = (res.data.data || []).find((s: any) => s.reference === sjRef);
      if (found) {
        const detRes = await api.express.get(`/surat-jalan/${found.id}`);
        if (detRes.data.success) {
          const items = detRes.data.data.details || [];
          const newDetails = items.map((i: any) => ({
            product_id: i.product_id,
            product_name: i.product_name,
            product_code: i.product_code,
            product_unit: i.product_unit || "PCS",
            qty_returned: Number(i.qty_delivered || 0)
          }));
          setFormData(prev => ({ ...prev, details: newDetails }));
          showSuccess("Success", `Berhasil memuat ${newDetails.length} item dari Surat Jalan ${sjRef} untuk retur.`);
        }
      }
    } catch (err) {
      console.error("Error pulling SJ details:", err);
    }
  };

  const handleOpenCreate = () => {
    setFormData({
      customer_id: "",
      sj_reference: "",
      return_date: new Date().toISOString().split("T")[0],
      reason: "",
      status: "Draft",
      details: []
    });
    setSelectedRetur(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = async (id: number) => {
    try {
      const res = await api.express.get(`/retur-surat-jalan/${id}`);
      if (res.data.success) {
        setFormData(res.data.data);
        setSelectedRetur(res.data.data);
        setIsModalOpen(true);
      }
    } catch (err: any) {
      showError("Error", err.message || "Failed to load details.");
    }
  };

  const handleOpenDetail = async (id: number) => {
    try {
      const res = await api.express.get(`/retur-surat-jalan/${id}`);
      if (res.data.success) {
        setSelectedRetur(res.data.data);
        setIsDetailOpen(true);
      }
    } catch (err: any) {
      showError("Error", err.message || "Failed to load details.");
    }
  };

  const handleAddRow = () => {
    setFormData({
      ...formData,
      details: [
        ...formData.details,
        { product_id: null, product_name: "", product_code: "", product_unit: "PCS", qty_returned: 1 }
      ]
    });
  };

  const handleRemoveRow = (idx: number) => {
    const next = [...formData.details];
    next.splice(idx, 1);
    setFormData({ ...formData, details: next });
  };

  const handleItemChange = (idx: number, key: keyof ReturDetail, val: any) => {
    const next = [...formData.details];
    next[idx] = { ...next[idx], [key]: val };
    setFormData({ ...formData, details: next });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id) return showError("Validation Error", "Pilih customer terlebih dahulu.");
    if (formData.details.length === 0) return showError("Validation Error", "Tambahkan minimal satu detail item retur.");
    if (formData.details.some(item => !item.product_id)) return showError("Validation Error", "Semua baris item harus memilih produk.");

    try {
      if (selectedRetur?.id) {
        await api.express.put(`/retur-surat-jalan/${selectedRetur.id}`, formData);
        showSuccess("Success", "Retur Surat Jalan berhasil diperbarui.");
      } else {
        await api.express.post("/retur-surat-jalan", formData);
        showSuccess("Success", "Retur Surat Jalan baru berhasil disimpan.");
      }
      setIsModalOpen(false);
      fetchData(page);
    } catch (err: any) {
      showError("Error", err.response?.data?.message || err.message || "Gagal menyimpan data.");
    }
  };

  const handleDelete = (id: number) => {
    showConfirm("Confirm Delete", "Apakah Anda yakin ingin menghapus Retur Surat Jalan ini?", async () => {
      try {
        await api.express.delete(`/retur-surat-jalan/${id}`);
        showSuccess("Success", "Retur Surat Jalan berhasil dihapus.");
        fetchData(page);
      } catch (err: any) {
        showError("Error", err.response?.data?.message || err.message || "Gagal menghapus data.");
      }
    });
  };

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-500">
      <StatusModal isOpen={isOpen} type={type} title={title} message={message} onConfirm={onConfirm} onClose={closeModal} isLoading={isActionLoading} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-600 rounded-2xl shadow-lg shadow-orange-200">
              <RotateCcw className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Retur Surat <span className="text-orange-600">Jalan</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">Kelola pencatatan dan proses pengembalian (retur) barang dari Surat Jalan.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-3 bg-gray-900 hover:bg-orange-600 hover:shadow-orange-200 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl active:scale-95"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Tambah Baru</span>
        </button>
      </div>

      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 mb-6 hide-scrollbar">
        <StatCard icon={<RotateCcw size={20} />} iconBgColor="bg-orange-50" iconColor="text-orange-600" label="TOTAL RETUR DO" value={data.length} />
      </div>

      <div className="mb-8">
        <FilterBar searchPlaceholder="Cari data retur surat jalan..." searchValue={search} onSearchChange={setSearch} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">No</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">No. Retur</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Surat Jalan Ref</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Tanggal Retur</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Alasan</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Memuat data...</td></tr>
              ) : data.length > 0 ? (
                data.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-400 font-mono">{(page - 1) * 10 + idx + 1}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{item.reference}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{item.customer_name || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">{item.sj_reference || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.return_date}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-[200px]">{item.reason || "-"}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleOpenDetail(item.id!)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye size={16} /></button>
                        <button onClick={() => handleOpenEdit(item.id!)} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(item.id!)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center">
                        <RotateCcw size={28} className="text-orange-600" />
                      </div>
                      <p className="font-semibold">Belum ada Retur Surat Jalan</p>
                      <p className="text-xs text-gray-300">Klik "Tambah Baru" untuk membuat Retur Surat Jalan pertama</p>
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
          <div className="bg-white rounded-[2rem] w-full max-w-5xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-gray-800">
                  {selectedRetur ? "Edit Retur Surat Jalan" : "Tambah Retur Surat Jalan Baru"}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Tarik dari Surat Jalan</label>
                  <SearchableSelect
                    options={suratJalans}
                    disabled={!formData.customer_id}
                    placeholder={formData.customer_id ? "Pilih Surat Jalan..." : "Pilih Customer Terlebih Dahulu"}
                    value={formData.sj_reference}
                    onChange={(val) => handlePullSJItems(String(val))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Tanggal Retur</label>
                  <input
                    type="date"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none text-sm font-semibold transition-all"
                    value={formData.return_date}
                    onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Alasan Pengembalian / Retur</label>
                <textarea
                  rows={2}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none text-sm font-medium transition-all"
                  placeholder="Alasan retur barang..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>

              <div className="border-t border-gray-100 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest">Daftar Item Retur</h4>
                  <button type="button" onClick={handleAddRow} className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1">
                    <Plus size={14} /> Tambah Item Manual
                  </button>
                </div>

                <div className="border border-gray-100 rounded-xl overflow-visible">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-400 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">Produk / Nama Custom</th>
                        <th className="px-4 py-3 text-center w-28">Unit</th>
                        <th className="px-4 py-3 text-center w-36">Qty Diretur</th>
                        <th className="px-4 py-3 text-center w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {formData.details.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-4 space-y-1">
                            <ProductSearchDropdown
                              products={products}
                              value={item.product_id || ""}
                              onChange={(p) => {
                                if (!p.id) return;
                                const next = [...formData.details];
                                next[idx] = {
                                  ...next[idx],
                                  product_id: p.id,
                                  product_name: p.product_name,
                                  product_code: p.product_code || "",
                                  product_unit: p.product_unit || "PCS",
                                };
                                setFormData({ ...formData, details: next });
                              }}
                            />
                          </td>
                          <td className="p-4 text-center">
                            <input
                              type="text"
                              className="w-full px-2 py-1.5 bg-gray-50 rounded-lg text-center font-bold text-xs border-none"
                              value={item.product_unit || ""}
                              onChange={(e) => handleItemChange(idx, "product_unit", e.target.value)}
                            />
                          </td>
                          <td className="p-4 text-center">
                            <input
                              type="number"
                              required
                              min={1}
                              className="w-full px-2 py-1.5 bg-gray-50 rounded-lg text-center font-black text-sm border-none shadow-inner"
                              value={item.qty_returned}
                              onChange={(e) => handleItemChange(idx, "qty_returned", Number(e.target.value))}
                            />
                          </td>
                          <td className="p-4 text-center">
                            <button type="button" onClick={() => handleRemoveRow(idx)} className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                              <Trash size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {formData.details.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-gray-400 text-xs">
                            Belum ada item retur. Gunakan penarikan surat jalan di atas atau klik "Tambah Item Manual".
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">
                  Batal
                </button>
                <button type="submit" className="px-8 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-sm font-bold text-white shadow-lg transition-all active:scale-95">
                  Simpan Retur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {isDetailOpen && selectedRetur && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-black tracking-widest text-orange-600 uppercase">Detail Retur Surat Jalan</span>
                <h3 className="text-xl font-black text-gray-800 mt-0.5">{selectedRetur.reference}</h3>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-orange-50/30 p-6 rounded-2xl border border-orange-50">
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Customer</span>
                  <span className="font-extrabold text-gray-800 text-sm">{selectedRetur.customer_name || "-"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Surat Jalan Ref</span>
                  <span className="font-extrabold text-gray-850 text-sm font-mono">{selectedRetur.sj_reference || "-"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Tanggal Retur</span>
                  <span className="font-extrabold text-gray-800 text-sm">{selectedRetur.return_date}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider mb-1">Alasan Retur</span>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-xl text-sm border border-gray-100">{selectedRetur.reason}</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest">Daftar Item Retur</h4>
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-400 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="px-6 py-3 text-left">Nama Produk</th>
                        <th className="px-6 py-3 text-center w-32">Unit</th>
                        <th className="px-6 py-3 text-center w-36">Qty Diretur</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {selectedRetur.details?.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-bold block text-gray-800 text-sm">{item.product_name}</span>
                            <span className="text-[10px] font-mono text-gray-400">{item.product_code || "-"}</span>
                          </td>
                          <td className="px-6 py-4 text-center text-gray-600 font-semibold">{item.product_unit || "PCS"}</td>
                          <td className="px-6 py-4 text-center text-gray-850 font-black text-red-650">{Number(item.qty_returned).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
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
