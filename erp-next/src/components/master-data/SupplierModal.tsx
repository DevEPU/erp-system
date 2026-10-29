"use client";

import { useState, useEffect } from "react";
import { X, Save, AlertCircle } from "lucide-react";
import SearchableSelect from "@/components/ui/SearchableSelect";
import api from "@/lib/api";

type Supplier = {
  id?: number;
  supplier_name: string;
  supplier_code?: string;
  supplier_email: string;
  supplier_phone: string;
  fax?: string;
  contact_person?: string;
  city: string;
  region?: string;
  country: string;
  address: string;
  npwp?: string;
  ppn_id?: number;
  pph_id?: number;
  currency_id?: number;
  group_id?: number;
  payment_term_id?: number;
  is_active: boolean | number;
};

type SupplierModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplierToEdit?: Supplier | null;
};

const INDONESIA_REGIONS = [
  "DKI Jakarta",
  "Jawa Barat",
  "Jawa Tengah",
  "Jawa Timur",
  "Banten",
  "DI Yogyakarta",
  "Bali",
  "Sumatera Utara",
  "Sumatera Barat",
  "Riau",
  "Kepulauan Riau",
  "Jambi",
  "Sumatera Selatan",
  "Bangka Belitung",
  "Bengkulu",
  "Lampung",
  "Aceh",
  "Kalimantan Barat",
  "Kalimantan Tengah",
  "Kalimantan Selatan",
  "Kalimantan Timur",
  "Kalimantan Utara",
  "Sulawesi Utara",
  "Sulawesi Tengah",
  "Sulawesi Selatan",
  "Sulawesi Tenggara",
  "Gorontalo",
  "Sulawesi Barat",
  "Nusa Tenggara Barat",
  "Nusa Tenggara Timur",
  "Maluku",
  "Maluku Utara",
  "Papua",
  "Papua Barat",
  "Papua Tengah",
  "Papua Pegunungan",
  "Papua Selatan",
  "Papua Barat Daya",
].map((r) => ({ value: r, label: r }));

export default function SupplierModal({
  isOpen,
  onClose,
  onSuccess,
  supplierToEdit,
}: SupplierModalProps) {
  const [formData, setFormData] = useState<Supplier>({
    supplier_name: "",
    supplier_code: "",
    supplier_email: "",
    supplier_phone: "",
    fax: "",
    contact_person: "",
    city: "",
    region: "",
    country: "Indonesia",
    address: "",
    npwp: "",
    ppn_id: undefined,
    pph_id: undefined,
    currency_id: undefined,
    group_id: undefined,
    payment_term_id: undefined,
    is_active: 1,
  });

  const [ppns, setPpns] = useState<{ id: number; name: string; rate: number }[]>([]);
  const [pphs, setPphs] = useState<{ id: number; name: string; rate: number }[]>([]);
  const [currencies, setCurrencies] = useState<{ id: number; code: string; currency_name: string; symbol: string }[]>([]);
  const [groups, setGroups] = useState<{ id: number; name: string }[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<{ id: number; name: string; days: number }[]>([]);

  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const res = await api.express.get("/suppliers/form-data");
        const data = res.data;
        setPpns(data.ppns || []);
        setPphs(data.pphs || []);
        setCurrencies(data.currencies || []);
        setGroups(data.groups || []);
        setPaymentTerms(data.payment_terms || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingData(false);
      }
    };

    if (isOpen) fetchData();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (supplierToEdit) {
        setFormData({
          ...supplierToEdit,
          supplier_code: supplierToEdit.supplier_code || "",
          fax: supplierToEdit.fax || "",
          contact_person: supplierToEdit.contact_person || "",
          region: supplierToEdit.region || "",
          npwp: supplierToEdit.npwp || "",
          ppn_id: supplierToEdit.ppn_id,
          pph_id: supplierToEdit.pph_id,
          currency_id: supplierToEdit.currency_id,
          group_id: supplierToEdit.group_id,
          payment_term_id: supplierToEdit.payment_term_id,
          country: supplierToEdit.country || "Indonesia",
        });
      } else {
        setFormData({
          supplier_name: "",
          supplier_code: "",
          supplier_email: "",
          supplier_phone: "",
          fax: "",
          contact_person: "",
          city: "",
          region: "",
          country: "Indonesia",
          address: "",
          npwp: "",
          ppn_id: undefined,
          pph_id: undefined,
          currency_id: undefined,
          group_id: undefined,
          payment_term_id: undefined,
          is_active: 1,
        });
      }
    }
  }, [isOpen, supplierToEdit]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked ? 1 : 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (supplierToEdit) {
        await api.express.put(`/suppliers/${supplierToEdit.id}`, formData);
      } else {
        await api.express.post("/suppliers", formData);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save supplier.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">
            {supplierToEdit ? "Edit Supplier" : "Add Supplier"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          {loadingData ? (
            <div className="p-4 text-center">Loading data...</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-start gap-2">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic Info */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Supplier Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="supplier_name"
                    value={formData.supplier_name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Supplier Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="supplier_code"
                    value={formData.supplier_code}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                {/* Region Select */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Region (Wilayah)
                  </label>
                  <SearchableSelect
                    options={INDONESIA_REGIONS}
                    value={formData.region || ""}
                    onChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        region: val as string,
                      }))
                    }
                    placeholder="Select Region..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="supplier_phone"
                    value={formData.supplier_phone}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="supplier_email"
                    value={formData.supplier_email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Fax (Optional)
                  </label>
                  <input
                    name="fax"
                    value={formData.fax}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Contact Person
                  </label>
                  <input
                    name="contact_person"
                    value={formData.contact_person}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                {/* Tax & Financial */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Supplier Group
                  </label>
                  <SearchableSelect
                    options={groups.map((g) => ({
                      value: g.id,
                      label: g.name,
                    }))}
                    value={formData.group_id || undefined}
                    onChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        group_id: val as number,
                      }))
                    }
                    placeholder="Select Group..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Payment Term
                  </label>
                  <SearchableSelect
                    options={paymentTerms.map((pt) => ({
                      value: pt.id,
                      label: `${pt.name} (${pt.days} Days)`,
                    }))}
                    value={formData.payment_term_id || undefined}
                    onChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        payment_term_id: val as number,
                      }))
                    }
                    placeholder="Select Term..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    NPWP
                  </label>
                  <input
                    name="npwp"
                    value={formData.npwp}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    PPN Type
                  </label>
                  <SearchableSelect
                    options={ppns.map((p) => ({
                      value: p.id,
                      label: `${p.name} (${p.rate}%)`,
                    }))}
                    value={formData.ppn_id || undefined}
                    onChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        ppn_id: val as number,
                      }))
                    }
                    placeholder="Select PPN..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    PPH Type
                  </label>
                  <SearchableSelect
                    options={pphs.map((p) => ({
                      value: p.id,
                      label: `${p.name} (${p.rate}%)`,
                    }))}
                    value={formData.pph_id || undefined}
                    onChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        pph_id: val as number,
                      }))
                    }
                    placeholder="Select PPH..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Currency
                  </label>
                  <SearchableSelect
                    options={currencies.map((c) => ({
                      value: c.id,
                      label: `${c.code} - ${c.symbol}`,
                    }))}
                    value={formData.currency_id || undefined}
                    onChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        currency_id: val as number,
                      }))
                    }
                    placeholder="Select Currency..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Status
                  </label>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="is_active"
                        checked={!!formData.is_active}
                        onChange={() =>
                          setFormData((prev) => ({ ...prev, is_active: 1 }))
                        }
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="is_active"
                        checked={!formData.is_active}
                        onChange={() =>
                          setFormData((prev) => ({ ...prev, is_active: 0 }))
                        }
                        className="text-red-600 focus:ring-red-500"
                      />
                      <span className="text-sm text-gray-700">Inactive</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  rows={2}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-70"
                >
                  {submitting ? (
                    "Saving..."
                  ) : (
                    <>
                      <Save size={18} /> Save
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
