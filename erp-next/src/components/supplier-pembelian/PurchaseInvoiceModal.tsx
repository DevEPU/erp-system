"use client";

import { useState, useEffect } from "react";
import { X, Save, AlertCircle, Receipt, FileText, RefreshCw } from "lucide-react";
import SearchableSelect from "@/components/ui/SearchableSelect";
import api from "@/lib/api";

type PIItem = {
  id?: number;
  product_id?: number;
  product_name: string;
  product_code: string;
  quantity: number;
  price: number;
  unit_price: number;
  product_unit: string;
  sub_total: number;
  ppn_id?: number;
  pph_id?: number;
  product_tax_amount: number;
};

type PI = {
  id?: number;
  reference?: string;
  date: string;
  invoice_reference: string;
  invoice_date: string;
  supplier_id: number | "";
  po_id?: number | "";
  gr_ids: number[];
  department_id: number | "";
  shipping_address: string;
  payment_term_id?: number | "";
  due_date: string;
  tax_id?: number | "";
  tax_percentage: number;
  tax_amount: number;
  discount_percentage: number;
  discount_amount: number;
  shipping_amount: number;
  total_amount: number;
  due_amount?: number;
  dpp_amount: number;
  pph_id?: number | "";
  pph_amount: number;
  paid_amount: number;
  note: string;
  items: PIItem[];
};

type PurchaseInvoiceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  piToEdit?: any | null;
  userDepartmentId?: number | null;
};

export default function PurchaseInvoiceModal({
  isOpen,
  onClose,
  onSuccess,
  piToEdit,
  userDepartmentId,
}: PurchaseInvoiceModalProps) {
  const [formData, setFormData] = useState<PI>({
    date: new Date().toISOString().split("T")[0],
    invoice_reference: "",
    invoice_date: new Date().toISOString().split("T")[0],
    supplier_id: "",
    po_id: "",
    gr_ids: [],
    department_id: "",
    shipping_address: "",
    payment_term_id: "",
    due_date: new Date().toISOString().split("T")[0],
    tax_id: "",
    tax_percentage: 0,
    tax_amount: 0,
    discount_percentage: 0,
    discount_amount: 0,
    shipping_amount: 0,
    total_amount: 0,
    due_amount: 0,
    dpp_amount: 0,
    pph_id: "",
    pph_amount: 0,
    paid_amount: 0,
    note: "",
    items: [],
  });

  const [pos, setPos] = useState<any[]>([]);
  const [grs, setGrs] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<any[]>([]);
  const [supplierData, setSupplierData] = useState<any>(null);
  const [ppns, setPpns] = useState<any[]>([]);
  const [pphs, setPphs] = useState<any[]>([]);
  const [selectedPo, setSelectedPo] = useState<any>(null);
  
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const deptToFetch = formData.department_id || userDepartmentId;
        console.log(`[DEBUG] PI Modal fetching POs for dept: ${deptToFetch}`);
        
        const [poRes, deptRes, ptRes, ppnRes, pphRes] = await Promise.all([
          api.express.get("/purchase-orders", { 
            params: { 
                all: "true"
            } 
          }),
          api.express.get("/departments"),
          api.express.get("/payment-terms"),
          api.express.get("/ppn"),
          api.express.get("/pph"),
        ]);
        
        const filtered = poRes.data.data.filter((p: any) =>
            p.status?.toLowerCase() === 'approved' &&
            (p.is_closed == 0 || p.is_closed == false || !p.is_closed) &&
            (Number(p.uninvoiced_gr_count) > 0 || String(p.id) === String(formData.po_id))
        );
        
        setPos(filtered.map((p: any) => ({ value: p.id, label: p.reference, detail: p })));
        setDepartments(deptRes.data.data.map((d: any) => ({ value: d.id, label: d.department_name })));
        setPaymentTerms(ptRes.data.data.map((pt: any) => ({ value: pt.id, label: pt.name, detail: pt })));
        setPpns([
            { value: 0, label: "Tanpa PPN (0%)", rate: 0 },
            ...ppnRes.data.data.map((p: any) => ({ value: p.id, label: p.name, rate: p.rate }))
        ]);
        setPphs([
            { value: 0, label: "Tanpa PPH (0%)", rate: 0 },
            ...pphRes.data.data.map((p: any) => ({ value: p.id, label: p.name, rate: p.rate }))
        ]);
      } catch (err) {
        console.error("Error fetching PI data:", err);
      } finally {
        setLoadingData(false);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen, formData.department_id, userDepartmentId]);

  const fetchNextRef = async (deptId?: number | "") => {
    if (piToEdit) return;
    try {
      setLoadingData(true);
      const params: any = { type: 'INV' };
      if (deptId) params.department_id = deptId;
      
      const res = await api.express.get("/references/next-reference", params);
      if (res.data.success) {
        setFormData(prev => ({ ...prev, reference: res.data.reference }));
      }
    } catch (err) {
      console.error("Failed to fetch next Invoice reference:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (piToEdit) {
        let parsedGrIds = [];
        try {
           parsedGrIds = piToEdit.gr_ids ? JSON.parse(piToEdit.gr_ids) : [];
        } catch { }

        setFormData({
          ...piToEdit,
          date: piToEdit.date ? new Date(piToEdit.date).toISOString().split("T")[0] : "",
          invoice_reference: piToEdit.invoice_reference || "",
          invoice_date: piToEdit.invoice_date ? new Date(piToEdit.invoice_date).toISOString().split("T")[0] : "",
          due_date: piToEdit.due_date ? new Date(piToEdit.due_date).toISOString().split("T")[0] : "",
          gr_ids: parsedGrIds,
          department_id: piToEdit.department_id || "",
          shipping_address: piToEdit.shipping_address || "",
          items: piToEdit.details || [],
        });
        
        // Also fetch GRs if editing
        if (piToEdit.po_id) {
            handlePoSelect(piToEdit.po_id, false);
        }
      } else {
        const initialDeptId = userDepartmentId || "";
        setFormData({
            date: new Date().toISOString().split("T")[0],
            invoice_reference: "",
            invoice_date: new Date().toISOString().split("T")[0],
            supplier_id: "",
            po_id: "",
            gr_ids: [],
            department_id: initialDeptId,
            shipping_address: "",
            payment_term_id: "",
            due_date: new Date().toISOString().split("T")[0],
            tax_id: "",
            tax_percentage: 0,
            tax_amount: 0,
            discount_percentage: 0,
            discount_amount: 0,
            shipping_amount: 0,
            total_amount: 0,
            dpp_amount: 0,
            pph_id: "",
            pph_amount: 0,
            paid_amount: 0,
            note: "",
            items: [],
        });
        setGrs([]);
        if (initialDeptId) fetchNextRef(initialDeptId);
      }
    } else {
       // Reset on close to be safe
       setError(null);
       setSelectedPo(null);
    }
  }, [isOpen, piToEdit, userDepartmentId]);

  const handlePoSelect = async (poId: number, clearItems = true) => {
    if (!poId) return;
    setLoadingData(true);
    try {
        const po = pos.find((p) => String(p.value) === String(poId))?.detail;
        let poDetail = po;

        // ALWAYS fetch PO detail to ensure we have po.details for pricing
        const poRes = await api.express.get(`/purchase-orders/${poId}`);
        const fetchedPoDetail = poRes.data.data;
        if (fetchedPoDetail) {
             poDetail = fetchedPoDetail;
             setSelectedPo(fetchedPoDetail);
        } else if (po) {
             setSelectedPo(po);
        }

        // Fetch GRs for this PO - only show uninvoiced ones
        const grRes = await api.express.get(`/goods-receipts/by-po/${poId}`);
        const fetchedGrs = grRes.data.data || [];
        
        // When editing, we must include the GRs that are ALREADY selected in this invoice
        const currentGrIds = Array.isArray(formData.gr_ids) ? formData.gr_ids.map(Number) : [];
        const availableGrs = fetchedGrs.filter((g: any) => !g.is_invoiced || currentGrIds.includes(Number(g.id)));
        
        const invoicedCount = fetchedGrs.length - availableGrs.length;

        if (availableGrs.length === 0 && fetchedGrs.length > 0) {
            setError(`Semua BPB pada PO ini (${invoicedCount} BPB) sudah dibuatkan faktur pembelian.`);
            setGrs([]);
            return;
        }

        setGrs(availableGrs.map((g: any) => ({
            value: g.id,
            label: `${g.reference}${g.is_invoiced ? ` (Already Invoiced)` : ''}`,
            detail: g
        })));

        if (poDetail && clearItems) {
            // Fetch Supplier to get Address
            const suppRes = await api.express.get(`/suppliers/${poDetail.supplier_id}`);
            const supp = suppRes.data.data;
            setSupplierData(supp);

            setFormData((prev) => ({
                ...prev,
                po_id: poId,
                department_id: poDetail.department_id,
                supplier_id: poDetail.supplier_id,
                shipping_address: supp.address || "",
                items: [],
            }));
            if (poDetail.department_id) fetchNextRef(poDetail.department_id);
        }
    } catch (err) {
        console.error(err);
    } finally {
        setLoadingData(false);
    }
  };

  const handleGrSelect = (selectedGrIds: any[]) => {
      console.log("[DEBUG] handleGrSelect called with:", selectedGrIds);
      
      const ids = Array.isArray(selectedGrIds) ? selectedGrIds : [selectedGrIds];
      const numericIds = ids.map(id => (typeof id === 'object' ? id.value : id)).map(Number);
      
      if (numericIds.length === 0 || !numericIds[0]) {
          setFormData((prev) => ({ ...prev, gr_ids: [], items: [] }));
          calculateTotals([], formData.discount_percentage, formData.tax_percentage, formData.shipping_amount);
          return;
      }

      // Aggregate items from selected GRs
      const poDetails = selectedPo?.details || [];
      const aggregatedItems: any[] = [];

      numericIds.forEach(grId => {
          const grOption = grs.find(g => String(g.value) === String(grId));
          const grDetail = grOption?.detail;
          
          console.log(`[DEBUG] Processing GR ${grId}, found detail:`, !!grDetail);
          
          if (grDetail && grDetail.details) {
              console.log(`[DEBUG] GR ${grId} has ${grDetail.details.length} item details`);
              grDetail.details.forEach((d: any) => {
                  const poItem = poDetails.find((px: any) => String(px.product_id) === String(d.product_id));
                  const price = poItem ? poItem.price : 0;
                  const unit_price = poItem ? poItem.unit_price : (d.price || 0);

                  // Check if item already exists in aggregated items, add qty if so
                  const existingItemIndex = aggregatedItems.findIndex(i => String(i.product_id) === String(d.product_id));
                  if (existingItemIndex > -1) {
                      aggregatedItems[existingItemIndex].quantity = Number(aggregatedItems[existingItemIndex].quantity) + Number(d.qty_received);
                      aggregatedItems[existingItemIndex].sub_total = Number(aggregatedItems[existingItemIndex].quantity) * Number(unit_price);
                  } else {
                      aggregatedItems.push({
                          product_id: d.product_id,
                          product_name: d.product_name,
                          product_code: d.product_code,
                          quantity: Number(d.qty_received),
                          price: Number(price),
                          unit_price: Number(unit_price),
                          product_unit: d.product_unit,
                          sub_total: Number(unit_price) * Number(d.qty_received),
                          product_tax_amount: 0
                      });
                  }
              });
          }
      });

      console.log(`[DEBUG] Aggregated ${aggregatedItems.length} items`);

      setFormData(prev => ({
          ...prev,
          gr_ids: numericIds,
          items: aggregatedItems,
          note: `Invoiced from GRs: ${numericIds.map(id => grs.find(g => String(g.value) === String(id))?.label || id).join(", ")}.`
      }));

      calculateTotals(aggregatedItems, formData.discount_percentage, formData.tax_percentage, formData.shipping_amount);
  };

  const calculateTotals = (items: PIItem[], discPerc: number, taxPerc: number, ship: number) => {
    const subTotalAll = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unit_price)), 0);
    const discAmount = (subTotalAll * discPerc) / 100;
    const dppAmount = subTotalAll - discAmount;
    const taxAmount = (dppAmount * taxPerc) / 100;
    
    // PPH logic (matching PO)
    const pphRate = pphs.find(p => p.value === formData.pph_id)?.rate || 0;
    const pphAmount = (dppAmount * pphRate) / 100;
    
    const total = dppAmount + taxAmount - pphAmount + Number(ship);

    setFormData(prev => ({
      ...prev,
      items,
      dpp_amount: dppAmount,
      tax_amount: taxAmount,
      pph_amount: pphAmount,
      discount_amount: discAmount,
      total_amount: total,
      due_amount: total - (prev.paid_amount || 0)
    }));
  };

  const handlePtSelect = (ptId: number) => {
      const term = paymentTerms.find(p => p.value === ptId)?.detail;
      if (term) {
          const d = new Date(formData.date);
          d.setDate(d.getDate() + Number(term.days));
          setFormData({ ...formData, payment_term_id: ptId, due_date: d.toISOString().split('T')[0] });
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (piToEdit) {
        await api.express.put(`/purchase-invoices/${piToEdit.id}`, formData);
      } else {
        await api.express.post("/purchase-invoices", formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save Purchase Invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 text-gray-800">
      <div className="bg-white rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <Receipt size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                  {piToEdit ? "View Faktur Pembelian" : "Create Faktur Pembelian"}
              </h2>
              {formData.reference && (
                  <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">{formData.reference}</p>
              )}
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
                <p className="font-bold text-gray-400">Loading data...</p>
             </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm flex items-start gap-2 border border-red-100 animate-in slide-in-from-top-2">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Row 1: Pilih PO, Ref Faktur, Tgl Register Faktur, Invoice Date */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 border-l-2 border-blue-500 pl-2 uppercase tracking-wider text-gray-500">No. Referensi Internal</label>
                  <div className="flex gap-0 overflow-hidden rounded-xl border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all shadow-sm">
                    <input
                      type="text"
                      className="flex-1 px-4 py-3 bg-transparent border-none focus:ring-0 font-bold text-sm text-gray-700"
                      value={formData.reference || ""}
                      onChange={(e) => setFormData({...formData, reference: e.target.value})}
                      placeholder="INV-XXXXXX"
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
                  <label className="text-[10px] font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase tracking-widest">Pilih PO</label>
                  <SearchableSelect
                    options={pos}
                    placeholder="Select Purchase Order..."
                    onChange={(val) => handlePoSelect(Number(val))}
                    value={formData.po_id}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase tracking-widest">Ref Faktur (Supplier)</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm transition-all"
                    placeholder="Contoh: INV-992-XYZ"
                    value={formData.invoice_reference}
                    onChange={(e) => setFormData({...formData, invoice_reference: e.target.value})}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase tracking-widest">Tgl Entry Faktur</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm transition-all shadow-inner"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase tracking-widest">Tgl Invoice (Asli)</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm transition-all shadow-inner"
                    value={formData.invoice_date}
                    onChange={(e) => setFormData({...formData, invoice_date: e.target.value})}
                    required
                  />
                </div>
              </div>

              {/* Row 2: Pilih BPB, Terms, Due Date, Dept */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase tracking-widest">Pilih BPB / GR</label>
                  <SearchableSelect
                    options={grs}
                    placeholder="Multi Select GR..."
                    onChange={(val) => handleGrSelect(val as any)}
                    value={formData.gr_ids}
                    isMulti={true}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase tracking-widest">Payment Term</label>
                   <SearchableSelect
                    options={paymentTerms}
                    placeholder="Select terms..."
                    onChange={(val) => handlePtSelect(Number(val))}
                    value={formData.payment_term_id}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase tracking-widest">Tgl Jatuh Tempo</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl bg-orange-50 border-none focus:ring-2 focus:ring-orange-500 font-black text-sm transition-all text-orange-700 shadow-inner"
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase tracking-widest">Department</label>
                  <SearchableSelect
                    options={departments}
                    placeholder="Select Dept..."
                    onChange={(val) => setFormData((prev) => ({ ...prev, department_id: Number(val) }))}
                    value={formData.department_id}
                  />
                </div>
              </div>

              {/* Row 3: Shipping Address */}
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase tracking-widest">Alamat Pengiriman</label>
                  <textarea
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm transition-all text-gray-700"
                    placeholder="Alamat Pengiriman..."
                    value={formData.shipping_address}
                    onChange={(e) => setFormData({...formData, shipping_address: e.target.value})}
                  />
                </div>

              <div className="border border-gray-100 rounded-3xl overflow-hidden shadow-sm bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left font-black text-gray-400 text-[10px] uppercase tracking-widest">Item Description</th>
                      <th className="px-4 py-4 text-center font-black text-gray-400 text-[10px] uppercase tracking-widest w-20">Qty</th>
                      <th className="px-4 py-4 text-center font-black text-gray-400 text-[10px] uppercase tracking-widest w-20">UOM</th>
                      <th className="px-4 py-4 text-right font-black text-gray-400 text-[10px] uppercase tracking-widest w-36">Unit Price</th>
                      <th className="px-6 py-4 text-right font-black text-gray-400 text-[10px] uppercase tracking-widest w-40">Sub Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {formData.items.map((item, index) => (
                      <tr key={index} className="group hover:bg-emerald-50/30 transition-colors">
                        <td className="px-6 py-4">
                           <div className="flex flex-col">
                              <span className="font-bold text-gray-800">{item.product_name}</span>
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{item.product_code}</span>
                           </div>
                        </td>
                        <td className="px-4 py-4 text-center font-black text-gray-700">{item.quantity}</td>
                        <td className="px-4 py-4 text-center font-bold text-gray-400 text-[10px] uppercase">{item.product_unit}</td>
                        <td className="px-4 py-4 text-right font-bold text-gray-600">Rp {item.unit_price.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right font-black text-emerald-600">Rp {item.sub_total.toLocaleString()}</td>
                      </tr>
                    ))}
                    {formData.items.length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-bold italic">
                                Pilih BPB untuk menampilkan produk yang difaktur.
                            </td>
                        </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                   {/* Tax Selections */}
                   <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase tracking-widest">Pajak PPN</label>
                           <SearchableSelect
                               options={ppns}
                               placeholder="Pilih PPN..."
                               value={formData.tax_id}
                               onChange={(val) => {
                                   const taxId = Number(val);
                                   const rate = ppns.find(p => p.value === taxId)?.rate || 0;
                                   setFormData({...formData, tax_id: taxId, tax_percentage: rate});
                                   calculateTotals(formData.items, formData.discount_percentage, rate, formData.shipping_amount);
                               }}
                           />
                       </div>
                       <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase tracking-widest">Pajak PPH</label>
                           <SearchableSelect
                               options={pphs}
                               placeholder="Pilih PPH..."
                               value={formData.pph_id}
                               onChange={(val) => {
                                   const pphId = Number(val);
                                   const pphRate = pphs.find(p => p.value === pphId)?.rate || 0;
                                   
                                   const subTotalAll = formData.items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unit_price)), 0);
                                   const discAmount = (subTotalAll * formData.discount_percentage) / 100;
                                   const dppAmount = subTotalAll - discAmount;
                                   const taxAmount = (dppAmount * formData.tax_percentage) / 100;
                                   const pphAmount = (dppAmount * pphRate) / 100;
                                   const total = dppAmount + taxAmount - pphAmount + Number(formData.shipping_amount);
                                   
                                   setFormData(p => ({ 
                                       ...p, 
                                       pph_id: pphId, 
                                       pph_amount: pphAmount, 
                                       total_amount: total, 
                                       due_amount: total - (p.paid_amount || 0) 
                                   }));
                               }}
                           />
                       </div>
                   </div>

                   <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 space-y-4">
                      <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                         <FileText size={14} /> Finance Integration Note
                      </h4>
                      <p className="text-xs font-medium text-blue-800/70 leading-relaxed italic border-l-2 border-blue-200 pl-4">
                         Upon saving, this invoice will automatically post to the General Ledger. 
                         Debit to Inventory/Expense and Credit to Accounts Payable.
                      </p>
                      <textarea
                        rows={3}
                        className="w-full px-4 py-3 rounded-2xl bg-white border-blue-100 focus:ring-2 focus:ring-blue-500 font-medium text-sm transition-all text-gray-700 border"
                        placeholder="Public note for the invoice..."
                        value={formData.note}
                        onChange={(e) => setFormData({...formData, note: e.target.value})}
                      />
                   </div>
                </div>

                <div className="bg-gray-900 rounded-[2.5rem] p-8 space-y-5 text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                  
                  <div className="flex justify-between items-center opacity-60">
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Net Total Items</span>
                    <span className="font-black text-base tracking-tighter">Rp {formData.items.reduce((acc, i) => acc + i.sub_total, 0).toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold uppercase tracking-widest opacity-60">Discount</span>
                        <div className="flex items-center bg-gray-800 rounded-lg px-2 border border-gray-700">
                            <input
                                type="number"
                                className="w-10 py-1 text-center font-black text-xs border-none bg-transparent focus:ring-0 text-white"
                                value={formData.discount_percentage}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setFormData({...formData, discount_percentage: val});
                                    calculateTotals(formData.items, val, formData.tax_percentage, formData.shipping_amount);
                                }}
                            />
                            <span className="text-[10px] text-gray-500 font-black">%</span>
                        </div>
                    </div>
                    <span className="font-black text-rose-400">- Rp {formData.discount_amount.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded-xl border border-gray-700">
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">DPP (Tax Base)</span>
                    <span className="font-black text-emerald-400">Rp {(formData.dpp_amount || 0).toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center opacity-60">
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">VAT / PPN ({formData.tax_percentage}%)</span>
                    <span className="font-black text-emerald-400">+ Rp {formData.tax_amount.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center opacity-60">
                    <span className="text-xs font-bold uppercase tracking-widest text-rose-400">PPH ({pphs.find(p => p.value === formData.pph_id)?.rate || 0}%)</span>
                    <span className="font-black text-rose-400">- Rp {(formData.pph_amount || 0).toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold uppercase tracking-widest opacity-60">Shipping</span>
                        <input
                            type="number"
                            className="w-24 py-1 px-2 text-right font-black text-xs border border-gray-700 rounded-lg bg-gray-800 focus:ring-0 text-white"
                            value={formData.shipping_amount}
                            onChange={(e) => {
                                const val = Number(e.target.value);
                                setFormData({...formData, shipping_amount: val});
                                calculateTotals(formData.items, formData.discount_percentage, formData.tax_percentage, val);
                            }}
                        />
                    </div>
                    <span className="font-black text-emerald-400">+ Rp {(formData.shipping_amount || 0).toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center border-t border-gray-800 pt-4 opacity-60">
                    <span className="text-xs font-bold uppercase tracking-widest text-rose-400">Uang Muka (DP)</span>
                    <div className="flex items-center bg-gray-800 rounded-lg px-2 border border-gray-700">
                        <span className="text-[10px] text-gray-500 font-black mr-1">Rp</span>
                        <input
                            type="number"
                            className="w-28 py-1 text-right font-black text-xs border-none bg-transparent focus:ring-0 text-white"
                            value={formData.paid_amount || 0}
                            onChange={(e) => {
                                const val = Number(e.target.value);
                                setFormData(p => ({...p, paid_amount: val, due_amount: p.total_amount - val}));
                            }}
                        />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 mb-1">Final Billable</span>
                        <span className="text-3xl font-black tracking-tighter">Rp {formData.total_amount.toLocaleString()}</span>
                    </div>
                    <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 animate-pulse text-center">
                        <span className="text-[8px] font-black text-gray-500 uppercase block mb-1">Due Amount</span>
                        <span className="text-xs font-black text-emerald-400 block">Rp {(formData.due_amount || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-3 rounded-2xl font-bold text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all text-xs uppercase tracking-widest group"
                >
                  Discard <span className="group-hover:translate-x-1 inline-block transition-transform">→</span>
                </button>
                <button
                  type="submit"
                  disabled={submitting || formData.items.length === 0}
                  className="relative group bg-emerald-600 text-white px-12 py-3 rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-[0_20px_50px_rgba(16,185,129,0.3)] hover:shadow-[0_20px_50px_rgba(16,185,129,0.4)] active:scale-95 disabled:opacity-50 text-xs uppercase tracking-[0.2em]"
                >
                  {submitting ? "Posting to Ledger..." : "Post Faktur & Journal"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
