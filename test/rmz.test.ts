import { describe, expect, it } from "vitest";
import {
  RMZ_TOKEN_ID,
  getRMZAccessStatus,
  getRMZBalance,
  hasRMZAccess
} from "../src/rmz/index.js";
import type { BlockchainAdapter, TokenBalance } from "../src/adapters/index.js";

const HOLDER_ADDRESS = "ecash:qzh3lwn68jtn94e8pf059rslfssyrjjyaykjwr0z2a";
const NON_HOLDER_ADDRESS = "ecash:qzh3lwn68jtn94e8pf059rslfssyrjjyaykjwr0z2p";

class MockAdapter implements BlockchainAdapter {
  async getTokenBalance(
    address: string,
    tokenId: string
  ): Promise<TokenBalance | null> {
    if (tokenId !== RMZ_TOKEN_ID) {
      return null;
    }

    if (address === HOLDER_ADDRESS) {
      return {
        tokenId,
        amount: "100"
      };
    }

    return null;
  }
}

describe("RMZ Access Key Module", () => {
  const adapter = new MockAdapter();

  it("uses the real RMZ token ID", () => {
    expect(RMZ_TOKEN_ID).toBe(
      "c923bd0f09c630c5e9980cf518c8d34b6353802a3cb7c3f34fa7cc85c9305908"
    );
  });

  it("gets RMZ balance for a holder", async () => {
    const balance = await getRMZBalance(HOLDER_ADDRESS, adapter);

    expect(balance).toBe(100n);
  });

  it("detects an RMZ holder", async () => {
    const result = await hasRMZAccess(HOLDER_ADDRESS, adapter);

    expect(result).toBe(true);
  });

  it("detects a non-holder", async () => {
    const result = await hasRMZAccess(NON_HOLDER_ADDRESS, adapter);

    expect(result).toBe(false);
  });

  it("returns correct holder status", async () => {
    const status = await getRMZAccessStatus(HOLDER_ADDRESS, adapter);

    expect(status).toBe("holder");
  });

  it("returns non-holder status", async () => {
    const status = await getRMZAccessStatus(NON_HOLDER_ADDRESS, adapter);

    expect(status).toBe("non-holder");
  });

  it("rejects invalid or ambiguous addresses securely", async () => {
    const result = await hasRMZAccess(
      "bitcoincash:qzh3lwn68jtn94e8pf059rslfssyrjjyaykjwr0z2a",
      adapter
    );

    expect(result).toBe(false);

    const status = await getRMZAccessStatus(
      "bitcoincash:qzh3lwn68jtn94e8pf059rslfssyrjjyaykjwr0z2a",
      adapter
    );

    expect(status).toBe("error");
  });
});
