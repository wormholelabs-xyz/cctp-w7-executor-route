import type { Chain, Network } from "@wormhole-foundation/sdk-base";
import { amount } from "@wormhole-foundation/sdk-base";
import { nativeTokenId } from "@wormhole-foundation/sdk-definitions";
import { routes } from "@wormhole-foundation/sdk-connect";
import { getCircleV2FastBurnFee } from "../utils";
import {
  CircleV2FinalityThreshold,
  fastTransferETAs,
  isCircleV2Chain,
  isCircleV2FastChain,
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

// Use this function to create a new CCTPv2FastExecutorRoute with custom config
export function cctpV2FastExecutorRoute(
  config: CCTPExecutorRoute.Config = { referrerFeeDbps: 0n }
) {
  if (config.referrerFeeDbps < 0 || config.referrerFeeDbps > 65535n) {
    throw new Error("Referrer fee must be between 0 and 65535");
  }
  class CCTPv2FastExecutorRouteImpl<
    N extends Network
  > extends CCTPv2FastExecutorRoute<N> {
    static override config = config;
  }

  return CCTPv2FastExecutorRouteImpl;
}

export class CCTPv2FastExecutorRoute<N extends Network>
  extends CCTPv2BaseRoute<N>
  implements routes.StaticRouteMethods<typeof CCTPv2FastExecutorRoute>
{
  // @ts-ignore
  // Since we set the config on the static class, access it with this param
  // the CCTPv2FastExecutorRoute.config will always be empty
  readonly staticConfig = this.constructor.config;
  static config: CCTPExecutorRoute.Config = { referrerFeeDbps: 0n };

  static meta = {
    name: "CCTPv2FastExecutorRoute",
    provider: "Circle",
  };

  static supportedChains(network: Network): Chain[] {
    return Object.keys(fastTransferETAs[network] ?? {}) as Chain[];
  }

  async validate(
    request: routes.RouteTransferRequest<N>,
    params: Tp
  ): Promise<Vr> {
    const { fromChain, toChain } = request;
    // Can only transfer to Circle V2 chains
    if (
      !isCircleV2FastChain(fromChain.network, fromChain.chain) ||
      !isCircleV2Chain(toChain.network, toChain.chain)
    ) {
      return {
        valid: false,
        error: new Error("Unsupported source or destination chain"),
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

    const fastBurnFeeBps = await getCircleV2FastBurnFee(
      fromChain.network,
      fromChain.chain,
      toChain.chain
    );

    // round up or the fee may be too low and the transfer will be slow
    const fastTransferMaxFee =
      (remainingAmount * fastBurnFeeBps + 10_000n - 1n) / 10_000n;

    const receivedAmount = remainingAmount - fastTransferMaxFee;
    if (receivedAmount <= 0n) {
      return {
        success: false,
        error: new Error("Amount after fast transfer fee <= 0"),
      };
    }

    console.log(`fastBurnFeeBps: ${fastBurnFeeBps}`);
    console.log(`fastTransferMaxFee: ${fastTransferMaxFee}`);
    console.log(`receivedAmount: ${receivedAmount}`);

    const eta = fastTransferETAs[fromChain.network]?.[toChain.chain];

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
          receivedAmount,
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
        minFinalityThreshold: CircleV2FinalityThreshold.CONFIRMED,
        fastTransferMaxFee,
      } satisfies CCTPv2QuoteDetails,
    };
  }
}
