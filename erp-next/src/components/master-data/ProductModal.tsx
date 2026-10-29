"use client";

import { useState, useEffect } from "react";
import { X, Save, AlertCircle, Plus, Trash2, Search, Warehouse as WarehouseIcon, TrendingUp } from "lucide-react";
import SearchableSelect from "../ui/SearchableSelect";
import api from "@/lib/api";

type ProductUnit = {
  level: number;
  barcode: string;
  unit_code: string;
  tax_unit: string;
  conversion_qty: number;
  color: string;
  buy_price: number;
  sell_price: number;
};

type ProductLocation = {
  warehouse_id: number | string;
  warehouse_name?: string;
  aisle: string;
  min_qty: number;
  max_qty: number;
  stock?: number;
};

type ProductSupplier = {
  id?: number;
  supplier_id: number | string;
  supplier_name?: string;
  supplier_part_number: string;
  purchase_price: number;
  sell_price: number;
  min_qty: number;
  max_qty: number;
  min_order?: number;
  is_primary: boolean | number;
  allocation_percent?: number;
  pcs_per_pack?: number;
  product_name?: string;
  product_code?: string;
  product_type?: string;
  category_id?: number;
  tax_item_code?: string;
  bom_code?: string;
  is_asset?: boolean | number;
  is_mandatory?: boolean | number;
  units_json?: string;
};

type Product = {
  id?: number;
  product_name: string;
  product_code: string;
  part_number?: string;
  tax_item_code?: string;
  category_id: number;
  product_price: number;
  product_unit: string;
  product_note?: string;
  is_asset: boolean | number;
  is_mandatory: boolean | number;
  supplier_id?: number;
  min_qty?: number;
  max_qty?: number;
  min_order?: number;
  product_type?: string;
  bom_code?: string;
  pcs_per_pack?: number;
  units?: ProductUnit[];
  locations?: ProductLocation[];
  product_suppliers?: ProductSupplier[];
  brand?: string;
  barcode?: string;
  hsn_sat_code?: string;
  purchase_price?: number;
  weight_kg?: number;
  volume_m3?: number;
  shelf_life_days?: number;
  lead_time_days?: number;
  valuation_method?: string;
};

type ProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productToEdit?: Product | null;
};

// Toggle Switch Component for Premium UI
const ToggleSwitch = ({
  label,
  checked,
  onChange,
  activeColor = "bg-emerald-500",
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  activeColor?: string;
}) => (
  <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 border border-gray-100 hover:border-gray-200 transition-all group">
    <span className="text-sm font-bold text-gray-700">{label}</span>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? activeColor : "bg-gray-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  </div>
);

export default function ProductModal({
  isOpen,
  onClose,
  onSuccess,
  productToEdit,
}: ProductModalProps) {
  const [formData, setFormData] = useState<Product>({
    product_name: "",
    product_code: "",
    part_number: "",
    tax_item_code: "",
    category_id: 0,
    product_price: 0,
    product_unit: "",
    product_note: "",
    is_asset: false,
    is_mandatory: false,
    supplier_id: undefined,
    min_qty: 0,
    max_qty: 0,
    product_type: "Raw Material",
    bom_code: "",
    units: [],
    locations: [],
    product_suppliers: []
  });

  const [categories, setCategories] = useState<{ id: number; category_name: string }[]>([]);
  const [units, setUnits] = useState<{ id: number; name: string; short_name: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: number; supplier_name: string; supplier_code: string }[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: number; name: string; code: string; short_name: string }[]>([]);
  const [productTypes, setProductTypes] = useState<{ id: number; name: string }[]>([
    { id: 1, name: "Raw Material" },
    { id: 2, name: "Finished Good" },
    { id: 3, name: "Semi Finished" },
    { id: 4, name: "Jasa" },
    { id: 5, name: "Biaya" },
    { id: 6, name: "Paket" },
    { id: 7, name: "Asset" }
  ]);
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingSupplierIdx, setEditingSupplierIdx] = useState<number | null>(null);
  const [subForm, setSubForm] = useState<any>(null);

  const openSupplierDetail = (idx: number) => {
    const sup = formData.product_suppliers?.[idx];
    if (!sup) return;

    let subUnits: ProductUnit[] = [];
    if (sup.units_json) {
      try {
        subUnits = JSON.parse(sup.units_json);
      } catch (e) {
        console.error("Error parsing supplier units_json:", e);
      }
    }

    if (subUnits.length === 0) {
      const subBuyPrice1 = Number(sup.purchase_price) || 0;
      const subSellPrice1 = Number(sup.sell_price) || 0;
      const parentBuyPrice1 = Number(formData.product_price) || 0;
      
      subUnits = (formData.units || []).map((u) => {
        let buy_price = Number(u.buy_price) || 0;
        let sell_price = Number(u.sell_price) || 0;

        if (u.level === 1) {
          buy_price = subBuyPrice1;
          sell_price = subSellPrice1;
        } else {
          if (parentBuyPrice1 > 0) {
            buy_price = buy_price * (subBuyPrice1 / parentBuyPrice1);
          } else {
            buy_price = subBuyPrice1 * (Number(u.conversion_qty) || 1);
          }
          sell_price = subSellPrice1 * (Number(u.conversion_qty) || 1);
        }

        return {
          ...u,
          buy_price: Math.round(buy_price),
          sell_price: Math.round(sell_price)
        };
      });
    }

    const fullUnits = Array.from({ length: 10 }, (_, i) => {
      const level = i + 1;
      const existing = subUnits.find((u: any) => u.level === level);
      return existing || {
        level,
        barcode: "",
        unit_code: i === 0 ? (sup.units_json ? "" : formData.product_unit || "PCS") : "",
        tax_unit: "",
        conversion_qty: i === 0 ? 1 : 0,
        color: "",
        buy_price: 0,
        sell_price: 0
      };
    });

    setSubForm({
      product_name: sup.product_name || formData.product_name || "",
      product_code: sup.product_code || formData.product_code || "",
      supplier_part_number: sup.supplier_part_number || "",
      product_type: sup.product_type || formData.product_type || "Raw Material",
      category_id: sup.category_id || formData.category_id || 0,
      tax_item_code: sup.tax_item_code || formData.tax_item_code || "",
      bom_code: sup.bom_code || formData.bom_code || "",
      is_asset: sup.is_asset !== undefined ? !!sup.is_asset : !!formData.is_asset,
      is_mandatory: sup.is_mandatory !== undefined ? !!sup.is_mandatory : !!formData.is_mandatory,
      units: fullUnits
    });
    setEditingSupplierIdx(idx);
  };

  const saveSupplierDetail = () => {
    if (editingSupplierIdx === null || !subForm) return;

    setFormData(prev => {
      const newSups = [...(prev.product_suppliers || [])];
      newSups[editingSupplierIdx] = {
        ...newSups[editingSupplierIdx],
        product_name: subForm.product_name,
        product_code: subForm.product_code,
        supplier_part_number: subForm.supplier_part_number,
        product_type: subForm.product_type,
        category_id: subForm.category_id,
        tax_item_code: subForm.tax_item_code,
        bom_code: subForm.bom_code,
        is_asset: subForm.is_asset,
        is_mandatory: subForm.is_mandatory,
        units_json: JSON.stringify(subForm.units)
      };
      return { ...prev, product_suppliers: newSups };
    });

    setEditingSupplierIdx(null);
    setSubForm(null);
  };

  // Initialize Units and Locations
  useEffect(() => {
    if (isOpen) {
      if (!productToEdit) {
        const initialUnits: ProductUnit[] = Array.from({ length: 10 }, (_, i) => ({
          level: i + 1,
          barcode: "",
          unit_code: i === 0 ? "PCS" : "",
          tax_unit: "",
          conversion_qty: i === 0 ? 1 : 0,
          color: "",
          buy_price: 0,
          sell_price: 0
        }));
        setFormData(prev => ({ ...prev, units: initialUnits, locations: [], product_suppliers: [] }));
      }
    }
  }, [isOpen, productToEdit]);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const res = await api.express.get("/products/form-data");
        const data = res.data;
        setCategories(data.categories || []);
        setSuppliers(data.suppliers || []);
        setUnits(data.units || []);
        setWarehouses(data.warehouses || []);
        if (data.product_types && data.product_types.length > 0) {
          setProductTypes(data.product_types);
        }
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
      if (productToEdit) {
        fetchProductDetail(productToEdit.id!);
      }
    }
  }, [isOpen, productToEdit]);

  const fetchProductDetail = async (id: number) => {
    try {
      const res = await api.express.get(`/products/${id}`);
      const data = res.data.data;
      
      // Ensure we have 10 units
      const fetchedUnits = data.units || [];
      const fullUnits = Array.from({ length: 10 }, (_, i) => {
        const level = i + 1;
        const existing = fetchedUnits.find((u: any) => u.level === level);
        
        // If it's Level 1 and no existing record, use base product data
        if (level === 1 && !existing) {
          return {
            level,
            barcode: data.product_barcode_symbology || "",
            unit_code: data.product_unit || "PCS",
            tax_unit: "",
            conversion_qty: 1,
            color: "",
            buy_price: data.product_price || 0,
            sell_price: 0
          };
        }

        return existing || {
          level,
          barcode: "",
          unit_code: "",
          tax_unit: "",
          conversion_qty: 0,
          color: "",
          buy_price: 0,
          sell_price: 0
        };
      });

      let fetchedSuppliers = data.product_suppliers || [];
      if (fetchedSuppliers.length === 0 && data.supplier_id) {
        fetchedSuppliers = [{
          supplier_id: data.supplier_id,
          supplier_name: data.supplier_name,
          supplier_part_number: data.part_number || "",
          purchase_price: data.purchase_price || data.product_price || 0,
          sell_price: 0,
          min_qty: data.min_qty || 0,
          max_qty: data.max_qty || 0,
          min_order: data.min_order || 0,
          pcs_per_pack: data.pcs_per_pack || 1,
          allocation_percent: 100,
          is_primary: true
        }];
      }

      setFormData({
        ...data,
        is_asset: !!data.is_asset,
        is_mandatory: !!data.is_mandatory,
        units: fullUnits,
        locations: data.locations || [],
        product_suppliers: fetchedSuppliers
      });
    } catch (err) {
      console.error("Error fetching product detail:", err);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUnitChange = (index: number, field: keyof ProductUnit, value: any) => {
    let finalValue = value;
    if (field === "buy_price" || field === "sell_price") {
        finalValue = Math.round(Number(value) || 0);
    }
    setFormData(prev => {
      const newUnits = [...(prev.units || [])];
      newUnits[index] = { ...newUnits[index], [field]: finalValue };
      return { ...prev, units: newUnits };
    });
  };

  const addLocation = () => {
    setFormData(prev => ({
      ...prev,
      locations: [
        ...(prev.locations || []),
        { warehouse_id: "", aisle: "", min_qty: 0, max_qty: 0, stock: 0 }
      ]
    }));
  };

  const removeLocation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      locations: (prev.locations || []).filter((_, i) => i !== index)
    }));
  };

  const handleLocationChange = (index: number, field: keyof ProductLocation, value: any) => {
    setFormData(prev => {
      const newLocations = [...(prev.locations || [])];
      newLocations[index] = { ...newLocations[index], [field]: value };
      return { ...prev, locations: newLocations };
    });
  };

  const addProductSupplier = () => {
    setFormData(prev => ({
      ...prev,
      product_suppliers: [
        ...(prev.product_suppliers || []),
        { supplier_id: "", supplier_part_number: "", purchase_price: 0, sell_price: 0, min_qty: 0, max_qty: 0, min_order: 0, allocation_percent: 0, pcs_per_pack: 1, is_primary: (prev.product_suppliers || []).length === 0 }
      ]
    }));
  };

  const removeProductSupplier = (index: number) => {
    setFormData(prev => {
      const newSuppliers = (prev.product_suppliers || []).filter((_, i) => i !== index);
      if (prev.product_suppliers?.[index]?.is_primary && newSuppliers.length > 0) {
        newSuppliers[0] = { ...newSuppliers[0], is_primary: true };
      }
      return { ...prev, product_suppliers: newSuppliers };
    });
  };

  const handleProductSupplierChange = (index: number, field: keyof ProductSupplier, value: any) => {
    setFormData(prev => {
      const newSuppliers = [...(prev.product_suppliers || [])];
      if (field === "is_primary" && value === true) {
        newSuppliers.forEach((s, idx) => {
          newSuppliers[idx] = { ...s, is_primary: idx === index };
        });
      } else {
        let updatedSupplier = { ...newSuppliers[index], [field]: value };
        
        // Keep units_json Level 1 price synchronized!
        if (field === "purchase_price" || field === "sell_price") {
          let subUnits: ProductUnit[] = [];
          if (updatedSupplier.units_json) {
            try {
              subUnits = JSON.parse(updatedSupplier.units_json);
            } catch (e) {}
          }
          if (subUnits.length > 0) {
            subUnits = subUnits.map(u => {
              if (u.level === 1) {
                return {
                  ...u,
                  buy_price: field === "purchase_price" ? Math.round(Number(value) || 0) : u.buy_price,
                  sell_price: field === "sell_price" ? Math.round(Number(value) || 0) : u.sell_price
                };
              }
              return u;
            });
            updatedSupplier.units_json = JSON.stringify(subUnits);
          }
        }
        
        newSuppliers[index] = updatedSupplier;
      }
      return { ...prev, product_suppliers: newSuppliers };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Custom Validation
    if (!formData.category_id || formData.category_id === 0) {
      setError("Kategori harus dipilih");
      setSubmitting(false);
      return;
    }

    if (!formData.product_type) {
      setError("Tipe Barang harus dipilih");
      setSubmitting(false);
      return;
    }

    const baseUnit = formData.units?.[0];
    if (!baseUnit?.unit_code) {
      setError("Satuan Dasar (Level 1) harus diisi");
      setSubmitting(false);
      return;
    }

    const validLocations = formData.locations?.filter(loc => loc.warehouse_id && loc.warehouse_id !== "");
    if (!validLocations || validLocations.length === 0) {
      setError("Setidaknya harus menambahkan satu Lokasi Gudang");
      setSubmitting(false);
      return;
    }

    if (formData.product_suppliers && formData.product_suppliers.some(sup => !sup.supplier_id)) {
      setError("Semua baris mapping supplier harus memilih supplier");
      setSubmitting(false);
      return;
    }

    try {
      if (productToEdit) {
        await api.express.put(`/products/${productToEdit.id}`, formData);
      } else {
        await api.express.post("/products", formData);
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] w-full max-w-6xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-100">
        <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">
              {productToEdit ? "Edit Produk" : "Tambah Produk"}
            </h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
              {productToEdit ? "Update existing product data" : "Create a new product entry"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar">
          {loadingData ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Memuat Data...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-10">
              {error && (
                <div className="bg-red-50 text-red-600 p-6 rounded-[2rem] text-sm flex items-start gap-3 border border-red-100 animate-in slide-in-from-top-2">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <span className="font-bold">{error}</span>
                </div>
              )}

              {/* SECTION: BASIC INFO */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Informasi Dasar</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="col-span-1 md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama Produk *</label>
                    <input
                      name="product_name"
                      value={formData.product_name || ""}
                      onChange={handleChange}
                      required
                      placeholder="Masukkan nama produk..."
                      className="w-full px-5 py-3.5 rounded-2xl border-2 border-gray-50 bg-gray-50/50 focus:bg-white focus:border-emerald-500 transition-all font-bold text-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kode Barang</label>
                    <input
                      name="product_code"
                      value={formData.product_code || ""}
                      onChange={handleChange}
                      placeholder="PRD-001"
                      className="w-full px-5 py-3.5 rounded-2xl border-2 border-gray-50 bg-gray-50/50 focus:bg-white focus:border-emerald-500 transition-all font-bold text-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Part Number</label>
                    <input
                      name="part_number"
                      value={formData.part_number || ""}
                      onChange={handleChange}
                      placeholder="PN-123"
                      className="w-full px-5 py-3.5 rounded-2xl border-2 border-gray-50 bg-gray-50/50 focus:bg-white focus:border-emerald-500 transition-all font-bold text-gray-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipe Barang <span className="text-red-500">*</span></label>
                    <select
                      name="product_type"
                      value={formData.product_type}
                      onChange={handleChange}
                      required
                      className="w-full px-5 py-3.5 rounded-2xl border-2 border-gray-50 bg-gray-50/50 focus:bg-white focus:border-emerald-500 transition-all font-bold text-gray-700"
                    >
                      {productTypes.map(t => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kategori *</label>
                    <SearchableSelect
                      label=""
                      placeholder="Pilih Kategori"
                      value={formData.category_id}
                      onChange={(val) => setFormData(prev => ({ ...prev, category_id: Number(val) }))}
                      options={categories.map(c => ({ value: c.id, label: c.category_name }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kode Barang Pajak</label>
                    <input
                      name="tax_item_code"
                      value={formData.tax_item_code || ""}
                      onChange={handleChange}
                      placeholder="TAX-001"
                      className="w-full px-5 py-3.5 rounded-2xl border-2 border-gray-50 bg-gray-50/50 focus:bg-white focus:border-emerald-500 transition-all font-bold text-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Supplier Utama</label>
                    <SearchableSelect
                      label=""
                      placeholder="Pilih Supplier"
                      value={formData.supplier_id || ""}
                      onChange={(val) => {
                        const supId = Number(val) || undefined;
                        setFormData(prev => {
                          const sups = [...(prev.product_suppliers || [])];
                          if (sups.length === 0 && supId) {
                            sups.push({
                              supplier_id: supId,
                              supplier_part_number: prev.part_number || "",
                              purchase_price: prev.purchase_price || prev.product_price || 0,
                              sell_price: 0,
                              min_qty: prev.min_qty || 0,
                              max_qty: prev.max_qty || 0,
                              min_order: prev.min_order || 0,
                              pcs_per_pack: prev.pcs_per_pack || 1,
                              allocation_percent: 100,
                              is_primary: true
                            });
                          } else if (sups.length === 1 && supId) {
                            sups[0] = { ...sups[0], supplier_id: supId };
                          }
                          return { ...prev, supplier_id: supId, product_suppliers: sups };
                        });
                      }}
                      options={suppliers.map(s => ({ value: s.id, label: s.supplier_name }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kode BOM</label>
                    <input
                      name="bom_code"
                      value={formData.bom_code || ""}
                      onChange={handleChange}
                      placeholder="BOM-PRD-001"
                      className="w-full px-5 py-3.5 rounded-2xl border-2 border-gray-50 bg-gray-50/50 focus:bg-white focus:border-emerald-500 transition-all font-bold text-gray-700"
                    />
                  </div>
                  {/* Pcs/Pack & Min Order — shown in INFORMASI DASAR when 0 or 1 supplier */}
                  {(!formData.product_suppliers || formData.product_suppliers.length <= 1) && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                          Pcs / Pack
                          <span className="text-gray-400 font-normal ml-1 normal-case">(min order kemasan)</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={formData.product_suppliers && formData.product_suppliers.length === 1
                            ? (formData.product_suppliers[0].pcs_per_pack ?? 1)
                            : (formData.pcs_per_pack ?? 1)}
                          onChange={(e) => {
                            const val = Math.max(1, Number(e.target.value) || 1);
                            setFormData(prev => {
                              const newSups = [...(prev.product_suppliers || [])];
                              if (newSups.length === 0 && prev.supplier_id) {
                                newSups.push({
                                  supplier_id: prev.supplier_id,
                                  supplier_part_number: prev.part_number || "",
                                  purchase_price: prev.purchase_price || prev.product_price || 0,
                                  sell_price: 0,
                                  min_qty: prev.min_qty || 0,
                                  max_qty: prev.max_qty || 0,
                                  min_order: prev.min_order || 0,
                                  pcs_per_pack: val,
                                  allocation_percent: 100,
                                  is_primary: true
                                });
                              } else if (newSups.length === 1) {
                                newSups[0] = { ...newSups[0], pcs_per_pack: val };
                              }
                              return { ...prev, pcs_per_pack: val, product_suppliers: newSups };
                            });
                          }}
                          placeholder="1"
                          className="w-full px-5 py-3.5 rounded-2xl border-2 border-indigo-100 bg-indigo-50/40 focus:bg-white focus:border-indigo-500 transition-all font-black text-indigo-700 text-center"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                          Min Order
                          <span className="text-gray-400 font-normal ml-1 normal-case">(min order qty)</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={formData.product_suppliers && formData.product_suppliers.length === 1
                            ? (formData.product_suppliers[0].min_order ?? 0)
                            : (formData.min_order ?? 0)}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value) || 0);
                            setFormData(prev => {
                              const newSups = [...(prev.product_suppliers || [])];
                              if (newSups.length === 0 && prev.supplier_id) {
                                newSups.push({
                                  supplier_id: prev.supplier_id,
                                  supplier_part_number: prev.part_number || "",
                                  purchase_price: prev.purchase_price || prev.product_price || 0,
                                  sell_price: 0,
                                  min_qty: prev.min_qty || 0,
                                  max_qty: prev.max_qty || 0,
                                  min_order: val,
                                  pcs_per_pack: prev.pcs_per_pack || 1,
                                  allocation_percent: 100,
                                  is_primary: true
                                });
                              } else if (newSups.length === 1) {
                                newSups[0] = { ...newSups[0], min_order: val };
                              }
                              return { ...prev, min_order: val, product_suppliers: newSups };
                            });
                          }}
                          placeholder="0"
                          className="w-full px-5 py-3.5 rounded-2xl border-2 border-amber-100 bg-amber-50/40 focus:bg-white focus:border-amber-500 transition-all font-black text-amber-700 text-center"
                        />
                      </div>
                    </>
                  )}
                  <div className="flex gap-4 pt-4 col-span-1 md:col-span-2">
                    <ToggleSwitch
                      label="Asset"
                      checked={!!formData.is_asset}
                      onChange={(val) => setFormData(prev => ({ ...prev, is_asset: val }))}
                      activeColor="bg-blue-500"
                    />
                    <ToggleSwitch
                      label="Mandatory"
                      checked={!!formData.is_mandatory}
                      onChange={(val) => setFormData(prev => ({ ...prev, is_mandatory: val }))}
                      activeColor="bg-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: UNITS & PRICING */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Jenis Satuan dan Harga</h3>
                </div>

                <div className="bg-gray-50/50 rounded-[2rem] border border-gray-100 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-gray-100">
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Level</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Barcode</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Satuan <span className="text-red-500">*</span></th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Satuan Pajak</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Konversi</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Warna</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Harga Beli</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Harga Jual</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {formData.units?.map((unit, idx) => (
                        <tr key={idx} className="hover:bg-white transition-colors group">
                          <td className="px-4 py-2 text-[10px] font-black text-gray-500">
                            {idx === 0 ? "Satuan Dasar" : `U/M ${idx + 1}`}
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={unit.barcode}
                              onChange={(e) => handleUnitChange(idx, "barcode", e.target.value)}
                              placeholder="Barcode"
                              className="w-full px-3 py-1.5 rounded-xl border border-transparent bg-transparent group-hover:bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all text-xs font-bold"
                            />
                          </td>
                          <td className="px-2 py-2">
                             <input
                              type="text"
                              value={unit.unit_code}
                              onChange={(e) => handleUnitChange(idx, "unit_code", e.target.value)}
                              placeholder="Kode Satuan"
                              className="w-full px-3 py-1.5 rounded-xl border border-transparent bg-transparent group-hover:bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all text-xs font-bold uppercase"
                            />
                          </td>
                          <td className="px-2 py-2">
                             <input
                              type="text"
                              value={unit.tax_unit}
                              onChange={(e) => handleUnitChange(idx, "tax_unit", e.target.value)}
                              placeholder="Satuan Pajak"
                              className="w-full px-3 py-1.5 rounded-xl border border-transparent bg-transparent group-hover:bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all text-xs font-bold"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={unit.conversion_qty}
                                disabled={idx === 0}
                                onChange={(e) => handleUnitChange(idx, "conversion_qty", Number(e.target.value))}
                                className="w-16 px-2 py-1.5 rounded-xl border border-transparent bg-transparent group-hover:bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all text-xs font-black text-center disabled:opacity-50"
                              />
                              <span className="text-[10px] font-bold text-gray-400">X 1 {formData.units?.[0]?.unit_code || "PCS"}</span>
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={unit.color}
                              onChange={(e) => handleUnitChange(idx, "color", e.target.value)}
                              placeholder="Warna"
                              className="w-full px-3 py-1.5 rounded-xl border border-transparent bg-transparent group-hover:bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all text-xs font-bold"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              value={unit.buy_price}
                              onChange={(e) => handleUnitChange(idx, "buy_price", Number(e.target.value))}
                              className="w-full px-3 py-1.5 rounded-xl border border-transparent bg-transparent group-hover:bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all text-xs font-bold text-right"
                            />
                          </td>
                          <td className="px-2 py-2">
                             <input
                              type="number"
                              value={unit.sell_price}
                              onChange={(e) => handleUnitChange(idx, "sell_price", Number(e.target.value))}
                              className="w-full px-3 py-1.5 rounded-xl border border-transparent bg-transparent group-hover:bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all text-xs font-bold text-right"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION: WAREHOUSE LOCATIONS */}
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Lokasi Gudang</h3>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase hover:bg-blue-100 transition-all">
                      <Plus size={14} /> Master Gudang
                    </button>
                    <button type="button" className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase hover:bg-blue-100 transition-all">
                      <Plus size={14} /> Master Rack
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50/50 rounded-[2rem] border border-gray-100 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-gray-100">
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-1/3">Gudang <span className="text-red-500">*</span></th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Aisle</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Stock</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Min Qty</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Max Qty</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {formData.locations?.map((loc, idx) => (
                        <tr key={idx} className="hover:bg-white transition-colors group">
                          <td className="px-4 py-3">
                            <select
                              value={loc.warehouse_id}
                              onChange={(e) => handleLocationChange(idx, "warehouse_id", e.target.value)}
                              className="w-full px-4 py-2 rounded-xl border border-gray-100 bg-white focus:border-orange-500 outline-none font-bold text-xs"
                            >
                              <option value="">Pilih Gudang</option>
                              {warehouses.map(w => (
                                <option key={w.id} value={w.id}>{w.name} ({w.short_name || w.code})</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={loc.aisle}
                              onChange={(e) => handleLocationChange(idx, "aisle", e.target.value)}
                              placeholder="Aisle"
                              className="w-full px-4 py-2 rounded-xl border border-gray-100 bg-white focus:border-orange-500 outline-none font-bold text-xs"
                            />
                          </td>
                          <td className="px-4 py-3 text-center font-black text-xs text-gray-400">
                            {loc.stock || 0}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={loc.min_qty}
                              onChange={(e) => handleLocationChange(idx, "min_qty", Number(e.target.value))}
                              placeholder="Min"
                              className="w-full px-4 py-2 rounded-xl border border-gray-100 bg-white focus:border-orange-500 outline-none font-bold text-xs text-center"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={loc.max_qty}
                              onChange={(e) => handleLocationChange(idx, "max_qty", Number(e.target.value))}
                              placeholder="Max"
                              className="w-full px-4 py-2 rounded-xl border border-gray-100 bg-white focus:border-orange-500 outline-none font-bold text-xs text-center"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button 
                              type="button" 
                              onClick={() => removeLocation(idx)}
                              className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(!formData.locations || formData.locations.length === 0) && (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">
                            Belum ada lokasi gudang yang dipilih
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <div className="p-4 bg-white border-t border-gray-100">
                    <button
                      type="button"
                      onClick={addLocation}
                      className="flex items-center gap-2 px-6 py-3 border-2 border-dashed border-gray-200 text-gray-400 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50 rounded-2xl text-xs font-black uppercase transition-all w-full justify-center"
                    >
                      <Plus size={18} /> Tambah Lokasi Baru
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION: SUPPLIER MAPPING */}
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Mapping Supplier / Vendor</h3>
                  </div>
                </div>

                <div className="bg-gray-50/50 rounded-[2rem] border border-gray-100 overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[1230px]">
                    <thead>
                    <tr className="bg-white border-b border-gray-100">
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest" style={{ width: "220px", minWidth: "220px" }}>Supplier / Vendor <span className="text-red-500">*</span></th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest" style={{ width: "150px", minWidth: "150px" }}>Part Number Vendor</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right" style={{ width: "120px", minWidth: "120px" }}>Harga Beli</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right" style={{ width: "120px", minWidth: "120px" }}>Harga Jual</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center" style={{ width: "100px", minWidth: "100px" }}>% Kuota MRP</th>
                        {formData.product_suppliers && formData.product_suppliers.length > 1 && (
                          <>
                            <th className="px-6 py-4 text-[10px] font-black text-indigo-500 uppercase tracking-widest text-center" style={{ width: "90px", minWidth: "90px" }}>Pcs/Pack</th>
                            <th className="px-6 py-4 text-[10px] font-black text-amber-500 uppercase tracking-widest text-center" style={{ width: "100px", minWidth: "100px" }}>Min Order</th>
                          </>
                        )}
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center" style={{ width: "110px", minWidth: "110px" }}>Min Qty</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center" style={{ width: "110px", minWidth: "110px" }}>Max Qty</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center" style={{ width: "110px", minWidth: "110px" }}>Supplier Utama?</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center" style={{ width: "145px", minWidth: "145px" }}>Spesifikasi</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center" style={{ width: "70px", minWidth: "70px" }}>Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {formData.product_suppliers?.map((sup, idx) => (
                        <tr key={idx} className="hover:bg-white transition-colors group">
                          <td className="px-4 py-3">
                            <select
                              value={sup.supplier_id}
                              onChange={(e) => handleProductSupplierChange(idx, "supplier_id", Number(e.target.value) || "")}
                              className="w-full px-4 py-2 rounded-xl border border-gray-100 bg-white focus:border-indigo-500 outline-none font-bold text-xs"
                            >
                              <option value="">Pilih Supplier</option>
                              {suppliers.map(s => (
                                <option key={s.id} value={s.id}>{s.supplier_name} {s.supplier_code ? `(${s.supplier_code})` : ""}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={sup.supplier_part_number || ""}
                              onChange={(e) => handleProductSupplierChange(idx, "supplier_part_number", e.target.value)}
                              placeholder="Part Number Vendor"
                              className="w-full px-4 py-2 rounded-xl border border-gray-100 bg-white focus:border-indigo-500 outline-none font-bold text-xs"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={sup.purchase_price}
                              onChange={(e) => handleProductSupplierChange(idx, "purchase_price", Number(e.target.value) || 0)}
                              placeholder="0"
                              className="w-full px-4 py-2 rounded-xl border border-gray-100 bg-white focus:border-indigo-500 outline-none font-bold text-xs text-right"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={sup.sell_price || 0}
                              onChange={(e) => handleProductSupplierChange(idx, "sell_price", Number(e.target.value) || 0)}
                              placeholder="0"
                              className="w-full px-4 py-2 rounded-xl border border-gray-100 bg-white focus:border-indigo-500 outline-none font-bold text-xs text-right"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="relative flex items-center">
                              <input
                                type="number"
                                step="1"
                                min="0"
                                max="100"
                                value={sup.allocation_percent || 0}
                                onChange={(e) => handleProductSupplierChange(idx, "allocation_percent", Number(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full px-3 py-2 rounded-xl border border-gray-100 bg-emerald-50/50 text-emerald-700 focus:border-emerald-500 outline-none font-black text-xs text-center"
                              />
                              <span className="absolute right-2 text-[10px] font-bold text-emerald-600">%</span>
                            </div>
                          </td>
                          {/* Pcs/Pack & Min Order columns — only visible when multi-vendor (>1 supplier) */}
                          {formData.product_suppliers && formData.product_suppliers.length > 1 && (
                            <>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min={1}
                                  value={sup.pcs_per_pack ?? 1}
                                  onChange={(e) => handleProductSupplierChange(idx, "pcs_per_pack", Math.max(1, Number(e.target.value) || 1))}
                                  placeholder="1"
                                  className="w-full px-3 py-2 rounded-xl border border-indigo-100 bg-indigo-50/40 text-indigo-700 focus:border-indigo-500 outline-none font-black text-xs text-center"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min={0}
                                  value={sup.min_order ?? 0}
                                  onChange={(e) => handleProductSupplierChange(idx, "min_order", Math.max(0, Number(e.target.value) || 0))}
                                  placeholder="0"
                                  className="w-full px-3 py-2 rounded-xl border border-amber-100 bg-amber-50/40 text-amber-700 focus:border-amber-500 outline-none font-black text-xs text-center"
                                />
                              </td>
                            </>
                          )}
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={sup.min_qty || 0}
                              onChange={(e) => handleProductSupplierChange(idx, "min_qty", Number(e.target.value) || 0)}
                              placeholder="Min"
                              className="w-full px-4 py-2 rounded-xl border border-gray-100 bg-white focus:border-indigo-500 outline-none font-bold text-xs text-center"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={sup.max_qty || 0}
                              onChange={(e) => handleProductSupplierChange(idx, "max_qty", Number(e.target.value) || 0)}
                              placeholder="Max"
                              className="w-full px-4 py-2 rounded-xl border border-gray-100 bg-white focus:border-indigo-500 outline-none font-bold text-xs text-center"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={!!sup.is_primary}
                              onChange={(e) => handleProductSupplierChange(idx, "is_primary", e.target.checked)}
                              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => openSupplierDetail(idx)}
                              className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 flex items-center gap-1.5 mx-auto border bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-100 whitespace-nowrap"
                            >
                              <Plus size={12} strokeWidth={3} />
                              <span>Spesifikasi</span>
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button 
                              type="button" 
                              onClick={() => removeProductSupplier(idx)}
                              className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(!formData.product_suppliers || formData.product_suppliers.length === 0) && (
                        <tr>
                          <td colSpan={10} className="px-6 py-8 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">
                            Belum ada supplier yang di-mapping
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={addProductSupplier}
                      className="flex items-center gap-2 px-6 py-3 border-2 border-dashed border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 rounded-2xl text-xs font-black uppercase transition-all w-full justify-center"
                    >
                      <Plus size={18} /> Tambah Supplier Mapping
                    </button>
                    {formData.product_suppliers && formData.product_suppliers.length > 1 && (
                      <div className="flex justify-between items-center px-5 py-3 bg-emerald-50/70 rounded-2xl border border-emerald-100">
                        <span className="text-xs font-bold text-emerald-800">Akumulasi Total % Kuota MRP Supplier:</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-black px-3 py-1 rounded-full ${
                            (formData.product_suppliers.reduce((sum, s) => sum + (Number(s.allocation_percent) || 0), 0) === 100) 
                              ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" 
                              : "bg-amber-500 text-white shadow-md shadow-amber-200"
                          }`}>
                            {formData.product_suppliers.reduce((sum, s) => sum + (Number(s.allocation_percent) || 0), 0)}%
                          </span>
                          {formData.product_suppliers.reduce((sum, s) => sum + (Number(s.allocation_percent) || 0), 0) !== 100 && (
                            <span className="text-[10px] font-bold text-amber-700 italic">(Disarankan total = 100%)</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-gray-400 rounded-full" />
                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Catatan</h3>
                </div>
                <textarea
                  name="product_note"
                  value={formData.product_note || ""}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Tulis catatan tambahan produk di sini..."
                  className="w-full px-6 py-4 rounded-[2rem] border-2 border-gray-50 bg-gray-50/50 focus:bg-white focus:border-emerald-500 transition-all font-bold text-gray-700 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-4 rounded-2xl text-gray-500 font-black hover:bg-gray-100 transition-all text-[10px] uppercase tracking-widest active:scale-95"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-3 bg-gray-900 text-white px-12 py-4 rounded-2xl font-black hover:bg-emerald-600 transition-all shadow-xl shadow-gray-200 hover:shadow-emerald-200 active:scale-95 text-[10px] uppercase tracking-widest disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                       <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                       <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save size={20} /> {productToEdit ? "Simpan Perubahan" : "Buat Produk Baru"}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {editingSupplierIdx !== null && subForm !== null && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-5xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-gray-100">
            
            {/* Header */}
            <div className="px-8 py-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-xl font-black text-gray-800 tracking-tight">
                  Spesifikasi Sub Item (Override Vendor)
                </h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                  MAPPING UNTUK SUPPLIER: {suppliers.find(s => s.id === Number(formData.product_suppliers?.[editingSupplierIdx]?.supplier_id))?.supplier_name || "Unknown Supplier"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingSupplierIdx(null);
                  setSubForm(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
              
              {/* Override Spesifikasi */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-5 bg-indigo-500 rounded-full"></div>
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                    Override Spesifikasi
                  </h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50/50 rounded-3xl border border-gray-100 p-6">
                  
                  {/* Nama Sub Item */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama Sub Item</label>
                    <input
                      type="text"
                      value={subForm.product_name}
                      onChange={(e) => setSubForm((prev: any) => ({ ...prev, product_name: e.target.value }))}
                      placeholder="Override nama produk..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200/60 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 outline-none transition-all font-bold text-xs text-gray-700 shadow-sm"
                    />
                  </div>

                  {/* Kode Barang */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kode Barang</label>
                    <input
                      type="text"
                      value={subForm.product_code}
                      onChange={(e) => setSubForm((prev: any) => ({ ...prev, product_code: e.target.value }))}
                      placeholder="Override kode barang..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200/60 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 outline-none transition-all font-bold text-xs text-gray-700 shadow-sm font-mono"
                    />
                  </div>

                  {/* Part Number Vendor */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Part Number Vendor</label>
                    <input
                      type="text"
                      value={subForm.supplier_part_number}
                      onChange={(e) => setSubForm((prev: any) => ({ ...prev, supplier_part_number: e.target.value }))}
                      placeholder="Override part number..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200/60 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 outline-none transition-all font-bold text-xs text-gray-700 shadow-sm"
                    />
                  </div>

                  {/* Tipe Barang */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipe Barang</label>
                    <select
                      value={subForm.product_type}
                      onChange={(e) => setSubForm((prev: any) => ({ ...prev, product_type: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200/60 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 outline-none transition-all font-bold text-xs text-gray-700 shadow-sm"
                    >
                      {productTypes.map(t => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Kategori */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kategori</label>
                    <select
                      value={subForm.category_id}
                      onChange={(e) => setSubForm((prev: any) => ({ ...prev, category_id: Number(e.target.value) }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200/60 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 outline-none transition-all font-bold text-xs text-gray-700 shadow-sm"
                    >
                      <option value={0}>Pilih Kategori</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.category_name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Kode Barang Pajak */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kode Barang Pajak</label>
                    <input
                      type="text"
                      value={subForm.tax_item_code}
                      onChange={(e) => setSubForm((prev: any) => ({ ...prev, tax_item_code: e.target.value }))}
                      placeholder="Override kode pajak..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200/60 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 outline-none transition-all font-bold text-xs text-gray-700 shadow-sm"
                    />
                  </div>

                  {/* Supplier - Read Only */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Supplier</label>
                    <div className="w-full px-4 py-3 rounded-xl border border-gray-200/60 bg-gray-100 font-bold text-xs text-gray-500 shadow-sm select-none">
                      {suppliers.find(s => s.id === Number(formData.product_suppliers?.[editingSupplierIdx]?.supplier_id))?.supplier_name || "Unknown Supplier"}
                    </div>
                  </div>

                  {/* Kode BOM */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kode BOM</label>
                    <input
                      type="text"
                      value={subForm.bom_code}
                      onChange={(e) => setSubForm((prev: any) => ({ ...prev, bom_code: e.target.value }))}
                      placeholder="Override kode BOM..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200/60 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 outline-none transition-all font-bold text-xs text-gray-700 shadow-sm"
                    />
                  </div>

                  {/* Asset and Mandatory Toggle Switches */}
                  <div className="flex gap-4 pt-2">
                    {/* Asset */}
                    <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-gray-200/60 shadow-sm flex-1 justify-between transition-all hover:border-indigo-300">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Asset</span>
                      <button
                        type="button"
                        onClick={() => setSubForm((prev: any) => ({ ...prev, is_asset: !prev.is_asset }))}
                        className={`w-10 h-5.5 flex items-center rounded-full p-1 transition-all ${subForm.is_asset ? 'bg-blue-500 justify-end' : 'bg-gray-200 justify-start'}`}
                      >
                        <div className="bg-white w-3.5 h-3.5 rounded-full shadow-md"></div>
                      </button>
                    </div>
                    
                    {/* Mandatory */}
                    <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-gray-200/60 shadow-sm flex-1 justify-between transition-all hover:border-indigo-300">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Mandatory</span>
                      <button
                        type="button"
                        onClick={() => setSubForm((prev: any) => ({ ...prev, is_mandatory: !prev.is_mandatory }))}
                        className={`w-10 h-5.5 flex items-center rounded-full p-1 transition-all ${subForm.is_mandatory ? 'bg-teal-500 justify-end' : 'bg-gray-200 justify-start'}`}
                      >
                        <div className="bg-white w-3.5 h-3.5 rounded-full shadow-md"></div>
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              {/* Jenis Satuan Dan Harga (5-level Grid Edit) */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-5 bg-indigo-500 rounded-full"></div>
                    <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                      Jenis Satuan Dan Harga (5-Level)
                    </h4>
                  </div>
                  
                  {/* Auto Scale Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const updatedUnits = [...(subForm.units || [])];
                      const l1Buy = Number(updatedUnits[0]?.buy_price) || 0;
                      const l1Sell = Number(updatedUnits[0]?.sell_price) || 0;
                      
                      updatedUnits.forEach((u, i) => {
                        if (i > 0) {
                          const conv = Number(u.conversion_qty) || 1;
                          updatedUnits[i] = {
                            ...u,
                            buy_price: Math.round(l1Buy * conv),
                            sell_price: Math.round(l1Sell * conv)
                          };
                        }
                      });
                      
                      setSubForm((prev: any) => ({ ...prev, units: updatedUnits }));
                    }}
                    className="px-3 py-1.5 bg-indigo-55 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 flex items-center gap-1 border border-indigo-100"
                  >
                    <TrendingUp size={12} />
                    <span>Skala Otomatis Berdasarkan Level 1</span>
                  </button>
                </div>

                <div className="bg-gray-50/50 rounded-3xl border border-gray-100 overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-white border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <th className="px-5 py-3">Level</th>
                        <th className="px-5 py-3">Barcode</th>
                        <th className="px-5 py-3">Satuan *</th>
                        <th className="px-5 py-3">Satuan Pajak</th>
                        <th className="px-5 py-3 text-center">Konversi</th>
                        <th className="px-5 py-3">Warna</th>
                        <th className="px-5 py-3 text-right">Harga Beli</th>
                        <th className="px-5 py-3 text-right">Harga Jual</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white/50">
                      {Array.from({ length: 5 }).map((_, idx) => {
                        const unit = subForm.units?.[idx] || {
                          level: idx + 1,
                          barcode: "",
                          unit_code: idx === 0 ? "PCS" : "",
                          tax_unit: "",
                          conversion_qty: idx === 0 ? 1 : 0,
                          color: "",
                          buy_price: 0,
                          sell_price: 0
                        };
                        
                        const handleSubUnitChange = (field: string, value: any) => {
                          const newUnits = [...(subForm.units || [])];
                          newUnits[idx] = {
                            ...unit,
                            [field]: value
                          };
                          
                          setSubForm((prev: any) => ({ ...prev, units: newUnits }));
                        };

                        return (
                          <tr key={idx} className="hover:bg-white transition-colors group">
                            <td className="px-5 py-2.5 font-black text-gray-500 text-[10px] uppercase">
                              {idx === 0 ? "Satuan Dasar" : `U/M ${idx + 1}`}
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={unit.barcode || ""}
                                onChange={(e) => handleSubUnitChange("barcode", e.target.value)}
                                placeholder="Barcode"
                                className="w-full px-3 py-1.5 rounded-xl border border-transparent bg-transparent group-hover:bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold text-xs"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={unit.unit_code || ""}
                                onChange={(e) => handleSubUnitChange("unit_code", e.target.value)}
                                placeholder={idx === 0 ? "PCS" : "Kode Satuan"}
                                className="w-full px-3 py-1.5 rounded-xl border border-transparent bg-transparent group-hover:bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold text-xs uppercase"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={unit.tax_unit || ""}
                                onChange={(e) => handleSubUnitChange("tax_unit", e.target.value)}
                                placeholder="Satuan Pajak"
                                className="w-full px-3 py-1.5 rounded-xl border border-transparent bg-transparent group-hover:bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold text-xs"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-1.5 justify-center">
                                <input
                                  type="number"
                                  value={unit.conversion_qty || 0}
                                  disabled={idx === 0}
                                  onChange={(e) => handleSubUnitChange("conversion_qty", Number(e.target.value) || 0)}
                                  className="w-14 px-2 py-1.5 rounded-xl border border-transparent bg-transparent group-hover:bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition-all font-black text-center disabled:opacity-50 text-xs"
                                />
                                <span className="text-[10px] font-bold text-gray-400">x 1 {subForm.units?.[0]?.unit_code || "PCS"}</span>
                              </div>
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={unit.color || ""}
                                onChange={(e) => handleSubUnitChange("color", e.target.value)}
                                placeholder="Warna"
                                className="w-full px-3 py-1.5 rounded-xl border border-transparent bg-transparent group-hover:bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold text-xs"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={unit.buy_price || 0}
                                onChange={(e) => handleSubUnitChange("buy_price", Math.round(Number(e.target.value)) || 0)}
                                className="w-full px-3 py-1.5 rounded-xl border border-transparent bg-transparent group-hover:bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold text-xs text-right text-gray-900"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={unit.sell_price || 0}
                                onChange={(e) => handleSubUnitChange("sell_price", Math.round(Number(e.target.value)) || 0)}
                                className="w-full px-3 py-1.5 rounded-xl border border-transparent bg-transparent group-hover:bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold text-xs text-right text-emerald-600 font-black"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-gray-50 flex justify-end gap-3 bg-gray-50/50">
              <button
                type="button"
                onClick={() => {
                  setEditingSupplierIdx(null);
                  setSubForm(null);
                }}
                className="px-6 py-3 rounded-xl text-gray-500 font-black hover:bg-gray-200 transition-all text-[10px] uppercase tracking-widest active:scale-95"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const newBuyPrice = Number(subForm.units?.[0]?.buy_price) || 0;
                  const newSellPrice = Number(subForm.units?.[0]?.sell_price) || 0;
                  
                  setFormData(prev => {
                    const newSups = [...(prev.product_suppliers || [])];
                    if (editingSupplierIdx !== null) {
                      newSups[editingSupplierIdx] = {
                        ...newSups[editingSupplierIdx],
                        product_name: subForm.product_name,
                        product_code: subForm.product_code,
                        supplier_part_number: subForm.supplier_part_number,
                        product_type: subForm.product_type,
                        category_id: subForm.category_id,
                        tax_item_code: subForm.tax_item_code,
                        bom_code: subForm.bom_code,
                        is_asset: subForm.is_asset,
                        is_mandatory: subForm.is_mandatory,
                        purchase_price: newBuyPrice,
                        sell_price: newSellPrice,
                        units_json: JSON.stringify(subForm.units)
                      };
                    }
                    return { ...prev, product_suppliers: newSups };
                  });

                  setEditingSupplierIdx(null);
                  setSubForm(null);
                }}
                className="px-8 py-3 bg-gray-900 hover:bg-indigo-600 text-white rounded-xl font-black transition-all shadow-md active:scale-95 text-[10px] uppercase tracking-widest"
              >
                Simpan Spesifikasi
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
