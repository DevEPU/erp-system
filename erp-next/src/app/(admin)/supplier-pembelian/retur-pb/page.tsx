"use client";

import { useState, useCallback } from "react";
import { Undo2, Search, Save, X, Plus, Trash2, ChevronDown } from "lucide-react";
import api from "@/lib/api";
import PrintButton from "@/components/ui/PrintButton";

interface ReturnItem {
  id: number;
  warehouse: string;
  product_code: string;
  product_name: string;
  barcode: string;
  product_unit: string;
  qty_retur: number;
  qty_terima: number;
}

export default function ReturPBPage() {
  // Header state
  const [bpbSearch, setBpbSearch] = useState("");
  const [bpbSearchResult, setBpbSearchResult] = useState<any[]>([]);
  const [showBpbDropdown, setShowBpbDropdown] = useState(false);
  const [loadingBpb, setLoadingBpb] = useState(false);

  const [selectedBpb, setSelectedBpb] = useState<any | null>(null);
  const [noBpb, setNoBpb] = useState("");
  const [noPo, setNoPo] = useState("");
  const [department, setDepartment] = useState("");
  const [noOtomatis, setNoOtomatis] = useState("");
  const [noFaktur, setNoFaktur] = useState("");
  const [tglPo, setTglPo] = useState("");
  const [tglPengembalian, setTglPengembalian] = useState(new Date().toISOString().split("T")[0]);
  const [supplier, setSupplier] = useState("");
  const [noSjSupplier, setNoSjSupplier] = useState("");
  const [alamatPengiriman, setAlamatPengiriman] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [kurs, setKurs] = useState("1.00");

  const [items, setItems] = useState<ReturnItem[]>([]);
  const [activeTab, setActiveTab] = useState<"transaksi" | "jurnal">("transaksi");
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showNotif = (type: "success" | "error", msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3500);
  };

  // Search BPB
  const searchBpb = useCallback(async (q: string) => {
    if (!q) { setBpbSearchResult([]); return; }
    setLoadingBpb(true);
    try {
      const res = await api.express.get("/goods-receipts", { search: q, limit: 20 });
      setBpbSearchResult(res.data.data || []);
      setShowBpbDropdown(true);
    } catch {
      setBpbSearchResult([]);
    } finally {
      setLoadingBpb(false);
    }
  }, []);

  const selectBpb = async (bpb: any) => {
    setSelectedBpb(bpb);
    setNoBpb(bpb.reference || "");
    setNoPo(bpb.po_reference || "");
    setDepartment(bpb.department_name || "");
    setNoSjSupplier(bpb.bpb_number || "");
    setSupplier(bpb.supplier_name || "");
    setTglPo(bpb.po_date || bpb.date || "");
    setAlamatPengiriman(bpb.shipping_address || "");
    setShowBpbDropdown(false);

    // Fetch BPB details for items
    try {
      const res = await api.express.get(`/goods-receipts/${bpb.id}`);
      const detail = res.data.data;
      const detailItems: ReturnItem[] = (detail.details || []).map((d: any, idx: number) => ({
        id: idx + 1,
        warehouse: "RM",
        product_code: d.product_code || "",
        product_name: d.product_name || "",
        barcode: d.barcode || "",
        product_unit: d.product_unit || "PCS",
        qty_retur: 0,
        qty_terima: d.qty_received || 0,
      }));
      setItems(detailItems);
    } catch {
      setItems([]);
    }
  };

  const updateItemQty = (idx: number, val: number) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, qty_retur: val } : item));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: prev.length + 1, warehouse: "", product_code: "", product_name: "", barcode: "", product_unit: "PCS", qty_retur: 0, qty_terima: 0 },
    ]);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleReset = () => {
    setSelectedBpb(null);
    setNoBpb(""); setNoPo(""); setDepartment(""); setNoOtomatis(""); setNoFaktur("");
    setTglPo(""); setTglPengembalian(new Date().toISOString().split("T")[0]);
    setSupplier(""); setNoSjSupplier(""); setAlamatPengiriman(""); setKeterangan(""); setKurs("1.00");
    setItems([]);
    setBpbSearch("");
  };

  const handleSave = async () => {
    if (!selectedBpb) { showNotif("error", "Pilih No. BPB terlebih dahulu."); return; }
    const hasRetur = items.some((i) => i.qty_retur > 0);
    if (!hasRetur) { showNotif("error", "Minimal satu item harus memiliki Qty Retur > 0."); return; }
    setSubmitting(true);
    try {
      // TODO: post to backend retur endpoint
      showNotif("success", "Retur PB berhasil disimpan.");
    } catch (e: any) {
      showNotif("error", e.message || "Gagal menyimpan Retur PB");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg text-white font-semibold text-sm animate-in slide-in-from-top-2 duration-300 ${notification.type === "success" ? "bg-emerald-500" : "bg-red-500"}`}>
          {notification.msg}
        </div>
      )}

      {/* Page Title */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Undo2 className="text-blue-500" size={22} />
          Retur Penerimaan Barang
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">Buat dokumen retur barang yang telah diterima dari supplier.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
        {/* Row 1: No BPB + Departemen */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* No. BPB */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">No. BPB</label>
            <div className="relative flex gap-2">
              <input
                type="text"
                value={bpbSearch || noBpb}
                onChange={(e) => { setBpbSearch(e.target.value); searchBpb(e.target.value); }}
                placeholder="Cari No. BPB..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              />
              <button
                onClick={() => searchBpb(bpbSearch)}
                className="px-3 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all"
              >
                <Search size={16} />
              </button>
              {/* Dropdown */}
              {showBpbDropdown && bpbSearchResult.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-10 bg-white border border-gray-200 rounded-xl shadow-xl z-30 max-h-52 overflow-y-auto">
                  {loadingBpb ? (
                    <div className="p-3 text-sm text-gray-400">Mencari...</div>
                  ) : bpbSearchResult.map((bpb) => (
                    <div
                      key={bpb.id}
                      onClick={() => selectBpb(bpb)}
                      className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0"
                    >
                      <p className="text-sm font-semibold text-blue-700">{bpb.reference}</p>
                      <p className="text-xs text-gray-500">{bpb.supplier_name} — {bpb.date ? new Date(bpb.date).toLocaleDateString("id-ID") : "-"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Departemen */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Departemen</label>
            <div className="relative">
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full appearance-none px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none"
              >
                <option value="">{department || "Pilih Departemen"}</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Row 2: No PO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">No. PO</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={noPo}
                readOnly
                placeholder="Otomatis dari BPB"
                className="flex-1 px-3 py-2 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-600 outline-none"
              />
              <button className="px-3 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all">
                <Search size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Row 3: No Otomatis, No Faktur, Tgl PO, Tgl Pengembalian, Supplier */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">No. Otomatis</label>
            <div className="relative">
              <select
                value={noOtomatis}
                onChange={(e) => setNoOtomatis(e.target.value)}
                className="w-full appearance-none px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none"
              >
                <option value="">—</option>
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">No. Faktur</label>
            <div className="flex gap-1">
              <input
                type="text"
                value={noFaktur}
                onChange={(e) => setNoFaktur(e.target.value)}
                placeholder="No. Faktur"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              />
              <button className="px-2 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all">
                <Search size={14} />
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Tgl. PO</label>
            <input
              type="text"
              value={tglPo ? new Date(tglPo).toLocaleDateString("id-ID") : ""}
              readOnly
              placeholder="Dari BPB"
              className="w-full px-3 py-2 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-600 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-600 uppercase tracking-wide">Tanggal Pengembalian</label>
            <input
              type="date"
              value={tglPengembalian}
              onChange={(e) => setTglPengembalian(e.target.value)}
              className="w-full px-3 py-2 border border-blue-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-600 uppercase tracking-wide">Supplier</label>
            <input
              type="text"
              value={supplier}
              readOnly
              placeholder="Dari BPB"
              className="w-full px-3 py-2 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-600 outline-none"
            />
          </div>
        </div>

        {/* Row 4: SJ Supplier + Alamat Pengiriman */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">No. S.J. Supplier</label>
            <input
              type="text"
              value={noSjSupplier}
              onChange={(e) => setNoSjSupplier(e.target.value)}
              placeholder="Nomor Surat Jalan Supplier"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Alamat Pengiriman</label>
            <textarea
              value={alamatPengiriman}
              onChange={(e) => setAlamatPengiriman(e.target.value)}
              rows={2}
              placeholder="Alamat tujuan retur barang"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none resize-none"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex gap-0">
            {(["transaksi", "jurnal"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-all capitalize ${
                  activeTab === tab
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Rincian {tab === "transaksi" ? "Transaksi" : "Jurnal Akun"}
              </button>
            ))}
          </div>
        </div>

        {/* Items Table */}
        {activeTab === "transaksi" && (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">No.</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Gudang</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Kode Barang</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Nama Barang</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Barcode</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Satuan</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Qty Retur</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Qty. Terima</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-sm italic">
                        Pilih No. BPB untuk memuat item
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/20">
                        <td className="px-4 py-3 text-gray-500 text-xs">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.warehouse}
                            onChange={(e) => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, warehouse: e.target.value } : it))}
                            className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-400 outline-none"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.product_code}
                            readOnly
                            className="w-32 px-2 py-1 border border-gray-100 rounded-lg text-xs bg-gray-50 outline-none text-gray-600"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <textarea
                            value={item.product_name}
                            readOnly
                            rows={1}
                            className="w-48 px-2 py-1 border border-gray-100 rounded-lg text-xs bg-gray-50 outline-none text-gray-600 resize-none"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.barcode}
                            onChange={(e) => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, barcode: e.target.value } : it))}
                            className="w-28 px-2 py-1 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-400 outline-none"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.product_unit}
                            readOnly
                            className="w-16 px-2 py-1 border border-gray-100 rounded-lg text-xs bg-gray-50 outline-none text-center text-gray-600"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            min={0}
                            value={item.qty_retur}
                            onChange={(e) => updateItemQty(idx, Number(e.target.value))}
                            className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-xs text-right focus:ring-1 focus:ring-blue-400 outline-none"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            value={item.qty_terima}
                            readOnly
                            className="w-20 px-2 py-1 border border-gray-100 rounded-lg text-xs text-right bg-gray-50 outline-none text-gray-600"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => removeItem(idx)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "jurnal" && (
          <div className="py-10 text-center text-gray-400 text-sm italic">
            Rincian Jurnal Akun akan tersedia setelah modul diintegrasikan dengan General Ledger.
          </div>
        )}

        {/* Bottom fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Keterangan</label>
            <textarea
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              rows={3}
              placeholder="Keterangan retur..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Kurs</label>
            <input
              type="text"
              value={kurs}
              onChange={(e) => setKurs(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
          >
            <X size={16} />
            Batalkan
          </button>
          <PrintButton
            moduleKey="retur_pembelian"
            moduleName="Retur Pembelian"
            data={{
              reference: noOtomatis || `#RET-PB`,
              supplier_name: supplier || "-",
              po_reference: noPo || "-",
              date: tglPengembalian || "-",
              status: "Draft",
              items: items.map(it => ({
                product_code: it.product_code,
                product_name: it.product_name,
                qty: it.qty_retur,
                unit: it.product_unit,
              })),
            }}
          />
          <button
            onClick={handleSave}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          >
            <Save size={16} />
            {submitting ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
