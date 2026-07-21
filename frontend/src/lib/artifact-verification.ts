import { keccak256, type Hex } from "viem";

import { resolveArtifactURI } from "./artifact-uri";

export const MAX_ARTIFACT_BYTES = 1_048_576;
export const ARTIFACT_REQUEST_TIMEOUT_MS = 15_000;

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

export async function readArtifactResponseBytes(
  response: Response,
  maxBytes = MAX_ARTIFACT_BYTES,
): Promise<Uint8Array> {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const declaredLength = Number(contentLength);
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw new Error(`Artifact exceeds the ${maxBytes.toLocaleString()} byte limit.`);
    }
  }

  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) {
      throw new Error(`Artifact exceeds the ${maxBytes.toLocaleString()} byte limit.`);
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
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`Artifact exceeds the ${maxBytes.toLocaleString()} byte limit.`);
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

async function fetchArtifactBytes(uri: string): Promise<Uint8Array> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    ARTIFACT_REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(resolveArtifactURI(uri), {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Artifact request failed with HTTP ${response.status}`);
    }
    return await readArtifactResponseBytes(response);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchAndVerifyArtifact(
  uri: string,
  expectedHash: Hex,
): Promise<ArtifactVerification> {
  const bytes = await fetchArtifactBytes(uri);
  return verifyArtifactBytes(bytes, expectedHash);
}

export async function fetchAndVerifyJsonArtifact<T>(
  uri: string,
  expectedHash: Hex,
  parse: (value: unknown) => T,
): Promise<VerifiedJsonArtifact<T>> {
  const bytes = await fetchArtifactBytes(uri);
  const verification = verifyArtifactBytes(bytes, expectedHash);
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);

  return {
    ...verification,
    data: parse(JSON.parse(text) as unknown),
  };
}
