"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Contact,
  Plus,
  Search,
  Users,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Building,
  UserCheck,
  Briefcase,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit
} from "lucide-react";
import api from "@/lib/api";

export interface Employee {
  id: number;
  nik: string;
  full_name: string;
  status_kerja: string; // 'Aktif' | 'Non Aktif'
  status_kontrak: string; // 'PKWTT' | 'Kontrak' | 'Outsource'
  jabatan: string;
  department: string;
  section: string;
  bagian: string;
  no_ktp?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string | null;
  jenis_kelamin?: string;
  nama_ibu?: string;
  alamat?: string;
  tanggal_bergabung?: string | null;
  phone?: string;
  no_rek_mandiri?: string;
  npwp?: string;
  email?: string;
  no_kpj?: string;
  no_jkn?: string;
  lokasi_faskes?: string;
  tanggal_resign?: string | null;
  tipe_resign?: string;
  status_resign?: string;
  pendidikan?: string;
  no_fingerprint?: string;
  kontak_darurat_nama?: string;
  kontak_darurat_hubungan?: string;
  kontak_darurat_telp?: string;
  notes?: string;
  is_active: number | boolean;
}

export default function DataKaryawanPage() {
  const router = useRouter();

  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("Semua");
  const [selectedStatusKerja, setSelectedStatusKerja] = useState<string>("Semua");
  const [selectedStatusKontrak, setSelectedStatusKontrak] = useState<string>("Semua");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editEmployeeId, setEditEmployeeId] = useState<number | null>(null);

  // Form states
  const [formData, setFormData] = useState<Partial<Employee>>({
    nik: "",
    full_name: "",
    status_kerja: "Aktif",
    status_kontrak: "Kontrak",
    jabatan: "",
    department: "Operation",
    section: "",
    bagian: "",
    no_ktp: "",
    tempat_lahir: "",
    tanggal_lahir: "",
    jenis_kelamin: "L",
    nama_ibu: "",
    alamat: "",
    tanggal_bergabung: new Date().toISOString().split("T")[0],
    phone: "",
    no_rek_mandiri: "",
    npwp: "",
    email: "",
    no_kpj: "",
    no_jkn: "",
    lokasi_faskes: "",
    pendidikan: "SMK",
    no_fingerprint: "",
    kontak_darurat_nama: "",
    kontak_darurat_hubungan: "",
    kontak_darurat_telp: "",
    notes: ""
  });

  // Department List
  const deptList = [
    "Semua",
    "Operation",
    "Quality",
    "HRD-GA",
    "Fin-Acc",
    "Marketing",
    "Purchasing",
    "IT",
    "MR"
  ];

  // Fetch Employees & Stats
  const fetchEmployeesData = async () => {
    setLoading(true);
    try {
      const [empRes, statsRes] = await Promise.all([
        api.express.get("/employees"),
        api.express.get("/employees/stats")
      ]);

      const list = empRes?.data?.data || empRes?.data || [];
      setEmployees(list);

      if (statsRes?.data?.stats) {
        setStats(statsRes.data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch employees data from express:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeesData();
  }, []);

  // Sync from Excel sheet "MP EPU - AUG 26"
  const handleSyncExcel = async () => {
    if (!confirm('Apakah Anda ingin menyinkronkan ulang data dari sheet "MP EPU - AUG 26" file Excel Master Data Karyawan?')) {
      return;
    }
    setSyncing(true);
    try {
      const res = await api.express.post("/employees/sync-excel", {});
      alert(res?.data?.message || "Data karyawan berhasil disinkronkan dari Excel!");
      await fetchEmployeesData();
    } catch (err: any) {
      console.error("Sync error:", err);
      alert("Gagal sinkronisasi: " + (err?.response?.data?.message || err.message));
    } finally {
      setSyncing(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (emp: Employee, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setEditEmployeeId(emp.id);
    setFormData({
      nik: emp.nik || "",
      full_name: emp.full_name || "",
      status_kerja: emp.status_kerja || "Aktif",
      status_kontrak: emp.status_kontrak || "Kontrak",
      jabatan: emp.jabatan || "",
      department: emp.department || "",
      section: emp.section || "",
      bagian: emp.bagian || "",
      no_ktp: emp.no_ktp || "",
      tempat_lahir: emp.tempat_lahir || "",
      tanggal_lahir: emp.tanggal_lahir ? emp.tanggal_lahir.split("T")[0] : "",
      jenis_kelamin: emp.jenis_kelamin || "L",
      nama_ibu: emp.nama_ibu || "",
      alamat: emp.alamat || "",
      tanggal_bergabung: emp.tanggal_bergabung ? emp.tanggal_bergabung.split("T")[0] : "",
      phone: emp.phone || "",
      no_rek_mandiri: emp.no_rek_mandiri || "",
      npwp: emp.npwp || "",
      email: emp.email || "",
      no_kpj: emp.no_kpj || "",
      no_jkn: emp.no_jkn || "",
      lokasi_faskes: emp.lokasi_faskes || "",
      pendidikan: emp.pendidikan || "SMK",
      no_fingerprint: emp.no_fingerprint || "",
      kontak_darurat_nama: emp.kontak_darurat_nama || "",
      kontak_darurat_hubungan: emp.kontak_darurat_hubungan || "",
      kontak_darurat_telp: emp.kontak_darurat_telp || "",
      notes: emp.notes || ""
    });
    setIsModalOpen(true);
  };

  // Open Create Modal
  const openCreateModal = () => {
    setIsEditMode(false);
    setEditEmployeeId(null);
    const nextSeq = String(employees.length + 1).padStart(4, "0");
    setFormData({
      nik: `2608${nextSeq}`,
      full_name: "",
      status_kerja: "Aktif",
      status_kontrak: "Kontrak",
      jabatan: "Operator",
      department: "Operation",
      section: "Production",
      bagian: "Injection",
      no_ktp: "",
      tempat_lahir: "Bogor",
      tanggal_lahir: "",
      jenis_kelamin: "L",
      nama_ibu: "",
      alamat: "",
      tanggal_bergabung: new Date().toISOString().split("T")[0],
      phone: "",
      no_rek_mandiri: "",
      npwp: "",
      email: "",
      no_kpj: "",
      no_jkn: "",
      lokasi_faskes: "",
      pendidikan: "SMK",
      no_fingerprint: "",
      kontak_darurat_nama: "",
      kontak_darurat_hubungan: "",
      kontak_darurat_telp: "",
      notes: ""
    });
    setIsModalOpen(true);
  };

  // Submit Create / Edit
  const handleSubmitEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nik || !formData.full_name) {
      alert("Mohon isi NIK dan Nama Lengkap.");
      return;
    }

    try {
      if (isEditMode && editEmployeeId) {
        await api.express.put(`/employees/${editEmployeeId}`, formData);
        alert("Data karyawan berhasil diperbarui!");
      } else {
        await api.express.post("/employees", formData);
        alert("Karyawan baru berhasil ditambahkan!");
      }
      setIsModalOpen(false);
      await fetchEmployeesData();
    } catch (err: any) {
      console.error("Submit error:", err);
      alert("Gagal menyimpan data: " + (err?.response?.data?.message || err.message));
    }
  };

  // Delete Employee
  const handleDeleteEmployee = async (emp: Employee, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Apakah Anda yakin ingin menghapus data karyawan "${emp.full_name}" secara permanen dari database?`)) {
      return;
    }
    try {
      await api.express.delete(`/employees/${emp.id}`);
      await fetchEmployeesData();
      alert("Karyawan berhasil dihapus.");
    } catch (err: any) {
      console.error("Delete error:", err);
      alert("Gagal menghapus karyawan: " + (err?.response?.data?.message || err.message));
    }
  };

  // Navigate to Detail Page
  const goToDetail = (empId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    router.push(`/settings/karyawan/${empId}`);
  };

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        emp.full_name.toLowerCase().includes(q) ||
        emp.nik.toLowerCase().includes(q) ||
        (emp.jabatan && emp.jabatan.toLowerCase().includes(q)) ||
        (emp.bagian && emp.bagian.toLowerCase().includes(q)) ||
        (emp.section && emp.section.toLowerCase().includes(q)) ||
        (emp.no_ktp && emp.no_ktp.includes(q)) ||
        (emp.phone && emp.phone.includes(q));

      const matchesDept = selectedDept === "Semua" || emp.department === selectedDept;
      const matchesStatusKerja = selectedStatusKerja === "Semua" || emp.status_kerja === selectedStatusKerja;
      const matchesStatusKontrak = selectedStatusKontrak === "Semua" || emp.status_kontrak === selectedStatusKontrak;

      return matchesSearch && matchesDept && matchesStatusKerja && matchesStatusKontrak;
    });
  }, [employees, search, selectedDept, selectedStatusKerja, selectedStatusKontrak]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage) || 1;
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEmployees.slice(start, start + itemsPerPage);
  }, [filteredEmployees, currentPage, itemsPerPage]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedDept, selectedStatusKerja, selectedStatusKontrak]);

  // Helper date formatter
  const formatDate = (val?: string | null) => {
    if (!val) return "-";
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return d.toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return val;
    }
  };

  const totalCount = stats?.total ?? employees.length;
  const activeCount = stats?.active ?? employees.filter(e => e.status_kerja === "Aktif").length;
  const nonActiveCount = stats?.nonActive ?? employees.filter(e => e.status_kerja !== "Aktif").length;

  return (
    <div className="p-6 md:p-8 space-y-8 bg-[#f8fafc] min-h-screen animate-in fade-in duration-300">
      
      {/* Top Breadcrumb */}
      <button 
        onClick={() => router.push("/settings/users")}
        className="flex items-center gap-2 text-xs font-black text-emerald-600 hover:text-emerald-800 transition-colors uppercase tracking-widest"
      >
        <ArrowLeft size={14} /> Back to User Security & Pengaturan
      </button>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-200">
              <Contact className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900">
                Data <span className="text-emerald-600">Karyawan</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-black uppercase tracking-wider">
                  Master Data: MP EPU - AUG 26
                </span>
                <span className="text-xs text-gray-400 font-bold">• PT Eran Plastindo Utama</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleSyncExcel}
            disabled={syncing}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-5 py-3.5 rounded-2xl font-bold text-xs transition-all shadow-sm active:scale-95 disabled:opacity-50"
            title="Sinkronkan ulang dari sheet MP EPU - AUG 26"
          >
            <RefreshCw size={16} className={syncing ? "animate-spin text-emerald-600" : "text-emerald-600"} />
            <span>{syncing ? "Menyinkronkan..." : "Sinkronisasi Excel"}</span>
          </button>

          <button
            onClick={openCreateModal}
            className="group flex items-center gap-2.5 bg-gray-950 hover:bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-black text-xs transition-all shadow-xl hover:shadow-emerald-100 active:scale-95"
          >
            <Plus size={18} strokeWidth={3} />
            <span>Tambah Karyawan</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3 hover:border-emerald-200 transition-all">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Karyawan</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><Users size={18} /></div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-gray-950">{totalCount}</h3>
            <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
              Master Manpower EPU Agustus 2026
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3 hover:border-blue-200 transition-all">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Karyawan Aktif</span>
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><UserCheck size={18} /></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-3xl font-black text-gray-950">{activeCount}</h3>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
              {((activeCount / (totalCount || 1)) * 100).toFixed(1)}% dari total personil
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3 hover:border-purple-200 transition-all">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status Kontrak / PKWTT</span>
            <div className="p-2 bg-purple-50 rounded-xl text-purple-600"><Briefcase size={18} /></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-black text-gray-950">
                {employees.filter(e => e.status_kontrak === "PKWTT").length} <span className="text-xs font-bold text-gray-400">PKWTT</span>
              </h3>
              <span className="text-gray-300">•</span>
              <h3 className="text-2xl font-black text-gray-950">
                {employees.filter(e => e.status_kontrak === "Kontrak").length} <span className="text-xs font-bold text-gray-400">Kontrak</span>
              </h3>
            </div>
            <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
              Outsource: {employees.filter(e => e.status_kontrak === "Outsource").length} orang
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3 hover:border-rose-200 transition-all">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Non Aktif / Resign</span>
            <div className="p-2 bg-rose-50 rounded-xl text-rose-600"><XCircle size={18} /></div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-rose-600">{nonActiveCount}</h3>
            <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
              Catatan historis mantan karyawan
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        {/* Department Filters tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-50 rounded-2xl overflow-x-auto max-w-full">
          {deptList.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                selectedDept === dept 
                  ? "bg-white text-emerald-600 shadow-sm border border-emerald-100/50" 
                  : "text-gray-400 hover:text-gray-800"
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Filters and search inputs */}
        <div className="flex flex-wrap md:flex-nowrap items-center gap-3 flex-1 lg:max-w-2xl justify-end">
          <div className="relative w-full sm:w-auto min-w-[130px]">
            <select
              value={selectedStatusKerja}
              onChange={(e) => setSelectedStatusKerja(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all text-gray-700"
            >
              <option value="Semua">Semua Status</option>
              <option value="Aktif">Status: Aktif</option>
              <option value="Non Aktif">Status: Non Aktif</option>
            </select>
          </div>

          <div className="relative w-full sm:w-auto min-w-[130px]">
            <select
              value={selectedStatusKontrak}
              onChange={(e) => setSelectedStatusKontrak(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all text-gray-700"
            >
              <option value="Semua">Semua Kontrak</option>
              <option value="Kontrak">Kontrak</option>
              <option value="PKWTT">PKWTT (Tetap)</option>
              <option value="Outsource">Outsource</option>
            </select>
          </div>

          <div className="relative w-full sm:flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Cari NIK, Nama, Bagian, Jabatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:bg-white outline-none transition-all text-gray-700"
            />
          </div>
        </div>
      </div>

      {/* Main Table: Full Width */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[450px] flex flex-col">
        
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center text-xs font-bold text-gray-500">
          <span>Menampilkan {filteredEmployees.length} dari {employees.length} Karyawan (Klik baris atau tombol View untuk melihat Detail)</span>
          <span>Halaman {currentPage} dari {totalPages}</span>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/40">
                <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">NIK / Masuk</th>
                <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Karyawan</th>
                <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Departemen & Posisi</th>
                <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Kontrak</th>
                <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-5 py-4"><div className="h-8 bg-gray-100 rounded-xl w-full"></div></td>
                  </tr>
                ))
              ) : paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center font-bold text-gray-400 uppercase tracking-widest text-sm bg-gray-50/10">
                    Tidak Ada Data Karyawan yang Cocok dengan Filter
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => goToDetail(emp.id)}
                    className="cursor-pointer transition-colors hover:bg-emerald-50/30 group"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-black text-gray-950 group-hover:text-emerald-600 transition-colors text-xs font-mono">
                        {emp.nik}
                      </div>
                      <div className="text-[10px] text-gray-400 font-semibold mt-0.5">
                        {formatDate(emp.tanggal_bergabung)}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-gray-900 text-xs group-hover:text-emerald-700 transition-colors">
                        {emp.full_name}
                      </div>
                      <div className="text-[10px] text-gray-400 font-medium truncate mt-0.5">
                        {emp.phone || emp.email || "No Telp: -"}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-gray-700 text-xs flex items-center gap-1.5">
                        <Building size={12} className="text-gray-400" />
                        <span>{emp.department}</span>
                        {emp.section && <span className="text-gray-300">•</span>}
                        <span className="text-gray-500 font-medium">{emp.section}</span>
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                        {emp.jabatan || "-"} {emp.bagian ? `(${emp.bagian})` : ""}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {emp.status_kerja === "Aktif" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-full uppercase tracking-wider">
                          <CheckCircle2 size={10} /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-black rounded-full uppercase tracking-wider">
                          <XCircle size={10} /> Non Aktif
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg uppercase tracking-wider ${
                        emp.status_kontrak === "PKWTT"
                          ? "bg-purple-50 text-purple-700 border border-purple-100"
                          : emp.status_kontrak === "Kontrak"
                          ? "bg-blue-50 text-blue-700 border border-blue-100"
                          : "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}>
                        {emp.status_kontrak || "Kontrak"}
                      </span>
                    </td>

                    {/* Action Buttons: VIEW, EDIT, DELETE */}
                    <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {/* View Button */}
                        <button
                          onClick={(e) => goToDetail(emp.id, e)}
                          className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all active:scale-95"
                          title="Lihat Detail Profil Karyawan"
                        >
                          <Eye size={16} />
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={(e) => openEditModal(emp, e)}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all active:scale-95"
                          title="Edit Data Karyawan"
                        >
                          <Edit size={16} />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={(e) => handleDeleteEmployee(emp, e)}
                          className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all active:scale-95"
                          title="Hapus Karyawan"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronLeft size={14} /> Sebelumnya
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                let pageNum = currentPage;
                if (currentPage <= 3) {
                  pageNum = idx + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + idx;
                } else {
                  pageNum = currentPage - 2 + idx;
                }
                if (pageNum < 1 || pageNum > totalPages) return null;

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-black transition-all ${
                      currentPage === pageNum
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 disabled:opacity-40 hover:bg-gray-50"
            >
              Selanjutnya <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* CREATE / EDIT EMPLOYEE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-3xl border border-gray-100 shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Contact size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">
                    {isEditMode ? "Edit Data Karyawan" : "Registrasi Karyawan Baru"}
                  </h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">
                    {isEditMode ? "Perbarui informasi data karyawan terpilih" : "Daftarkan data baru ke database karyawan PT EPU"}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm px-2 py-1 bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitEmployee} className="space-y-6">
              
              {/* Section 1: Identitas Kerja */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider border-b border-gray-100 pb-1 flex items-center gap-2">
                  <Briefcase size={14} /> 1. Data Pekerjaan & Jabatan
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">NIK</label>
                    <input
                      type="text"
                      value={formData.nik || ""}
                      onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                      required
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Lengkap</label>
                    <input
                      type="text"
                      placeholder="Nama lengkap sesuai KTP..."
                      value={formData.full_name || ""}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Departemen</label>
                    <select
                      value={formData.department || ""}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      required
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                    >
                      <option value="Operation">Operation</option>
                      <option value="Quality">Quality</option>
                      <option value="HRD-GA">HRD-GA</option>
                      <option value="Fin-Acc">Fin-Acc</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Purchasing">Purchasing</option>
                      <option value="IT">IT</option>
                      <option value="MR">MR</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Section</label>
                    <input
                      type="text"
                      placeholder="Engineering / Production / GA..."
                      value={formData.section || ""}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bagian</label>
                    <input
                      type="text"
                      placeholder="Moldshop / Injection / Assembling..."
                      value={formData.bagian || ""}
                      onChange={(e) => setFormData({ ...formData, bagian: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jabatan</label>
                    <input
                      type="text"
                      placeholder="Operator / Staff / Leader / Supervisor..."
                      value={formData.jabatan || ""}
                      onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status Kerja</label>
                    <select
                      value={formData.status_kerja || "Aktif"}
                      onChange={(e) => setFormData({ ...formData, status_kerja: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Non Aktif">Non Aktif (Resign)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status Kontrak</label>
                    <select
                      value={formData.status_kontrak || "Kontrak"}
                      onChange={(e) => setFormData({ ...formData, status_kontrak: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                    >
                      <option value="Kontrak">Kontrak</option>
                      <option value="PKWTT">PKWTT (Tetap)</option>
                      <option value="Outsource">Outsource</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tanggal Bergabung</label>
                    <input
                      type="date"
                      value={formData.tanggal_bergabung || ""}
                      onChange={(e) => setFormData({ ...formData, tanggal_bergabung: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No. Fingerprint</label>
                    <input
                      type="text"
                      placeholder="Nomor mesin absensi..."
                      value={formData.no_fingerprint || ""}
                      onChange={(e) => setFormData({ ...formData, no_fingerprint: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Biodata & Kontak */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider border-b border-gray-100 pb-1 flex items-center gap-2">
                  <Contact size={14} /> 2. Biodata & Kontak Pribadi
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No. KTP</label>
                    <input
                      type="text"
                      placeholder="16 digit NIK KTP..."
                      value={formData.no_ktp || ""}
                      onChange={(e) => setFormData({ ...formData, no_ktp: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tempat Lahir</label>
                    <input
                      type="text"
                      placeholder="Kota kelahiran..."
                      value={formData.tempat_lahir || ""}
                      onChange={(e) => setFormData({ ...formData, tempat_lahir: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tanggal Lahir</label>
                    <input
                      type="date"
                      value={formData.tanggal_lahir || ""}
                      onChange={(e) => setFormData({ ...formData, tanggal_lahir: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jenis Kelamin</label>
                    <select
                      value={formData.jenis_kelamin || "L"}
                      onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                    >
                      <option value="L">Laki-laki (L)</option>
                      <option value="P">Perempuan (P)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pendidikan Terakhir</label>
                    <input
                      type="text"
                      placeholder="SMK / SMA / D3 / S1..."
                      value={formData.pendidikan || ""}
                      onChange={(e) => setFormData({ ...formData, pendidikan: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Ibu Kandung</label>
                    <input
                      type="text"
                      placeholder="Nama ibu kandung..."
                      value={formData.nama_ibu || ""}
                      onChange={(e) => setFormData({ ...formData, nama_ibu: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Alamat Rumah</label>
                    <input
                      type="text"
                      placeholder="Alamat lengkap tempat tinggal..."
                      value={formData.alamat || ""}
                      onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No. Handphone</label>
                    <input
                      type="text"
                      placeholder="0812-xxxx-xxxx"
                      value={formData.phone || ""}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</label>
                    <input
                      type="email"
                      placeholder="email@gmail.com..."
                      value={formData.email || ""}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No. Rekening Mandiri</label>
                    <input
                      type="text"
                      placeholder="Rekening transfer payroll..."
                      value={formData.no_rek_mandiri || ""}
                      onChange={(e) => setFormData({ ...formData, no_rek_mandiri: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">NPWP</label>
                    <input
                      type="text"
                      placeholder="Nomor pokok wajib pajak..."
                      value={formData.npwp || ""}
                      onChange={(e) => setFormData({ ...formData, npwp: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No. KPJ (BPJSTK)</label>
                    <input
                      type="text"
                      placeholder="BPJS Ketenagakerjaan..."
                      value={formData.no_kpj || ""}
                      onChange={(e) => setFormData({ ...formData, no_kpj: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No. JKN (BPJS Kes)</label>
                    <input
                      type="text"
                      placeholder="BPJS Kesehatan..."
                      value={formData.no_jkn || ""}
                      onChange={(e) => setFormData({ ...formData, no_jkn: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Kontak Darurat */}
              <div className="space-y-3 bg-amber-50/40 p-4 rounded-2xl border border-amber-100/60">
                <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={14} className="text-amber-600" /> 3. Kontak Darurat
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Nama Kontak</label>
                    <input
                      type="text"
                      placeholder="Nama keluarga..."
                      value={formData.kontak_darurat_nama || ""}
                      onChange={(e) => setFormData({ ...formData, kontak_darurat_nama: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-amber-200/60 rounded-xl text-xs font-semibold outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Hubungan</label>
                    <input
                      type="text"
                      placeholder="Istri / Suami / Orang tua..."
                      value={formData.kontak_darurat_hubungan || ""}
                      onChange={(e) => setFormData({ ...formData, kontak_darurat_hubungan: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-amber-200/60 rounded-xl text-xs font-semibold outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">No. Telp Kontak</label>
                    <input
                      type="text"
                      placeholder="No. Telepon darurat..."
                      value={formData.kontak_darurat_telp || ""}
                      onChange={(e) => setFormData({ ...formData, kontak_darurat_telp: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-amber-200/60 rounded-xl text-xs font-semibold outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-7 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-100"
                >
                  {isEditMode ? "Simpan Perubahan" : "Simpan Karyawan"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
