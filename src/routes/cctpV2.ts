import type { Chain, Network } from "@wormhole-foundation/sdk-base";
import {
  amount,
  circle,
  deserializeLayout,
  encoding,
  finality,
  serializeLayout,
  toChainId,
} from "@wormhole-foundation/sdk-base";
import {
  EmptyPlatformMap,
  isSameToken,
  nativeTokenId,
  TransactionId,
  UniversalAddress,
  type ChainAddress,
  type ChainContext,
  type Signer,
  type TokenId,
} from "@wormhole-foundation/sdk-definitions";
import {
  isAttested,
  isCompleted,
  isFailed,
  isSourceFinalized,
  isSourceInitiated,
  routes,
  signSendWait,
  TransferState,
  Wormhole,
} from "@wormhole-foundation/sdk-connect";
import {
  calculateReferrerFee,
  fetchCapabilities,
  fetchSignedQuote,
  fetchStatus as fetchTxStatus,
  getCircleV2Attestation,
  RelayStatus,
  sleep,
} from "../utils";
import {
  CircleV2Message,
  relayInstructionsLayout,
  signedQuoteLayout,
} from "../layouts";
import { CCTPv2Executor } from "../types";
import {
  CircleV2FinalityThreshold,
  gasLimits,
  getCircleV2Chain,
  referrers,
  shimContractsV2,
  SOLANA_MSG_VALUE_BASE_FEE,
} from "../consts";
import { Connection } from "@solana/web3.js";
import { SolanaAddress } from "@wormhole-foundation/sdk-solana";
import { QuoteDetails } from "./cctpV1";
// import { AbstractCCTPExecutorRoute } from "./baseRoute";

export namespace CCTPv2ExecutorRoute {
  export type Options = {
    // 0.0 - 1.0 percentage
    nativeGas?: number;
  };

  export type NormalizedParams = {
    amount: amount.Amount;
  };

  export interface ValidatedParams
    extends routes.ValidatedTransferParams<Options> {
    normalizedParams: NormalizedParams;
  }

  export type Config = {
    // Referrer Fee in *tenths* of basis points
    // e.g. 10 = 1 basis point (0.01%)
    referrerFeeDbps: bigint;
  };

  export type Attestation = {
    id: string;
    attestation: { message: CircleV2Message; attestation: string };
  };
}

type Op = CCTPv2ExecutorRoute.Options;
type Vp = CCTPv2ExecutorRoute.ValidatedParams;

type Tp = routes.TransferParams<Op>;
type Vr = routes.ValidationResult<Op>;

export type CCTPv2QuoteDetails = QuoteDetails & {
  fastTransferMaxFee: bigint; // The maximum fee to pay on the destination domain, specified in units of burnToken (USDC)
  minFinalityThreshold: number; // The minimum finality at which a burn message will be attested to
};

type Q = routes.Quote<Op, Vp, CCTPv2QuoteDetails>;
type QR = routes.QuoteResult<Op, Vp>;

type R = routes.Receipt<CCTPv2ExecutorRoute.Attestation>;

// The minimum rent exemption amount for a 165 byte account (e.g. an ATA)
// cache it here to avoid fetching it from the Solana RPC
let ataMinRentAmount: bigint | undefined = undefined;

// Use this function to create a new CCTPv2StandardExecutorRoute with custom config
export function cctpV2StandardExecutorRoute(
  config: CCTPv2ExecutorRoute.Config = { referrerFeeDbps: 0n }
) {
  if (config.referrerFeeDbps < 0 || config.referrerFeeDbps > 65535n) {
    throw new Error("Referrer fee must be between 0 and 65535");
  }
  class CCTPv2StandardExecutorRouteImpl<
    N extends Network
  > extends CCTPv2StandardExecutorRoute<N> {
    static override config = config;
  }

  return CCTPv2StandardExecutorRouteImpl;
}

export class CCTPv2StandardExecutorRoute<N extends Network>
  extends routes.AutomaticRoute<N, Op, Vp, R>
  // extends AbstractCCTPExecutorRoute<N, Op, Vp, R>
  implements routes.StaticRouteMethods<typeof CCTPv2StandardExecutorRoute>
{
  static NATIVE_GAS_DROPOFF_SUPPORTED = true;

  // @ts-ignore
  // Since we set the config on the static class, access it with this param
  // the CCTPv2StandardExecutorRoute.config will always be empty
  readonly staticConfig = this.constructor.config;
  static config: CCTPv2ExecutorRoute.Config = { referrerFeeDbps: 0n };

  static meta = {
    name: "CCTPv2StandardExecutorRoute",
    provider: "Circle",
  };

  static supportedNetworks(): Network[] {
    return ["Mainnet", "Testnet"];
  }

  static supportedChains(network: Network): Chain[] {
    return Object.keys(shimContractsV2[network] ?? {}) as Chain[];
  }

  static async supportedDestinationTokens<N extends Network>(
    sourceToken: TokenId,
    fromChain: ChainContext<N>,
    toChain: ChainContext<N>
  ): Promise<TokenId[]> {
    const chains = this.supportedChains(fromChain.network);
    if (!chains.includes(fromChain.chain) || !chains.includes(toChain.chain)) {
      return [];
    }

    // Ensure the source token is USDC
    const sourceChainUsdcContract = circle.usdcContract.get(
      fromChain.network,
      fromChain.chain
    );
    if (
      !(
        sourceChainUsdcContract &&
        isSameToken(
          sourceToken,
          Wormhole.tokenId(fromChain.chain, sourceChainUsdcContract)
        )
      )
    ) {
      return [];
    }

    const { network, chain } = toChain;
    if (!circle.usdcContract.has(network, chain)) return [];
    return [
      Wormhole.chainAddress(chain, circle.usdcContract.get(network, chain)!),
    ];
  }

  getDefaultOptions(): Op {
    return {
      nativeGas: 0,
    };
  }

  async validate(
    request: routes.RouteTransferRequest<N>,
    params: Tp
  ): Promise<Vr> {
    if (
      params.options?.nativeGas &&
      (params.options.nativeGas < 0 || params.options.nativeGas > 1)
    ) {
      return {
        valid: false,
        error: new Error("Invalid native gas percentage"),
        params,
      };
    }

    const validatedParams: Vp = {
      normalizedParams: {
        amount: request.parseAmount(params.amount),
      },
      options: params.options ?? this.getDefaultOptions(),
      ...params,
    };

    return { valid: true, params: validatedParams };
  }

  async quote(
    request: routes.RouteTransferRequest<N>,
    params: Vp
  ): Promise<QR> {
    const { fromChain, toChain } = request;

    const chains = CCTPv2StandardExecutorRoute.supportedChains(
      fromChain.network
    );
    if (!chains.includes(fromChain.chain) || !chains.includes(toChain.chain)) {
      return {
        success: false,
        error: new Error("Unsupported chain"),
      };
    }

    const srcUsdcAddress = circle.usdcContract.get(
      fromChain.network,
      fromChain.chain
    );
    if (!srcUsdcAddress) {
      return {
        success: false,
        error: new Error("Invalid transfer, no USDC contract on source"),
      };
    }

    const dstUsdcAddress = circle.usdcContract.get(
      toChain.network,
      toChain.chain
    );
    if (!dstUsdcAddress) {
      return {
        success: false,
        error: new Error("Invalid transfer, no USDC contract on destination"),
      };
    }

    const referrerAddress = referrers[fromChain.network]?.[fromChain.chain];
    if (!referrerAddress) {
      return {
        success: false,
        error: new Error("No referrer address found"),
      };
    }
    const referrer = Wormhole.chainAddress(fromChain.chain, referrerAddress);
    const referrerFeeDbps = this.staticConfig.referrerFeeDbps;

    const { referrerFee, remainingAmount } = calculateReferrerFee(
      amount.units(params.normalizedParams.amount),
      this.staticConfig.referrerFeeDbps
    );
    if (remainingAmount <= 0n) {
      return {
        success: false,
        error: new Error("Amount after fee <= 0"),
      };
    }

    const gasLimit = gasLimits[fromChain.network]?.[toChain.chain];
    if (!gasLimit) {
      return {
        success: false,
        error: new Error("Gas limit not found"),
      };
    }

    const capabilities = await fetchCapabilities(fromChain.network);
    const srcCapabilities = capabilities[toChainId(fromChain.chain)];
    if (!srcCapabilities) {
      return {
        success: false,
        error: new Error("Unsupported source chain"),
      };
    }

    const dstCapabilities = capabilities[toChainId(toChain.chain)];
    if (!dstCapabilities || !dstCapabilities.requestPrefixes.includes("ERC2")) {
      return {
        success: false,
        error: new Error("Unsupported destination chain"),
      };
    }

    const { recipient } = request;
    let tokenAccountExists = true;

    // Check if the associated token account (ATA) exists on Solana.
    // If it doesn't, include a gas drop-off instruction so the relayer can create it.
    // Note: There's a potential race condition — the account might exist during this check,
    // but could be closed before the transfer completes.
    if (recipient && toChain.chain === "Solana") {
      const usdcAddress = Wormhole.parseAddress("Solana", dstUsdcAddress);
      const ata = await toChain.getTokenAccount(recipient.address, usdcAddress);
      const connection: Connection = await toChain.getRpc();
      const ataAccount = await connection.getAccountInfo(
        new SolanaAddress(ata.address).unwrap()
      );
      tokenAccountExists = ataAccount !== null;
      if (!tokenAccountExists && !ataMinRentAmount) {
        ataMinRentAmount = BigInt(
          await connection.getMinimumBalanceForRentExemption(165)
        );
      }
    }

    let msgValue = 0n;
    if (toChain.chain === "Solana") {
      msgValue += SOLANA_MSG_VALUE_BASE_FEE;
      if (!tokenAccountExists && ataMinRentAmount) {
        msgValue += ataMinRentAmount;
      }
    }

    const relayRequests = [];

    // Add the gas instruction
    relayRequests.push({
      request: {
        type: "GasInstruction" as const,
        gasLimit,
        msgValue,
      },
    });

    // Calculate the gas dropOff value
    const gasDropOffLimit = BigInt(dstCapabilities.gasDropOffLimit);
    const dropOff =
      params.options.nativeGas && gasDropOffLimit > 0n
        ? (BigInt(Math.round(params.options.nativeGas * 100)) *
            gasDropOffLimit) /
          100n
        : 0n;

    // Add the gas drop-off instruction if applicable
    if (dropOff > 0n || !tokenAccountExists) {
      relayRequests.push({
        request: {
          type: "GasDropOffInstruction" as const,
          dropOff,
          // If the recipient is undefined (e.g. the user hasn’t connected their wallet yet),
          // we temporarily use a dummy address to fetch a quote.
          // The recipient address is validated later in the `initiate` method, which will throw if it's still missing.
          recipient: recipient
            ? recipient.address.toUniversalAddress()
            : new UniversalAddress(new Uint8Array(32)),
        },
      });
    }

    const relayInstructions = serializeLayout(relayInstructionsLayout, {
      requests: relayRequests,
    });

    const quote = await fetchSignedQuote(
      fromChain.network,
      fromChain.chain,
      toChain.chain,
      encoding.hex.encode(relayInstructions, true)
    );

    if (!quote.estimatedCost) {
      return {
        success: false,
        error: new Error("No estimated cost"),
      };
    }

    const signedQuoteBytes = encoding.hex.decode(quote.signedQuote);
    const signedQuote = deserializeLayout(signedQuoteLayout, signedQuoteBytes);

    // https://developers.circle.com/stablecoins/docs/required-block-confirmations
    const eta =
      fromChain.chain === "Polygon"
        ? 2_000 * 200
        : finality.estimateFinalityTime(fromChain.chain) + 1_000; // buffer for the relayer

    const estimatedCost = BigInt(quote.estimatedCost);

    const details: CCTPv2QuoteDetails = {
      signedQuote: signedQuoteBytes,
      relayInstructions: relayInstructions,
      estimatedCost,
      referrer,
      referrerFee,
      remainingAmount,
      referrerFeeDbps,
      minFinalityThreshold: CircleV2FinalityThreshold.STANDARD,
      fastTransferMaxFee: 0n, // no fee for standard / slow transfer
    };

    const [srcNativeDecimals, dstNativeDecimals] = await Promise.all([
      fromChain.getDecimals("native"),
      toChain.getDecimals("native"),
    ]);

    return {
      success: true,
      params,
      sourceToken: {
        token: request.source.id,
        amount: params.normalizedParams.amount,
      },
      destinationToken: {
        token: request.destination.id,
        amount: amount.fromBaseUnits(
          remainingAmount,
          request.destination.decimals
        ),
      },
      relayFee: {
        token: nativeTokenId(fromChain.chain),
        amount: amount.fromBaseUnits(estimatedCost, srcNativeDecimals),
      },
      destinationNativeGas: amount.fromBaseUnits(dropOff, dstNativeDecimals),
      eta,
      expires: signedQuote.quote.expiryTime,
      details,
    };
  }

  async initiate(
    request: routes.RouteTransferRequest<N>,
    signer: Signer,
    quote: Q,
    to: ChainAddress
  ): Promise<R> {
    if (!quote.details) {
      throw new Error("Missing quote details");
    }

    const relayInstructions = deserializeLayout(
      relayInstructionsLayout,
      quote.details.relayInstructions
    );

    // Make sure that the gas drop-off recipient matches the actual recipient
    relayInstructions.requests.forEach(({ request }) => {
      if (
        request.type === "GasDropOffInstruction" &&
        !request.recipient.equals(to.address.toUniversalAddress())
      ) {
        throw new Error("Gas drop-off recipient does not match");
      }
    });

    const executor = await request.fromChain.getProtocol("CCTPv2Executor");
    const sender = Wormhole.parseAddress(signer.chain(), signer.address());

    // When transferring to Solana, the recipient address is the ATA for CCTP transfers
    let cctpRecipient = to;
    if (to.chain === "Solana") {
      const usdcAddress = Wormhole.parseAddress(
        "Solana",
        circle.usdcContract.get(request.toChain.network, request.toChain.chain)!
      );
      cctpRecipient = await request.toChain.getTokenAccount(
        to.address,
        usdcAddress
      );
    }

    const xfer = await executor.transfer(sender, cctpRecipient, quote.details);

    const txids = await signSendWait(request.fromChain, xfer, signer);

    // Status the transfer immediately before returning
    let statusAttempts = 0;

    const statusTransferImmediately = async () => {
      while (statusAttempts < 20) {
        try {
          const [txStatus] = await fetchTxStatus(
            this.wh.network,
            txids.at(-1)!.txid,
            request.fromChain.chain
          );

          if (txStatus) {
            break;
          }
        } catch (_) {
          // is ok we just try again!
        }
        statusAttempts++;
        await sleep(2_000);
      }
    };

    // Spawn a loop in the background that will status this transfer until
    // the API gives a successful response. We don't await the result
    // here because we don't need it for the return value.
    statusTransferImmediately();

    return {
      from: request.fromChain.chain,
      to: request.toChain.chain,
      state: TransferState.SourceInitiated,
      originTxs: txids,
    };
  }

  public override async *track(receipt: R, timeout?: number) {
    if (isCompleted(receipt)) return receipt;

    let leftover = timeout ? timeout : 60 * 60 * 1000;
    while (leftover > 0) {
      const start = Date.now();

      if (
        isSourceInitiated(receipt) ||
        isSourceFinalized(receipt) ||
        isAttested(receipt) ||
        isFailed(receipt)
      ) {
        try {
          const txId: string = receipt.originTxs.at(-1)!.txid;

          // First we fetch the circle attestation
          if (isSourceInitiated(receipt) || isSourceFinalized(receipt)) {
            const attestation = await getCircleV2Attestation(
              { chain: receipt.from, txid: txId },
              this.wh.network
            );

            if (attestation) {
              receipt = {
                ...receipt,
                state: TransferState.Attested,
                attestation: {
                  id: txId,
                  attestation,
                },
              };
            }
            yield receipt;
          }

          // Next we check the relay status
          // This will either mark it as completed or failed
          if (isAttested(receipt)) {
            const [txStatus] = await fetchTxStatus(
              this.wh.network,
              txId,
              receipt.from
            );

            if (!txStatus) {
              throw new Error("No transaction status found");
            }

            const relayStatus = txStatus?.status;

            if (relayStatus === RelayStatus.Submitted) {
              receipt = {
                ...receipt,
                state: TransferState.DestinationFinalized,
              };
            } else if (
              relayStatus === RelayStatus.Failed || // this could happen if simulation fails
              relayStatus === RelayStatus.Underpaid || // only happens if you don't pay at least the costEstimate
              relayStatus === RelayStatus.Unsupported || // capabilities check didn't pass
              relayStatus === RelayStatus.Aborted // An unrecoverable error indicating the attempt should stop (bad data, pre-flight checks failed, or chain-specific conditions)
            ) {
              receipt = {
                ...receipt,
                state: TransferState.Failed,
                error: new routes.RelayFailedError(
                  `Relay failed with status: ${relayStatus}`
                ),
              };
              yield receipt;
            }
          }

          // If the relay failed, then we check if it was completed
          // through another method (e.g. manual delivery)
          if (isFailed(receipt)) {
            if (!receipt.attestation) {
              // This should never happen since we set the attestation
              // on the receipt before checking the relay status
              throw new Error("Attestation on failed transfer is missing");
            }

            const attestation: CCTPv2ExecutorRoute.Attestation =
              receipt.attestation;

            const executor = await this.wh
              .getChain(receipt.to)
              .getProtocol("CCTPv2Executor");

            const isTransferCompleted = await executor.isTransferCompleted(
              attestation.attestation.message
            );

            if (isTransferCompleted) {
              receipt = {
                ...receipt,
                state: TransferState.DestinationFinalized,
                attestation,
              };
            }
            yield receipt;
          }

          // Important to yield before checking for completion
          // so the caller can update the receipt state
          yield receipt;

          if (isCompleted(receipt)) {
            return receipt;
          }
        } catch (error: any) {
          console.error(
            `Error fetching transaction status: ${error.message || error}`
          );
        }
      }

      // Sleep so we don't spam the endpoint
      await new Promise((resolve) => setTimeout(resolve, 3000));
      leftover -= Date.now() - start;
    }

    return receipt;
  }

  public async complete(signer: Signer, receipt: R): Promise<R> {
    if (!isAttested(receipt) && !isFailed(receipt)) {
      throw new Error("Transfer is not attested");
    }

    if (!receipt.attestation) {
      throw new Error("No attestation found");
    }

    const sender = Wormhole.parseAddress(signer.chain(), signer.address());
    const toChain = this.wh.getChain(receipt.to);
    const executor = await toChain.getProtocol("CCTPv2Executor");
    const { attestation, message } = receipt.attestation.attestation;
    const xfer = executor.redeem(sender, message, attestation);

    const dstTxIds = await signSendWait(
      this.wh.getChain(receipt.to),
      xfer,
      signer
    );

    return {
      ...receipt,
      state: TransferState.DestinationInitiated,
      attestation: receipt.attestation,
      destinationTxs: dstTxIds,
    };
  }

  public async resume(tx: TransactionId): Promise<R> {
    const attestation = await getCircleV2Attestation(tx, this.wh.network);
    if (!attestation) throw new Error("No attestation found");

    const { message } = attestation;

    const to = getCircleV2Chain(this.wh.network, message.destinationDomain);

    const executor = await this.wh.getChain(to).getProtocol("CCTPv2Executor");

    const isCompleted = await executor.isTransferCompleted(message);
    if (isCompleted) {
      return {
        from: tx.chain,
        to,
        state: TransferState.DestinationFinalized,
        originTxs: [tx],
        attestation: { id: tx.txid, attestation },
      };
    }

    return {
      from: tx.chain,
      to,
      state: TransferState.Attested,
      originTxs: [tx],
      attestation: { id: tx.txid, attestation },
    };
  }
}

declare module "@wormhole-foundation/sdk-definitions" {
  export namespace WormholeRegistry {
    interface ProtocolToInterfaceMapping<N, C> {
      CCTPv2Executor: CCTPv2Executor<N, C>;
    }
    interface ProtocolToPlatformMapping {
      CCTPv2Executor: EmptyPlatformMap<"CCTPv2Executor">;
    }
  }
}
