import { keccak256, type Hex } from "viem";

import { resolveArtifactURI } from "./artifact-uri";

export interface ArtifactVerification {
  actualHash: Hex;
  byteLength: number;
  expectedHash: Hex;
  matches: boolean;
}

export interface VerifiedJsonArtifact<T> extends ArtifactVerification {
  data: T;
}

export function verifyArtifactBytes(
  bytes: Uint8Array,
  expectedHash: Hex,
): ArtifactVerification {
  const actualHash = keccak256(bytes);

  return {
    actualHash,
    byteLength: bytes.byteLength,
    expectedHash,
    matches: actualHash.toLowerCase() === expectedHash.toLowerCase(),
  };
}

export async function fetchAndVerifyArtifact(
  uri: string,
  expectedHash: Hex,
): Promise<ArtifactVerification> {
  const response = await fetch(resolveArtifactURI(uri), { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Artifact request failed with HTTP ${response.status}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  return verifyArtifactBytes(bytes, expectedHash);
}

export async function fetchAndVerifyJsonArtifact<T>(
  uri: string,
  expectedHash: Hex,
  parse: (value: unknown) => T,
): Promise<VerifiedJsonArtifact<T>> {
  const response = await fetch(resolveArtifactURI(uri), { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Artifact request failed with HTTP ${response.status}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const verification = verifyArtifactBytes(bytes, expectedHash);
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);

  return {
    ...verification,
    data: parse(JSON.parse(text) as unknown),
  };
}
