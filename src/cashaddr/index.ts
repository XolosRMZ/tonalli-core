export type EcashNetwork = "mainnet" | "testnet" | "unknown";

const MAINNET_PREFIX = "ecash";
const TESTNET_PREFIX = "ectest";
const CASHADDR_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const CASHADDR_GENERATORS = [
  0x98f2bc8e61n,
  0x79b76d99e2n,
  0xf33e5fb3c4n,
  0xae2eabe2a8n,
  0x1e4f43e470n
] as const;

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
    const separatorIndex = normalized.indexOf(":");

    if (
      separatorIndex <= 0 ||
      separatorIndex !== normalized.lastIndexOf(":") ||
      !normalized.startsWith(`${MAINNET_PREFIX}:`)
    ) {
      return false;
    }

    const prefix = normalized.slice(0, separatorIndex);
    const payload = normalized.slice(separatorIndex + 1);

    if (!prefix || !payload || prefix !== MAINNET_PREFIX) {
      return false;
    }

    const payloadValues = payloadToUint5Array(payload);

    if (!payloadValues) {
      return false;
    }

    return polymod([...prefixToUint5Array(prefix), ...payloadValues]) === 1n;
  } catch {
    return false;
  }
}

function hasMixedCase(value: string): boolean {
  return value !== value.toLowerCase() && value !== value.toUpperCase();
}

function prefixToUint5Array(prefix: string): number[] {
  const values: number[] = [];

  for (const char of prefix) {
    values.push(char.charCodeAt(0) & 31);
  }

  values.push(0);

  return values;
}

function payloadToUint5Array(payload: string): number[] | null {
  if (payload.length < 8) {
    return null;
  }

  const values: number[] = [];

  for (const char of payload) {
    const index = CASHADDR_CHARSET.indexOf(char);

    if (index === -1) {
      return null;
    }

    values.push(index);
  }

  return values;
}

function polymod(values: number[]): bigint {
  let checksum = 1n;

  for (const value of values) {
    const topBits = checksum >> 35n;
    checksum = ((checksum & 0x07ffffffffn) << 5n) ^ BigInt(value);

    for (let index = 0; index < CASHADDR_GENERATORS.length; index += 1) {
      if (((topBits >> BigInt(index)) & 1n) === 1n) {
        checksum ^= CASHADDR_GENERATORS[index];
      }
    }
  }

  return checksum;
}
