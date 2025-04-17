import type {
  AccountAddress,
  ChainAddress,
  ChainsConfig,
  Contracts,
  Network,
  Platform,
} from "@wormhole-foundation/sdk-connect";
import type { SolanaChains } from "@wormhole-foundation/sdk-solana";
import {
  SolanaPlatform,
  SolanaUnsignedTransaction,
} from "@wormhole-foundation/sdk-solana";
import { CCTPW7Executor } from "../types";
import { shimContracts } from "../consts";
import { Connection } from "@solana/web3.js";

export class SvmCCTPW7Executor<N extends Network, C extends SolanaChains>
  implements CCTPW7Executor<N, C>
{
  readonly shimContract: string;

  constructor(
    readonly network: N,
    readonly chain: C,
    readonly connection: Connection,
    readonly contracts: Contracts
  ) {
    if (network === "Devnet")
      throw new Error("CCTPW7Executor not supported on Devnet");

    const shimContract = shimContracts.get(network, chain);
    if (!shimContract) throw new Error(`Shim contract for ${chain} not found`);
    this.shimContract = shimContract;
  }

  static async fromRpc<N extends Network>(
    provider: Connection,
    config: ChainsConfig<N, Platform>
  ): Promise<SvmCCTPW7Executor<N, SolanaChains>> {
    const [network, chain] = await SolanaPlatform.chainFromRpc(provider);
    const conf = config[chain]!;
    if (conf.network !== network)
      throw new Error(`Network mismatch: ${conf.network} != ${network}`);
    return new SvmCCTPW7Executor(network as N, chain, provider, conf.contracts);
  }

  async *transfer(
    sender: AccountAddress<C>,
    recipient: ChainAddress,
    amount: bigint,
    signedQuote: Uint8Array,
    relayInstructions: Uint8Array,
    estimatedCost: bigint
  ): AsyncGenerator<SolanaUnsignedTransaction<N, C>> {
    throw new Error("Not implemented");
  }

  //private createUnsignedTx(
  //  txReq: SolanaTransaction,
  //  description: string,
  //  parallelizable: boolean = false
  //): SolanaUnsignedTransaction<N, C> {
  //  return new SolanaUnsignedTransaction(
  //    txReq,
  //    this.network,
  //    this.chain,
  //    description,
  //    parallelizable
  //  );
  //}
}
