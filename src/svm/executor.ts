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
import { CCTPW7Executor } from "../types";
import { shimContracts } from "../consts";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { QuoteDetails } from "..";
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

export class SvmCCTPW7Executor<N extends Network, C extends SolanaChains>
  implements CCTPW7Executor<N, C>
{
  readonly tokenMessengerProgramId: PublicKey;
  readonly messageTransmitterProgramId: PublicKey;

  readonly shimProgramId: PublicKey;

  constructor(
    readonly network: N,
    readonly chain: C,
    readonly connection: Connection,
    readonly contracts: Contracts
  ) {
    if (network === "Devnet")
      throw new Error("CCTPW7Executor not supported on Devnet");

    const tokenMessengerAddress = contracts.cctp?.tokenMessenger;
    if (!tokenMessengerAddress)
      throw new Error(
        `Circle Token Messenger contract for domain ${chain} not found`
      );
    this.tokenMessengerProgramId = new PublicKey(tokenMessengerAddress);

    const messageTransmitterAddress = contracts.cctp?.messageTransmitter;
    if (!messageTransmitterAddress)
      throw new Error(
        `Circle Message Transmitter contract for domain ${chain} not found`
      );
    this.messageTransmitterProgramId = new PublicKey(messageTransmitterAddress);

    const shimContract = shimContracts[network]?.[chain];
    if (!shimContract) throw new Error(`Shim contract for ${chain} not found`);
    this.shimProgramId = new PublicKey(shimContract);
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
    details: QuoteDetails
  ): AsyncGenerator<SolanaUnsignedTransaction<N, C>> {
    const usdc = new PublicKey(
      circle.usdcContract.get(this.network, this.chain)!
    );

    const senderPk = new SolanaAddress(sender).unwrap();
    const senderAta = getAssociatedTokenAddressSync(usdc, senderPk);
    const referrer = new SolanaAddress(details.referrer.address).unwrap();

    const transaction = new Transaction();
    transaction.feePayer = senderPk;

    if (details.referrerFee > 0n) {
      const referrerAta = getAssociatedTokenAddressSync(usdc, referrer);
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
      // TODO: why do we have to pass null connection here?
      // we do this in the CCTP route, too
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
          executorProgram: new PublicKey(
            // TODO: store in map by network
            "Ax7mtQPbNPQmghd7C3BHrMdwwmkAXBDq7kNGfXNcc7dg"
          ),
        })
        .instruction()
    );

    yield this.createUnsignedTx(
      { transaction, signers: [msgSendEvent] },
      "SvmCCTPW7Executor.Transfer"
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
