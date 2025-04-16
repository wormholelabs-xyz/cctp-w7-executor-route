import type { Chain, Network } from "@wormhole-foundation/sdk-base";
import {
  amount,
  circle,
  contracts,
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
  type ChainAddress,
  type ChainContext,
  type Signer,
  type TokenId,
} from "@wormhole-foundation/sdk-definitions";
import {
  CircleTransfer,
  routes,
  signSendWait,
  TransferState,
  Wormhole,
} from "@wormhole-foundation/sdk-connect";
import { fetchCapabilities, fetchSignedQuote } from "./utils";
import { relayInstructionsLayout, signedQuoteLayout } from "./layouts";
import { CCTPW7Executor } from "./types";

// TODO: move elsewhere?
// IMPORTANT: import these packages so the protocol gets registered
import "./evm/index.js";

export namespace CCTPW7ExecutorRoute {
  export type Options = {
    // 0.0 - 1.0 percentage
    nativeGas?: number;
  };

  export type NormalizedParams = {
    amount: amount.Amount;
    // fee: amount.Amount;
    // nativeGasAmount: amount.Amount;
  };

  export interface ValidatedParams
    extends routes.ValidatedTransferParams<Options> {
    normalizedParams: NormalizedParams;
  }
}

type Op = CCTPW7ExecutorRoute.Options;
type Vp = CCTPW7ExecutorRoute.ValidatedParams;

type Tp = routes.TransferParams<Op>;
type Vr = routes.ValidationResult<Op>;

type D = {
  signedQuote: Uint8Array;
  relayInstructions: Uint8Array;
  estimatedCost: bigint;
};

type Q = routes.Quote<Op, Vp, D>;
type QR = routes.QuoteResult<Op, Vp>;
type R = routes.Receipt<CircleTransfer.AttestationReceipt>;

export class CCTPW7ExecutorRoute<N extends Network>
  extends routes.AutomaticRoute<N, Op, Vp, R>
  implements routes.StaticRouteMethods<typeof CCTPW7ExecutorRoute>
{
  static NATIVE_GAS_DROPOFF_SUPPORTED = true;

  static meta = {
    name: "CCTPW7ExecutorRoute",
    provider: "W7 Executor",
  };

  static supportedNetworks(): Network[] {
    return ["Mainnet", "Testnet"];
  }

  static supportedChains(network: Network): Chain[] {
    if (contracts.circleContractChains.has(network)) {
      return contracts.circleContractChains.get(network)!;
    }
    return [];
  }

  static async supportedDestinationTokens<N extends Network>(
    sourceToken: TokenId,
    fromChain: ChainContext<N>,
    toChain: ChainContext<N>
  ): Promise<TokenId[]> {
    // Ensure the source token is USDC
    const sourceChainUsdcContract = circle.usdcContract.get(
      fromChain.network,
      fromChain.chain
    );
    if (!sourceChainUsdcContract) return [];
    if (
      !isSameToken(
        sourceToken,
        Wormhole.tokenId(fromChain.chain, sourceChainUsdcContract)
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
    const amt = request.parseAmount(params.amount);

    const validatedParams: Vp = {
      normalizedParams: {
        amount: amt,
        // fee: ,
        // nativeGasAmount: params.options?.nativeGas ?? 0n
      },
      options: params.options ?? this.getDefaultOptions(),
      ...params,
    };

    return { valid: true, params: validatedParams };

    //try {
    //  const options = params.options ?? this.getDefaultOptions();
    //  const normalizedParams = await this.normalizeTransferParams(request, params);

    //  const validatedParams: Vp = {
    //    normalizedParams,
    //    options,
    //    ...params,
    //  };

    //  return { valid: true, params: validatedParams };
    //} catch (e) {
    //  return {
    //    valid: false,
    //    params,
    //    error: e as Error,
    //  };
    //}
  }

  async quote(
    request: routes.RouteTransferRequest<N>,
    params: Vp
  ): Promise<QR> {
    const { fromChain, toChain } = request;

    const srcUsdcAddress = circle.usdcContract.get(
      fromChain.network,
      fromChain.chain
    );
    if (!srcUsdcAddress)
      throw new Error("Invalid transfer, no USDC contract on source");

    const dstUsdcAddress = circle.usdcContract.get(
      toChain.network,
      toChain.chain
    );
    if (!dstUsdcAddress)
      throw new Error("Invalid transfer, no USDC contract on destination");

    const capabilities = await fetchCapabilities();
    if (!capabilities[toChainId(fromChain.chain)]) {
      return {
        success: false,
        error: new Error("Unsupported source chain"),
      };
    }

    if (
      !capabilities[toChainId(toChain.chain)]?.requestPrefixes.includes("ERC1")
    ) {
      return {
        success: false,
        error: new Error("Unsupported destination chain"),
      };
    }

    const gasLimit = 300_000n; // TODO: what to set gas limit to, make this tunable?

    const relayInstructions = serializeLayout(relayInstructionsLayout, {
      requests: [
        { request: { type: "GasInstruction", gasLimit, msgValue: 0n } },
      ],
      // TODO: add gas drop-off instruction
    });

    const quote = await fetchSignedQuote(
      fromChain.chain,
      toChain.chain,
      // TODO: should serialize convert to a `0x${string}` for us?
      encoding.hex.encode(relayInstructions, true)
    );

    const signedQuote = deserializeLayout(
      signedQuoteLayout,
      encoding.hex.decode(quote.signedQuote)
    );

    // https://developers.circle.com/stablecoins/docs/required-block-confirmations
    const eta =
      fromChain.chain === "Polygon"
        ? 2_000 * 200
        : finality.estimateFinalityTime(fromChain.chain);

    const srcNativeDecimals = await fromChain.getDecimals("native");

    return {
      success: true,
      params,
      sourceToken: {
        token: request.source.id,
        amount: params.normalizedParams.amount,
      },
      destinationToken: {
        token: request.destination.id,
        amount: params.normalizedParams.amount,
      },
      // TODO: what to set the relayFee to? how does gas drop-off affect this?
      relayFee: {
        token: nativeTokenId(fromChain.chain),
        amount: amount.fromBaseUnits(
          quote.estimatedCost ?? 0n,
          srcNativeDecimals
        ),
      },
      // TODO: Solana gas drop-off
      // NOTES:
      // Before sending, check if the associated token account exists. If it does not, add a zero value GasDropOffInstruction to the wallet so the relayer can create it automatically.
      // If using a non-zero GasDropOffInstruction to a new wallet, the drop-off amount must be greater than the getMinimumBalanceForRentExemption lamports.
      // Our relayer will ignore drop-offs to new accounts if they are less than the minimum as otherwise the transaction would fail.
      // destinationNativeGas: amount.units
      eta,
      expires: signedQuote.quote.expiryTime,
      details: {
        signedQuote: encoding.hex.decode(quote.signedQuote),
        relayInstructions: relayInstructions,
        estimatedCost: quote.estimatedCost,
      },
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

    const executor = await request.fromChain.getProtocol("CCTPW7Executor");
    const sender = Wormhole.parseAddress(signer.chain(), signer.address());
    const amt = amount.units(quote.params.normalizedParams.amount);

    const xfer = await executor.transfer(
      sender,
      to,
      amt,
      quote.details.signedQuote,
      quote.details.relayInstructions,
      quote.details.estimatedCost
    );

    const txids = await signSendWait(request.fromChain, xfer, signer);

    const msg = await CircleTransfer.getTransferMessage(
      request.fromChain,
      txids.at(-1)!.txid
    );

    return {
      from: request.fromChain.chain,
      to: request.toChain.chain,
      state: TransferState.SourceFinalized,
      originTxs: txids,
      attestation: { id: msg.id, attestation: { message: msg.message } },
    };
  }

  // TOOD: what should the state be if the relay endpoint returns a failure state?
  // the user can always resume the transfer and redeem it through the manual cctp route?
  public override async *track(receipt: R, timeout?: number) {
    yield* CircleTransfer.track(this.wh, receipt, timeout);

    // throw new Error("Not implemented");

    //Pending = "pending",
    //Failed = "failed",
    //Unsupported = "unsupported",
    //Submitted = "submitted",
    //Underpaid = "underpaid",
    //Aborted = "aborted",

    //if (isSourceInitiated(receipt) || isSourceFinalized(receipt)) {
    //  const { txid } = receipt.originTxs.at(-1)!;

    //  const status = await fetchStatus(txid, receipt.from);
    //  if (
    //    status.status === RelayStatus.Failed ||
    //    status.status === RelayStatus.Unsupported ||
    //    status.status === RelayStatus.Underpaid ||
    //    status.status === RelayStatus.Aborted
    //  ) {
    //    console.log(`Transfer failed: ${status.status}`);
    //    return {
    //      ...receipt,
    //      // TODO: handle failed state in Connect
    //      state: TransferState.Failed,
    //      error: `Transfer failed: ${status}`,
    //    } satisfies FailedTransferReceipt<CircleTransfer.AttestationReceipt>;
    //  }
    //}

    ////if (isAttested(receipt)) {
    ////}

    //yield receipt;
  }
}

declare module "@wormhole-foundation/sdk-definitions" {
  export namespace WormholeRegistry {
    interface ProtocolToInterfaceMapping<N, C> {
      CCTPW7Executor: CCTPW7Executor<N, C>;
    }
    interface ProtocolToPlatformMapping {
      CCTPW7Executor: EmptyPlatformMap<"CCTPW7Executor">;
    }
  }
}
