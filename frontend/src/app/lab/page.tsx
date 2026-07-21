import Link from "next/link";
import type { Metadata } from "next";

import { ApprovalPanel } from "@/components/approval-panel";
import { TaskDashboard } from "@/components/task-dashboard";
import { TaskCreationPanel } from "@/components/task-creation-panel";
import { WalletPanel } from "@/components/wallet-panel";
import { activeDeployment } from "@/config/deployments";

import styles from "./page.module.css";

const githubUrl = "https://github.com/SharkHand3/fasset-taskbounty";
const explorerUrl = `https://coston2-explorer.flare.network/address/${activeDeployment.address}`;

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Integration lab",
};

export default function IntegrationLab() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Primary navigation">
        <Link className={styles.brand} href="/" aria-label="Return to TaskBounty product">
          <span className={styles.brandMark}>TB</span>
          <span>
            <strong>FAsset TaskBounty</strong>
            <small>Quality assurance lab</small>
          </span>
        </Link>

        <div className={styles.navLinks}>
          <Link href="/">Product</Link>
          <a href="#wallet-identity">Wallet</a>
          <a href="#approval-preflight">Approve</a>
          <a href="#create-task-preflight">Create</a>
          <a href={githubUrl} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href={explorerUrl} target="_blank" rel="noreferrer">
            Explorer
          </a>
        </div>
      </nav>

      <section className={styles.hero} id="top">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Deterministic integration fixtures</p>
          <h1>Inspect the regression path without polluting the product UI.</h1>
          <p className={styles.heroText}>
            This quality-assurance surface reads TaskBounty V2 directly from Flare
            Testnet Coston2, retrieves the committed task and result manifests,
            recomputes their Keccak-256 hashes, identifies the connected browser
            wallet, and preserves the fixed Task #1 and Task #2 scenarios as
            reproducible test fixtures. Customer-facing flows live in the product routes.
          </p>

          <div className={styles.heroActions}>
            <a className={styles.primaryAction} href="#live-dashboard">
              Inspect live task
            </a>
            <a className={styles.secondaryAction} href="#wallet-identity">
              Check wallet identity
            </a>
            <a className={styles.secondaryAction} href="#approval-preflight">
              Review approval preflight
            </a>
            <a className={styles.secondaryAction} href="#create-task-preflight">
              Review task creation
            </a>
            <a
              className={styles.secondaryAction}
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
            >
              Review source
            </a>
          </div>

          <ul className={styles.proofList} aria-label="Dashboard guarantees">
            <li>Public reads stay wallet-free</li>
            <li>Wallet connection is optional</li>
            <li>Exact approval only after simulation</li>
          </ul>
        </div>

        <aside className={styles.heroPanel} aria-label="Current deployment">
          <div className={styles.networkLine}>
            <span className={styles.liveDot} aria-hidden="true" />
            <span>Coston2</span>
            <code>chainId 114</code>
          </div>
          <div className={styles.heroMetric}>
            <span>Contract version</span>
            <strong>2.0.0</strong>
          </div>
          <div className={styles.heroMetric}>
            <span>Integration task</span>
            <strong>#1</strong>
          </div>
          <div className={styles.heroMetric}>
            <span>Expected lifecycle</span>
            <strong>Completed</strong>
          </div>
          <div className={styles.addressBlock}>
            <span>TaskBounty V2</span>
            <code>{activeDeployment.address}</code>
          </div>
        </aside>
      </section>

      <WalletPanel />

      <ApprovalPanel />

      <TaskCreationPanel />

      <TaskDashboard />

      <section className={styles.learningSection}>
        <div>
          <p className={styles.eyebrow}>What this slice proves</p>
          <h2>Read operations are public; integrity verification is off-chain.</h2>
        </div>
        <div className={styles.learningGrid}>
          <article>
            <span>01</span>
            <h3>Typed contract reads</h3>
            <p>
              Viem encodes V2 ABI calls and decodes the task tuple without a
              wallet or user gas.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Exact-byte commitments</h3>
            <p>
              The browser hashes downloaded bytes, not the URI text and not a
              parsed JSON object.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Address-aware versions</h3>
            <p>
              V1 and V2 deployments remain separate so the frontend never
              decodes one contract with the other contract&apos;s ABI.
            </p>
          </article>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>TaskBounty · deterministic Coston2 integration lab</span>
        <span>Fixed task IDs here are test fixtures, not product assumptions.</span>
      </footer>
    </main>
  );
}
