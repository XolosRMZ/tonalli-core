import { decodeCashAddress } from "ecashaddrjs";

export const ALIAS_LOKAD_ID_HEX = "2e786563";
export const ALIAS_IFP_ADDRESS = "ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07";

export const RMZ_ALIAS_SERVICE_FEE = 1600;
export const RMZ_TREASURY_ADDRESS = "ecash:qq7qn90ev23ecastqmn8as00u8mcp4tzsspvt5dtlk";

const ALIAS_SUFFIX = ".xec";
const ALIAS_NAME_PATTERN = /^[a-z0-9]{1,21}$/;
const MIN_ALIAS_LENGTH_BYTES = 1;
const MAX_ALIAS_LENGTH_BYTES = 21;

export type AliasProtocolFee = {
  currency: "XEC";
  address: string;
  sats: number;
};

export type AliasServiceFee = {
  tokenTicker: "RMZ";
  amount: number;
  receiverAddress: string;
};

export type AliasRegistrationData = {
  alias: string;
  namePart: string;
  opReturnHex: string;
  protocolFee: AliasProtocolFee;
  serviceFee: AliasServiceFee;
};

export function normalizeAliasName(aliasOrAliasXec: string): string {
  const normalized = aliasOrAliasXec.trim().toLowerCase();

  if (normalized.endsWith(ALIAS_SUFFIX)) {
    return normalized.slice(0, -ALIAS_SUFFIX.length);
  }

  return normalized;
}

export function calculateAliasFeeSats(aliasLengthBytes: number): number {
  if (
    !Number.isInteger(aliasLengthBytes) ||
    aliasLengthBytes < MIN_ALIAS_LENGTH_BYTES ||
    aliasLengthBytes > MAX_ALIAS_LENGTH_BYTES
  ) {
    throw new Error("Alias length must be an integer from 1 to 21 bytes.");
  }

  // TODO: Verify against current Bitcoin ABC alias fee policy and blockheight schedule before enabling mainnet registration UX.
  switch (aliasLengthBytes) {
    case 1:
      return 50000000000;
    case 2:
      return 5000000000;
    case 3:
      return 500000000;
    case 4:
      return 50000000;
    default:
      return 50000;
  }
}

export function buildAliasOpReturn(aliasOrAliasXec: string, cashaddr: string): string {
  const { aliasHex, aliasLengthBytes } = getValidatedAliasParts(aliasOrAliasXec);
  const addressPayloadHex = decodeAddressPayloadHex(cashaddr);

  return `6a04${ALIAS_LOKAD_ID_HEX}00${toPushLengthHex(aliasLengthBytes)}${aliasHex}15${addressPayloadHex}`;
}

export function buildAliasRegistration(aliasOrAliasXec: string, cashaddr: string): AliasRegistrationData {
  const { aliasLengthBytes, namePart } = getValidatedAliasParts(aliasOrAliasXec);

  return {
    alias: `${namePart}${ALIAS_SUFFIX}`,
    namePart,
    opReturnHex: buildAliasOpReturn(namePart, cashaddr),
    protocolFee: {
      currency: "XEC",
      address: ALIAS_IFP_ADDRESS,
      sats: calculateAliasFeeSats(aliasLengthBytes)
    },
    serviceFee: {
      tokenTicker: "RMZ",
      amount: RMZ_ALIAS_SERVICE_FEE,
      receiverAddress: RMZ_TREASURY_ADDRESS
    }
  };
}

function getValidatedAliasParts(aliasOrAliasXec: string): {
  namePart: string;
  aliasHex: string;
  aliasLengthBytes: number;
} {
  const namePart = normalizeAliasName(aliasOrAliasXec);
  const aliasBytes = Buffer.from(namePart, "utf8");

  if (
    !ALIAS_NAME_PATTERN.test(namePart) ||
    aliasBytes.length < MIN_ALIAS_LENGTH_BYTES ||
    aliasBytes.length > MAX_ALIAS_LENGTH_BYTES
  ) {
    throw new Error("Invalid alias. Expected 1 to 21 lowercase alphanumeric bytes.");
  }

  return {
    namePart,
    aliasHex: aliasBytes.toString("hex"),
    aliasLengthBytes: aliasBytes.length
  };
}

function decodeAddressPayloadHex(cashaddr: string): string {
  try {
    const decoded = decodeCashAddress(cashaddr.trim());
    if (decoded.prefix !== "ecash") {
      throw new Error("Unsupported address prefix: " + decoded.prefix + ".");
    }

    const typeByte = getAddressTypeByte(decoded.type);

    if (decoded.hash.length !== 40) {
      throw new Error("Expected a 20 byte hash.");
    }

    return `${typeByte}${decoded.hash}`;
  } catch (error) {
    throw new Error(`Invalid or unsupported eCash address: ${getErrorMessage(error)}`);
  }
}

function getAddressTypeByte(type: string): string {
  if (type === "p2pkh") {
    return "00";
  }

  if (type === "p2sh") {
    return "08";
  }

  throw new Error(`Unsupported address type: ${type}.`);
}

function toPushLengthHex(byteLength: number): string {
  return byteLength.toString(16).padStart(2, "0");
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
