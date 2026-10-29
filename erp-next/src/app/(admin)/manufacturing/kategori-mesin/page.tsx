"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Tags,
  Plus,
  Search,
  Cog,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  Cpu,
  Check
} from "lucide-react";
import api from "@/lib/api";

interface MachineCategory {
  id: number;
  code: string;
  name: string;
  description: string;
  icon_name?: string;
  is_active: boolean | number;
  machine_count?: number;
}

export default function KategoriMesinPage() {
  const router = useRouter();

  // State Management
  const [categories, setCategories] = useState<MachineCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState<MachineCategory | null>(null);
  const [editId, setEditId] = useState<number | null>(null);

  // Form State
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    is_active: true
  });

  // Mock Categories Fallback
  const mockCategories: MachineCategory[] = [
    {
      id: 1,
      code: "CAT-INJ",
      name: "Injection",
      description: "Mesin pencetak plastik presisi tinggi (Injection Molding)",
      is_active: 1,
      machine_count: 8
    },
    {
      id: 2,
      code: "CAT-CNC",
      name: "CNC",
      description: "Mesin pemotong dan milling presisi tinggi (CNC Machine)",
      is_active: 1,
      machine_count: 4
    },
    {
      id: 3,
      code: "CAT-ASM",
      name: "Assembly",
      description: "Line perakitan komponen dan finishing akhir (Assembly Line)",
      is_active: 1,
      machine_count: 3
    }
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/manufacturing/machine-categories").catch(() => null);
      if (res && res.data && res.data.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setCategories(res.data.data);
        localStorage.setItem("erp_epu_machine_categories", JSON.stringify(res.data.data));
      } else {
        const stored = localStorage.getItem("erp_epu_machine_categories");
        if (stored) {
          setCategories(JSON.parse(stored));
        } else {
          setCategories(mockCategories);
          localStorage.setItem("erp_epu_machine_categories", JSON.stringify(mockCategories));
        }
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
      const stored = localStorage.getItem("erp_epu_machine_categories");
      if (stored) setCategories(JSON.parse(stored));
      else setCategories(mockCategories);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditId(null);
    setForm({
      code: "",
      name: "",
      description: "",
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: MachineCategory) => {
    setEditId(cat.id);
    setForm({
      code: cat.code,
      name: cat.name,
      description: cat.description || "",
      is_active: Number(cat.is_active) === 1
    });
    setIsModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert("Nama Kategori wajib diisi!");
      return;
    }

    const payload = {
      code: form.code ? form.code.toUpperCase().trim() : `CAT-${form.name.toUpperCase().replace(/\s+/g, '-').slice(0, 8)}`,
      name: form.name.trim(),
      description: form.description.trim(),
      is_active: form.is_active ? 1 : 0
    };

    try {
      const res = await (editId
        ? api.express.put(`/manufacturing/machine-categories/${editId}`, payload)
        : api.express.post("/manufacturing/machine-categories", payload)
      ).catch(() => null);

      if (res && res.data && res.data.success) {
        alert(editId ? "Kategori Mesin berhasil diperbarui!" : "Kategori Mesin baru berhasil ditambahkan!");
      } else {
        // Local state simulation fallback
        const updatedList = [...categories];
        if (editId) {
          const idx = updatedList.findIndex(c => c.id === editId);
          if (idx !== -1) updatedList[idx] = { id: editId, ...payload, machine_count: updatedList[idx].machine_count || 0 };
        } else {
          const newId = updatedList.length > 0 ? Math.max(...updatedList.map(c => c.id)) + 1 : 1;
          updatedList.push({ id: newId, ...payload, machine_count: 0 });
        }
        setCategories(updatedList);
        localStorage.setItem("erp_epu_machine_categories", JSON.stringify(updatedList));
      }

      setIsModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      console.error("Save Category Error:", err);
      alert(err.message || "Gagal menyimpan kategori mesin.");
    }
  };

  const handleDeleteCategory = async (id: number, catName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus kategori "${catName}"?`)) return;

    try {
      const res = await api.express.delete(`/manufacturing/machine-categories/${id}`).catch(() => null);
      if (res && res.data && res.data.success) {
        alert("Kategori mesin berhasil dihapus!");
      } else {
        const updated = categories.filter(c => c.id !== id);
        setCategories(updated);
        localStorage.setItem("erp_epu_machine_categories", JSON.stringify(updated));
      }
      fetchCategories();
    } catch (err: any) {
      console.error("Delete Error:", err);
      alert(err.message || "Gagal menghapus kategori.");
    }
  };

  // Search filter
  const filteredCategories = categories.filter(cat => {
    const q = search.toLowerCase();
    return (
      cat.code.toLowerCase().includes(q) ||
      cat.name.toLowerCase().includes(q) ||
      (cat.description && cat.description.toLowerCase().includes(q))
    );
  });

  const totalCategories = categories.length;
  const totalMachines = categories.reduce((sum, cat) => sum + (cat.machine_count || 0), 0);
  const activeCategoriesCount = categories.filter(c => Number(c.is_active) === 1).length;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
      
      {/* ─── Header Section ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl shadow-lg shadow-emerald-200">
              <Tags className="text-white" size={26} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900">
                Kategori <span className="text-emerald-600">Mesin Produksi</span>
              </h1>
              <p className="text-gray-500 text-sm font-semibold mt-0.5">
                Manufacturing &raquo; Kelola pengelompokan jenis & kategori workstation mesin ERP.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/manufacturing/daftar-mesin")}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-5 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider border border-gray-200 transition-all shadow-sm"
          >
            <Cog size={16} />
            <span>Lihat Daftar Mesin</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-100 active:scale-95"
          >
            <Plus size={16} strokeWidth={3} />
            <span>Tambah Kategori</span>
          </button>
        </div>
      </div>

      {/* ─── Stats Summary Widgets ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Kategori</span>
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600"><Tags size={20} /></div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-gray-950">{totalCategories}</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Kategori workstation terdaftar
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Mesin Terhubung</span>
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><Cpu size={20} /></div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-gray-950">{totalMachines} Unit</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Unit mesin terkelompokkan dalam kategori
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kategori Aktif</span>
            <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600"><CheckCircle2 size={20} /></div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-gray-950">{activeCategoriesCount}</h3>
            <p className="text-xs text-emerald-600 font-bold mt-1">
              Siap digunakan dalam penugasan MPP
            </p>
          </div>
        </div>
      </div>

      {/* ─── Search & Filter Bar ─── */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Cari kode kategori, nama, deskripsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:bg-white outline-none transition-all"
          />
        </div>

        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Menampilkan {filteredCategories.length} Kategori
        </div>
      </div>

      {/* ─── Master Table ─── */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">
              <th className="px-6 py-4">Kode Kategori</th>
              <th className="px-6 py-4">Nama Kategori</th>
              <th className="px-6 py-4">Deskripsi / Spesifikasi</th>
              <th className="px-6 py-4 text-center">Mesin Terhubung</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-center w-36">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-700">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="px-6 py-5"><div className="h-8 bg-gray-50 rounded-xl w-full"></div></td>
                </tr>
              ))
            ) : filteredCategories.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center font-bold text-gray-400 uppercase tracking-widest text-xs bg-gray-50/40">
                  Tidak ada kategori mesin ditemukan
                </td>
              </tr>
            ) : (
              filteredCategories.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50/60 transition-colors group">
                  <td className="px-6 py-4 font-black text-emerald-600">
                    {cat.code}
                  </td>
                  <td className="px-6 py-4 font-black text-gray-900">
                    {cat.name}
                  </td>
                  <td className="px-6 py-4 text-gray-500 max-w-sm font-medium truncate" title={cat.description}>
                    {cat.description || "-"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => router.push(`/manufacturing/daftar-mesin?type=${encodeURIComponent(cat.name)}`)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl text-[11px] font-black transition-all inline-flex items-center gap-1.5 border border-blue-100"
                    >
                      <Cpu size={13} /> {cat.machine_count || 0} Unit Mesin
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {Number(cat.is_active) === 1 ? (
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                        Aktif
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-[10px] font-black uppercase tracking-wider">
                        Non-Aktif
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center items-center gap-1.5">
                      <button
                        onClick={() => { setSelectedCat(cat); setIsViewModalOpen(true); }}
                        className="p-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded-xl transition-all"
                        title="Detail Kategori"
                      >
                        <Eye size={14} />
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(cat)}
                        className="p-2 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl transition-all"
                        title="Edit Kategori"
                      >
                        <Edit size={14} />
                      </button>

                      <button
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="p-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl transition-all"
                        title="Hapus Kategori"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ─── ADD / EDIT POP-UP MODAL ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg border border-gray-100 shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Tags size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">{editId ? "Ubah Kategori Mesin" : "Tambah Kategori Mesin"}</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">Atur nama dan deskripsi kategori workstation ERP</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                [X]
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kode Kategori</label>
                <input
                  type="text"
                  placeholder="Contoh: CAT-INJ"
                  value={form.code}
                  onChange={(e) => setForm(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Kategori *</label>
                <input
                  type="text"
                  placeholder="Contoh: Injection Molding / CNC / Assembly"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Deskripsi / Spesifikasi</label>
                <textarea
                  placeholder="Tuliskan spesifikasi umum atau lingkup mesin untuk kategori ini..."
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold outline-none h-24 resize-none"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status:</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-gray-700">
                    <input
                      type="radio"
                      name="is_active"
                      checked={form.is_active}
                      onChange={() => setForm(prev => ({ ...prev, is_active: true }))}
                      className="w-4 h-4 accent-emerald-600"
                    />
                    <span>Aktif</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-gray-700">
                    <input
                      type="radio"
                      name="is_active"
                      checked={!form.is_active}
                      onChange={() => setForm(prev => ({ ...prev, is_active: false }))}
                      className="w-4 h-4 accent-emerald-600"
                    />
                    <span>Non-Aktif</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl text-xs font-bold transition-all h-12"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all h-12 shadow-lg shadow-emerald-100 flex items-center gap-2"
                >
                  <Check size={14} strokeWidth={3} />
                  <span>Simpan Kategori</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── VIEW POP-UP MODAL ─── */}
      {isViewModalOpen && selectedCat && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md border border-gray-100 shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Tags size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">{selectedCat.name}</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">Kode: {selectedCat.code}</p>
                </div>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                [X]
              </button>
            </div>

            <div className="space-y-4 text-xs font-bold text-gray-600">
              <div className="bg-gray-50 p-4 rounded-2xl space-y-1">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Deskripsi / Ruang Lingkup</span>
                <p className="text-gray-800 font-semibold leading-relaxed">{selectedCat.description || "Belum ada deskripsi khusus."}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl space-y-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Mesin Terdaftar</span>
                  <p className="text-base font-black text-emerald-600">{selectedCat.machine_count || 0} Unit Mesin</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl space-y-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Status Master</span>
                  <p className="text-sm font-black text-gray-900">{Number(selectedCat.is_active) === 1 ? "Aktif" : "Non-Aktif"}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold uppercase transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
