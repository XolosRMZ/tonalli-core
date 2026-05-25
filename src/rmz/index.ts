import { requireEcashPrefix } from "../cashaddr/index.js";
import type { BlockchainAdapter } from "../adapters/index.js";

export const RMZ_TOKEN_ID =
  "c923bd0f09c630c5e9980cf518c8d34b6353802a3cb7c3f34fa7cc85c9305908";

export type RMZAccessStatus = "holder" | "non-holder" | "error" | "unknown";

export async function getRMZBalance(
  address: string,
  adapter: BlockchainAdapter
): Promise<bigint> {
  const cleanAddress = requireEcashPrefix(address);

  const balance = await adapter.getTokenBalance(cleanAddress, RMZ_TOKEN_ID);

  if (!balance) {
    return 0n;
  }

  return BigInt(balance.amount);
}

export async function hasRMZAccess(
  address: string,
  adapter: BlockchainAdapter
): Promise<boolean> {
  try {
    const balance = await getRMZBalance(address, adapter);
    return balance > 0n;
  } catch {
    return false;
  }
}

export async function getRMZAccessStatus(
  address: string,
  adapter: BlockchainAdapter
): Promise<RMZAccessStatus> {
  try {
    const balance = await getRMZBalance(address, adapter);
    return balance > 0n ? "holder" : "non-holder";
  } catch {
    return "error";
  }
}
