import { keccak256, type Hex } from "viem";

import type { ArtifactCheckResult } from "./types";

const githubPinnedPattern =
  /^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[0-9a-fA-F]{40}\/.+$/;
const ipfsPattern = /^ipfs:\/\/([^/?#]+)(\/[^?#]*)?$/;
const arweavePattern = /^ar:\/\/([a-zA-Z0-9_-]{43})$/;
const artifactHosts = new Set([
  "arweave.net",
  "ipfs.io",
  "raw.githubusercontent.com",
]);

function assertAllowedArtifactUrl(url: URL): void {
  if (url.protocol !== "https:" || !artifactHosts.has(url.hostname)) {
    throw new Error("Artifact redirect target is not allowlisted.");
  }
}

export function resolveArtifactUri(uri: string): string {
  const normalized = uri.trim();
  const ipfs = normalized.match(ipfsPattern);
  if (ipfs) {
    return `https://ipfs.io/ipfs/${ipfs[1]}${ipfs[2] ?? ""}`;
  }

  const arweave = normalized.match(arweavePattern);
  if (arweave) return `https://arweave.net/${arweave[1]}`;
  if (githubPinnedPattern.test(normalized)) return normalized;

  throw new Error(
    "Artifact URI must use IPFS, Arweave, or a commit-pinned GitHub Raw URL.",
  );
}

export function resolveSafeRedirect(currentUrl: string, location: string): string {
  const redirected = new URL(location, currentUrl);
  assertAllowedArtifactUrl(redirected);
  return redirected.toString();
}

export async function readBoundedBytes(
  response: Response,
  maximumBytes: number,
): Promise<Uint8Array> {
  const declared = response.headers.get("content-length");
  if (declared !== null && Number(declared) > maximumBytes) {
    throw new Error(`Artifact exceeds the ${maximumBytes} byte limit.`);
  }

  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maximumBytes) {
      throw new Error(`Artifact exceeds the ${maximumBytes} byte limit.`);
    }
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel();
      throw new Error(`Artifact exceeds the ${maximumBytes} byte limit.`);
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function parseSummary(bytes: Uint8Array): {
  description: string | null;
  title: string | null;
} {
  try {
    const value: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes),
    );
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { description: null, title: null };
    }
    const record = value as Record<string, unknown>;
    return {
      description:
        typeof record.description === "string"
          ? record.description.slice(0, 4_000)
          : null,
      title:
        typeof record.title === "string" ? record.title.slice(0, 120) : null,
    };
  } catch {
    return { description: null, title: null };
  }
}

export async function fetchAndVerifyArtifact(
  uri: string,
  expectedHash: Hex,
  options: { maximumBytes: number; timeoutMs: number },
): Promise<ArtifactCheckResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    let url = resolveArtifactUri(uri);
    let response: Response | null = null;
    for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
      response = await fetch(url, {
        headers: { accept: "application/json,text/plain;q=0.9,*/*;q=0.1" },
        redirect: "manual",
        signal: controller.signal,
      });
      if (response.status < 300 || response.status >= 400) break;
      const location = response.headers.get("location");
      if (!location || redirectCount === 3) {
        throw new Error("Artifact redirect chain is invalid or too long.");
      }
      url = resolveSafeRedirect(url, location);
    }
    if (!response) throw new Error("Artifact request did not return a response.");
    if (!response.ok) {
      throw new Error(`Artifact request failed with HTTP ${response.status}.`);
    }
    const bytes = await readBoundedBytes(response, options.maximumBytes);
    const actualHash = keccak256(bytes);
    const summary = parseSummary(bytes);
    return {
      actualHash,
      byteLength: bytes.byteLength,
      description: summary.description,
      title: summary.title,
      verified: actualHash.toLowerCase() === expectedHash.toLowerCase(),
    };
  } finally {
    clearTimeout(timeout);
  }
}
