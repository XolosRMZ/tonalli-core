import { ChronikClient } from "chronik-client";
import type { BlockchainAdapter, TokenBalance } from "../../src/index.js";

type ChronikUtxo = {
  token?: {
    tokenId?: string;
    amount?: string;
    atoms?: string;
  };
  slpToken?: {
    amount?: string;
  };
  slpMeta?: {
    tokenId?: string;
  };
};

type ChronikScriptUtxos = {
  utxos: ChronikUtxo[];
};

type ChronikUtxosResponse =
  | ChronikScriptUtxos[]
  | {
      scriptUtxos?: ChronikScriptUtxos[];
    };

export class ChronikAdapter implements BlockchainAdapter {
  private chronik: ChronikClient;

  constructor(chronikUrl: string = "https://chronik.e.cash") {
    this.chronik = new ChronikClient(chronikUrl);
  }

  async getTokenBalance(
    address: string,
    tokenId: string
  ): Promise<TokenBalance | null> {
    try {
      const result = (await this.chronik.address(address).utxos()) as ChronikUtxosResponse;

      const scriptUtxos = Array.isArray(result)
        ? result
        : result.scriptUtxos ?? [];

      let totalAmount = 0n;

      for (const scriptUtxo of scriptUtxos) {
        for (const utxo of scriptUtxo.utxos) {
          const foundTokenId = utxo.token?.tokenId ?? utxo.slpMeta?.tokenId;
          const foundAmount =
            utxo.token?.atoms ??
            utxo.token?.amount ??
            utxo.slpToken?.amount;

          if (foundTokenId === tokenId && foundAmount) {
            totalAmount += BigInt(foundAmount);
          }
        }
      }

      if (totalAmount === 0n) {
        return null;
      }

      return {
        tokenId,
        amount: totalAmount.toString()
      };
    } catch (error) {
      console.error(`[ChronikAdapter] Error fetching token balance for ${address}`);
      console.error(error);
      return null;
    }
  }
}
