"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Save, AlertCircle, Loader2 } from "lucide-react";
import SearchableSelect from "../ui/SearchableSelect";
import api from "@/lib/api";

type User = {
  id: number;
  name: string;
};

type Type = {
  id: number;
  approval_name: string;
};

type Pair = {
  requester: number[];
  approver: number[];
};

type Level = {
  level: number;
  amount_limit: string;
  pairs: Pair[];
};

type ApprovalRuleModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ruleToEdit?: any | null;
};

export default function ApprovalRuleModal({
  isOpen,
  onClose,
  onSuccess,
  ruleToEdit,
}: ApprovalRuleModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    approval_types_id: "",
    rule_name: "",
    is_active: true,
    levels: [] as Level[],
  });

  const [types, setTypes] = useState<Type[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchFormData();
      if (ruleToEdit && ruleToEdit.levels) {
        // Transform ruleToEdit to local state structure
        const transformedLevels = ruleToEdit.levels.map((l: any) => {
          // Group users by sequence for pairs
          const pairsMap: { [key: number]: Pair } = {};
          l.users.forEach((u: any) => {
            if (!pairsMap[u.sequence]) {
              pairsMap[u.sequence] = {
                requester: [],
                approver: [],
              };
            }
            if (u.role === "requester")
              pairsMap[u.sequence].requester.push(u.user_id);
            if (u.role === "approver")
              pairsMap[u.sequence].approver.push(u.user_id);
          });

          return {
            level: l.level,
            amount_limit: l.amount_limit.toString(),
            pairs: Object.values(pairsMap),
          };
        });

        setFormData({
          approval_types_id: ruleToEdit.approval_types_id.toString(),
          rule_name: ruleToEdit.rule_name || "",
          is_active: ruleToEdit.is_active === 1,
          levels: transformedLevels,
        });
      } else {
        setFormData({
          approval_types_id: "",
          rule_name: "",
          is_active: true,
          levels: [
            {
              level: 1,
              amount_limit: "0",
              pairs: [{ requester: [], approver: [] }],
            },
          ],
        });
      }
    }
  }, [isOpen, ruleToEdit]);

  const fetchFormData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/approval-rules/form-data");
      const data = res.data;
      setTypes(data?.types || []);
      setUsers(data?.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addLevel = () => {
    setFormData((prev) => ({
      ...prev,
      levels: [
        ...prev.levels,
        {
          level: prev.levels.length + 1,
          amount_limit: "0",
          pairs: [{ requester: [], approver: [] }],
        },
      ],
    }));
  };

  const removeLevel = (index: number) => {
    setFormData((prev) => {
      const newLevels = prev.levels
        .filter((_, i) => i !== index)
        .map((l, i) => ({ ...l, level: i + 1 }));
      return { ...prev, levels: newLevels };
    });
  };

  const addPair = (levelIndex: number) => {
    setFormData((prev) => {
      const newLevels = [...prev.levels];
      newLevels[levelIndex].pairs.push({ requester: [], approver: [] });
      return { ...prev, levels: newLevels };
    });
  };

  const removePair = (levelIndex: number, pairIndex: number) => {
    setFormData((prev) => {
      const newLevels = [...prev.levels];
      newLevels[levelIndex].pairs = newLevels[levelIndex].pairs.filter(
        (_, i) => i !== pairIndex,
      );
      return { ...prev, levels: newLevels };
    });
  };

  const updatePair = (
    levelIndex: number,
    pairIndex: number,
    role: "requester" | "approver",
    userIds: number[],
  ) => {
    setFormData((prev) => {
      const newLevels = [...prev.levels];
      newLevels[levelIndex].pairs[pairIndex][role] = userIds;
      return { ...prev, levels: newLevels };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        is_active: formData.is_active ? 1 : 0,
      };

      const res = ruleToEdit
        ? await api.put(`/approval-rules/${ruleToEdit.id}`, payload)
        : await api.post("/approval-rules", payload);

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to save rule.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col scale-100 animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">
            {ruleToEdit ? "Edit Approval Rule" : "Add Approval Rule"}
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Approval Type
              </label>
              <SearchableSelect
                label=""
                placeholder="Select Type"
                value={formData.approval_types_id}
                onChange={(val) =>
                  setFormData((p) => ({
                    ...p,
                    approval_types_id: val.toString(),
                  }))
                }
                options={[...types]
                  .sort((a, b) => (a.approval_name || "").localeCompare(b.approval_name || ""))
                  .map((t) => ({
                    value: t.id,
                    label: t.approval_name,
                  }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Rule Name
              </label>
              <input
                value={formData.rule_name}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    rule_name: e.target.value,
                  }))
                }
                required
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="e.g. PR Greater than 1M"
              />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <label className="text-sm font-semibold text-gray-700">
                Status Aktif
              </label>
              <button
                type="button"
                onClick={() =>
                  setFormData((p) => ({
                    ...p,
                    is_active: !p.is_active,
                  }))
                }
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${formData.is_active ? "bg-emerald-500" : "bg-gray-300"}`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${formData.is_active ? "translate-x-5" : "translate-x-0"}`}
                />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Levels</h3>
              <button
                type="button"
                onClick={addLevel}
                className="text-sm flex items-center gap-1.5 text-emerald-600 font-bold hover:text-emerald-700 transition-colors"
              >
                <Plus size={16} /> Add Level
              </button>
            </div>

            <div className="space-y-6">
              {formData.levels.map((lvl, lidx) => (
                <div
                  key={lidx}
                  className="border border-gray-100 rounded-3xl p-5 bg-gray-50/30 relative"
                >
                  <button
                    type="button"
                    onClick={() => removeLevel(lidx)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-gray-500">
                        Level
                      </label>
                      <input
                        value={lvl.level}
                        readOnly
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-gray-500">
                        Amount Limit
                      </label>
                      <input
                        type="number"
                        value={lvl.amount_limit}
                        onChange={(e) => {
                          const newLevels = [...formData.levels];
                          newLevels[lidx].amount_limit = e.target.value;
                          setFormData((p) => ({
                            ...p,
                            levels: newLevels,
                          }));
                        }}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-bold text-gray-700">
                        Requesters & Approvers
                      </h4>
                      <button
                        type="button"
                        onClick={() => addPair(lidx)}
                        className="text-xs flex items-center gap-1 text-emerald-600 font-bold"
                      >
                        <Plus size={14} /> Add Pair
                      </button>
                    </div>

                    <div className="space-y-3">
                      {lvl.pairs.map((pair, pidx) => (
                        <div
                          key={pidx}
                          className="flex flex-col md:flex-row gap-4 items-start bg-white p-4 rounded-2xl border border-gray-50 shadow-sm"
                        >
                          <div className="flex-1 space-y-2 w-full">
                            <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                              Requesters
                            </label>
                            <div className="flex flex-wrap gap-2 p-2 border border-gray-100 rounded-xl min-h-[42px]">
                              {users.map((u) => (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => {
                                    const current = pair.requester.includes(
                                      u.id,
                                    )
                                      ? pair.requester.filter(
                                          (id) => id !== u.id,
                                        )
                                      : [...pair.requester, u.id];
                                    updatePair(
                                      lidx,
                                      pidx,
                                      "requester",
                                      current,
                                    );
                                  }}
                                  className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${pair.requester.includes(u.id) ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100"}`}
                                >
                                  {u.name}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="hidden md:flex flex-col items-center justify-center pt-8 text-gray-300">
                            <X size={14} className="rotate-45" />
                          </div>
                          <div className="flex-1 space-y-2 w-full">
                            <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                              Approvers
                            </label>
                            <div className="flex flex-wrap gap-2 p-2 border border-gray-100 rounded-xl min-h-[42px]">
                              {users.map((u) => (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => {
                                    const current = pair.approver.includes(u.id)
                                      ? pair.approver.filter(
                                          (id) => id !== u.id,
                                        )
                                      : [...pair.approver, u.id];
                                    updatePair(lidx, pidx, "approver", current);
                                  }}
                                  className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${pair.approver.includes(u.id) ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100"}`}
                                >
                                  {u.name}
                                </button>
                              ))}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePair(lidx, pidx)}
                            className="mt-8 text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/30">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-70 transition-all shadow-lg active:scale-95"
          >
            {submitting ? (
              "Saving..."
            ) : (
              <>
                <Save size={18} /> Save Rule
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
