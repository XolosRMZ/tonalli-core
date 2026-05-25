export interface TokenBalance {
  tokenId: string;
  amount: string;
}

export interface BlockchainAdapter {
  getTokenBalance(address: string, tokenId: string): Promise<TokenBalance | null>;
}
