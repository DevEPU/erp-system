"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Save, RotateCcw, Printer, Eye, Settings2,
  FileText, Building2, PenLine, AlignLeft, CheckSquare,
  ChevronDown, ChevronRight, CheckCircle2, AlertCircle,
} from "lucide-react";
import api from "@/lib/api";

interface TemplateConfig {
  default_template?: "half_page" | "full_page";
  paper_size: string;
  orientation: string;
  show_header: boolean;
  show_logo: boolean;
  show_company_name: boolean;
  show_company_address: boolean;
  show_company_phone: boolean;
  document_title: string;
  document_subtitle: string;
  show_footer: boolean;
  footer_text: string;
  custom_notes: string;
  show_signature: boolean;
  signature_columns: number;
  signature_labels: string[];
  font_size: string;
  show_borders: boolean;
  zebra_striping: boolean;
  columns_visible: string[];
  group?: string;
}

const DEFAULT_CONFIG: TemplateConfig = {
  default_template: "half_page",
  paper_size: "A4",
  orientation: "portrait",
  show_header: true,
  show_logo: true,
  show_company_name: true,
  show_company_address: true,
  show_company_phone: true,
  document_title: "",
  document_subtitle: "",
  show_footer: true,
  footer_text: "",
  custom_notes: "",
  show_signature: true,
  signature_columns: 3,
  signature_labels: ["Dibuat oleh,", "Diketahui oleh,", "Menyetujui,"],
  font_size: "normal",
  show_borders: true,
  zebra_striping: true,
  columns_visible: [],
};

const MODULE_NAMES: Record<string, string> = {
  purchase_request: "Permintaan Pembelian",
  purchase_order: "Purchase Order",
  goods_receipt: "Penerimaan Barang",
  purchase_invoice: "Faktur Pembelian",
  purchase_payment: "Pelunasan Utang",
  retur_pembelian: "Retur Pembelian",
  sales_order: "Sales Order",
  surat_jalan: "Surat Jalan",
  sales_invoice: "Faktur Penjualan",
  penerimaan_piutang: "Penerimaan Piutang",
  retur_penjualan: "Retur Penjualan",
  work_order: "Work Order",
  bom: "Bill of Materials",
  mpp: "MPP Jadwal Mesin",
  penerimaan_fg: "Penerimaan Gudang Jadi",
  stok_opname: "Stok Opname",
  penyesuaian_stok: "Penyesuaian Stok",
};

type SectionKey = "page" | "header" | "title" | "signature" | "footer";

export default function PrintTemplateEditorPage() {
  const router = useRouter();
  const params = useParams();
  const moduleKey = params?.module_key as string;
  const moduleName = MODULE_NAMES[moduleKey] || moduleKey;

  const [config, setConfig] = useState<TemplateConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<SectionKey[]>(["page", "header", "title", "signature"]);
  const [companyName, setCompanyName] = useState("PT. Perusahaan");
  const [companyAddress, setCompanyAddress] = useState("Jl. Raya Industri No. 1");
  const [companyPhone, setCompanyPhone] = useState("(021) 1234567");

  useEffect(() => {
    const fetchTemplate = async () => {
      setLoading(true);
      try {
        const res = await api.express.get("/settings/print-templates/" + moduleKey);
        if (res.data && res.data.success) {
          setConfig({ ...DEFAULT_CONFIG, ...res.data.data.template_config });
        }
        const compRes = await api.express.get("/settings/company").catch(() => null);
        if (compRes && compRes.data && compRes.data.company_name) {
          setCompanyName(compRes.data.company_name);
          setCompanyAddress(compRes.data.company_address || "");
          setCompanyPhone(compRes.data.company_phone || "");
        }
      } catch (err) {
        console.error("Failed to load template:", err);
      } finally {
        setLoading(false);
      }
    };
    if (moduleKey) fetchTemplate();
  }, [moduleKey]);

  const updateConfig = useCallback((key: keyof TemplateConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleSection = (sec: SectionKey) => {
    setOpenSections((prev) =>
      prev.includes(sec) ? prev.filter((s) => s !== sec) : [...prev, sec]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await api.express.put("/settings/print-templates/" + moduleKey, {
        module_name: moduleName,
        template_config: config,
      });
      if (res.data && res.data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Gagal menyimpan template.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset template ke pengaturan default? Semua kustomisasi akan hilang.")) return;
    try {
      await api.express.post("/settings/print-templates/reset/" + moduleKey);
      setConfig(DEFAULT_CONFIG);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError("Gagal reset template.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const SectionWrapper = ({ id, title, icon, children }: { id: SectionKey; title: string; icon: React.ReactNode; children: React.ReactNode }) => {
    const isOpen = openSections.includes(id);
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button onClick={() => toggleSection(id)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50/60 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">{icon}</div>
            <span className="font-black text-gray-800 text-sm">{title}</span>
          </div>
          {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
        </button>
        {isOpen && <div className="px-5 pb-5 space-y-4 border-t border-gray-50 pt-4">{children}</div>}
      </div>
    );
  };

  const Toggle = ({ label, value, onChange, desc }: { label: string; value: boolean; onChange: (v: boolean) => void; desc?: string }) => (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <div className="text-sm font-bold text-gray-800">{label}</div>
        {desc && <div className="text-xs text-gray-400 mt-0.5">{desc}</div>}
      </div>
      <button onClick={() => onChange(!value)} className={"relative w-11 h-6 rounded-full transition-colors shrink-0 " + (value ? "bg-indigo-600" : "bg-gray-200")}>
        <span className={"absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform " + (value ? "translate-x-5" : "translate-x-0")} />
      </button>
    </div>
  );

  const SelectField = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) => (
    <div>
      <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 outline-none focus:border-indigo-400 cursor-pointer">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  const TextInput = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <div>
      <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-400" />
    </div>
  );

  const previewStyle = config.orientation === "landscape"
    ? { width: "100%", aspectRatio: "1.414 / 1" }
    : { width: "100%", aspectRatio: "1 / 1.414" };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50/20">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-6 py-3 gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/settings/print-templates")} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
              <ArrowLeft size={16} className="text-gray-600" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Printer size={14} className="text-indigo-500" />
                <span className="font-black text-gray-900 text-sm">{moduleName}</span>
                <code className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg">{moduleKey}</code>
              </div>
              <p className="text-xs text-gray-400 font-medium">Editor Layout Cetakan</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black border border-emerald-100">
                <CheckCircle2 size={13} /> Tersimpan!
              </span>
            )}
            {error && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-black border border-rose-100">
                <AlertCircle size={13} /> {error}
              </span>
            )}
            <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black transition-all">
              <RotateCcw size={13} /> Reset Default
            </button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-sm disabled:opacity-50 active:scale-95">
              <Save size={13} />
              {saving ? "Menyimpan..." : "Simpan Template"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-60px)]">
        {/* Left Panel */}
        <div className="w-96 shrink-0 border-r border-gray-100 bg-white/60 overflow-y-auto p-5 space-y-3">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest pb-1">Konfigurasi Layout</div>

          <SectionWrapper id="page" title="Pengaturan Halaman" icon={<FileText size={15} />}>
            <SelectField label="Template Default" value={config.default_template || "half_page"} onChange={(v) => updateConfig("default_template", v as any)}
              options={[{ value: "half_page", label: "Half Page (Continuous Form / Setengah Halaman)" }, { value: "full_page", label: "Full Page (A4 Portrait)" }]} />
            <SelectField label="Ukuran Kertas" value={config.paper_size} onChange={(v) => updateConfig("paper_size", v)}
              options={[{ value: "A4", label: "A4 (210 x 297 mm)" }, { value: "A5", label: "A5 (148 x 210 mm)" }, { value: "Letter", label: "Letter (8.5 x 11 in)" }, { value: "Legal", label: "Legal (8.5 x 14 in)" }]} />
            <SelectField label="Orientasi" value={config.orientation} onChange={(v) => updateConfig("orientation", v)}
              options={[{ value: "portrait", label: "Potrait (Vertikal)" }, { value: "landscape", label: "Landscape (Horizontal)" }]} />
            <SelectField label="Ukuran Font" value={config.font_size} onChange={(v) => updateConfig("font_size", v)}
              options={[{ value: "small", label: "Kecil (8pt)" }, { value: "normal", label: "Normal (10pt)" }, { value: "large", label: "Besar (12pt)" }]} />
            <div className="divide-y divide-gray-50 mt-2">
              <Toggle label="Tampilkan Border Tabel" value={config.show_borders} onChange={(v) => updateConfig("show_borders", v)} desc="Garis tepi pada baris tabel" />
              <Toggle label="Zebra Striping" value={config.zebra_striping} onChange={(v) => updateConfig("zebra_striping", v)} desc="Baris bergantian warna" />
            </div>
          </SectionWrapper>

          <SectionWrapper id="header" title="Header Dokumen" icon={<Building2 size={15} />}>
            <div className="divide-y divide-gray-50">
              <Toggle label="Tampilkan Header" value={config.show_header} onChange={(v) => updateConfig("show_header", v)} />
              {config.show_header && <>
                <Toggle label="Logo Perusahaan" value={config.show_logo} onChange={(v) => updateConfig("show_logo", v)} />
                <Toggle label="Nama Perusahaan" value={config.show_company_name} onChange={(v) => updateConfig("show_company_name", v)} />
                <Toggle label="Alamat Perusahaan" value={config.show_company_address} onChange={(v) => updateConfig("show_company_address", v)} />
                <Toggle label="Nomor Telepon" value={config.show_company_phone} onChange={(v) => updateConfig("show_company_phone", v)} />
              </>}
            </div>
          </SectionWrapper>

          <SectionWrapper id="title" title="Judul Dokumen" icon={<PenLine size={15} />}>
            <TextInput label="Judul Kustom" value={config.document_title} onChange={(v) => updateConfig("document_title", v)} placeholder={"Biarkan kosong = " + moduleName} />
            <TextInput label="Subtitle / Keterangan" value={config.document_subtitle} onChange={(v) => updateConfig("document_subtitle", v)} placeholder="Mis: Dokumen Internal" />
          </SectionWrapper>

          <SectionWrapper id="signature" title="Tanda Tangan" icon={<CheckSquare size={15} />}>
            <Toggle label="Tampilkan Kolom TTD" value={config.show_signature} onChange={(v) => updateConfig("show_signature", v)} />
            {config.show_signature && (
              <>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Jumlah Kolom TTD</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((n) => (
                      <button key={n} onClick={() => {
                        updateConfig("signature_columns", n);
                        const labels = Array.from({ length: n }, (_, i) => config.signature_labels[i] || ("Kolom " + (i + 1)));
                        updateConfig("signature_labels", labels);
                      }} className={"flex-1 py-2 rounded-xl text-xs font-black transition-all border " + (config.signature_columns === n ? "bg-indigo-600 text-white border-indigo-600" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-indigo-300")}>{n}</button>
                    ))}
                  </div>
                </div>
                {Array.from({ length: config.signature_columns }).map((_, i) => (
                  <TextInput key={i} label={"Label TTD " + (i + 1)} value={config.signature_labels[i] || ""} onChange={(v) => {
                    const labels = [...config.signature_labels];
                    labels[i] = v;
                    updateConfig("signature_labels", labels);
                  }} placeholder={"Kolom " + (i + 1)} />
                ))}
              </>
            )}
          </SectionWrapper>

          <SectionWrapper id="footer" title="Footer & Catatan" icon={<AlignLeft size={15} />}>
            <Toggle label="Tampilkan Footer" value={config.show_footer} onChange={(v) => updateConfig("show_footer", v)} />
            {config.show_footer && <TextInput label="Teks Footer" value={config.footer_text} onChange={(v) => updateConfig("footer_text", v)} placeholder="Dokumen ini dicetak secara otomatis oleh sistem" />}
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Catatan Tambahan</label>
              <textarea value={config.custom_notes} onChange={(e) => updateConfig("custom_notes", e.target.value)} rows={3} placeholder="Catatan yang akan muncul di dokumen..." className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-400 resize-none" />
            </div>
          </SectionWrapper>
        </div>

        {/* Right Panel - Live Preview */}
        <div className="flex-1 bg-slate-100 p-6 overflow-auto">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <Eye size={14} />
                Live Preview — {config.paper_size} {config.orientation === "portrait" ? "Potrait" : "Landscape"}
              </div>
              <span className="px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg text-[10px] font-black uppercase tracking-wider">Preview Estimasi</span>
            </div>

            <div className="bg-white shadow-2xl rounded" style={previewStyle}>
              <div className="w-full h-full p-6 text-[10px] text-gray-900 flex flex-col" style={{ minHeight: "100%" }}>
                {config.show_header && (
                  <div className="flex items-start justify-between mb-4 pb-3 border-b-2 border-gray-800 gap-4">
                    <div className="flex items-start gap-3 max-w-[58%] min-w-0">
                      {config.show_logo && <div className="w-10 h-10 bg-indigo-600 rounded flex items-center justify-center text-white font-black shrink-0" style={{ fontSize: "7px" }}>LOGO</div>}
                      <div className="min-w-0">
                        {config.show_company_name && <div className="font-black text-gray-900 truncate" style={{ fontSize: "10px" }}>{companyName}</div>}
                        {config.show_company_address && <div className="text-gray-500 break-words" style={{ fontSize: "8px" }}>{companyAddress}</div>}
                        {config.show_company_phone && <div className="text-gray-500" style={{ fontSize: "8px" }}>{companyPhone}</div>}
                      </div>
                    </div>
                    <div className="text-right shrink-0 min-w-[150px]">
                      <div className="font-black text-gray-900" style={{ fontSize: "11px" }}>{config.document_title || moduleName.toUpperCase()}</div>
                      {config.document_subtitle && <div className="text-gray-400 italic" style={{ fontSize: "8px" }}>{config.document_subtitle}</div>}
                      <div className="mt-1" style={{ fontSize: "8px" }}>
                        <div className="text-gray-500">No.: <span className="font-black text-gray-900">DOC/2026/0001</span></div>
                        <div className="text-gray-500">Tgl: <span className="font-black text-gray-900">17 Sep 2026</span></div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-3" style={{ fontSize: "8px" }}>
                  <div className="space-y-0.5">
                    <div><span className="text-gray-400 font-bold">Kepada: </span><span className="font-black">Nama Vendor/Customer</span></div>
                    <div><span className="text-gray-400 font-bold">Dept: </span><span className="font-black">Manufacturing</span></div>
                  </div>
                  <div className="space-y-0.5">
                    <div><span className="text-gray-400 font-bold">Status: </span><span className="font-black">Diproses</span></div>
                    <div><span className="text-gray-400 font-bold">Operator: </span><span className="font-black">Admin</span></div>
                  </div>
                </div>

                <div className="flex-1 mb-3 overflow-hidden">
                  <table className="w-full" style={{ borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#1e293b" }}>
                        {["No", "Kode", "Nama Item", "Qty", "Satuan", "Harga", "Subtotal"].map((h) => (
                          <th key={h} style={{ fontSize: "7px", padding: "3px 4px", border: config.show_borders ? "1px solid #334155" : "none", color: "#fff", textAlign: "left", fontWeight: "900" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3].map((row) => (
                        <tr key={row} style={{ backgroundColor: config.zebra_striping && row % 2 === 0 ? "#f8fafc" : "transparent" }}>
                          {[String(row).padStart(2, "0"), "ITM-00" + row, "Item Barang Contoh " + row, "10", "Pcs", "Rp 50.000", "Rp 500.000"].map((cell, ci) => (
                            <td key={ci} style={{ fontSize: "7px", padding: "3px 4px", border: config.show_borders ? "1px solid #e2e8f0" : "none" }}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: "#f8fafc" }}>
                        <td colSpan={6} style={{ fontSize: "7px", padding: "3px 4px", border: config.show_borders ? "1px solid #e2e8f0" : "none", textAlign: "right", fontWeight: "900" }}>TOTAL</td>
                        <td style={{ fontSize: "7px", padding: "3px 4px", border: config.show_borders ? "1px solid #e2e8f0" : "none", fontWeight: "900" }}>Rp 1.500.000</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {config.custom_notes && (
                  <div className="mb-3 p-2 bg-amber-50 border border-amber-100 rounded" style={{ fontSize: "8px" }}>
                    <span className="font-black text-amber-800">Catatan: </span>
                    <span className="text-amber-700">{config.custom_notes}</span>
                  </div>
                )}

                {config.show_signature && (
                  <div className="mb-3 grid gap-4" style={{ gridTemplateColumns: ("repeat(" + config.signature_columns + ", 1fr)") }}>
                    {Array.from({ length: config.signature_columns }).map((_, i) => (
                      <div key={i} className="text-center">
                        <div className="font-bold text-gray-600 mb-8" style={{ fontSize: "8px" }}>{config.signature_labels[i] || ("Kolom " + (i + 1))}</div>
                        <div className="border-t border-gray-400 pt-0.5 text-gray-400" style={{ fontSize: "7px" }}>( Nama & TTD )</div>
                      </div>
                    ))}
                  </div>
                )}

                {config.show_footer && (
                  <div className="border-t border-gray-200 pt-2 text-center text-gray-400" style={{ fontSize: "7px" }}>
                    {config.footer_text || "Dokumen ini dicetak secara otomatis oleh sistem."}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}