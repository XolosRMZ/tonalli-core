import { z } from "zod";

export const AGENTIC_CONTRACT_VERSION = "1.0" as const;
export const CAE_DECISIONS = [
  "approved",
  "rejected",
  "needs_human_approval"
] as const;

const contractVersion = z.literal(AGENTIC_CONTRACT_VERSION);
const identifier = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/, "expected a stable identifier");
const epochSeconds = z.number().int().nonnegative().safe();
const positiveSats = z
  .string()
  .regex(/^[1-9][0-9]*$/, "amountSats must be a canonical positive integer");
const ecashAddress = z
  .string()
  .regex(/^ecash:[qp][a-z0-9]{41,}$/, "expected a lowercase prefixed eCash address");
const nonce = z
  .string()
  .min(22)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, "nonce must be unpadded base64url");
const hash = z
  .string()
  .regex(/^[0-9a-f]{64}$/, "expected 64 lowercase hexadecimal characters");
const rawTransaction = z
  .string()
  .min(2)
  .max(2_000_000)
  .regex(/^(?:[0-9a-f]{2})+$/, "raw transaction must be even-length lowercase hex");

export const agentIntentV1Schema = z
  .object({
    contractVersion,
    kind: z.literal("agent_intent"),
    intentId: identifier,
    nonce,
    agentId: identifier,
    agentRole: identifier,
    network: z.literal("xec:mainnet"),
    fromAddress: ecashAddress,
    toAddress: ecashAddress,
    amountSats: positiveSats,
    reason: z.string().min(1).max(500),
    memo: z.string().min(1).max(220).optional(),
    createdAt: epochSeconds,
    expiresAt: epochSeconds
  })
  .strict()
  .refine((value) => value.expiresAt > value.createdAt, {
    message: "expiresAt must exceed createdAt",
    path: ["expiresAt"]
  });

export const caePolicyDecisionV1Schema = z
  .object({
    contractVersion,
    kind: z.literal("cae_policy_decision"),
    decisionId: identifier,
    intentId: identifier,
    decision: z.enum(CAE_DECISIONS),
    reasonCode: identifier,
    reason: z.string().min(1).max(500),
    policyTraceId: identifier,
    policyVersion: z.string().min(1).max(64),
    evaluatedAt: epochSeconds,
    expiresAt: epochSeconds
  })
  .strict()
  .refine((value) => value.expiresAt > value.evaluatedAt, {
    message: "expiresAt must exceed evaluatedAt",
    path: ["expiresAt"]
  });

export const x402ApprovalContextV1Schema = z
  .object({
    x402Version: z.literal(1),
    scheme: z.literal("exact"),
    network: z.literal("xec:mainnet"),
    invoiceHash: hash,
    resourceHash: hash,
    amountSats: positiveSats,
    payTo: ecashAddress,
    nonce,
    issuedAt: epochSeconds,
    expiresAt: epochSeconds
  })
  .strict()
  .refine((value) => value.expiresAt > value.issuedAt, {
    message: "expiresAt must exceed issuedAt",
    path: ["expiresAt"]
  });

export const walletApprovalRequestV1Schema = z
  .object({
    contractVersion,
    kind: z.literal("wallet_approval_request"),
    purpose: z.literal("xec_payment"),
    requestId: identifier,
    intent: agentIntentV1Schema,
    policyDecision: caePolicyDecisionV1Schema,
    x402: x402ApprovalContextV1Schema.optional(),
    requestedAt: epochSeconds,
    expiresAt: epochSeconds
  })
  .strict()
  .superRefine((value, context) => {
    const issue = (path: PropertyKey[], message: string) => {
      context.addIssue({ code: "custom", path, message });
    };

    if (value.policyDecision.decision !== "needs_human_approval") {
      issue(
        ["policyDecision", "decision"],
        "wallet approval requests require needs_human_approval"
      );
    }
    if (value.policyDecision.intentId !== value.intent.intentId) {
      issue(["policyDecision", "intentId"], "policy decision does not match intent");
    }
    if (value.requestedAt < value.intent.createdAt) {
      issue(["requestedAt"], "requestedAt cannot precede intent creation");
    }
    if (value.expiresAt <= value.requestedAt) {
      issue(["expiresAt"], "expiresAt must exceed requestedAt");
    }
    if (
      value.expiresAt > value.intent.expiresAt ||
      value.expiresAt > value.policyDecision.expiresAt
    ) {
      issue(["expiresAt"], "wallet request cannot outlive intent or policy decision");
    }
    if (value.x402) {
      if (value.x402.amountSats !== value.intent.amountSats) {
        issue(["x402", "amountSats"], "x402 amount does not match intent");
      }
      if (value.x402.payTo !== value.intent.toAddress) {
        issue(["x402", "payTo"], "x402 destination does not match intent");
      }
      if (value.x402.expiresAt < value.expiresAt) {
        issue(["x402", "expiresAt"], "wallet request outlives x402 invoice");
      }
    }
  });

export const humanApprovalV1Schema = z
  .object({
    contractVersion,
    kind: z.literal("human_approval"),
    approvalId: identifier,
    requestId: identifier,
    intentId: identifier,
    decisionId: identifier,
    status: z.enum(["approved", "rejected", "expired"]),
    approver: identifier.optional(),
    reason: z.string().min(1).max(500).optional(),
    recordedAt: epochSeconds
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === "approved" && !value.approver) {
      context.addIssue({
        code: "custom",
        path: ["approver"],
        message: "approved human decisions require an approver"
      });
    }
  });

const signingNotImplementedV1Schema = z
  .object({
    contractVersion,
    kind: z.literal("signed_transaction"),
    status: z.literal("not_implemented"),
    intentId: identifier,
    reason: z.literal("wallet_signing_not_implemented")
  })
  .strict();

const signedTransactionArtifactV1Schema = z
  .object({
    contractVersion,
    kind: z.literal("signed_transaction"),
    status: z.literal("signed"),
    intentId: identifier,
    approvalId: identifier,
    transactionHash: hash,
    rawTransactionHex: rawTransaction,
    signedAt: epochSeconds
  })
  .strict();

export const signedTransactionV1Schema = z.discriminatedUnion("status", [
  signingNotImplementedV1Schema,
  signedTransactionArtifactV1Schema
]);

const broadcastNotAttemptedV1Schema = z
  .object({
    contractVersion,
    kind: z.literal("broadcast"),
    status: z.literal("not_attempted"),
    intentId: identifier
  })
  .strict();

const broadcastFailedV1Schema = z
  .object({
    contractVersion,
    kind: z.literal("broadcast"),
    status: z.literal("failed"),
    intentId: identifier,
    transactionHash: hash,
    errorCode: identifier,
    attemptedAt: epochSeconds
  })
  .strict();

const broadcastedV1Schema = z
  .object({
    contractVersion,
    kind: z.literal("broadcast"),
    status: z.literal("broadcasted"),
    intentId: identifier,
    transactionHash: hash,
    txid: hash,
    broadcastAt: epochSeconds
  })
  .strict();

export const broadcastV1Schema = z.discriminatedUnion("status", [
  broadcastNotAttemptedV1Schema,
  broadcastFailedV1Schema,
  broadcastedV1Schema
]);

const confirmationNotAttemptedV1Schema = z
  .object({
    contractVersion,
    kind: z.literal("confirmation"),
    status: z.literal("not_attempted"),
    intentId: identifier
  })
  .strict();

const confirmationPendingV1Schema = z
  .object({
    contractVersion,
    kind: z.literal("confirmation"),
    status: z.literal("pending"),
    intentId: identifier,
    txid: hash,
    observedAt: epochSeconds
  })
  .strict();

const confirmedV1Schema = z
  .object({
    contractVersion,
    kind: z.literal("confirmation"),
    status: z.literal("confirmed"),
    intentId: identifier,
    txid: hash,
    blockHeight: z.number().int().nonnegative().safe(),
    blockHash: hash,
    confirmedAt: epochSeconds
  })
  .strict();

export const confirmationV1Schema = z.discriminatedUnion("status", [
  confirmationNotAttemptedV1Schema,
  confirmationPendingV1Schema,
  confirmedV1Schema
]);

export const agenticWorkflowV1Schema = z
  .object({
    contractVersion,
    kind: z.literal("agentic_workflow"),
    intent: agentIntentV1Schema,
    policyDecision: caePolicyDecisionV1Schema.optional(),
    walletApprovalRequest: walletApprovalRequestV1Schema.optional(),
    humanApproval: humanApprovalV1Schema.optional(),
    signedTransaction: signedTransactionV1Schema.optional(),
    broadcast: broadcastV1Schema.optional(),
    confirmation: confirmationV1Schema.optional()
  })
  .strict()
  .superRefine((value, context) => {
    const issue = (path: PropertyKey[], message: string) => {
      context.addIssue({ code: "custom", path, message });
    };
    const intentId = value.intent.intentId;
    const laterStages = [
      ["policyDecision", value.policyDecision],
      ["walletApprovalRequest", value.walletApprovalRequest],
      ["humanApproval", value.humanApproval],
      ["signedTransaction", value.signedTransaction],
      ["broadcast", value.broadcast],
      ["confirmation", value.confirmation]
    ] as const;

    for (const [path, stage] of laterStages) {
      if (stage && "intentId" in stage && stage.intentId !== intentId) {
        issue([path, "intentId"], `${path} does not match intent`);
      }
    }

    if (value.policyDecision?.decision === "rejected") {
      if (value.walletApprovalRequest || value.humanApproval || value.signedTransaction) {
        issue(["policyDecision", "decision"], "rejected policy decisions stop the workflow");
      }
      if (value.broadcast && value.broadcast.status !== "not_attempted") {
        issue(["broadcast", "status"], "rejected policy decisions cannot broadcast");
      }
      if (value.confirmation && value.confirmation.status !== "not_attempted") {
        issue(["confirmation", "status"], "rejected policy decisions cannot confirm");
      }
    }

    if (value.walletApprovalRequest) {
      if (!value.policyDecision) {
        issue(["walletApprovalRequest"], "wallet request requires a policy decision");
      }
      if (value.walletApprovalRequest.intent.intentId !== intentId) {
        issue(
          ["walletApprovalRequest", "intent", "intentId"],
          "wallet request does not match workflow intent"
        );
      }
      if (
        value.policyDecision &&
        value.walletApprovalRequest.policyDecision.decisionId !==
          value.policyDecision.decisionId
      ) {
        issue(
          ["walletApprovalRequest", "policyDecision", "decisionId"],
          "wallet request does not match workflow policy decision"
        );
      }
    }

    if (value.humanApproval) {
      if (!value.walletApprovalRequest) {
        issue(["humanApproval"], "human approval requires a wallet request");
      } else if (value.humanApproval.requestId !== value.walletApprovalRequest.requestId) {
        issue(["humanApproval", "requestId"], "human approval does not match wallet request");
      }
      if (
        !value.policyDecision ||
        value.humanApproval.decisionId !== value.policyDecision.decisionId
      ) {
        issue(["humanApproval", "decisionId"], "human approval does not match policy decision");
      }
      if (
        value.humanApproval.recordedAt >= value.intent.expiresAt ||
        (value.policyDecision &&
          value.humanApproval.recordedAt >= value.policyDecision.expiresAt)
      ) {
        issue(["humanApproval", "recordedAt"], "human approval was recorded after expiry");
      }
    }

    if (value.signedTransaction?.status === "signed") {
      if (value.humanApproval?.status !== "approved") {
        issue(
          ["signedTransaction", "status"],
          "signed transaction requires explicit approved human approval"
        );
      } else if (value.signedTransaction.approvalId !== value.humanApproval.approvalId) {
        issue(
          ["signedTransaction", "approvalId"],
          "signed transaction does not match human approval"
        );
      }
    }

    if (value.broadcast && value.broadcast.status !== "not_attempted") {
      if (value.signedTransaction?.status !== "signed") {
        issue(["broadcast", "status"], "broadcast requires a signed transaction");
      } else if (
        value.broadcast.transactionHash !== value.signedTransaction.transactionHash
      ) {
        issue(["broadcast", "transactionHash"], "broadcast does not match signed transaction");
      }
    }

    if (value.broadcast?.status === "broadcasted" && value.broadcast.txid !== value.broadcast.transactionHash) {
      issue(["broadcast", "txid"], "broadcast txid must match the signed transaction hash");
    }

    if (value.confirmation && value.confirmation.status !== "not_attempted") {
      if (value.broadcast?.status !== "broadcasted") {
        issue(["confirmation", "status"], "confirmation requires a broadcasted transaction");
      } else if (value.confirmation.txid !== value.broadcast.txid) {
        issue(["confirmation", "txid"], "confirmation does not match broadcast");
      }
    }
  });

export type AgentIntentV1 = z.infer<typeof agentIntentV1Schema>;
export type CaePolicyDecisionV1 = z.infer<typeof caePolicyDecisionV1Schema>;
export type X402ApprovalContextV1 = z.infer<typeof x402ApprovalContextV1Schema>;
export type WalletApprovalRequestV1 = z.infer<typeof walletApprovalRequestV1Schema>;
export type HumanApprovalV1 = z.infer<typeof humanApprovalV1Schema>;
export type SignedTransactionV1 = z.infer<typeof signedTransactionV1Schema>;
export type BroadcastV1 = z.infer<typeof broadcastV1Schema>;
export type ConfirmationV1 = z.infer<typeof confirmationV1Schema>;
export type AgenticWorkflowV1 = z.infer<typeof agenticWorkflowV1Schema>;

export const parseAgentIntentV1 = (input: unknown): AgentIntentV1 =>
  agentIntentV1Schema.parse(input);

export const parseCaePolicyDecisionV1 = (input: unknown): CaePolicyDecisionV1 =>
  caePolicyDecisionV1Schema.parse(input);

export const parseWalletApprovalRequestV1 = (
  input: unknown
): WalletApprovalRequestV1 => walletApprovalRequestV1Schema.parse(input);

export const parseAgenticWorkflowV1 = (input: unknown): AgenticWorkflowV1 =>
  agenticWorkflowV1Schema.parse(input);
