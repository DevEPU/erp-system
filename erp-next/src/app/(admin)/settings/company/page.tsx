"use client";

import { useState, useEffect } from "react";
import { Building2, Save, AlertCircle, CheckCircle } from "lucide-react";
import api from "@/lib/api";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-black text-gray-400 uppercase tracking-widest border-l-2 border-blue-500 pl-2">{label}</label>
    {children}
  </div>
);

export default function CompanyProfilePage() {
  const [formData, setFormData] = useState({
    company_name: "",
    company_email: "",
    company_phone: "",
    company_address: "",
    notification_email: "",
    footer_text: "",
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.express.get("/settings/company");
        if (res.data) {
          setFormData({
            company_name: res.data.company_name || "",
            company_email: res.data.company_email || "",
            company_phone: res.data.company_phone || "",
            company_address: res.data.company_address || "",
            notification_email: res.data.notification_email || "",
            footer_text: res.data.footer_text || "",
          });
        }
      } catch (err: any) {
        setError("Gagal memuat data perusahaan.");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      await api.express.put("/settings/company", formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan data perusahaan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-10 bg-gray-50 animate-in fade-in duration-500">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] blur opacity-10"></div>
          <div className="relative bg-white/80 backdrop-blur-xl border border-white/20 p-8 rounded-[2rem] shadow-xl flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-200">
              <Building2 size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Profil Perusahaan</h1>
              <p className="text-gray-500 text-sm font-medium mt-1">Kelola informasi dan identitas perusahaan Anda.</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-4 animate-pulse">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-400 font-bold">Memuat data perusahaan...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm flex items-start gap-2 border border-red-100">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl text-sm flex items-start gap-2 border border-emerald-100">
                  <CheckCircle size={18} className="shrink-0 mt-0.5" />
                  <span>Data perusahaan berhasil disimpan!</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Nama Perusahaan">
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm transition-all text-gray-700"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="PT. Nama Perusahaan"
                    required
                  />
                </Field>

                <Field label="Email Perusahaan">
                  <input
                    type="email"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm transition-all text-gray-700"
                    value={formData.company_email}
                    onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
                    placeholder="info@perusahaan.id"
                    required
                  />
                </Field>

                <Field label="Nomor Telepon">
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm transition-all text-gray-700"
                    value={formData.company_phone}
                    onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
                    placeholder="021-XXXXXXXX"
                  />
                </Field>

                <Field label="Email Notifikasi">
                  <input
                    type="email"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm transition-all text-gray-700"
                    value={formData.notification_email}
                    onChange={(e) => setFormData({ ...formData, notification_email: e.target.value })}
                    placeholder="notif@perusahaan.id"
                  />
                </Field>
              </div>

              <Field label="Alamat Perusahaan">
                <textarea
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 font-medium text-sm transition-all text-gray-700"
                  value={formData.company_address}
                  onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
                  placeholder="Jl. Contoh No. 123, Kota, Provinsi, Kode Pos"
                />
              </Field>

              <Field label="Footer Text">
                <textarea
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 font-medium text-sm transition-all text-gray-700"
                  value={formData.footer_text}
                  onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                  placeholder="Teks yang muncul di footer dokumen/laporan..."
                />
              </Field>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-blue-600 text-white px-10 py-3 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50 text-xs uppercase tracking-widest"
                >
                  <Save size={16} />
                  {submitting ? "Menyimpan..." : "Simpan Profil Perusahaan"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
