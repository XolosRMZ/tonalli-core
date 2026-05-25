export type EcashNetwork = "mainnet" | "testnet" | "unknown";

const MAINNET_PREFIX = "ecash";
const TESTNET_PREFIX = "ectest";

export function requireEcashPrefix(address: string): string {
  const clean = address.trim();

  if (!clean.includes(":")) {
    throw new Error("Missing CashAddr prefix. Expected address to start with ecash:");
  }

  const [prefix] = clean.split(":");

  if (prefix !== MAINNET_PREFIX) {
    throw new Error(`Invalid eCash prefix: ${prefix}. Expected ecash:`);
  }

  return clean;
}

export function normalizeEcashAddress(address: string): string {
  const clean = address.trim();

  if (hasMixedCase(clean)) {
    throw new Error("Invalid CashAddr: mixed uppercase and lowercase characters.");
  }

  return clean.toLowerCase();
}

export function detectAddressNetwork(address: string): EcashNetwork {
  const normalized = normalizeEcashAddress(address);

  if (normalized.startsWith(`${MAINNET_PREFIX}:`)) {
    return "mainnet";
  }

  if (normalized.startsWith(`${TESTNET_PREFIX}:`)) {
    return "testnet";
  }

  return "unknown";
}

export function isValidEcashAddress(address: string): boolean {
  try {
    const normalized = normalizeEcashAddress(address);

    if (!normalized.startsWith(`${MAINNET_PREFIX}:`)) {
      return false;
    }

    const [prefix, payload] = normalized.split(":");

    if (!prefix || !payload) {
      return false;
    }

    if (prefix !== MAINNET_PREFIX) {
      return false;
    }

    if (!isValidCashAddrPayload(payload)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function hasMixedCase(value: string): boolean {
  return value !== value.toLowerCase() && value !== value.toUpperCase();
}

function isValidCashAddrPayload(payload: string): boolean {
  const charset = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

  if (payload.length < 8) {
    return false;
  }

  for (const char of payload) {
    if (!charset.includes(char)) {
      return false;
    }
  }

  return true;
}
