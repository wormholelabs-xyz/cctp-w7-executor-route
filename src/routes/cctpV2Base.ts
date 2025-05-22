import {
  amount,
  Chain,
  ChainAddress,
  EmptyPlatformMap,
  isAttested,
  isCompleted,
  isFailed,
  isSourceFinalized,
  isSourceInitiated,
  Network,
  routes,
  Signer,
  signSendWait,
  TransactionId,
  TransferState,
  Wormhole,
} from "@wormhole-foundation/sdk-connect";
import {
  fetchStatus,
  getCircleV2Attestation,
  reattestCircleV2Message,
  RelayStatus,
} from "../utils";
import { CircleV2Message } from "../layouts";
import { CCTPExecutorRoute, QuoteDetails } from "./cctpV1";
import { circleV2Domains, getCircleV2Chain } from "../consts";
import { CCTPv2Executor } from "../types";
import { initiateTransfer } from "./helpers";

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

export type Op = CCTPExecutorRoute.Options;
export type Vp = CCTPExecutorRoute.ValidatedParams;

export type Tp = routes.TransferParams<Op>;
export type Vr = routes.ValidationResult<Op>;

export type CCTPv2QuoteDetails = QuoteDetails & {
  fastTransferMaxFee: bigint; // The maximum fee to pay on the destination domain, specified in units of burnToken (USDC)
  minFinalityThreshold: number; // The minimum finality at which a burn message will be attested to
};

export type Q = routes.Quote<Op, Vp, CCTPv2QuoteDetails>;
export type Qr = routes.QuoteResult<Op, Vp>;

export type R = routes.Receipt<CCTPv2ExecutorRoute.Attestation>;

export abstract class CCTPv2BaseRoute<
  N extends Network
> extends routes.AutomaticRoute<N, Op, Vp, R> {
  static NATIVE_GAS_DROPOFF_SUPPORTED = true;

  static supportedNetworks(): Network[] {
    return ["Mainnet", "Testnet"];
  }

  static supportedChains(network: Network): Chain[] {
    return Object.keys(circleV2Domains[network] ?? {}) as Chain[];
  }

  getDefaultOptions(): Op {
    return {
      nativeGas: 0,
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

    return await initiateTransfer(request, signer, to, {
      protocol: "CCTPv2Executor",
      details: quote.details,
    });
  }

  async *track(receipt: R, timeout?: number) {
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
            const [txStatus] = await fetchStatus(
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
              throw new Error("Receipt is missing attestation");
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

  async complete(signer: Signer, receipt: R): Promise<R> {
    if (!isAttested(receipt) && !isFailed(receipt)) {
      throw new Error("Transfer is not attested");
    }

    if (!receipt.attestation) {
      throw new Error("No attestation found");
    }

    const toChain = this.wh.getChain(receipt.to);
    const executor = await toChain.getProtocol("CCTPv2Executor");

    // check if the attestation is expired and, if so, re-attest and fetch
    let { attestation, message } = receipt.attestation.attestation;
    const { expirationBlock } = message.messageBody;
    const currentBlock = await executor.getCurrentBlock();
    if (expirationBlock !== 0n && expirationBlock < currentBlock) {
      const newAttestation = await reattestCircleV2Message(
        toChain.network,
        receipt.attestation
      );

      if (!newAttestation) {
        throw new Error("Failed to reattest message");
      }

      attestation = newAttestation.attestation;
      message = newAttestation.message;
    }

    const sender = Wormhole.parseAddress(signer.chain(), signer.address());
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

  async resume(tx: TransactionId): Promise<R> {
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
