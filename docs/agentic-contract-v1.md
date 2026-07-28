# Agentic contract v1

Version `1.0` is the canonical fail-closed contract for the first xolosArmy
Network agentic-economy cycle.

## Decision vocabulary

The CAE decision field accepts exactly:

- `approved`
- `rejected`
- `needs_human_approval`

There are no aliases. Values such as `approve`, `allow`, `deny`, missing
responses, unknown fields, incompatible versions, and malformed structures are
invalid. Consumers must stop rather than infer a decision.

## Stages

`AgenticWorkflowV1` keeps these facts separate:

1. `intent`
2. `policyDecision`
3. `walletApprovalRequest`
4. `humanApproval`
5. `signedTransaction`
6. `broadcast`
7. `confirmation`

The runtime validator rejects mismatched identifiers and out-of-order states.
A signed transaction requires an explicit approved human approval. A broadcast
requires a signed transaction. A confirmation requires a broadcasted
transaction with the same TXID.

`signedTransaction.status = "not_implemented"` is the only signer state used
while Tonalli Wallet transaction signing is unavailable. It contains no raw
transaction and no transaction identifier.

## Wallet and x402 boundary

`WalletApprovalRequestV1` is display-safe and can only be created from
`needs_human_approval`. It contains the public intent, CAE decision, and an
optional x402 invoice binding. Amount, destination, expiry, and identifiers
must agree.

The request has no field for a mnemonic, seed phrase, WIF, private key,
signature, signer object, or raw transaction. Every object is strict, so any
extra field fails validation. Tonalli Wallet remains the sole custodian of
keys and signing material.

The optional x402 context is transport metadata only. It does not authorize
signing or broadcasting.

## Compatibility

This is a new `0.2.0` API. Earlier unversioned shapes are not accepted.
Producers must emit `contractVersion: "1.0"` and the exact `kind` discriminator.
Consumers must use the runtime schemas or parse functions rather than TypeScript
casts.

Unknown future contract versions fail closed. Supporting a future version
requires an explicit parser and migration; it must never fall back to v1.

## Verification

```bash
npm ci
npm test
npm run typecheck
npm run build
```

The test suite covers all valid CAE decisions, unknown and absent decisions,
incompatible versions, malformed payloads, secret-shaped fields, x402 binding,
identifier consistency, and workflow ordering.
