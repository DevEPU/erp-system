"use client";

import { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  AlertTriangle,
  ShoppingCart,
  Calculator,
  Search,
  ChevronDown,
  Lightbulb,
  HandCoins,
  Info,
  Check,
  RefreshCw,
} from "lucide-react";
import SearchableSelect from "../ui/SearchableSelect";
import api from "@/lib/api";

type Product = {
  id: number;
  product_name: string;
  product_code: string;
  product_unit: string;
  product_price: number;
  is_asset: boolean | number;
  is_mandatory?: boolean | number;
  category?: {
    id: number;
    category_name: string;
  };
};

type Department = {
  id: number;
  department_name: string;
};

type PurchaseItem = {
  product_id: string;
  product_name: string;
  product_code: string;
  product_unit: string;
  quantity: string;
  price: string;
  sub_total: string;
  is_asset: boolean;
  use_master_price: boolean;
};

type PurchaseModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  purchaseToEdit?: any | null;
  canViewAllDepartments?: boolean;
  userDepartmentId?: number | null;
};

export default function PurchaseModal({
  isOpen,
  onClose,
  onSuccess,
  purchaseToEdit,
  canViewAllDepartments = true,
  userDepartmentId = null,
}: PurchaseModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    reference: "",
    department_id: "",
    supplier_id: "",
    items: [] as PurchaseItem[],
    total_amount: "0",
    total_assets: "0",
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");

  // Budget verification states
  const [budgetVerificationStatus, setBudgetVerificationStatus] = useState<
    "idle" | "checking" | "insufficient" | "confirmed"
  >("idle");
  const [availableSourceBudgets, setAvailableSourceBudgets] = useState<any[]>(
    [],
  );
  const [selectedSourceBudgetId, setSelectedSourceBudgetId] =
    useState<string>("");
  const [originalRemaining, setOriginalRemaining] = useState<number>(0);
  const [overBudgetCategories, setOverBudgetCategories] = useState<any[]>([]);
  const [isCheckingBudget, setIsCheckingBudget] = useState<boolean>(false);
  const [loadingRef, setLoadingRef] = useState(false);

  // Close search on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activeSearchIndex !== null) {
        const target = e.target as HTMLElement;
        if (!target.closest(".relative")) {
          setActiveSearchIndex(null);
        }
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [activeSearchIndex]);

  const fetchNextRef = async (deptId?: string | number | "", force = false) => {
    if (purchaseToEdit && !force) return;
    try {
      setLoadingRef(true);
      const params: any = { type: 'PR' };
      if (deptId) params.department_id = deptId;
      
      const res = await api.express.get("/references/next-reference", params);
      if (res.data.success) {
        setFormData(prev => ({ ...prev, reference: res.data.reference }));
      }
    } catch (err) {
      console.error("Failed to fetch next PR reference:", err);
    } finally {
      setLoadingRef(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFormData();
      if (purchaseToEdit) {
        // ... (edit logic remains same)
        setFormData({
          date: purchaseToEdit.date,
          reference: purchaseToEdit.reference || "",
          department_id: (purchaseToEdit.department_id ?? "").toString(),
          supplier_id: (purchaseToEdit.supplier_id ?? "").toString(),
          total_amount: (
            purchaseToEdit.purchase_details ||
            purchaseToEdit.purchaseDetails ||
            []
          )
            .reduce(
              (acc: number, d: any) =>
                !d.is_asset ? acc + parseFloat(d.sub_total || 0) : acc,
              0,
            )
            .toString(),
          total_assets: (
            purchaseToEdit.purchase_details ||
            purchaseToEdit.purchaseDetails ||
            []
          )
            .reduce(
              (acc: number, d: any) =>
                d.is_asset ? acc + parseFloat(d.sub_total || 0) : acc,
              0,
            )
            .toString(),
          items:
            (
              purchaseToEdit.purchase_details ||
              purchaseToEdit.purchaseDetails ||
              []
            ).map((d: any) => {
              const savedPrice = parseFloat((d.price ?? d.unit_price ?? 0).toString());
              return {
                product_id: (
                  d.product_id ??
                  d.products_id ??
                  d.product?.id ??
                  ""
                ).toString(),
                product_name: d.product_name || d.product?.product_name || "",
                product_code: d.product_code || d.product?.product_code || "",
                product_unit: d.product_unit || d.product?.product_unit || "Unit",
                quantity: (d.quantity ?? 1).toString(),
                price: savedPrice.toString(),
                sub_total: (d.sub_total ?? 0).toString(),
                is_asset: !!d.is_asset,
                use_master_price: false,
              };
            }) || [],
        });

        // Initialize borrowing ID if it exists
        const allocations = purchaseToEdit.purchase_budget_allocations || purchaseToEdit.allocations || [];
        const borrowAlloc = allocations.find((a: any) => 
            Number(a.source_master_budget_id) === Number(purchaseToEdit.borrowed_master_budget_id)
        );
        if (borrowAlloc) {
            setSelectedSourceBudgetId(borrowAlloc.source_budget_detail_id.toString());
        }
      } else {
        const initialDeptId = (!canViewAllDepartments && userDepartmentId) ? userDepartmentId.toString() : "";
        setFormData(prev => {
          if (prev.reference) return prev;
          return {
            date: new Date().toISOString().split("T")[0],
            reference: "",
            department_id: initialDeptId,
            supplier_id: "",
            items: [
              {
                product_id: "",
                product_name: "",
                product_code: "",
                product_unit: "Unit",
                quantity: "1",
                price: "0",
                sub_total: "0",
                is_asset: false,
                use_master_price: true,
              },
            ],
            total_amount: "0",
            total_assets: "0",
          };
        });
        if (!formData.reference) fetchNextRef(initialDeptId);
      }
    }
  }, [isOpen, purchaseToEdit]); // Removed userDepartmentId and canViewAllDepartments to avoid wipes

  // Separate effect for userDepartmentId
  useEffect(() => {
     if (isOpen && !purchaseToEdit && userDepartmentId && !formData.department_id) {
        const deptStr = userDepartmentId.toString();
        setFormData(prev => ({ ...prev, department_id: deptStr }));
        if (!formData.reference) fetchNextRef(deptStr);
     }
  }, [userDepartmentId, isOpen]);

  // Cleanup: Reset everything when modal closes to prevent flash of old data or state persistence
  useEffect(() => {
    if (!isOpen) {
      setProducts([]);
      setDepartments([]);
      setBudgetVerificationStatus("idle");
      setAvailableSourceBudgets([]);
      setSelectedSourceBudgetId("");
      setOverBudgetCategories([]);
      setError(null);
      setFormData({
        date: new Date().toISOString().split("T")[0],
        reference: "",
        department_id: (!canViewAllDepartments && userDepartmentId) ? userDepartmentId.toString() : "",
        supplier_id: "",
        items: [
          {
            product_id: "",
            product_name: "",
            product_code: "",
            product_unit: "Unit",
            quantity: "1",
            price: "0",
            sub_total: "0",
            is_asset: false,
            use_master_price: true,
          },
        ],
        total_amount: "0",
        total_assets: "0",
      });
    }
  }, [isOpen, canViewAllDepartments, userDepartmentId]);

  // Reset budget verification if crucial data changes
  useEffect(() => {
    if (isOpen) {
      setBudgetVerificationStatus("idle");
    }
  }, [formData.total_amount, formData.department_id, formData.date]);

  // Auto-resolve missing product_id if name/code exists (Stable Version)
  useEffect(() => {
    if (products.length > 0 && isOpen && purchaseToEdit) {
      setFormData((prev) => {
        const needsUpdate = prev.items.some(
          (item) =>
            !item.product_id && (item.product_name || item.product_code),
        );

        if (!needsUpdate) return prev;

        const newItems = prev.items.map((item) => {
          if (!item.product_id && (item.product_name || item.product_code)) {
            const match = products.find(
              (p) =>
                (item.product_code && p.product_code === item.product_code) ||
                (item.product_name && p.product_name === item.product_name),
            );
            if (match) {
              const price = parseFloat(match.product_price?.toString() || "0");
              const qty = parseFloat(item.quantity || "1");
              // Keep the saved item price; only switch to master if
              // the item currently has no price or we can apply master.
              const finalPrice = item.price && parseFloat(item.price) > 0 ? parseFloat(item.price) : price;
              return {
                ...item,
                product_id: match.id.toString(),
                product_name: match.product_name,
                product_code: match.product_code,
                product_unit: match.product_unit || item.product_unit,
                price: finalPrice.toString(),
                sub_total: (qty * finalPrice).toString(),
                is_asset: !!match.is_asset,
                // Only enable master-price toggle if product has a master price
                use_master_price: price > 0,
              };
            }
          }
          return item;
        });

        const total = newItems.reduce(
          (acc, curr) =>
            !curr.is_asset ? acc + parseFloat(curr.sub_total || "0") : acc,
          0,
        );
        const totalAssets = newItems.reduce(
          (acc, curr) =>
            curr.is_asset ? acc + parseFloat(curr.sub_total || "0") : acc,
          0,
        );

        return {
          ...prev,
          items: newItems,
          total_amount: total.toString(),
          total_assets: totalAssets.toString(),
        };
      });
    }
  }, [products.length, isOpen, !!purchaseToEdit]);

  const fetchFormData = async () => {
    setLoading(true);
    // Get user ID from local storage
    const storedUser = localStorage.getItem("user");
    let params: Record<string, any> = {};

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user && user.id) {
          params.user_id = user.id;
        }
      } catch (e) {
        console.error("Failed to parse user from local storage", e);
      }
    }

    try {
      const [formRes, supRes] = await Promise.all([
        api.express.get("/products/budgeting/form-data", params),
        api.express.get("/suppliers", { params: { limit: 999 } }).catch(() => ({ data: [] }))
      ]);
      const data = formRes.data || {};
      setDepartments(data.departments || []);
      setProducts(data.products || []);

      const supData = supRes.data?.data || supRes.data || [];
      setSuppliers(Array.isArray(supData) ? supData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_id: "",
          product_name: "",
          product_code: "",
          product_unit: "Unit",
          quantity: "1",
          price: "0",
          sub_total: "0",
          is_asset: false,
          use_master_price: true,
        },
      ],
    }));
  };

  const removeItem = (index: number) => {
    setFormData((prev) => {
      const newItems = prev.items.filter((_, i) => i !== index);
      const total = newItems.reduce(
        (acc, curr) =>
          !curr.is_asset ? acc + parseFloat(curr.sub_total || "0") : acc,
        0,
      );
      const totalAssets = newItems.reduce(
        (acc, curr) =>
          curr.is_asset ? acc + parseFloat(curr.sub_total || "0") : acc,
        0,
      );
      return {
        ...prev,
        items: newItems,
        total_amount: total.toString(),
        total_assets: totalAssets.toString(),
      };
    });
  };

  const updateItem = (
    index: number,
    field: keyof PurchaseItem,
    value: string,
  ) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      const item = newItems[index];

      if (field === "product_id") {
        const [parentId, prodCode] = value.split("_");
        const prod = products.find((p) => p.id.toString() === parentId && p.product_code === prodCode);
        item.product_id = parentId;
        item.product_name = prod?.product_name || "";
        item.product_code = prod?.product_code || "";
        item.product_unit = prod?.product_unit || "Unit";
        const masterPrice = parseFloat(prod?.product_price?.toString() || "0");
        item.price = masterPrice.toString();
        item.is_asset = !!prod?.is_asset;
        item.use_master_price = masterPrice > 0;
      } else if (field === "use_master_price") {
        const isActive = value === "true";
        if (isActive) {
          const prod = products.find(
            (p) => p.id.toString() === item.product_id,
          );
          const masterPrice = parseFloat(prod?.product_price?.toString() || "0");
          if (masterPrice > 0) {
            item.use_master_price = true;
            item.price = masterPrice.toString();
          } else {
            item.use_master_price = false;
            item.price = "0";
          }
        } else {
          item.use_master_price = false;
          item.price = "0";
        }
      } else if (field === "is_asset") {
        item.is_asset = value === "true";
      } else {
        (item as any)[field] = value;
      }

      // Calculate subtotal
      const qty = parseFloat(item.quantity || "0");
      const price = parseFloat(item.price || "0");
      item.sub_total = (qty * price).toString();

      const total = newItems.reduce(
        (acc, curr) =>
          !curr.is_asset ? acc + parseFloat(curr.sub_total || "0") : acc,
        0,
      );
      const totalAssets = newItems.reduce(
        (acc, curr) =>
          curr.is_asset ? acc + parseFloat(curr.sub_total || "0") : acc,
        0,
      );
      return {
        ...prev,
        items: newItems,
        total_amount: total.toString(),
        total_assets: totalAssets.toString(),
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate basic required fields
    if (!formData.department_id) {
      setError("Silakan pilih departemen terlebih dahulu.");
      return;
    }

    if (formData.items.length === 0) {
      setError("Minimal harus ada 1 item produk.");
      return;
    }

    const hasInvalidPrice = formData.items.some(
      (item) => parseFloat(item.price || "0") <= 0,
    );
    if (hasInvalidPrice) {
      setError("Semua produk harus memiliki harga lebih dari 0. Silakan isi harga secara manual jika harga master kosong.");
      return;
    }

    setError(null);

    // 2. Budget Verification (Only if not already confirmed)
    if (budgetVerificationStatus === "idle") {
      setBudgetVerificationStatus("checking");
      setIsCheckingBudget(true);
      try {
        const budgetGroups: Record<
          string,
          { category_id: number; category_name: string; is_mandatory: boolean; sum_amount: number }
        > = {};

        formData.items.forEach((i) => {
          if (i.is_asset) return; // skip asset items
          const product = products.find(
            (p) => p.id.toString() === i.product_id,
          );
          const catId = product?.category?.id || 0;
          const catName = product?.category?.category_name || 'General';
          const isMandatory = !!(product as any)?.is_mandatory;

          const key = `${catId}_${isMandatory}`;
          if (!budgetGroups[key]) {
            budgetGroups[key] = {
              category_id: catId,
              category_name: catName,
              is_mandatory: isMandatory,
              sum_amount: 0,
            };
          }
          budgetGroups[key].sum_amount += parseFloat(i.sub_total || "0");
        });

        const groupedItems = Object.values(budgetGroups);

        // ✅ If ALL items are assets, skip budget check entirely
        if (groupedItems.length === 0) {
          setBudgetVerificationStatus("confirmed");
          savePurchase(null, null);
          return;
        }

        const payload = {
          department_id: formData.department_id,
          date: formData.date,
          items: groupedItems,
        };

        const { data: checkData } = await api.post("/budgeting/check-category-budget", payload);

        if (!checkData.is_over_budget) {
          setBudgetVerificationStatus("confirmed");
          savePurchase(null, null);
        } else if (checkData.is_over_budget) {
          setBudgetVerificationStatus("insufficient");
          setOverBudgetCategories(checkData.over_budget_details || []);

          // Fetch alternative budgets
          const [yearStr, monthStr] = formData.date.split("-");
          const { data: availData } = await api.get("/budgeting/available-borrow-sources", {
            month: parseInt(monthStr),
            year: parseInt(yearStr),
            department_id: formData.department_id,
          });
          setAvailableSourceBudgets(availData.sources || []);
        } else {
          throw new Error(
            checkData.error || checkData.message || "Gagal memverifikasi budget",
          );
        }
      } catch (err: any) {
        setError("Gagal memverifikasi budget: " + err.message);
        setBudgetVerificationStatus("idle");
      } finally {
        setIsCheckingBudget(false);
      }
      return;
    }

    // 3. If confirmed or borrowing
    // Note: In a more complex scenario we'd map each category to a borrow source,
    // but for simplicity, the backend handles the allocation automatically IF total budget is sufficient,
    // or we just pass a signal that borrowing is intended and let backend auto-assign.
    // Here we pass the selected borrow source ID for the first shortfall.
    const sourceBudget = availableSourceBudgets.find(
      (b) => b.budget_detail_id.toString() === selectedSourceBudgetId,
    );
    savePurchase(
      sourceBudget?.master_budget_id ?? null,
      sourceBudget?.budget_detail_id ?? null,
    );
  };

  const savePurchase = async (
    sourceMasterBudgetId: number | null,
    sourceBudgetDetailId: number | null,
  ) => {
    setSubmitting(true);
    setError(null);

    try {
      const url = purchaseToEdit
        ? `/purchases/${purchaseToEdit.id}`
        : `/purchases`;
      const method = purchaseToEdit ? "put" : "post";

      // Get User ID from localStorage
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;

      const payload = {
        ...formData,
        source_master_budget_id: sourceMasterBudgetId,
        source_budget_detail_id: sourceBudgetDetailId,
        users_id: user?.id || null,
      };

      if (method === "put") {
        await api.put(url, payload);
      } else {
        await api.post(url, payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
      setBudgetVerificationStatus("idle");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col scale-100 animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <ShoppingCart size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              {purchaseToEdit
                ? "Edit Purchase Request"
                : "New Purchase Request"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-6 pb-60 relative"
        >
          {/* Over Budget Overlay UI */}
          {budgetVerificationStatus === "insufficient" && (
            <div className="absolute inset-x-0 top-0 z-40 bg-white/95 backdrop-blur-md p-8 animate-in slide-in-from-top-4 duration-300 flex flex-col items-center text-center space-y-6 border-b border-orange-100 shadow-xl min-h-full overflow-y-auto">
              <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center animate-pulse shadow-inner shrink-0">
                <AlertTriangle size={40} />
              </div>

              <div className="space-y-4 max-w-md w-full">
                <h3 className="text-2xl font-black text-gray-900 leading-tight">
                  Budget Kategori Tidak Mencukupi!
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Beberapa item dalam pengajuan Anda melebihi batas budget
                  kategori yang tersedia di departemen ini.
                </p>

                {/* List of over-budget categories */}
                <div className="w-full bg-orange-50/50 border border-orange-100 rounded-2xl p-4 text-left space-y-3">
                  <h4 className="text-xs font-bold text-orange-800 uppercase tracking-widest border-b border-orange-100 pb-2">
                    Rincian Kekurangan Budget
                  </h4>
                  {overBudgetCategories.map((cat, idx) => (
                    <div key={idx} className="flex flex-col gap-1 border-b border-orange-100/50 pb-2 last:border-0 last:pb-0">
                      <span className="text-sm font-black text-gray-800">
                        Kategori: {cat.category_name}
                      </span>
                      <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold">
                        <div>
                          Sisa:{" "}
                          <span className="font-medium">
                            Rp {cat.available?.toLocaleString("id-ID") || "0"}
                          </span>
                        </div>
                        <div>
                          Dibutuhkan:{" "}
                          <span className="font-medium text-orange-600">
                            Rp {cat.required?.toLocaleString("id-ID") || "0"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 flex justify-between items-center font-bold text-sm text-gray-900 border-t border-orange-200">
                    <span>Total Defisit:</span>
                    <span className="text-orange-600">
                      Rp{" "}
                      {overBudgetCategories
                        .reduce(
                          (acc, curr) =>
                            acc +
                            (curr.shortfall ||
                              curr.required - curr.available ||
                              0),
                          0,
                        )
                        .toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-3xl flex gap-4 text-left max-w-xl w-full shadow-sm">
                <div className="p-2.5 bg-white text-blue-600 rounded-2xl shadow-sm shrink-0 flex items-center justify-center">
                  <HandCoins size={24} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-gray-800">
                    Gunakan Budget Alternatif?
                  </p>
                  <p className="text-xs text-blue-600 leading-relaxed font-medium">
                    Anda dapat meminjam budget dari Kategori 'All Category' atau
                    departemen lain yang memiliki sisa budget di periode ini.
                  </p>
                </div>
              </div>

              <div className="mt-4 bg-orange-50 border border-orange-200 p-4 rounded-2xl flex gap-3 text-left max-w-xl w-full shadow-sm">
                <div className="shrink-0 mt-0.5 text-orange-600">
                  <Info size={18} />
                </div>
                <p className="text-[11px] text-orange-800 font-medium leading-relaxed">
                  <strong className="block mb-0.5 uppercase tracking-wide">
                    Aturan Peminjaman:
                  </strong>
                  Anda <strong>diwajibkan</strong> untuk menghabiskan sisa
                  budget di departemen sendiri (pada kategori lain) terlebih
                  dahulu, sebelum diperbolehkan meminjam budget dari departemen
                  lain.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-100 w-full max-w-xl animate-in slide-in-from-bottom-2 duration-500">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1 block text-left">
                  Pilih Sumber Budget
                </label>

                <div className="space-y-4 max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
                  {availableSourceBudgets.length === 0 ? (
                    <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <p className="text-sm text-gray-400 font-medium">
                        Tidak ada budget alternatif yang tersedia.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Internal Departments & All Category */}
                      {availableSourceBudgets.filter(
                        (b) =>
                          b.type === "Internal Department" ||
                          b.type === "All Category",
                      ).length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold uppercase text-gray-400 tracking-wider flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Budget Departemen Sendiri / Direksi
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {availableSourceBudgets
                              .filter(
                                (b) =>
                                  b.type === "Internal Department" ||
                                  b.type === "All Category",
                              )
                              .map((b) => (
                                <div
                                  key={b.budget_detail_id}
                                  onClick={() =>
                                    setSelectedSourceBudgetId(
                                      b.budget_detail_id.toString(),
                                    )
                                  }
                                  className={`
                                  relative p-4 rounded-2xl border-2 cursor-pointer transition-all active:scale-95 text-left group
                                  ${
                                    selectedSourceBudgetId ===
                                    b.budget_detail_id.toString()
                                      ? "border-emerald-500 bg-emerald-50/50 shadow-md shadow-emerald-100"
                                      : "border-gray-100 bg-white hover:border-emerald-200 hover:shadow-sm"
                                  }
                                `}
                                >
                                  {selectedSourceBudgetId ===
                                    b.budget_detail_id.toString() && (
                                    <div className="absolute top-3 right-3 text-emerald-500 bg-white rounded-full p-0.5 shadow-sm">
                                      <Check size={14} strokeWidth={3} />
                                    </div>
                                  )}

                                  <div className="space-y-1">
                                    <span
                                      className={`text-[10px] font-bold uppercase tracking-wider block ${
                                        b.type === "Internal Department"
                                          ? "text-blue-500"
                                          : "text-purple-500"
                                      }`}
                                    >
                                      {b.type}
                                    </span>
                                    <p
                                      className={`font-bold text-sm ${selectedSourceBudgetId === b.budget_detail_id.toString() ? "text-emerald-900" : "text-gray-700"}`}
                                    >
                                      {b.department_id === 0
                                        ? "Direksi"
                                        : b.department_name}
                                    </p>
                                    <p className="text-xs font-semibold text-gray-600 block">
                                      Kategori: {b.category_name}
                                    </p>
                                    <div className="pt-2 flex flex-col gap-0.5">
                                      {(() => {
                                        const totalShortfall =
                                          overBudgetCategories.reduce(
                                            (acc: number, curr: any) =>
                                              acc +
                                              (curr.shortfall ||
                                                curr.required -
                                                  curr.available ||
                                                0),
                                            0,
                                          );
                                        const isSuff =
                                          parseFloat(b.available_amount) >=
                                          totalShortfall;
                                        return (
                                          <span
                                            className={`text-xs font-bold ${isSuff ? "text-emerald-600" : "text-red-500"}`}
                                          >
                                            {isSuff
                                              ? "Saldo Mencukupi"
                                              : "Saldo Tidak Mencukupi"}
                                          </span>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* External Departments */}
                      {availableSourceBudgets.filter(
                        (b) => b.type === "External Department",
                      ).length > 0 && (
                        <div className="space-y-2 mt-4">
                          <h4 className="text-[10px] font-bold uppercase text-gray-400 tracking-wider flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                            Pinjam Lintas Departemen
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(() => {
                              const totalShortfall =
                                overBudgetCategories.reduce(
                                  (acc: number, curr: any) =>
                                    acc +
                                    (curr.shortfall ||
                                      curr.required - curr.available ||
                                      0),
                                  0,
                                );
                              const externalBudgets =
                                availableSourceBudgets.filter(
                                  (b) => b.type === "External Department",
                                );
                              const groupedExternalBudgets =
                                externalBudgets.reduce((acc, curr) => {
                                  const existing = acc.find(
                                    (g: any) =>
                                      g.department_id === curr.department_id,
                                  );
                                  if (existing) {
                                    existing.categories.push(curr);
                                  } else {
                                    acc.push({
                                      department_id: curr.department_id,
                                      department_name: curr.department_name,
                                      type: curr.type,
                                      categories: [curr],
                                    });
                                  }
                                  return acc;
                                }, [] as any[]);

                              return groupedExternalBudgets.map((dept: any) => {
                                const isSelected = dept.categories.some(
                                  (c: any) =>
                                    c.budget_detail_id.toString() ===
                                    selectedSourceBudgetId,
                                );

                                return (
                                  <div
                                    key={dept.department_id}
                                    onClick={() => {
                                      setSelectedSourceBudgetId(
                                        dept.categories[0].budget_detail_id.toString(),
                                      );
                                    }}
                                    className={`
                                      relative p-4 rounded-2xl border-2 cursor-pointer transition-all active:scale-95 text-left group
                                      ${
                                        isSelected
                                          ? "border-emerald-500 bg-emerald-50/50 shadow-md shadow-emerald-100"
                                          : "border-gray-100 bg-white hover:border-emerald-200 hover:shadow-sm"
                                      }
                                    `}
                                  >
                                    {isSelected && (
                                      <div className="absolute top-3 right-3 text-emerald-500 bg-white rounded-full p-0.5 shadow-sm">
                                        <Check size={14} strokeWidth={3} />
                                      </div>
                                    )}

                                    <div className="space-y-1">
                                      <span className="text-[10px] font-bold uppercase tracking-wider block text-orange-500">
                                        {dept.type}
                                      </span>
                                      <p
                                        className={`font-bold text-sm ${isSelected ? "text-emerald-900" : "text-gray-700"}`}
                                      >
                                        {dept.department_name}
                                      </p>

                                      {dept.categories.length > 1 ? (
                                        <div className="pt-1">
                                          <select
                                            value={
                                              isSelected
                                                ? selectedSourceBudgetId
                                                : dept.categories[0].budget_detail_id.toString()
                                            }
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              setSelectedSourceBudgetId(
                                                e.target.value,
                                              );
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full text-xs p-1.5 border border-gray-200 rounded-lg bg-white font-medium text-gray-700 outline-none focus:border-emerald-500"
                                          >
                                            {dept.categories.map((c: any) => (
                                              <option
                                                key={c.budget_detail_id}
                                                value={c.budget_detail_id}
                                              >
                                                Kategori: {c.category_name}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      ) : (
                                        <p className="text-xs font-semibold text-gray-600 block">
                                          Kategori:{" "}
                                          {dept.categories[0].category_name}
                                        </p>
                                      )}

                                      <div className="pt-2 flex flex-col gap-0.5">
                                        {(() => {
                                          const activeCatId = isSelected
                                            ? selectedSourceBudgetId
                                            : dept.categories[0].budget_detail_id.toString();
                                          const activeCat =
                                            dept.categories.find(
                                              (c: any) =>
                                                c.budget_detail_id.toString() ===
                                                activeCatId,
                                            );
                                          const isSuff =
                                            activeCat &&
                                            parseFloat(
                                              activeCat.available_amount,
                                            ) >= totalShortfall;
                                          return (
                                            <span
                                              className={`text-xs font-bold ${isSuff ? "text-emerald-600" : "text-red-500"}`}
                                            >
                                              {isSuff
                                                ? "Saldo Mencukupi"
                                                : "Saldo Tidak Mencukupi"}
                                            </span>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Warning Info */}
                <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-2xl flex gap-3 items-start text-left mt-2 shadow-sm">
                  <Info size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                    <strong className="block mb-0.5 uppercase tracking-wide">
                      Penting:
                    </strong>
                    Sistem akan secara otomatis mendistribusikan pinjaman
                    berdasarkan kekurangan pada masing-masing kategori. Harap
                    konfirmasi persetujuan peminjaman ke pihak berwenang sebelum
                    melanjutkan.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 pt-4 w-full max-w-xl pb-10">
                <button
                  type="button"
                  onClick={() => setBudgetVerificationStatus("idle")}
                  className="flex-1 py-4 px-6 rounded-2xl border-2 border-gray-100 font-black text-xs uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all active:scale-95"
                >
                  Batalkan
                </button>
                <button
                  type="button"
                  disabled={!selectedSourceBudgetId || submitting}
                  onClick={handleSubmit}
                  className="flex-1 py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                >
                  {submitting ? "Memproses..." : "Konfirmasi Pinjam"}
                </button>
              </div>
            </div>
          )}
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-start gap-2">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">
                Tanggal Transaksi
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    date: e.target.value,
                  }))
                }
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-400 border-l-2 border-blue-500 pl-2 uppercase tracking-wider text-gray-500">
                Nomor PR
              </label>
              <div className="flex gap-0 overflow-hidden rounded-xl border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all shadow-sm">
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData(p => ({ ...p, reference: e.target.value }))}
                  placeholder="PR-XXXXXX"
                  className="flex-1 px-4 py-3 bg-transparent border-none focus:ring-0 font-bold text-sm text-gray-700"
                />
                <button
                  type="button"
                  onClick={() => fetchNextRef(formData.department_id, true)}
                  className="px-4 bg-[#3b82f6] text-white hover:bg-blue-600 transition-colors flex items-center justify-center border-l border-gray-200"
                  title="Generate Next Reference"
                >
                  <RefreshCw size={18} className={loadingRef ? "animate-spin" : ""} />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">
                Departemen
              </label>
              <SearchableSelect
                label=""
                placeholder={loading ? "Memuat Data..." : "Pilih Departemen"}
                value={formData.department_id}
                onChange={(val) => {
                  setFormData((p) => ({
                    ...p,
                    department_id: val.toString(),
                  }));
                  if (!purchaseToEdit) fetchNextRef(val);
                }}
                disabled={loading || !canViewAllDepartments}
                options={(() => {
                  let opts: { value: string | number; label: string }[] = [];

                  if (canViewAllDepartments) {
                    // Show specific department if set but not in list (legacy/deleted?)
                    if (
                      formData.department_id &&
                      formData.department_id !== "0" &&
                      !departments.find(
                        (d) => d.id.toString() === formData.department_id,
                      )
                    ) {
                      opts.push({
                        value: formData.department_id,
                        label:
                          purchaseToEdit?.department?.department_name ||
                          `Dept ${formData.department_id}`,
                      });
                    }
                    // All departments
                    opts = [
                      ...opts,
                      ...departments.map((d) => ({
                        value: d.id,
                        label: d.department_name,
                      })),
                    ];
                  } else {
                    // Restricted view
                    if (userDepartmentId === 0) {
                      opts.push({ value: "0", label: "Direksi" });
                    } else {
                      const userDept = departments.find(
                        (d) => d.id === userDepartmentId,
                      );
                      if (userDept) {
                        opts.push({
                          value: userDept.id,
                          label: userDept.department_name,
                        });
                      }
                    }
                  }
                  return opts;
                })()}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">
                Supplier / Vendor (Opsional)
              </label>
              <SearchableSelect
                label=""
                placeholder={loading ? "Memuat Data..." : "Pilih Supplier / Vendor (Opsional)"}
                value={formData.supplier_id}
                onChange={(val) => {
                  setFormData((p) => ({
                    ...p,
                    supplier_id: val.toString(),
                  }));
                }}
                options={suppliers.map((s) => ({
                  value: s.id.toString(),
                  label: s.supplier_name || s.name || `Supplier #${s.id}`,
                }))}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-2 text-gray-700">
                <Plus size={18} className="text-emerald-500" />
                <h3 className="font-bold">Item Pembelian</h3>
              </div>
              <button
                type="button"
                onClick={addItem}
                className="text-sm bg-white border border-gray-200 text-emerald-600 px-4 py-2 rounded-xl font-bold hover:bg-emerald-50 transition-all shadow-sm"
              >
                Tambah Baris Transaksi
              </button>
            </div>

            <div className="space-y-3">
              {formData.items.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative group animate-in slide-in-from-right-2 duration-300 hover:shadow-md transition-all ring-1 ring-black/5 flex items-center gap-4"
                >
                  <div
                    className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${item.is_asset ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"}`}
                  >
                    {item.is_asset ? (
                      <Save size={20} />
                    ) : (
                      <Calculator size={20} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {item.product_id && (
                        <>
                          <div className="flex items-center gap-1.5 bg-slate-100/80 p-0.5 rounded-lg border border-slate-200 shadow-sm mr-1">
                            <button
                              type="button"
                              disabled
                              onClick={() => {}}
                              className={`text-[8px] font-black px-2 py-1 rounded-md transition-all duration-200 uppercase tracking-tighter cursor-not-allowed ${
                                item.is_asset
                                  ? "bg-orange-500 text-white shadow-sm ring-1 ring-orange-400"
                                  : "text-slate-400"
                              }`}
                            >
                              Asset
                            </button>
                            <button
                              type="button"
                              disabled
                              onClick={() => {}}
                              className={`text-[8px] font-black px-2 py-1 rounded-md transition-all duration-200 uppercase tracking-tighter cursor-not-allowed ${
                                !item.is_asset
                                  ? "bg-blue-500 text-white shadow-sm ring-1 ring-blue-400"
                                  : "text-slate-400"
                              }`}
                            >
                              Non Asset
                            </button>
                          </div>
                          <span
                            className={`text-[9px] font-black px-1.5 py-1 rounded-md uppercase tracking-tighter self-center h-fit ${
                              products.find(
                                (p) => p.id.toString() === item.product_id,
                              )?.is_mandatory
                                ? "bg-emerald-500 text-white shadow-sm shadow-emerald-200 border border-emerald-400"
                                : "bg-slate-200 text-slate-500 border border-slate-300"
                            }`}
                          >
                            {products.find(
                              (p) => p.id.toString() === item.product_id,
                            )?.is_mandatory
                              ? "MANDATORY"
                              : "Others"}
                          </span>
                        </>
                      )}
                      <div className="relative flex-1">
                        <div
                          onClick={() => {
                            setActiveSearchIndex(
                              activeSearchIndex === idx ? null : idx,
                            );
                            setSearchTerm("");
                          }}
                          className={`w-full px-0 py-0 bg-transparent border-none cursor-pointer flex justify-between items-center group/select`}
                        >
                          <span
                            className={`truncate text-[13px] ${
                              item.product_id
                                ? "text-gray-900 font-black"
                                : "text-gray-400 font-bold italic"
                            }`}
                          >
                            {item.product_id ? (
                              <>
                                <span className="text-blue-600 uppercase tracking-tighter font-black">
                                  {products.find(
                                    (p) => p.id.toString() === item.product_id,
                                  )?.category?.category_name || "---"}
                                </span>
                                <span className="mx-2 text-gray-400">-</span>
                                <span>{item.product_name}</span>
                              </>
                            ) : (
                              "Pilih Produk..."
                            )}
                          </span>
                        </div>

                        {activeSearchIndex === idx && (
                          <div className="absolute z-100 mt-3 left-0 w-[400px] bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="p-3 border-b border-gray-50 flex items-center gap-3 bg-gray-50/50">
                              <Search
                                size={16}
                                className="text-emerald-500 ml-1"
                              />
                              <input
                                autoFocus
                                type="text"
                                placeholder="Cari nama produk..."
                                className="w-full bg-transparent border-none focus:ring-0 text-sm py-1.5 placeholder:text-gray-400 font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                              />
                            </div>
                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar bg-white">
                              {products
                                .filter((p) =>
                                  (p.product_name || "")
                                    .toLowerCase()
                                    .includes(searchTerm.toLowerCase()),
                                )
                                .map((p) => (
                                  <div
                                    key={`${p.id}-${p.product_code}`}
                                    onClick={() => {
                                      updateItem(
                                        idx,
                                        "product_id",
                                        `${p.id}_${p.product_code}`,
                                      );
                                      setActiveSearchIndex(null);
                                    }}
                                    className="p-4 border-b border-gray-50 hover:bg-emerald-50/50 cursor-pointer transition-all group/item flex justify-between items-center"
                                  >
                                    <div>
                                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter mb-0.5">
                                        {p.category?.category_name || "---"}
                                      </p>
                                      <p className="font-bold text-gray-800 text-sm">
                                        {p.product_name}
                                      </p>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-1">
                                      <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[8px] font-black text-gray-500 border border-gray-200 uppercase tracking-tighter">
                                        {p.is_mandatory
                                          ? "MANDATORY"
                                          : "OTHERS"}
                                      </span>
                                      <p
                                        className={`text-[8px] font-black uppercase tracking-widest ${p.is_asset ? "text-orange-500" : "text-blue-500"}`}
                                      >
                                        {p.is_asset ? "IS ASSET" : "NON ASSET"}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="flex flex-col items-center w-10">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Qty
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(idx, "quantity", e.target.value)
                        }
                        className="w-full px-1 py-1.5 rounded-lg border border-gray-200 text-xs font-black text-center focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Satuan
                      </span>
                      <div className="px-3 py-1.5 bg-gray-50 rounded-lg text-xs font-bold text-gray-500 border border-gray-100 min-w-[50px] text-center">
                        {item.product_unit || "Unit"}
                      </div>
                    </div>

                    <div className="flex flex-col items-center min-w-[120px]">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Harga Master?
                      </span>
                      <label className={`relative inline-flex items-center mb-1 ${
                        (() => {
                          const prod = products.find(p => p.id.toString() === item.product_id);
                          const masterPrice = parseFloat(prod?.product_price?.toString() || "0");
                          return masterPrice <= 0 ? "cursor-not-allowed opacity-50" : "cursor-pointer";
                        })()
                      }`}>
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={item.use_master_price}
                          disabled={(() => {
                            const prod = products.find(p => p.id.toString() === item.product_id);
                            const masterPrice = parseFloat(prod?.product_price?.toString() || "0");
                            return masterPrice <= 0;
                          })()}
                          onChange={(e) =>
                            updateItem(
                              idx,
                              "use_master_price",
                              e.target.checked.toString(),
                            )
                          }
                        />
                        <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>

                      {!item.use_master_price && (
                        <div className="relative w-full mt-1">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">
                            Rp
                          </span>
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) =>
                              updateItem(idx, "price", e.target.value)
                            }
                            className="w-full pl-7 pr-2 py-1.5 rounded-lg border border-gray-200 text-xs font-black text-right focus:ring-2 focus:ring-emerald-500 outline-none hover:border-emerald-200 transition-colors"
                            placeholder="Estimasi..."
                          />
                        </div>
                      )}
                      {item.use_master_price && (
                        <div className="h-9 flex items-center">
                          <span className="text-[10px] font-bold text-gray-400 italic">
                            Menggunakan Harga Default
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>

        <div className="px-8 py-6 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-8 bg-gray-50/50">
          <div className="flex-1 bg-emerald-50/40 border border-emerald-100/50 p-4 rounded-2xl flex gap-4 items-start shadow-sm">
            <div className="p-2.5 bg-white text-emerald-600 rounded-xl shadow-sm shrink-0 border border-emerald-50">
              <Lightbulb size={18} />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-emerald-800 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Catatan Informasi
              </h4>
              <div className="text-[11px] text-emerald-700/90 leading-relaxed font-medium">
                <p className="mb-1 italic">
                  • Estimasi harga secara default menggunakan{" "}
                  <strong className="text-emerald-800">
                    Master Data Produk
                  </strong>
                  , namun Anda dapat menyesuaikannya secara manual jika
                  diperlukan.
                </p>
                <p className="italic">
                  • Produk yang ditandai sebagai{" "}
                  <strong className="text-emerald-800 font-black">Asset</strong>{" "}
                  tidak akan memotong budget operasional departemen Anda.
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-4 w-full md:w-auto shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 md:flex-none px-8 py-3 rounded-xl text-gray-600 hover:bg-gray-100 font-bold transition-all text-sm uppercase tracking-wide"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || isCheckingBudget}
              className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {submitting || isCheckingBudget ? (
                <>
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Simpan Pengajuan
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
