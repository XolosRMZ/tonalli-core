import { describe, expect, it } from "vitest";
import {
  detectAddressNetwork,
  isValidEcashAddress,
  normalizeEcashAddress,
  requireEcashPrefix
} from "../src/index.js";

describe("CashAddr module", () => {
  it("detects mainnet ecash prefix", () => {
    expect(detectAddressNetwork("ecash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq9yf6pz")).toBe("mainnet");
  });

  it("detects testnet prefix", () => {
    expect(detectAddressNetwork("ectest:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqjn6g9n")).toBe("testnet");
  });

  it("rejects missing prefix", () => {
    expect(() => requireEcashPrefix("qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq9yf6pz")).toThrow();
  });

  it("requires ecash prefix for production", () => {
    expect(() => requireEcashPrefix("bitcoincash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq9yf6pz")).toThrow();
  });

  it("normalizes uppercase address", () => {
    expect(
      normalizeEcashAddress("ECASH:QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ9YF6PZ")
    ).toBe("ecash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq9yf6pz");
  });

  it("rejects mixed case", () => {
    expect(() =>
      normalizeEcashAddress("ecash:QQqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq9yf6pz")
    ).toThrow();
  });

  it("validates basic ecash address format", () => {
    expect(isValidEcashAddress("ecash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq9yf6pz")).toBe(true);
  });

  it("rejects non-ecash prefix", () => {
    expect(isValidEcashAddress("bitcoincash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq9yf6pz")).toBe(false);
  });
});
