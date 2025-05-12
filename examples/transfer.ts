import { Wormhole, circle, routes } from "@wormhole-foundation/sdk-connect";
import { EvmPlatform } from "@wormhole-foundation/sdk-evm";
import { SolanaPlatform } from "@wormhole-foundation/sdk-solana";
import { SuiPlatform } from "@wormhole-foundation/sdk-sui";
import { AptosPlatform } from "@wormhole-foundation/sdk-aptos";

import { getStuff } from "./utils";
import { cctpW7ExecutorRoute } from "../src";

(async function () {
  // Setup
  const wh = new Wormhole("Testnet", [
    EvmPlatform,
    SolanaPlatform,
    SuiPlatform,
    AptosPlatform,
  ]);

  const sendChain = wh.getChain("Avalanche");
  const destChain = wh.getChain("Sui");

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
  const referrerFeeDbps = 10n;
  const route = cctpW7ExecutorRoute({ referrerFeeDbps });
  const resolver = wh.resolver([route]);

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
    recipient: receiver.address,
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
    options: {
      // 0.0 - 1.0 percentage
      nativeGas: 1.0,
    },
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

  if (process.env["SEND_TRANSFER"] === "true") {
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
  } else {
    console.log(
      "Not doing the transfer, just showing the quote. Pass SEND_TRANSFER=true to do it."
    );
  }
})();
