import {
  getRMZAccessStatus,
  isValidEcashAddress
} from "../../src/index.js";
import { ChronikAdapter } from "./chronikAdapter.js";

async function runDemo() {
  console.log("=== xolosArmy: RMZ Access Key Demo (Mainnet) ===\n");

  const adapter = new ChronikAdapter();

  const testAddresses = [
    "ecash:qzh3lwn68jtn94e8pf059rslfssyrjjyaykjwr0z2a",
    "bitcoincash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq9yf6pz"
  ];

  for (const address of testAddresses) {
    console.log(`Verifying address: ${address}`);

    if (!isValidEcashAddress(address)) {
      console.log("❌ Status: Invalid or ambiguous address format.\n");
      continue;
    }

    console.log("⏳ Querying Chronik Mainnet...");

    const status = await getRMZAccessStatus(address, adapter);

    if (status === "holder") {
      console.log("✅ Status: HOLDER -> Welcome to the Guardianía.");
    } else if (status === "non-holder") {
      console.log("🛑 Status: NON-HOLDER -> Access Denied.");
    } else {
      console.log(`⚠️ Status: ${status.toUpperCase()} -> Could not verify access.`);
    }

    console.log("--------------------------------------------------");
  }
}

runDemo().catch(console.error);
