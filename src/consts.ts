import {
  Chain,
  constMap,
  MapLevel,
  Network,
} from "@wormhole-foundation/sdk-connect";

// prettier-ignore
const _shimContracts = [
  [
    "Testnet",
    [
      ["Sepolia",     "0x4Cbf94024Ff07a7cd69d687084d67773Fc6ef925"],
      ["BaseSepolia", "0x17166DEC8502769eBD6D30112098a4588eA2e88A"],
      ["Avalanche",   "0x0254356716c59a3DA3C0e19EFf58511ba7f0002F"],
    ],
  ],
] as const satisfies MapLevel<Network, MapLevel<Chain, string>>;
export const shimContracts = constMap(_shimContracts);

// prettier-ignore
const _gasLimits = [
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
export const gasLimits = constMap(_gasLimits);

export const apiBaseUrl = {
  Mainnet: "",
  Testnet: "https://executor-testnet.labsapis.com",
  Devnet: "",
} as const;

// Referrer fee in tenths of basis points
export const REFERRER_FEE_DBPS = 10n;

// prettier-ignore
// To whom the referrer fee should be paid
const _referrers = [
  [
    "Testnet",
    [
      ["Sepolia",     "0x8F26A0025dcCc6Cfc07A7d38756280a10E295ad7"],
      ["BaseSepolia", "0x8F26A0025dcCc6Cfc07A7d38756280a10E295ad7"],
      ["Avalanche",   "0x8F26A0025dcCc6Cfc07A7d38756280a10E295ad7"],
    ],
  ],
] as const satisfies MapLevel<Network, MapLevel<Chain, string>>;
export const referrers = constMap(_referrers);
