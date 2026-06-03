import { describe, expect, it } from "vitest";
import {
  detectAddressNetwork,
  isValidEcashAddress,
  normalizeEcashAddress,
  requireEcashPrefix
} from "../src/index.js";

const VALID_MAINNET_ADDRESS = "ecash:qzh3lwn68jtn94e8pf059rslfssyrjjyaykjwr0z2a";
const VALID_OBSERVED_MAINNET_ADDRESS = "ecash:qq7qn90ev23ecastqmn8as00u8mcp4tzsspvt5dtlk";
const VALID_TONALLI_WALLET_ADDRESS = "ecash:qzdq0q65fwnt94rlcph5kllj0xcry6e0v58zrgp7a3";
const INVALID_OBSERVED_CHECKSUM_ADDRESS = "ecash:qr0ft6aq66hnj4xcfcqvskvh5su8cgjs53pqwqca";
const INVALID_CHECKSUM_ADDRESS = "ecash:qzh3lwn68jtn94e8pf059rslfssyrjjyaykjwr0z2p";
const INVALID_PAYLOAD_MUTATION = "ecash:qzh3lwn69jtn94e8pf059rslfssyrjjyaykjwr0z2a";
const VALID_TESTNET_ADDRESS = "ectest:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqjn6g9n";

describe("CashAddr module", () => {
  it("detects mainnet ecash prefix", () => {
    expect(detectAddressNetwork(VALID_MAINNET_ADDRESS)).toBe("mainnet");
  });

  it("detects testnet prefix", () => {
    expect(detectAddressNetwork(VALID_TESTNET_ADDRESS)).toBe("testnet");
  });

  it("rejects missing prefix", () => {
    expect(() => requireEcashPrefix("qzh3lwn68jtn94e8pf059rslfssyrjjyaykjwr0z2a")).toThrow();
  });

  it("requires ecash prefix for production", () => {
    expect(() => requireEcashPrefix("bitcoincash:qzh3lwn68jtn94e8pf059rslfssyrjjyaykjwr0z2a")).toThrow();
  });

  it("normalizes uppercase address", () => {
    expect(normalizeEcashAddress(VALID_MAINNET_ADDRESS.toUpperCase())).toBe(VALID_MAINNET_ADDRESS);
  });

  it("rejects mixed case", () => {
    expect(() =>
      normalizeEcashAddress("ecash:Qzh3lwn68jtn94e8pf059rslfssyrjjyaykjwr0z2a")
    ).toThrow();
  });

  it("validates a real ecash address with checksum", () => {
    expect(isValidEcashAddress(VALID_MAINNET_ADDRESS)).toBe(true);
  });

  it("validates observed Tonalli Wallet-compatible ecash addresses", () => {
    expect(isValidEcashAddress(VALID_OBSERVED_MAINNET_ADDRESS)).toBe(true);
    expect(isValidEcashAddress(VALID_TONALLI_WALLET_ADDRESS)).toBe(true);
  });

  it("rejects an observed ecash address with an invalid checksum", () => {
    expect(isValidEcashAddress(INVALID_OBSERVED_CHECKSUM_ADDRESS)).toBe(false);
  });

  it("rejects checksum mutations", () => {
    expect(isValidEcashAddress(INVALID_CHECKSUM_ADDRESS)).toBe(false);
  });

  it("rejects payload mutations that break checksum", () => {
    expect(isValidEcashAddress(INVALID_PAYLOAD_MUTATION)).toBe(false);
  });

  it("rejects non-ecash prefix", () => {
    expect(isValidEcashAddress("bitcoincash:qzh3lwn68jtn94e8pf059rslfssyrjjyaykjwr0z2a")).toBe(false);
  });
});
