import type { Chain, Network } from "@wormhole-foundation/sdk-base";
import { amount, finality } from "@wormhole-foundation/sdk-base";
import { nativeTokenId } from "@wormhole-foundation/sdk-definitions";
import { routes } from "@wormhole-foundation/sdk-connect";
import {
  circleV2Domains,
  CircleV2FinalityThreshold,
  isCircleV2Chain,
} from "../consts";
import {
  CCTPv2BaseRoute,
  CCTPv2QuoteDetails,
  Qr,
  Tp,
  Vp,
  Vr,
} from "./cctpV2Base";
import { CCTPExecutorRoute } from "./cctpV1";
import { fetchQuoteDetails } from "./helpers";

// Use this function to create a new CCTPv2StandardExecutorRoute with custom config
export function cctpV2StandardExecutorRoute(
  config: CCTPExecutorRoute.Config = { referrerFeeDbps: 0n }
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
  static config: CCTPExecutorRoute.Config = { referrerFeeDbps: 0n };

  static meta = {
    name: "CCTPv2StandardExecutorRoute",
    provider: "Circle",
  };

  static supportedChains(network: Network): Chain[] {
    return Object.keys(circleV2Domains[network] ?? {}) as Chain[];
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
        error: new Error("Invalid transfer, not a Circle V2 chain"),
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

    const quoteDetails = await fetchQuoteDetails(
      request,
      params,
      this.staticConfig.referrerFeeDbps,
      "ERC2"
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
      details: {
        ...quoteDetails,
        minFinalityThreshold: CircleV2FinalityThreshold.FINALIZED,
        fastTransferMaxFee: 0n, // no fee for standard / slow transfer
      } satisfies CCTPv2QuoteDetails,
    };
  }
}
