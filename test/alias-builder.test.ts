import { describe, expect, it } from "vitest";
import {
  RMZ_TREASURY_ADDRESS,
  buildAliasOpReturn,
  buildAliasRegistration,
  calculateAliasFeeSats,
  normalizeAliasName
} from "../src/alias/index.js";

const P2PKH_ADDRESS = "ecash:qzh3lwn68jtn94e8pf059rslfssyrjjyaykjwr0z2a";

describe("eCash Alias registration builder", () => {
  it("normalizes .xec aliases to the name part", () => {
    expect(normalizeAliasName("XolosArmy.xec")).toBe("xolosarmy");
  });

  it("keeps bare aliases as the name part", () => {
    expect(normalizeAliasName("xolosarmy")).toBe("xolosarmy");
  });

  it("builds an alias OP_RETURN with the eCash Alias prefix", () => {
    expect(buildAliasOpReturn("xolos", P2PKH_ADDRESS)).toMatch(/^6a042e78656300/);
  });

  it("builds the same OP_RETURN for bare and .xec aliases", () => {
    expect(buildAliasOpReturn("xolos.xec", P2PKH_ADDRESS)).toBe(
      buildAliasOpReturn("xolos", P2PKH_ADDRESS)
    );
  });

  it("includes only the alias name bytes in the OP_RETURN", () => {
    const opReturnHex = buildAliasOpReturn("xolos.xec", P2PKH_ADDRESS);

    expect(opReturnHex).toContain(Buffer.from("xolos", "utf8").toString("hex"));
    expect(opReturnHex).not.toContain(Buffer.from("xolos.xec", "utf8").toString("hex"));
  });

  it("throws for invalid aliases", () => {
    expect(() => buildAliasOpReturn("xolos-army", P2PKH_ADDRESS)).toThrow();
  });

  it("calculates one-byte alias fees", () => {
    expect(calculateAliasFeeSats(1)).toBe(50000000000);
  });

  it("calculates five-byte alias fees", () => {
    expect(calculateAliasFeeSats(5)).toBe(50000);
  });

  it("throws for aliases longer than 21 bytes", () => {
    expect(() => calculateAliasFeeSats(22)).toThrow();
  });

  it("builds alias registration metadata", () => {
    const registration = buildAliasRegistration("xolos.xec", P2PKH_ADDRESS);

    expect(registration.alias).toBe("xolos.xec");
    expect(registration.namePart).toBe("xolos");
    expect(registration.protocolFee.currency).toBe("XEC");
    expect(registration.serviceFee.tokenTicker).toBe("RMZ");
    expect(registration.serviceFee.amount).toBe(1600);
    expect(registration.serviceFee.receiverAddress).toBe(RMZ_TREASURY_ADDRESS);
  });
});
