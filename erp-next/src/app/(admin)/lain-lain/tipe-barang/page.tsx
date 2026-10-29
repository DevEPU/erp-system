"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Plus,
  Search,
  ArrowLeft,
  Trash2,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  Check
} from "lucide-react";
import api from "@/lib/api";

interface ProductType {
  id?: number;
  name: string;
  description: string;
  is_active: boolean | number;
}

export default function TipeBarangPage() {
  const router = useRouter();

  // Mode: 'list' or 'form'
  const [view, setView] = useState<"list" | "form">("list");
  const [editId, setEditId] = useState<number | null>(null);

  // Listing Data States
  const [types, setTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Form State
  const [form, setForm] = useState<ProductType>({
    name: "",
    description: "",
    is_active: true
  });

  // ─── Initial Side Effects ──────────────────────────────────────────────────
  useEffect(() => {
    fetchTypes();
  }, []);

  // ─── Fetch API ─────────────────────────────────────────────────────────────
  const fetchTypes = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/product-types");
      setTypes(res.data.data || []);
    } catch (err) {
      console.error("Error fetching product types:", err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Save / Update Handler ─────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name) {
      alert("Mohon lengkapi Nama Tipe!");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      is_active: form.is_active ? 1 : 0
    };

    try {
      if (editId) {
        await api.express.put(`/product-types/${editId}`, payload);
        alert("Tipe Barang berhasil diperbarui!");
      } else {
        await api.express.post("/product-types", payload);
        alert("Tipe Barang baru berhasil ditambahkan!");
      }
      setView("list");
      setEditId(null);
      fetchTypes();
    } catch (err: any) {
      console.error("Save Error:", err);
      alert(err.message || "Gagal menyimpan Tipe Barang");
    }
  };

  // ─── Edit Load Handler ─────────────────────────────────────────────────────
  const handleEdit = (typeItem: ProductType) => {
    setEditId(typeItem.id || null);
    setForm({
      name: typeItem.name,
      description: typeItem.description || "",
      is_active: Number(typeItem.is_active) === 1
    });
    setView("form");
  };

  // ─── Delete Handler ────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus Tipe Barang ini?")) {
      return;
    }

    try {
      await api.express.delete(`/product-types/${id}`);
      alert("Tipe Barang berhasil dihapus!");
      fetchTypes();
    } catch (err: any) {
      console.error("Delete Error:", err);
      alert(err.message || "Gagal menghapus Tipe Barang");
    }
  };

  // ─── Search & Pagination Math ──────────────────────────────────────────────
  const filteredTypes = types.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalRecords = filteredTypes.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTypes = filteredTypes.slice(startIndex, startIndex + itemsPerPage);

  const getStatusBadge = (isActive: boolean | number) => {
    const active = Number(isActive) === 1;
    return active ? (
      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 w-max">
        <CheckCircle2 size={10} /> Aktif
      </span>
    ) : (
      <span className="px-3 py-1 bg-rose-50 text-rose-500 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 w-max">
        <XCircle size={10} /> Non-Aktif
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
      
      {/* Header breadcrumb row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl shadow-lg shadow-emerald-200">
              <Boxes className="text-white" size={26} />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900">
              Tipe <span className="text-emerald-600">Barang</span>
            </h1>
          </div>
          <p className="text-gray-500 text-sm font-semibold ml-1">
            Lain-lain &raquo; Kelola tipe dan pengelompokan Tipe Barang (Raw Material, Finished Good, dll).
          </p>
        </div>

        {view === "list" ? (
          <button
            onClick={() => {
              setEditId(null);
              setForm({
                name: "",
                description: "",
                is_active: true
              });
              setView("form");
            }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-100 hover:shadow-emerald-200 active:scale-95 overflow-hidden"
          >
            <Plus size={16} strokeWidth={3} />
            <span>Tambah Tipe</span>
          </button>
        ) : (
          <button
            onClick={() => setView("list")}
            className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
          >
            <ArrowLeft size={14} /> Kembali ke Daftar
          </button>
        )}
      </div>

      {/* ─── A. LIST VIEW SCREEN ───────────────────────────────────────────── */}
      {view === "list" && (
        <div className="space-y-6">
          {/* Filter search bar */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Cari Nama Tipe atau Keterangan..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:bg-white outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1.5 rounded-xl">
                Master Data
              </span>
            </div>
          </div>

          {/* Types CRUD Table */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden min-h-[300px] flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-24">ID</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-56">Nama Tipe</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Keterangan</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-32">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-24">Ubah</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-24">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={6} className="px-6 py-5"><div className="h-10 bg-gray-50 rounded-xl w-full"></div></td>
                      </tr>
                    ))
                  ) : paginatedTypes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center font-bold text-gray-400 uppercase tracking-widest text-sm bg-gray-50/30">
                        Tidak Ada Daftar Tipe Barang
                      </td>
                    </tr>
                  ) : paginatedTypes.map((typeItem) => (
                    <tr key={typeItem.id} className="hover:bg-gray-50/60 transition-colors group">
                      <td className="px-6 py-4.5 font-bold text-gray-400 text-xs">
                        #{typeItem.id}
                      </td>
                      <td className="px-6 py-4.5">
                        <span 
                          onClick={() => handleEdit(typeItem)}
                          className="font-black text-emerald-600 hover:text-emerald-800 transition-colors cursor-pointer text-sm"
                        >
                          {typeItem.name}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-xs text-gray-400 font-semibold max-w-sm truncate" title={typeItem.description}>
                        {typeItem.description || "-"}
                      </td>
                      <td className="px-6 py-4.5 text-center">
                        <div className="flex justify-center">
                          {getStatusBadge(typeItem.is_active)}
                        </div>
                      </td>
                      <td className="px-6 py-4.5 text-center">
                        <button
                          onClick={() => handleEdit(typeItem)}
                          className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-500 hover:text-white transition-all inline-flex items-center justify-center border border-blue-100 shadow-sm shadow-blue-50"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-6 py-4.5 text-center">
                        <button
                          onClick={() => typeItem.id && handleDelete(typeItem.id)}
                          className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-500 hover:text-white transition-all inline-flex items-center justify-center border border-rose-100 shadow-sm shadow-rose-50"
                        >
                          <Trash2 size={14} strokeWidth={2.5} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination block */}
            <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Total Record: {totalRecords}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-bold text-gray-600 uppercase transition-all disabled:opacity-40"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-bold text-gray-600 uppercase transition-all disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-black">
                  {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => (prev * itemsPerPage < totalRecords ? prev + 1 : prev))}
                  disabled={currentPage * itemsPerPage >= totalRecords}
                  className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-bold text-gray-600 uppercase transition-all disabled:opacity-40"
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(Math.ceil(totalRecords / itemsPerPage))}
                  disabled={currentPage * itemsPerPage >= totalRecords}
                  className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-bold text-gray-600 uppercase transition-all disabled:opacity-40"
                >
                  Last
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── B. FORM VIEW SCREEN ───────────────────────────────────────────── */}
      {view === "form" && (
        <form onSubmit={handleSave} className="bg-white rounded-3xl border border-gray-100 shadow-xl p-6 space-y-6 max-w-xl mx-auto animate-in slide-in-from-bottom duration-300">
          <div className="border-b border-gray-100 pb-4 flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-emerald-600 animate-spin-slow" />
            <h3 className="font-black text-gray-800 uppercase tracking-widest text-xs">
              {editId ? "Ubah Tipe Barang" : "Tambah Tipe Barang Baru"}
            </h3>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Tipe</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Contoh: Raw Material, Finished Good, Jasa"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Keterangan</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Tulis deskripsi atau catatan singkat..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold outline-none h-24 resize-none"
              />
            </div>

            <div className="flex items-center gap-6 border-t border-gray-50 pt-4">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status:</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-gray-700">
                  <input
                    type="radio"
                    name="is_active"
                    checked={!!form.is_active}
                    onChange={() => setForm(prev => ({ ...prev, is_active: true }))}
                    className="w-4 h-4 accent-emerald-600 cursor-pointer"
                  />
                  <span>Aktif</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-gray-700">
                  <input
                    type="radio"
                    name="is_active"
                    checked={!form.is_active}
                    onChange={() => setForm(prev => ({ ...prev, is_active: false }))}
                    className="w-4 h-4 accent-emerald-600 cursor-pointer"
                  />
                  <span>Non-Aktif</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setView("list")}
              className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-100 hover:shadow-emerald-200 flex items-center justify-center gap-2"
            >
              <Check size={14} strokeWidth={3} />
              <span>Simpan Data Tipe</span>
            </button>
          </div>
        </form>
      )}

    </div>
  );
}
