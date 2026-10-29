"use client";

import { useState, useEffect } from "react";
import { 
  X, 
  Target, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  PieChart,
  Calendar,
  Layers,
  Info
} from "lucide-react";
import { API_BASE_URL } from "@/lib/constants";
import api from "@/lib/api";

interface TargetSalesDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: any;
}

export default function TargetSalesDetailModal({
  isOpen,
  onClose,
  target,
}: TargetSalesDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [budgetData, setBudgetData] = useState<any>(null);

  useEffect(() => {
    if (isOpen && target) {
      fetchBudgetData();
    }
  }, [isOpen, target]);

  const fetchBudgetData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/budget-summary`, { 
        year: target.year, 
        month: target.month 
      });
      
      const data = res.data;
      if (data && data.data) {
        // Sum all departments
        let totalApproved = 0;
        let totalUsed = 0;

        data.data.forEach((dept: any) => {
          totalApproved += parseFloat(dept.grandtotal || 0);
          totalUsed += parseFloat(dept.used_amount || 0);
        });

        setBudgetData({
          totalApproved,
          totalUsed,
          totalRemaining: totalApproved - totalUsed,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !target) return null;

  const targetAmount = parseFloat(target.target_amount);
  const approvedBudget = budgetData?.totalApproved || 0;
  const usedBudget = budgetData?.totalUsed || 0;
  const remainingBudget = budgetData?.totalRemaining || 0;

  const gap = targetAmount - approvedBudget;
  const gapPercentage = targetAmount > 0 ? (gap / targetAmount) * 100 : 0;
  const budgetCoverage = targetAmount > 0 ? (approvedBudget / targetAmount) * 100 : 0;

  const getMonthName = (monthNum: number) => {
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return months[monthNum - 1];
  };

  const getStatusConfig = (status: string) => {
    const s = status?.toLowerCase();
    switch (s) {
      case "approved":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-100",
          iconBg: "bg-emerald-500 text-white",
          dot: "bg-emerald-500",
          label: "Approved"
        };
      case "pending":
        return {
          bg: "bg-orange-50 text-orange-700 border-orange-100",
          iconBg: "bg-orange-500 text-white",
          dot: "bg-orange-500",
          label: "Pending Approval"
        };
      case "rejected":
      case "reject":
        return {
          bg: "bg-red-50 text-red-700 border-red-100",
          iconBg: "bg-red-500 text-white",
          dot: "bg-red-500",
          label: "Rejected"
        };
      default:
        return {
          bg: "bg-gray-50 text-gray-700 border-gray-100",
          iconBg: "bg-gray-500 text-white",
          dot: "bg-gray-500",
          label: status
        };
    }
  };

  const statusConfig = getStatusConfig(target.status);

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-white w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300 flex flex-col">
        {/* Header */}
        <div className="bg-linear-to-br from-emerald-600 to-teal-700 p-8 pb-6 text-white relative shrink-0">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2 bg-white/20 w-fit px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">
                <Calendar size={12} />
                {getMonthName(target.month)} {target.year}
              </div>
              <h2 className="text-3xl font-black tracking-tight mt-2">Target Analysis</h2>
              <p className="text-emerald-50/70 text-sm font-medium">Ref: {target.reference}</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Main Target Stat */}
          <div className="mt-6 bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-6">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs font-bold text-emerald-100 uppercase tracking-widest mb-1">Target Sales</p>
                <p className="text-4xl font-black">Rp {targetAmount.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-white/20 rounded-2xl">
                <Target size={32} />
              </div>
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="p-8 pt-6 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Crunching Budget Data...</p>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100">
                  <div className="flex items-center gap-2 text-emerald-600 mb-3">
                    <Wallet size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Approved Budget</span>
                  </div>
                  <p className="text-xl font-black text-gray-900 leading-none whitespace-nowrap">
                    Rp {approvedBudget.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase">Total monthly plans</p>
                </div>

                <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100">
                  <div className="flex items-center gap-2 text-orange-600 mb-3">
                    <PieChart size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Budget Used</span>
                  </div>
                  <p className="text-xl font-black text-gray-900 leading-none whitespace-nowrap">
                    Rp {usedBudget.toLocaleString()}
                  </p>
                  <div className="w-full bg-gray-200 h-1 rounded-full mt-3 overflow-hidden">
                    <div 
                      className="bg-orange-500 h-full transition-all duration-1000"
                      style={{ width: `${approvedBudget > 0 ? (usedBudget / approvedBudget) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100">
                  <div className="flex items-center gap-2 text-blue-600 mb-3">
                    <Layers size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Remaining</span>
                  </div>
                  <p className="text-xl font-black text-gray-900 leading-none whitespace-nowrap">
                    Rp {remainingBudget.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase">Available funds</p>
                </div>
              </div>

              {/* Gap Analysis Card */}
              <div className="bg-emerald-50/50 rounded-4xl border border-emerald-100 overflow-hidden">
                <div className="p-6 flex items-center justify-between border-b border-emerald-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-200">
                      <TrendingUp size={20} />
                    </div>
                    <h3 className="font-black text-emerald-900 tracking-tight">Gap Analysis</h3>
                  </div>
                  <div className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest ${gap >= 0 ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                    {gap >= 0 ? 'Surplus Potential' : 'Deficit Danger'}
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-1">Target vs Budget Gap</p>
                      <p className="text-3xl font-black text-emerald-900">
                        Rp {Math.abs(gap).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-1">Gap Percentage</p>
                      <p className={`text-3xl font-black ${gap >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {gapPercentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-emerald-600/60">
                      <span>Performance Index</span>
                      <span>{budgetCoverage.toFixed(1)}% Coverage</span>
                    </div>
                    <div className="w-full bg-emerald-100 h-3 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-600 h-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                        style={{ width: `${Math.min(budgetCoverage, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-emerald-800/60 leading-relaxed pt-2 italic">
                      {gap >= 0 
                        ? "Currently, your target is higher than your planned budget. This is a good sign for revenue potential."
                        : "Caution: Your approved budget exceeds the sales target. Consider optimizing expenditures."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status & Info */}
              <div className={`flex items-center justify-between p-6 rounded-4xl border ${statusConfig.bg}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${statusConfig.iconBg} shadow-lg shadow-black/5`}>
                    <Info size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-1">Current Status</p>
                    <p className="text-xl font-black tracking-tight leading-none uppercase italic">
                      {statusConfig.label}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur-md rounded-xl border border-black/5">
                  <span className={`w-2 h-2 rounded-full animate-pulse ${statusConfig.dot}`}></span>
                  <span className="text-[10px] font-bold uppercase tracking-widest">Live Tracker</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 flex justify-end shrink-0 border-t border-gray-50 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-gray-200"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
}
