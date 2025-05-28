import {
  AccountAddress as AptosAccountAddress,
  Aptos,
  InputGenerateTransactionPayloadData,
  EntryFunctionArgumentTypes,
  SimpleEntryFunctionArgumentTypes,
} from "@aptos-labs/ts-sdk";
import {
  circle,
  toChainId,
  type AccountAddress,
  type ChainAddress,
  type ChainsConfig,
  type Contracts,
  type Network,
  type Platform,
} from "@wormhole-foundation/sdk-connect";
import {
  AptosAddress,
  AptosChains,
  AptosPlatform,
  AptosUnsignedTransaction,
} from "@wormhole-foundation/sdk-aptos";
import { CCTPExecutor } from "../types";
import { shimContractsV1 } from "../consts";
import { QuoteDetails } from "../routes/cctpV1";

export class AptosCCTPExecutor<N extends Network, C extends AptosChains>
  implements CCTPExecutor<N, C>
{
  readonly usdcId: string;
  readonly shimContract: string;

  constructor(
    readonly network: N,
    readonly chain: C,
    readonly provider: Aptos,
    readonly contracts: Contracts
  ) {
    if (network === "Devnet")
      throw new Error("CCTPExecutor not supported on Devnet");

    const usdcId = circle.usdcContract.get(this.network, this.chain);
    if (!usdcId) {
      throw new Error(
        `No USDC contract configured for network=${this.network} chain=${this.chain}`
      );
    }
    this.usdcId = usdcId;

    const shimContract = shimContractsV1[network]?.[chain];
    if (!shimContract) throw new Error(`Shim contract for ${chain} not found`);
    this.shimContract = shimContract;
  }

  static async fromRpc<N extends Network>(
    provider: Aptos,
    config: ChainsConfig<N, Platform>
  ): Promise<AptosCCTPExecutor<N, AptosChains>> {
    const [network, chain] = await AptosPlatform.chainFromRpc(provider);

    const conf = config[chain];
    if (!conf) throw new Error(`No config found for ${chain}`);
    if (conf.network !== network)
      throw new Error(`Network mismatch: ${conf.network} != ${network}`);

    return new AptosCCTPExecutor(network as N, chain, provider, conf.contracts);
  }

  async *transfer(
    sender: AccountAddress<C>,
    recipient: ChainAddress,
    details: QuoteDetails
  ): AsyncGenerator<AptosUnsignedTransaction<N, C>> {
    const senderAddress = new AptosAddress(sender).unwrap();
    const mintRecipient = AptosAccountAddress.from(
      recipient.address.toUniversalAddress().toUint8Array()
    );
    const burnToken = AptosAccountAddress.from(this.usdcId);

    const amount = details.remainingAmount + details.referrerFee;

    const destinationDomain = circle.circleChainId.get(
      this.network,
      recipient.chain
    )!;

    const refundAddr = senderAddress;
    const payee = new AptosAddress(
      details.referrer.address.toString()
    ).unwrap();
    const functionArguments: Array<
      EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes
    > = [
      amount,
      destinationDomain,
      mintRecipient.toString(),
      burnToken.toString(),
      details.estimatedCost,
      toChainId(recipient.chain),
      refundAddr,
      details.signedQuote,
      details.relayInstructions,
      details.referrerFeeDbps,
      payee,
    ];

    const tx: InputGenerateTransactionPayloadData = {
      function: `${this.shimContract}::cctp_v1_with_executor::deposit_for_burn_entry`,
      functionArguments,
    };

    yield this.createUnsignedTx(tx, "AtposCCTPExecutor.Transfer");
  }

  private createUnsignedTx(
    txReq: InputGenerateTransactionPayloadData,
    description: string,
    parallelizable: boolean = false
  ): AptosUnsignedTransaction<N, C> {
    return new AptosUnsignedTransaction(
      txReq,
      this.network,
      this.chain,
      description,
      parallelizable
    );
  }
}
