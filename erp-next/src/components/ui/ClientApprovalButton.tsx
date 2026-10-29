"use client";

import dynamic from "next/dynamic";

const FloatingApprovalButton = dynamic(
  () => import("./FloatingApprovalButton"),
  { ssr: false }
);

export default function ClientApprovalButton() {
  return <FloatingApprovalButton />;
}
