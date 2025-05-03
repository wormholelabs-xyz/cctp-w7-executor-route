import {
  Chain,
  ChainAddress,
  ChainContext,
  Network,
  Signer,
  Wormhole,
} from "@wormhole-foundation/sdk-connect";

// Importing from src so we dont have to rebuild to see debug stuff in signer
import { getEvmSignerForKey } from "@wormhole-foundation/sdk-evm";
import { getSolanaSigner } from "@wormhole-foundation/sdk-solana";
import { getSuiSigner } from "@wormhole-foundation/sdk-sui";
import { getAptosSigner } from "@wormhole-foundation/sdk-aptos";

function getEnv(key: string): string {
  // If we're in the browser, return empty string
  if (typeof process === undefined) return "";

  // Otherwise, return the env var or error
  const val = process.env[key];
  if (!val) throw new Error(`Missing env var ${key}`);

  return val;
}

export interface TransferStuff<N extends Network, C extends Chain> {
  chain: ChainContext<N, C>;
  signer: Signer<N, C>;
  address: ChainAddress<C>;
}

export async function getStuff<N extends Network, C extends Chain>(
  chain: ChainContext<N, C>
): Promise<TransferStuff<N, C>> {
  let signer: Signer;
  const platform = chain.platform.utils()._platform;
  switch (platform) {
    case "Solana":
      signer = await getSolanaSigner(
        await chain.getRpc(),
        getEnv("SVM_PRIVATE_KEY")
      );
      break;
    case "Evm":
      signer = await getEvmSignerForKey(
        await chain.getRpc(),
        getEnv("EVM_PRIVATE_KEY")
      );
      break;
    case "Sui":
      signer = await getSuiSigner(
        await chain.getRpc(),
        getEnv("SUI_PRIVATE_KEY")
      );
      break;
    case "Aptos":
      signer = await getAptosSigner(
        await chain.getRpc(),
        getEnv("APTOS_PRIVATE_KEY")
      );
      break;
    default:
      throw new Error("Unrecognized platform: " + platform);
  }

  return {
    chain,
    signer: signer as Signer<N, C>,
    address: Wormhole.chainAddress(chain.chain, signer.address()),
  };
}
