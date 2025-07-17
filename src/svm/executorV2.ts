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
  SolanaAddress,
  SolanaPlatform,
  SolanaUnsignedTransaction,
} from "@wormhole-foundation/sdk-solana";
import { CCTPv2Executor } from "../types";
import {
  circleV2Contracts,
  getCircleV2Domain,
  solanaExecutorId,
} from "../consts";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { CCTPv2QuoteDetails } from "../routes/cctpV2Base";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { BN, Program } from "@coral-xyz/anchor";
import { CircleV2Message, serializeCircleV2Message } from "../layouts";
import { signedQuoteLayout } from "../layouts";

import { Executor, ExecutorIdl } from "./idl/executor";
import { createReceiveMessageInstruction } from "@wormhole-foundation/sdk-solana-cctp";
import { TransactionInstruction } from "@solana/web3.js";
import { UniversalAddress } from "@wormhole-foundation/sdk-connect";

const CCTP_V2_REQUEST_BYTES = Buffer.from("4552433201", "hex");

export class SvmCCTPv2Executor<N extends Network, C extends SolanaChains>
  implements CCTPv2Executor<N, C>
{
  readonly tokenMessengerV2ProgramId: PublicKey;
  readonly messageTransmitterV2ProgramId: PublicKey;
  readonly executorProgramId: PublicKey;

  constructor(
    readonly network: N,
    readonly chain: C,
    readonly connection: Connection,
    readonly contracts: Contracts
  ) {
    const getContractAddress = (
      contract: string | undefined,
      errorMessage: string
    ) => {
      if (!contract) throw new Error(errorMessage);
      return new PublicKey(contract);
    };

    const v2Contracts = circleV2Contracts[network]?.[chain];
    if (!v2Contracts) {
      throw new Error(`Circle V2 contracts not found for ${network} ${chain}`);
    }

    this.tokenMessengerV2ProgramId = getContractAddress(
      v2Contracts.tokenMessengerV2,
      `Circle Token Messenger V2 contract for domain ${chain} not found`
    );

    this.messageTransmitterV2ProgramId = getContractAddress(
      v2Contracts.messageTransmitterV2,
      `Circle Message Transmitter V2 contract for domain ${chain} not found`
    );

    this.executorProgramId = getContractAddress(
      solanaExecutorId[network],
      `Executor contract for ${network} not found`
    );
  }

  static async fromRpc<N extends Network>(
    provider: Connection,
    config: ChainsConfig<N, Platform>
  ): Promise<SvmCCTPv2Executor<N, SolanaChains>> {
    const [network, chain] = await SolanaPlatform.chainFromRpc(provider);
    const conf = config[chain]!;
    if (conf.network !== network)
      throw new Error(`Network mismatch: ${conf.network} != ${network}`);
    return new SvmCCTPv2Executor(network as N, chain, provider, conf.contracts);
  }

  async *transfer(
    sender: AccountAddress<C>,
    recipient: ChainAddress,
    details: CCTPv2QuoteDetails
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

    // Handle referrer fee if applicable
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

    const destinationDomain = getCircleV2Domain(this.network, recipient.chain);
    const destinationAddress = recipient.address.toUniversalAddress();

    const msgSendEvent = Keypair.generate();

    const depositInstruction = await this.createCCTPv2DepositInstruction(
      usdc,
      destinationDomain,
      senderPk,
      senderAta,
      destinationAddress,
      details.remainingAmount,
      msgSendEvent.publicKey
    );

    transaction.add(depositInstruction);

    const executorProgram = new Program<Executor>(
      ExecutorIdl,
      this.executorProgramId,
      { connection: null } as any
    );

    const signedQuote = deserializeLayout(
      signedQuoteLayout,
      details.signedQuote
    );

    transaction.add(
      await executorProgram.methods
        .requestForExecution({
          amount: new BN(details.estimatedCost.toString()),
          dstChain: toChainId(recipient.chain),
          dstAddr: [...recipient.address.toUniversalAddress().toUint8Array()],
          refundAddr: senderPk,
          signedQuoteBytes: Buffer.from(details.signedQuote),
          requestBytes: CCTP_V2_REQUEST_BYTES,
          relayInstructions: Buffer.from(details.relayInstructions),
        })
        .accounts({
          payer: senderPk,
          payee: new PublicKey(signedQuote.quote.payeeAddress),
          systemProgram: SystemProgram.programId,
        })
        .instruction()
    );

    yield this.createUnsignedTx(
      { transaction, signers: [msgSendEvent] },
      "SvmCCTPv2Executor.Transfer"
    );
  }

  async isTransferCompleted(message: CircleV2Message): Promise<boolean> {
    const sourceDomainBytes = Buffer.alloc(4);
    sourceDomainBytes.writeUInt32LE(message.sourceDomain, 0);

    const nonceBytes = Buffer.from(message.nonce as any).subarray(0, 8);

    const [usedNonces] = PublicKey.findProgramAddressSync(
      [Buffer.from("used_nonces"), sourceDomainBytes, nonceBytes],
      this.messageTransmitterV2ProgramId
    );

    try {
      const accountInfo = await this.connection.getAccountInfo(usedNonces);
      return accountInfo !== null;
    } catch (e) {
      return false;
    }
  }

  async *redeem(
    sender: AccountAddress<C>,
    message: CircleV2Message,
    attestation: string
  ): AsyncGenerator<SolanaUnsignedTransaction<N, C>> {
    const senderPk = new SolanaAddress(sender).unwrap();

    const transaction = new Transaction();
    transaction.feePayer = senderPk;

    transaction.add(
      await createReceiveMessageInstruction(
        this.messageTransmitterV2ProgramId,
        this.tokenMessengerV2ProgramId,
        new PublicKey(circle.usdcContract.get(this.network, this.chain)!),
        serializeCircleV2Message(message) as any,
        attestation,
        senderPk
      )
    );

    yield this.createUnsignedTx(
      { transaction, signers: [] },
      "SvmCCTPv2Executor.Redeem"
    );
  }

  async getCurrentBlock(): Promise<bigint> {
    const slot = await this.connection.getSlot();
    return BigInt(slot);
  }

  private async createCCTPv2DepositInstruction(
    usdc: PublicKey,
    destinationDomain: number,
    senderPk: PublicKey,
    senderAta: PublicKey,
    destinationAddress: UniversalAddress,
    amount: bigint,
    msgSendEvent: PublicKey
  ): Promise<TransactionInstruction> {
    const [tokenMessenger] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_messenger")],
      this.tokenMessengerV2ProgramId
    );

    const [localToken] = PublicKey.findProgramAddressSync(
      [Buffer.from("local_token"), usdc.toBuffer()],
      this.tokenMessengerV2ProgramId
    );

    const [remoteTokenMessenger] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("remote_token_messenger"),
        Buffer.from(destinationDomain.toString()),
      ],
      this.tokenMessengerV2ProgramId
    );

    const [tokenMinter] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_minter")],
      this.tokenMessengerV2ProgramId
    );

    const [senderAuthorityPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("sender_authority")],
      this.tokenMessengerV2ProgramId
    );

    const [eventAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("__event_authority")],
      this.tokenMessengerV2ProgramId
    );

    const [denylistAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("denylist_account"), senderPk.toBuffer()],
      this.tokenMessengerV2ProgramId
    );

    const [messageTransmitter] = PublicKey.findProgramAddressSync(
      [Buffer.from("message_transmitter")],
      this.messageTransmitterV2ProgramId
    );

    const discriminator = Buffer.from([215, 60, 61, 46, 114, 55, 128, 176]);

    const amountBuffer = Buffer.alloc(8);
    amountBuffer.writeBigUInt64LE(amount);

    const domainBuffer = Buffer.alloc(4);
    domainBuffer.writeUInt32LE(destinationDomain);

    const recipientBuffer = Buffer.from(destinationAddress.toUint8Array());

    const destinationCallerBuffer = Buffer.alloc(32);

    const maxFeeBuffer = Buffer.alloc(8);
    maxFeeBuffer.writeBigUInt64LE(0n);

    const minFinalityBuffer = Buffer.alloc(4);
    minFinalityBuffer.writeUInt32LE(0);

    const data = Buffer.concat([
      discriminator,
      amountBuffer,
      domainBuffer,
      recipientBuffer,
      destinationCallerBuffer,
      maxFeeBuffer,
      minFinalityBuffer,
    ]);

    const keys = [
      { pubkey: senderPk, isSigner: true, isWritable: false },
      { pubkey: senderPk, isSigner: true, isWritable: true },
      { pubkey: senderAuthorityPda, isSigner: false, isWritable: false },
      { pubkey: senderAta, isSigner: false, isWritable: true },
      { pubkey: denylistAccount, isSigner: false, isWritable: false },
      { pubkey: messageTransmitter, isSigner: false, isWritable: true },
      { pubkey: tokenMessenger, isSigner: false, isWritable: false },
      { pubkey: remoteTokenMessenger, isSigner: false, isWritable: false },
      { pubkey: tokenMinter, isSigner: false, isWritable: false },
      { pubkey: localToken, isSigner: false, isWritable: true },
      { pubkey: usdc, isSigner: false, isWritable: true },
      { pubkey: msgSendEvent, isSigner: true, isWritable: true },
      {
        pubkey: this.messageTransmitterV2ProgramId,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: this.tokenMessengerV2ProgramId,
        isSigner: false,
        isWritable: false,
      },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: eventAuthority, isSigner: false, isWritable: false },
    ];

    return new TransactionInstruction({
      keys,
      programId: this.tokenMessengerV2ProgramId,
      data,
    });
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
