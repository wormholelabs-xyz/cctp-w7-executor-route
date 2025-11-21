import {
  amount,
  Chain,
  circle,
  encoding,
  Network,
  toChainId,
  amount as sdkAmount,
} from "@wormhole-foundation/sdk-base";
import {
  CircleV2Message,
  deserializeCircleV2Message,
  SignedQuote,
} from "./layouts";
import axios from "axios";
import {
  apiBaseUrl,
  circleV2Api,
  getCircleV2Chain,
  getCircleV2Domain,
} from "./consts";
import {
  ChainContext,
  DEFAULT_TASK_TIMEOUT,
  isSameToken,
  tasks,
  TokenId,
  TransactionId,
  Wormhole,
} from "@wormhole-foundation/sdk-connect";
import { CCTPv2ExecutorRoute } from "./routes";

export enum RelayStatus {
  Pending = "pending",
  Failed = "failed",
  Unsupported = "unsupported",
  Submitted = "submitted",
  Underpaid = "underpaid",
  Aborted = "aborted",
}

export type RequestForExecution = {
  quoterAddress: `0x${string}`;
  amtPaid: string;
  dstChain: number;
  dstAddr: `0x${string}`;
  refundAddr: `0x${string}`;
  signedQuoteBytes: `0x${string}`;
  requestBytes: `0x${string}`;
  relayInstructionsBytes: `0x${string}`;
  timestamp: Date;
};

export type TxInfo = {
  txHash: string;
  chainId: number;
  blockNumber: string;
  blockTime: Date | null;
  cost: string;
};

export type RelayData = {
  id: `0x${string}`;
  txHash: string;
  chainId: number;
  status: string;
  estimatedCost: string;
  requestForExecution: RequestForExecution;
  instruction?: Request;
  txs?: TxInfo[];
  indexed_at: Date;
};

export enum RequestPrefix {
  ERM1 = "ERM1", // MM
  ERV1 = "ERV1", // VAA_V1
  ERN1 = "ERN1", // NTT_V1
  ERC1 = "ERC1", // CCTP_V1
  ERC2 = "ERC2", // CCTP_V2
}

export type Capabilities = {
  requestPrefixes: Array<keyof typeof RequestPrefix>;
  gasDropOffLimit: string;
  maxGasLimit: string;
  maxMsgValue: string; // the maximum msgValue, inclusive of the gasDropOffLimit
};

export interface CapabilitiesResponse {
  [chainId: string]: Capabilities;
}

export async function fetchCapabilities(
  network: Network
): Promise<CapabilitiesResponse> {
  const url = `${apiBaseUrl[network]}/v0/capabilities`;

  try {
    const response = await axios.get<CapabilitiesResponse>(url);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch capabilities for network: ${network}.`);
  }
}

export interface QuoteResponse {
  signedQuote: `0x${string}`;
  estimatedCost?: string;
}

export async function fetchSignedQuote(
  network: Network,
  srcChain: Chain,
  dstChain: Chain,
  relayInstructions: string // TODO: `0x:${string}`
): Promise<QuoteResponse> {
  const url = `${apiBaseUrl[network]}/v0/quote`;

  try {
    const response = await axios.post<QuoteResponse>(url, {
      srcChain: toChainId(srcChain),
      dstChain: toChainId(dstChain),
      relayInstructions,
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch signed quote.`);
  }
}

export interface StatusResponse extends RelayData {
  signedQuote: SignedQuote;
  estimatedCost: string;
}

// Fetch Status
export async function fetchStatus(
  network: Network,
  txHash: string,
  chain: Chain
): Promise<StatusResponse[]> {
  const url = `${apiBaseUrl[network]}/v0/status/tx`;

  try {
    const response = await axios.post<StatusResponse[]>(url, {
      txHash,
      chainId: toChainId(chain),
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch status for txHash: ${txHash}.`);
  }
}

const MAX_U16 = 65_535n;

/**
 * Calculate referrer fee with optional amount-based capping.
 *
 * Fee Structure:
 * - Without threshold: Fee scales linearly with amount at the specified dBps rate
 * - With threshold: Fee scales until threshold amount, then plateaus at a fixed fee
 *
 * Example (1 bps / 10 dBps with $1M threshold):
 * ┌─────────────────┬────────────┬──────────────────────┐
 * │ Transfer Amount │ Fee Amount │ Effective Rate (dBps)│
 * ├─────────────────┼────────────┼──────────────────────┤
 * │ $0 - $1M        │ 0.01% scaling │ 10 (full rate)    │
 * │ $1M (threshold) │ $100       │ 10 (full rate)       │
 * │ $5M             │ $100       │ 2 (0.2%)             │
 * │ $10M (max)      │ $100       │ 1 (0.1%)             │
 * └─────────────────┴────────────┴──────────────────────┘
 *
 * The threshold is designed so that at the maximum expected transfer amount ($10M),
 * the effective rate is still >= 1 dBps, avoiding integer division to zero.
 *
 * @param amount - Transfer amount in token base units (6 decimals for USDC)
 * @param dBps - Referrer fee rate in tenths of basis points (10 = 1 bps = 0.01%)
 * @param threshold - Optional amount threshold in whole USDC units where fee caps
 * @returns Object containing fee amount, remaining amount, and effective dBps rate
 */
export function calculateReferrerFee(
  amount: bigint,
  dBps: bigint,
  threshold?: bigint
): { referrerFee: bigint; remainingAmount: bigint; referrerFeeDbps: bigint } {
  if (dBps > MAX_U16) {
    throw new Error("dBps exceeds max u16");
  }

  let referrerFeeDbps: bigint = dBps;
  let referrerFee: bigint = 0n;
  let remainingAmount: bigint = amount;

  if (dBps > 0) {
    if (threshold !== undefined && amount > 0) {
      // Convert threshold from whole USDC units to base units (6 decimals)
      const thresholdAmount = sdkAmount.parse(threshold.toString(), 6);
      const thresholdAmountUnits = sdkAmount.units(thresholdAmount);

      // Cap the amount used for fee calculation at the threshold
      // This creates a fee structure where fees plateau after the threshold amount
      // For amounts below threshold: normal scaling applies
      // For amounts at or above threshold: fee is fixed at (threshold * dBps / 100_000)
      const cappedAmount =
        amount < thresholdAmountUnits ? amount : thresholdAmountUnits;
      referrerFee = (cappedAmount * dBps) / 100_000n;

      // Calculate effective dBps rate based on actual amount transferred
      // This represents what rate would produce the actual fee charged
      // As transfer amounts grow beyond threshold, effective rate decreases
      // Example: $100 fee on $10M transfer = 1 dBps effective rate
      // This value is passed to the quote API to accurately represent the fee structure
      referrerFeeDbps = (referrerFee * 100_000n) / amount;
    } else {
      // Standard calculation without threshold: fee scales linearly with amount
      referrerFee = (amount * dBps) / 100_000n;
    }
    remainingAmount = amount - referrerFee;
  }
  return { referrerFee, remainingAmount, referrerFeeDbps };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface CircleV2AttestationResponse {
  messages: {
    message: string;
    eventNonce: string;
    attestation: string;
    cctpVersion: number;
    status: "pending_confirmations" | "complete";
  }[];
}

export async function getCircleV2Attestation(
  tx: TransactionId,
  network: Network,
  timeout: number = DEFAULT_TASK_TIMEOUT
): Promise<{ message: CircleV2Message; attestation: string } | null> {
  const sourceDomain = getCircleV2Domain(network, tx.chain);

  return tasks.retry(
    async () => {
      const url = `${circleV2Api[network]}/messages/${sourceDomain}?transactionHash=${tx.txid}`;
      try {
        const response = await axios.get<CircleV2AttestationResponse>(url);

        // CCTP V2 could be used to send multiple transfers on a single tx
        // but we'll assume it's only one
        const attestation = response.data.messages[0];
        if (!attestation) return null;

        if (attestation.cctpVersion !== 2)
          throw new Error("CCTPv1 attestation found");

        if (attestation.status === "pending_confirmations") return null;

        const message = deserializeCircleV2Message(
          encoding.hex.decode(attestation.message)
        );

        return {
          message,
          attestation: attestation.attestation,
        };
      } catch (error) {
        if (!error) return null;
        if (typeof error === "object") {
          // A 404 error means the message is not yet available
          // since its not available yet, we return null signaling it can be tried again
          if (axios.isAxiosError(error) && error.response?.status === 404)
            return null;
          if ("status" in error && error.status === 404) return null;
        }

        throw error;
      }
    },
    2000,
    timeout,
    "CCTPv2:GetMessage"
  );
}

interface CircleV2FastBurnFeeResponse {
  minimumFee: number; // The minimum fee for the transaction, in BPS (Basis Points) (1 = 0.01%).
}

export async function getCircleV2FastBurnFee(
  network: Network,
  fromChain: Chain,
  toChain: Chain
): Promise<bigint> {
  const sourceDomain = getCircleV2Domain(network, fromChain);
  const destinationDomain = getCircleV2Domain(network, toChain);
  const url = `${circleV2Api[network]}/fastBurn/USDC/fees/${sourceDomain}/${destinationDomain}`;
  const response = await axios.get<CircleV2FastBurnFeeResponse>(url);
  return BigInt(response.data.minimumFee);
}

interface CircleV2ReattestResponse {
  message: string;
  nonce: string;
  error?: string;
}

// https://developers.circle.com/api-reference/stablecoins/common/reattest-message
export async function reattestCircleV2Message(
  network: Network,
  attestation: CCTPv2ExecutorRoute.Attestation
): Promise<{ message: CircleV2Message; attestation: string } | null> {
  // Re-Attest the message
  const nonce = encoding.hex.encode(
    attestation.attestation.message.nonce,
    true
  );
  const url = `${circleV2Api[network]}/reattest/${nonce}`;
  const response = await axios.post<CircleV2ReattestResponse>(url);
  if (response.data.error) {
    if (response.data.error.includes("Message is already finalized")) {
      return attestation.attestation;
    }
    throw new Error(`Error re-attesting message: ${response.data.error}`);
  }

  const fromChain = getCircleV2Chain(
    network,
    attestation.attestation.message.sourceDomain
  );

  return tasks.retry(
    async () => {
      const newAttestation = await getCircleV2Attestation(
        { txid: attestation.id, chain: fromChain },
        network
      );
      if (!newAttestation) return null;

      if (newAttestation.message.messageBody.expirationBlock !== 0n)
        return null;

      return newAttestation;
    },
    2000,
    DEFAULT_TASK_TIMEOUT,
    "CCTPv2:Reattest"
  );
}

interface CircleV2FastBurnAllowanceResponse {
  allowance: number; // The current USDC Fast Burn allowance remaining, in full units of USDC up to 6 decimals; for example, 123999.999999 USDC.
  lastUpdated: string; // The timestamp when the allowance was last updated.
}

export async function getCircleV2FastBurnAllowance(
  network: Network
): Promise<bigint> {
  const url = `${circleV2Api[network]}/fastBurn/USDC/allowance`;
  const response = await axios.get<CircleV2FastBurnAllowanceResponse>(url);
  return amount.units(amount.parse(response.data.allowance, 6));
}

export function getUsdcDestinationAddress<N extends Network>(
  sourceToken: TokenId,
  fromChain: ChainContext<N>,
  toChain: ChainContext<N>
): TokenId[] {
  // Ensure the source token is USDC
  const sourceChainUsdcContract = circle.usdcContract.get(
    fromChain.network,
    fromChain.chain
  );
  if (
    !(
      sourceChainUsdcContract &&
      isSameToken(
        sourceToken,
        Wormhole.tokenId(fromChain.chain, sourceChainUsdcContract)
      )
    )
  ) {
    return [];
  }

  // Get the destination chain's USDC contract
  const { network, chain } = toChain;
  const destChainUsdcContract = circle.usdcContract.get(network, chain);
  if (!destChainUsdcContract) return [];

  return [Wormhole.chainAddress(chain, destChainUsdcContract)];
}
