import { ReactNode } from "react";

interface StatCardProps {
  icon: ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  label: string;
  value: string | number;
}

export default function StatCard({
  icon,
  iconBgColor = "bg-gray-100",
  iconColor = "text-gray-600",
  label,
  value,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col items-start gap-2.5 flex-1 min-w-[140px] transition-all hover:shadow-md">
      <div className={`p-2 rounded-lg ${iconBgColor} ${iconColor}`}>
        {icon}
      </div>
      <div className="space-y-0.5">
        <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
          {label}
        </h3>
        <p className="text-xl font-black text-gray-900 tracking-tight">
          {value}
        </p>
      </div>
    </div>
  );
}
