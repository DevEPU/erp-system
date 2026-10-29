import { useState, useEffect } from "react";
import { X, Save, AlertCircle } from "lucide-react";
import api from "@/lib/api";

type Warehouse = { 
  id: number; 
  code: string; 
  name: string; 
  short_name: string;
  description: string; 
  department_id: number | string;
  is_transit: boolean | number;
  is_active: boolean | number;
  warehouse_type?: string;
  address?: string;
  city?: string;
  pic_name?: string;
  pic_phone?: string;
  capacity_m3?: number;
  allow_negative_stock?: boolean | number;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  itemToEdit: Warehouse | null;
}

export default function WarehouseModal({ isOpen, onClose, onSuccess, itemToEdit }: Props) {
  const [code, setCode] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [shortName, setShortName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [isTransit, setIsTransit] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Enterprise ERP Additional Fields
  const [warehouseType, setWarehouseType] = useState<string>("INTERNAL");
  const [address, setAddress] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [picName, setPicName] = useState<string>("");
  const [picPhone, setPicPhone] = useState<string>("");
  const [capacityM3, setCapacityM3] = useState<number | "">(0);
  const [allowNegativeStock, setAllowNegativeStock] = useState<boolean>(false);
  
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchFormData();
      if (itemToEdit) {
        setCode(itemToEdit.code ?? "");
        setName(itemToEdit.name ?? "");
        setShortName(itemToEdit.short_name ?? "");
        setDescription(itemToEdit.description ?? "");
        setDepartmentId(itemToEdit.department_id?.toString() ?? "");
        setIsTransit(!!itemToEdit.is_transit);
        setIsActive(!!itemToEdit.is_active);
        setWarehouseType(itemToEdit.warehouse_type || "INTERNAL");
        setAddress(itemToEdit.address || "");
        setCity(itemToEdit.city || "");
        setPicName(itemToEdit.pic_name || "");
        setPicPhone(itemToEdit.pic_phone || "");
        setCapacityM3(itemToEdit.capacity_m3 || 0);
        setAllowNegativeStock(!!itemToEdit.allow_negative_stock);
      } else {
        setCode("");
        setName("");
        setShortName("");
        setDescription("");
        setDepartmentId("");
        setIsTransit(false);
        setIsActive(true);
        setWarehouseType("INTERNAL");
        setAddress("");
        setCity("");
        setPicName("");
        setPicPhone("");
        setCapacityM3(0);
        setAllowNegativeStock(false);
      }
    }
  }, [itemToEdit, isOpen]);

  const fetchFormData = async () => {
    try {
      const res = await api.express.get("/warehouses/form-data");
      setDepartments(res.data.departments || []);
    } catch (err) {
      console.error("Error fetching form data:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        code,
        name,
        short_name: shortName,
        description,
        department_id: departmentId || null,
        is_transit: isTransit,
        is_active: isActive,
        warehouse_type: warehouseType,
        address,
        city,
        pic_name: picName,
        pic_phone: picPhone,
        capacity_m3: Number(capacityM3) || 0,
        allow_negative_stock: allowNegativeStock,
      };
      
      if (itemToEdit) {
        await api.express.put(`/warehouses/${itemToEdit.id}`, payload);
      } else {
        await api.express.post("/warehouses", payload);
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Save Error:", error);
      const msg = error.response?.data?.message || error.message || "Something went wrong!";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">
            {itemToEdit ? "Edit Gudang" : "Tambah Gudang Baru"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs flex items-center gap-2 border border-red-100 animate-in fade-in slide-in-from-top-1">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Kode Gudang *</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-semibold text-gray-700 text-sm"
                required
                placeholder="G001"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Nama Gudang *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-semibold text-gray-700 text-sm"
                required
                placeholder="Gudang Utama"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Singkatan</label>
              <input
                type="text"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-semibold text-gray-700 text-sm"
                placeholder="G. Utama"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Tipe / Jenis Gudang</label>
              <select
                value={warehouseType}
                onChange={(e) => setWarehouseType(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-semibold text-gray-700 appearance-none text-sm"
              >
                <option value="INTERNAL">Internal Warehouse (Milik Sendiri)</option>
                <option value="VENDOR_CONSIGNMENT">Vendor Consignment (Konsinyasi Supplier)</option>
                <option value="CUSTOMER_CONSIGNMENT">Customer Consignment (Titipan Pelanggan)</option>
                <option value="TRANSIT">Transit Warehouse (Inter-Plant)</option>
                <option value="SCRAP_REJECT">Scrap / Reject Warehouse (Karantina)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-semibold text-gray-700 appearance-none text-sm"
              >
                <option value="">Pilih Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.department_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* PIC & Capacity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Kepala Gudang (PIC)</label>
              <input
                type="text"
                value={picName}
                onChange={(e) => setPicName(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-semibold text-gray-700 text-sm"
                placeholder="Manager Gudang"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Telepon PIC</label>
              <input
                type="text"
                value={picPhone}
                onChange={(e) => setPicPhone(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-semibold text-gray-700 text-sm"
                placeholder="0812xxxxxxx"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Kapasitas (m³)</label>
              <input
                type="number"
                step="0.01"
                value={capacityM3}
                onChange={(e) => setCapacityM3(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-semibold text-gray-700 text-sm"
                placeholder="500"
              />
            </div>
          </div>

          {/* Location Address */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Alamat Gudang</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-semibold text-gray-700 text-sm"
                placeholder="Jl. Industri Blok A No. 10"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Kota / Wilayah</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-semibold text-gray-700 text-sm"
                placeholder="Bekasi"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Keterangan / Catatan</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-semibold text-gray-700 h-20 resize-none text-sm"
              placeholder="Tambahkan keterangan gudang di sini..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isTransit}
                  onChange={(e) => setIsTransit(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </div>
              <span className="text-sm font-bold text-gray-600 group-hover:text-emerald-600 transition-colors">Gudang Transit</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={allowNegativeStock}
                  onChange={(e) => setAllowNegativeStock(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
              </div>
              <span className="text-sm font-bold text-gray-600 group-hover:text-amber-600 transition-colors">Izinkan Stok Minus</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </div>
              <span className="text-sm font-bold text-gray-600 group-hover:text-emerald-600 transition-colors">Status Aktif</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-all text-sm"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-8 py-2.5 text-white bg-gray-900 hover:bg-emerald-600 rounded-xl font-bold transition-all shadow-lg hover:shadow-emerald-200 active:scale-95 disabled:opacity-50 disabled:active:scale-100 text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Save size={18} />
              )}
              <span>{itemToEdit ? "Simpan Perubahan" : "Simpan Gudang"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
