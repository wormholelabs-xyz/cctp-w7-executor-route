/*
import {
  ChainAddress,
  circle,
  deserializeLayout,
  isAttested,
  isCompleted,
  isFailed,
  isSourceFinalized,
  isSourceInitiated,
  Network,
  routes,
  Signer,
  signSendWait,
  TransferState,
  Wormhole,
} from "@wormhole-foundation/sdk-connect";
import { fetchStatus, RelayStatus, sleep } from "../utils";
import { Q } from "vitest/dist/chunks/reporters.d.CfRkRKN2";
import { relayInstructionsLayout } from "../layouts";

export abstract class AbstractCCTPExecutorRoute<
  N extends Network,
  OP extends routes.Options = routes.Options,
  VP extends routes.ValidatedTransferParams<OP> = routes.ValidatedTransferParams<OP>,
  R extends routes.Receipt = routes.Receipt
> extends routes.AutomaticRoute<N, OP, VP, R> {
  static NATIVE_GAS_DROPOFF_SUPPORTED = true;

  static supportedNetworks(): Network[] {
    return ["Mainnet", "Testnet"];
  }

  async transfer(
    request: routes.RouteTransferRequest<N>,
    signer: Signer,
    quote: Q,
    to: ChainAddress,
    protocol: "CCTPExecutor" | "CCTPv2Executor"
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

    const executor = await request.fromChain.getProtocol(protocol);
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
          const [txStatus] = await fetchStatus(
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
*/
