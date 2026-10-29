import { useState, useEffect } from "react";
import api from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";
import {
  X,
  Save,
  DollarSign,
  Package,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Check,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface UpdateActualModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: any;
  onSuccess: () => void;
}

export default function UpdateActualModal({
  isOpen,
  onClose,
  purchase,
  onSuccess,
}: UpdateActualModalProps) {
  const [items, setItems] = useState<any[]>([]);
  const [isPaid, setIsPaid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && purchase) {
      // Initialize items with estimated prices
      const initialItems = (
        purchase.purchase_details ||
        purchase.purchaseDetails ||
        purchase.details ||
        []
      ).map((detail: any) => ({
        id: detail.id,
        product_name: detail.product_name,
        product_code: detail.product_code,
        original_quantity: detail.quantity,
        quantity: detail.quantity,
        product_unit: detail.product_unit,
        estimated_price: parseFloat(detail.price),
        actual_price: parseFloat(detail.price),
        is_asset: detail.is_asset,
        category_name: detail.product?.category_name || "-",
        master_price: parseFloat(detail.product?.master_price || "0"),
        master_id: detail.product_id || detail.product?.id,
      }));
      setItems(initialItems);
      setIsPaid(purchase.payment_status === "Paid");
      setError("");
    }
  }, [isOpen, purchase]);

  if (!isOpen || !purchase) return null;

  const handlePriceChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index].actual_price = parseFloat(value) || 0;
    setItems(newItems);
  };

  const handleQuantityChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index].quantity = parseFloat(value) || 0;
    setItems(newItems);
  };

  const calculateTotals = () => {
    const estimatedTotal = items.reduce(
      (sum, item) => sum + item.estimated_price * item.original_quantity,
      0,
    );
    const actualTotal = items.reduce(
      (sum, item) => sum + item.actual_price * item.quantity,
      0,
    );
    const diff = actualTotal - estimatedTotal;

    return { estimatedTotal, actualTotal, diff };
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      const payload = {
        items: items.map((item) => ({
          id: item.id,
          actual_price: item.actual_price,
          quantity: item.quantity,
        })),
        is_paid: isPaid,
      };

      await api.express.post(`/purchases/${purchase.id}/update-actual`, payload);

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncPrice = async (productId: string, price: number, index: number) => {
    if (!productId) return;
    try {
      await api.express.put(`/products/${productId}/price`, { price });

      const newItems = [...items];
      newItems[index].master_price = price;
      setItems(newItems);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const { estimatedTotal, actualTotal, diff } = calculateTotals();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <DollarSign size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Update Harga Aktual
              </h2>
              <p className="text-xs text-gray-500">{purchase.reference}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-start gap-2">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Items Table */}
          <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-black text-gray-600 uppercase">
                      Produk
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-black text-gray-600 uppercase">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-black text-gray-600 uppercase">
                      Harga Estimasi
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-black text-gray-600 uppercase">
                      Harga Aktual
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-black text-gray-600 uppercase">
                      Subtotal
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-black text-gray-600 uppercase">
                      Master Data
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <Package
                            size={16}
                            className="text-gray-400 mt-1 shrink-0"
                          />
                          <div>
                            <p className="font-bold text-sm text-gray-900">
                              {item.product_name}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">
                                {item.category_name}
                              </span>
                              <span className="text-[10px] text-gray-300">•</span>
                              <span className="text-[10px] text-gray-400 font-bold">
                                {item.product_code}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              handleQuantityChange(index, e.target.value)
                            }
                            className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="1"
                            step="1"
                          />
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            {item.product_unit}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-gray-600">
                          Rp{" "}
                          {(
                            item.estimated_price * item.original_quantity
                          ).toLocaleString("id-ID")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={item.actual_price}
                          onChange={(e) =>
                            handlePriceChange(index, e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-bold text-gray-900">
                          Rp{" "}
                          {(item.actual_price * item.quantity).toLocaleString(
                            "id-ID",
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] font-bold text-gray-400">
                            Rp {item.master_price.toLocaleString("id-ID")}
                          </span>
                          {item.actual_price !== item.master_price && (
                            <button
                              onClick={() => handleSyncPrice(item.master_id, item.actual_price, index)}
                              className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-600 rounded-lg text-[9px] font-black uppercase tracking-tighter hover:bg-amber-200 transition-all"
                              title="Update harga master data"
                            >
                              <RefreshCw size={10} strokeWidth={3} />
                              Sync Master
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">
                  Total Estimasi
                </p>
                <p className="text-xl font-black text-gray-900">
                  Rp {estimatedTotal.toLocaleString("id-ID")}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">
                  Total Aktual
                </p>
                <p className="text-xl font-black text-blue-600">
                  Rp {actualTotal.toLocaleString("id-ID")}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">
                  Selisih
                </p>
                <div className="flex items-center gap-2">
                  {diff > 0 ? (
                    <TrendingUp size={20} className="text-red-500" />
                  ) : diff < 0 ? (
                    <TrendingDown size={20} className="text-green-500" />
                  ) : null}
                  <p
                    className={`text-xl font-black ${
                      diff > 0
                        ? "text-red-600"
                        : diff < 0
                          ? "text-green-600"
                          : "text-gray-600"
                    }`}
                  >
                    {diff > 0 ? "+" : ""}
                    Rp {diff.toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Status Toggle */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl ${isPaid ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-500"}`}
                >
                  <Check size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900">
                    Tandai sebagai Sudah Dibayar
                  </p>
                  <p className="text-xs text-gray-500">
                    Aktifkan jika pembelian ini sudah selesai dibayar
                  </p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 px-6 rounded-2xl border-2 border-gray-200 font-black text-sm uppercase tracking-wider text-gray-600 hover:bg-gray-100 transition-all active:scale-95 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Menyimpan...
              </>
            ) : (
              <>
                <Save size={18} />
                Simpan Update
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
