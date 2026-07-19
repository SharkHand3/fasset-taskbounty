const supportedHttpsHosts = new Set([
  "arweave.net",
  "ipfs.io",
  "raw.githubusercontent.com",
]);

function safePath(value: string): string {
  const normalized = value.replace(/^\/+/, "");
  if (!normalized || normalized.split("/").some((segment) => segment === "..")) {
    throw new Error("Artifact URI contains an invalid path.");
  }
  return normalized;
}

export function resolveArtifactURI(uri: string): string {
  const normalized = uri.trim();
  if (normalized.startsWith("ipfs://")) {
    const path = safePath(normalized.slice("ipfs://".length).replace(/^ipfs\//, ""));
    return `https://ipfs.io/ipfs/${path}`;
  }
  if (normalized.startsWith("ar://")) {
    return `https://arweave.net/${safePath(normalized.slice("ar://".length))}`;
  }

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new Error("Artifact URI must use ipfs://, ar://, or a supported HTTPS host.");
  }
  if (url.protocol !== "https:" || !supportedHttpsHosts.has(url.hostname)) {
    throw new Error(
      "This beta supports IPFS, Arweave, and version-pinned raw.githubusercontent.com artifacts.",
    );
  }
  return url.toString();
}

export function tryResolveArtifactURI(uri: string): string | null {
  try {
    return resolveArtifactURI(uri);
  } catch {
    return null;
  }
}
