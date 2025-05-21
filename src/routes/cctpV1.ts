import type { Chain, Network } from "@wormhole-foundation/sdk-base";
import {
  amount,
  deserializeLayout,
  finality,
} from "@wormhole-foundation/sdk-base";
import {
  EmptyPlatformMap,
  isSameToken,
  nativeTokenId,
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
import { fetchStatus as fetchTxStatus, RelayStatus, sleep } from "../utils";
import { relayInstructionsLayout } from "../layouts";
import { CCTPExecutor } from "../types";
import { shimContractsV1, usdcContracts } from "../consts";
import { fetchQuoteDetails } from "./helpers";

export namespace CCTPExecutorRoute {
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
}

type Op = CCTPExecutorRoute.Options;
type Vp = CCTPExecutorRoute.ValidatedParams;

type Tp = routes.TransferParams<Op>;
type Vr = routes.ValidationResult<Op>;

export type QuoteDetails = {
  signedQuote: Uint8Array; // The signed quote from the /v0/quote endpoint
  relayInstructions: Uint8Array; // The relay instructions for the transfer
  estimatedCost: bigint; // The estimated cost of the transfer
  referrer: ChainAddress; // The referrer address (to whom the referrer fee should be paid)
  referrerFee: bigint; // The referrer fee in USDC
  remainingAmount: bigint; // The remaining amount after the referrer fee in USDC
  referrerFeeDbps: bigint; // The referrer fee in *tenths* of basis points
  expiryTime: Date; // The expiry time of the quote
  gasDropOff: bigint; // The gas drop-off amount in native token units
};

type Q = routes.Quote<Op, Vp, QuoteDetails>;
type QR = routes.QuoteResult<Op, Vp>;

// Note: The attestation could be the Circle message.
// However, fetching it would introduce a dependency on the Circle protocol,
// and the attestation is not needed for the route to work.
type AT = { id: string; attestation: {} };
type R = routes.Receipt<AT>;

// Use this function to create a new CCTPExecutorRoute with custom config
export function cctpExecutorRoute(
  config: CCTPExecutorRoute.Config = { referrerFeeDbps: 0n }
) {
  if (config.referrerFeeDbps < 0 || config.referrerFeeDbps > 65535n) {
    throw new Error("Referrer fee must be between 0 and 65535");
  }
  class CCTPExecutorRouteImpl<N extends Network> extends CCTPExecutorRoute<N> {
    static override config = config;
  }

  return CCTPExecutorRouteImpl;
}

// CCTPv1
export class CCTPExecutorRoute<N extends Network>
  extends routes.AutomaticRoute<N, Op, Vp, R>
  implements routes.StaticRouteMethods<typeof CCTPExecutorRoute>
{
  static NATIVE_GAS_DROPOFF_SUPPORTED = true;

  // @ts-ignore
  // Since we set the config on the static class, access it with this param
  // the CCTPExecutorRoute.config will always be empty
  readonly staticConfig = this.constructor.config;
  static config: CCTPExecutorRoute.Config = { referrerFeeDbps: 0n };

  static meta = {
    name: "CCTPExecutorRoute",
    provider: "Circle",
  };

  static supportedNetworks(): Network[] {
    return ["Mainnet", "Testnet"];
  }

  static supportedChains(network: Network): Chain[] {
    return [...Object.keys(shimContractsV1[network] ?? {}), "Sui"] as Chain[];
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
    const sourceChainUsdcContract =
      usdcContracts[fromChain.network]?.[fromChain.chain];
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
    const destChainUsdcContract = usdcContracts[network]?.[chain];
    if (!destChainUsdcContract) return [];
    return [Wormhole.chainAddress(chain, destChainUsdcContract)];
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

    const quoteDetails = await fetchQuoteDetails(
      request,
      params,
      this.staticConfig.referrerFeeDbps,
      CCTPExecutorRoute.supportedChains(fromChain.network),
      "ERC1"
    );

    if (quoteDetails instanceof Error) {
      return {
        success: false,
        error: quoteDetails,
      };
    }

    const { remainingAmount, estimatedCost, gasDropOff, expiryTime } =
      quoteDetails;

    // https://developers.circle.com/stablecoins/docs/required-block-confirmations
    const eta =
      fromChain.chain === "Polygon"
        ? 2_000 * 200
        : finality.estimateFinalityTime(fromChain.chain) + 1_000; // buffer for the relayer

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
      destinationNativeGas: amount.fromBaseUnits(gasDropOff, dstNativeDecimals),
      eta,
      expires: expiryTime,
      details: quoteDetails,
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

    const executor = await request.fromChain.getProtocol("CCTPExecutor");
    const sender = Wormhole.parseAddress(signer.chain(), signer.address());

    // When transferring to Solana, the recipient address is the ATA for CCTP transfers
    let cctpRecipient = to;
    if (to.chain === "Solana") {
      const solanaUsdc =
        usdcContracts[request.toChain.network]?.[request.toChain.chain];
      if (!solanaUsdc) throw new Error("No USDC contract found for Solana");

      const usdcAddress = Wormhole.parseAddress("Solana", solanaUsdc);
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
    if (isCompleted(receipt) || isFailed(receipt)) return receipt;

    let leftover = timeout ? timeout : 60 * 60 * 1000;
    while (leftover > 0) {
      const start = Date.now();

      if (
        isSourceInitiated(receipt) ||
        isSourceFinalized(receipt) ||
        isAttested(receipt)
      ) {
        try {
          const [txStatus] = await fetchTxStatus(
            this.wh.network,
            receipt.originTxs.at(-1)!.txid,
            receipt.from
          );

          if (!txStatus) {
            throw new Error("No transaction status found");
          }

          const relayStatus = txStatus?.status;

          if (
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
          }

          if (relayStatus === RelayStatus.Submitted) {
            receipt = {
              ...receipt,
              state: TransferState.DestinationFinalized,
              attestation: { id: txStatus.id, attestation: {} },
            };
          }

          // Important to yield before checking for completion
          // so the caller can update the receipt state
          yield receipt;

          if (isCompleted(receipt) || isFailed(receipt)) {
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
}

declare module "@wormhole-foundation/sdk-definitions" {
  export namespace WormholeRegistry {
    interface ProtocolToInterfaceMapping<N, C> {
      CCTPExecutor: CCTPExecutor<N, C>;
    }
    interface ProtocolToPlatformMapping {
      CCTPExecutor: EmptyPlatformMap<"CCTPExecutor">;
    }
  }
}
