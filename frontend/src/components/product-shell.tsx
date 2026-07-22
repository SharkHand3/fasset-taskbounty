import Link from "next/link";

import { activeDeployment } from "@/config/deployments";
import { coston2 } from "@/config/network";

import styles from "./product-shell.module.css";

interface ProductShellProps {
  children: React.ReactNode;
}

export function ProductShell({ children }: ProductShellProps) {
  const contractUrl = `${coston2.blockExplorers.default.url}/address/${activeDeployment.address}`;

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          <strong>FAsset</strong>
          <span>TaskBounty</span>
        </Link>

        <nav className={styles.nav} aria-label="Product navigation">
          <Link href="/tasks/">Bounties</Link>
          <Link href="/tasks/new/">Create</Link>
          <Link href="/lab/">Integration lab</Link>
          <a
            href="https://github.com/SharkHand3/fasset-taskbounty"
            rel="noreferrer"
            target="_blank"
          >
            GitHub <span aria-hidden="true">{"↗"}</span>
          </a>
        </nav>

        <div className={styles.headerActions}>
          <a
            className={styles.networkBadge}
            href={contractUrl}
            rel="noreferrer"
            target="_blank"
          >
            <span aria-hidden="true" />
            Coston2 / Live
          </a>
          <Link className={styles.headerCta} href="/tasks/new/">
            Post a bounty
          </Link>
        </div>
      </header>

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <Link className={styles.brand} href="/">
          <strong>FAsset</strong>
          <span>TaskBounty</span>
        </Link>
        <span>Verifiable work escrow / Coston2 beta</span>
        <a href={contractUrl} rel="noreferrer" target="_blank">
          Non-custodial by design / Contract{" "}
          <span aria-hidden="true">{"↗"}</span>
        </a>
      </footer>
    </div>
  );
}
