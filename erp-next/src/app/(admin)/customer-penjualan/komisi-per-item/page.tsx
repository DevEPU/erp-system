"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Tag, X, Calendar, Percent, DollarSign, CheckCircle2, AlertCircle, Eye, FileText, UserCheck, Package, ShieldCheck } from "lucide-react";
import api from "@/lib/api";
import TablePagination from "@/components/ui/TablePagination";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import ProductSearchDropdown, { type ProductOption } from "@/components/ui/ProductSearchDropdown";

type KomisiPerItem = {
  id?: number;
  salesman_id: number | "";
  salesman_name?: string;
  product_id: number | "";
  product_name: string;
  product_code?: string;
  komisi_type: string;
  komisi_value: number;
  min_price: number;
  min_qty: number;
  start_date?: string;
  end_date?: string;
  is_active: number;
  notes?: string;
};

const emptyKomisi = (): KomisiPerItem => ({
  salesman_id: "",
  product_id: "",
  product_name: "",
  product_code: "",
  komisi_type: "percentage",
  komisi_value: 0,
  min_price: 0,
  min_qty: 1,
  start_date: "",
  end_date: "",
  is_active: 1,
  notes: "",
});

export default function KomisiPerItemPage() {
  const [data, setData] = useState<KomisiPerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const { isOpen, type: modalType, title, message, onConfirm, showSuccess, showError, showConfirm, closeModal, isLoading: isActionLoading } = useStatusModal();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<KomisiPerItem | null>(null);
  const [formData, setFormData] = useState<KomisiPerItem>(emptyKomisi());

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<KomisiPerItem | null>(null);

  const [salesmen, setSalesmen] = useState<any[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);

  const fetchDropdowns = async () => {
    try {
      const [salesRes, prodRes] = await Promise.all([
        api.express.get("/salesman", { limit: 9999 }),
        api.express.get("/products", { limit: 9999 })
      ]);
      const salesOpts = [{ value: "", label: "-- Semua Salesman (Berlaku Global) --" }].concat(
        (salesRes.data.data || []).map((s: any) => ({ value: s.id, label: `${s.name} ${s.code ? `(${s.code})` : ''}` }))
      );
      setSalesmen(salesOpts);
      setProducts(prodRes.data.data || []);
    } catch {}
  };

  const fetchData = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.express.get("/komisi-per-item", { page: p, search });
      setData(res.data.data || []);
      setPage(res.data.current_page || 1);
      setTotalPages(res.data.last_page || 1);
      setTotalItems(res.data.total || (res.data.data ? res.data.data.length : 0));
    } catch {
      setData([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDropdowns(); }, []);
  useEffect(() => { const t = setTimeout(() => fetchData(1), 400); return () => clearTimeout(t); }, [search]);

  const handleOpenCreate = () => {
    setFormData(emptyKomisi());
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  const handleOpenView = (item: KomisiPerItem) => {
    setViewingItem(item);
    setIsViewModalOpen(true);
  };

  const handleOpenEdit = (item: KomisiPerItem) => {
    setFormData({
      ...emptyKomisi(),
      ...item,
      komisi_value: Number(item.komisi_value) || 0,
      min_price: Number(item.min_price) || 0,
      min_qty: Number(item.min_qty) || 1,
      start_date: item.start_date ? item.start_date.split("T")[0] : "",
      end_date: item.end_date ? item.end_date.split("T")[0] : "",
      is_active: item.is_active ? 1 : 0,
      notes: item.notes || "",
    });
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_id && !formData.product_name) {
      return showError("Validation Error", "Produk wajib dipilih.");
    }

    const payload = { ...formData };
    delete (payload as any).id;
    delete (payload as any).created_at;
    delete (payload as any).updated_at;
    delete (payload as any).salesman_name;

    try {
      if (selectedItem?.id) {
        await api.express.put(`/komisi-per-item/${selectedItem.id}`, payload);
        showSuccess("Success", "Aturan Komisi Per Item berhasil diperbarui.");
      } else {
        await api.express.post("/komisi-per-item", payload);
        showSuccess("Success", "Aturan Komisi Per Item berhasil ditambahkan.");
      }
      setIsModalOpen(false);
      fetchData(page);
    } catch (err: any) {
      showError("Error", err.response?.data?.message || err.message || "Gagal menyimpan aturan komisi.");
    }
  };

  const handleDelete = (id: number) => {
    showConfirm("Confirm Delete", "Apakah Anda yakin ingin menghapus aturan komisi ini?", async () => {
      try {
        await api.express.delete(`/komisi-per-item/${id}`);
        showSuccess("Success", "Aturan Komisi berhasil dihapus.");
        fetchData(page);
      } catch (err: any) {
        showError("Error", err.response?.data?.message || err.message || "Gagal menghapus aturan komisi.");
      }
    });
  };

  // Calc StatCards safely
  const percentageItems = data.filter((d) => d.komisi_type === "percentage");
  const avgPercentage = percentageItems.length
    ? (percentageItems.reduce((s, i) => s + Number(i.komisi_value || 0), 0) / percentageItems.length).toFixed(1)
    : "0";

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-500">
      <StatusModal isOpen={isOpen} type={modalType} title={title} message={message} onConfirm={onConfirm} onClose={closeModal} isLoading={isActionLoading} />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-fuchsia-600 rounded-2xl shadow-lg shadow-fuchsia-200">
              <Tag className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Komisi <span className="text-fuchsia-600">Per Item</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">Kelola aturan komisi berbasis produk, syarat harga minimum, min Qty, dan masa berlaku.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-3 bg-gray-900 hover:bg-fuchsia-600 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Tambah Aturan Komisi</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 mb-6 hide-scrollbar">
        <StatCard icon={<Tag size={20} />} iconBgColor="bg-fuchsia-50" iconColor="text-fuchsia-600" label="TOTAL ATURAN KOMISI" value={totalItems || data.length} />
        <StatCard icon={<CheckCircle2 size={20} />} iconBgColor="bg-emerald-50" iconColor="text-emerald-600" label="ATURAN AKTIF" value={data.filter((d) => d.is_active).length} />
        <StatCard icon={<Percent size={20} />} iconBgColor="bg-amber-50" iconColor="text-amber-600" label="PERSENTASE AVG" value={`${avgPercentage}%`} />
      </div>

      {/* Filter Bar */}
      <div className="mb-8">
        <FilterBar searchPlaceholder="Cari berdasarkan nama produk, kode, atau salesman..." searchValue={search} onSearchChange={setSearch} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">No</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Produk & Kode</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Salesman Scope</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipe & Nilai Komisi</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Syarat Harga & Qty</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Masa Berlaku</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Memuat data aturan komisi...</td></tr>
              ) : data.length > 0 ? (
                data.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-400 font-mono">{(page - 1) * 10 + idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="font-extrabold text-gray-900">{item.product_name}</div>
                      <div className="text-xs font-mono text-gray-400">{item.product_code || "-"}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {item.salesman_name ? (
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 text-xs">
                          {item.salesman_name}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          Semua Salesman
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-black text-fuchsia-600">
                        {item.komisi_type === 'percentage'
                          ? `${Number(item.komisi_value)}%`
                          : `Rp ${Number(item.komisi_value).toLocaleString()} / Unit`}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-gray-400">
                        {item.komisi_type === 'percentage' ? 'Persentase' : 'Nominal Tetap'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="text-xs font-semibold">Min Price: Rp {Number(item.min_price || 0).toLocaleString()}</div>
                      <div className="text-xs text-gray-400">Min Order: {Number(item.min_qty || 1)} unit</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-600">
                      {item.start_date ? (
                        <div>{item.start_date.split("T")[0]} s.d. {item.end_date ? item.end_date.split("T")[0] : 'Selamanya'}</div>
                      ) : (
                        <span className="text-gray-400 font-sans">Tanpa Batas</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        item.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                      }`}>
                        {item.is_active ? 'Aktif' : 'Non-Aktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleOpenView(item)} title="Lihat Detail Aturan" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => handleOpenEdit(item)} title="Edit Aturan" className="p-1.5 text-fuchsia-600 hover:bg-fuchsia-50 rounded-lg transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(item.id!)} title="Hapus Aturan" className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <p className="text-gray-400 font-semibold">Belum ada aturan komisi per item.</p>
                    <p className="text-xs text-gray-300">Klik "Tambah Aturan Komisi" untuk menambahkan aturan baru.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} totalItems={totalItems} onPageChange={fetchData} />
      </div>

      {/* View Detail Modal */}
      {isViewModalOpen && viewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-8 py-6 bg-gradient-to-r from-fuchsia-50 to-indigo-50 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-fuchsia-600 text-white rounded-xl shadow-md">
                  <Tag size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Detail Aturan Komisi Per Item</h3>
                  <p className="text-xs text-gray-500 font-medium">Informasi rinci aturan komisi produk & syarat aplikasi</p>
                </div>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="p-2 text-gray-400 hover:bg-white/80 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-6">
              {/* Product & Salesman Header Card */}
              <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                <div>
                  <span className="text-[10px] font-black text-fuchsia-600 uppercase tracking-widest block mb-1">Produk Target</span>
                  <h4 className="text-lg font-black text-gray-900">{viewingItem.product_name}</h4>
                  {viewingItem.product_code && (
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded bg-gray-200 text-gray-700 text-xs font-mono font-bold">
                      {viewingItem.product_code}
                    </span>
                  )}
                </div>
                <div className="md:text-right">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Salesman Scope</span>
                  {viewingItem.salesman_name ? (
                    <span className="inline-flex items-center gap-1.5 font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100 text-xs">
                      <UserCheck size={14} />
                      {viewingItem.salesman_name}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-200 px-3 py-1 rounded-xl">
                      Semua Salesman (Berlaku Global)
                    </span>
                  )}
                </div>
              </div>

              {/* Grid Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tipe & Nilai Komisi */}
                <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm space-y-1">
                  <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-wider">
                    <Percent size={14} className="text-fuchsia-500" />
                    <span>Tipe & Nilai Komisi</span>
                  </div>
                  <div className="text-xl font-black text-fuchsia-600">
                    {viewingItem.komisi_type === "percentage"
                      ? `${Number(viewingItem.komisi_value)}%`
                      : `Rp ${Number(viewingItem.komisi_value).toLocaleString()} / Unit`}
                  </div>
                  <p className="text-xs text-gray-500 font-medium">
                    {viewingItem.komisi_type === "percentage" ? "Persentase dari harga jual produk" : "Nominal tetap per pcs unit produk"}
                  </p>
                </div>

                {/* Syarat Order & Minimum Price */}
                <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm space-y-1">
                  <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-wider">
                    <ShieldCheck size={14} className="text-indigo-500" />
                    <span>Syarat Ketentuan Order</span>
                  </div>
                  <div className="text-sm font-bold text-gray-800">
                    Min Harga: <span className="font-extrabold text-gray-900">Rp {Number(viewingItem.min_price || 0).toLocaleString()}</span>
                  </div>
                  <div className="text-sm font-bold text-gray-800">
                    Min Qty: <span className="font-extrabold text-gray-900">{Number(viewingItem.min_qty || 1)} Pcs</span>
                  </div>
                </div>

                {/* Masa Berlaku */}
                <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm space-y-1">
                  <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-wider">
                    <Calendar size={14} className="text-amber-500" />
                    <span>Masa Berlaku</span>
                  </div>
                  <div className="text-sm font-bold text-gray-900 font-mono">
                    {viewingItem.start_date ? (
                      `${viewingItem.start_date.split("T")[0]} s.d. ${viewingItem.end_date ? viewingItem.end_date.split("T")[0] : "Selamanya"}`
                    ) : (
                      "Tanpa Batas Waktu (Selamanya)"
                    )}
                  </div>
                </div>

                {/* Status Aturan */}
                <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm space-y-1">
                  <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-wider">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span>Status Aturan</span>
                  </div>
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-black ${
                      viewingItem.is_active ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"
                    }`}>
                      {viewingItem.is_active ? "AKTIF (Dapat Diaplikasikan)" : "NON-AKTIF (Dihentikan)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes Card */}
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 space-y-1">
                <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-wider">
                  <FileText size={14} className="text-gray-500" />
                  <span>Catatan / Keterangan</span>
                </div>
                <p className="text-sm text-gray-700 font-medium whitespace-pre-line">
                  {viewingItem.notes || <span className="text-gray-400 italic">Tidak ada catatan tambahan.</span>}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-all"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleOpenEdit(viewingItem);
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-sm font-bold text-white shadow-lg shadow-fuchsia-200 transition-all active:scale-95"
              >
                <Edit2 size={16} />
                <span>Edit Aturan Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal (Create / Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-gray-800">{selectedItem ? "Edit Aturan Komisi" : "Tambah Aturan Komisi Per Item"}</h3>
                <p className="text-xs text-gray-400 mt-0.5">Konfigurasi persentase komisi, syarat harga minimum & kuantitas order</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Produk Target *</label>
                  <ProductSearchDropdown
                    products={products}
                    value={formData.product_id}
                    onChange={(p) => {
                      setFormData({
                        ...formData,
                        product_id: p.id || "",
                        product_name: p.product_name || "",
                        product_code: p.product_code || "",
                      });
                    }}
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Salesman Scope (Opsional)</label>
                  <SearchableSelect
                    options={salesmen}
                    placeholder="Pilih Salesman (Biarkan kosong jika berlaku untuk semua salesman)..."
                    value={formData.salesman_id}
                    onChange={(val) => setFormData({ ...formData, salesman_id: val })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Tipe Komisi</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-fuchsia-100 focus:border-fuchsia-500 outline-none text-sm font-semibold transition-all"
                    value={formData.komisi_type}
                    onChange={(e) => setFormData({ ...formData, komisi_type: e.target.value })}
                  >
                    <option value="percentage">Persentase (%) dari Harga Jual</option>
                    <option value="fixed">Nominal Tetap (Rp per Pcs / Unit)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Nilai Komisi *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min={0}
                    placeholder={formData.komisi_type === 'percentage' ? "e.g. 2.5" : "e.g. 50000"}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-fuchsia-100 focus:border-fuchsia-500 outline-none text-sm font-black text-fuchsia-600 transition-all"
                    value={formData.komisi_value === 0 ? "" : formData.komisi_value}
                    onChange={(e) => setFormData({ ...formData, komisi_value: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Syarat Harga Penjualan Minimum (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 100000"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-fuchsia-100 focus:border-fuchsia-500 outline-none text-sm font-semibold transition-all"
                    value={formData.min_price === 0 ? "" : formData.min_price}
                    onChange={(e) => setFormData({ ...formData, min_price: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Syarat Minimum Qty Penjualan (Pcs)</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="e.g. 1"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-fuchsia-100 focus:border-fuchsia-500 outline-none text-sm font-semibold transition-all"
                    value={formData.min_qty === 0 ? "" : formData.min_qty}
                    onChange={(e) => setFormData({ ...formData, min_qty: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Tanggal Mulai Berlaku</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-fuchsia-100 focus:border-fuchsia-500 outline-none text-sm font-semibold transition-all"
                    value={formData.start_date || ""}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Tanggal Akhir Berlaku</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-fuchsia-100 focus:border-fuchsia-500 outline-none text-sm font-semibold transition-all"
                    value={formData.end_date || ""}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Status Aturan</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-fuchsia-100 focus:border-fuchsia-500 outline-none text-sm font-semibold transition-all"
                    value={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: Number(e.target.value) })}
                  >
                    <option value={1}>Aktif (Bisa Diaplikasikan ke Transaksi)</option>
                    <option value={0}>Non-Aktif (Dihentikan Sementara)</option>
                  </select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Catatan / Keterangan (Opsional)</label>
                  <textarea
                    rows={3}
                    placeholder="Catatan tambahan mengenai aturan komisi ini..."
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-fuchsia-100 focus:border-fuchsia-500 outline-none text-sm font-semibold transition-all resize-none"
                    value={formData.notes || ""}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-8 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-sm font-bold text-white shadow-lg shadow-fuchsia-200 transition-all active:scale-95"
                >
                  Simpan Aturan Komisi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
