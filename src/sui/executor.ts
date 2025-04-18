import type { SuiClient } from "@mysten/sui/client";
import {
  type AccountAddress,
  type ChainAddress,
  type ChainsConfig,
  type Contracts,
  type Network,
  type Platform,
} from "@wormhole-foundation/sdk-connect";
import type {
  SuiChains,
  SuiUnsignedTransaction,
} from "@wormhole-foundation/sdk-sui";
import { SuiPlatform } from "@wormhole-foundation/sdk-sui";
import { CCTPW7Executor } from "../types";
import { shimContracts } from "../consts";
import { QuoteDetails } from "..";

export class SuiCCTPW7Executor<N extends Network, C extends SuiChains>
  implements CCTPW7Executor<N, C>
{
  readonly shimContract: string;

  constructor(
    readonly network: N,
    readonly chain: C,
    readonly connection: SuiClient,
    readonly contracts: Contracts
  ) {
    if (network === "Devnet")
      throw new Error("CCTPW7Executor not supported on Devnet");

    const shimContract = shimContracts.get(network, chain);
    if (!shimContract) throw new Error(`Shim contract for ${chain} not found`);
    this.shimContract = shimContract;
  }

  static async fromRpc<N extends Network>(
    provider: SuiClient,
    config: ChainsConfig<N, Platform>
  ): Promise<SuiCCTPW7Executor<N, SuiChains>> {
    const [network, chain] = await SuiPlatform.chainFromRpc(provider);
    const conf = config[chain]!;
    if (conf.network !== network)
      throw new Error(`Network mismatch: ${conf.network} != ${network}`);
    return new SuiCCTPW7Executor(network as N, chain, provider, conf.contracts);
  }

  async *transfer(
    sender: AccountAddress<C>,
    recipient: ChainAddress,
    amount: bigint,
    details: QuoteDetails
  ): AsyncGenerator<SuiUnsignedTransaction<N, C>> {
    throw new Error("Not implemented");
  }

  //private createUnsignedTx(
  //  txReq: SuiTransaction,
  //  description: string,
  //  parallelizable: boolean = false
  //): SuiUnsignedTransaction<N, C> {
  //  return new SuiUnsignedTransaction(
  //    txReq,
  //    this.network,
  //    this.chain,
  //    description,
  //    parallelizable
  //  );
  //}
}
