import { keccak256, type Hex } from "viem";

export interface ArtifactVerification {
  actualHash: Hex;
  byteLength: number;
  expectedHash: Hex;
  matches: boolean;
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
  const response = await fetch(uri, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Artifact request failed with HTTP ${response.status}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  return verifyArtifactBytes(bytes, expectedHash);
}
