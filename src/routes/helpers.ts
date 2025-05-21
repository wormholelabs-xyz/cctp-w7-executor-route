import {
  amount,
  Chain,
  deserializeLayout,
  encoding,
  Network,
  routes,
  serializeLayout,
  toChainId,
  UniversalAddress,
  Wormhole,
} from "@wormhole-foundation/sdk-connect";
import { CCTPExecutorRoute, QuoteDetails } from "./cctpV1";
import {
  gasLimits,
  referrers,
  SOLANA_MSG_VALUE_BASE_FEE,
  usdcContracts,
} from "../consts";
import {
  calculateReferrerFee,
  fetchCapabilities,
  fetchSignedQuote,
} from "../utils";
import { Connection } from "@solana/web3.js";
import { SolanaAddress } from "@wormhole-foundation/sdk-solana";
import { relayInstructionsLayout, signedQuoteLayout } from "../layouts";

// The minimum rent exemption amount for a 165 byte account (e.g. an ATA)
// cache it here to avoid fetching it from the Solana RPC
let ataMinRentAmount: bigint | undefined = undefined;

export async function fetchQuoteDetails(
  request: routes.RouteTransferRequest<Network>,
  params: CCTPExecutorRoute.ValidatedParams,
  referrerFeeDbps: bigint,
  supportedChains: Chain[],
  capability: "ERC1" | "ERC2"
): Promise<QuoteDetails | Error> {
  const { fromChain, toChain } = request;

  if (
    !supportedChains.includes(fromChain.chain) ||
    !supportedChains.includes(toChain.chain)
  ) {
    return new Error("Unsupported chain");
  }

  const srcUsdcAddress = usdcContracts[fromChain.network]?.[fromChain.chain];
  if (!srcUsdcAddress) {
    throw new Error("Invalid transfer, no USDC contract on source");
  }

  const dstUsdcAddress = usdcContracts[toChain.network]?.[toChain.chain];
  if (!dstUsdcAddress) {
    throw new Error("Invalid transfer, no USDC contract on destination");
  }

  const referrerAddress = referrers[fromChain.network]?.[fromChain.chain];
  if (!referrerAddress) {
    return new Error("No referrer address found");
  }
  const referrer = Wormhole.chainAddress(fromChain.chain, referrerAddress);

  const { referrerFee, remainingAmount } = calculateReferrerFee(
    amount.units(params.normalizedParams.amount),
    referrerFeeDbps
  );
  if (remainingAmount <= 0n) {
    return new Error("Amount after fee <= 0");
  }

  const gasLimit = gasLimits[fromChain.network]?.[toChain.chain];
  if (!gasLimit) {
    return new Error("Gas limit not found");
  }

  const capabilities = await fetchCapabilities(fromChain.network);
  const srcCapabilities = capabilities[toChainId(fromChain.chain)];
  if (!srcCapabilities) {
    return new Error("Unsupported source chain");
  }

  const dstCapabilities = capabilities[toChainId(toChain.chain)];
  if (
    !dstCapabilities ||
    !dstCapabilities.requestPrefixes.includes(capability)
  ) {
    return new Error("Unsupported destination chain");
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
    return new Error("No estimated cost");
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
