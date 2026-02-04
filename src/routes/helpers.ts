import {
  amount,
  Chain,
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
  fetchCapabilities,
  fetchSignedQuote,
  fetchStatus,
  sleep,
} from "../utils";
import { Connection } from "@solana/web3.js";
import { SolanaAddress } from "@wormhole-foundation/sdk-solana";
import { relayInstructionsLayout, signedQuoteLayout } from "../layouts";
import { CCTPv2ExecutorRoute, CCTPv2QuoteDetails } from "./cctpV2Base";

const MAX_U16 = 65_535n;

export function calculateReferrerFee(
  amount: bigint,
  dBps: bigint,
  threshold?: bigint,
): { referrerFee: bigint; remainingAmount: bigint } {
  if (dBps > MAX_U16) throw new Error("dBps exceeds max u16");
  let referrerFee = 0n;
  let remainingAmount = amount;
  if (dBps > 0n) {
    if (threshold !== undefined && amount > 0n) {
      const thresholdUnits = threshold * 1_000_000n; // whole USDC -> 6 decimals
      const cappedAmount = amount < thresholdUnits ? amount : thresholdUnits;
      referrerFee = (cappedAmount * dBps) / 100_000n;
    } else {
      referrerFee = (amount * dBps) / 100_000n;
    }
    remainingAmount = amount - referrerFee;
  }
  return { referrerFee, remainingAmount };
}

export function validateFeeConfig(
  config: CCTPExecutorRoute.Config | CCTPv2ExecutorRoute.Config,
) {
  if (config.useLegacyFees) {
    // Legacy dBPS mode validation
    const dBps = config.referrerFeeDbps ?? 0n;
    if (dBps < 0n || dBps > MAX_U16) {
      throw new Error("referrerFeeDbps must be between 0 and 65535");
    }
    if (dBps > 0n && !config.referrerAddresses) {
      throw new Error("referrerAddresses must be provided when referrerFeeDbps > 0");
    }
  } else {
    // Flat fee mode validation (default)
    if (typeof config.transferTokenFee === "bigint" && config.transferTokenFee < 0n) {
      throw new Error("transferTokenFee must be non-negative");
    }
    if (typeof config.nativeTokenFee === "bigint" && config.nativeTokenFee < 0n) {
      throw new Error("nativeTokenFee must be non-negative");
    }

    const hasFee =
      typeof config.transferTokenFee === "function" || (config.transferTokenFee ?? 0n) > 0n ||
      typeof config.nativeTokenFee === "function" || (config.nativeTokenFee ?? 0n) > 0n;

    if (hasFee && !config.referrerAddresses) {
      throw new Error("referrerAddresses must be provided when fees are configured");
    }
  }
}

// The minimum rent exemption amount for a 165 byte account (e.g. an ATA)
// cache it here to avoid fetching it from the Solana RPC
let ataMinRentAmount: bigint | undefined = undefined;

export async function fetchExecutorQuote(
  request: routes.RouteTransferRequest<Network>,
  params:
    | CCTPExecutorRoute.ValidatedParams
    | CCTPv2ExecutorRoute.ValidatedParams,
  config: CCTPExecutorRoute.Config | CCTPv2ExecutorRoute.Config,
  capability: "ERC1" | "ERC2",
  legacyShimContracts?: Partial<Record<Network, Partial<Record<Chain, string>>>>,
): Promise<QuoteDetails> {
  const { fromChain, toChain } = request;

  const srcUsdcAddress = circle.usdcContract.get(
    fromChain.network,
    fromChain.chain,
  );
  if (!srcUsdcAddress) {
    throw new Error("Invalid transfer, no USDC contract on source");
  }

  const dstUsdcAddress = circle.usdcContract.get(
    toChain.network,
    toChain.chain,
  );
  if (!dstUsdcAddress) {
    throw new Error("Invalid transfer, no USDC contract on destination");
  }

  const transferAmount = amount.units(params.normalizedParams.amount);

  let transferTokenFee: bigint;
  let nativeTokenFee: bigint;
  let remainingAmount: bigint;
  let referrerAddress: string | undefined = undefined;

  if (config.useLegacyFees) {
    // Legacy dBPS mode
    const dBps = config.referrerFeeDbps ?? 0n;
    const result = calculateReferrerFee(
      transferAmount,
      dBps,
      config.referrerFeeThreshold,
    );
    transferTokenFee = result.referrerFee;
    nativeTokenFee = 0n;
    remainingAmount = result.remainingAmount;

    if (dBps > 0n) {
      referrerAddress =
        config.referrerAddresses?.[fromChain.network]?.[fromChain.chain];
      if (!referrerAddress) {
        throw new Error(`Referrer address not configured for ${fromChain.chain}`);
      }
    }
  } else {
    // Flat fee mode (default)
    transferTokenFee =
      typeof config.transferTokenFee === "function"
        ? config.transferTokenFee(transferAmount, fromChain.chain)
        : (config.transferTokenFee ?? 0n);
    nativeTokenFee =
      typeof config.nativeTokenFee === "function"
        ? config.nativeTokenFee(transferAmount, fromChain.chain)
        : (config.nativeTokenFee ?? 0n);

    if (transferTokenFee > 0n || nativeTokenFee > 0n) {
      referrerAddress =
        config.referrerAddresses?.[fromChain.network]?.[fromChain.chain];
      if (!referrerAddress) {
        throw new Error(`Referrer address not configured for ${fromChain.chain}`);
      }
    }

    remainingAmount = transferAmount - transferTokenFee;
  }

  const referrer = referrerAddress
    ? Wormhole.chainAddress(fromChain.chain, referrerAddress)
    : undefined;
  if (remainingAmount <= 0n) {
    throw new Error(
      `Transfer token fee (${transferTokenFee}) exceeds transfer amount (${transferAmount})`,
    );
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
      new SolanaAddress(ata.address).unwrap(),
    );
    tokenAccountExists = ataAccount !== null;
    if (!tokenAccountExists && !ataMinRentAmount) {
      ataMinRentAmount = BigInt(
        await connection.getMinimumBalanceForRentExemption(165),
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
    encoding.hex.encode(relayInstructions, true),
  );

  if (!quote.estimatedCost) {
    throw new Error("No estimated cost");
  }

  const signedQuoteBytes = encoding.hex.decode(quote.signedQuote);
  const signedQuote = deserializeLayout(signedQuoteLayout, signedQuoteBytes);

  const estimatedCost = BigInt(quote.estimatedCost);

  // Only override the shim contract when using legacy fee contracts
  const shimContract = legacyShimContracts?.[fromChain.network]?.[fromChain.chain];

  const details: QuoteDetails = {
    shimContract,
    signedQuote: signedQuoteBytes,
    relayInstructions: relayInstructions,
    estimatedCost,
    referrer,
    transferTokenFee,
    remainingAmount,
    expiryTime: signedQuote.quote.expiryTime,
    gasDropOff: dropOff,
    nativeTokenFee,
    ...(config.useLegacyFees && {
      useLegacyFees: true,
      referrerFeeDbps: config.referrerFeeDbps ?? 0n,
    }),
  };

  return details;
}

export async function initiateTransfer(
  request: routes.RouteTransferRequest<Network>,
  signer: Signer,
  to: ChainAddress,
  params:
    | { protocol: "CCTPExecutor"; details: QuoteDetails }
    | { protocol: "CCTPv2Executor"; details: CCTPv2QuoteDetails },
): Promise<SourceInitiatedTransferReceipt> {
  const relayInstructions = deserializeLayout(
    relayInstructionsLayout,
    params.details.relayInstructions,
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
          request.fromChain.chain,
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
  request: routes.RouteTransferRequest<Network>,
): Promise<ChainAddress> {
  if (to.chain !== "Solana") return to;

  // When transferring to Solana, the recipient address is the ATA
  const solanaUsdc = circle.usdcContract.get(
    request.toChain.network,
    request.toChain.chain,
  );
  if (!solanaUsdc) throw new Error("No USDC contract found for Solana");

  const usdcAddress = Wormhole.parseAddress("Solana", solanaUsdc);
  return request.toChain.getTokenAccount(to.address, usdcAddress);
}
