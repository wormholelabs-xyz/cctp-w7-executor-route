import {
  Chain,
  constMap,
  MapLevel,
  Network,
} from "@wormhole-foundation/sdk-connect";

export const apiBaseUrl: Partial<Record<Network, string>> = {
  Testnet: "https://executor-testnet.labsapis.com",
};

// prettier-ignore
const _shimContracts = [
  [
    "Testnet",
    [
      ["Sepolia",     "0x4Cbf94024Ff07a7cd69d687084d67773Fc6ef925"],
      ["BaseSepolia", "0x17166DEC8502769eBD6D30112098a4588eA2e88A"],
      ["Avalanche",   "0x0254356716c59a3DA3C0e19EFf58511ba7f0002F"],
      ["Solana",      "CXGRA5SCc8jxDbaQPZrmmZNu2JV34DP7gFW4m31uC1zs"]
    ],
  ],
] as const satisfies MapLevel<Network, MapLevel<Chain, string>>;
export const shimContracts = constMap(_shimContracts);

export type SuiExecutorIds = { executorId: string; executorRequestsId: string };
export const suiExecutorIds: Partial<Record<Network, SuiExecutorIds>> = {
  Testnet: {
    executorId:
      "0x4000cfe2955d8355b3d3cf186f854fea9f787a457257056926fde1ec977670eb",
    executorRequestsId:
      "0x2d9ccf3cce3f7dce408e5455e90b80a8161ad9673d1366c2a5def60ad93657a8",
  },
};

// prettier-ignore
// The gas limits must be high enough to cover the worst-case scenario for each chain
// to avoid relay failures. However, they should not be too high to avoid the perceived
// cost to the user.
const _gasLimits = [
  [
    "Testnet",
    [
      ["Sepolia",     200_000n],
      ["BaseSepolia", 200_000n],
      ["Avalanche",   200_000n],
      ["Solana",      250_000n],
      ["Sui",         8_000_000n],
    ],
  ],
] as const satisfies MapLevel<Network, MapLevel<Chain, bigint>>;
export const gasLimits = constMap(_gasLimits);

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
      ["Solana",      "9r6q2iEg4MBevjC8reaLmQUDxueF3vabUoqDkZ2LoAYe"],
      ["Sui",         "0x30bd9b3d5ad00f38fd0c314139ba47ccb3c78353d99880d81125ca0c370b415e"]
    ],
  ],
] as const satisfies MapLevel<Network, MapLevel<Chain, string>>;
export const referrers = constMap(_referrers);

// Estimated lamport value to cover worst-case Solana tx costs (base fee + rent for used_nonces + ATA rent)
// Used to prevent relay wallet drain due to non-deterministic rent charges (e.g., first nonce in batch, missing ATA)
export const SOLANA_MSG_VALUE = 9_000_000n;
