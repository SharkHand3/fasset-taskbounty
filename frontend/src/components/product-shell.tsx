import Link from "next/link";

import { activeDeployment } from "@/config/deployments";
import { coston2 } from "@/config/network";

import styles from "./product-shell.module.css";

interface ProductShellProps {
  children: React.ReactNode;
}

export function ProductShell({ children }: ProductShellProps) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          <span className={styles.brandMark}>TB</span>
          <span>
            <strong>TaskBounty</strong>
            <small>FAsset escrow marketplace</small>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Product navigation">
          <Link href="/tasks/">Explore</Link>
          <Link href="/tasks/new/">Post a bounty</Link>
          <Link href="/lab/">Integration lab</Link>
          <a
            href="https://github.com/SharkHand3/fasset-taskbounty"
            rel="noreferrer"
            target="_blank"
          >
            GitHub ↗
          </a>
        </nav>

        <a
          className={styles.networkBadge}
          href={`${coston2.blockExplorers.default.url}/address/${activeDeployment.address}`}
          rel="noreferrer"
          target="_blank"
        >
          <span aria-hidden="true" />
          Coston2
        </a>
      </header>

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <div>
          <strong>TaskBounty</strong>
          <span>Trust-minimized work escrow with verifiable artifacts.</span>
        </div>
        <div>
          <span>Coston2 testnet · No mainnet funds</span>
          <a
            href={`${coston2.blockExplorers.default.url}/address/${activeDeployment.address}`}
            rel="noreferrer"
            target="_blank"
          >
            Contract ↗
          </a>
        </div>
      </footer>
    </div>
  );
}
