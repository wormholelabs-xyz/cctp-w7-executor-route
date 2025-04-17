import { Wormhole, circle, routes } from "@wormhole-foundation/sdk-connect";
import { EvmPlatform } from "@wormhole-foundation/sdk-evm";
import { SolanaPlatform } from "@wormhole-foundation/sdk-solana";

import { getStuff } from "./utils";
import { CCTPW7ExecutorRoute } from "../src";

import "@wormhole-foundation/sdk-evm-cctp";
import "@wormhole-foundation/sdk-solana-cctp";

(async function () {
  // Setup
  const wh = new Wormhole("Testnet", [EvmPlatform, SolanaPlatform]);

  const sendChain = wh.getChain("Avalanche");
  const destChain = wh.getChain("Sepolia");

  // Doing transfer of USDC on Avalanche to USDC on Sepolia
  const source = Wormhole.tokenId(
    sendChain.chain,
    circle.usdcContract.get("Testnet", sendChain.chain)!
  );
  const destination = Wormhole.tokenId(
    destChain.chain,
    circle.usdcContract.get("Testnet", destChain.chain)!
  );

  // Create a new Wormhole route resolver, adding the Mayan route to the default list
  const resolver = wh.resolver([CCTPW7ExecutorRoute]);

  //const dstTokens = await resolver.supportedDestinationTokens(
  //  source,
  //  sendChain,
  //  destChain
  //);

  // Pull private keys from env for testing purposes
  const sender = await getStuff(sendChain);
  const receiver = await getStuff(destChain);

  // Creating a transfer request fetches token details
  // since all routes will need to know about the tokens
  const tr = await routes.RouteTransferRequest.create(wh, {
    source,
    destination,
  });

  // resolve the transfer request to a set of routes that can perform it
  const foundRoutes = await resolver.findRoutes(tr);
  console.log(
    "For the transfer parameters, we found these routes: ",
    foundRoutes
  );

  const bestRoute = foundRoutes[0]!;

  // Specify the amount as a decimal string
  const transferParams = {
    amount: "0.01",
    options: bestRoute.getDefaultOptions(),
  };

  let validated = await bestRoute.validate(tr, transferParams);
  if (!validated.valid) {
    console.error(validated.error);
    return;
  }
  console.log("Validated: ", validated);

  const quote = await bestRoute.quote(tr, validated.params);
  if (!quote.success) {
    console.error(`Error fetching a quote: ${quote.error.message}`);
    return;
  }
  console.log("Quote: ", quote);

  // initiate the transfer
  const receipt = await bestRoute.initiate(
    tr,
    sender.signer,
    quote,
    receiver.address
  );
  console.log("Initiated transfer with receipt: ", receipt);

  await routes.checkAndCompleteTransfer(
    bestRoute,
    receipt,
    receiver.signer,
    15 * 60 * 1000
  );
})();
