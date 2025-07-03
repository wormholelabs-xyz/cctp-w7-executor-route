import {
  circle,
  deserializeLayout,
  toChainId,
  type AccountAddress,
  type ChainAddress,
  type ChainsConfig,
  type Contracts,
  type Network,
  type Platform,
} from "@wormhole-foundation/sdk-connect";
import type {
  SolanaChains,
  SolanaTransaction,
} from "@wormhole-foundation/sdk-solana";
import {
  utils,
  SolanaAddress,
  SolanaPlatform,
  SolanaUnsignedTransaction,
} from "@wormhole-foundation/sdk-solana";
import { CCTPExecutor } from "../types";
import { shimContractsV1, solanaExecutorId } from "../consts";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { QuoteDetails } from "../routes/cctpV1";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { createDepositForBurnInstruction } from "@wormhole-foundation/sdk-solana-cctp";
import { BN, Program } from "@coral-xyz/anchor";
import {
  ExampleCctpWithExecutor,
  ExampleCctpWithExecutorIdl,
} from "./idl/example_cctp_with_executor";
import { signedQuoteLayout } from "../layouts";

export class SvmCCTPExecutor<N extends Network, C extends SolanaChains>
  implements CCTPExecutor<N, C>
{
  readonly tokenMessengerProgramId: PublicKey;
  readonly messageTransmitterProgramId: PublicKey;

  readonly shimProgramId: PublicKey;
  readonly executorProgramId: PublicKey;

  constructor(
    readonly network: N,
    readonly chain: C,
    readonly connection: Connection,
    readonly contracts: Contracts
  ) {
    if (network === "Devnet")
      throw new Error("CCTPExecutor not supported on Devnet");

    const getContractAddress = (
      contract: string | undefined,
      errorMessage: string
    ) => {
      if (!contract) throw new Error(errorMessage);
      return new PublicKey(contract);
    };

    this.tokenMessengerProgramId = getContractAddress(
      contracts.cctp?.tokenMessenger,
      `Circle Token Messenger contract for domain ${chain} not found`
    );

    this.messageTransmitterProgramId = getContractAddress(
      contracts.cctp?.messageTransmitter,
      `Circle Message Transmitter contract for domain ${chain} not found`
    );

    this.shimProgramId = getContractAddress(
      shimContractsV1[network]?.[chain],
      `Shim contract for ${chain} not found`
    );

    this.executorProgramId = getContractAddress(
      solanaExecutorId[network],
      `Executor contract for ${network} not found`
    );
  }

  static async fromRpc<N extends Network>(
    provider: Connection,
    config: ChainsConfig<N, Platform>
  ): Promise<SvmCCTPExecutor<N, SolanaChains>> {
    const [network, chain] = await SolanaPlatform.chainFromRpc(provider);
    const conf = config[chain]!;
    if (conf.network !== network)
      throw new Error(`Network mismatch: ${conf.network} != ${network}`);
    return new SvmCCTPExecutor(network as N, chain, provider, conf.contracts);
  }

  async *transfer(
    sender: AccountAddress<C>,
    recipient: ChainAddress,
    details: QuoteDetails
  ): AsyncGenerator<SolanaUnsignedTransaction<N, C>> {
    const usdc = new PublicKey(
      circle.usdcContract.get(this.network, this.chain)!
    );

    const senderPk = new SolanaAddress(sender).unwrap();
    const senderAta = getAssociatedTokenAddressSync(usdc, senderPk);
    const referrer = new SolanaAddress(
      details.referrer?.address?.toString() ?? senderPk
    ).unwrap();

    const transaction = new Transaction();
    transaction.feePayer = senderPk;

    if (details.referrerFee > 0n) {
      const referrerAta = getAssociatedTokenAddressSync(usdc, referrer, true);
      const referrerAtaAccount = await this.connection.getAccountInfo(
        referrerAta
      );
      if (!referrerAtaAccount) {
        transaction.add(
          createAssociatedTokenAccountIdempotentInstruction(
            senderPk,
            referrerAta,
            referrer,
            usdc
          )
        );
      }
      transaction.add(
        createTransferInstruction(
          senderAta,
          referrerAta,
          senderPk,
          details.referrerFee
        )
      );
    }

    const destinationDomain = circle.circleChainId.get(
      this.network,
      recipient.chain
    )!;
    const destinationAddress = recipient.address.toUniversalAddress();

    const msgSendEvent = Keypair.generate();

    transaction.add(
      await createDepositForBurnInstruction(
        this.messageTransmitterProgramId,
        this.tokenMessengerProgramId,
        usdc,
        destinationDomain,
        senderPk,
        senderAta,
        destinationAddress,
        details.remainingAmount,
        msgSendEvent.publicKey
      )
    );

    const shimProgram = new Program<ExampleCctpWithExecutor>(
      ExampleCctpWithExecutorIdl,
      this.shimProgramId,
      { connection: null } as any
    );

    const signedQuote = deserializeLayout(
      signedQuoteLayout,
      details.signedQuote
    );

    const messageTransmitter = utils.deriveAddress(
      "message_transmitter",
      this.messageTransmitterProgramId
    );

    transaction.add(
      await shimProgram.methods
        .relayLastMessage({
          execAmount: new BN(details.estimatedCost.toString()),
          recipientChain: toChainId(recipient.chain),
          signedQuoteBytes: Buffer.from(details.signedQuote),
          relayInstructions: Buffer.from(details.relayInstructions),
        })
        .accounts({
          payer: senderPk,
          messageTransmitter,
          payee: new PublicKey(signedQuote.quote.payeeAddress),
          executorProgram: this.executorProgramId,
        })
        .instruction()
    );

    yield this.createUnsignedTx(
      { transaction, signers: [msgSendEvent] },
      "SvmCCTPExecutor.Transfer"
    );
  }

  private createUnsignedTx(
    txReq: SolanaTransaction,
    description: string,
    parallelizable: boolean = false
  ): SolanaUnsignedTransaction<N, C> {
    return new SolanaUnsignedTransaction(
      txReq,
      this.network,
      this.chain,
      description,
      parallelizable
    );
  }
}
