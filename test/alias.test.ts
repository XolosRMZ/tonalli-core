import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isValidAlias,
  normalizeAlias,
  resolveAlias,
  type AliasResolution
} from "../src/alias/index.js";

describe("eCash Alias module", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes bare aliases", () => {
    expect(normalizeAlias("Xolos")).toBe("xolos.xec");
  });

  it("keeps normalized .xec aliases", () => {
    expect(normalizeAlias("xolos.xec")).toBe("xolos.xec");
  });

  it("validates alias names", () => {
    expect(isValidAlias("xolos")).toBe(true);
    expect(isValidAlias("xolos.xec")).toBe(true);
    expect(isValidAlias("xolos-ramirez")).toBe(false);
    expect(isValidAlias("")).toBe(false);
    expect(isValidAlias("abcdefghijklmnopqrstuv")).toBe(false);
  });

  it("returns null on 404", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(resolveAlias("missing")).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("https://alias.etokens.cash/alias/missing");
  });

  it("returns an AliasResolution on valid response", async () => {
    const response: Omit<AliasResolution, "alias" | "source"> = {
      address: "ecash:qzh3lwn68jtn94e8pf059rslfssyrjjyaykjwr0z2a",
      txid: "abc123",
      blockheight: 840000,
      registrationFeeSats: 555,
      processedBlockheight: 840001
    };
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(response), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(resolveAlias("Xolos.xec", { endpoint: "https://example.com/" })).resolves.toEqual({
      alias: "xolos.xec",
      ...response,
      source: "alias-server"
    });
    expect(fetchMock).toHaveBeenCalledWith("https://example.com/alias/xolos");
  });
});
