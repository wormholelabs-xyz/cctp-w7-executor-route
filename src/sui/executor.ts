import type { SuiClient } from "@mysten/sui/client";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";
import { Transaction } from "@mysten/sui/transactions";
import {
  canonicalAddress,
  circle,
  constMap,
  MapLevels,
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
// import { suiCircleObjects } from "@wormhole-foundation/sdk-sui-cctp";

// TODO: remove this once the export is available in the sdk
type SuiCircleObjects = {
  tokenMessengerState: string;
  messageTransmitterState: string;
  usdcTreasury: string;
};

const _suiCircleObjects = [
  [
    "Testnet",
    {
      tokenMessengerState:
        "0x5252abd1137094ed1db3e0d75bc36abcd287aee4bc310f8e047727ef5682e7c2",
      messageTransmitterState:
        "0x98234bd0fa9ac12cc0a20a144a22e36d6a32f7e0a97baaeaf9c76cdc6d122d2e",
      usdcTreasury:
        "0x7170137d4a6431bf83351ac025baf462909bffe2877d87716374fb42b9629ebe",
    },
  ],
  [
    "Mainnet",
    {
      tokenMessengerState:
        "0x45993eecc0382f37419864992c12faee2238f5cfe22b98ad3bf455baf65c8a2f",
      messageTransmitterState:
        "0xf68268c3d9b1df3215f2439400c1c4ea08ac4ef4bb7d6f3ca6a2a239e17510af",
      usdcTreasury:
        "0x57d6725e7a8b49a7b2a612f6bd66ab5f39fc95332ca48be421c3229d514a6de7",
    },
  ],
] as const satisfies MapLevels<[Network, SuiCircleObjects]>;

const suiCircleObjects = constMap(_suiCircleObjects, [0, 1]);

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

    const usdcId = circle.usdcContract.get(this.network, this.chain);
    if (!usdcId) {
      throw new Error(
        `No USDC contract configured for network=${this.network} chain=${this.chain}`
      );
    }

    const { tokenMessengerState, messageTransmitterState, usdcTreasury } =
      suiCircleObjects(network as "Mainnet" | "Testnet");

    if (!contracts.cctp?.tokenMessenger)
      throw new Error(
        `Circle Token Messenger contract for domain ${chain} not found`
      );

    if (!contracts.cctp?.messageTransmitter)
      throw new Error(
        `Circle Message Transmitter contract for domain ${chain} not found`
      );

    this.usdcId = usdcId;
    this.usdcTreasuryId = usdcTreasury;
    this.tokenMessengerId = contracts.cctp?.tokenMessenger;
    this.messageTransmitterId = contracts.cctp?.messageTransmitter;
    this.tokenMessengerStateId = tokenMessengerState;
    this.messageTransmitterStateId = messageTransmitterState;

    const executorId = suiExecutorIds[network]?.executorId;
    if (!executorId)
      throw new Error(`Executor contract for ${network} not found`);
    this.executorId = executorId;

    const executorRequestsId = suiExecutorIds[network]?.executorRequestsId;
    if (!executorRequestsId)
      throw new Error(`Executor requests contract for ${network} not found`);
    this.executorRequestsId = executorRequestsId;
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
      const [txCoin] = tx.splitCoins(primaryCoinInput, [amount]);
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
