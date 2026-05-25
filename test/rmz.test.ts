import { describe, expect, it } from "vitest";
import {
  RMZ_TOKEN_ID,
  getRMZAccessStatus,
  getRMZBalance,
  hasRMZAccess
} from "../src/rmz/index.js";
import type { BlockchainAdapter, TokenBalance } from "../src/adapters/index.js";

class MockAdapter implements BlockchainAdapter {
  async getTokenBalance(
    address: string,
    tokenId: string
  ): Promise<TokenBalance | null> {
    if (tokenId !== RMZ_TOKEN_ID) {
      return null;
    }

    if (address === "ecash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq9yf6pz") {
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
    const balance = await getRMZBalance(
      "ecash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq9yf6pz",
      adapter
    );

    expect(balance).toBe(100n);
  });

  it("detects an RMZ holder", async () => {
    const result = await hasRMZAccess(
      "ecash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq9yf6pz",
      adapter
    );

    expect(result).toBe(true);
  });

  it("detects a non-holder", async () => {
    const result = await hasRMZAccess(
      "ecash:qzy0000000000000000000000000000000qzy000",
      adapter
    );

    expect(result).toBe(false);
  });

  it("returns correct holder status", async () => {
    const status = await getRMZAccessStatus(
      "ecash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq9yf6pz",
      adapter
    );

    expect(status).toBe("holder");
  });

  it("returns non-holder status", async () => {
    const status = await getRMZAccessStatus(
      "ecash:qzy0000000000000000000000000000000qzy000",
      adapter
    );

    expect(status).toBe("non-holder");
  });

  it("rejects invalid or ambiguous addresses securely", async () => {
    const result = await hasRMZAccess(
      "bitcoincash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq9yf6pz",
      adapter
    );

    expect(result).toBe(false);

    const status = await getRMZAccessStatus(
      "bitcoincash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq9yf6pz",
      adapter
    );

    expect(status).toBe("error");
  });
});
