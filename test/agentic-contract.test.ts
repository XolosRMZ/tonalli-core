import { describe, expect, it } from "vitest";
import {
  AGENTIC_CONTRACT_VERSION,
  agenticWorkflowV1Schema,
  parseCaePolicyDecisionV1,
  parseWalletApprovalRequestV1,
  walletApprovalRequestV1Schema
} from "../src/agentic/index.js";

const NOW = 1_800_000_000;
const FROM = "ecash:qzh3lwn68jtn94e8pf059rslfssyrjjyaykjwr0z2a";
const TO = "ecash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a";
const HASH = "a".repeat(64);
const TX_HASH = "b".repeat(64);

const intent = {
  contractVersion: AGENTIC_CONTRACT_VERSION,
  kind: "agent_intent",
  intentId: "intent-001",
  nonce: "MDEyMzQ1Njc4OWFiY2RlZg",
  agentId: "treasury-agent",
  agentRole: "treasury",
  network: "xec:mainnet",
  fromAddress: FROM,
  toAddress: TO,
  amountSats: "1000",
  reason: "Controlled security test",
  createdAt: NOW,
  expiresAt: NOW + 300
} as const;

const decision = (value: "approved" | "rejected" | "needs_human_approval") => ({
  contractVersion: AGENTIC_CONTRACT_VERSION,
  kind: "cae_policy_decision",
  decisionId: `decision-${value}`,
  intentId: intent.intentId,
  decision: value,
  reasonCode: `test-${value}`,
  reason: `Test decision: ${value}`,
  policyTraceId: `trace-${value}`,
  policyVersion: "constitution-2026-07",
  evaluatedAt: NOW + 1,
  expiresAt: NOW + 250
} as const);

const walletRequest = {
  contractVersion: AGENTIC_CONTRACT_VERSION,
  kind: "wallet_approval_request",
  purpose: "xec_payment",
  requestId: "request-001",
  intent,
  policyDecision: decision("needs_human_approval"),
  x402: {
    x402Version: 1,
    scheme: "exact",
    network: "xec:mainnet",
    invoiceHash: HASH,
    resourceHash: HASH,
    amountSats: intent.amountSats,
    payTo: intent.toAddress,
    nonce: "YWJjZGVmZ2hpamtsbW5vcA",
    issuedAt: NOW,
    expiresAt: NOW + 220
  },
  requestedAt: NOW + 2,
  expiresAt: NOW + 200
} as const;

describe("CAE policy decision v1", () => {
  it.each(["approved", "rejected", "needs_human_approval"] as const)(
    "accepts the explicit %s decision",
    (value) => {
      expect(parseCaePolicyDecisionV1(decision(value)).decision).toBe(value);
    }
  );

  it("rejects an unknown decision", () => {
    expect(() =>
      parseCaePolicyDecisionV1({ ...decision("approved"), decision: "allow" })
    ).toThrow();
  });

  it("rejects an absent response", () => {
    expect(() => parseCaePolicyDecisionV1(undefined)).toThrow();
  });

  it("rejects an incompatible version", () => {
    expect(() =>
      parseCaePolicyDecisionV1({
        ...decision("approved"),
        contractVersion: "2.0"
      })
    ).toThrow();
  });

  it("rejects malformed and unknown fields", () => {
    expect(() =>
      parseCaePolicyDecisionV1({
        ...decision("approved"),
        policyTraceId: "",
        fallback: "approved"
      })
    ).toThrow();
  });
});

describe("Wallet and x402 handoff v1", () => {
  it("accepts a display-safe human approval request", () => {
    expect(parseWalletApprovalRequestV1(walletRequest)).toEqual(walletRequest);
  });

  it("rejects rejected or autonomously approved policy decisions", () => {
    for (const value of ["rejected", "approved"] as const) {
      expect(
        walletApprovalRequestV1Schema.safeParse({
          ...walletRequest,
          policyDecision: decision(value)
        }).success
      ).toBe(false);
    }
  });

  it("rejects x402 amount, destination, and expiry mismatches", () => {
    expect(
      walletApprovalRequestV1Schema.safeParse({
        ...walletRequest,
        x402: { ...walletRequest.x402, amountSats: "1001" }
      }).success
    ).toBe(false);
    expect(
      walletApprovalRequestV1Schema.safeParse({
        ...walletRequest,
        x402: { ...walletRequest.x402, payTo: FROM }
      }).success
    ).toBe(false);
    expect(
      walletApprovalRequestV1Schema.safeParse({
        ...walletRequest,
        x402: { ...walletRequest.x402, expiresAt: NOW + 100 }
      }).success
    ).toBe(false);
  });

  it.each([
    ["seedPhrase", "abandon ".repeat(12).trim()],
    ["privateKey", "1".repeat(64)],
    ["wif", "L1test"],
    ["signature", "fixture-signature"],
    ["signer", { type: "session" }]
  ])("rejects forbidden extra field %s", (field, value) => {
    expect(
      walletApprovalRequestV1Schema.safeParse({
        ...walletRequest,
        [field]: value
      }).success
    ).toBe(false);
  });

  it("rejects secret-shaped fields nested in the intent", () => {
    expect(
      walletApprovalRequestV1Schema.safeParse({
        ...walletRequest,
        intent: { ...intent, privateKey: "1".repeat(64) }
      }).success
    ).toBe(false);
  });
});

describe("Agentic workflow v1 sequencing", () => {
  const humanApproval = {
    contractVersion: AGENTIC_CONTRACT_VERSION,
    kind: "human_approval",
    approvalId: "approval-001",
    requestId: walletRequest.requestId,
    intentId: intent.intentId,
    decisionId: walletRequest.policyDecision.decisionId,
    status: "approved",
    approver: "human-operator",
    recordedAt: NOW + 3
  } as const;
  const signedTransaction = {
    contractVersion: AGENTIC_CONTRACT_VERSION,
    kind: "signed_transaction",
    status: "signed",
    intentId: intent.intentId,
    approvalId: humanApproval.approvalId,
    transactionHash: TX_HASH,
    rawTransactionHex: "00",
    signedAt: NOW + 4
  } as const;
  const broadcast = {
    contractVersion: AGENTIC_CONTRACT_VERSION,
    kind: "broadcast",
    status: "broadcasted",
    intentId: intent.intentId,
    transactionHash: TX_HASH,
    txid: TX_HASH,
    broadcastAt: NOW + 5
  } as const;

  const validWorkflow = {
    contractVersion: AGENTIC_CONTRACT_VERSION,
    kind: "agentic_workflow",
    intent,
    policyDecision: walletRequest.policyDecision,
    walletApprovalRequest: walletRequest,
    humanApproval,
    signedTransaction,
    broadcast,
    confirmation: {
      contractVersion: AGENTIC_CONTRACT_VERSION,
      kind: "confirmation",
      status: "confirmed",
      intentId: intent.intentId,
      txid: TX_HASH,
      blockHeight: 900_000,
      blockHash: "c".repeat(64),
      confirmedAt: NOW + 6
    }
  } as const;

  it("accepts a correctly ordered workflow", () => {
    expect(agenticWorkflowV1Schema.safeParse(validWorkflow).success).toBe(true);
  });

  it("rejects signing without approved human approval", () => {
    const { humanApproval: _humanApproval, ...withoutApproval } = validWorkflow;
    expect(agenticWorkflowV1Schema.safeParse(withoutApproval).success).toBe(false);
  });

  it("rejects broadcast before signing", () => {
    const { signedTransaction: _signedTransaction, ...withoutSigned } = validWorkflow;
    expect(agenticWorkflowV1Schema.safeParse(withoutSigned).success).toBe(false);
  });

  it("rejects confirmation before broadcast", () => {
    const { broadcast: _broadcast, ...withoutBroadcast } = validWorkflow;
    expect(agenticWorkflowV1Schema.safeParse(withoutBroadcast).success).toBe(false);
  });

  it("rejects mismatched stage identifiers", () => {
    expect(
      agenticWorkflowV1Schema.safeParse({
        ...validWorkflow,
        broadcast: { ...broadcast, intentId: "intent-other" }
      }).success
    ).toBe(false);
  });

  it("rejects a confirmation for another transaction", () => {
    expect(
      agenticWorkflowV1Schema.safeParse({
        ...validWorkflow,
        confirmation: {
          ...validWorkflow.confirmation,
          txid: "d".repeat(64)
        }
      }).success
    ).toBe(false);
  });
});
