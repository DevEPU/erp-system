"use client";

import { useState, useEffect } from "react";
import { 
  Zap, 
  Save, 
  Plus, 
  Trash2, 
  AlertCircle, 
  ArrowLeft,
  Building2,
  Calendar,
  CreditCard
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SearchableSelect from "@/components/ui/SearchableSelect";
import api from "@/lib/api";
import usePermission from "@/hooks/usePermission";

export default function DirectPurchasePage() {
  const router = useRouter();
  const { user } = usePermission();
  const [formData, setFormData] = useState<any>({
    date: new Date().toISOString().split("T")[0],
    supplier_id: "",
    department_id: "",
    note: "",
    items: [],
    tax_percentage: 11,
    tax_amount: 0,
    discount_percentage: 0,
    discount_amount: 0,
    total_amount: 0,
    pr_type: "direct", // SPECIAL TYPE
    status: "approved" // AUTO APPROVED
  });

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [suppRes, deptRes, prodRes, catRes] = await Promise.all([
          api.express.get("/suppliers"),
          api.get("/budgeting/form-data"),
          api.get("/products"),
          api.get("/product-categories")
        ]);
        setSuppliers(suppRes.data.data.map((s: any) => ({ value: s.id, label: s.supplier_name })));
        setDepartments(deptRes.data.departments.map((d: any) => ({ value: d.id, label: d.department_name })));
        setProducts(prodRes.data.data.map((p: any) => ({ value: p.id, label: `${p.product_code} - ${p.product_name}`, detail: p })));
        setCategories(catRes.data.data.map((c: any) => ({ value: c.id, label: c.category_name })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
      if (user && user.department_id && !formData.department_id) {
          setFormData({...formData, department_id: user.department_id});
      }
  }, [user]);

  const fetchNextRef = async (deptId: number | "") => {
    if (!deptId) return;
    try {
      const res = await api.express.get("/references/next-reference", {
        params: { type: 'PL', department_id: deptId }
      });
      if (res.data.success) {
        setFormData((prev: any) => ({ ...prev, reference: res.data.reference }));
      }
    } catch (err) {
      console.error("Failed to fetch next PL reference:", err);
    }
  };

  const calculateTotals = (items: any[], disc: number, tax: number) => {
    const subTotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unit_price)), 0);
    const discAmt = (subTotal * disc) / 100;
    const taxAmt = ((subTotal - discAmt) * tax) / 100;
    const total = (subTotal - discAmt) + taxAmt;

    setFormData({
      ...formData,
      items,
      tax_amount: taxAmt,
      discount_amount: discAmt,
      total_amount: total
    });
  };

  const addItem = () => {
    const newItem = {
      product_id: null,
      product_name: "",
      product_code: "",
      quantity: 1,
      unit_price: 0,
      sub_total: 0,
      product_unit: "PCS",
      category_id: null
    };
    calculateTotals([...formData.items, newItem], formData.discount_percentage, formData.tax_percentage);
  };

  const removeItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    calculateTotals(newItems, formData.discount_percentage, formData.tax_percentage);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === "quantity" || field === "unit_price") {
        newItems[index].sub_total = Number(newItems[index].quantity) * Number(newItems[index].unit_price);
    }
    
    calculateTotals(newItems, formData.discount_percentage, formData.tax_percentage);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.items.length === 0) return alert("Pilih minimal 1 item!");
    
    setSubmitting(true);
    setError(null);

    try {
      // Direct Purchase uses the standard PR endpoint but with pre-approved status
      await api.post("/purchases", formData);
      router.push("/supplier-pembelian/purchase-order"); // Redirect to PO list because direct purchase acts as approved PR
    } catch (err: any) {
      setError(err.message || "Gagal membuat pembelian langsung.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto animate-in fade-in zoom-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Link href="/supplier-pembelian/purchase-order" className="p-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all border border-gray-100 group">
                <ArrowLeft className="text-gray-400 group-hover:text-emerald-500 group-hover:-translate-x-1 transition-all" size={20} />
            </Link>
            <div>
                <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                    <Zap className="text-orange-500 fill-orange-500" size={24} />
                    Pembelian Langsung
                </h1>
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Direct Quick Purchase - Auto Approved</p>
            </div>
        </div>
      </div>

      {loading ? (
          <div className="bg-white p-20 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-black text-gray-400 uppercase tracking-tighter animate-pulse">Loading Procurement Engines...</p>
          </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 space-y-4">
                    <div className="flex items-center gap-3 text-emerald-600 mb-2">
                        <Calendar size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Transaction Info</span>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-emerald-600 pl-1 uppercase tracking-widest">PL Reference (Auto)</label>
                        <input
                            type="text"
                            className="w-full px-4 py-3 rounded-xl bg-emerald-50/50 border-none font-black text-sm text-emerald-700 focus:ring-2 focus:ring-emerald-500 transition-all"
                            value={formData.reference}
                            onChange={(e) => setFormData({...formData, reference: e.target.value})}
                            placeholder="Auto-generating..."
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Date</label>
                        <input
                            type="date"
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none font-bold text-sm focus:ring-2 focus:ring-emerald-500 transition-all"
                            value={formData.date}
                            onChange={(e) => setFormData({...formData, date: e.target.value})}
                        />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 space-y-4">
                    <div className="flex items-center gap-3 text-emerald-600 mb-2">
                        <Building2 size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Stakeholders</span>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 pl-1 uppercase">Supplier</label>
                        <SearchableSelect
                            options={suppliers}
                            placeholder="Select Supplier..."
                            value={formData.supplier_id}
                            onChange={(val) => setFormData({...formData, supplier_id: val})}
                        />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 space-y-4">
                    <div className="flex items-center gap-3 text-emerald-600 mb-2">
                        <CreditCard size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Responsibility</span>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 pl-1 uppercase">Department</label>
                        <SearchableSelect
                             options={departments}
                             placeholder="Which dept budget?"
                             value={formData.department_id}
                             onChange={(val) => {
                               setFormData({...formData, department_id: val});
                               fetchNextRef(val as any);
                             }}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-6 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Items List</h3>
                    <button type="button" onClick={addItem} className="bg-emerald-600 text-white p-2 rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-90">
                        <Plus size={20} />
                    </button>
                </div>
                <div className="p-0 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50/30 text-gray-400 font-bold text-[10px] uppercase tracking-tighter border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left">Product / Category</th>
                                <th className="px-4 py-4 text-center w-24">Qty</th>
                                <th className="px-4 py-4 text-right w-44">Price</th>
                                <th className="px-6 py-4 text-right w-48">Total</th>
                                <th className="px-4 py-4 text-center w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {formData.items.map((item: any, index: number) => (
                                <tr key={index} className="group">
                                    <td className="px-6 py-4 space-y-2">
                                        <SearchableSelect
                                            options={products}
                                            placeholder="Auto-match product..."
                                            value={item.product_id}
                                            onChange={(val) => {
                                                const p = products.find(x => x.value === val)?.detail;
                                                if (p) {
                                                    handleItemChange(index, "product_id", p.id);
                                                    handleItemChange(index, "product_name", p.product_name);
                                                    handleItemChange(index, "product_code", p.product_code);
                                                    handleItemChange(index, "product_unit", p.product_unit);
                                                    handleItemChange(index, "unit_price", p.product_price);
                                                    handleItemChange(index, "category_id", p.category_id);
                                                }
                                            }}
                                        />
                                        <SearchableSelect
                                            options={categories}
                                            placeholder="Specific Category..."
                                            value={item.category_id}
                                            onChange={(val) => handleItemChange(index, "category_id", val)}
                                        />
                                        <input
                                            className="w-full px-4 py-2 bg-gray-50 rounded-lg text-xs font-bold border-none"
                                            placeholder="Custom item name if not in products..."
                                            value={item.product_name}
                                            onChange={(e) => handleItemChange(index, "product_name", e.target.value)}
                                        />
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <input
                                                type="number"
                                                className="w-20 px-2 py-2 bg-gray-50 rounded-lg text-center font-black text-sm border-none shadow-inner"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                                            />
                                            <span className="text-[10px] font-bold text-gray-400">{item.product_unit}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <input
                                            type="number"
                                            className="w-full px-4 py-2 bg-gray-50 rounded-lg text-right font-black text-sm border-none shadow-inner"
                                            value={item.unit_price}
                                            onChange={(e) => handleItemChange(index, "unit_price", e.target.value)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-black text-emerald-600 text-base tracking-tighter">Rp {item.sub_total.toLocaleString()}</span>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <button type="button" onClick={() => removeItem(index)} className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {formData.items.length === 0 && (
                        <div className="py-20 text-center space-y-4">
                            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-gray-200">
                                <Plus size={40} />
                            </div>
                            <p className="font-black text-gray-300 uppercase tracking-widest text-[10px]">Your shopping cart is hungry</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-end">
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 pl-4 uppercase tracking-[0.3em]">Remarks / Transaction Memo</label>
                        <textarea
                            rows={4}
                            className="w-full bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm focus:ring-4 focus:ring-emerald-500/10 font-medium text-sm transition-all focus:border-emerald-500"
                            placeholder="Why are we buying this?"
                            value={formData.note}
                            onChange={(e) => setFormData({...formData, note: e.target.value})}
                        />
                    </div>
                </div>

                <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100 space-y-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                         <Zap size={120} />
                    </div>
                    <div className="flex justify-between items-center text-gray-400 font-bold border-b border-gray-50 pb-4">
                        <span className="text-xs uppercase tracking-widest">Sub-total</span>
                        <span className="font-black tracking-tighter">Rp {formData.items.reduce((acc: any, i: any) => acc + i.sub_total, 0).toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between items-center gap-4">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">VAT (PPN)</span>
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-xl w-fit">
                                <input
                                    type="number"
                                    className="w-10 bg-transparent border-none p-0 text-center font-black text-xs focus:ring-0"
                                    value={formData.tax_percentage}
                                    onChange={(e) => {
                                        const v = Number(e.target.value);
                                        setFormData({...formData, tax_percentage: v});
                                        calculateTotals(formData.items, formData.discount_percentage, v);
                                    }}
                                />
                                <span className="text-gray-400 font-black text-[10px]">%</span>
                            </div>
                        </div>
                        <span className="font-black text-gray-800 tracking-tighter">+ Rp {formData.tax_amount.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t-2 border-dashed border-gray-100">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-1">Grand Total Bill</span>
                            <span className="text-3xl font-black text-emerald-600 tracking-tighter">Rp {formData.total_amount.toLocaleString()}</span>
                        </div>
                        <button
                            type="submit"
                            disabled={submitting || formData.items.length === 0}
                            className="bg-emerald-600 text-white px-12 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-emerald-200 hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {submitting ? "Processing..." : "Process Direct Purchase"}
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-6 rounded-[2rem] flex items-center gap-4 animate-bounce">
                    <AlertCircle />
                    <span className="font-black text-sm uppercase tracking-widest">{error}</span>
                </div>
            )}
        </form>
      )}
    </div>
  );
}
