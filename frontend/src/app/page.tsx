import Link from "next/link";

import { ProductShell } from "@/components/product-shell";
import { ProtocolOverviewCard } from "@/components/protocol-overview";

import styles from "./page.module.css";

export default function Home() {
  return (
    <ProductShell>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>FAsset-powered work escrow</p>
          <h1>Fund the outcome. Verify the work. Release on-chain.</h1>
          <p className={styles.heroText}>
            TaskBounty lets clients lock FTestXRP behind a clear task brief and
            lets contributors submit verifiable, hash-bound work before payment
            is released on Coston2.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryAction} href="/tasks/">
              Explore bounties
            </Link>
            <Link className={styles.secondaryAction} href="/tasks/new/">
              Post a bounty
            </Link>
          </div>
          <div className={styles.trustRow}>
            <span>No platform custody</span>
            <span>Exact-byte artifact proofs</span>
            <span>Public Coston2 settlement</span>
          </div>
        </div>

        <ProtocolOverviewCard />
      </section>

      <section className={styles.valueSection}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>How TaskBounty works</p>
          <h2>A simple marketplace flow with verifiable boundaries.</h2>
        </div>
        <div className={styles.valueGrid}>
          <article>
            <span>01</span>
            <h3>Publish a precise brief</h3>
            <p>
              The creator stores a retrieval URI and Keccak-256 commitment for
              the exact task manifest, then deposits the reward into escrow.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Deliver committed work</h3>
            <p>
              A contributor accepts the bounty and submits a separate result
              URI with its own exact-byte commitment.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Release against evidence</h3>
            <p>
              The creator verifies the committed result and releases the escrow
              to the assigned worker through the contract.
            </p>
          </article>
        </div>
      </section>

      <section className={styles.productSection}>
        <div>
          <p className={styles.eyebrow}>Built for transparent collaboration</p>
          <h2>The chain handles settlement; clients handle rich discovery.</h2>
          <p>
            Task status, participants, reward liabilities, and settlement stay
            on-chain. Human-readable briefs and deliverables stay off-chain but
            are bound to immutable content hashes.
          </p>
          <Link href="/tasks/">Browse live on-chain tasks →</Link>
        </div>
        <dl>
          <div>
            <dt>Escrow</dt>
            <dd>Exact ERC-20 balance accounting</dd>
          </div>
          <div>
            <dt>Artifacts</dt>
            <dd>URI + Keccak-256 commitments</dd>
          </div>
          <div>
            <dt>Wallet</dt>
            <dd>User-controlled signing via EIP-1193</dd>
          </div>
          <div>
            <dt>Verification</dt>
            <dd>Receipts, events, and public reads</dd>
          </div>
        </dl>
      </section>

      <section className={styles.ctaSection}>
        <div>
          <p className={styles.eyebrow}>Coston2 beta</p>
          <h2>Turn a clear deliverable into a funded bounty.</h2>
        </div>
        <Link href="/tasks/new/">Create a task</Link>
      </section>
    </ProductShell>
  );
}
