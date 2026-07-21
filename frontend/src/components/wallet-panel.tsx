"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUnits, zeroAddress } from "viem";
import {
  type Connector,
  useBalance,
  useConnect,
  useConnection,
  useConnectors,
  useDisconnect,
  useReadContract,
  useSwitchChain,
} from "wagmi";

import {
  rewardTokenAddress,
  rewardTokenDecimals,
  rewardTokenSymbol,
} from "@/config/deployments";
import { coston2 } from "@/config/network";
import { erc20ReadAbi } from "@/lib/abi/erc20";
import {
  getWalletNetworkState,
  shortenAddress,
} from "@/lib/wallet-identity";

import styles from "./wallet-panel.module.css";

const walletInstallLinks = [
  { href: "https://metamask.io/download/", label: "MetaMask" },
  { href: "https://rabby.io/", label: "Rabby" },
] as const;

function getErrorMessage(error: Error | null): string | null {
  if (!error) return null;
  if (error.name === "UserRejectedRequestError") {
    return "The wallet request was rejected. No account or transaction was changed.";
  }
  return error.message;
}

function chooseDisplayConnectors(
  connectors: readonly Connector[],
  readyConnectorUids: ReadonlySet<string>,
): readonly Connector[] {
  const ready = connectors.filter((connector) =>
    readyConnectorUids.has(connector.uid),
  );
  const specificallyNamed = ready.filter(
    (connector) => connector.name !== "Injected",
  );
  return specificallyNamed.length > 0 ? specificallyNamed : ready;
}

export function WalletPanel() {
  const connection = useConnection();
  const connectors = useConnectors();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const switchChain = useSwitchChain();
  const [walletDetectionComplete, setWalletDetectionComplete] = useState(false);
  const [readyConnectorUids, setReadyConnectorUids] = useState<ReadonlySet<string>>(
    new Set(),
  );

  useEffect(() => {
    let cancelled = false;

    async function detectProviders() {
      const detected = new Set<string>();
      await Promise.all(
        connectors.map(async (connector) => {
          try {
            if (await connector.getProvider()) detected.add(connector.uid);
          } catch {
            // A broken extension should not prevent other wallets from appearing.
          }
        }),
      );

      if (!cancelled) {
        setReadyConnectorUids(detected);
        setWalletDetectionComplete(true);
      }
    }

    void detectProviders();
    return () => {
      cancelled = true;
    };
  }, [connectors]);

  const displayConnectors = useMemo(
    () => chooseDisplayConnectors(connectors, readyConnectorUids),
    [connectors, readyConnectorUids],
  );
  const networkState = getWalletNetworkState(connection.chainId);
  const connectedAddress = connection.address ?? zeroAddress;

  const nativeBalance = useBalance({
    address: connectedAddress,
    chainId: coston2.id,
    query: { enabled: connection.isConnected },
  });
  const tokenBalance = useReadContract({
    abi: erc20ReadAbi,
    address: rewardTokenAddress,
    args: [connectedAddress],
    chainId: coston2.id,
    functionName: "balanceOf",
    query: { enabled: connection.isConnected },
  });

  const actionError =
    getErrorMessage(connect.error) ?? getErrorMessage(switchChain.error);

  return (
    <section className={styles.walletSection} id="wallet-identity">
      <div className={styles.sectionIntro}>
        <div>
          <p className={styles.eyebrow}>Wallet</p>
          <h2>Connect your account to take part in a bounty.</h2>
        </div>
        <p>
          Connection exposes only the selected public address and active chain.
          Connecting itself has no signing or gas spending. Every escrow action
          has its own simulation, review, and wallet confirmation.
        </p>
      </div>

      <div className={styles.walletCard}>
        <div className={styles.walletHeading}>
          <div>
            <span className={styles.cardLabel}>Injected EIP-1193 wallet</span>
            <h3>
              {connection.isConnected ? "Wallet connected" : "No account connected"}
            </h3>
          </div>
          <span
            className={`${styles.connectionPill} ${
              connection.isConnected ? styles.connected : ""
            }`}
          >
            {connection.isConnecting && "Connecting"}
            {connection.isReconnecting && "Reconnecting"}
            {connection.isConnected && "Connected"}
            {connection.isDisconnected && "Disconnected"}
          </span>
        </div>

        {connection.isDisconnected && (
          <div className={styles.connectArea}>
            {!walletDetectionComplete && (
              <p aria-live="polite">Checking for browser wallets…</p>
            )}

            {walletDetectionComplete && displayConnectors.length === 0 && (
              <div className={styles.noWallet} role="status">
                <strong>No compatible browser wallet detected.</strong>
                <p>
                  Install a dedicated testnet wallet, then reload this page. Do
                  not use an account that holds mainnet funds.
                </p>
                <div className={styles.installLinks}>
                  {walletInstallLinks.map((wallet) => (
                    <a
                      href={wallet.href}
                      key={wallet.href}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Official {wallet.label} site ↗
                    </a>
                  ))}
                </div>
              </div>
            )}

            {displayConnectors.length > 0 && (
              <div className={styles.connectorList}>
                {displayConnectors.map((connector) => (
                  <button
                    disabled={connect.isPending}
                    key={connector.uid}
                    onClick={() => connect.mutate({ connector })}
                    type="button"
                  >
                    {connect.isPending
                      ? "Waiting for wallet…"
                      : `Connect ${connector.name}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {connection.isConnected && connection.address && (
          <>
            <dl className={styles.walletDetails}>
              <div>
                <dt>Selected account</dt>
                <dd>
                  <a
                    href={`${coston2.blockExplorers.default.url}/address/${connection.address}`}
                    rel="noreferrer"
                    target="_blank"
                    title={connection.address}
                  >
                    {shortenAddress(connection.address)} ↗
                  </a>
                </dd>
              </div>
              <div>
                <dt>Wallet connector</dt>
                <dd>{connection.connector?.name ?? "Unknown connector"}</dd>
              </div>
              <div>
                <dt>Active wallet network</dt>
                <dd
                  className={
                    networkState === "coston2"
                      ? styles.validValue
                      : styles.invalidValue
                  }
                >
                  {networkState === "coston2"
                    ? "Coston2 · chainId 114"
                    : `Wrong network · chainId ${connection.chainId}`}
                </dd>
              </div>
              <div>
                <dt>Coston2 C2FLR balance</dt>
                <dd>
                  {nativeBalance.isPending
                    ? "Reading…"
                    : nativeBalance.data
                      ? `${formatUnits(
                          nativeBalance.data.value,
                          nativeBalance.data.decimals,
                        )} ${nativeBalance.data.symbol}`
                      : "Unavailable"}
                </dd>
              </div>
              <div>
                <dt>Coston2 {rewardTokenSymbol} balance</dt>
                <dd>
                  {tokenBalance.isPending
                    ? "Reading…"
                    : tokenBalance.data !== undefined
                      ? `${formatUnits(tokenBalance.data, rewardTokenDecimals)} ${rewardTokenSymbol}`
                      : "Unavailable"}
                </dd>
              </div>
              <div>
                <dt>Signing capability</dt>
                <dd>Available only after explicit transaction review</dd>
              </div>
            </dl>

            <div className={styles.walletActions}>
              {networkState === "wrong-network" && (
                <button
                  disabled={switchChain.isPending}
                  onClick={() => switchChain.mutate({ chainId: coston2.id })}
                  type="button"
                >
                  {switchChain.isPending ? "Switching…" : "Switch to Coston2"}
                </button>
              )}
              <button
                className={styles.secondaryButton}
                disabled={disconnect.isPending}
                onClick={() => disconnect.mutate()}
                type="button"
              >
                Disconnect from this site
              </button>
            </div>
          </>
        )}

        {actionError && (
          <div className={styles.errorBanner} role="alert">
            <strong>Wallet action did not complete.</strong>
            <span>{actionError}</span>
          </div>
        )}
      </div>

      <div className={styles.boundaryGrid} aria-label="Wallet safety boundary">
        <article>
          <span>01</span>
          <strong>Address permission only</strong>
          <p>The page never receives a private key, recovery phrase, or vault password.</p>
        </article>
        <article>
          <span>02</span>
          <strong>Public reads stay separate</strong>
          <p>Coston2 balances are queried through the configured public RPC transport.</p>
        </article>
        <article>
          <span>03</span>
          <strong>Writes stay simulation-gated</strong>
          <p>Every enabled transaction must pass public-RPC simulation first.</p>
        </article>
      </div>
    </section>
  );
}
