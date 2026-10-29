"use client";

import { useState, useEffect } from "react";
import { X, Save, Landmark, Globe, Phone, MapPin, FileText, CheckCircle2 } from "lucide-react";
import SearchableSelect from "@/components/ui/SearchableSelect";
import api from "@/lib/api";

type BankAccount = {
    id?: number;
    code: string;
    name: string;
    address: string;
    phone: string;
    note: string;
    account_number: string;
    status: "Active" | "Inactive";
    currency_id: number | "";
    account_type: "Cash" | "Bank";
};

type BankAccountModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    accountToEdit?: BankAccount | null;
};

export default function BankAccountModal({
    isOpen,
    onClose,
    onSuccess,
    accountToEdit,
}: BankAccountModalProps) {
    const [formData, setFormData] = useState<BankAccount>({
        code: "",
        name: "",
        address: "",
        phone: "",
        note: "",
        account_number: "",
        status: "Active",
        currency_id: "",
        account_type: "Bank",
    });

    const [currencies, setCurrencies] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchCurrencies();
            if (accountToEdit) {
                setFormData(accountToEdit);
            } else {
                setFormData({
                    code: "",
                    name: "",
                    address: "",
                    phone: "",
                    note: "",
                    account_number: "",
                    status: "Active",
                    currency_id: "",
                    account_type: "Bank",
                });
            }
        }
    }, [isOpen, accountToEdit]);

    const fetchCurrencies = async () => {
        try {
            const res = await api.express.get("/currencies");
            if (res.data.data) {
                setCurrencies(res.data.data.map((c: any) => ({ value: c.id, label: `${c.code} - ${c.currency_name}` })));
            }
        } catch (err) {
            console.error("Error fetching currencies:", err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.currency_id) {
            alert("Silakan pilih mata uang");
            return;
        }
        setLoading(true);
        try {
            if (accountToEdit?.id) {
                await api.express.put(`/bank-accounts/${accountToEdit.id}`, formData);
            } else {
                await api.express.post("/bank-accounts", formData);
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to save bank account");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col border border-gray-100">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4 text-white">
                        <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                            <Landmark size={24} className="text-emerald-50" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight">{accountToEdit ? "Edit" : "Tambah"} Kas/Bank</h2>
                            <p className="text-emerald-100 text-xs font-medium opacity-80">Kelola informasi rekening keuangan</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all text-white/80 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Kode Bank <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-emerald-500 font-bold text-sm transition-all"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                required
                                placeholder="Contoh: BCA-IDR"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Nama Bank/Kas <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-emerald-500 font-bold text-sm transition-all"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="Nama akun bank"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">No. Rekening</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-emerald-500 font-bold text-sm transition-all"
                                value={formData.account_number}
                                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                                placeholder="Nomor rekening"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Mata Uang <span className="text-red-500">*</span></label>
                            <SearchableSelect
                                options={currencies}
                                value={formData.currency_id}
                                onChange={(val) => setFormData({ ...formData, currency_id: Number(val) })}
                                placeholder="-Pilih Mata Uang-"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Tipe Rekening <span className="text-red-500">*</span></label>
                            <select
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-emerald-500 font-bold text-sm transition-all"
                                value={formData.account_type}
                                onChange={(e) => setFormData({ ...formData, account_type: e.target.value as any })}
                                required
                            >
                                <option value="Bank">Bank</option>
                                <option value="Cash">Kas (Tunai)</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Status <span className="text-red-500">*</span></label>
                            <select
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-emerald-500 font-bold text-sm transition-all"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                required
                            >
                                <option value="Active">Aktif</option>
                                <option value="Inactive">Non-Aktif</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Telepon</label>
                        <div className="relative">
                            <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-emerald-500 font-bold text-sm transition-all"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="Nomor telepon bank"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Alamat</label>
                        <div className="relative">
                            <MapPin size={14} className="absolute left-4 top-4 text-gray-400" />
                            <textarea
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-emerald-500 font-bold text-sm transition-all min-h-[80px]"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Alamat kantor bank"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Kotak Pesan / Catatan</label>
                        <div className="relative">
                            <FileText size={14} className="absolute left-4 top-4 text-gray-400" />
                            <textarea
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-emerald-500 font-bold text-sm transition-all min-h-[80px]"
                                value={formData.note}
                                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                placeholder="Catatan tambahan..."
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl font-black text-xs text-gray-500 hover:bg-gray-100 transition-all uppercase tracking-widest"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 rounded-xl font-black text-xs text-white transition-all flex items-center gap-2 shadow-lg shadow-emerald-100 uppercase tracking-widest"
                        >
                            {loading ? "Menyimpan..." : (
                                <>
                                    <Save size={16} strokeWidth={3} /> Simpan Data
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
