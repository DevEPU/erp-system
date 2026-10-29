"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  ListTree,
  ListChecks,
} from "lucide-react";
import ApprovalTypeModal from "@/components/approval/ApprovalTypeModal";
import ApprovalRuleModal from "@/components/approval/ApprovalRuleModal";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import api from "@/lib/api";

export default function ApprovalSettingsPage() {
  const [activeTab, setActiveTab] = useState<"rules" | "types">("rules");
  const [loading, setLoading] = useState(true);

  // Data States
  const [rules, setRules] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);

  // Search States
  const [ruleSearch, setRuleSearch] = useState("");
  const [typeSearch, setTypeSearch] = useState("");

  // Modal States
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<any | null>(null);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any | null>(null);

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

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await api.get("/approval-rules");
      setRules(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const res = await api.get("/approval-types");
      setTypes(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "rules") fetchRules();
    else fetchTypes();
  }, [activeTab]);

  const handleDeleteType = (id: number) => {
    showConfirm(
      "Delete Type?",
      "Are you sure you want to delete this approval type?",
      () => performDeleteType(id),
      "Delete Now",
      "Keep it",
    );
  };

  const performDeleteType = async (id: number) => {
    setActionLoading(true);
    try {
      await api.delete(`/approval-types/${id}`);
      showSuccess("Deleted!", "Approval type deleted successfully.");
      fetchTypes();
    } catch (e: any) {
      showError(
        "Delete Failed",
        e.message || "Failed to delete approval type.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRule = (id: number) => {
    showConfirm(
      "Delete Rule?",
      "Are you sure you want to delete this approval rule?",
      () => performDeleteRule(id),
      "Delete Now",
      "Keep it",
    );
  };

  const performDeleteRule = async (id: number) => {
    setActionLoading(true);
    try {
      await api.delete(`/approval-rules/${id}`);
      showSuccess("Deleted!", "Approval rule deleted successfully.");
      fetchRules();
    } catch (e: any) {
      showError(
        "Delete Failed",
        e.message || "Failed to delete approval rule.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRules = rules.filter(
    (r) =>
      r.rule_name?.toLowerCase().includes(ruleSearch.toLowerCase()) ||
      r.type?.approval_name?.toLowerCase().includes(ruleSearch.toLowerCase()),
  );

  const filteredTypes = types.filter(
    (t) =>
      t.approval_name?.toLowerCase().includes(typeSearch.toLowerCase()) ||
      t.approval_code?.toLowerCase().includes(typeSearch.toLowerCase()),
  );

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-500">
      {/* Modals */}
      <ApprovalTypeModal
        isOpen={isTypeModalOpen}
        onClose={() => setIsTypeModalOpen(false)}
        onSuccess={() => {
          fetchTypes();
          showSuccess(
            "Success!",
            selectedType
              ? "Type updated successfully."
              : "Type created successfully.",
          );
        }}
        typeToEdit={selectedType}
      />
      <ApprovalRuleModal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        onSuccess={() => {
          fetchRules();
          showSuccess(
            "Success!",
            selectedRule
              ? "Rule updated successfully."
              : "Rule created successfully.",
          );
        }}
        ruleToEdit={selectedRule}
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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
              <ListChecks className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Approval <span className="text-emerald-600">Rules</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Kelola alur persetujuan dan kategori approval untuk setiap jenis transaksi di perusahaan.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Tabs */}
          <div className="flex bg-gray-100 p-1.5 rounded-2xl">
            <button
              onClick={() => setActiveTab("rules")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === "rules"
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <ListTree size={16} />
              <span>Rules</span>
            </button>
            <button
              onClick={() => setActiveTab("types")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === "types"
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <LayoutGrid size={16} />
              <span>Types</span>
            </button>
          </div>

          <button
            onClick={() =>
              activeTab === "rules"
                ? (setSelectedRule(null), setIsRuleModalOpen(true))
                : (setSelectedType(null), setIsTypeModalOpen(true))
            }
            className="group relative flex items-center gap-3 bg-gray-900 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-emerald-200 active:scale-95 overflow-hidden"
          >
            <Plus size={20} strokeWidth={3} />
            <span>Tambah {activeTab === "rules" ? "Rule" : "Type"}</span>
          </button>
        </div>
      </div>

      {/* Content Container */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
        {/* Search & Stats */}
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50">
          <div className="relative w-full max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={
                activeTab === "rules" ? "Cari rule..." : "Cari type..."
              }
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition duration-150"
              value={activeTab === "rules" ? ruleSearch : typeSearch}
              onChange={(e) =>
                activeTab === "rules"
                  ? setRuleSearch(e.target.value)
                  : setTypeSearch(e.target.value)
              }
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              Total:{" "}
              <span className="font-bold text-gray-800">
                {activeTab === "rules"
                  ? filteredRules.length
                  : filteredTypes.length}
              </span>{" "}
              {activeTab === "rules" ? "Rules" : "Types"}
            </div>
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeTab === "rules" ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Rule Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Levels
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-4 w-32 bg-gray-200 rounded"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 bg-gray-200 rounded"></div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="h-4 w-12 bg-gray-200 rounded mx-auto"></div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="h-6 w-16 bg-gray-200 rounded-full mx-auto"></div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="h-4 w-4 bg-gray-200 rounded mx-auto"></div>
                      </td>
                    </tr>
                  ))
                ) : filteredRules.length > 0 ? (
                  filteredRules.map((rule) => (
                    <tr
                      key={rule.id}
                      className="hover:bg-gray-50/80 transition-colors group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {rule.rule_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 italic">
                        {rule.type?.approval_name || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg font-bold border border-emerald-100">
                          {rule.levels?.length || 0} Levels
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {rule.is_active === 1 ? (
                          <div className="flex items-center justify-center gap-1.5 text-emerald-600">
                            <CheckCircle2 size={16} />
                            <span className="text-xs font-bold uppercase">
                              Active
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5 text-gray-400">
                            <XCircle size={16} />
                            <span className="text-xs font-bold uppercase">
                              Inactive
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedRule(rule);
                              setIsRuleModalOpen(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-10 text-center text-gray-500"
                    >
                      Data rule tidak ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Type Name
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-4 w-20 bg-gray-200 rounded"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-48 bg-gray-200 rounded"></div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="h-4 w-12 bg-gray-200 rounded mx-auto"></div>
                      </td>
                    </tr>
                  ))
                ) : filteredTypes.length > 0 ? (
                  filteredTypes.map((type) => (
                    <tr
                      key={type.id}
                      className="hover:bg-gray-50/80 transition-colors group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 tracking-tight">
                        {type.approval_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium italic">
                        {type.approval_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedType(type);
                              setIsTypeModalOpen(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteType(type.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-10 text-center text-gray-500"
                    >
                      Data type tidak ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
