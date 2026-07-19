import Link from "next/link";

import { ProductShell } from "@/components/product-shell";
import { TaskMarket } from "@/components/task-market";

import styles from "./tasks.module.css";

export default function TasksPage() {
  return (
    <ProductShell>
      <section className={styles.header}>
        <div>
          <p>Live marketplace</p>
          <h1>Explore funded work on Coston2.</h1>
          <span>
            Task cards are read from TaskBounty V2. Human-readable briefs are
            displayed only after their exact bytes pass Keccak-256 verification.
          </span>
        </div>
        <Link href="/tasks/new/">Post a bounty</Link>
      </section>

      <TaskMarket />
    </ProductShell>
  );
}
