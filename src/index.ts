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
  RelayStatus,
} from "./utils";
import { relayInstructionsLayout, signedQuoteLayout } from "./layouts";
import { CCTPW7Executor } from "./types";
import {
  gasLimits,
  REFERRER_FEE_DBPS,
  referrers,
  SOLANA_MSG_VALUE,
} from "./consts";

// IMPORTANT: register the platform specific implementations of the protocol
import "./evm/index.js";
import "./svm/index.js";
import "./sui/index.js";

export namespace CCTPW7ExecutorRoute {
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
}

type Op = CCTPW7ExecutorRoute.Options;
type Vp = CCTPW7ExecutorRoute.ValidatedParams;

type Tp = routes.TransferParams<Op>;
type Vr = routes.ValidationResult<Op>;

export type QuoteDetails = {
  signedQuote: Uint8Array;
  relayInstructions: Uint8Array;
  estimatedCost: bigint;
  referrer: ChainAddress;
  referrerFee: bigint;
  remainingAmount: bigint;
  gasDropOffLimit: bigint;
};

type Q = routes.Quote<Op, Vp, QuoteDetails>;
type QR = routes.QuoteResult<Op, Vp>;

// TODO: do we even need to set the circle attestation? we don't use it
// adding that would require a dependency on the circle protocol
// to fetch the attestation
type AT = { id: string; attestation: {} };
type R = routes.Receipt<AT>;

export class CCTPW7ExecutorRoute<N extends Network>
  extends routes.AutomaticRoute<N, Op, Vp, R>
  implements routes.StaticRouteMethods<typeof CCTPW7ExecutorRoute>
{
  // TODO: set this to true to enable gas-dropoff
  // it should work but we need to test it
  static NATIVE_GAS_DROPOFF_SUPPORTED = false;

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

    const srcUsdcAddress = circle.usdcContract.get(
      fromChain.network,
      fromChain.chain
    );
    if (!srcUsdcAddress) {
      throw new Error("Invalid transfer, no USDC contract on source");
    }

    const dstUsdcAddress = circle.usdcContract.get(
      toChain.network,
      toChain.chain
    );
    if (!dstUsdcAddress) {
      throw new Error("Invalid transfer, no USDC contract on destination");
    }

    const { referrerFee, remainingAmount } = calculateReferrerFee(
      amount.units(params.normalizedParams.amount),
      REFERRER_FEE_DBPS
    );

    if (remainingAmount <= 0n) {
      return {
        success: false,
        error: new Error("Amount after fee <= 0"),
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
    if (!dstCapabilities || !dstCapabilities.requestPrefixes.includes("ERC1")) {
      return {
        success: false,
        error: new Error("Unsupported destination chain"),
      };
    }

    const gasLimit = gasLimits[fromChain.network]?.[toChain.chain];
    if (!gasLimit) {
      return {
        success: false,
        error: new Error("Gas limit not found"),
      };
    }

    const relayRequests = [];

    // Add the gas instruction
    relayRequests.push({
      request: {
        type: "GasInstruction" as const,
        gasLimit,
        msgValue: toChain.chain === "Solana" ? SOLANA_MSG_VALUE : 0n,
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
    // Always add it when sending to Solana so the relayer can create the ATA
    // if it doesn't exist, even if the dropOff is 0
    if (dropOff > 0n || toChain.chain === "Solana") {
      relayRequests.push({
        request: {
          type: "GasDropOffInstruction" as const,
          dropOff,
          // Since we don't know the recipient address yet, we use a dummy address
          // This will be replaced in the `initiate` method
          recipient: new Uint8Array(32),
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
        : finality.estimateFinalityTime(fromChain.chain);

    const referrerAddress = referrers[fromChain.network]?.[fromChain.chain];
    if (!referrerAddress) {
      return {
        success: false,
        error: new Error("No referrer address found"),
      };
    }
    const referrer = Wormhole.chainAddress(fromChain.chain, referrerAddress);

    const estimatedCost = BigInt(quote.estimatedCost);

    const details: QuoteDetails = {
      signedQuote: signedQuoteBytes,
      relayInstructions: relayInstructions,
      estimatedCost,
      referrer,
      referrerFee,
      remainingAmount,
      gasDropOffLimit,
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

    const executor = await request.fromChain.getProtocol("CCTPW7Executor");
    const sender = Wormhole.parseAddress(signer.chain(), signer.address());
    const amt = amount.units(quote.params.normalizedParams.amount);

    // When transferring to Solana, the recipient address is the associated token account for CCTP transfers
    let recipient = to;
    if (to.chain === "Solana") {
      const usdcAddress = Wormhole.parseAddress(
        "Solana",
        circle.usdcContract.get(request.toChain.network, request.toChain.chain)!
      );
      recipient = await request.toChain.getTokenAccount(
        to.address,
        usdcAddress
      );
    }

    const quoteDetails = {
      ...quote.details,
    };

    const relayInstructions = deserializeLayout(
      relayInstructionsLayout,
      quoteDetails.relayInstructions
    );

    const updatedRequests = relayInstructions.requests.map(
      (relayInstruction) => {
        if (relayInstruction.request.type === "GasDropOffInstruction") {
          return {
            ...relayInstruction,
            request: {
              ...relayInstruction.request,
              // Replace the dummy recipient address with the actual recipient address
              recipient: to.address.toUniversalAddress().toUint8Array(),
            },
          };
        }
        return relayInstruction;
      }
    );

    const updatedRelayInstructions = {
      ...relayInstructions,
      requests: updatedRequests,
    };

    quoteDetails.relayInstructions = serializeLayout(
      relayInstructionsLayout,
      updatedRelayInstructions
    );

    const xfer = await executor.transfer(sender, recipient, amt, quoteDetails);

    const txids = await signSendWait(request.fromChain, xfer, signer);

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

          // TODO: how to handle failure states in Connect?
          // Transfers could be resumed through the manual CCTP
          // route if the relay fails
          if (
            relayStatus === RelayStatus.Failed || // TODO: how can this happen?
            relayStatus === RelayStatus.Underpaid || // only happens if you don't pay at least the costEstimate
            relayStatus === RelayStatus.Unsupported || // capabilities check didn't pass
            relayStatus === RelayStatus.Aborted // TODO: how can this happen?
          ) {
            receipt = {
              ...receipt,
              state: TransferState.Failed,
              error: `Transfer failed: ${relayStatus}`,
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
      CCTPW7Executor: CCTPW7Executor<N, C>;
    }
    interface ProtocolToPlatformMapping {
      CCTPW7Executor: EmptyPlatformMap<"CCTPW7Executor">;
    }
  }
}
