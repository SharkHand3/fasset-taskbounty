import type { Metadata } from "next";

import { CreateBountyForm } from "@/components/create-bounty-form";
import { ProductShell } from "@/components/product-shell";
import { WalletPanel } from "@/components/wallet-panel";

export const metadata: Metadata = {
  alternates: { canonical: "/tasks/new/" },
  description:
    "Create a hash-bound task manifest and fund a Coston2 FTestXRP bounty.",
  title: "Post a bounty",
};

export default function NewTaskPage() {
  return (
    <ProductShell>
      <CreateBountyForm />
      <WalletPanel />
    </ProductShell>
  );
}
