import { TaskDashboard } from "@/components/task-dashboard";
import { activeDeployment } from "@/config/deployments";

import styles from "./page.module.css";

const githubUrl = "https://github.com/SharkHand3/fasset-taskbounty";
const explorerUrl = `https://coston2-explorer.flare.network/address/${activeDeployment.address}`;

export default function Home() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Primary navigation">
        <a className={styles.brand} href="#top" aria-label="TaskBounty home">
          <span className={styles.brandMark}>TB</span>
          <span>
            <strong>FAsset TaskBounty</strong>
            <small>Coston2 integration</small>
          </span>
        </a>

        <div className={styles.navLinks}>
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
          <p className={styles.eyebrow}>Public read-only milestone</p>
          <h1>Verify an escrow task from chain state to exact artifact bytes.</h1>
          <p className={styles.heroText}>
            This static dashboard reads TaskBounty V2 directly from Flare
            Testnet Coston2, retrieves the committed task and result manifests,
            and recomputes their Keccak-256 hashes in your browser.
          </p>

          <div className={styles.heroActions}>
            <a className={styles.primaryAction} href="#live-dashboard">
              Inspect live task
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
            <li>No wallet required</li>
            <li>No private RPC key</li>
            <li>No transaction signature</li>
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
        <span>FAsset TaskBounty · educational Coston2 testnet project</span>
        <span>No mainnet funds are used.</span>
      </footer>
    </main>
  );
}
