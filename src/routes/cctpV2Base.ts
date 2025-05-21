import {
  Chain,
  ChainAddress,
  ChainContext,
  deserializeLayout,
  EmptyPlatformMap,
  isAttested,
  isCompleted,
  isFailed,
  isSameToken,
  isSourceFinalized,
  isSourceInitiated,
  Network,
  routes,
  Signer,
  signSendWait,
  TokenId,
  TransactionId,
  TransferState,
  Wormhole,
} from "@wormhole-foundation/sdk-connect";
import {
  fetchStatus,
  getCircleV2Attestation,
  RelayStatus,
  sleep,
} from "../utils";
import { CircleV2Message, relayInstructionsLayout } from "../layouts";
import { CCTPExecutorRoute, QuoteDetails } from "./cctpV1";
import { getCircleV2Chain, shimContractsV2, usdcContracts } from "../consts";
import { CCTPv2Executor } from "../types";

export type CCTPv2Attestation = {
  id: string;
  attestation: { message: CircleV2Message; attestation: string };
};

export type Op = CCTPExecutorRoute.Options;
export type Vp = CCTPExecutorRoute.ValidatedParams;

export type Tp = routes.TransferParams<Op>;
export type Vr = routes.ValidationResult<Op>;

export type Q = routes.Quote<Op, Vp, CCTPv2QuoteDetails>;
export type Qr = routes.QuoteResult<Op, Vp>;

export type R = routes.Receipt<CCTPv2Attestation>;

export type CCTPv2QuoteDetails = QuoteDetails & {
  fastTransferMaxFee: bigint; // The maximum fee to pay on the destination domain, specified in units of burnToken (USDC)
  minFinalityThreshold: number; // The minimum finality at which a burn message will be attested to
};

export abstract class CCTPv2BaseRoute<
  N extends Network
> extends routes.AutomaticRoute<N, Op, Vp, R> {
  static NATIVE_GAS_DROPOFF_SUPPORTED = true;

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
          const [txStatus] = await fetchStatus(
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
              throw new Error("Attestation on failed transfer is missing");
            }

            const attestation: CCTPv2Attestation = receipt.attestation;

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
