import {
  Chain,
  constMap,
  MapLevel,
  Network,
} from "@wormhole-foundation/sdk-connect";

// prettier-ignore
const shimContract = [
  [
    "Testnet",
    [
      ["Sepolia",     "0x57861330Ff78dB78E95dD792306E52286C444302"],
      ["BaseSepolia", "0xC280F102d2D7EC1390A456700F3471a883059F42"],
      ["Avalanche",   "0x5C91b5dcd7DCd6a04cc2290e0420A8644402C7CC"],
    ],
  ],
] as const satisfies MapLevel<Network, MapLevel<Chain, string>>;

export const shimContracts = constMap(shimContract);

// prettier-ignore
const gasLimit = [
  [
    "Testnet",
    [
      ["Sepolia",     200_000n],
      ["BaseSepolia", 200_000n],
      ["Avalanche",   200_000n],
      ["Solana",      250_000n],
      ["Sui",         800_000n],
    ],
  ],
] as const satisfies MapLevel<Network, MapLevel<Chain, bigint>>;

export const gasLimits = constMap(gasLimit);

export const apiBaseUrl = {
  Mainnet: "",
  Testnet: "https://executor-testnet.labsapis.com",
  Devnet: "",
} as const;
