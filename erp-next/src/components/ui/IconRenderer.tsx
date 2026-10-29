"use client";

import { icons } from "lucide-react";

type Props = {
    name: string | null | undefined;
    size?: number;
    className?: string;
};

export default function IconRenderer({
    name,
    size = 20,
    className = "",
}: Props) {
    if (!name) return null;

    // @ts-ignore
    const LucideIcon = icons[name];

    if (!LucideIcon) {
        return <span className="text-xs text-gray-400">?</span>;
    }

    return <LucideIcon size={size} className={className} />;
}
