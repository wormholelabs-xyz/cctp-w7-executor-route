import type { Network } from "@wormhole-foundation/sdk-base";
import { amount, finality } from "@wormhole-foundation/sdk-base";
import {
  ChainContext,
  isSameToken,
  nativeTokenId,
  TokenId,
} from "@wormhole-foundation/sdk-definitions";
import { routes, Wormhole } from "@wormhole-foundation/sdk-connect";
import {
  CircleV2FinalityThreshold,
  isCircleV2Chain,
  usdcContracts,
} from "../consts";
import {
  CCTPv2BaseRoute,
  CCTPv2ExecutorRoute,
  CCTPv2QuoteDetails,
  Qr,
  Tp,
  Vp,
  Vr,
} from "./cctpV2Base";
import { fetchExecutorQuote } from "./helpers";

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
  extends CCTPv2BaseRoute<N>
  implements routes.StaticRouteMethods<typeof CCTPv2StandardExecutorRoute>
{
  // @ts-ignore
  // Since we set the config on the static class, access it with this param
  // the CCTPv2StandardExecutorRoute.config will always be empty
  readonly staticConfig = this.constructor.config;
  static config: CCTPv2ExecutorRoute.Config = { referrerFeeDbps: 0n };

  static meta = {
    name: "CCTPv2StandardExecutorRoute",
    provider: "Circle",
  };

  static async supportedDestinationTokens<N extends Network>(
    sourceToken: TokenId,
    fromChain: ChainContext<N>,
    toChain: ChainContext<N>
  ): Promise<TokenId[]> {
    if (
      !isCircleV2Chain(fromChain.network, fromChain.chain) ||
      !isCircleV2Chain(toChain.network, toChain.chain)
    ) {
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

  async validate(
    request: routes.RouteTransferRequest<N>,
    params: Tp
  ): Promise<Vr> {
    const { fromChain, toChain } = request;
    if (
      !isCircleV2Chain(fromChain.network, fromChain.chain) ||
      !isCircleV2Chain(toChain.network, toChain.chain)
    ) {
      return {
        valid: false,
        error: new Error("Can only transfer between Circle V2 chains"),
        params,
      };
    }

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
  ): Promise<Qr> {
    const { fromChain, toChain } = request;

    try {
      const quoteDetails = await fetchExecutorQuote(
        request,
        params,
        this.staticConfig.referrerFeeDbps,
        "ERC2"
      );

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
        destinationNativeGas: amount.fromBaseUnits(
          gasDropOff,
          dstNativeDecimals
        ),
        eta,
        expires: expiryTime,
        details: {
          ...quoteDetails,
          minFinalityThreshold: CircleV2FinalityThreshold.FINALIZED,
          fastTransferMaxFee: 0n, // no fee for standard / slow transfer
        } satisfies CCTPv2QuoteDetails,
      };
    } catch (e) {
      return {
        success: false,
        error: new Error(e instanceof Error ? e.message : `${e}`),
      };
    }
  }
}
