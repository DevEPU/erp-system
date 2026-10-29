"use client";

import { useState, useEffect } from "react";
import { SlidersHorizontal, BarChart2, FileText, CheckCircle, AlertCircle, RefreshCw, CalendarClock, PackageCheck, Truck, Save, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import {
  useForecastEnabled,
  setForecastEnabled,
  usePOCustomerV12Enabled,
  setPOCustomerV12Enabled,
  useVendorDeliveryCrudEnabled,
  setVendorDeliveryCrudEnabled,
  useMRPReleasePREnabled,
  setMRPReleasePREnabled,
  useReceiptByScheduleEnabled,
  setReceiptByScheduleEnabled,
  useShowMRPSafetyStockEnabled,
  setShowMRPSafetyStockEnabled,
  useShowMRPScrapLossEnabled,
  setShowMRPScrapLossEnabled,
  useMRPManualFGEnabled,
  setMRPManualFGEnabled
} from "@/lib/config";

export default function GeneralSettingsPage() {
  const isForecastActive = useForecastEnabled();
  const isPoV12Active = usePOCustomerV12Enabled();
  const isVendorDeliveryCrudActive = useVendorDeliveryCrudEnabled();
  const isMrpReleasePrActive = useMRPReleasePREnabled();
  const isReceiptByScheduleActive = useReceiptByScheduleEnabled();
  const isShowSafetyStockActive = useShowMRPSafetyStockEnabled();
  const isShowScrapLossActive = useShowMRPScrapLossEnabled();
  const isMrpManualFgActive = useMRPManualFGEnabled();

  const [forecastToggle, setForecastToggle] = useState<boolean>(isForecastActive);
  const [poV12Toggle, setPoV12Toggle] = useState<boolean>(isPoV12Active);
  const [vendorDeliveryCrudToggle, setVendorDeliveryCrudToggle] = useState<boolean>(isVendorDeliveryCrudActive);
  const [mrpReleasePrToggle, setMrpReleasePrToggle] = useState<boolean>(isMrpReleasePrActive);
  const [receiptByScheduleToggle, setReceiptByScheduleToggle] = useState<boolean>(isReceiptByScheduleActive);
  const [showSafetyStockToggle, setShowSafetyStockToggle] = useState<boolean>(isShowSafetyStockActive);
  const [showScrapLossToggle, setShowScrapLossToggle] = useState<boolean>(isShowScrapLossActive);
  const [mrpManualFgToggle, setMrpManualFgToggle] = useState<boolean>(isMrpManualFgActive);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [justSaved, setJustSaved] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Status Modal Hook
  const { isOpen, type, title, message, onConfirm, showSuccess, showError, closeModal, isLoading: isModalLoading } = useStatusModal();

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/settings/general");
      if (res && res.data) {
        if (typeof res.data.enable_forecast !== "undefined") {
          const val = Boolean(res.data.enable_forecast);
          setForecastToggle(val);
          setForecastEnabled(val);
        }
        if (typeof res.data.enable_po_customer_v12 !== "undefined") {
          const valVal = Boolean(res.data.enable_po_customer_v12);
          setPoV12Toggle(valVal);
          setPOCustomerV12Enabled(valVal);
        }
        if (typeof res.data.enable_vendor_delivery_crud !== "undefined") {
          const valVal = Boolean(res.data.enable_vendor_delivery_crud);
          setVendorDeliveryCrudToggle(valVal);
          setVendorDeliveryCrudEnabled(valVal);
        }
        if (typeof res.data.enable_mrp_release_pr !== "undefined") {
          const valVal = Boolean(res.data.enable_mrp_release_pr);
          setMrpReleasePrToggle(valVal);
          setMRPReleasePREnabled(valVal);
        }
        if (typeof res.data.enable_receipt_by_schedule !== "undefined") {
          const valVal = Boolean(res.data.enable_receipt_by_schedule);
          setReceiptByScheduleToggle(valVal);
          setReceiptByScheduleEnabled(valVal);
        }
        if (typeof res.data.show_mrp_safety_stock !== "undefined") {
          const valVal = Boolean(res.data.show_mrp_safety_stock);
          setShowSafetyStockToggle(valVal);
          setShowMRPSafetyStockEnabled(valVal);
        }
        if (typeof res.data.show_mrp_scrap_loss !== "undefined") {
          const valVal = Boolean(res.data.show_mrp_scrap_loss);
          setShowScrapLossToggle(valVal);
          setShowMRPScrapLossEnabled(valVal);
        }
        if (typeof res.data.enable_mrp_manual_fg !== "undefined") {
          const valVal = Boolean(res.data.enable_mrp_manual_fg);
          setMrpManualFgToggle(valVal);
          setMRPManualFGEnabled(valVal);
        }
      }
    } catch (err: any) {
      console.error("Failed to load general settings from server:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveAllSettings = async () => {
    setSaving(true);
    setToastMsg(null);

    const payload = {
      enable_forecast: forecastToggle,
      enable_po_customer_v12: poV12Toggle,
      enable_vendor_delivery_crud: vendorDeliveryCrudToggle,
      enable_mrp_release_pr: mrpReleasePrToggle,
      enable_receipt_by_schedule: receiptByScheduleToggle,
      show_mrp_safety_stock: showSafetyStockToggle,
      show_mrp_scrap_loss: showScrapLossToggle,
      enable_mrp_manual_fg: mrpManualFgToggle
    };

    try {
      const res = await api.express.put("/settings/general", payload);

      // Sync local state & events
      setForecastEnabled(forecastToggle);
      setPOCustomerV12Enabled(poV12Toggle);
      setVendorDeliveryCrudEnabled(vendorDeliveryCrudToggle);
      setMRPReleasePREnabled(mrpReleasePrToggle);
      setReceiptByScheduleEnabled(receiptByScheduleToggle);
      setShowMRPSafetyStockEnabled(showSafetyStockToggle);
      setShowMRPScrapLossEnabled(showScrapLossToggle);
      setMRPManualFGEnabled(mrpManualFgToggle);

      // Trigger Visual Feedback
      setJustSaved(true);
      setToastMsg("Konfigurasi Umum berhasil disimpan secara permanen ke Database!");
      showSuccess(
        "Konfigurasi Berhasil Disimpan",
        "Pengaturan modul & opsi fitur global telah berhasil disimpan secara permanen ke Database MySQL!"
      );

      setTimeout(() => {
        setJustSaved(false);
        setToastMsg(null);
      }, 4000);
    } catch (err: any) {
      console.error("Save settings error:", err);
      showError(
        "Gagal Menyimpan Konfigurasi",
        err.response?.data?.message || err.message || "Gagal menyimpan konfigurasi ke server."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-10 bg-gray-50 animate-in fade-in duration-500 relative pb-24">
      {/* Global Status Modal Overlay */}
      <StatusModal
        isOpen={isOpen}
        type={type}
        title={title}
        message={message}
        onConfirm={onConfirm}
        onClose={closeModal}
        isLoading={isModalLoading}
      />

      {/* Floating Bottom Toast Notification Banner */}
      {toastMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[90] bg-emerald-900/90 text-white px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md border border-emerald-500/40 flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 size={24} className="text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMsg}</span>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-[2rem] blur opacity-10"></div>
          <div className="relative bg-white/80 backdrop-blur-xl border border-white/20 p-8 rounded-[2rem] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-200 shrink-0">
                <SlidersHorizontal size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Konfigurasi Umum</h1>
                <p className="text-gray-500 text-sm font-medium mt-1">
                  Pengaturan modul & opsi fitur global sistem ERP.
                </p>
              </div>
            </div>

            {/* Top Save Button */}
            <button
              type="button"
              onClick={handleSaveAllSettings}
              disabled={saving || loading}
              className={`flex items-center gap-2.5 px-7 py-3.5 rounded-2xl font-black text-xs shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 shrink-0 ${
                justSaved
                  ? "bg-emerald-700 text-white shadow-emerald-300"
                  : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-200"
              }`}
            >
              {saving ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : justSaved ? (
                <>
                  <CheckCircle2 size={18} />
                  <span>Berhasil Tersimpan!</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>Simpan Konfigurasi</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Settings Card */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 space-y-8">
          <div className="border-b border-gray-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                Modul & Integrasi Fitur
              </h2>
              <p className="text-xs text-gray-400 font-medium mt-1">
                Aktifkan atau nonaktifkan fitur opsional, lalu klik <b>Simpan Konfigurasi</b> untuk menyimpan secara permanen.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center gap-3 animate-pulse">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-gray-400 font-bold">Memuat konfigurasi sistem...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Feature 1: Sales Forecast */}
              <div className="bg-gray-50/80 border border-gray-100 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:bg-gray-50">
                <div className="flex items-start gap-4 max-w-xl">
                  <div className={`p-3.5 rounded-2xl shrink-0 transition-colors ${forecastToggle ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-400"}`}>
                    <BarChart2 size={28} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-black text-gray-900">Fitur Sales Forecast</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${forecastToggle ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-gray-200 text-gray-600 border border-gray-300"}`}>
                        {forecastToggle ? "Active / Aktif" : "Non-Active / Non-Aktif"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                      Jika diaktifkan, menu <b>Forecast</b> di Sidebar (Sales & Manufacturing), tombol <b>Tarik dari Forecast</b> di PO Customer, opsi <b>Sales Forecast</b> di MPP, dan pilihan <b>Sales Forecast</b> di MRP akan dimunculkan dan terintegrasi secara otomatis.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setForecastToggle(!forecastToggle)}
                  className={`relative inline-flex h-9 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-emerald-500/20 ${
                    forecastToggle ? "bg-emerald-600" : "bg-gray-300"
                  }`}
                  role="switch"
                  aria-checked={forecastToggle}
                >
                  <span
                    className={`pointer-events-none inline-block h-8 w-8 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out ${
                      forecastToggle ? "translate-x-7" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Feature 2: PO Customer V 1.2 */}
              <div className="bg-gray-50/80 border border-gray-100 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:bg-gray-50">
                <div className="flex items-start gap-4 max-w-xl">
                  <div className={`p-3.5 rounded-2xl shrink-0 transition-colors ${poV12Toggle ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-400"}`}>
                    <FileText size={28} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-black text-gray-900">PO Customer V 1.2</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${poV12Toggle ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-gray-200 text-gray-600 border border-gray-300"}`}>
                        {poV12Toggle ? "Active / Aktif" : "Non-Active / Non-Aktif"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                      Jika diaktifkan, kolom & opsi tambahan pada form PO Customer (<b>Metode Pembayaran</b>, <b>Metode Pengiriman Incoterms</b>, <b>PIC Customer</b>, <b>No. Telepon PIC</b>, <b>Mata Uang</b>, dan <b>Nilai Kurs</b>) akan dimunculkan. Jika dinonaktifkan, kolom-kolom ini akan disembunyikan.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPoV12Toggle(!poV12Toggle)}
                  className={`relative inline-flex h-9 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-blue-500/20 ${
                    poV12Toggle ? "bg-blue-600" : "bg-gray-300"
                  }`}
                  role="switch"
                  aria-checked={poV12Toggle}
                >
                  <span
                    className={`pointer-events-none inline-block h-8 w-8 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out ${
                      poV12Toggle ? "translate-x-7" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Feature 3: Rilis PO & CRUD Estimasi Vendor */}
              <div className="bg-gray-50/80 border border-gray-100 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:bg-gray-50">
                <div className="flex items-start gap-4 max-w-xl">
                  <div className={`p-3.5 rounded-2xl shrink-0 transition-colors ${vendorDeliveryCrudToggle ? "bg-amber-100 text-amber-700" : "bg-gray-200 text-gray-400"}`}>
                    <CalendarClock size={28} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-black text-gray-900">Rilis PO & CRUD Estimasi Vendor</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${vendorDeliveryCrudToggle ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-gray-200 text-gray-600 border border-gray-300"}`}>
                        {vendorDeliveryCrudToggle ? "Active / Aktif" : "Non-Active / Non-Aktif"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                      Jika diaktifkan, tab <b>Daftar Rilis PO & CRUD</b> pada menu Schedule Pengiriman Vendor akan dimunculkan untuk membuat estimasi kedatangan PO manual. Jika dinonaktifkan, tab ini akan disembunyikan.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setVendorDeliveryCrudToggle(!vendorDeliveryCrudToggle)}
                  className={`relative inline-flex h-9 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-amber-500/20 ${
                    vendorDeliveryCrudToggle ? "bg-amber-600" : "bg-gray-300"
                  }`}
                  role="switch"
                  aria-checked={vendorDeliveryCrudToggle}
                >
                  <span
                    className={`pointer-events-none inline-block h-8 w-8 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out ${
                      vendorDeliveryCrudToggle ? "translate-x-7" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Feature 4: MRP Release PR */}
              <div className="bg-gray-50/80 border border-gray-100 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:bg-gray-50">
                <div className="flex items-start gap-4 max-w-xl">
                  <div className={`p-3.5 rounded-2xl shrink-0 transition-colors ${mrpReleasePrToggle ? "bg-violet-100 text-violet-700" : "bg-gray-200 text-gray-400"}`}>
                    <PackageCheck size={28} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-black text-gray-900">Rilis PR dari MRP</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${mrpReleasePrToggle ? "bg-violet-100 text-violet-700 border border-violet-200" : "bg-gray-200 text-gray-600 border border-gray-300"}`}>
                        {mrpReleasePrToggle ? "Active / Aktif" : "Non-Active / Non-Aktif"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                      Jika diaktifkan, tombol <b>Rilis ke PR</b> pada detail MRP yang sudah Approved akan muncul dan dapat digunakan untuk membuat Purchase Request. Jika dinonaktifkan, tombol tersebut akan disembunyikan selama masa pengembangan.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMrpReleasePrToggle(!mrpReleasePrToggle)}
                  className={`relative inline-flex h-9 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-violet-500/20 ${
                    mrpReleasePrToggle ? "bg-violet-600" : "bg-gray-300"
                  }`}
                  role="switch"
                  aria-checked={mrpReleasePrToggle}
                >
                  <span
                    className={`pointer-events-none inline-block h-8 w-8 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out ${
                      mrpReleasePrToggle ? "translate-x-7" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Feature 5: Penerimaan Barang by Schedule */}
              <div className="bg-gray-50/80 border border-gray-100 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:bg-gray-50">
                <div className="flex items-start gap-4 max-w-xl">
                  <div className={`p-3.5 rounded-2xl shrink-0 transition-colors ${receiptByScheduleToggle ? "bg-cyan-100 text-cyan-700" : "bg-gray-200 text-gray-400"}`}>
                    <Truck size={28} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-black text-gray-900">Penerimaan Barang by Schedule</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${receiptByScheduleToggle ? "bg-cyan-100 text-cyan-700 border border-cyan-200" : "bg-gray-200 text-gray-600 border border-gray-300"}`}>
                        {receiptByScheduleToggle ? "Active / Aktif" : "Non-Active / Non-Aktif"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                      Jika diaktifkan, menu <b>Penerimaan by Schedule</b> akan muncul di Sidebar Persediaan, dan tombol <b>Kirim ke Penerimaan</b> akan muncul pada halaman Schedule Pengiriman Vendor. Fitur ini memungkinkan penerimaan barang langsung dari jadwal pengiriman tanpa melalui alur PR/PO standar.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setReceiptByScheduleToggle(!receiptByScheduleToggle)}
                  className={`relative inline-flex h-9 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-cyan-500/20 ${
                    receiptByScheduleToggle ? "bg-cyan-600" : "bg-gray-300"
                  }`}
                  role="switch"
                  aria-checked={receiptByScheduleToggle}
                >
                  <span
                    className={`pointer-events-none inline-block h-8 w-8 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out ${
                      receiptByScheduleToggle ? "translate-x-7" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Feature 6: Tampilkan Safety Stock Buffer (%) pada MRP */}
              <div className="bg-gray-50/80 border border-gray-100 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:bg-gray-50">
                <div className="flex items-start gap-4 max-w-xl">
                  <div className={`p-3.5 rounded-2xl shrink-0 transition-colors ${showSafetyStockToggle ? "bg-amber-100 text-amber-700" : "bg-gray-200 text-gray-400"}`}>
                    <SlidersHorizontal size={28} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-black text-gray-900">Safety Stock Buffer (%) pada MRP</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${showSafetyStockToggle ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-gray-200 text-gray-600 border border-gray-300"}`}>
                        {showSafetyStockToggle ? "Tampil / Show" : "Sembunyi / Hide"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                      Jika diaktifkan, bidang persentase <b>Safety Stock Buffer (%)</b> akan dimunculkan pada modal kalkulasi MRP dan header dokumen. Jika dinonaktifkan, bidang ini akan disembunyikan.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSafetyStockToggle(!showSafetyStockToggle)}
                  className={`relative inline-flex h-9 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-amber-500/20 ${
                    showSafetyStockToggle ? "bg-amber-600" : "bg-gray-300"
                  }`}
                  role="switch"
                  aria-checked={showSafetyStockToggle}
                >
                  <span
                    className={`pointer-events-none inline-block h-8 w-8 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out ${
                      showSafetyStockToggle ? "translate-x-7" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Feature 7: Tampilkan Scrap / Material Loss (%) pada MRP */}
              <div className="bg-gray-50/80 border border-gray-100 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:bg-gray-50">
                <div className="flex items-start gap-4 max-w-xl">
                  <div className={`p-3.5 rounded-2xl shrink-0 transition-colors ${showScrapLossToggle ? "bg-rose-100 text-rose-700" : "bg-gray-200 text-gray-400"}`}>
                    <BarChart2 size={28} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-black text-gray-900">Scrap / Material Loss (%) pada MRP</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${showScrapLossToggle ? "bg-rose-100 text-rose-700 border border-rose-200" : "bg-gray-200 text-gray-600 border border-gray-300"}`}>
                        {showScrapLossToggle ? "Tampil / Show" : "Sembunyi / Hide"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                      Jika diaktifkan, bidang persentase <b>Scrap / Material Loss (%)</b> akan dimunculkan pada modal kalkulasi MRP dan header dokumen. Jika dinonaktifkan, bidang ini akan disembunyikan.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowScrapLossToggle(!showScrapLossToggle)}
                  className={`relative inline-flex h-9 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-rose-500/20 ${
                    showScrapLossToggle ? "bg-rose-600" : "bg-gray-300"
                  }`}
                  role="switch"
                  aria-checked={showScrapLossToggle}
                >
                  <span
                    className={`pointer-events-none inline-block h-8 w-8 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out ${
                      showScrapLossToggle ? "translate-x-7" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Feature 8: Manual Finished Goods Entry in MRP */}
              <div className="bg-gray-50/80 border border-gray-100 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:bg-gray-50">
                <div className="flex items-start gap-4 max-w-xl">
                  <div className={`p-3.5 rounded-2xl shrink-0 transition-colors ${mrpManualFgToggle ? "bg-amber-100 text-amber-700" : "bg-gray-200 text-gray-400"}`}>
                    <PackageCheck size={28} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-black text-gray-900">Fitur Input Manual Finished Goods (MRP)</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${mrpManualFgToggle ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-gray-200 text-gray-600 border border-gray-300"}`}>
                        {mrpManualFgToggle ? "Active / Aktif" : "Non-Active / Non-Aktif"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                      Jika diaktifkan, kartu/pilihan saklar <b>Input Manual Finished Goods</b> pada halaman pembuatan MRP akan dimunculkan. PPIC Planner dapat menginput barang jadi (FG) dan kuantiti target secara manual untuk langsung di-breakdown (BOM explosion) menjadi MRP.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMrpManualFgToggle(!mrpManualFgToggle)}
                  className={`relative inline-flex h-9 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-amber-500/20 ${
                    mrpManualFgToggle ? "bg-amber-600" : "bg-gray-300"
                  }`}
                  role="switch"
                  aria-checked={mrpManualFgToggle}
                >
                  <span
                    className={`pointer-events-none inline-block h-8 w-8 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out ${
                      mrpManualFgToggle ? "translate-x-7" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Bottom Save Action Bar */}
          {!loading && (
            <div className="pt-6 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <p className="text-xs text-gray-400 font-medium">
                Pastikan Anda menekan tombol <b>Simpan Konfigurasi</b> setelah mengubah opsi saklar di atas.
              </p>
              <button
                type="button"
                onClick={handleSaveAllSettings}
                disabled={saving}
                className={`flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl font-black text-xs shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 shrink-0 ${
                  justSaved
                    ? "bg-emerald-700 text-white shadow-emerald-300"
                    : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-200"
                }`}
              >
                {saving ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Menyimpan Konfigurasi...</span>
                  </>
                ) : justSaved ? (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Berhasil Tersimpan!</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>Simpan Konfigurasi Perubahan</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
