import { CreateBountyForm } from "@/components/create-bounty-form";
import { ProductShell } from "@/components/product-shell";
import { WalletPanel } from "@/components/wallet-panel";

export default function NewTaskPage() {
  return (
    <ProductShell>
      <CreateBountyForm />
      <WalletPanel />
    </ProductShell>
  );
}
