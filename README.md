
# @xolosarmy/tonalli-core

Sovereign eCash infrastructure primitives for xolosArmy Network.

## Thesis

XEC is the money.  
RMZ is the key.  
Culture is the network.

## Purpose

`tonalli-core` is the first technical brick of the xolosArmy Sovereign Infrastructure Stack.

The goal is not to fork eCash.  
The goal is to build independent, open, verifiable infrastructure around eCash.

## Features

### 1. CashAddr Safety
- Validate `ecash:` address prefix
- Reject ambiguous addresses
- Detect mixed-case CashAddr errors
- Normalize addresses

### 2. RMZ Access Key (Sovereign Adapter Pattern)
- Detect RMZ token balances seamlessly
- `hasRMZAccess(address, adapter)` primitive for community gating
- Infrastructure-agnostic (bring your own Chronik/Indexer adapter)

## Usage

```ts
import {
  isValidEcashAddress,
  hasRMZAccess,
  type BlockchainAdapter
} from "@xolosarmy/tonalli-core";

// 1. Validate Address
const address = "ecash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq9yf6pz";
if (!isValidEcashAddress(address)) throw new Error("Invalid address");

// 2. Bring your own adapter (e.g., Chronik)
const myAdapter: BlockchainAdapter = {
  async getTokenBalance(address, tokenId) {
    // Fetch from your preferred indexer
    return { tokenId, amount: "100" }; 
  }
};

// 3. Verify Cultural Access
const hasAccess = await hasRMZAccess(address, myAdapter);
console.log(hasAccess ? "Welcome to xolosArmy" : "Access Denied");

Long-term vision

The node is the final tree.
The sovereign stack is the forest.

Sovereignty is not isolation.
Sovereignty is the ability to verify.
