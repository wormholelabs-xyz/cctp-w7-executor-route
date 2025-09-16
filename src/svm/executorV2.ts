import { BN, Program, utils } from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  AccountMeta,
  Connection,
  Keypair,
  PublicKey,
  PublicKeyInitData,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { encoding } from "@wormhole-foundation/sdk-base";
import {
  circle,
  deserializeLayout,
  toChainId,
  UniversalAddress,
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
import {
  circleV2Contracts,
  circleV2SvmLut,
  getCircleV2Domain,
  solanaExecutorId,
} from "../consts";
import {
  CircleV2Message,
  serializeCircleV2Message,
  signedQuoteLayout,
} from "../layouts";
import { CCTPv2QuoteDetails } from "../routes/cctpV2Base";
import { CCTPv2Executor } from "../types";
import { MessageTransmitterV2 } from "./idl/CCTPV2Sm4AdWt5296sk4P66VBZ7bEhcARwFaaS9YPbeC-idl";
import MessageTransmitterV2Idl from "./idl/CCTPV2Sm4AdWt5296sk4P66VBZ7bEhcARwFaaS9YPbeC-idl.json";
import { TokenMessengerMinterV2 } from "./idl/CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe-id";
import TokenMessengerMinterV2Idl from "./idl/CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe-id.json";
import { Executor, ExecutorIdl } from "./idl/executor";

const CCTP_V2_REQUEST_BYTES = Buffer.from("4552433201", "hex");

interface FindProgramAddressResponse {
  publicKey: PublicKey;
  bump: number;
}

const findProgramAddress = (
  label: string,
  programId: PublicKey,
  extraSeeds?: (string | number[] | Buffer | PublicKey)[]
): FindProgramAddressResponse => {
  const seeds = [Buffer.from(utils.bytes.utf8.encode(label))];
  if (extraSeeds) {
    for (const extraSeed of extraSeeds) {
      if (typeof extraSeed === "string") {
        seeds.push(Buffer.from(utils.bytes.utf8.encode(extraSeed)));
      } else if (Array.isArray(extraSeed)) {
        seeds.push(Buffer.from(extraSeed as number[]));
      } else if (Buffer.isBuffer(extraSeed)) {
        seeds.push(Buffer.from(extraSeed));
      } else {
        seeds.push(Buffer.from(extraSeed.toBuffer()));
      }
    }
  }
  const res = PublicKey.findProgramAddressSync(seeds, programId);
  return { publicKey: res[0], bump: res[1] };
};

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

    const instructions: TransactionInstruction[] = [];

    // Handle referrer fee if applicable
    if (details.referrerFee > 0n) {
      const referrerAta = getAssociatedTokenAddressSync(usdc, referrer, true);
      const referrerAtaAccount = await this.connection.getAccountInfo(
        referrerAta
      );
      if (!referrerAtaAccount) {
        instructions.push(
          createAssociatedTokenAccountIdempotentInstruction(
            senderPk,
            referrerAta,
            referrer,
            usdc
          )
        );
      }
      instructions.push(
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

    instructions.push(depositInstruction);

    const executorProgram = new Program<Executor>(
      ExecutorIdl,
      this.executorProgramId,
      { connection: null } as any
    );

    const signedQuote = deserializeLayout(
      signedQuoteLayout,
      details.signedQuote
    );

    instructions.push(
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

    const lutAddress = circleV2SvmLut[this.network]?.[this.chain];

    const transaction = await this.createVersionedTransaction(
      senderPk,
      instructions,
      lutAddress
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

    const instructions: TransactionInstruction[] = [];

    instructions.push(
      await this.createReceiveMessageInstructionV2(
        this.messageTransmitterV2ProgramId,
        this.tokenMessengerV2ProgramId,
        new PublicKey(circle.usdcContract.get(this.network, this.chain)!),
        message,
        attestation,
        senderPk
      )
    );

    const lutAddress = circleV2SvmLut[this.network]?.[this.chain];

    const transaction = await this.createVersionedTransaction(
      senderPk,
      instructions,
      lutAddress
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

  async createVersionedTransaction(
    payerKey: PublicKey,
    instructions: TransactionInstruction[],
    lutAddress?: PublicKeyInitData
  ) {
    const lookupTableAccount = lutAddress
      ? (await this.connection.getAddressLookupTable(new PublicKey(lutAddress)))
          .value
      : null;

    const { blockhash: recentBlockhash } =
      await this.connection.getLatestBlockhash();

    const messageV0 = new TransactionMessage({
      payerKey,
      recentBlockhash,
      instructions,
    }).compileToV0Message(lookupTableAccount ? [lookupTableAccount] : []);

    return new VersionedTransaction(messageV0);
  }

  private async createReceiveMessageInstructionV2(
    messageTransmitterProgramId: PublicKey,
    tokenMessengerProgramId: PublicKey,
    usdcAddress: PublicKey,
    message: CircleV2Message,
    attestation: string,
    payer: PublicKey
  ): Promise<TransactionInstruction> {
    const messageBytes = Buffer.from(serializeCircleV2Message(message));
    const attestationBytes = Buffer.from(
      encoding.stripPrefix("0x", attestation),
      "hex"
    );

    const solanaUsdcAddress = new PublicKey(usdcAddress);

    const sourceUsdcAddress = new PublicKey(
      Buffer.from(message.messageBody.burnToken.toUint8Array())
    );

    const receiver = new PublicKey(
      message.messageBody.mintRecipient.toUint8Array()
    );
    const srcDomain = message.sourceDomain.toString();

    // V2 uses the message nonce directly as seed (different from V1)
    const usedNonce = this.nonceAccountV2(
      messageTransmitterProgramId,
      messageBytes
    );

    const messageTransmitterAccount = findProgramAddress(
      "message_transmitter",
      messageTransmitterProgramId
    );
    const tokenMessenger = findProgramAddress(
      "token_messenger",
      tokenMessengerProgramId
    );
    const tokenMinter = findProgramAddress(
      "token_minter",
      tokenMessengerProgramId
    );
    const localToken = findProgramAddress(
      "local_token",
      tokenMessengerProgramId,
      [solanaUsdcAddress]
    );
    const remoteTokenMessengerKey = findProgramAddress(
      "remote_token_messenger",
      tokenMessengerProgramId,
      [srcDomain]
    );
    const tokenPair = findProgramAddress(
      "token_pair",
      tokenMessengerProgramId,
      [srcDomain, sourceUsdcAddress]
    );

    const custodyTokenAccount = findProgramAddress(
      "custody",
      tokenMessengerProgramId,
      [solanaUsdcAddress]
    );

    const tokenMessengerEventAuthority = findProgramAddress(
      "__event_authority",
      tokenMessengerProgramId
    );

    // Fetch the fee recipient token account
    const tokenMessengerMinterProgram = new Program<TokenMessengerMinterV2>(
      TokenMessengerMinterV2Idl as TokenMessengerMinterV2,
      this.messageTransmitterV2ProgramId,
      { connection: this.connection } as any
    );

    const tokenMessengerData =
      await tokenMessengerMinterProgram.account.tokenMessenger.fetch(
        tokenMessenger.publicKey
      );

    const feeRecipientTokenAccount = getAssociatedTokenAddressSync(
      solanaUsdcAddress,
      tokenMessengerData.feeRecipient
    );

    const accountMetas: AccountMeta[] = [
      {
        isSigner: false,
        isWritable: false,
        pubkey: tokenMessenger.publicKey,
      },
      {
        isSigner: false,
        isWritable: false,
        pubkey: remoteTokenMessengerKey.publicKey,
      },
      {
        isSigner: false,
        isWritable: true,
        pubkey: tokenMinter.publicKey,
      },
      {
        isSigner: false,
        isWritable: true,
        pubkey: localToken.publicKey,
      },
      {
        isSigner: false,
        isWritable: false,
        pubkey: tokenPair.publicKey,
      },

      // fee recipient token account has to be BEFORE the receiver
      {
        isSigner: false,
        isWritable: true,
        pubkey: feeRecipientTokenAccount,
      },
      {
        isSigner: false,
        isWritable: true,
        pubkey: receiver,
      },
      {
        isSigner: false,
        isWritable: true,
        pubkey: custodyTokenAccount.publicKey,
      },
      {
        isSigner: false,
        isWritable: false,
        pubkey: TOKEN_PROGRAM_ID,
      },
      {
        isSigner: false,
        isWritable: false,
        pubkey: tokenMessengerEventAuthority.publicKey,
      },
      {
        isSigner: false,
        isWritable: false,
        pubkey: tokenMessengerProgramId,
      },
    ];

    const messageTransmitterProgram = new Program<MessageTransmitterV2>(
      MessageTransmitterV2Idl as MessageTransmitterV2,
      this.messageTransmitterV2ProgramId,
      { connection: null } as any
    );

    return await messageTransmitterProgram.methods
      .receiveMessage({
        message: messageBytes,
        attestation: attestationBytes,
      })
      .accounts({
        payer,
        caller: payer,
        messageTransmitter: messageTransmitterAccount.publicKey,
        usedNonce,
        receiver: tokenMessengerProgramId,
        program: messageTransmitterProgram.programId,
      })
      .remainingAccounts(accountMetas)
      .instruction();
  }

  private nonceAccountV2(
    messageTransmitterProgramId: PublicKey,
    messageBytes: Buffer
  ): PublicKey {
    // V2 uses the message nonce directly from the message bytes as seed
    // Based on Rust code: &params.message[Message::NONCE_INDEX..Message::SENDER_INDEX]
    const NONCE_INDEX = 12;
    const SENDER_INDEX = 44;
    const nonceBytes = messageBytes.slice(NONCE_INDEX, SENDER_INDEX);

    const usedNonce = findProgramAddress(
      "used_nonce",
      messageTransmitterProgramId,
      [nonceBytes]
    ).publicKey;

    return usedNonce;
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
      {
        pubkey: this.tokenMessengerV2ProgramId,
        isSigner: false,
        isWritable: false,
      },
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
