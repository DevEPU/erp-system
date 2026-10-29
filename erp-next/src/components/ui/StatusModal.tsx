"use client";

import React from "react";
import { CheckCircle2, XCircle, AlertTriangle, X, Loader2 } from "lucide-react";

type ModalType = "confirm" | "success" | "error" | "loading";

interface StatusModalProps {
    isOpen: boolean;
    type: ModalType;
    title: string;
    message: string;
    onConfirm?: () => void;
    onClose: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    isLoading?: boolean;
}

const StatusModal: React.FC<StatusModalProps> = ({
    isOpen,
    type,
    title,
    message,
    onConfirm,
    onClose,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    isLoading = false,
}) => {
    if (!isOpen) return null;

    const icons = {
        confirm: <AlertTriangle className="text-amber-500" size={32} />,
        success: <CheckCircle2 className="text-emerald-500" size={32} />,
        error: <XCircle className="text-red-500" size={32} />,
        loading: <Loader2 className="text-blue-500 animate-spin" size={32} />,
    };

    const bgColors = {
        confirm: "bg-amber-50",
        success: "bg-emerald-50",
        error: "bg-red-50",
        loading: "bg-blue-50",
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
                <div className="px-6 pt-7 pb-4 flex flex-col items-center text-center">
                    {/* Icon Container */}
                    <div
                        className={`p-3 rounded-2xl ${bgColors[type]} mb-4 shadow-inner`}
                    >
                        {icons[type]}
                    </div>

                    {/* Text Content */}
                    <h3 className="text-lg font-black text-gray-900 mb-1.5 tracking-tight">
                        {title}
                    </h3>
                    <p className="text-gray-500 text-xs leading-relaxed px-2 font-medium">
                        {message}
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="px-6 pb-7 flex flex-col gap-2">
                    {type === "confirm" ? (
                        <>
                            <button
                                onClick={onConfirm}
                                disabled={isLoading}
                                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                            >
                                {isLoading && (
                                    <Loader2
                                        size={15}
                                        className="animate-spin"
                                    />
                                )}
                                {confirmLabel}
                            </button>
                            <button
                                onClick={onClose}
                                disabled={isLoading}
                                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 text-sm"
                            >
                                {cancelLabel}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onClose}
                            className={`w-full py-2.5 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 text-sm ${
                                type === "success"
                                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                                    : type === "error"
                                      ? "bg-red-600 hover:bg-red-700 shadow-red-200"
                                      : "bg-gray-900 hover:bg-gray-800"
                            }`}
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StatusModal;
