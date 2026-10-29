"use client";

import { useState, useEffect } from "react";
import { X, Save, AlertCircle, Truck, RefreshCw } from "lucide-react";
import SearchableSelect from "@/components/ui/SearchableSelect";
import api from "@/lib/api";

type GRItem = {
  id?: number;
  product_id?: number;
  product_name: string;
  product_code: string;
  qty_ordered: number;
  qty_received: number;
  qty_remaining?: number;
  product_unit: string;
};

type GR = {
  id?: number;
  reference?: string;
  bpb_number: string;
  date: string;
  po_date: string;
  received_date: string;
  supplier_id: number | "";
  department_id: number | "";
  po_id?: number | "";
  pr_id?: number | "";
  note: string;
  shipping_address: string;
  items: GRItem[];
};

type GoodsReceiptModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  grToEdit?: any | null;
  userDepartmentId?: number | null;
};

export default function GoodsReceiptModal({ isOpen, onClose, onSuccess, grToEdit, userDepartmentId }: GoodsReceiptModalProps) {
  const [formData, setFormData] = useState<GR>({
    date: new Date().toISOString().split("T")[0],
    bpb_number: "",
    po_date: "",
    received_date: new Date().toISOString().split("T")[0],
    supplier_id: "",
    department_id: "",
    po_id: "",
    pr_id: "",
    note: "",
    shipping_address: "",
    items: [],
  });

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [companyAddress, setCompanyAddress] = useState("");
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [suppRes, poRes, deptRes] = await Promise.all([
          api.express.get("/suppliers"),
          api.express.get("/purchase-orders"),
          api.get("/budgeting/form-data"),
        ]);
        setSuppliers(suppRes.data.data.map((s: any) => ({ value: s.id, label: s.supplier_name })));
        setPos(poRes.data.data
          .filter((p: any) => p.status === 'Approved' && !p.is_closed && p.received_status !== 'Full')
          .map((p: any) => ({ value: p.id, label: `${p.reference} (${p.received_status || 'Pending'})` }))
        );
        setDepartments(deptRes.data.departments.map((d: any) => ({ value: d.id, label: d.department_name })));
        
        // Fetch company address from settings
        try {
          const settingsRes = await api.express.get("/settings/company");
          setCompanyAddress(settingsRes.data.company_address || "");
        } catch {}
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingData(false);
      }
    };
    if (isOpen) fetchData();
  }, [isOpen]);

  const fetchNextRef = async (deptId?: number | "") => {
    if (grToEdit) return;
    try {
      setLoadingData(true);
      const params: any = { type: 'BPB' };
      if (deptId) params.department_id = deptId;
      
      const res = await api.express.get("/references/next-reference", params);
      if (res.data.success) {
        setFormData(prev => ({ ...prev, reference: res.data.reference }));
      }
    } catch (err) {
      console.error("Failed to fetch next BPB reference:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (grToEdit) {
        setFormData({
          ...grToEdit,
          bpb_number: grToEdit.bpb_number || "",
          department_id: grToEdit.department_id || "",
          date: grToEdit.date ? new Date(grToEdit.date).toISOString().split("T")[0] : "",
          po_date: grToEdit.po_date ? new Date(grToEdit.po_date).toISOString().split("T")[0] : "",
          received_date: grToEdit.received_date ? new Date(grToEdit.received_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          shipping_address: grToEdit.shipping_address || companyAddress,
          items: grToEdit.details?.map((d: any) => ({
             ...d,
             qty_remaining: d.qty_ordered - (d.qty_received - (d.qty_received_now || 0)) // This is tricky for edit mode
          })) || [],
        });
      } else {
        const initialDeptId = userDepartmentId || "";
        setFormData(prev => {
          if (prev.id || prev.reference) return prev; // Already initialized
          return {
            date: new Date().toISOString().split("T")[0],
            bpb_number: "",
            po_date: "",
            received_date: new Date().toISOString().split("T")[0],
            supplier_id: "",
            department_id: initialDeptId,
            po_id: "",
            pr_id: "",
            note: "",
            shipping_address: companyAddress,
            items: [],
          };
        });
        if (!formData.reference) fetchNextRef(initialDeptId);
      }
    } else {
       // Reset when closed to ensure fresh start next time
       setFormData({
          date: new Date().toISOString().split("T")[0],
          bpb_number: "",
          po_date: "",
          received_date: new Date().toISOString().split("T")[0],
          supplier_id: "",
          department_id: "",
          po_id: "",
          pr_id: "",
          note: "",
          shipping_address: companyAddress,
          items: [],
       });
    }
  }, [isOpen, grToEdit, userDepartmentId]);

  // When company address is fetched, set it if shipping_address is empty
  useEffect(() => {
    if (companyAddress && !formData.shipping_address && !grToEdit) {
      setFormData(prev => ({ ...prev, shipping_address: companyAddress }));
    }
  }, [companyAddress]);

  const handlePoSelect = async (poId: number) => {
    setLoadingData(true);
    try {
      const res = await api.express.get(`/purchase-orders/${poId}`);
      const po = res.data.data;
      const newItems = po.details?.filter((d: any) => Number(d.qty_remaining) > 0).map((d: any) => ({
        product_id: d.product_id,
        product_name: d.product_name,
        product_code: d.product_code,
        qty_ordered: Number(d.quantity),
        qty_remaining: Number(d.qty_remaining),
        qty_received: Number(d.qty_remaining), // Default to remaining
        product_unit: d.product_unit,
      })) || [];

      if (newItems.length === 0) {
        setError("PO ini sudah diterima sepenuhnya.");
        return;
      }

      setFormData(prev => ({
        ...prev,
        po_id: poId,
        pr_id: po.pr_id || "",
        po_date: po.date || "",
        supplier_id: po.supplier_id,
        items: newItems,
        note: `Penerimaan dari PO ${po.reference}. ${po.note || ''}`,
        shipping_address: po.shipping_address || companyAddress,
      }));
      if (po.department_id) fetchNextRef(po.department_id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleItemChange = (index: number, field: keyof GRItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.express.post("/goods-receipts", formData);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save Goods Receipt.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <Truck size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{grToEdit ? "View Goods Receipt" : "Create Penerimaan Barang"}</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {loadingData ? (
            <div className="p-12 text-center animate-pulse flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-bold text-gray-500">Retrieving PO data...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm flex items-start gap-2 border border-red-100">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Row 1: PO, Supplier, BPB Number */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase">Reference PO</label>
                  <SearchableSelect
                    options={pos}
                    placeholder="Select Purchase Order..."
                    onChange={(val) => handlePoSelect(Number(val))}
                    value={formData.po_id}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase">No. S.J. Supplier</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm transition-all"
                    value={formData.bpb_number}
                    onChange={(e) => setFormData({ ...formData, bpb_number: e.target.value })}
                    placeholder="Contoh: SJ-2024-001"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 border-l-2 border-blue-500 pl-2 uppercase tracking-wider text-gray-500">No. Referensi BPB</label>
                  <div className="flex gap-0 overflow-hidden rounded-xl border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all shadow-sm">
                    <input
                      type="text"
                      className="flex-1 px-4 py-3 bg-transparent border-none focus:ring-0 font-bold text-sm text-gray-700"
                      value={formData.reference || ""}
                      onChange={(e) => setFormData({...formData, reference: e.target.value})}
                      placeholder="BPB-XXXXXX"
                    />
                    <button
                      type="button"
                      onClick={() => fetchNextRef(formData.department_id)}
                      className="px-4 bg-[#3b82f6] text-white hover:bg-blue-600 transition-colors flex items-center justify-center border-l border-gray-200"
                      title="Generate Next Reference"
                    >
                      <RefreshCw size={18} className={loadingData ? "animate-spin" : ""} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase">Supplier</label>
                  <SearchableSelect
                    options={suppliers}
                    placeholder="Auto-filled from PO..."
                    onChange={(val) => setFormData({ ...formData, supplier_id: Number(val) })}
                    value={formData.supplier_id}
                  />
                </div>
              </div>

              {/* Row 1.5: Tanggal PO & Departemen */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase">Tanggal PO</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl bg-gray-100 border-none font-bold text-sm text-gray-500"
                    value={formData.po_date}
                    readOnly
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase">Departemen</label>
                  <SearchableSelect
                    options={departments}
                    placeholder="Pilih Departemen..."
                    onChange={(val) => {
                      const dId = Number(val);
                      setFormData({ ...formData, department_id: dId });
                      fetchNextRef(dId);
                    }}
                    value={formData.department_id}
                  />
                </div>
              </div>

              {/* Row 2: Tanggal Terima, Shipping Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase">Tanggal Terima</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm transition-all"
                    value={formData.received_date}
                    onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase">Alamat Pengiriman (Perusahaan)</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm transition-all"
                    value={formData.shipping_address}
                    onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                    placeholder="Alamat pengiriman barang..."
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-gray-100 rounded-3xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left font-black text-gray-400 text-[10px] uppercase">Product Name</th>
                      <th className="px-4 py-3 text-center font-black text-gray-400 text-[10px] uppercase w-24">Ordered</th>
                      <th className="px-4 py-3 text-center font-black text-gray-400 text-[10px] uppercase w-24">Sisa PO</th>
                      <th className="px-4 py-3 text-center font-black text-gray-400 text-[10px] uppercase w-36">Qty Terima</th>
                      <th className="px-4 py-3 text-center font-black text-gray-400 text-[10px] uppercase w-24">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {formData.items.map((item, index) => {
                      const maxQty = item.qty_remaining !== undefined ? item.qty_remaining : item.qty_ordered;
                      return (
                        <tr key={index}>
                          <td className="px-4 py-3 font-bold text-gray-700">
                            {item.product_name}
                            {item.product_code && <span className="text-gray-400 font-normal ml-1">({item.product_code})</span>}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-gray-400">{item.qty_ordered}</td>
                          <td className="px-4 py-3 text-center font-black text-orange-600">{maxQty}</td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min={0}
                              max={maxQty}
                              className="w-full px-3 py-2 rounded-lg bg-emerald-50 border-emerald-200 text-center font-black text-emerald-700 border focus:ring-0"
                              value={item.qty_received}
                              onChange={(e) => {
                                const val = Math.min(Number(e.target.value), maxQty);
                                handleItemChange(index, "qty_received", val);
                              }}
                            />
                            <p className="text-[9px] text-gray-400 text-center mt-0.5">max: {maxQty}</p>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-500 font-bold">{item.product_unit}</td>
                        </tr>
                      );
                    })}
                    {formData.items.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-12 text-center text-gray-400 italic text-sm">
                          Pilih Purchase Order untuk mengisi item penerimaan barang.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase">Catatan</label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm transition-all text-gray-700"
                  placeholder="Catatan kualitas, pengiriman parsial, dll."
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={onClose} className="px-8 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all text-xs uppercase tracking-widest">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || formData.items.length === 0}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-10 py-3 rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95 disabled:opacity-50 text-xs uppercase tracking-widest"
                >
                  <Save size={16} />
                  {submitting ? "Menyimpan..." : "Simpan Penerimaan Barang"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
