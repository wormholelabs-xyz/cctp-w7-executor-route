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
  encoding,
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
import { CCTPv2Executor } from "../types";
import { circleV2Contracts, shimContractsV2 } from "../consts";
import { CircleV2Message, serializeCircleV2Message } from "../layouts";
import { CCTPv2QuoteDetails } from "../routes/cctpV2Base";

export class EvmCCTPv2Executor<N extends Network, C extends EvmChains>
  implements CCTPv2Executor<N, C>
{
  readonly chainId: bigint;
  readonly shimContract: string;
  readonly messageTransmitter: string;

  constructor(
    readonly network: N,
    readonly chain: C,
    readonly provider: Provider,
    readonly contracts: Contracts
  ) {
    if (network === "Devnet")
      throw new Error("CCTPv2Executor not supported on Devnet");

    this.chainId = nativeChainIds.networkChainToNativeChainId.get(
      network,
      chain
    ) as bigint;

    const shimContract = shimContractsV2[network]?.[chain];
    if (!shimContract) throw new Error(`Shim contract for ${chain} not found`);
    this.shimContract = shimContract;

    const messageTransmitter =
      circleV2Contracts[network]?.[chain]?.messageTransmitterV2;
    if (!messageTransmitter)
      throw new Error(`MessageTransmitter contract for ${chain} not found`);
    this.messageTransmitter = messageTransmitter;
  }

  static async fromRpc<N extends Network>(
    provider: Provider,
    config: ChainsConfig<N, Platform>
  ): Promise<EvmCCTPv2Executor<N, EvmChains>> {
    const [network, chain] = await EvmPlatform.chainFromRpc(provider);
    const conf = config[chain]!;
    if (conf.network !== network)
      throw new Error(`Network mismatch: ${conf.network} != ${network}`);
    return new EvmCCTPv2Executor(network as N, chain, provider, conf.contracts);
  }

  async *transfer(
    sender: AccountAddress<C>,
    recipient: ChainAddress,
    details: CCTPv2QuoteDetails
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
        "ERC20.approve of EvmCCTPv2Executor",
        false
      );
    }

    // TODO: type safety. typechain brings in so much boilerplate code and is soft deprecated. use viem?
    const shimAbi = [
      "function depositForBurn(uint256 amount, uint16 destinationChain, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller, uint256 maxFee, uint32 minFinalityThreshold, (address refundAddress, bytes signedQuote, bytes instructions) executorArgs, (uint16 dbps, address payee) feeArgs) external payable returns (uint64 nonce)",
    ];

    // If equal to bytes32(0), any address can call receiveMessage() on destination domain.
    const destinationCaller = new Uint8Array(32);

    const shim = new Contract(this.shimContract, shimAbi, this.provider);

    const txReq = await shim.getFunction("depositForBurn").populateTransaction(
      amount,
      toChainId(recipient.chain),
      circle.circleChainId.get(this.network, recipient.chain)!,
      recipientAddress,
      tokenAddr,
      destinationCaller,
      details.fastTransferMaxFee,
      details.minFinalityThreshold,
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
      "EvmCCTPv2Executor.depositForBurn"
    );
  }

  async isTransferCompleted(message: CircleV2Message): Promise<boolean> {
    const contract = new Contract(
      this.messageTransmitter,
      ["function usedNonces(bytes32) public view returns (uint256)"],
      this.provider
    );

    const result = await contract
      .getFunction("usedNonces")
      .staticCall(message.nonce);

    return result === 1n;
  }

  async *redeem(
    sender: AccountAddress<C>,
    message: CircleV2Message,
    attestation: string
  ): AsyncGenerator<EvmUnsignedTransaction<N, C>> {
    const senderAddr = new EvmAddress(sender).toString();

    const contract = new Contract(
      this.messageTransmitter,
      ["function receiveMessage(bytes message, bytes attestation)"],
      this.provider
    );

    const txReq = await contract
      .getFunction("receiveMessage")
      .populateTransaction(
        serializeCircleV2Message(message),
        encoding.hex.decode(attestation)
      );

    yield this.createUnsignedTx(
      addFrom(txReq, senderAddr),
      "MessageTransmitterV2.receiveMessage"
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
