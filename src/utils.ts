import {
  amount,
  Chain,
  circle,
  encoding,
  Network,
  toChainId,
} from "@wormhole-foundation/sdk-base";
import {
  CircleV2Message,
  deserializeCircleV2Message,
} from "./layouts";
import axios from "axios";
import {
  apiBaseUrl,
  CircleV2FinalityThreshold,
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
import {
  type CapabilitiesResponse,
  type QuoteResponse,
  type StatusResponse,
} from "@wormhole-foundation/sdk-definitions";
import { CCTPv2ExecutorRoute } from "./routes";


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

/**
 * Calculates the fast burn max fee from the remaining amount and fee in basis points.
 * The fee can be a decimal (e.g., 1.3 bps), so we scale by 100 to preserve precision.
 *
 * @param remainingAmount - The amount after other fees have been deducted
 * @param feeBps - The fast burn fee in basis points (can be decimal, e.g., 1.3)
 * @returns The max fee as a bigint, rounded up
 */
export function calculateFastBurnMaxFee(
  remainingAmount: bigint,
  feeBps: number
): bigint {
  // Scale bps to preserve 2 decimal places (e.g. 1.3 -> 130)
  const scaledBps = BigInt(Math.round(feeBps * 100));

  // fee = amount * (bps / 100) / 10_000
  // => amount * scaledBps / 1_000_000
  return (remainingAmount * scaledBps + 1_000_000n - 1n) / 1_000_000n;
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

interface CircleV2BurnFeeResponse {
  finalityThreshold: number;
  minimumFee: number; // The minimum fee for the transaction, in BPS (Basis Points) (1 = 0.01%).
}

export async function getCircleV2FastBurnFee(
  network: Network,
  fromChain: Chain,
  toChain: Chain
): Promise<number> {
  const sourceDomain = getCircleV2Domain(network, fromChain);
  const destinationDomain = getCircleV2Domain(network, toChain);
  const url = `${circleV2Api[network]}/burn/USDC/fees/${sourceDomain}/${destinationDomain}`;
  const response = await axios.get<CircleV2BurnFeeResponse[]>(url);
  const feeTier = response.data.find(
    (tier) => tier.finalityThreshold === CircleV2FinalityThreshold.CONFIRMED
  );
  if (!feeTier) {
    throw new Error("No fee tier found for CONFIRMED finality threshold");
  }
  return feeTier.minimumFee;
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
