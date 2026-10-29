"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Building,
  Briefcase,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  BadgeAlert,
  Trash2,
  Edit,
  Clock,
  GraduationCap,
  Heart,
  Fingerprint,
  FileText
} from "lucide-react";
import api from "@/lib/api";
import { Employee } from "../page";

export default function DetailKaryawanPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Employee>>({});

  // Fetch Employee by ID
  const fetchEmployee = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.express.get(`/employees/${id}`);
      const data = res?.data?.data;
      if (data) {
        setEmployee(data);
        setFormData({
          nik: data.nik || "",
          full_name: data.full_name || "",
          status_kerja: data.status_kerja || "Aktif",
          status_kontrak: data.status_kontrak || "Kontrak",
          jabatan: data.jabatan || "",
          department: data.department || "",
          section: data.section || "",
          bagian: data.bagian || "",
          no_ktp: data.no_ktp || "",
          tempat_lahir: data.tempat_lahir || "",
          tanggal_lahir: data.tanggal_lahir ? data.tanggal_lahir.split("T")[0] : "",
          jenis_kelamin: data.jenis_kelamin || "L",
          nama_ibu: data.nama_ibu || "",
          alamat: data.alamat || "",
          tanggal_bergabung: data.tanggal_bergabung ? data.tanggal_bergabung.split("T")[0] : "",
          phone: data.phone || "",
          no_rek_mandiri: data.no_rek_mandiri || "",
          npwp: data.npwp || "",
          email: data.email || "",
          no_kpj: data.no_kpj || "",
          no_jkn: data.no_jkn || "",
          lokasi_faskes: data.lokasi_faskes || "",
          pendidikan: data.pendidikan || "SMK",
          no_fingerprint: data.no_fingerprint || "",
          kontak_darurat_nama: data.kontak_darurat_nama || "",
          kontak_darurat_hubungan: data.kontak_darurat_hubungan || "",
          kontak_darurat_telp: data.kontak_darurat_telp || "",
          notes: data.notes || ""
        });
      }
    } catch (err: any) {
      console.error("Error fetching employee:", err);
      alert("Gagal memuat data karyawan: " + (err?.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployee();
  }, [id]);

  // Handle Edit Submit
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nik || !formData.full_name) {
      alert("Mohon lengkapi NIK dan Nama Karyawan.");
      return;
    }
    try {
      await api.express.put(`/employees/${id}`, formData);
      alert("Data karyawan berhasil diperbarui!");
      setIsEditModalOpen(false);
      await fetchEmployee();
    } catch (err: any) {
      console.error("Error updating employee:", err);
      alert("Gagal memperbarui data: " + (err?.response?.data?.message || err.message));
    }
  };

  // Toggle Active / Non-Aktif
  const handleToggleActive = async () => {
    if (!employee) return;
    const nextStatus = employee.status_kerja === "Aktif" ? "Non Aktif" : "Aktif";
    const confirmMsg = employee.status_kerja === "Aktif"
      ? `Ubah status ${employee.full_name} menjadi NON AKTIF (Resign)?`
      : `Aktifkan kembali karyawan ${employee.full_name}?`;

    if (!confirm(confirmMsg)) return;

    try {
      await api.express.put(`/employees/${id}`, {
        status_kerja: nextStatus,
        status_resign: nextStatus === "Aktif" ? "Aktif" : "Nonaktif",
        tanggal_resign: nextStatus === "Non Aktif" ? new Date().toISOString().split("T")[0] : null
      });
      await fetchEmployee();
    } catch (err: any) {
      console.error("Toggle error:", err);
      alert("Gagal mengubah status: " + (err?.response?.data?.message || err.message));
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!employee) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus data karyawan "${employee.full_name}" secara permanen?`)) {
      return;
    }
    try {
      await api.express.delete(`/employees/${id}`);
      alert("Karyawan berhasil dihapus.");
      router.push("/settings/karyawan");
    } catch (err: any) {
      console.error("Delete error:", err);
      alert("Gagal menghapus: " + (err?.response?.data?.message || err.message));
    }
  };

  // Format date helper
  const formatDate = (val?: string | null) => {
    if (!val) return "-";
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return d.toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    } catch {
      return val;
    }
  };

  const calculateAge = (val?: string | null) => {
    if (!val) return null;
    try {
      const birth = new Date(val);
      if (isNaN(birth.getTime())) return null;
      const ageDiff = Date.now() - birth.getTime();
      const ageDate = new Date(ageDiff);
      return Math.abs(ageDate.getUTCFullYear() - 1970);
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 min-h-screen bg-[#f8fafc]">
        <div className="h-8 w-48 bg-gray-200 rounded-xl animate-pulse"></div>
        <div className="h-44 bg-white rounded-3xl border border-gray-100 shadow-sm animate-pulse p-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-white rounded-3xl border border-gray-100 shadow-sm animate-pulse"></div>
          <div className="h-80 bg-white rounded-3xl border border-gray-100 shadow-sm animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-8 min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center space-y-4">
        <h2 className="text-xl font-black text-gray-800">Karyawan Tidak Ditemukan</h2>
        <p className="text-sm text-gray-500">Data karyawan dengan ID #{id} tidak ada di sistem.</p>
        <button
          onClick={() => router.push("/settings/karyawan")}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider"
        >
          <ArrowLeft size={14} /> Kembali ke Daftar Karyawan
        </button>
      </div>
    );
  }

  const age = calculateAge(employee.tanggal_lahir);

  return (
    <div className="p-6 md:p-8 space-y-8 bg-[#f8fafc] min-h-screen animate-in fade-in duration-300">
      
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button
          onClick={() => router.push("/settings/karyawan")}
          className="flex items-center gap-2 text-xs font-black text-emerald-600 hover:text-emerald-800 transition-colors uppercase tracking-widest bg-emerald-50 px-4 py-2 rounded-xl"
        >
          <ArrowLeft size={15} /> Kembali ke Daftar Karyawan
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-100"
          >
            <Edit size={14} /> Edit Data
          </button>

          <button
            onClick={handleToggleActive}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
              employee.status_kerja === "Aktif"
                ? "bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border-slate-200"
                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
            }`}
          >
            {employee.status_kerja === "Aktif" ? (
              <>
                <XCircle size={14} /> Set Resign
              </>
            ) : (
              <>
                <CheckCircle2 size={14} /> Aktifkan
              </>
            )}
          </button>

          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            title="Hapus Karyawan"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black text-2xl shadow-xl shadow-emerald-200">
            {employee.full_name.substring(0, 2).toUpperCase()}
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl md:text-3xl font-black text-gray-950 tracking-tight">
                {employee.full_name}
              </h1>
              <span className="font-mono text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-2.5 py-0.5 rounded-lg">
                NIK: {employee.nik}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-semibold">
              <span className="flex items-center gap-1 text-gray-700 font-bold">
                <Building size={14} className="text-gray-400" />
                {employee.department}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-700 font-bold">
                <Briefcase size={14} className="text-emerald-500" />
                {employee.jabatan || "Posisi tidak terdefinisi"}
              </span>
              {employee.bagian && (
                <>
                  <span>•</span>
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-[11px] font-bold">
                    Bagian: {employee.bagian}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {employee.status_kerja === "Aktif" ? (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-black rounded-2xl uppercase tracking-wider">
              <CheckCircle2 size={14} /> Status: Aktif
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200/80 text-xs font-black rounded-2xl uppercase tracking-wider">
              <XCircle size={14} /> Status: Non Aktif / Resign
            </span>
          )}

          <span className={`px-4 py-2 text-xs font-black rounded-2xl uppercase tracking-wider border ${
            employee.status_kontrak === "PKWTT"
              ? "bg-purple-50 text-purple-700 border-purple-200"
              : employee.status_kontrak === "Kontrak"
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}>
            {employee.status_kontrak || "Kontrak"}
          </span>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* CARD 1: Informasi Kepegawaian & Posisi */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 text-emerald-800">
            <Briefcase size={18} className="text-emerald-600" />
            <h2 className="text-sm font-black uppercase tracking-wider">Informasi Kepegawaian</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-gray-50/70 p-3.5 rounded-2xl">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Departemen</span>
              <p className="font-black text-gray-900 text-sm mt-1">{employee.department || "-"}</p>
            </div>

            <div className="bg-gray-50/70 p-3.5 rounded-2xl">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Jabatan</span>
              <p className="font-black text-gray-900 text-sm mt-1">{employee.jabatan || "-"}</p>
            </div>

            <div className="bg-gray-50/70 p-3.5 rounded-2xl">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Section</span>
              <p className="font-bold text-gray-800 mt-1">{employee.section || "-"}</p>
            </div>

            <div className="bg-gray-50/70 p-3.5 rounded-2xl">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Bagian</span>
              <p className="font-bold text-gray-800 mt-1">{employee.bagian || "-"}</p>
            </div>

            <div className="bg-gray-50/70 p-3.5 rounded-2xl">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Status Kontrak</span>
              <p className="font-bold text-gray-800 mt-1">{employee.status_kontrak || "Kontrak"}</p>
            </div>

            <div className="bg-gray-50/70 p-3.5 rounded-2xl">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">No. Fingerprint</span>
              <p className="font-mono font-bold text-gray-800 mt-1 flex items-center gap-1.5">
                <Fingerprint size={14} className="text-emerald-600" />
                {employee.no_fingerprint || "-"}
              </p>
            </div>

            <div className="bg-gray-50/70 p-3.5 rounded-2xl sm:col-span-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Tanggal Bergabung</span>
              <p className="font-bold text-gray-800 mt-1 flex items-center gap-1.5">
                <Calendar size={14} className="text-gray-400" />
                {formatDate(employee.tanggal_bergabung)}
              </p>
            </div>

            {employee.tanggal_resign && (
              <div className="bg-rose-50/80 p-3.5 rounded-2xl sm:col-span-2 border border-rose-100">
                <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider">Informasi Resign</span>
                <p className="font-bold text-rose-900 mt-1">
                  Tanggal: {formatDate(employee.tanggal_resign)}
                  {employee.tipe_resign && ` • Tipe: ${employee.tipe_resign}`}
                  {employee.status_resign && ` • Status: ${employee.status_resign}`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: Biodata Pribadi */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 text-emerald-800">
            <User size={18} className="text-emerald-600" />
            <h2 className="text-sm font-black uppercase tracking-wider">Biodata Pribadi</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-gray-50/70 p-3.5 rounded-2xl sm:col-span-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Nomor KTP (NIK KTP)</span>
              <p className="font-mono font-bold text-gray-900 text-sm mt-1">{employee.no_ktp || "-"}</p>
            </div>

            <div className="bg-gray-50/70 p-3.5 rounded-2xl sm:col-span-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Tempat & Tanggal Lahir</span>
              <p className="font-bold text-gray-800 mt-1">
                {employee.tempat_lahir || "-"}, {formatDate(employee.tanggal_lahir)}
                {age !== null && <span className="text-gray-500 font-semibold ml-1">({age} Tahun)</span>}
              </p>
            </div>

            <div className="bg-gray-50/70 p-3.5 rounded-2xl">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Jenis Kelamin</span>
              <p className="font-bold text-gray-800 mt-1">
                {employee.jenis_kelamin === "L" ? "Laki-laki (L)" : employee.jenis_kelamin === "P" ? "Perempuan (P)" : employee.jenis_kelamin || "-"}
              </p>
            </div>

            <div className="bg-gray-50/70 p-3.5 rounded-2xl">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Pendidikan Terakhir</span>
              <p className="font-bold text-gray-800 mt-1 flex items-center gap-1.5">
                <GraduationCap size={14} className="text-gray-400" />
                {employee.pendidikan || "-"}
              </p>
            </div>

            <div className="bg-gray-50/70 p-3.5 rounded-2xl sm:col-span-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Nama Ibu Kandung</span>
              <p className="font-bold text-gray-800 mt-1 flex items-center gap-1.5">
                <Heart size={14} className="text-rose-400" />
                {employee.nama_ibu || "-"}
              </p>
            </div>

            <div className="bg-gray-50/70 p-3.5 rounded-2xl sm:col-span-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Alamat Lengkap</span>
              <p className="font-medium text-gray-700 mt-1 leading-relaxed flex items-start gap-1.5">
                <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
                <span>{employee.alamat || "-"}</span>
              </p>
            </div>
          </div>
        </div>

        {/* CARD 3: Kontak & Finansial (Payroll Mandiri, BPJS, NPWP) */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 text-emerald-800">
            <CreditCard size={18} className="text-emerald-600" />
            <h2 className="text-sm font-black uppercase tracking-wider">Kontak & Finansial Payroll</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-gray-50/70 p-3.5 rounded-2xl">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Nomor Handphone</span>
              <p className="font-bold text-gray-900 mt-1 flex items-center gap-1.5">
                <Phone size={14} className="text-emerald-600" />
                {employee.phone || "-"}
              </p>
            </div>

            <div className="bg-gray-50/70 p-3.5 rounded-2xl">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Email</span>
              <p className="font-bold text-gray-900 mt-1 flex items-center gap-1.5 truncate">
                <Mail size={14} className="text-emerald-600" />
                {employee.email || "-"}
              </p>
            </div>

            <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100/60 sm:col-span-2">
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">No. Rekening Bank Mandiri</span>
              <p className="font-mono font-black text-emerald-950 text-base mt-1">
                {employee.no_rek_mandiri || "-"}
              </p>
              <p className="text-[10px] text-emerald-600 mt-0.5">Rekening payroll penggajian resmi karyawan</p>
            </div>

            <div className="bg-gray-50/70 p-3.5 rounded-2xl">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">NPWP</span>
              <p className="font-mono font-bold text-gray-800 mt-1">{employee.npwp || "-"}</p>
            </div>

            <div className="bg-gray-50/70 p-3.5 rounded-2xl">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">No. KPJ (BPJS Ketenagakerjaan)</span>
              <p className="font-mono font-bold text-gray-800 mt-1">{employee.no_kpj || "-"}</p>
            </div>

            <div className="bg-gray-50/70 p-3.5 rounded-2xl">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">No. JKN (BPJS Kesehatan)</span>
              <p className="font-mono font-bold text-gray-800 mt-1">{employee.no_jkn || "-"}</p>
            </div>

            <div className="bg-gray-50/70 p-3.5 rounded-2xl">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Lokasi Faskes</span>
              <p className="font-bold text-gray-800 mt-1">{employee.lokasi_faskes || "-"}</p>
            </div>
          </div>
        </div>

        {/* CARD 4: Kontak Darurat & Catatan */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 text-amber-800">
              <BadgeAlert size={18} className="text-amber-600" />
              <h2 className="text-sm font-black uppercase tracking-wider">Kontak Darurat Terkait</h2>
            </div>

            <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-100/60 space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-amber-100/40">
                <span className="text-gray-500 font-bold">Nama Kontak</span>
                <span className="font-black text-gray-900">{employee.kontak_darurat_nama || "-"}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-amber-100/40">
                <span className="text-gray-500 font-bold">Hubungan Keluarga</span>
                <span className="font-black text-gray-900">{employee.kontak_darurat_hubungan || "-"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-bold">Nomor Telepon</span>
                <span className="font-mono font-black text-amber-900 text-sm">{employee.kontak_darurat_telp || "-"}</span>
              </div>
            </div>
          </div>

          {/* Notes / Catatan Tambahan */}
          {employee.notes && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-3">
              <div className="flex items-center gap-2 text-gray-700 text-xs font-black uppercase tracking-wider">
                <FileText size={16} className="text-emerald-600" />
                <span>Catatan Tambahan (Notes)</span>
              </div>
              <p className="text-xs text-gray-600 bg-gray-50 p-4 rounded-2xl leading-relaxed">
                {employee.notes}
              </p>
            </div>
          )}
        </div>

      </div>

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-3xl border border-gray-100 shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Edit size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Edit Data Karyawan</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">
                    Perbarui profil #{employee.nik} - {employee.full_name}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm px-2 py-1 bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">NIK</label>
                  <input
                    type="text"
                    value={formData.nik || ""}
                    onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Lengkap</label>
                  <input
                    type="text"
                    value={formData.full_name || ""}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Departemen</label>
                  <select
                    value={formData.department || ""}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
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
                    value={formData.section || ""}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bagian</label>
                  <input
                    type="text"
                    value={formData.bagian || ""}
                    onChange={(e) => setFormData({ ...formData, bagian: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jabatan</label>
                  <input
                    type="text"
                    value={formData.jabatan || ""}
                    onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status Kerja</label>
                  <select
                    value={formData.status_kerja || "Aktif"}
                    onChange={(e) => setFormData({ ...formData, status_kerja: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl text-xs font-bold outline-none"
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
                    className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl text-xs font-bold outline-none"
                  >
                    <option value="Kontrak">Kontrak</option>
                    <option value="PKWTT">PKWTT (Tetap)</option>
                    <option value="Outsource">Outsource</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No. KTP</label>
                  <input
                    type="text"
                    value={formData.no_ktp || ""}
                    onChange={(e) => setFormData({ ...formData, no_ktp: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl text-xs font-mono outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No. Handphone</label>
                  <input
                    type="text"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No. Rek Mandiri</label>
                  <input
                    type="text"
                    value={formData.no_rek_mandiri || ""}
                    onChange={(e) => setFormData({ ...formData, no_rek_mandiri: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl text-xs font-mono outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-7 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider"
                >
                  Simpan Perubahan
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
