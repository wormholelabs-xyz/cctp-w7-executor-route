import type { SuiClient } from "@mysten/sui/client";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";
import { Transaction } from "@mysten/sui/transactions";
import {
  canonicalAddress,
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
  SuiAddress,
  SuiChains,
  SuiUnsignedTransaction,
} from "@wormhole-foundation/sdk-sui";
import { SuiPlatform } from "@wormhole-foundation/sdk-sui";
import { CCTPW7Executor } from "../types";
import { suiExecutorIds } from "../consts";
import { QuoteDetails } from "..";
import { suiCircleObjects } from "@wormhole-foundation/sdk-sui-cctp";

export class SuiCCTPW7Executor<N extends Network, C extends SuiChains>
  implements CCTPW7Executor<N, C>
{
  readonly usdcId: string;
  readonly usdcTreasuryId: string;
  readonly tokenMessengerId: string;
  readonly tokenMessengerStateId: string;
  readonly messageTransmitterId: string;
  readonly messageTransmitterStateId: string;

  readonly executorId: string;
  readonly executorRequestsId: string;

  constructor(
    readonly network: N,
    readonly chain: C,
    readonly provider: SuiClient,
    readonly contracts: Contracts
  ) {
    if (network === "Devnet")
      throw new Error("CCTPW7Executor not supported on Devnet");

    const getContractAddress = (
      contract: string | undefined,
      errorMessage: string
    ) => {
      if (!contract) {
        throw new Error(errorMessage);
      }
      return contract;
    };

    this.usdcId = getContractAddress(
      circle.usdcContract.get(this.network, this.chain),
      `No USDC contract configured for network=${this.network} chain=${this.chain}`
    );

    const { tokenMessengerState, messageTransmitterState, usdcTreasury } =
      suiCircleObjects(network as "Mainnet" | "Testnet");

    this.usdcTreasuryId = usdcTreasury;

    this.tokenMessengerId = getContractAddress(
      contracts.cctp?.tokenMessenger,
      `Circle Token Messenger contract for domain ${chain} not found`
    );

    this.messageTransmitterId = getContractAddress(
      contracts.cctp?.messageTransmitter,
      `Circle Message Transmitter contract for domain ${chain} not found`
    );

    this.tokenMessengerStateId = tokenMessengerState;
    this.messageTransmitterStateId = messageTransmitterState;

    this.executorId = getContractAddress(
      suiExecutorIds[network]?.executorId,
      `Executor contract for ${network} not found`
    );

    this.executorRequestsId = getContractAddress(
      suiExecutorIds[network]?.executorRequestsId,
      `Executor requests contract for ${network} not found`
    );
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
    details: QuoteDetails
  ): AsyncGenerator<SuiUnsignedTransaction<N, C>> {
    const tx = new Transaction();
    const senderAddress = new SuiAddress(sender).unwrap();

    const destinationDomain = circle.circleChainId.get(
      this.network,
      recipient.chain
    )!;

    const [primaryCoin, ...mergeCoins] = await SuiPlatform.getCoins(
      this.provider,
      sender,
      this.usdcId
    );

    if (primaryCoin === undefined) {
      throw new Error("No USDC in wallet");
    }

    const primaryCoinInput = tx.object(primaryCoin.coinObjectId);
    if (mergeCoins.length > 0) {
      tx.mergeCoins(
        primaryCoinInput,
        mergeCoins.map((coin) => tx.object(coin.coinObjectId))
      );
    }

    let coin: any;
    if (details.referrerFee > 0n) {
      const [txCoin, referrerFeeCoin] = tx.splitCoins(primaryCoinInput, [
        details.remainingAmount,
        details.referrerFee,
      ]);
      coin = txCoin;
      tx.transferObjects([referrerFeeCoin], canonicalAddress(details.referrer));
    } else {
      const [txCoin] = tx.splitCoins(primaryCoinInput, [
        details.remainingAmount,
      ]);
      coin = txCoin;
    }

    const [_, message] = tx.moveCall({
      target: `${this.tokenMessengerId}::deposit_for_burn::deposit_for_burn`,
      arguments: [
        coin,
        tx.pure.u32(destinationDomain), // destination_domain
        tx.pure.address(recipient.address.toUniversalAddress().toString()), // mint_recipient
        tx.object(this.tokenMessengerStateId), // token_messenger_minter state
        tx.object(this.messageTransmitterStateId), // message_transmitter state
        tx.object("0x403"), // deny_list id, fixed address
        tx.object(this.usdcTreasuryId), // treasury object Treasury<USDC>
      ],
      typeArguments: [this.usdcId],
    });

    const [source_domain] = tx.moveCall({
      target: `${this.messageTransmitterId}::message::source_domain`,
      arguments: [message!],
    });

    const [nonce] = tx.moveCall({
      target: `${this.messageTransmitterId}::message::nonce`,
      arguments: [message!],
    });

    const [requestBytes] = tx.moveCall({
      target: `${this.executorRequestsId}::executor_requests::make_cctp_v1_request`,
      arguments: [source_domain!, nonce!],
    });

    const [executorCoin] = tx.splitCoins(tx.gas, [
      tx.pure.u64(details.estimatedCost),
    ]);

    tx.moveCall({
      target: `${this.executorId}::executor::request_execution`,
      arguments: [
        executorCoin,
        tx.object(SUI_CLOCK_OBJECT_ID),
        tx.pure.u16(toChainId(recipient.chain)),
        tx.pure.address("0x0"),
        tx.pure.address(senderAddress),
        tx.pure.vector("u8", details.signedQuote),
        requestBytes!,
        tx.pure.vector("u8", details.relayInstructions),
      ],
    });

    yield this.createUnsignedTx(tx, "SuiCCTPW7Executor.Transfer");
  }

  private createUnsignedTx(
    txReq: Transaction,
    description: string,
    parallelizable: boolean = false
  ): SuiUnsignedTransaction<N, C> {
    return new SuiUnsignedTransaction(
      txReq,
      this.network,
      this.chain,
      description,
      parallelizable
    );
  }
}
