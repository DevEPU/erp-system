import { useState } from "react";
import { X, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import api from "@/lib/api";

interface ApprovalActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    type: "approve" | "reject";
    requestId: number;
    backendUrl: string;
    userId: number | null;
}

export default function ApprovalActionModal({
    isOpen,
    onClose,
    onSuccess,
    type,
    requestId,
    backendUrl,
    userId,
}: ApprovalActionModalProps) {
    const [submitting, setSubmitting] = useState(false);
    const [note, setNote] = useState("");
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const url = `/approval-requests/${requestId}/${type}`;
            await api.post(url, { 
                comment: note, 
                user_id: userId 
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || "Failed to process request.");
        } finally {
            setSubmitting(false);
        }
    };

    const isApprove = type === "approve";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div
                    className={`px-6 py-4 border-b flex justify-between items-center ${isApprove ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className={`p-2 rounded-xl ${isApprove ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}
                        >
                            {isApprove ? (
                                <CheckCircle2 size={20} />
                            ) : (
                                <XCircle size={20} />
                            )}
                        </div>
                        <h2
                            className={`text-xl font-bold ${isApprove ? "text-emerald-900" : "text-red-900"}`}
                        >
                            {isApprove ? "Approve Request" : "Reject Request"}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/50 rounded-full transition-colors text-gray-500"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-start gap-2">
                            <AlertCircle
                                size={18}
                                className="shrink-0 mt-0.5"
                            />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">
                            Catatan {isApprove ? "(Optional)" : "(Wajib)"}
                        </label>
                        <textarea
                            required={!isApprove}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={
                                isApprove
                                    ? "Tambahkan catatan persetujuan..."
                                    : "Alasan penolakan..."
                            }
                            className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-gray-400 min-h-[100px] resize-none font-medium"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors text-sm uppercase tracking-wide"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className={`px-6 py-3 rounded-xl font-bold text-white transition-all shadow-lg active:scale-95 text-sm uppercase tracking-wide flex items-center gap-2 ${
                                isApprove
                                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                                    : "bg-red-600 hover:bg-red-700 shadow-red-200"
                            } ${submitting ? "opacity-70 cursor-wait" : ""}`}
                        >
                            {submitting ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : isApprove ? (
                                <CheckCircle2 size={18} />
                            ) : (
                                <XCircle size={18} />
                            )}
                            {submitting
                                ? "Prosessing..."
                                : isApprove
                                  ? "Approve"
                                  : "Reject"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
