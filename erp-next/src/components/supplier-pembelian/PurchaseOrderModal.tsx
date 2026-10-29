"use client";

import { useState, useEffect } from "react";
import { X, Save, AlertCircle, ShoppingBag, Plus, Trash2, RefreshCw } from "lucide-react";
import SearchableSelect from "@/components/ui/SearchableSelect";
import api from "@/lib/api";
import PRSelectionModal from "./PRSelectionModal";

type POItem = {
  id?: number;
  product_id?: number;
  pr_detail_id?: number | null;
  product_name: string;
  product_code: string;
  quantity: number;
  price: number;
  unit_price: number;
  product_unit: string;
  sub_total: number;
  is_asset: boolean;
  product_discount_amount: number;
  product_discount_type: string;
  product_tax_amount: number;
  // Metadata for display
  pr_reference?: string;
  remaining_quantity?: number;
};

type PO = {
  id?: number;
  reference?: string;
  date: string;
  supplier_id: number | "";
  pr_id?: number | null;
  department_id: number | "";
  tax_percentage: number;
  tax_amount: number;
  discount_percentage: number;
  discount_amount: number;
  shipping_amount: number;
  total_amount: number;
  payment_term_id: number | "";
  etd: string;
  shipping_address: string;
  ppn_id: number | "";
  pph_id: number | "";
  note: string;
  dpp_amount: number;
  items: POItem[];
};

type PurchaseOrderModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  poToEdit?: any | null;
  canViewAllDepartments?: boolean;
  userDepartmentId?: number | null;
};

export default function PurchaseOrderModal({
  isOpen,
  onClose,
  onSuccess,
  poToEdit,
  canViewAllDepartments,
  userDepartmentId,
}: PurchaseOrderModalProps) {
  const [formData, setFormData] = useState<PO>({
    date: new Date().toISOString().split("T")[0],
    supplier_id: "",
    pr_id: null,
    department_id: userDepartmentId || "",
    tax_percentage: 11,
    tax_amount: 0,
    discount_percentage: 0,
    discount_amount: 0,
    shipping_amount: 0,
    total_amount: 0,
    payment_term_id: "",
    etd: "",
    shipping_address: "",
    ppn_id: "",
    pph_id: "",
    note: "",
    dpp_amount: 0,
    items: [],
  });

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [availablePrItems, setAvailablePrItems] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<any[]>([]);
  const [ppns, setPpns] = useState<any[]>([]);
  const [pphs, setPphs] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [isPickingPrItems, setIsPickingPrItems] = useState(false);
  
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [suppRes, prItemRes, deptRes, ptRes, prodRes, taxRes, compRes] = await Promise.all([
          api.express.get("/suppliers"),
          api.express.get("/purchase-orders/approved-items"),
          api.get("/budgeting/form-data"),
          api.express.get("/payment-terms"),
          api.get("/products"),
          api.express.get("/suppliers/form-data"),
          api.express.get("/settings/company"),
        ]);

        setSuppliers(suppRes.data.data.map((s: any) => ({ value: s.id, label: s.supplier_name })));
        setAvailablePrItems(prItemRes.data.data);
        setDepartments(deptRes.data.departments.map((d: any) => ({ value: d.id, label: d.department_name })));
        setPaymentTerms(ptRes.data.data.map((pt: any) => ({ value: pt.id, label: pt.name })));
        setProducts(prodRes.data.data.map((p: any) => ({ value: p.id, label: `${p.product_code} - ${p.product_name}`, detail: p })));
        setPpns(taxRes.data.ppns.map((t: any) => ({ value: t.id, label: `${t.name} (${t.rate}%)`, rate: t.rate })));
        setPphs(taxRes.data.pphs.map((t: any) => ({ value: t.id, label: `${t.name} (${t.rate}%)`, rate: t.rate })));
        
        if (compRes.data && compRes.data.company_address) {
          localStorage.setItem("company_address", compRes.data.company_address);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingData(false);
      }
    };

    if (isOpen) fetchData();
  }, [isOpen]);

  const fetchNextRef = async (deptId?: number | "") => {
    if (poToEdit) return;
    try {
      setLoadingData(true);
      const params: any = { type: 'PO' };
      if (deptId) params.department_id = deptId;
      
      const res = await api.express.get("/references/next-reference", params);
      if (res.data.success) {
        setFormData(prev => ({ ...prev, reference: res.data.reference }));
      }
    } catch (err) {
      console.error("Failed to fetch next PO reference:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    const fetchFullPO = async () => {
      if (isOpen && poToEdit) {
        try {
          let fullPo = poToEdit;
          // If details are missing, fetch the full record
          if (!poToEdit.details || poToEdit.details.length === 0) {
            const res = await api.express.get(`/purchase-orders/${poToEdit.id}`);
            if (res.data && res.data.data) {
              fullPo = res.data.data;
            }
          }

          setFormData({
            ...fullPo,
            date: new Date(fullPo.date).toISOString().split("T")[0],
            etd: fullPo.etd ? new Date(fullPo.etd).toISOString().split("T")[0] : "",
            shipping_address: fullPo.shipping_address || "",
            ppn_id: fullPo.ppn_id || "",
            pph_id: fullPo.pph_id || "",
            items: fullPo.details || [],
          });
        } catch (err) {
          console.error("Failed to fetch full PO details:", err);
        }
      } else if (isOpen) {
        // Reset for new PO
        const initialDeptId = userDepartmentId || "";
        setFormData(prev => {
            if (prev.id || prev.reference) return prev;
            return {
                date: new Date().toISOString().split("T")[0],
                reference: "", 
                supplier_id: "",
                pr_id: null,
                department_id: initialDeptId,
                tax_percentage: 11,
                tax_amount: 0,
                discount_percentage: 0,
                discount_amount: 0,
                shipping_amount: 0,
                total_amount: 0,
                payment_term_id: "",
                etd: "",
                shipping_address: localStorage.getItem("company_address") || "",
                ppn_id: "",
                pph_id: "",
                note: "",
                dpp_amount: 0,
                items: [],
            };
        });
        if (!formData.reference) fetchNextRef(initialDeptId);
      }
    };

    fetchFullPO();
  }, [isOpen, poToEdit, userDepartmentId]);

  const calculateTotals = (items: POItem[], discPerc: number, ppnId: number | "", pphId: number | "", ship: number) => {
    const subTotalAll = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unit_price)), 0);
    const discAmount = (subTotalAll * Number(discPerc)) / 100;
    const afterDisc = subTotalAll - discAmount;
    
    const ppnRate = ppns.find(p => p.value === ppnId)?.rate || 0;
    const pphRate = pphs.find(p => p.value === pphId)?.rate || 0;
    
    const taxAmount = (afterDisc * ppnRate) / 100;
    const pphAmount = (afterDisc * pphRate) / 100;
    const total = afterDisc + taxAmount - pphAmount + Number(ship);

    setFormData(prev => ({
      ...prev,
      items,
      tax_percentage: ppnRate,
      tax_amount: taxAmount,
      discount_amount: discAmount,
      dpp_amount: afterDisc,
      total_amount: total
    }));
  };

  const handlePrItemToggle = (prItem: any) => {
    const isSelected = formData.items.some(i => i.pr_detail_id === prItem.id);
    if (isSelected) {
        const newItems = formData.items.filter(i => i.pr_detail_id !== prItem.id);
        calculateTotals(newItems, formData.discount_percentage, formData.ppn_id, formData.pph_id, formData.shipping_amount);
    } else {
        const newItem: POItem = {
            product_id: prItem.product_id,
            pr_detail_id: prItem.id,
            product_name: prItem.product_name,
            product_code: prItem.product_code,
            quantity: prItem.remaining_quantity,
            price: prItem.price,
            unit_price: prItem.unit_price,
            product_unit: prItem.product_unit,
            sub_total: Number(prItem.remaining_quantity) * Number(prItem.unit_price),
            is_asset: prItem.is_asset === 1,
            product_discount_amount: 0,
            product_discount_type: 'fixed',
            product_tax_amount: 0,
            pr_reference: prItem.pr_reference,
            remaining_quantity: prItem.remaining_quantity
        };
        const newItems = [...formData.items, newItem];
        calculateTotals(newItems, formData.discount_percentage, formData.ppn_id, formData.pph_id, formData.shipping_amount);
    }
  };

  const removeItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    calculateTotals(newItems, formData.discount_percentage, formData.ppn_id, formData.pph_id, formData.shipping_amount);
  };

  const handleItemChange = (index: number, field: keyof POItem, value: any) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unit_price') {
        item.sub_total = Number(item.quantity) * Number(item.unit_price);
    }
    
    newItems[index] = item;
    calculateTotals(newItems, formData.discount_percentage, formData.ppn_id, formData.pph_id, formData.shipping_amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (poToEdit) {
        await api.express.put(`/purchase-orders/${poToEdit.id}`, formData);
      } else {
        await api.express.post("/purchase-orders", formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save Purchase Order.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4 text-white">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
              <ShoppingBag size={24} className="text-emerald-50" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">
                {poToEdit ? "Edit Purchase Order" : "Create Purchase Order"}
              </h2>
              <p className="text-emerald-100 text-xs font-medium opacity-80 italic">
                Manage your procurement orders and supplier relations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-all text-white/80 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {loadingData ? (
            <div className="p-12 text-center animate-pulse flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-bold text-gray-500">Loading procurement data...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm flex items-start gap-2 border border-red-100">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase tracking-wider">Nomor PO</label>
                    <div className="flex gap-0 overflow-hidden rounded-xl border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-all shadow-sm">
                      <input
                        type="text"
                        className="flex-1 px-4 py-3 bg-transparent border-none focus:ring-0 font-bold text-sm text-gray-700"
                        value={formData.reference || ""}
                        onChange={(e) => setFormData({...formData, reference: e.target.value})}
                        placeholder="P-XXXXXX"
                      />
                      <button
                        type="button"
                        onClick={() => fetchNextRef(formData.department_id)}
                        className="px-4 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center border-l border-gray-200"
                        title="Generate Next Reference"
                      >
                        <RefreshCw size={18} className={loadingData ? "animate-spin" : ""} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase tracking-wider">PO Date</label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm transition-all"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase tracking-wider">Estimated Delivery (ETD)</label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm transition-all"
                      value={formData.etd}
                      onChange={(e) => setFormData({...formData, etd: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase tracking-wider">Supplier</label>
                    <SearchableSelect
                      options={suppliers}
                      placeholder="Select supplier..."
                      onChange={(val) => setFormData({...formData, supplier_id: Number(val)})}
                      value={formData.supplier_id}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase tracking-wider">Department</label>
                    <SearchableSelect
                      options={departments}
                      placeholder="Select department..."
                      onChange={(val) => {
                        const dId = Number(val);
                        setFormData({...formData, department_id: dId});
                        fetchNextRef(dId);
                      }}
                      value={formData.department_id}
                      disabled={!canViewAllDepartments}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 h-full flex flex-col">
                  <label className="text-xs font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase tracking-wider">Shipping Address</label>
                  <textarea
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm transition-all flex-1"
                    placeholder="Enter full shipping address..."
                    value={formData.shipping_address}
                    onChange={(e) => setFormData({...formData, shipping_address: e.target.value})}
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-between items-end">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPickingPrItems(true)}
                    className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100 shadow-sm shadow-emerald-50"
                  >
                    <Plus size={16} /> Import from Approved PR
                  </button>
                </div>
              </div>

              <div className="border border-gray-100 rounded-3xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left font-black text-gray-400 text-[10px] uppercase">Product / Item</th>
                      <th className="px-4 py-3 text-center font-black text-gray-400 text-[10px] uppercase w-24">Qty</th>
                      <th className="px-4 py-3 text-center font-black text-gray-400 text-[10px] uppercase w-24">Unit</th>
                      <th className="px-4 py-3 text-right font-black text-gray-400 text-[10px] uppercase w-36">Unit Price</th>
                      <th className="px-4 py-3 text-right font-black text-gray-400 text-[10px] uppercase w-40">Sub Total</th>
                      <th className="px-4 py-3 text-center font-black text-gray-400 text-[10px] uppercase w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {formData.items.map((item, index) => (
                      <tr key={index} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            className="w-full px-3 py-2 rounded-lg bg-gray-100 border-none font-bold text-sm text-gray-600"
                            value={item.product_code ? `${item.product_code} - ${item.product_name}` : item.product_name || ''}
                            readOnly
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            className="w-full px-3 py-2 rounded-lg bg-gray-50 border-none text-center font-bold text-sm"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            className="w-full px-3 py-2 rounded-lg bg-gray-100 border-none text-center font-bold text-xs"
                            value={item.product_unit}
                            readOnly
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            className="w-full px-3 py-2 rounded-lg bg-gray-100 border-none text-right font-bold text-sm text-gray-600"
                            value={item.unit_price}
                            readOnly
                          />
                        </td>
                        <td className="px-4 py-2 text-right font-black text-gray-700">
                          Rp {Number(item.sub_total).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {formData.items.length === 0 && (
                  <div className="p-12 text-center bg-gray-50/30 border-t border-gray-50 italic text-gray-400 text-sm">
                    No items added yet. Click "Import from Approved PR" to begin.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase">Payment Term</label>
                    <SearchableSelect
                        options={paymentTerms}
                        placeholder="Select payment term..."
                        onChange={(val) => setFormData({...formData, payment_term_id: Number(val)})}
                        value={formData.payment_term_id}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase">PPN (Tax)</label>
                        <SearchableSelect
                            options={ppns}
                            placeholder="Select PPN..."
                            value={formData.ppn_id}
                            onChange={(val) => {
                                setFormData({...formData, ppn_id: Number(val)});
                                calculateTotals(formData.items, formData.discount_percentage, Number(val), formData.pph_id, formData.shipping_amount);
                            }}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase">PPH (Income Tax)</label>
                        <SearchableSelect
                            options={pphs}
                            placeholder="Select PPH..."
                            value={formData.pph_id}
                            onChange={(val) => {
                                setFormData({...formData, pph_id: Number(val)});
                                calculateTotals(formData.items, formData.discount_percentage, formData.ppn_id, Number(val), formData.shipping_amount);
                            }}
                        />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase">Internal Note</label>
                    <textarea
                      rows={3}
                      className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm transition-all"
                      placeholder="Add internal notes here..."
                      value={formData.note}
                      onChange={(e) => setFormData({...formData, note: e.target.value})}
                    />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-3xl p-6 space-y-4">
                  <div className="flex justify-between items-center text-gray-500">
                    <span className="font-bold">Sub total</span>
                    <span className="font-black">Rp {formData.items.reduce((acc, i) => acc + (Number(i.quantity) * Number(i.unit_price)), 0).toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center text-gray-500">
                    <span className="font-bold">Discount</span>
                    <div className="flex items-center bg-white rounded-lg px-2 border border-gray-200">
                        <input
                            type="number"
                            className="w-12 py-1 text-center font-bold text-xs border-none focus:ring-0"
                            value={formData.discount_percentage}
                            onChange={(e) => {
                                const val = Number(e.target.value);
                                setFormData({...formData, discount_percentage: val});
                                calculateTotals(formData.items, val, formData.ppn_id, formData.pph_id, formData.shipping_amount);
                            }}
                        />
                        <span className="text-xs text-gray-400 font-black">%</span>
                    </div>
                    <span className="font-black text-gray-700">- Rp {formData.discount_amount.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center bg-emerald-50/50 p-2 rounded-xl border border-emerald-100">
                    <span className="font-bold text-emerald-800">DPP (Tax Base)</span>
                    <span className="font-black text-emerald-700">Rp {formData.dpp_amount.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-gray-500">
                    <span className="font-bold">PPN (Tax)</span>
                    <span className="font-black text-emerald-700">+ Rp {formData.tax_amount.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center text-gray-500 border-b border-gray-200 pb-4">
                    <span className="font-bold">PPH (Income Tax)</span>
                    <span className="font-black text-emerald-700">- Rp {(formData.items.reduce((acc, i) => acc + (Number(i.quantity) * Number(i.unit_price)), 0) * (pphs.find(p => p.value === formData.pph_id)?.rate || 0) / 100).toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center gap-4 border-b border-gray-200 pb-4">
                    <span className="font-bold text-gray-500">Shipping</span>
                    <div className="flex items-center bg-white rounded-lg px-3 border border-gray-200 w-40">
                         <span className="text-xs text-gray-400 font-bold mr-1">Rp</span>
                         <input
                            type="number"
                            className="w-full py-1 text-right font-bold text-xs border-none focus:ring-0"
                            value={formData.shipping_amount}
                            onChange={(e) => {
                                const val = Number(e.target.value);
                                setFormData({...formData, shipping_amount: val});
                                calculateTotals(formData.items, formData.discount_percentage, formData.ppn_id, formData.pph_id, val);
                            }}
                        />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-lg font-black text-gray-800">Grand Total</span>
                    <span className="text-2xl font-black text-emerald-600">Rp {formData.total_amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all active:scale-95 text-xs uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || formData.items.length === 0}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-10 py-3 rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100 text-xs uppercase tracking-widest"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Purchase Order
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* PR Selection Modal */}
      <PRSelectionModal
        isOpen={isPickingPrItems}
        onClose={() => setIsPickingPrItems(false)}
        availablePrItems={availablePrItems}
        onSelect={(selectedPrIds) => {
          const numericSelectedIds = selectedPrIds.map(id => Number(id));
          const selectedItems = availablePrItems.filter(i => numericSelectedIds.includes(Number(i.purchase_id)));
          const newItems = [...formData.items];
          
          selectedItems.forEach(item => {
            // Check if item already exists to avoid duplicates
            if (!newItems.some(i => Number(i.pr_detail_id) === Number(item.id))) {
              newItems.push({
                product_id: Number(item.product_id),
                pr_detail_id: Number(item.id),
                product_name: String(item.product_name),
                product_code: String(item.product_code || '-'),
                quantity: Number(item.remaining_quantity),
                price: Number(item.price),
                unit_price: Number(item.unit_price),
                product_unit: String(item.product_unit),
                sub_total: Number(item.remaining_quantity) * Number(item.unit_price),
                is_asset: item.is_asset === 1,
                product_discount_amount: 0,
                product_discount_type: 'fixed',
                product_tax_amount: 0,
                pr_reference: String(item.pr_reference),
                remaining_quantity: Number(item.remaining_quantity)
              });
            }
          });
          
          calculateTotals(newItems, formData.discount_percentage, formData.ppn_id, formData.pph_id, formData.shipping_amount);
          setIsPickingPrItems(false);
        }}
      />
    </div>
  );
}
