import type { Metadata } from "next";
import Link from "next/link";

import { HumanProofEffects } from "@/components/human-proof-effects";
import { ProductShell } from "@/components/product-shell";
import { ProtocolOverviewCard } from "@/components/protocol-overview";
import {
  activeDeployment,
  integrationParticipants,
  rewardTokenSymbol,
} from "@/config/deployments";
import { shortenAddress } from "@/lib/wallet-identity";

import styles from "./page.module.css";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const completedTask = {
  block: "32,929,045",
  resultHash:
    "0x59f387788cb0121d7a9d6ba319e5580923037dfb3eb8e8e46e0c88cfa81177ce",
  settlement:
    "0xaf9ed72d2b2d5cc9c0f2dec4a726bf7bce7435a8bb15245040e37e8d07814d2c",
};

const lifecycle = ["Funded", "Accepted", "Submitted", "Verified", "Released"];

export default function Home() {
  return (
    <>
      <HumanProofEffects />
      <ProductShell>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span aria-hidden="true" />
              Escrow for verifiable work
            </p>
            <h1>
              Good work deserves a <em>clear finish.</em>
            </h1>
            <p className={styles.heroText}>
              Fund a task, agree on the evidence, and let the chain settle what
              both sides can verify - without trusting a platform to hold the
              money.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryAction} href="/tasks/">
                Explore open work
              </Link>
              <Link className={styles.secondaryAction} href="/tasks/new/">
                Post a bounty
              </Link>
            </div>
          </div>

          <div className={styles.protocolStage}>
            <div className={styles.stageGlow} aria-hidden="true" />
            <div className={styles.stageLabel}>
              <span>Live protocol surface</span>
              <strong>Publicly verifiable</strong>
            </div>
            <ProtocolOverviewCard />
            <div className={styles.proofSeal}>
              <small>Proof state</small>
              <strong>Exact bytes</strong>
              <span>Hash matched</span>
            </div>
            <div className={styles.settlementTrace}>
              <div>
                <span>Task #1 settlement trace</span>
                <strong>Finalized</strong>
              </div>
              <div className={styles.lifecycle}>
                <div className={styles.lifecycleLine}>
                  <span />
                </div>
                {lifecycle.map((step) => (
                  <div className={styles.lifecycleStep} key={step}>
                    <i aria-hidden="true" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          className={`${styles.promiseStrip} ${styles.reveal}`}
          data-reveal
        >
          <div>
            <small>01 / Fund</small>
            <p>Reward locked in escrow</p>
          </div>
          <div>
            <small>02 / Prove</small>
            <p>Exact bytes bound to a hash</p>
          </div>
          <div>
            <small>03 / Settle</small>
            <p>Approval releases on-chain</p>
          </div>
        </section>

        <section className={styles.ticker} aria-label="Protocol qualities">
          <div>
            <span>Non-custodial escrow</span>
            <i />
            <span>Exact-byte proof</span>
            <i />
            <span>Public Coston2 settlement</span>
            <i />
            <span>Creator-controlled release</span>
            <i />
            <span>Non-custodial escrow</span>
            <i />
            <span>Exact-byte proof</span>
            <i />
            <span>Public Coston2 settlement</span>
            <i />
            <span>Creator-controlled release</span>
            <i />
          </div>
        </section>

        <section
          className={styles.proofStory}
          aria-labelledby="proof-story-heading"
        >
          <div className={`${styles.storyIntro} ${styles.reveal}`} data-reveal>
            <p className={styles.eyebrow}>
              A settlement narrative you can inspect
            </p>
            <h2 id="proof-story-heading">
              Trust is not a promise.
              <br />
              <em>It is a visible sequence.</em>
            </h2>
            <p>
              Every boundary creates a public state change. The product can
              explain what happened without asking either side to trust a
              private database.
            </p>
          </div>
          <div className={styles.storyCards}>
            <article
              className={`${styles.storyCard} ${styles.reveal}`}
              data-reveal
            >
              <span>01</span>
              <small>Commit the terms</small>
              <h3>Money and scope become one task.</h3>
              <p>
                The creator funds escrow and binds the task brief before anyone
                starts work.
              </p>
              <code>status: OPEN / escrow: 1.00 {rewardTokenSymbol}</code>
            </article>
            <article
              className={`${styles.storyCard} ${styles.reveal}`}
              data-reveal
            >
              <span>02</span>
              <small>Bind the evidence</small>
              <h3>The deliverable gets an exact fingerprint.</h3>
              <p>
                The worker submits a durable result URI with the Keccak-256 of
                its exact bytes.
              </p>
              <code>resultHash: {completedTask.resultHash.slice(0, 14)}...</code>
            </article>
            <article
              className={`${styles.storyCard} ${styles.reveal}`}
              data-reveal
            >
              <span>03</span>
              <small>Release on-chain</small>
              <h3>Approval becomes a public settlement.</h3>
              <p>
                The creator approves the bound result; the contract releases
                escrow to the worker.
              </p>
              <code>status: COMPLETED / payout: FINAL</code>
            </article>
          </div>
        </section>

        <section
          className={`${styles.evidenceLab} ${styles.reveal}`}
          data-reveal
        >
          <div className={styles.evidenceCopy}>
            <p className={styles.eyebrow}>Live evidence surface</p>
            <h2>Every claim has a trace.</h2>
            <p>
              Human-readable product language on the left, verifiable protocol
              data underneath. Both remain available without turning the
              experience into a block explorer.
            </p>
            <Link href="/tasks/view/?id=1">Inspect completed Task #1</Link>
          </div>
          <div className={styles.manifestCard}>
            <div className={styles.manifestHead}>
              <span>RESULT MANIFEST / TASK 001</span>
              <strong>VERIFIED</strong>
            </div>
            <dl>
              <div>
                <dt>network</dt>
                <dd>coston2 / 114</dd>
              </div>
              <div>
                <dt>contract</dt>
                <dd>{shortenAddress(activeDeployment.address)}</dd>
              </div>
              <div>
                <dt>creator</dt>
                <dd>{shortenAddress(integrationParticipants.creator)}</dd>
              </div>
              <div>
                <dt>worker</dt>
                <dd>{shortenAddress(integrationParticipants.worker)}</dd>
              </div>
              <div>
                <dt>keccak256</dt>
                <dd>{completedTask.resultHash.slice(0, 22)}...</dd>
              </div>
              <div>
                <dt>settlement</dt>
                <dd>{completedTask.settlement.slice(0, 22)}...</dd>
              </div>
            </dl>
            <div className={styles.manifestSignal}>
              <span aria-hidden="true" />
              <p>Exact-byte match confirmed at block {completedTask.block}</p>
            </div>
            <div className={styles.hashStream} aria-hidden="true">
              59f38778 / 8cb0121d / 7a9d6ba3 / 19e55809 / 59f38778 /
              8cb0121d
            </div>
          </div>
        </section>

        <section className={`${styles.finalCta} ${styles.reveal}`} data-reveal>
          <p className={styles.eyebrow}>Build confidence into the workflow</p>
          <h2>
            Make the finish
            <br />
            as clear as the brief.
          </h2>
          <div>
            <p>
              TaskBounty turns funded intent, submitted work, and final payment
              into one inspectable product journey.
            </p>
            <Link className={styles.primaryAction} href="/tasks/new/">
              Create a funded bounty
            </Link>
          </div>
        </section>
      </ProductShell>
    </>
  );
}
