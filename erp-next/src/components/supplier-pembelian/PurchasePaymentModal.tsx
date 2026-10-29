"use client";

import { useState, useEffect } from "react";
import { X, Save, Plus, Trash2, Search, DollarSign, CreditCard, Receipt, FileText, RefreshCw } from "lucide-react";
import SearchableSelect from "@/components/ui/SearchableSelect";
import api from "@/lib/api";

type BankLine = {
    account_id: number | "";
    bank_name: string;
    currency_id: number | "";
    currency_code: string;
    rate: number;
    target_rate: number;
    transaction_type: string;
    is_liquid: boolean;
    giro_number: string;
    due_date: string;
    journal_id?: number | "";
    note: string;
    amount: number;
};

type InvoiceLine = {
    invoice_id: number;
    reference: string;
    type: string;
    date: string;
    due_date: string;
    currency: string;
    rate: number;
    balance: number;
    amount_paid: number;
    selected: boolean;
};

type Payment = {
    id?: number;
    reference?: string;
    date: string;
    supplier_id: number | "";
    department_id: number | "";
    total_amount: number;
    note: string;
    banks: BankLine[];
    invoices: InvoiceLine[];
};

type PurchasePaymentModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    paymentToEdit?: any | null;
    userDepartmentId?: number | null;
};

export default function PurchasePaymentModal({
    isOpen,
    onClose,
    onSuccess,
    paymentToEdit,
    userDepartmentId,
}: PurchasePaymentModalProps) {
    const [formData, setFormData] = useState<Payment>({
        date: new Date().toISOString().split("T")[0],
        supplier_id: "",
        department_id: userDepartmentId || "",
        total_amount: 0,
        note: "",
        banks: [{
            account_id: "",
            bank_name: "",
            currency_id: "",
            currency_code: "IDR",
            rate: 1,
            target_rate: 1,
            transaction_type: "Keluar Kas",
            is_liquid: true,
            giro_number: "",
            due_date: new Date().toISOString().split("T")[0],
            note: "",
            amount: 0
        }],
        invoices: []
    });

    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [currencies, setCurrencies] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingInvoices, setFetchingInvoices] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [suppRes, accRes, currRes, deptRes] = await Promise.all([
                    api.express.get("/suppliers"),
                    api.express.get("/chart-of-accounts"),
                    api.express.get("/currencies"),
                    api.express.get("/departments")
                ]);
                setSuppliers(suppRes.data.data.map((s: any) => ({ value: s.id, label: s.supplier_name })));
                setAccounts(accRes.data.data.map((a: any) => ({ value: a.id, label: `${a.code} - ${a.name}`, detail: a })));
                setCurrencies(currRes.data.map((c: any) => ({ value: c.id, label: c.code, detail: c })));
                setDepartments(deptRes.data.data.map((d: any) => ({ value: d.id, label: d.department_name })));
            } catch (err) {
                console.error("Error fetching modal data:", err);
            }
        };

        if (isOpen) {
            fetchData();
            if (!paymentToEdit) {
                const initialDeptId = userDepartmentId || "";
                fetchNextRef(initialDeptId ? Number(initialDeptId) : undefined);
            }
        }
    }, [isOpen, userDepartmentId]);

    const fetchNextRef = async (deptId?: any) => {
        try {
            const finalDeptId = deptId !== undefined ? deptId : formData.department_id;
            const res = await api.express.get("/references/next-reference", { 
                params: { 
                    type: 'PYM',
                    department_id: finalDeptId || ""
                } 
            });
            if (res.data.success && res.data.reference) {
                setFormData(prev => ({ ...prev, reference: res.data.reference }));
            }
        } catch (err) {
            console.error("Failed to fetch reference:", err);
        }
    };

    const fetchInvoices = async (supplierId: number) => {
        setFetchingInvoices(true);
        try {
            const res = await api.express.get("/purchase-payments/unpaid", { params: { supplier_id: supplierId } });
            if (res.data.success) {
                const lines = res.data.data.map((inv: any) => ({
                    invoice_id: inv.id,
                    reference: inv.reference,
                    type: "Beli Kredit",
                    date: inv.date,
                    due_date: inv.due_date,
                    currency: "IDR",
                    rate: 1,
                    balance: Number(inv.balance),
                    amount_paid: 0,
                    selected: false
                }));
                setFormData(prev => ({ ...prev, invoices: lines }));
            }
        } catch (err) {
            console.error("Error fetching invoices:", err);
        } finally {
            setFetchingInvoices(false);
        }
    };

    const handleBankChange = (index: number, field: keyof BankLine, value: any) => {
        const newBanks = [...formData.banks];
        newBanks[index] = { ...newBanks[index], [field]: value };

        if (field === "account_id") {
            const acc = accounts.find(a => a.value === value)?.detail;
            if (acc) {
                newBanks[index].bank_name = acc.name;
            }
        }

        setFormData({ ...formData, banks: newBanks });
    };

    const addBankLine = () => {
        setFormData({
            ...formData,
            banks: [...formData.banks, {
                account_id: "",
                bank_name: "",
                currency_id: "",
                currency_code: "IDR",
                rate: 1,
                target_rate: 1,
                transaction_type: "Keluar Kas",
                is_liquid: true,
                giro_number: "",
                due_date: new Date().toISOString().split("T")[0],
                note: "",
                amount: 0
            }]
        });
    };

    const removeBankLine = (index: number) => {
        if (formData.banks.length === 1) return;
        const newBanks = [...formData.banks];
        newBanks.splice(index, 1);
        setFormData({ ...formData, banks: newBanks });
    };

    const handleInvoiceToggle = (index: number) => {
        const newInvoices = [...formData.invoices];
        newInvoices[index].selected = !newInvoices[index].selected;
        if (newInvoices[index].selected) {
            newInvoices[index].amount_paid = newInvoices[index].balance;
        } else {
            newInvoices[index].amount_paid = 0;
        }
        setFormData({ ...formData, invoices: newInvoices });
    };

    const handleInvoicePaymentChange = (index: number, val: number) => {
        const newInvoices = [...formData.invoices];
        newInvoices[index].amount_paid = val;
        newInvoices[index].selected = val > 0;
        setFormData({ ...formData, invoices: newInvoices });
    };

    const totalInvoicePayment = formData.invoices.reduce((sum, inv) => sum + (inv.selected ? Number(inv.amount_paid) : 0), 0);
    const totalBankPayment = formData.banks.reduce((sum, b) => sum + Number(b.amount), 0);
    const totalConvertedBank = formData.banks.reduce((sum, b) => sum + (Number(b.amount) * Number(b.rate)), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (totalInvoicePayment === 0) return alert("Pilih minimal satu faktur untuk dibayar");
        if (Math.abs(totalConvertedBank - totalInvoicePayment) > 1) {
            if (!confirm(`Total Pembayaran Bank (Rp ${totalConvertedBank.toLocaleString()}) tidak sama dengan Total Faktur (Rp ${totalInvoicePayment.toLocaleString()}). Lanjutkan?`)) return;
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                total_amount: totalInvoicePayment,
                invoices: formData.invoices.filter(i => i.selected)
            };
            const res = await api.express.post("/purchase-payments", payload);
            if (res.data.success) {
                onSuccess();
                onClose();
            }
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to save payment");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-[95%] max-h-[95vh] overflow-hidden shadow-2xl flex flex-col border border-gray-100">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4 text-white">
                        <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                            <CreditCard size={24} className="text-emerald-50" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight">Pelunasan Utang</h2>
                            <p className="text-emerald-100 text-sm font-medium opacity-80">{formData.reference || "New Transaction"}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all text-white/80 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-10">
                    {/* Top Row: Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 p-6 bg-gray-50/50 rounded-3xl border border-gray-100 shadow-inner">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase tracking-widest">Nomor Transaksi</label>
                            <div className="relative flex items-center group">
                                <input
                                    type="text"
                                    className="w-full pl-4 pr-12 py-3 rounded-xl bg-gray-50 border border-gray-100 font-black text-base text-gray-700 tracking-tight shadow-inner"
                                    value={formData.reference || ""}
                                    placeholder="Memuat nomor..."
                                    readOnly
                                />
                                <button 
                                    onClick={() => fetchNextRef()}
                                    className="absolute right-0 top-0 bottom-0 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-r-xl transition-colors flex items-center justify-center group-hover:shadow-lg"
                                    type="button"
                                    title="Generate Nomor Baru"
                                >
                                    <RefreshCw size={18} strokeWidth={3} className={fetchingInvoices ? "animate-spin" : ""} />
                                </button>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase tracking-widest">Tgl. Transaksi</label>
                            <input
                                type="date"
                                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-100 focus:ring-2 focus:ring-emerald-500 font-bold text-sm transition-all shadow-sm"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase tracking-widest">Supplier</label>
                            <SearchableSelect
                                options={suppliers}
                                value={formData.supplier_id}
                                onChange={(val) => {
                                    setFormData({ ...formData, supplier_id: val });
                                    fetchInvoices(Number(val));
                                }}
                                placeholder="-Pilih Supplier-"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 border-l-2 border-emerald-500 pl-2 uppercase tracking-widest">Department</label>
                            <SearchableSelect
                                options={departments}
                                value={formData.department_id}
                                onChange={(val) => {
                                    setFormData({ ...formData, department_id: val });
                                    fetchNextRef(Number(val));
                                }}
                                placeholder="-Pilih Department-"
                            />
                        </div>
                    </div>

                    {/* Bank Table */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
                                <DollarSign size={16} />
                            </div>
                            <h3 className="font-black text-gray-800 uppercase tracking-tight text-sm">Informasi Kas & Bank</h3>
                        </div>
                        <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm bg-white">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50/80 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
                                        <th className="px-4 py-3 border-b text-left">Akun Bank</th>
                                        <th className="px-4 py-3 border-b">Nama Bank</th>
                                        <th className="px-2 py-3 border-b">Uang</th>
                                        <th className="px-2 py-3 border-b">Kurs</th>
                                        <th className="px-2 py-3 border-b">Kurs Tgt</th>
                                        <th className="px-4 py-3 border-b">Tipe</th>
                                        <th className="px-2 py-3 border-b">Cair?</th>
                                        <th className="px-4 py-3 border-b">No. Giro</th>
                                        <th className="px-4 py-3 border-b">Pembayaran</th>
                                        <th className="px-2 py-3 border-b">Hapus</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.banks.map((bank, idx) => (
                                        <tr key={idx} className="border-b last:border-0 hover:bg-gray-50/30 transition-colors">
                                            <td className="px-2 py-2 min-w-[200px]">
                                                <SearchableSelect
                                                    options={accounts}
                                                    value={bank.account_id}
                                                    onChange={(val) => handleBankChange(idx, "account_id", val)}
                                                    className="!border-0 shadow-none"
                                                />
                                            </td>
                                            <td className="px-2 py-2">
                                                <input
                                                    type="text"
                                                    className="w-full px-2 py-1.5 bg-gray-50 rounded-lg border-0 text-xs font-bold text-gray-500"
                                                    value={bank.bank_name}
                                                    readOnly
                                                />
                                            </td>
                                            <td className="px-1 py-2">
                                                <input type="text" className="w-10 text-center bg-gray-50 rounded border-0 text-[10px] font-bold" value={bank.currency_code} readOnly />
                                            </td>
                                            <td className="px-1 py-2">
                                                <input
                                                    type="number"
                                                    className="w-16 px-1 py-1 bg-white border border-gray-100 rounded text-right text-xs font-bold"
                                                    value={bank.rate}
                                                    onChange={(e) => handleBankChange(idx, "rate", Number(e.target.value))}
                                                />
                                            </td>
                                            <td className="px-1 py-2">
                                                <input type="number" className="w-16 px-1 py-1 bg-gray-50 border-0 rounded text-right text-xs font-bold" value={bank.target_rate} readOnly />
                                            </td>
                                            <td className="px-2 py-2">
                                                <select
                                                    className="w-full bg-white border border-gray-100 rounded text-[10px] font-bold p-1"
                                                    value={bank.transaction_type}
                                                    onChange={(e) => handleBankChange(idx, "transaction_type", e.target.value)}
                                                >
                                                    <option>Keluar Kas</option>
                                                    <option>Cek/Giro</option>
                                                </select>
                                            </td>
                                            <td className="px-1 py-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={bank.is_liquid}
                                                    onChange={(e) => handleBankChange(idx, "is_liquid", e.target.checked)}
                                                    className="w-4 h-4 text-emerald-600 rounded"
                                                />
                                            </td>
                                            <td className="px-2 py-2">
                                                <input
                                                    type="text"
                                                    className="w-full px-2 py-1 bg-white border border-gray-100 rounded text-xs"
                                                    value={bank.giro_number}
                                                    onChange={(e) => handleBankChange(idx, "giro_number", e.target.value)}
                                                />
                                            </td>
                                            <td className="px-2 py-2">
                                                <input
                                                    type="number"
                                                    className="w-full px-2 py-1.5 bg-white border-2 border-emerald-100 focus:border-emerald-500 rounded-lg text-right font-black text-sm text-emerald-700"
                                                    value={bank.amount}
                                                    onChange={(e) => handleBankChange(idx, "amount", Number(e.target.value))}
                                                />
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                <button onClick={() => removeBankLine(idx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-3 bg-gray-50/50">
                                <button onClick={addBankLine} className="flex items-center gap-2 text-xs font-black text-emerald-600 hover:text-emerald-700 transition-colors uppercase tracking-widest">
                                    <Plus size={14} strokeWidth={3} /> Tambah Bank Baru
                                </button>
                            </div>
                        </div>
                        {/* Bank Totals */}
                        <div className="flex flex-col items-end gap-2 pr-6">
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jumlah Keluar Kas</span>
                                <div className="px-4 py-2 bg-gray-50 rounded-xl font-black text-gray-600 min-w-[150px] text-right">
                                    {totalBankPayment.toLocaleString()}
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Setelah Konversi Kurs</span>
                                <div className="px-4 py-2 bg-emerald-50 rounded-xl font-black text-emerald-700 min-w-[150px] text-right shadow-sm border border-emerald-100">
                                    {totalConvertedBank.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Invoice Table */}
                    <div className="space-y-4 pt-6 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
                                    <Receipt size={16} />
                                </div>
                                <h3 className="font-black text-gray-800 uppercase tracking-tight text-sm">Lunasi Beberapa Faktur</h3>
                            </div>
                            <div className="flex gap-2">
                                <span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black text-gray-500 uppercase">Rincian Jurnal Akun</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm bg-white min-h-[200px]">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50/80 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        <th className="px-4 py-3 border-b text-center w-12">Bayar</th>
                                        <th className="px-4 py-3 border-b text-left">No. Faktur</th>
                                        <th className="px-4 py-3 border-b text-left">Tipe</th>
                                        <th className="px-4 py-3 border-b text-center">Tgl. Trn</th>
                                        <th className="px-4 py-3 border-b text-center">Tgl. Jth Tempo</th>
                                        <th className="px-2 py-3 border-b text-center">Uang</th>
                                        <th className="px-2 py-3 border-b text-center">Kurs</th>
                                        <th className="px-4 py-3 border-b text-right">Reminder (Balance)</th>
                                        <th className="px-4 py-3 border-b text-right w-40">Pembayaran</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.invoices.map((inv, idx) => (
                                        <tr key={idx} className={`border-b last:border-0 hover:bg-gray-50/30 transition-colors ${inv.selected ? 'bg-emerald-50/20' : ''}`}>
                                            <td className="px-4 py-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={inv.selected}
                                                    onChange={() => handleInvoiceToggle(idx)}
                                                    className="w-5 h-5 text-emerald-600 border-2 border-gray-300 rounded-md focus:ring-emerald-500"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-800">{inv.reference}</span>
                                                    <Search size={12} className="text-blue-400 cursor-pointer" />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-bold text-gray-500 uppercase">{inv.type}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center font-medium text-gray-600">{inv.date}</td>
                                            <td className="px-4 py-3 text-center font-medium text-gray-600">{inv.due_date}</td>
                                            <td className="px-2 py-3 text-center font-black text-[10px] text-gray-400">{inv.currency}</td>
                                            <td className="px-2 py-3 text-center font-bold text-gray-600">{inv.rate}</td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="px-3 py-1.5 bg-gray-50 rounded-lg font-bold text-gray-700">
                                                    {inv.balance.toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    className={`w-full px-3 py-1.5 rounded-lg text-right font-black transition-all ${
                                                        inv.selected 
                                                            ? 'bg-white border-2 border-emerald-500 text-emerald-700 shadow-sm' 
                                                            : 'bg-gray-50 border border-gray-100 text-gray-400'
                                                    }`}
                                                    value={inv.amount_paid}
                                                    onChange={(e) => handleInvoicePaymentChange(idx, Number(e.target.value))}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                    {formData.invoices.length === 0 && !fetchingInvoices && (
                                        <tr>
                                            <td colSpan={9} className="px-4 py-12 text-center text-gray-400 italic font-medium">
                                                {formData.supplier_id ? "Tidak ada faktur tertunggak untuk supplier ini." : "Pilih supplier untuk menampilkan daftar faktur."}
                                            </td>
                                        </tr>
                                    )}
                                    {fetchingInvoices && (
                                        <tr>
                                            <td colSpan={9} className="px-4 py-12 text-center">
                                                <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold">
                                                    <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce"></div>
                                                    <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                    <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                    <span className="ml-2 uppercase tracking-widest text-[10px]">Memuat Faktur...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Invoice Summary */}
                        <div className="flex justify-end pr-4 pt-4">
                            <div className="flex items-center gap-6">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total utang dibayar</span>
                                <div className="px-6 py-4 bg-gray-900 rounded-2xl font-black text-white min-w-[200px] text-right text-xl shadow-xl border border-gray-800">
                                    Rp {totalInvoicePayment.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl font-black text-xs text-gray-500 hover:bg-gray-200 transition-all uppercase tracking-widest"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 rounded-xl font-black text-xs text-white transition-all flex items-center gap-2 shadow-lg shadow-emerald-200 uppercase tracking-widest"
                    >
                        {loading ? "Menyimpan..." : (
                            <>
                                <Save size={16} strokeWidth={3} /> Simpan Pembayaran
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
