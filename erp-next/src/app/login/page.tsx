"use client";

import { API_BASE_URL } from "@/lib/constants";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Auto-redirect if already logged in (e.g. from another tab or restored session)
    useEffect(() => {
        if (typeof window !== "undefined") {
            const user = localStorage.getItem("user");
            const token = localStorage.getItem("token");
            if (user || token) {
                router.replace("/dashboard");
            }
        }
    }, [router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // Use 127.0.0.1 to avoid localhost IPv6 resolution issues with artisan serve
            const backendUrl =
                process.env.NEXT_PUBLIC_BACKEND_URL || API_BASE_URL;

            // Note: We are using a custom API route /api/login in the Laravel backend
            // to bypass CSRF and Web middleware issues.

            const response = await fetch(`${backendUrl}/api/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            if (response.ok || response.status === 204) {
                // Login successful
                const data = await response.json();
                localStorage.setItem("user", JSON.stringify(data.user));
                if (data.token) {
                    localStorage.setItem("token", data.token);
                }

                router.push("/dashboard"); // Redirect to dashboard
            } else {
                const data = await response.json().catch(() => ({}));
                setError(
                    data.message ||
                        "Login failed. Please check your credentials.",
                );
            }
        } catch (err) {
            setError("An error occurred. Please try again later.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    const [isVisible, setIsVisible] = useState(false);
    const [clickCount, setClickCount] = useState(0);

    // Stealth Logic: Listen for "epu" typing
    useEffect(() => {
        let buffer = "";
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!e.key) return;
            buffer += e.key.toLowerCase();
            if (buffer.length > 3) {
                buffer = buffer.slice(-3);
            }
            if (buffer === "epu") {
                setIsVisible(true);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const handleStealthClick = () => {
        if (isVisible) return;
        const newCount = clickCount + 1;
        setClickCount(newCount);
        if (newCount >= 5) {
            setIsVisible(true);
        }
    };

    if (!isVisible) {
        return (
            <div
                onClick={handleStealthClick}
                className="h-screen w-screen bg-white cursor-default"
            />
        );
    }

    return (
        <div className="flex justify-center items-center h-screen w-screen bg-emerald-600 animate-in fade-in duration-700">
            <div>
                <div className="flex flex-col items-center">
                    <div className="bg-white p-2 rounded-full shadow-md">
                        <Image
                            src="/logo.png"
                            alt="Logo EPU"
                            width={60}
                            height={60}
                            priority
                            className="object-contain"
                        />
                    </div>
                    <div className="text-center mt-4">
                        <h1 className="font-bold text-center text-white text-3xl tracking-tight">
                            ERP System EPU
                        </h1>
                        <p className="text-emerald-100 text-sm font-medium tracking-wider mt-1">
                            PT ERAN PLASTINDO UTAMA
                        </p>
                    </div>
                </div>

                <div className="py-8 px-10 bg-white rounded-3xl mt-8 shadow-2xl w-[400px]">
                    <h1 className="text-emerald-700 text-center font-bold text-2xl mb-2">
                        Login
                    </h1>
                    <p className="text-center text-gray-500 text-sm mb-6">
                        Selamat Datang! Silahkan Isi Data Berikut
                    </p>

                    {/* Error Alert Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex gap-3 items-start animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="text-red-600 w-5 h-5 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-red-600 font-medium leading-relaxed">
                                {error}
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleLogin}>
                        <div className="mb-4">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                required
                                placeholder="contoh@email.com"
                                className="w-full py-3 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:text-gray-400"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        <div className="mb-6">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                placeholder="********"
                                className="w-full py-3 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:text-gray-400"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                            />
                            <div className="mt-2 flex justify-end">
                                <Link
                                    href="#"
                                    className="text-xs text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
                                >
                                    Lupa Kata Sandi?
                                </Link>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-700 hover:shadow-xl transition-all duration-200 transform active:scale-95 flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                "Masuk"
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-10 text-emerald-100/60 text-center text-sm">
                    <div className="flex gap-1 text-center justify-center mb-1">
                        <span>COPYRIGHT © 2025 | </span>
                        <Link
                            href="https://eranplastindoutama.co.id"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-white transition-colors"
                        >
                            PT ERAN PLASTINDO UTAMA
                        </Link>
                    </div>
                    <span>All Rights Reserved.</span>
                </div>
            </div>
        </div>
    );
}
