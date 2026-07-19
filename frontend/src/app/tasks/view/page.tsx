import { ProductShell } from "@/components/product-shell";
import { TaskDetail } from "@/components/task-detail";
import { WalletPanel } from "@/components/wallet-panel";

export default function TaskViewPage() {
  return (
    <ProductShell>
      <TaskDetail />
      <WalletPanel />
    </ProductShell>
  );
}
