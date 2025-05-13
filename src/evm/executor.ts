import type {
  AccountAddress,
  ChainAddress,
  ChainsConfig,
  Contracts,
  Network,
  Platform,
} from "@wormhole-foundation/sdk-connect";
import {
  circle,
  nativeChainIds,
  toChainId,
} from "@wormhole-foundation/sdk-connect";

import type { EvmChains } from "@wormhole-foundation/sdk-evm";
import {
  EvmAddress,
  EvmPlatform,
  EvmUnsignedTransaction,
  addChainId,
  addFrom,
} from "@wormhole-foundation/sdk-evm";
import type { Provider, TransactionRequest } from "ethers";
import { Contract } from "ethers";
import { CCTPExecutor } from "../types";
import { shimContracts } from "../consts";
import { QuoteDetails } from "..";

export class EvmCCTPExecutor<N extends Network, C extends EvmChains>
  implements CCTPExecutor<N, C>
{
  readonly chainId: bigint;
  readonly shimContract: string;

  constructor(
    readonly network: N,
    readonly chain: C,
    readonly provider: Provider,
    readonly contracts: Contracts
  ) {
    if (network === "Devnet")
      throw new Error("CCTPExecutor not supported on Devnet");

    this.chainId = nativeChainIds.networkChainToNativeChainId.get(
      network,
      chain
    ) as bigint;

    const shimContract = shimContracts[network]?.[chain];
    if (!shimContract) throw new Error(`Shim contract for ${chain} not found`);
    this.shimContract = shimContract;
  }

  static async fromRpc<N extends Network>(
    provider: Provider,
    config: ChainsConfig<N, Platform>
  ): Promise<EvmCCTPExecutor<N, EvmChains>> {
    const [network, chain] = await EvmPlatform.chainFromRpc(provider);
    const conf = config[chain]!;
    if (conf.network !== network)
      throw new Error(`Network mismatch: ${conf.network} != ${network}`);
    return new EvmCCTPExecutor(network as N, chain, provider, conf.contracts);
  }

  async *transfer(
    sender: AccountAddress<C>,
    recipient: ChainAddress,
    details: QuoteDetails
  ): AsyncGenerator<EvmUnsignedTransaction<N, C>> {
    const senderAddress = new EvmAddress(sender).toString();
    const recipientAddress = recipient.address
      .toUniversalAddress()
      .toUint8Array();

    const amount = details.remainingAmount + details.referrerFee;

    const tokenAddr = circle.usdcContract.get(this.network, this.chain)!;

    const tokenContract = EvmPlatform.getTokenImplementation(
      this.provider,
      tokenAddr
    );

    const allowance = await tokenContract.allowance(
      senderAddress,
      this.shimContract
    );

    if (allowance < amount) {
      const txReq = await tokenContract.approve.populateTransaction(
        this.shimContract,
        amount
      );
      yield this.createUnsignedTx(
        addFrom(txReq, senderAddress),
        "ERC20.approve of EvmCCTPExecutor",
        false
      );
    }

    // TODO: type safety. typechain brings in so much boilerplate code and is soft deprecated. use viem?
    const shimAbi = [
      "function depositForBurn(uint256 amount, uint16 destinationChain, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, (address refundAddress, bytes signedQuote, bytes instructions) executorArgs, (uint16 dbps, address payee) feeArgs) external payable returns (uint64 nonce)",
    ];

    const shim = new Contract(this.shimContract, shimAbi, this.provider);

    const txReq = await shim.getFunction("depositForBurn").populateTransaction(
      amount,
      toChainId(recipient.chain),
      circle.circleChainId.get(this.network, recipient.chain)!,
      recipientAddress,
      tokenAddr,
      {
        refundAddress: senderAddress,
        signedQuote: details.signedQuote,
        instructions: details.relayInstructions,
      },
      {
        dbps: details.referrerFeeDbps,
        payee: details.referrer.address.toString(),
      }
    );
    txReq.value = details.estimatedCost;

    yield this.createUnsignedTx(
      addFrom(txReq, senderAddress),
      "EvmCCTPExecutor.depositForBurn"
    );
  }

  private createUnsignedTx(
    txReq: TransactionRequest,
    description: string,
    parallelizable: boolean = false
  ): EvmUnsignedTransaction<N, C> {
    return new EvmUnsignedTransaction(
      addChainId(txReq, this.chainId),
      this.network,
      this.chain,
      description,
      parallelizable
    );
  }
}
