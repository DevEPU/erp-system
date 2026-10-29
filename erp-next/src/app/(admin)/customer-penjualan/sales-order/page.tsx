"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, FileText, X, Trash, Eye, Download } from "lucide-react";
import api from "@/lib/api";
import TablePagination from "@/components/ui/TablePagination";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import ProductSearchDropdown, { type ProductOption } from "@/components/ui/ProductSearchDropdown";
import PrintButton from "@/components/ui/PrintButton";

type OSDetail = {
  id?: number;
  po_detail_id?: number | null;
  product_id?: number | null;
  product_name: string;
  product_code?: string | null;
  product_unit?: string | null;
  os_qty: number;
  price: number;
  sub_total?: number;
  no_po_customer?: string;
  po_ref?: string;
  remaining_qty?: number;
};

type OrderSheet = {
  id?: number;
  reference?: string;
  customer_id: number | "";
  customer_name?: string;
  period_month: number;
  period_year: number;
  delivery_date: string;
  note?: string;
  status: string;
  details: OSDetail[];
};

export default function OrderSheetPage() {
  const [data, setData] = useState<OrderSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { isOpen, type, title, message, onConfirm, showSuccess, showError, showConfirm, closeModal, isLoading: isActionLoading } = useStatusModal();

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPOPullOpen, setIsPOPullOpen] = useState(false);

  const [selectedOS, setSelectedOS] = useState<OrderSheet | null>(null);
  const [formData, setFormData] = useState<OrderSheet>({
    customer_id: "",
    period_month: new Date().getMonth() + 1,
    period_year: new Date().getFullYear(),
    delivery_date: new Date().toISOString().split("T")[0],
    note: "",
    status: "Draft",
    details: []
  });

  // Dropdown & Pull State
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  
  // PO source list
  const [customerPOs, setCustomerPOs] = useState<any[]>([]);
  const [selectedSourcePOId, setSelectedSourcePOId] = useState<string | number>("");

  const [availablePOItems, setAvailablePOItems] = useState<any[]>([]);
  const [selectedPullItems, setSelectedPullItems] = useState<number[]>([]);

  const fetchDropdowns = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        api.express.get("/customers-list"),
        api.express.get("/products", { limit: 9999 })
      ]);
      setCustomers((custRes.data.data || []).map((c: any) => ({ value: c.id, label: c.customer_name })));
      setProducts(prodRes.data.data || []);
    } catch (err) {
      console.error("Error fetching dropdown data:", err);
    }
  };

  const fetchData = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.express.get("/order-sheets", { page: p, search });
      setData(res.data.data || []);
      setPage(res.data.current_page || 1);
      setTotalPages(res.data.last_page || 1);
    } catch { 
      setData([]); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchDropdowns();
    const t = setTimeout(() => fetchData(1), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Load available PO items & approved POs when customer is selected
  const loadCustomerPOSources = async (customerId: number) => {
    try {
      // 1. Fetch Approved Customer POs
      const docsRes = await api.express.get("/customer-po", { params: { customer_id: customerId, status: 'Approved', limit: 1000 } });
      if (docsRes.data.success) {
        setCustomerPOs((docsRes.data.data || []).map((d: any) => ({
          value: d.id,
          label: `${d.no_po_customer} (${d.reference})`
        })));
      }

      // 2. Fetch specific items remaining qty
      const res = await api.express.get(`/order-sheets/po-items?customer_id=${customerId}`);
      if (res.data.success) {
        setAvailablePOItems(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load PO data:", err);
    }
  };

  useEffect(() => {
    if (formData.customer_id) {
      loadCustomerPOSources(Number(formData.customer_id));
    } else {
      setCustomerPOs([]);
      setAvailablePOItems([]);
      setSelectedSourcePOId("");
    }
  }, [formData.customer_id]);

  // Auto-populate when selecting Customer PO from dropdown
  const handleSelectSourcePO = async (poId: number | string) => {
    if (!poId) return;
    setSelectedSourcePOId(poId);
    try {
      const res = await api.express.get(`/customer-po/${poId}`);
      if (res.data.success) {
        const po = res.data.data;
        // Map PO details into OS details
        const newDetails = (po.details || []).map((item: any) => {
          // Find remaining qty from available PO items list
          const remItem = availablePOItems.find(x => x.id === item.id);
          const remQty = remItem ? Number(remItem.remaining_qty) : Number(item.po_qty);

          return {
            po_detail_id: item.id,
            product_id: item.product_id,
            product_name: item.product_name,
            product_code: item.product_code,
            product_unit: item.product_unit || "PCS",
            os_qty: remQty > 0 ? remQty : 0,
            price: Number(item.price || 0),
            no_po_customer: po.no_po_customer,
            po_ref: po.reference,
            remaining_qty: remQty
          };
        });

        // Update form state with pulled items
        setFormData(prev => ({
          ...prev,
          details: [...prev.details, ...newDetails.filter((d: any) => d.os_qty > 0)]
        }));

        showSuccess("Data Ditarik", `Berhasil menarik ${newDetails.length} item dari PO ${po.no_po_customer}.`);
      }
    } catch (err: any) {
      showError("Pull Error", err.message || "Gagal menarik data dari PO Customer.");
    }
  };

  const handleOpenCreate = () => {
    setFormData({
      customer_id: "",
      period_month: new Date().getMonth() + 1,
      period_year: new Date().getFullYear(),
      delivery_date: new Date().toISOString().split("T")[0],
      note: "",
      status: "Draft",
      details: []
    });
    setSelectedOS(null);
    setSelectedSourcePOId("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = async (id: number) => {
    try {
      const res = await api.express.get(`/order-sheets/${id}`);
      if (res.data.success) {
        setFormData(res.data.data);
        setSelectedOS(res.data.data);
        setSelectedSourcePOId("");
        setIsModalOpen(true);
      }
    } catch (err: any) {
      showError("Error", err.message || "Failed to load details.");
    }
  };

  const handleOpenDetail = async (id: number) => {
    try {
      const res = await api.express.get(`/order-sheets/${id}`);
      if (res.data.success) {
        setSelectedOS(res.data.data);
        setIsDetailOpen(true);
      }
    } catch (err: any) {
      showError("Error", err.message || "Failed to load details.");
    }
  };

  const handleAddRow = () => {
    setFormData({
      ...formData,
      details: [
        ...formData.details,
        { po_detail_id: null, product_id: null, product_name: "", product_code: "", product_unit: "PCS", os_qty: 1, price: 0 }
      ]
    });
  };

  const handleRemoveRow = (idx: number) => {
    const next = [...formData.details];
    next.splice(idx, 1);
    setFormData({ ...formData, details: next });
  };

  const handleItemChange = (idx: number, key: keyof OSDetail, val: any) => {
    const next = [...formData.details];
    next[idx] = { ...next[idx], [key]: val };
    setFormData({ ...formData, details: next });
  };

  // Pull PO Customer items integration
  const handleOpenPOPull = () => {
    if (!formData.customer_id) {
      return showError("Customer Required", "Pilih customer terlebih dahulu sebelum menarik PO Customer.");
    }
    setSelectedPullItems([]);
    setIsPOPullOpen(true);
  };

  const handleApplyPOPull = () => {
    const selected = availablePOItems.filter(item => selectedPullItems.includes(item.id));
    const newDetails = selected.map(item => ({
      po_detail_id: item.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_code: item.product_code,
      product_unit: item.product_unit || "PCS",
      os_qty: Number(item.remaining_qty),
      price: Number(item.price || 0),
      no_po_customer: item.no_po_customer,
      po_ref: item.po_ref,
      remaining_qty: Number(item.remaining_qty)
    }));

    setFormData({
      ...formData,
      details: [...formData.details, ...newDetails]
    });

    setIsPOPullOpen(false);
    showSuccess("Pulled", `${newDetails.length} item berhasil ditarik dari PO Customer.`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id) return showError("Validation Error", "Pilih customer terlebih dahulu.");
    if (formData.details.length === 0) return showError("Validation Error", "Tambahkan minimal satu item detail order sheet.");
    if (formData.details.some(item => !item.product_id)) return showError("Validation Error", "Semua baris item harus memilih produk.");

    const payload = { ...formData, items: formData.details };

    try {
      if (selectedOS?.id) {
        await api.express.put(`/order-sheets/${selectedOS.id}`, payload);
        showSuccess("Success", "Order Sheet berhasil diperbarui.");
      } else {
        await api.express.post("/order-sheets", payload);
        showSuccess("Success", "Order Sheet baru berhasil disimpan.");
      }
      setIsModalOpen(false);
      fetchData(page);
    } catch (err: any) {
      showError("Error", err.response?.data?.message || err.message || "Gagal menyimpan data.");
    }
  };

  const handleDelete = (id: number) => {
    showConfirm("Confirm Delete", "Apakah Anda yakin ingin menghapus Order Sheet ini?", async () => {
      try {
        await api.express.delete(`/order-sheets/${id}`);
        showSuccess("Success", "Order Sheet berhasil dihapus.");
        fetchData(page);
      } catch (err: any) {
        showError("Error", err.response?.data?.message || err.message || "Gagal menghapus data.");
      }
    });
  };

  const months = [
    { value: 1, label: "Januari" },
    { value: 2, label: "Februari" },
    { value: 3, label: "Maret" },
    { value: 4, label: "April" },
    { value: 5, label: "Mei" },
    { value: 6, label: "Juni" },
    { value: 7, label: "Juli" },
    { value: 8, label: "Agustus" },
    { value: 9, label: "September" },
    { value: 10, label: "Oktober" },
    { value: 11, label: "November" },
    { value: 12, label: "Desember" }
  ];

  const grandTotal = formData.details.reduce((s, i) => s + (Number(i.os_qty) * Number(i.price)), 0);

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-500">
      <StatusModal isOpen={isOpen} type={type} title={title} message={message} onConfirm={onConfirm} onClose={closeModal} isLoading={isActionLoading} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-violet-600 rounded-2xl shadow-lg shadow-violet-200">
              <FileText className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Order <span className="text-violet-600">Sheet</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">Kelola planning internal penjualan dan produksi berdasarkan data Purchase Order dari customer.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-3 bg-gray-900 hover:bg-violet-600 hover:shadow-violet-200 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl active:scale-95"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Tambah Baru</span>
        </button>
      </div>

      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 mb-6 hide-scrollbar">
        <StatCard icon={<FileText size={20} />} iconBgColor="bg-violet-50" iconColor="text-violet-600" label="TOTAL DATA" value={data.length} />
      </div>

      <div className="mb-8">
        <FilterBar searchPlaceholder="Cari data order sheet..." searchValue={search} onSearchChange={setSearch} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">No</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">No. Referensi</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Periode Planning</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Delivery Date</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Memuat data...</td></tr>
              ) : data.length > 0 ? (
                data.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-400 font-mono">{(page - 1) * 10 + idx + 1}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{item.reference}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{item.customer_name || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {months.find(m => m.value === item.period_month)?.label} {item.period_year}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.delivery_date}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        item.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <PrintButton
                          moduleKey="sales_order"
                          moduleName="Sales Order"
                          data={{
                            ...item,
                            reference: item.reference || `#SO-${item.id}`,
                            customer_name: item.customer_name || "-",
                            delivery_date: item.delivery_date || "-",
                            period_year: `${item.period_month ? item.period_month + '/' : ''}${item.period_year || ''}`,
                            items: item.details || [],
                          }}
                        />
                        <button onClick={() => handleOpenDetail(item.id!)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Lihat Detail"><Eye size={16} /></button>
                        <button onClick={() => handleOpenEdit(item.id!)} className="p-1.5 text-violet-600 hover:bg-violet-50 rounded-lg transition-colors" title="Edit Data"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(item.id!)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Hapus"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
                        <FileText size={28} className="text-violet-600" />
                      </div>
                      <p className="font-semibold">Belum ada data Order Sheet</p>
                      <p className="text-xs text-gray-300">Klik tombol "Tambah Baru" untuk membuat Order Sheet pertama</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} totalItems={(page - 1) * 10 + data.length} onPageChange={fetchData} />
      </div>

      {/* FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-5xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-gray-800">
                  {selectedOS ? "Edit Order Sheet" : "Tambah Order Sheet Baru"}
                </h3>
                {selectedOS && <p className="text-xs text-gray-400 font-mono mt-0.5">{selectedOS.reference}</p>}
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Customer</label>
                  <SearchableSelect
                    options={customers}
                    placeholder="Pilih Customer..."
                    value={formData.customer_id}
                    onChange={(val) => setFormData({ ...formData, customer_id: val })}
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Tarik dari PO Customer (Auto-populate)</label>
                  <SearchableSelect
                    options={customerPOs}
                    disabled={!formData.customer_id}
                    placeholder={formData.customer_id ? "Pilih PO untuk ditarik..." : "Pilih Customer Terlebih Dahulu"}
                    value={selectedSourcePOId}
                    onChange={(val) => handleSelectSourcePO(val)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Bulan Planning</label>
                  <SearchableSelect
                    options={months}
                    placeholder="Pilih Bulan..."
                    value={formData.period_month}
                    onChange={(val) => setFormData({ ...formData, period_month: Number(val) })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Tahun Planning</label>
                  <input
                    type="number"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-violet-100 focus:border-violet-500 outline-none text-sm font-semibold transition-all"
                    value={formData.period_year}
                    onChange={(e) => setFormData({ ...formData, period_year: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Delivery Date</label>
                  <input
                    type="date"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-violet-100 focus:border-violet-500 outline-none text-sm font-semibold transition-all"
                    value={formData.delivery_date}
                    onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                  />
                </div>

                {selectedOS && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Status</label>
                    <div className="flex gap-4 mt-2">
                      {['Draft', 'Approved'].map(st => (
                        <label key={st} className="flex items-center gap-2 cursor-pointer font-bold text-sm text-gray-700">
                          <input
                            type="radio"
                            name="status"
                            value={st}
                            checked={formData.status === st}
                            onChange={() => setFormData({ ...formData, status: st })}
                            className="text-violet-600 focus:ring-violet-500"
                          />
                          {st}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Keterangan / Memo</label>
                <textarea
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-violet-100 focus:border-violet-500 outline-none text-sm font-medium transition-all"
                  placeholder="Keterangan mengenai Order Sheet ini..."
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
              </div>

              <div className="border-t border-gray-100 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest">Daftar Item Order Sheet</h4>
                    {formData.customer_id && availablePOItems.length > 0 && (
                      <button
                        type="button"
                        onClick={handleOpenPOPull}
                        className="bg-violet-50 text-violet-700 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-violet-100 hover:bg-violet-100 transition-all flex items-center gap-1 active:scale-95"
                      >
                        <Download size={12} /> Pilih Item PO Customer ({availablePOItems.length})
                      </button>
                    )}
                  </div>
                  <button type="button" onClick={handleAddRow} className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1">
                    <Plus size={14} /> Tambah Item Manual
                  </button>
                </div>

                <div className="border border-gray-100 rounded-xl overflow-visible">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-400 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">Produk / Link PO Customer</th>
                        <th className="px-4 py-3 text-center w-24">Unit</th>
                        <th className="px-4 py-3 text-center w-24">Qty OS</th>
                        <th className="px-4 py-3 text-right w-40">Harga Satuan</th>
                        <th className="px-4 py-3 text-right w-44">Subtotal</th>
                        <th className="px-4 py-3 text-center w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {formData.details.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-4 space-y-1">
                            {item.po_detail_id && (
                              <span className="inline-block text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                Linked PO: {item.no_po_customer || item.po_ref || `ID: ${item.po_detail_id}`}
                              </span>
                            )}
                            <ProductSearchDropdown
                              products={products}
                              value={item.product_id || ""}
                              onChange={(p) => {
                                if (!p.id) return;
                                const next = [...formData.details];
                                next[idx] = {
                                  ...next[idx],
                                  product_id: p.id,
                                  product_name: p.product_name,
                                  product_code: p.product_code || "",
                                  product_unit: p.product_unit || "PCS",
                                  price: Number(p.sell_price_l1 || p.sale_price || p.product_price || 0),
                                };
                                setFormData({ ...formData, details: next });
                              }}
                            />
                          </td>
                          <td className="p-4 text-center">
                            <input
                              type="text"
                              className="w-full px-2 py-1.5 bg-gray-50 rounded-lg text-center font-bold text-xs border-none"
                              value={item.product_unit || ""}
                              onChange={(e) => handleItemChange(idx, "product_unit", e.target.value)}
                            />
                          </td>
                          <td className="p-4 text-center">
                            <input
                              type="number"
                              required
                              min={1}
                              max={item.remaining_qty ? item.remaining_qty : undefined}
                              className="w-full px-2 py-1.5 bg-gray-50 rounded-lg text-center font-black text-sm border-none shadow-inner"
                              value={item.os_qty}
                              onChange={(e) => handleItemChange(idx, "os_qty", Number(e.target.value))}
                            />
                            {item.remaining_qty && (
                              <span className="text-[9px] text-gray-400 font-bold block mt-1">Sisa PO: {item.remaining_qty}</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <input
                              type="number"
                              required
                              className="w-full px-3 py-1.5 bg-gray-50 rounded-lg text-right font-black text-sm border-none shadow-inner"
                              value={item.price}
                              onChange={(e) => handleItemChange(idx, "price", Number(e.target.value))}
                            />
                          </td>
                          <td className="p-4 text-right font-black text-violet-600 text-sm">
                            Rp {((item.os_qty || 0) * (item.price || 0)).toLocaleString()}
                          </td>
                          <td className="p-4 text-center">
                            <button type="button" onClick={() => handleRemoveRow(idx)} className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                              <Trash size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {formData.details.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-gray-400 text-xs">
                            Belum ada item ditambahkan. Pilih PO Customer di atas atau klik "Tambah Item Manual".
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-4">
                  <div className="text-right">
                    <span className="text-[10px] font-black text-gray-400 block uppercase tracking-widest">Total Qty / Grand Total</span>
                    <span className="text-2xl font-black text-violet-600">Rp {grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">
                  Batal
                </button>
                <button type="submit" className="px-8 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-sm font-bold text-white shadow-lg shadow-violet-200 transition-all active:scale-95">
                  Simpan Order Sheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PO PULL MODAL */}
      {isPOPullOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150">
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-gray-800">Tarik Item dari PO Customer</h3>
                <p className="text-xs text-gray-400">Pilih item PO Customer yang belum dijadwalkan sepenuhnya di Order Sheet.</p>
              </div>
              <button onClick={() => setIsPOPullOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-400 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="px-6 py-3 text-center w-12">
                        <input
                          type="checkbox"
                          checked={selectedPullItems.length === availablePOItems.length && availablePOItems.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPullItems(availablePOItems.map(item => item.id));
                            } else {
                              setSelectedPullItems([]);
                            }
                          }}
                          className="rounded text-violet-600 focus:ring-violet-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left">No. PO Customer</th>
                      <th className="px-6 py-3 text-left">Produk</th>
                      <th className="px-6 py-3 text-center w-24">Unit</th>
                      <th className="px-6 py-3 text-right w-28">Sisa PO Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {availablePOItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedPullItems.includes(item.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPullItems([...selectedPullItems, item.id]);
                              } else {
                                setSelectedPullItems(selectedPullItems.filter(id => id !== item.id));
                              }
                            }}
                            className="rounded text-violet-600 focus:ring-violet-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold block text-sm text-gray-800">{item.no_po_customer}</span>
                          <span className="text-[10px] font-mono text-gray-400">{item.po_ref}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold block text-sm text-gray-800">{item.product_name}</span>
                          <span className="text-[10px] font-mono text-gray-400">{item.product_code || "-"}</span>
                        </td>
                        <td className="px-6 py-4 text-center text-xs font-semibold text-gray-500">{item.product_unit || "PCS"}</td>
                        <td className="px-6 py-4 text-right font-black text-violet-600">{Number(item.remaining_qty).toLocaleString()}</td>
                      </tr>
                    ))}
                    {availablePOItems.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-gray-400 text-xs">
                          Tidak ada data PO Customer approved yang tersisa untuk ditarik.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button type="button" onClick={() => setIsPOPullOpen(false)} className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyPOPull}
                disabled={selectedPullItems.length === 0}
                className="px-6 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-sm font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                Tarik Item Terpilih ({selectedPullItems.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {isDetailOpen && selectedOS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-black tracking-widest text-violet-600 uppercase">Detail Order Sheet</span>
                <h3 className="text-xl font-black text-gray-800 mt-0.5">{selectedOS.reference}</h3>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-violet-50/30 p-6 rounded-2xl border border-violet-50">
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Customer</span>
                  <span className="font-extrabold text-gray-800 text-sm">{selectedOS.customer_name || "-"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Periode Planning</span>
                  <span className="font-extrabold text-gray-800 text-sm">
                    {months.find(m => m.value === selectedOS.period_month)?.label} {selectedOS.period_year}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Delivery Date</span>
                  <span className="font-extrabold text-gray-800 text-sm">{selectedOS.delivery_date}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Status</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-block mt-0.5 ${
                    selectedOS.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                  }`}>
                    {selectedOS.status}
                  </span>
                </div>
              </div>

              {selectedOS.note && (
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider mb-1">Keterangan / Memo</span>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-xl text-sm border border-gray-100">{selectedOS.note}</p>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest">Daftar Item Order Sheet</h4>
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-400 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="px-6 py-3 text-left">Linked PO</th>
                        <th className="px-6 py-3 text-left">Nama Produk</th>
                        <th className="px-6 py-3 text-center w-24">Unit</th>
                        <th className="px-6 py-3 text-right w-24">Qty OS</th>
                        <th className="px-6 py-3 text-right w-36">Harga Satuan</th>
                        <th className="px-6 py-3 text-right w-40">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {selectedOS.details?.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 text-xs font-bold text-indigo-600">
                            {item.no_po_customer || item.po_ref || "-"}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-bold block text-gray-800 text-sm">{item.product_name}</span>
                            <span className="text-[10px] font-mono text-gray-400">{item.product_code || "-"}</span>
                          </td>
                          <td className="px-6 py-4 text-center text-gray-600 font-semibold">{item.product_unit || "PCS"}</td>
                          <td className="px-6 py-4 text-center text-gray-650 font-bold">{item.os_qty.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right text-gray-600">Rp {Number(item.price).toLocaleString()}</td>
                          <td className="px-6 py-4 text-right font-black text-violet-600">Rp {((item.os_qty || 0) * (item.price || 0)).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button onClick={() => setIsDetailOpen(false)} className="px-6 py-2 bg-gray-900 hover:bg-black text-white text-sm font-bold shadow-md transition-all active:scale-95">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
