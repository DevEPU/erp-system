"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Tag, Edit2, Trash2, Package, Archive, ShieldAlert, Coins, Truck, Tags } from "lucide-react";
import CategoryModal from "@/components/master-data/CategoryModal";
import ProductCategoryDetailModal from "@/components/master-data/ProductCategoryDetailModal";
import usePermission from "@/hooks/usePermission";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import api from "@/lib/api";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";

type Category = {
  id: number;
  category_code: string;
  category_name: string;
  products_count?: number;
};

export default function ProductCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [unassociatedCount, setUnassociatedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailCategory, setDetailCategory] = useState<Category | null>(null);

  const { can } = usePermission();
  const {
    isOpen: isStatusModalOpen,
    type: modalType,
    title: modalTitle,
    message: modalMessage,
    onConfirm: modalOnConfirm,
    showSuccess,
    showError,
    showConfirm,
    closeModal,
    isLoading: isActionLoading,
    setIsLoading: setActionLoading,
  } = useStatusModal();

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/product-categories");
      const fetchedCats = res.data.data || res.data || [];
      const unassociated = res.data.unassociated_count || 0;
      setUnassociatedCount(unassociated);

      const virtualCat: Category = {
        id: 0,
        category_code: "BT",
        category_name: "Belum Terkait",
        products_count: unassociated
      };

      setCategories([virtualCat, ...fetchedCats]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAdd = () => {
    setSelectedCategory(null);
    setIsModalOpen(true);
  };

  const handleEdit = (cat: Category) => {
    setSelectedCategory(cat);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    showConfirm(
      "Delete Category?",
      "Are you sure you want to delete this category? This action cannot be undone.",
      () => performDelete(id),
      "Delete Now",
      "Keep it",
    );
  };

  const performDelete = async (id: number) => {
    setActionLoading(true);
    try {
      await api.express.delete(`/product-categories/${id}`);
      showSuccess("Deleted!", "Category has been deleted successfully.");
      fetchCategories();
    } catch (error: any) {
      showError("Delete Failed", error.message || "Failed to delete.");
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = categories.filter(
    (c) =>
      c.category_name.toLowerCase().includes(search.toLowerCase()) ||
      c.category_code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-500">
      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchCategories();
          showSuccess(
            "Success!",
            selectedCategory
              ? "Category updated successfully."
              : "Category created successfully.",
          );
        }}
        categoryToEdit={selectedCategory}
      />

      <ProductCategoryDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        category={detailCategory}
      />

      <StatusModal
        isOpen={isStatusModalOpen}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
        onConfirm={modalOnConfirm}
        onClose={closeModal}
        isLoading={isActionLoading}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
              <Tag className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Kategori <span className="text-emerald-600">Produk</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Organisasikan produk Anda ke dalam kategori untuk kemudahan pencarian dan analisis.
          </p>
        </div>
        
        {can("create_categories") && (
          <button
            onClick={handleAdd}
            className="group relative flex items-center gap-3 bg-gray-900 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-emerald-200 active:scale-95 overflow-hidden"
          >
            <Plus size={20} strokeWidth={3} />
            <span>Tambah Kategori Baru</span>
          </button>
        )}

        <FilterBar 
          searchPlaceholder="Cari kategori berdasarkan nama atau kode..." 
          searchValue={search} 
          onSearchChange={setSearch} 
        />
      </div>

      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 mb-6 hide-scrollbar">
        <StatCard icon={<Tag size={20} />} iconBgColor="bg-emerald-50" iconColor="text-emerald-600" label="TOTAL KATEGORI" value={categories.filter(c => c.id !== 0).length} />
        <StatCard icon={<Package size={20} />} iconBgColor="bg-blue-50" iconColor="text-blue-600" label="TOTAL PRODUK TERKAIT" value={categories.filter(c => c.id !== 0).reduce((acc, cat) => acc + (cat.products_count || 0), 0)} />
        <StatCard icon={<ShieldAlert size={20} />} iconBgColor="bg-rose-50" iconColor="text-rose-600" label="BELUM TERKAIT" value={unassociatedCount} />
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Code
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Name
                </th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Products
                </th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 flex-1">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-4">
                    Loading...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                    onClick={() => {
                      setDetailCategory(c);
                      setIsDetailModalOpen(true);
                    }}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {c.category_code}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                      {c.category_name}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Package size={12} className="mr-1" />
                        {c.products_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {c.id !== 0 && can("edit_categories") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(c);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg top-0 relative z-10"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {c.id !== 0 && can("delete_categories") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(c.id);
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg top-0 relative z-10"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">
                    No categories found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 mt-auto">
          <div className="text-sm text-gray-400 font-bold uppercase tracking-widest">
            {filtered.length > 0 ? `1 - ${filtered.length} OF ${filtered.length}` : "0 OF 0"}
          </div>
          <div className="flex items-center gap-2">
            <button disabled className="px-4 py-2 text-sm font-bold rounded-xl bg-white border border-gray-200 opacity-50">Prev</button>
            <button className="w-9 h-9 flex items-center justify-center text-sm font-black rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-200">1</button>
            <button disabled className="px-4 py-2 text-sm font-bold rounded-xl bg-white border border-gray-200 opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
