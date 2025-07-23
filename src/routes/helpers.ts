import {
  amount,
  ChainAddress,
  circle,
  deserializeLayout,
  encoding,
  Network,
  routes,
  serializeLayout,
  Signer,
  signSendWait,
  SourceInitiatedTransferReceipt,
  toChainId,
  TransferState,
  UniversalAddress,
  Wormhole,
} from "@wormhole-foundation/sdk-connect";
import { CCTPExecutorRoute, QuoteDetails } from "./cctpV1";
import { gasLimits, SOLANA_MSG_VALUE_BASE_FEE } from "../consts";
import {
  calculateReferrerFee,
  fetchCapabilities,
  fetchSignedQuote,
  fetchStatus,
  sleep,
} from "../utils";
import { Connection } from "@solana/web3.js";
import { SolanaAddress } from "@wormhole-foundation/sdk-solana";
import { relayInstructionsLayout, signedQuoteLayout } from "../layouts";
import { CCTPv2ExecutorRoute, CCTPv2QuoteDetails } from "./cctpV2Base";

// The minimum rent exemption amount for a 165 byte account (e.g. an ATA)
// cache it here to avoid fetching it from the Solana RPC
let ataMinRentAmount: bigint | undefined = undefined;

export async function fetchExecutorQuote(
  request: routes.RouteTransferRequest<Network>,
  params:
    | CCTPExecutorRoute.ValidatedParams
    | CCTPv2ExecutorRoute.ValidatedParams,
  config: CCTPExecutorRoute.Config | CCTPv2ExecutorRoute.Config,
  capability: "ERC1" | "ERC2"
): Promise<QuoteDetails> {
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

  let referrerAddress: string | undefined = undefined;
  if (config.referrerFeeDbps > 0n) {
    referrerAddress =
      config.referrerAddresses?.[fromChain.network]?.[fromChain.chain];
    if (!referrerAddress) {
      throw new Error(`Referrer address not configured for ${fromChain.chain}`);
    }
  }

  const referrer = referrerAddress
    ? Wormhole.chainAddress(fromChain.chain, referrerAddress)
    : undefined;

  const { referrerFee, remainingAmount, referrerFeeDbps } =
    calculateReferrerFee(
      amount.units(params.normalizedParams.amount),
      config.referrerFeeDbps,
      config.referrerFeeThreshold
    );
  if (remainingAmount <= 0n) {
    throw new Error("Amount after fee <= 0");
  }

  const gasLimit = gasLimits[toChain.network]?.[toChain.chain];
  if (!gasLimit) {
    throw new Error("Gas limit not found");
  }

  const capabilities = await fetchCapabilities(fromChain.network);
  const srcCapabilities = capabilities[toChainId(fromChain.chain)];
  if (!srcCapabilities) {
    throw new Error("Unsupported source chain");
  }

  const dstCapabilities = capabilities[toChainId(toChain.chain)];
  if (
    !dstCapabilities ||
    !dstCapabilities.requestPrefixes.includes(capability)
  ) {
    throw new Error("Unsupported destination chain");
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
    // Add extra for CCTP v2 operations
    if (capability === "ERC2") {
      msgValue += 1_200_000n;
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
      ? (BigInt(Math.round(params.options.nativeGas * 100)) * gasDropOffLimit) /
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
    throw new Error("No estimated cost");
  }

  const signedQuoteBytes = encoding.hex.decode(quote.signedQuote);
  const signedQuote = deserializeLayout(signedQuoteLayout, signedQuoteBytes);

  const estimatedCost = BigInt(quote.estimatedCost);

  const details: QuoteDetails = {
    signedQuote: signedQuoteBytes,
    relayInstructions: relayInstructions,
    estimatedCost,
    referrer,
    referrerFee,
    remainingAmount,
    referrerFeeDbps,
    expiryTime: signedQuote.quote.expiryTime,
    gasDropOff: dropOff,
  };

  return details;
}

export async function initiateTransfer(
  request: routes.RouteTransferRequest<Network>,
  signer: Signer,
  to: ChainAddress,
  params:
    | { protocol: "CCTPExecutor"; details: QuoteDetails }
    | { protocol: "CCTPv2Executor"; details: CCTPv2QuoteDetails }
): Promise<SourceInitiatedTransferReceipt> {
  const relayInstructions = deserializeLayout(
    relayInstructionsLayout,
    params.details.relayInstructions
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

  const sender = Wormhole.parseAddress(signer.chain(), signer.address());

  const recipient = await resolveRecipient(to, request);

  let xfer;
  if (params.protocol === "CCTPExecutor") {
    const executor = await request.fromChain.getProtocol(params.protocol);
    xfer = await executor.transfer(sender, recipient, params.details);
  } else {
    const executor = await request.fromChain.getProtocol(params.protocol);
    xfer = await executor.transfer(sender, recipient, params.details);
  }

  const txids = await signSendWait(request.fromChain, xfer, signer);

  // Status the transfer immediately before returning
  let statusAttempts = 0;

  const statusTransferImmediately = async () => {
    while (statusAttempts < 20) {
      try {
        const [txStatus] = await fetchStatus(
          request.fromChain.network,
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

async function resolveRecipient(
  to: ChainAddress,
  request: routes.RouteTransferRequest<Network>
): Promise<ChainAddress> {
  if (to.chain !== "Solana") return to;

  // When transferring to Solana, the recipient address is the ATA
  const solanaUsdc = circle.usdcContract.get(
    request.toChain.network,
    request.toChain.chain
  );
  if (!solanaUsdc) throw new Error("No USDC contract found for Solana");

  const usdcAddress = Wormhole.parseAddress("Solana", solanaUsdc);
  return request.toChain.getTokenAccount(to.address, usdcAddress);
}
