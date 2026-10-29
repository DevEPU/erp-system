"use client";

import Image from "next/image";

type Props = {
    message?: string;
};

export default function LoadingState({
    message = "Sedang memuat data, mohon tunggu sebentar...",
}: Props) {
    return (
        <div className="p-12 bg-white shadow-sm rounded-2xl border border-gray-100 flex flex-col justify-center items-center text-center min-h-[200px]">
            {/* Spinner & Text */}
            <div className="flex flex-col items-center max-w-md">
                <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4"></div>

                <h1 className="text-xl font-bold text-gray-800">Memuat Data</h1>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                    {message}
                </p>
            </div>
        </div>
    );
}
