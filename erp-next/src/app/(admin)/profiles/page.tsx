"use client";

import { useRouter } from "next/navigation";
import {
    User,
    Mail,
    Shield,
    Building2,
    LogOut,
    ArrowLeft,
    CheckCircle2,
    Lock,
    Settings,
    PlusCircle,
    Edit3,
    Activity,
    Tag,
    Package,
} from "lucide-react";
import usePermission from "@/hooks/usePermission";

export default function ProfilePage() {
    const router = useRouter();
    const { user, loading } = usePermission();

    const handleLogout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        router.push("/login");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[85vh]">
                <div className="relative">
                    <div className="animate-spin rounded-xl h-16 w-16 border-4 border-emerald-100 border-t-emerald-600"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Activity
                            className="text-emerald-600 animate-pulse"
                            size={20}
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[85vh] text-gray-500 animate-in fade-in duration-500">
                <div className="p-8 bg-white/50 backdrop-blur-xl rounded-xl border border-white shadow-2xl shadow-emerald-900/5 text-center max-w-sm">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Lock size={40} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">
                        Akses Dibatasi
                    </h2>
                    <p className="text-gray-500 mb-8">
                        Silakan login untuk mengakses halaman profil Anda.
                    </p>
                    <button
                        onClick={() => router.push("/login")}
                        className="w-full py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                    >
                        Masuk Sekarang
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-10 max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* --- TOP NAVBAR --- */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="group flex items-center gap-3 px-5 py-2.5 bg-white/50 backdrop-blur-md rounded-2xl border border-white shadow-sm hover:shadow-md hover:bg-white transition-all duration-300"
                >
                    <ArrowLeft
                        size={18}
                        className="group-hover:-translate-x-1 transition-transform text-emerald-600"
                    />
                    <span className="text-sm font-bold text-gray-700">
                        Kembali
                    </span>
                </button>
                <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 opacity-50">
                        Sistem Budgeting
                    </p>
                    <p className="text-xs font-bold text-gray-400">
                        PT Eran Plastindo Utama
                    </p>
                </div>
            </div>

            {/* --- MAIN PROFILE CARD --- */}
            <section className="relative group">
                {/* Decorative Elements */}
                <div className="absolute -top-10 -right-10 w-64 h-64 bg-emerald-200/20 blur-[100px] rounded-full pointer-events-none"></div>
                <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-teal-200/20 blur-[80px] rounded-full pointer-events-none"></div>

                <div className="relative overflow-hidden bg-white/70 backdrop-blur-2xl rounded-2xl border border-white/50 shadow-2xl shadow-emerald-900/10">
                    {/* Header Pattern */}
                    <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-400 opacity-90">
                        <div
                            className="absolute inset-0 opacity-10 mix-blend-overlay"
                            style={{
                                backgroundImage:
                                    "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                                backgroundSize: "24px 24px",
                            }}
                        ></div>
                    </div>

                    <div className="relative pt-24 pb-12 px-10 flex flex-col md:flex-row items-center md:items-end gap-8">
                        {/* Avatar Section */}
                        <div className="relative group/avatar">
                            <div className="w-40 h-40 rounded-[2.5rem] bg-white p-2 shadow-2xl shadow-emerald-900/20 transform group-hover/avatar:rotate-3 transition-transform duration-500">
                                <div className="w-full h-full rounded-[2.1rem] bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center border border-emerald-100">
                                    <span className="text-5xl font-black text-emerald-600 drop-shadow-sm">
                                        {user.name?.substring(0, 2)}
                                    </span>
                                </div>
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-white p-1.5 rounded-2xl shadow-xl">
                                <div className="bg-emerald-500 text-white p-2 rounded-xl animate-pulse ring-4 ring-emerald-500/10">
                                    <Activity size={18} />
                                </div>
                            </div>
                        </div>

                        {/* Name & Role Section */}
                        <div className="flex-1 text-center md:text-left space-y-3 ">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                                <h1 className="text-4xl font-black text-gray-800 tracking-tight leading-none">
                                    {user.name}
                                </h1>
                                <div className="px-4 py-1.5 bg-emerald-100/50 backdrop-blur-md text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-xl border border-emerald-200 shadow-sm">
                                    {user.role_names?.[0] || "User"}
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center gap-4 text-gray-500 font-medium">
                                <div className="flex items-center gap-2 px-3 py-1 bg-white/40 rounded-lg">
                                    <Mail
                                        size={16}
                                        className="text-emerald-500"
                                    />
                                    <span className="text-sm">
                                        {user.email}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 bg-white/40 rounded-lg">
                                    <Building2
                                        size={16}
                                        className="text-teal-500"
                                    />
                                    <span className="text-sm">
                                        Departemen #{user.department_id || "?"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleLogout}
                                className="group flex items-center gap-3 px-8 py-4 bg-red-600 text-white rounded-xl hover:bg-red-700 hover:shadow-xl hover:shadow-red-500/20 active:scale-95 transition-all duration-300 font-black text-sm uppercase tracking-widest"
                            >
                                <LogOut
                                    size={20}
                                    className="group-hover:-translate-x-1 transition-transform"
                                />
                                Keluar
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- CONTENT GRID --- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* --- STATS/INFO COLUMN --- */}
                <div className="lg:col-span-4 space-y-10">
                    <div className="bg-white/70 backdrop-blur-2xl p-10 rounded-2xl border border-white/50 shadow-xl shadow-emerald-900/5">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                                <User size={24} />
                            </div>
                            <h2 className="font-black text-xl text-gray-800 tracking-tight">
                                Akun Saya
                            </h2>
                        </div>

                        <div className="space-y-6">
                            <div className="group">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block group-hover:text-emerald-500 transition-colors">
                                    Peran Utama
                                </label>
                                <p className="text-lg font-bold text-gray-700">
                                    {user.role_names?.[0] || "Standar"}
                                </p>
                            </div>
                            <div className="group">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block group-hover:text-emerald-500 transition-colors">
                                    Terdaftar Sebagai
                                </label>
                                <p className="text-lg font-bold text-gray-700">
                                    {user.email}
                                </p>
                            </div>
                            <div className="pt-4 mt-4 border-t border-gray-100">
                                <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                    <span className="text-sm font-bold text-emerald-700">
                                        Status Akun
                                    </span>
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-full uppercase tracking-tighter">
                                        <CheckCircle2 size={12} />
                                        Aktif
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- PERMISSIONS COLUMN --- */}
                <div className="lg:col-span-8">
                    <div className="bg-white/70 backdrop-blur-2xl p-10 rounded-xl border border-white/50 shadow-xl shadow-emerald-900/5 h-full">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
                                    <Package size={24} />
                                </div>
                                <div>
                                    <h2 className="font-black text-xl text-gray-800 tracking-tight">
                                        Kategori Produk
                                    </h2>
                                    <p className="text-xs text-gray-400 font-medium">
                                        Kategori yang terdaftar di akun Anda
                                    </p>
                                </div>
                            </div>
                            <div className="px-4 py-2 bg-emerald-50 rounded-xl">
                                <span className="text-xl font-black text-emerald-600">
                                    {user.categories?.length || 0}
                                </span>
                                <span className="text-[10px] font-black text-emerald-400 uppercase ml-2 tracking-tighter">
                                    Total
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                            {user.categories?.map((cat, idx) => {
                                return (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-4 p-4 rounded-2xl border border-emerald-100 bg-white transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-emerald-200 group/cat"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm shrink-0 group-hover/cat:bg-emerald-600 group-hover/cat:text-white transition-colors">
                                            <Tag size={16} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-700 group-hover/cat:text-emerald-700 transition-colors">
                                                {cat.category_name}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                ID: #{cat.id}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            {(!user.categories ||
                                user.categories.length === 0) && (
                                    <div className="col-span-2 flex flex-col items-center justify-center py-20 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                                        <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center text-gray-300 mb-4">
                                            <Package size={32} />
                                        </div>
                                        <p className="text-sm font-bold text-gray-400 tracking-tight uppercase">
                                            Tidak ada kategori terdaftar
                                        </p>
                                    </div>
                                )}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- FOOTER INFO --- */}
            <div className="text-center pb-10">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300">
                    Sistem Budgeting v1.0 • PT ERAN PLASTINDO UTAMA
                </p>
            </div>
        </div>
    );
}
