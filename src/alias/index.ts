const DEFAULT_ALIAS_ENDPOINT = "https://alias.etokens.cash";
const ALIAS_SUFFIX = ".xec";
const ALIAS_NAME_PATTERN = /^[a-z0-9]{1,21}$/;

export type AliasResolution = {
  alias: string;
  address: string;
  txid?: string;
  blockheight?: number;
  registrationFeeSats?: number;
  processedBlockheight?: number;
  source: "alias-server";
};

type AliasServerResponse = {
  alias?: unknown;
  address?: unknown;
  txid?: unknown;
  blockheight?: unknown;
  registrationFeeSats?: unknown;
  processedBlockheight?: unknown;
};

export function normalizeAlias(alias: string): string {
  const normalized = alias.trim().toLowerCase();

  if (normalized.endsWith(ALIAS_SUFFIX)) {
    return normalized;
  }

  return `${normalized}${ALIAS_SUFFIX}`;
}

export function isValidAlias(alias: string): boolean {
  const normalized = normalizeAlias(alias);

  if (!normalized.endsWith(ALIAS_SUFFIX)) {
    return false;
  }

  const namePart = normalized.slice(0, -ALIAS_SUFFIX.length);

  return ALIAS_NAME_PATTERN.test(namePart);
}

export async function resolveAlias(
  aliasOrAliasXec: string,
  options: { endpoint?: string } = {}
): Promise<AliasResolution | null> {
  const alias = normalizeAlias(aliasOrAliasXec);

  if (!isValidAlias(alias)) {
    return null;
  }

  const namePart = alias.slice(0, -ALIAS_SUFFIX.length);
  const endpoint = (options.endpoint ?? DEFAULT_ALIAS_ENDPOINT).replace(/\/+$/, "");
  const response = await fetch(`${endpoint}/alias/${encodeURIComponent(namePart)}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Alias resolution failed with HTTP ${response.status}`);
  }

  const data = (await response.json()) as AliasServerResponse;

  if (typeof data.address !== "string" || data.address.length === 0) {
    return null;
  }

  const resolution: AliasResolution = {
    alias,
    address: data.address,
    source: "alias-server"
  };

  if (typeof data.txid === "string") {
    resolution.txid = data.txid;
  }

  if (typeof data.blockheight === "number") {
    resolution.blockheight = data.blockheight;
  }

  if (typeof data.registrationFeeSats === "number") {
    resolution.registrationFeeSats = data.registrationFeeSats;
  }

  if (typeof data.processedBlockheight === "number") {
    resolution.processedBlockheight = data.processedBlockheight;
  }

  return resolution;
}
