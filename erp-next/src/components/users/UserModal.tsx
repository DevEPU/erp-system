"use client";

import { useState, useEffect, Fragment } from "react";
import { Loader2, X, Check, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import SearchableSelect from "../ui/SearchableSelect";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userToEdit?: any;
}

export default function UserModal({
  isOpen,
  onClose,
  onSuccess,
  userToEdit,
}: UserModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Data
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productGroups, setProductGroups] = useState<any[]>([]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    department_id: "",
    role: "",
    categories: [] as number[], // Array of Category IDs
    products: [] as number[], // Array of Product IDs
    is_active: true,
  });

  // Fetch Departments, Roles, Categories, and Products on Mount
  useEffect(() => {
    if (isOpen && departments.length === 0) {
      fetchFormData();
    }
    // Reset or Populate form when opening
    if (isOpen) {
      setError(null);
      if (userToEdit) {
        setForm({
          name: userToEdit.name,
          email: userToEdit.email,
          password: "",
          password_confirmation: "",
          department_id: userToEdit.department_id || "",
          role: userToEdit.roles?.[0]?.name || "",
          categories: userToEdit.categories?.map((c: any) => c.id) || [],
          products: userToEdit.products?.map((p: any) => p.id) || [],
          is_active: userToEdit.is_active === 1,
        });
      } else {
        setForm({
          name: "",
          email: "",
          password: "",
          password_confirmation: "",
          department_id: "",
          role: "",
          categories: [],
          products: [],
          is_active: true,
        });
      }
    }
  }, [isOpen, userToEdit]);

  const fetchFormData = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/users/form-data");
      const data = res.data;
      setDepartments(data.departments);
      setRoles(data.roles);
      setCategories(data.categories || []);
      setProducts(data.products || []);
      setProductGroups(data.productGroups || []);
    } catch (e) {
      console.error("Failed to fetch form data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleCategoryToggle = (categoryId: number) => {
    setForm((prev) => {
      const current = prev.categories;
      if (current.includes(categoryId)) {
        return {
          ...prev,
          categories: current.filter((id) => id !== categoryId),
        };
      } else {
        return { ...prev, categories: [...current, categoryId] };
      }
    });
  };

  const handleProductToggle = (productId: number) => {
    setForm((prev) => {
      const current = prev.products;
      if (current.includes(productId)) {
        return {
          ...prev,
          products: current.filter((id) => id !== productId),
        };
      } else {
        return { ...prev, products: [...current, productId] };
      }
    });
  };

  const filteredProducts = products.filter(
    (p) =>
      p.product_name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.product_code?.toLowerCase().includes(productSearch.toLowerCase()),
  );

  const handleApplyProductGroup = (groupId: string) => {
    const group = productGroups.find((g) => g.id.toString() === groupId);
    if (group) {
      setForm((prev) => ({
        ...prev,
        categories: [...group.categories],
        products: [...group.products],
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Confirmation Check (Only if password is provided)
    if (form.password && form.password !== form.password_confirmation) {
      setError("Password validation failed.");
      return;
    }

    setSubmitting(true);


    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        department_id: form.department_id,
        role: form.role,
        categories: form.categories, // Send Selected Categories
        products: form.products, // Send Selected Products
        is_active: form.is_active ? 1 : 0,
      };

      const res = userToEdit
        ? await api.express.put(`/users/${userToEdit.id}`, payload)
        : await api.express.post("/users", payload);

      onSuccess(); // Refresh parent list
      onClose(); // Close modal
    } catch (e: any) {
      const data = e.response?.data;
      if (data?.errors) {
        const firstError = Object.values(data.errors)[0] as string[];
        setError(firstError[0] || "Validasi gagal.");
      } else {
        setError(data?.message || "Gagal menyimpan user.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl scale-100 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0 rounded-t-3xl">
          <h2 className="text-xl font-bold text-gray-800">
            {userToEdit ? "Edit User" : "Tambah User Baru"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="overflow-y-auto p-6 flex-1">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-gray-500">
                  Nama Lengkap
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  type="text"
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  placeholder="John Doe"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-gray-500">
                  Email Address
                </label>
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  type="email"
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-gray-500">
                  Password{" "}
                  {userToEdit && (
                    <span className="font-normal text-gray-400 text-[10px] lowercase">
                      (kosongkan jika tetap)
                    </span>
                  )}
                </label>
                <input
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  type="password"
                  required={!userToEdit}
                  minLength={8}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  placeholder="********"
                />
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-gray-500">
                  Confirm Password
                </label>
                <input
                  name="password_confirmation"
                  value={form.password_confirmation}
                  onChange={handleChange}
                  type="password"
                  required={!userToEdit && !!form.password}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  placeholder="********"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Department */}
              <div className="space-y-1">
                <SearchableSelect
                  label="Departemen"
                  placeholder="- Pilih Departemen -"
                  value={form.department_id}
                  onChange={(val) =>
                    setForm((prev) => ({
                      ...prev,
                      department_id: val.toString(),
                    }))
                  }
                  options={departments.map((d) => ({
                    value: d.id,
                    label: d.department_name,
                  }))}
                />
              </div>

              {/* Role */}
              <div className="space-y-1">
                <SearchableSelect
                  label="Role"
                  placeholder="- Pilih Role -"
                  value={form.role}
                  onChange={(val) =>
                    setForm((prev) => ({
                      ...prev,
                      role: val.toString(),
                    }))
                  }
                  options={roles.map((r) => ({
                    value: r.name,
                    label: r.name,
                  }))}
                />
              </div>
            </div>

            {/* Product Group Template Loader */}
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1 space-y-1">
                <p className="text-xs font-bold text-emerald-800 uppercase">
                  Samakan dengan Group Produk
                </p>
                <p className="text-[10px] text-emerald-600 italic">
                  * Pilih template group untuk mengisi categories & produk secara
                  otomatis.
                </p>
              </div>
              <div className="w-full sm:w-48">
                <SearchableSelect
                  placeholder="- Pilih Group -"
                  value=""
                  onChange={(val) => handleApplyProductGroup(val.toString())}
                  options={productGroups.map((g) => ({
                    value: g.id,
                    label: g.name,
                  }))}
                />
              </div>
            </div>

            {/* Categories Multi-Select */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500">
                Assigned Categories (Restriction)
              </label>
              <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 max-h-40 overflow-y-auto grid grid-cols-2 gap-2">
                {categories.length > 0 ? (
                  categories.map((cat) => (
                    <label
                      key={cat.id}
                      className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-white rounded-lg transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={form.categories.includes(cat.id)}
                        onChange={() => handleCategoryToggle(cat.id)}
                        className="form-checkbox h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">
                        {cat.category_name}
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 col-span-2 text-center py-2">
                    No categories available.
                  </p>
                )}
              </div>
              <p className="text-[10px] text-gray-400">
                * Users will only see products from selected categories. Select
                none to apply standard role-based rules.
              </p>
            </div>

            {/* Products Multi-Select */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500 flex justify-between items-center">
                <span>Assigned Products (Direct Access)</span>
                <span className="text-[10px] font-normal lowercase bg-gray-100 px-2 py-0.5 rounded text-gray-400">
                  {form.products.length} selected
                </span>
              </label>

              <input
                type="text"
                placeholder="Search products..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-emerald-500 focus:border-emerald-500 outline-none mb-2"
              />

              <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 max-h-40 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((prod) => (
                    <label
                      key={prod.id}
                      className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-white rounded-lg transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={form.products.includes(prod.id)}
                        onChange={() => handleProductToggle(prod.id)}
                        className="form-checkbox h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-700 font-medium line-clamp-1">
                          {prod.product_name}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {prod.product_code}
                        </span>
                      </div>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 col-span-2 text-center py-2">
                    {products.length === 0
                      ? "No products available."
                      : "No matching products."}
                  </p>
                )}
              </div>
              <p className="text-[10px] text-gray-400">
                * Users will have access to these specific products regardless
                of category restrictions.
              </p>
            </div>

            {/* Status Toggle */}
            <div className="flex items-center gap-3 pt-2">
              <label className="text-sm font-medium text-gray-700">
                Status Aktif
              </label>
              <div
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    is_active: !prev.is_active,
                  }))
                }
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${form.is_active ? "bg-emerald-500" : "bg-gray-300"}`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${form.is_active ? "translate-x-5" : "translate-x-0"}`}
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-4 flex items-center justify-end gap-3 mt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                {userToEdit ? "Simpan Perubahan" : "Simpan User"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
