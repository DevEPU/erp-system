"use client";

import { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  Loader2,
  TrendingUp,
  Target,
} from "lucide-react";
import SearchableSelect from "../ui/SearchableSelect";
import api from "@/lib/api";

type Category = {
  id: number;
  category_name: string;
};

type Department = {
  id: number;
  department_name: string;
};

type BudgetDetail = {
  category_id: string;
  category_name: string;
  budget: string;
  percentage: string;
};

type MasterBudgetModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  budgetToEdit?: any | null;
};

export default function MasterBudgetModal({
  isOpen,
  onClose,
  onSuccess,
  budgetToEdit,
}: MasterBudgetModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    tgl_penyusunan: new Date().toISOString().split("T")[0],
    bulan: (new Date().getMonth() + 1).toString(),
    periode_awal: "",
    periode_akhir: "",
    department_id: "",
    grandtotal: "0",
    description: "",
    is_mandatory: false,
    items: [] as BudgetDetail[],
    target_sales_id: "",
    target_sales_amount: 0,
    total_percentage: 0,
  });

  const [targetSales, setTargetSales] = useState<any[]>([]);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchFormData();
      if (budgetToEdit) {
        setFormData({
          tgl_penyusunan: budgetToEdit.tgl_penyusunan,
          bulan: budgetToEdit.bulan.toString(),
          periode_awal: budgetToEdit.periode_awal,
          periode_akhir: budgetToEdit.periode_akhir,
          department_id: budgetToEdit.department_id.toString(),
          grandtotal: budgetToEdit.grandtotal.toString(),
          description: budgetToEdit.description || "",
          is_mandatory: !!budgetToEdit.is_mandatory,
          items: (budgetToEdit.details || []).map((d: any) => ({
            category_id: d.category_id?.toString() || "",
            category_name: d.category_name || "",
            budget: d.budget.toString(),
            percentage: (d.percentage || 0).toString(),
          })),
          target_sales_id: budgetToEdit.target_sales_id?.toString() || "",
          target_sales_amount: parseFloat(
            budgetToEdit.target_sales_amount || 0,
          ),
          total_percentage: parseFloat(budgetToEdit.total_percentage || 0),
        });
      } else {
        setFormData({
          tgl_penyusunan: new Date().toISOString().split("T")[0],
          bulan: (new Date().getMonth() + 1).toString(),
          periode_awal: "",
          periode_akhir: "",
          department_id: "",
          grandtotal: "0",
          description: "",
          is_mandatory: false,
          items: [
            {
              category_id: "",
              category_name: "",
              budget: "0",
              percentage: "0",
            },
          ],
          target_sales_id: "",
          target_sales_amount: 0,
          total_percentage: 0,
        });
      }
      fetchInitialData();
    }
  }, [isOpen, budgetToEdit]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [formDataRes, targetSalesRes] = await Promise.all([
        api.get("/budgeting/form-data"),
        api.get("/target-sales", { status: "Approved" }),
      ]);

      setDepartments(formDataRes.data.departments || []);
      setCategories(formDataRes.data.categories || []);

      const targets = targetSalesRes.data.data || targetSalesRes.data || [];
      setTargetSales(targets);

      // Auto-select match if creating new
      if (!budgetToEdit) {
        const selectedYear = new Date(formData.tgl_penyusunan).getFullYear();
        const selectedMonth = parseInt(formData.bulan);
        const matched = targets.find(
          (ts: any) =>
            Number(ts.month) === selectedMonth &&
            Number(ts.year) === selectedYear,
        );
        if (matched) {
          setFormData((prev) => ({
            ...prev,
            target_sales_id: matched.id.toString(),
            target_sales_amount: parseFloat(matched.target_amount || 0),
          }));
        }
      }
    } catch (e) {
      console.error("Error fetching initial data:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/budgeting/form-data");
      setDepartments(data.departments);
      setCategories(data.categories);
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
        { category_id: "", category_name: "", budget: "0", percentage: "0" },
      ],
    }));
  };

  const removeItem = (index: number) => {
    setFormData((prev) => {
      const newItems = prev.items.filter((_, i) => i !== index);
      return { ...prev, items: newItems };
    });
  };

  const updateItem = (
    index: number,
    field: keyof BudgetDetail,
    value: string,
  ) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      if (field === "category_id") {
        const cat = categories.find((c) => c.id.toString() === value);
        newItems[index].category_id = value;
        newItems[index].category_name = cat?.category_name || "";
      } else if (field === "percentage") {
        newItems[index].percentage = value;
        // Recalculate amount if target sales amount is present
        if (prev.target_sales_amount > 0) {
          const amount =
            (parseFloat(value || "0") / 100) * prev.target_sales_amount;
          newItems[index].budget = amount.toFixed(2);
        }
      } else if (field === "budget") {
        newItems[index].budget = value;
        // Recalculate percentage if target sales amount is present
        if (prev.target_sales_amount > 0) {
          const perc =
            (parseFloat(value || "0") / prev.target_sales_amount) * 100;
          newItems[index].percentage = perc.toFixed(2);
        }
      } else {
        newItems[index][field] = value;
      }

      // Recalculate total grandtotal and total percentage
      const total = newItems.reduce(
        (acc, curr) => acc + parseFloat(curr.budget || "0"),
        0,
      );
      const totalPerc = newItems.reduce(
        (acc, curr) => acc + parseFloat(curr.percentage || "0"),
        0,
      );

      return {
        ...prev,
        items: newItems,
        grandtotal: total.toString(),
        total_percentage: totalPerc,
      };
    });
  };

  const handleTargetSalesChange = (id: string) => {
    const selected = targetSales.find((ts) => ts.id.toString() === id);
    const amount = selected ? parseFloat(selected.target_amount || 0) : 0;

    setFormData((prev) => {
      // If we switch target sales, we might want to recalculate all items based on their percentages
      const newItems = prev.items.map((item) => {
        if (amount > 0) {
          const budgetAmt = (parseFloat(item.percentage || "0") / 100) * amount;
          return { ...item, budget: budgetAmt.toFixed(2) };
        }
        return item;
      });

      const total = newItems.reduce(
        (acc, curr) => acc + parseFloat(curr.budget || "0"),
        0,
      );

      return {
        ...prev,
        target_sales_id: id,
        target_sales_amount: amount,
        items: newItems,
        grandtotal: total.toString(),
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const url = budgetToEdit
        ? `/master-budgets/${budgetToEdit.id}`
        : `/master-budgets`;
      const method = budgetToEdit ? "put" : "post";

      // Get current user ID from localStorage
      let userId = 1; // fallback
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user && user.id) {
            userId = user.id;
          }
        } catch (e) {
          console.error("Error parsing user from localStorage", e);
        }
      }

      const payload = { ...formData, user_id: userId };
      if (method === "put") {
        await api.put(url, payload);
      } else {
        await api.post(url, payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - 1 + i); // e.g. 2024 to 2029

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">
            {budgetToEdit ? "Edit Master Budget" : "Add Master Budget"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-start gap-2">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-gray-500">
                Tahun
              </label>
              <SearchableSelect
                label=""
                value={new Date(formData.tgl_penyusunan).getFullYear()}
                onChange={(val) => {
                  const newYear = Number(val);
                  const current = new Date(formData.tgl_penyusunan);
                  current.setFullYear(newYear);
                  setFormData((p) => ({
                    ...p,
                    tgl_penyusunan: current.toISOString().split("T")[0],
                  }));
                }}
                options={years.map((y) => ({
                  value: y,
                  label: y.toString(),
                }))}
              />
            </div>
            <div className="space-y-1 hidden">
              <label className="text-xs font-bold uppercase text-gray-500">
                Tanggal Penyusunan
              </label>
              <input
                type="date"
                value={formData.tgl_penyusunan}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    tgl_penyusunan: e.target.value,
                  }))
                }
                required
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-gray-500">
                Bulan
              </label>
              <SearchableSelect
                label=""
                value={Number(formData.bulan)}
                onChange={(val) =>
                  setFormData((p) => ({
                    ...p,
                    bulan: val.toString(),
                  }))
                }
                options={months.map((m, i) => ({
                  value: i + 1,
                  label: m,
                }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-gray-500">
                Departemen
              </label>
              <SearchableSelect
                label=""
                placeholder="Pilih Departemen"
                value={
                  formData.department_id !== ""
                    ? Number(formData.department_id)
                    : ""
                }
                onChange={(val) =>
                  setFormData((p) => ({
                    ...p,
                    department_id: val.toString(),
                  }))
                }
                options={departments.map((d) => ({
                  value: d.id,
                  label: d.department_name,
                }))}
              />
            </div>
            {targetSales.length > 0 && (
              <div className="md:col-span-3 space-y-3">
                <label className="text-xs font-bold uppercase text-gray-400 tracking-widest flex items-center gap-2">
                  <TrendingUp size={14} className="text-emerald-500" />
                  Link to Sales Target
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(() => {
                    const currentYear = new Date(
                      formData.tgl_penyusunan,
                    ).getFullYear();
                    const yearFilteredTargets = targetSales.filter(
                      (ts) => Number(ts.year) === currentYear,
                    );

                    if (yearFilteredTargets.length === 0) {
                      return (
                        <div className="col-span-full py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            No Approved Targets for {currentYear}
                          </p>
                        </div>
                      );
                    }

                    return yearFilteredTargets.map((ts) => {
                      const isSelected =
                        formData.target_sales_id === ts.id.toString();
                      const isMonthMatch =
                        Number(ts.month) === parseInt(formData.bulan);
                      return (
                        <button
                          key={ts.id}
                          type="button"
                          onClick={() =>
                            handleTargetSalesChange(ts.id.toString())
                          }
                          className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-gray-100 bg-white hover:border-gray-200"
                          }`}
                        >
                          <div className="w-full flex justify-between items-start mb-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">
                              {months[Number(ts.month) - 1]} - {ts.year}
                            </span>
                            {isMonthMatch && (
                              <span className="bg-orange-100 text-orange-600 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">
                                Matching
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-sm font-bold whitespace-nowrap ${isSelected ? "text-emerald-700" : "text-gray-700"}`}
                          >
                            Rp{" "}
                            {parseFloat(ts.target_amount).toLocaleString(
                              "id-ID",
                            )}
                          </span>
                        </button>
                      );
                    });
                  })()}

                  <button
                    type="button"
                    onClick={() => handleTargetSalesChange("")}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed transition-all ${
                      formData.target_sales_id === ""
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 text-gray-400 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-xs font-bold uppercase">None</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div
            className={`p-5 rounded-4xl border-2 transition-all duration-300 ${
              formData.is_mandatory
                ? "bg-teal-50/50 border-teal-100 shadow-lg shadow-teal-500/5"
                : "bg-gray-50/50 border-gray-100"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-black uppercase tracking-wider ${formData.is_mandatory ? "text-teal-700" : "text-gray-700"}`}
                  >
                    Mandatory Budget
                  </span>
                  {formData.is_mandatory && (
                    <span className="bg-teal-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 font-bold leading-relaxed max-w-2xl uppercase tracking-tight">
                  Jika ON, Budget ini bersifat{" "}
                  <span
                    className={
                      formData.is_mandatory ? "text-teal-600 font-black" : ""
                    }
                  >
                    Wajib
                  </span>{" "}
                  dan <span className="text-red-400">TIDAK BISA DIPINJAM</span>{" "}
                  oleh departemen lain.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer scale-110">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.is_mandatory}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      is_mandatory: e.target.checked,
                    }))
                  }
                />
                <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500 shadow-inner"></div>
              </label>
            </div>
          </div>

          {/* Period Display Calculation */}
          {(() => {
            const year = new Date(formData.tgl_penyusunan).getFullYear();
            const monthIndex = parseInt(formData.bulan) - 1;
            if (!isNaN(year) && !isNaN(monthIndex)) {
              const startDate = new Date(year, monthIndex, 1);
              const endDate = new Date(year, monthIndex + 1, 0); // Day 0 of next month is last day of current

              const options: Intl.DateTimeFormatOptions = {
                day: "2-digit",
                month: "long",
                year: "numeric",
              };
              const startStr = startDate.toLocaleDateString("id-ID", options);
              const endStr = endDate.toLocaleDateString("id-ID", options);

              return (
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide">
                      Periode Budget (Otomatis)
                    </span>
                    <span className="text-emerald-900 font-medium mt-1">
                      {startStr} &mdash; {endStr}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide">
                      Tahun Anggaran
                    </span>
                    <div className="text-emerald-900 font-bold text-lg">
                      {year}
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-gray-500">
              Keterangan
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  description: e.target.value,
                }))
              }
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 min-h-[80px]"
              placeholder="Opsional..."
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl">
              <h3 className="font-bold text-gray-700">Budget Details</h3>
              <button
                type="button"
                onClick={addItem}
                className="text-sm flex items-center gap-1 text-emerald-600 font-bold hover:bg-emerald-50 px-3 py-1 rounded-lg"
              >
                <Plus size={16} /> Add Item
              </button>
            </div>

            <div className="space-y-3">
              {formData.items.map((item, idx) => (
                <div key={idx} className="flex gap-3 items-end group">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 ml-1">
                      Kategori
                    </label>
                    <div className="w-full">
                      <SearchableSelect
                        label=""
                        placeholder="Pilih Kategori"
                        value={Number(item.category_id) || ""}
                        onChange={(val) =>
                          updateItem(idx, "category_id", val.toString())
                        }
                        options={categories.map((c) => ({
                          value: c.id,
                          label: c.category_name,
                        }))}
                      />
                    </div>
                  </div>
                  {formData.target_sales_amount > 0 && (
                    <div className="w-24 space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 ml-1">
                        %
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.percentage}
                        onChange={(e) =>
                          updateItem(idx, "percentage", e.target.value)
                        }
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                        placeholder="0"
                      />
                    </div>
                  )}
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 ml-1">
                      Budget Amount
                    </label>
                    <input
                      type="number"
                      value={item.budget}
                      onChange={(e) =>
                        updateItem(idx, "budget", e.target.value)
                      }
                      required
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                      placeholder="0"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="p-2 text-gray-400 hover:text-red-500 mb-1 transition-opacity"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="text-lg">
            <span className="text-gray-500 text-sm">Grand Total:</span>
            <span className="ml-2 font-bold text-gray-800">
              Rp {parseFloat(formData.grandtotal).toLocaleString()}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-bold transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-70 transition-all shadow-lg active:scale-95 text-sm"
            >
              {submitting ? (
                "Saving..."
              ) : (
                <>
                  <Save size={18} /> Save Budget
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
