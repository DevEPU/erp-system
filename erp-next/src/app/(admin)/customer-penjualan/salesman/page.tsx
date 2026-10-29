"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Users, X, Eye, Target, Percent, ShieldCheck, Briefcase, MapPin, Building, Calendar, DollarSign, Award, Layers, Calculator } from "lucide-react";
import api from "@/lib/api";
import TablePagination from "@/components/ui/TablePagination";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";

type Salesman = {
  id?: number;
  name: string;
  code?: string;
  nik_employee?: string;
  sales_team?: string;
  supervisor_name?: string;
  branch?: string;
  phone?: string;
  email?: string;
  area?: string;
  address?: string;
  commission_rate: number;
  monthly_target: number;
  target_m1: number;
  target_m2: number;
  target_m3: number;
  target_m4: number;
  target_m5: number;
  target_m6: number;
  target_m7: number;
  target_m8: number;
  target_m9: number;
  target_m10: number;
  target_m11: number;
  target_m12: number;
  yearly_target: number;
  max_discount_limit: number;
  credit_limit_authority: number;
  join_date?: string;
  notes?: string;
  is_active: number;
};

const emptySalesman = (): Salesman => ({
  name: "",
  code: "",
  nik_employee: "",
  sales_team: "Direct Sales",
  supervisor_name: "",
  branch: "",
  phone: "",
  email: "",
  area: "",
  address: "",
  commission_rate: 0,
  monthly_target: 0,
  target_m1: 0,
  target_m2: 0,
  target_m3: 0,
  target_m4: 0,
  target_m5: 0,
  target_m6: 0,
  target_m7: 0,
  target_m8: 0,
  target_m9: 0,
  target_m10: 0,
  target_m11: 0,
  target_m12: 0,
  yearly_target: 0,
  max_discount_limit: 0,
  credit_limit_authority: 0,
  join_date: new Date().toISOString().split("T")[0],
  notes: "",
  is_active: 1,
});

const salesTeamOptions = [
  "Direct Sales",
  "Key Account Management",
  "B2B Industrial",
  "Retail & Distribution",
  "Government & Corporate",
  "Export Sales",
];

const monthLabels = [
  { key: "target_m1", label: "Bulan 1 (Januari)" },
  { key: "target_m2", label: "Bulan 2 (Februari)" },
  { key: "target_m3", label: "Bulan 3 (Maret)" },
  { key: "target_m4", label: "Bulan 4 (April)" },
  { key: "target_m5", label: "Bulan 5 (Mei)" },
  { key: "target_m6", label: "Bulan 6 (Juni)" },
  { key: "target_m7", label: "Bulan 7 (Juli)" },
  { key: "target_m8", label: "Bulan 8 (Agustus)" },
  { key: "target_m9", label: "Bulan 9 (September)" },
  { key: "target_m10", label: "Bulan 10 (Oktober)" },
  { key: "target_m11", label: "Bulan 11 (November)" },
  { key: "target_m12", label: "Bulan 12 (Desember)" },
];

export default function SalesmanPage() {
  const [data, setData] = useState<Salesman[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { isOpen, type, title, message, onConfirm, showSuccess, showError, showConfirm, closeModal, isLoading: isActionLoading } = useStatusModal();

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Salesman | null>(null);
  const [formData, setFormData] = useState<Salesman>(emptySalesman());
  const [activeTab, setActiveTab] = useState<"general" | "territory" | "target" | "admin">("general");

  const fetchData = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.express.get("/salesman", { page: p, search });
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
    const t = setTimeout(() => fetchData(1), 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleOpenCreate = () => {
    setFormData(emptySalesman());
    setSelectedItem(null);
    setActiveTab("general");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Salesman) => {
    setFormData({
      ...emptySalesman(),
      ...item,
      commission_rate: Number(item.commission_rate) || 0,
      monthly_target: Number(item.monthly_target) || 0,
      target_m1: Number(item.target_m1) || 0,
      target_m2: Number(item.target_m2) || 0,
      target_m3: Number(item.target_m3) || 0,
      target_m4: Number(item.target_m4) || 0,
      target_m5: Number(item.target_m5) || 0,
      target_m6: Number(item.target_m6) || 0,
      target_m7: Number(item.target_m7) || 0,
      target_m8: Number(item.target_m8) || 0,
      target_m9: Number(item.target_m9) || 0,
      target_m10: Number(item.target_m10) || 0,
      target_m11: Number(item.target_m11) || 0,
      target_m12: Number(item.target_m12) || 0,
      yearly_target: Number(item.yearly_target) || 0,
      max_discount_limit: Number(item.max_discount_limit) || 0,
      credit_limit_authority: Number(item.credit_limit_authority) || 0,
      join_date: item.join_date ? item.join_date.split("T")[0] : "",
      is_active: item.is_active ? 1 : 0,
    });
    setSelectedItem(item);
    setActiveTab("general");
    setIsModalOpen(true);
  };

  const handleOpenDetail = (item: Salesman) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  };

  const updateMonthlyTarget = (key: keyof Salesman, val: number) => {
    const next = { ...formData, [key]: val };
    const sumMonthly = (
      Number(next.target_m1 || 0) +
      Number(next.target_m2 || 0) +
      Number(next.target_m3 || 0) +
      Number(next.target_m4 || 0) +
      Number(next.target_m5 || 0) +
      Number(next.target_m6 || 0) +
      Number(next.target_m7 || 0) +
      Number(next.target_m8 || 0) +
      Number(next.target_m9 || 0) +
      Number(next.target_m10 || 0) +
      Number(next.target_m11 || 0) +
      Number(next.target_m12 || 0)
    );
    next.yearly_target = sumMonthly;
    setFormData(next);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return showError("Validation Error", "Nama Salesman wajib diisi.");

    const payload = { ...formData };
    delete (payload as any).id;
    delete (payload as any).created_at;
    delete (payload as any).updated_at;

    try {
      if (selectedItem?.id) {
        await api.express.put(`/salesman/${selectedItem.id}`, payload);
        showSuccess("Success", "Data Salesman berhasil diperbarui.");
      } else {
        await api.express.post("/salesman", payload);
        showSuccess("Success", "Salesman baru berhasil ditambahkan.");
      }
      setIsModalOpen(false);
      fetchData(page);
    } catch (err: any) {
      showError("Error", err.response?.data?.message || err.message || "Gagal menyimpan data Salesman.");
    }
  };

  const handleDelete = (id: number) => {
    showConfirm("Confirm Delete", "Apakah Anda yakin ingin menghapus data Salesman ini?", async () => {
      try {
        await api.express.delete(`/salesman/${id}`);
        showSuccess("Success", "Data Salesman berhasil dihapus.");
        fetchData(page);
      } catch (err: any) {
        showError("Error", err.response?.data?.message || err.message || "Gagal menghapus data.");
      }
    });
  };

  const totalYearlyTarget = data.reduce((s, i) => s + Number(i.yearly_target || i.monthly_target * 12 || 0), 0);
  const avgCommission = data.length ? (data.reduce((s, i) => s + Number(i.commission_rate || 0), 0) / data.length).toFixed(1) : "0";

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-500">
      <StatusModal isOpen={isOpen} type={type} title={title} message={message} onConfirm={onConfirm} onClose={closeModal} isLoading={isActionLoading} />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
              <Users className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Master <span className="text-indigo-600">Salesman</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">Kelola profil salesman, teritori, breakdown target penjualan (Bulan 1 - 12) & target tahunan.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-3 bg-gray-900 hover:bg-indigo-600 hover:shadow-indigo-200 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl active:scale-95"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Tambah Salesman Baru</span>
        </button>
      </div>

      {/* Stat Cards Header */}
      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 mb-6 hide-scrollbar">
        <StatCard icon={<Users size={20} />} iconBgColor="bg-indigo-50" iconColor="text-indigo-600" label="TOTAL SALESMAN" value={data.length} />
        <StatCard icon={<Users size={20} />} iconBgColor="bg-emerald-50" iconColor="text-emerald-600" label="SALESMAN AKTIF" value={data.filter(s => s.is_active).length} />
        <StatCard icon={<Target size={20} />} iconBgColor="bg-violet-50" iconColor="text-violet-600" label="TOTAL TARGET TAHUNAN TIM" value={`Rp ${totalYearlyTarget.toLocaleString()}`} />
        <StatCard icon={<Percent size={20} />} iconBgColor="bg-amber-50" iconColor="text-amber-600" label="RATA-RATA KOMISI" value={`${avgCommission}%`} />
      </div>

      {/* Search & Filter */}
      <div className="mb-8">
        <FilterBar searchPlaceholder="Cari berdasarkan nama, kode, tim sales, area, NIK..." searchValue={search} onSearchChange={setSearch} />
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">No</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama / Kode & NIK</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Tim & Supervisor</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Area & Kontak</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Tahunan</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Komisi (%)</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Memuat data Salesman...</td></tr>
              ) : data.length > 0 ? (
                data.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-400 font-mono">{(page - 1) * 10 + idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="font-extrabold text-gray-900">{item.name}</div>
                      <div className="flex gap-2 items-center mt-0.5">
                        {item.code && <span className="text-[10px] font-mono bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">{item.code}</span>}
                        {item.nik_employee && <span className="text-[10px] text-gray-400">NIK: {item.nik_employee}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-semibold text-gray-800">{item.sales_team || "Direct Sales"}</div>
                      <div className="text-xs text-gray-400">{item.supervisor_name ? `Spv: ${item.supervisor_name}` : "-"}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="font-medium text-gray-800">{item.area || "-"}</div>
                      <div className="text-xs text-gray-400">{item.phone || item.email || "-"}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-gray-900">
                      Rp {Number(item.yearly_target || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-indigo-600">
                      {Number(item.commission_rate || 0)}%
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
                        <button onClick={() => handleOpenDetail(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye size={16} /></button>
                        <button onClick={() => handleOpenEdit(item)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(item.id!)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <p className="text-gray-400 font-semibold">Belum ada data Salesman.</p>
                    <p className="text-xs text-gray-300">Klik "Tambah Salesman Baru" untuk menambahkan data.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} totalItems={(page - 1) * 10 + data.length} onPageChange={fetchData} />
      </div>

      {/* FORM MODAL (CREATE / EDIT) WITH TABS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-gray-800">{selectedItem ? "Edit Profil Salesman" : "Tambah Salesman Baru"}</h3>
                <p className="text-xs text-gray-400 mt-0.5">Kelola profil lengkap Salesman & Breakdown Target Penjualan 12 Bulan</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Modal Tab Navigation */}
            <div className="flex border-b border-gray-100 bg-gray-50/50 px-8">
              {[
                { id: "general", label: "Profil Utama", icon: <Users size={14} /> },
                { id: "territory", label: "Tim & Teritori", icon: <MapPin size={14} /> },
                { id: "target", label: "Target Penjualan (Bulan 1 - 12)", icon: <Target size={14} /> },
                { id: "admin", label: "Administrasi", icon: <ShieldCheck size={14} /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
                    activeTab === tab.id
                      ? "border-indigo-600 text-indigo-600 bg-white"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-6">
              {/* TAB 1: GENERAL PROFILE */}
              {activeTab === "general" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Nama Lengkap Salesman *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Budi Santoso"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-sm font-semibold transition-all"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Kode Salesman</label>
                    <input
                      type="text"
                      placeholder="e.g. SLS-001"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-sm font-semibold transition-all"
                      value={formData.code || ""}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">NIK Karyawan</label>
                    <input
                      type="text"
                      placeholder="e.g. EMP-2024-089"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-sm font-semibold transition-all"
                      value={formData.nik_employee || ""}
                      onChange={(e) => setFormData({ ...formData, nik_employee: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Nomor Telepon / HP</label>
                    <input
                      type="text"
                      placeholder="e.g. 081234567890"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-sm font-semibold transition-all"
                      value={formData.phone || ""}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Email Salesman</label>
                    <input
                      type="email"
                      placeholder="e.g. budi@company.com"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-sm font-semibold transition-all"
                      value={formData.email || ""}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Alamat Lengkap</label>
                    <textarea
                      rows={2}
                      placeholder="Alamat domisili atau alamat kantor salesman..."
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-sm font-medium transition-all"
                      value={formData.address || ""}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: SALES TEAM & TERRITORY */}
              {activeTab === "territory" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Tim Penjualan (Sales Team)</label>
                    <select
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-sm font-semibold transition-all"
                      value={formData.sales_team || "Direct Sales"}
                      onChange={(e) => setFormData({ ...formData, sales_team: e.target.value })}
                    >
                      {salesTeamOptions.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Supervisor / Sales Manager</label>
                    <input
                      type="text"
                      placeholder="e.g. Hendra Wijaya"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-sm font-semibold transition-all"
                      value={formData.supervisor_name || ""}
                      onChange={(e) => setFormData({ ...formData, supervisor_name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Area Coverage / Teritori</label>
                    <input
                      type="text"
                      placeholder="e.g. Jabodetabek / Jawa Barat"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-sm font-semibold transition-all"
                      value={formData.area || ""}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Cabang / Office</label>
                    <input
                      type="text"
                      placeholder="e.g. Head Office Jakarta / Cabang Surabaya"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-sm font-semibold transition-all"
                      value={formData.branch || ""}
                      onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: TARGET PENJUALAN (BULAN 1 - 12 & YEARLY TARGET) */}
              {activeTab === "target" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-indigo-600 uppercase tracking-widest block">Akumulasi Target Tahunan (Yearly Target)</span>
                      <p className="text-xs text-gray-500">Otomatis terhitung dari penjumlahan Bulan 1 sampai Bulan 12</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-indigo-600">Rp {formData.yearly_target.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {monthLabels.map((m) => {
                      const val = (formData as any)[m.key];
                      return (
                        <div key={m.key} className="space-y-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">{m.label}</label>
                          <input
                            type="number"
                            min={0}
                            placeholder="0"
                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-sm font-black text-indigo-700 transition-all text-right"
                            value={val === 0 ? "" : val}
                            onChange={(e) => updateMonthlyTarget(m.key as keyof Salesman, parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-gray-100">
                    <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Rate Komisi Standar (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      max={100}
                      placeholder="0.00"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-sm font-bold text-amber-600 transition-all"
                      value={formData.commission_rate === 0 ? "" : formData.commission_rate}
                      onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: ADMIN & NOTES */}
              {activeTab === "admin" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Tanggal Bergabung</label>
                    <input
                      type="date"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-sm font-semibold transition-all"
                      value={formData.join_date || ""}
                      onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Status Salesman</label>
                    <select
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-sm font-semibold transition-all"
                      value={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: Number(e.target.value) })}
                    >
                      <option value={1}>Aktif (Bisa Di-assign ke transaksi)</option>
                      <option value={0}>Non-Aktif (Dinonaktifkan)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Catatan / Memo Admin</label>
                    <textarea
                      rows={3}
                      placeholder="Catatan tambahan mengenai salesman ini..."
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-sm font-medium transition-all"
                      value={formData.notes || ""}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="flex justify-between items-center pt-6 border-t border-gray-100">
                <div className="flex gap-2 text-xs font-semibold text-gray-400">
                  <span>Halaman {activeTab === "general" ? "1" : activeTab === "territory" ? "2" : activeTab === "target" ? "3" : "4"} dari 4</span>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all active:scale-95"
                  >
                    Simpan Salesman
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL VIEW MODAL */}
      {isDetailOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-black tracking-widest text-indigo-600 uppercase">Profil Salesman ERP</span>
                <h3 className="text-2xl font-black text-gray-800 mt-0.5">{selectedItem.name}</h3>
                {selectedItem.code && <p className="text-xs text-gray-400 font-mono mt-0.5">Kode: {selectedItem.code}</p>}
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {/* Commercial Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-indigo-50/30 p-6 rounded-2xl border border-indigo-50">
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Total Target Tahunan</span>
                  <span className="font-black text-indigo-600 text-xl">Rp {Number(selectedItem.yearly_target || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Komisi Standar</span>
                  <span className="font-black text-amber-600 text-xl">{Number(selectedItem.commission_rate || 0)}%</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Status</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block mt-1 ${
                    selectedItem.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                  }`}>
                    {selectedItem.is_active ? 'Aktif' : 'Non-Aktif'}
                  </span>
                </div>
              </div>

              {/* Monthly Target Breakdown (Bulan 1 - 12) */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest">Rincian Target Penjualan Bulanan (Bulan 1 s.d. 12)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {monthLabels.map((m) => {
                    const val = Number((selectedItem as any)[m.key] || 0);
                    return (
                      <div key={m.key} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <span className="text-[9px] font-black text-gray-400 block uppercase">{m.label}</span>
                        <span className="text-sm font-bold text-gray-800">Rp {val.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Organization & Territory Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">NIK Karyawan</span>
                  <span className="font-bold text-gray-800 text-sm">{selectedItem.nik_employee || "-"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Tim Sales</span>
                  <span className="font-bold text-gray-800 text-sm">{selectedItem.sales_team || "Direct Sales"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Supervisor</span>
                  <span className="font-bold text-gray-800 text-sm">{selectedItem.supervisor_name || "-"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Cabang / Office</span>
                  <span className="font-bold text-gray-800 text-sm">{selectedItem.branch || "-"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Area Coverage</span>
                  <span className="font-bold text-gray-800 text-sm">{selectedItem.area || "-"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Tanggal Bergabung</span>
                  <span className="font-bold text-gray-800 text-sm">{selectedItem.join_date ? selectedItem.join_date.split("T")[0] : "-"}</span>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Informasi Kontak</h4>
                <div className="bg-white p-4 rounded-xl border border-gray-100 space-y-1">
                  <p className="text-sm text-gray-700"><strong>Telepon:</strong> {selectedItem.phone || "-"}</p>
                  <p className="text-sm text-gray-700"><strong>Email:</strong> {selectedItem.email || "-"}</p>
                  <p className="text-sm text-gray-700"><strong>Alamat:</strong> {selectedItem.address || "-"}</p>
                </div>
              </div>

              {selectedItem.notes && (
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider mb-1">Catatan Admin</span>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-xl text-sm border border-gray-100">{selectedItem.notes}</p>
                </div>
              )}
            </div>

            <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button onClick={() => setIsDetailOpen(false)} className="px-6 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-sm font-bold shadow-md transition-all active:scale-95">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
