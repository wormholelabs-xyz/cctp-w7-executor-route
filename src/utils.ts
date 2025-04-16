import { Chain, toChainId } from "@wormhole-foundation/sdk-base";
import { RequestPrefix, SignedQuote } from "./layouts";
import axios from "axios";

export enum RelayStatus {
  Pending = "pending",
  Failed = "failed",
  Unsupported = "unsupported",
  Submitted = "submitted",
  Underpaid = "underpaid",
  Aborted = "aborted",
}

const executorBaseUrl = "https://executor-testnet.labsapis.com"; // TODO: make this configurable by network

export type RequestForExecution = {
  quoterAddress: `0x${string}`;
  amtPaid: bigint;
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
  blockNumber: bigint;
  blockTime: Date | null;
  cost: bigint;
};

export type RelayData = {
  id: `0x${string}`;
  txHash: string;
  chainId: number;
  status: string;
  estimatedCost: bigint;
  requestForExecution: RequestForExecution;
  instruction?: Request;
  txs?: TxInfo[];
  indexed_at: Date;
};

export type Capabilities = {
  requestPrefixes: Array<keyof typeof RequestPrefix>;
  gasDropOffLimit: bigint;
};

export interface CapabilitiesResponse {
  [chainId: string]: Capabilities;
}

export async function fetchCapabilities(): Promise<CapabilitiesResponse> {
  const url = `${executorBaseUrl}/v0/capabilities`;
  return (await axios.get<CapabilitiesResponse>(url)).data;
}

export interface QuoteResponse {
  signedQuote: `0x${string}`;
  estimatedCost?: bigint;
}

export async function fetchSignedQuote(
  srcChain: Chain,
  dstChain: Chain,
  relayInstructions: string // TODO: `0x:${string}`
): Promise<QuoteResponse> {
  const url = `${executorBaseUrl}/v0/quote`;
  return (
    await axios.post(url, {
      srcChain: toChainId(srcChain),
      dstChain: toChainId(dstChain),
      relayInstructions,
    })
  ).data;
}

export interface StatusResponse extends RelayData {
  signedQuote: SignedQuote;
  estimatedCost: bigint;
}

export async function fetchStatus(
  txHash: string,
  chain: Chain
): Promise<StatusResponse> {
  const url = `${executorBaseUrl}/v0/status/tx`;
  return (
    await axios.post(url, {
      txHash,
      chainId: toChainId(chain),
    })
  ).data;
}
