import type { Metadata } from "next";

import { ProductShell } from "@/components/product-shell";
import { TaskDetail } from "@/components/task-detail";
import { WalletPanel } from "@/components/wallet-panel";

export const metadata: Metadata = {
  description:
    "Inspect a TaskBounty escrow, verify its artifacts, and perform role-aware lifecycle actions.",
  title: "Task details",
};

export default function TaskViewPage() {
  return (
    <ProductShell>
      <TaskDetail />
      <WalletPanel />
    </ProductShell>
  );
}
