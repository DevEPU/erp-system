"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
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

interface Shift {
  id?: number;
  name: string;
  start_time: string;
  end_time: string;
  description: string;
  is_active: boolean | number;
}

export default function DaftarShiftPage() {
  const router = useRouter();

  // Mode: 'list' or 'form'
  const [view, setView] = useState<"list" | "form">("list");
  const [editId, setEditId] = useState<number | null>(null);

  // Listing Data States
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Form State
  const [form, setForm] = useState<Shift>({
    name: "",
    start_time: "",
    end_time: "",
    description: "",
    is_active: true
  });

  // ─── Initial Side Effects ──────────────────────────────────────────────────
  useEffect(() => {
    fetchShifts();
  }, []);

  // ─── Fetch API ─────────────────────────────────────────────────────────────
  const fetchShifts = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/shifts");
      setShifts(res.data.data || []);
    } catch (err) {
      console.error("Error fetching shifts:", err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Save / Update Handler ─────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.start_time || !form.end_time) {
      alert("Mohon lengkapi nama shift, jam mulai, dan jam selesai!");
      return;
    }

    const payload = {
      name: form.name.trim(),
      start_time: form.start_time.includes(":") && form.start_time.split(":").length === 2 ? `${form.start_time}:00` : form.start_time,
      end_time: form.end_time.includes(":") && form.end_time.split(":").length === 2 ? `${form.end_time}:00` : form.end_time,
      description: form.description.trim(),
      is_active: form.is_active ? 1 : 0
    };

    try {
      if (editId) {
        await api.express.put(`/shifts/${editId}`, payload);
        alert("Daftar Shift berhasil diperbarui!");
      } else {
        await api.express.post("/shifts", payload);
        alert("Shift baru berhasil ditambahkan!");
      }
      setView("list");
      setEditId(null);
      fetchShifts();
    } catch (err: any) {
      console.error("Save Error:", err);
      alert(err.message || "Gagal menyimpan data Shift");
    }
  };

  // ─── Edit Load Handler ─────────────────────────────────────────────────────
  const handleEdit = (shiftItem: Shift) => {
    setEditId(shiftItem.id || null);
    
    // Format TIME string "hh:mm:ss" from DB to "hh:mm" for HTML input
    const formatTimeForInput = (timeStr: string) => {
      if (!timeStr) return "";
      return timeStr.slice(0, 5);
    };

    setForm({
      name: shiftItem.name,
      start_time: formatTimeForInput(shiftItem.start_time),
      end_time: formatTimeForInput(shiftItem.end_time),
      description: shiftItem.description || "",
      is_active: Number(shiftItem.is_active) === 1
    });
    setView("form");
  };

  // ─── Delete Handler ────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus Shift ini?")) {
      return;
    }

    try {
      await api.express.delete(`/shifts/${id}`);
      alert("Shift berhasil dihapus!");
      fetchShifts();
    } catch (err: any) {
      console.error("Delete Error:", err);
      alert(err.message || "Gagal menghapus Shift");
    }
  };

  // ─── Search & Pagination Math ──────────────────────────────────────────────
  const filteredShifts = shifts.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalRecords = filteredShifts.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedShifts = filteredShifts.slice(startIndex, startIndex + itemsPerPage);

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

  // Format time for display (remove seconds if present)
  const formatTimeDisplay = (timeStr: string) => {
    if (!timeStr) return "-";
    return timeStr.slice(0, 5);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
      
      {/* Header breadcrumb row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg shadow-orange-200">
              <Clock className="text-white" size={26} />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900">
              Daftar <span className="text-orange-600">Shift</span>
            </h1>
          </div>
          <p className="text-gray-500 text-sm font-semibold ml-1">
            Lain-lain &raquo; Kelola jadwal shift kerja operasional karyawan.
          </p>
        </div>

        {view === "list" ? (
          <button
            onClick={() => {
              setEditId(null);
              setForm({
                name: "",
                start_time: "",
                end_time: "",
                description: "",
                is_active: true
              });
              setView("form");
            }}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-orange-100 hover:shadow-orange-200 active:scale-95 overflow-hidden"
          >
            <Plus size={16} strokeWidth={3} />
            <span>Tambah Shift</span>
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
                placeholder="Cari Nama Shift atau Keterangan..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1.5 rounded-xl">
                Master Data
              </span>
            </div>
          </div>

          {/* Shifts CRUD Table */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden min-h-[300px] flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-24">ID</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-56">Nama Shift</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-48">Jam Kerja</th>
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
                        <td colSpan={7} className="px-6 py-5"><div className="h-10 bg-gray-50 rounded-xl w-full"></div></td>
                      </tr>
                    ))
                  ) : paginatedShifts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center font-bold text-gray-400 uppercase tracking-widest text-sm bg-gray-50/30">
                        Tidak Ada Daftar Shift
                      </td>
                    </tr>
                  ) : paginatedShifts.map((shiftItem) => (
                    <tr key={shiftItem.id} className="hover:bg-gray-50/60 transition-colors group">
                      <td className="px-6 py-4.5 font-bold text-gray-400 text-xs">
                        #{shiftItem.id}
                      </td>
                      <td className="px-6 py-4.5">
                        <span 
                          onClick={() => handleEdit(shiftItem)}
                          className="font-black text-orange-600 hover:text-orange-800 transition-colors cursor-pointer text-sm"
                        >
                          {shiftItem.name}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-xs text-gray-700 font-bold">
                        <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-gray-600">
                          {formatTimeDisplay(shiftItem.start_time)} - {formatTimeDisplay(shiftItem.end_time)}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-xs text-gray-400 font-semibold max-w-sm truncate" title={shiftItem.description}>
                        {shiftItem.description || "-"}
                      </td>
                      <td className="px-6 py-4.5 text-center">
                        <div className="flex justify-center">
                          {getStatusBadge(shiftItem.is_active)}
                        </div>
                      </td>
                      <td className="px-6 py-4.5 text-center">
                        <button
                          onClick={() => handleEdit(shiftItem)}
                          className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-500 hover:text-white transition-all inline-flex items-center justify-center border border-blue-100 shadow-sm shadow-blue-50"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-6 py-4.5 text-center">
                        <button
                          onClick={() => shiftItem.id && handleDelete(shiftItem.id)}
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
                <span className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center text-xs font-black">
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
            <SlidersHorizontal size={16} className="text-orange-600" />
            <h3 className="font-black text-gray-800 uppercase tracking-widest text-xs">
              {editId ? "Ubah Data Shift" : "Tambah Shift Baru"}
            </h3>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Shift</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Contoh: Shift 1 Pagi, Shift Non-Staff"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jam Mulai</label>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm(prev => ({ ...prev, start_time: e.target.value }))}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jam Selesai</label>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm(prev => ({ ...prev, end_time: e.target.value }))}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none"
                />
              </div>
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

            <div className="flex items-center gap-6 border-t border-gray-55 pt-4">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status:</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-gray-700">
                  <input
                    type="radio"
                    name="is_active"
                    checked={!!form.is_active}
                    onChange={() => setForm(prev => ({ ...prev, is_active: true }))}
                    className="w-4 h-4 accent-orange-600 cursor-pointer"
                  />
                  <span>Aktif</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-gray-700">
                  <input
                    type="radio"
                    name="is_active"
                    checked={!form.is_active}
                    onChange={() => setForm(prev => ({ ...prev, is_active: false }))}
                    className="w-4 h-4 accent-orange-600 cursor-pointer"
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
              className="flex-[2] py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-100 hover:shadow-orange-200 flex items-center justify-center gap-2"
            >
              <Check size={14} strokeWidth={3} />
              <span>Simpan Data Shift</span>
            </button>
          </div>
        </form>
      )}

    </div>
  );
}
