import { Chain, Network } from "@wormhole-foundation/sdk-connect";

export const apiBaseUrl: Partial<Record<Network, string>> = {
  Testnet: "https://executor-testnet.labsapis.com",
};

// Shim Contract Addresses (e.g. CCTPv1WithExecutor.sol)
export const shimContracts: Partial<
  Record<Network, Partial<Record<Chain, string>>>
> = {
  Testnet: {
    Aptos: "0x14a12d1fd6ef371b70c2113155534ec152ec7f779e281b54866c796c9a4a58d3",
    Avalanche: "0x2cfEC91B50f657Cc86Ec693542527ac3e03bF742",
    BaseSepolia: "0x4983C6bD3bB7DA9EECe71cfa7AE4C67CAbf362F0",
    Sepolia: "0x0F78904c750801391EbBf308181e9d6fc892B0f3",
    Solana: "CXGRA5SCc8jxDbaQPZrmmZNu2JV34DP7gFW4m31uC1zs",
  },
};

// Sui Executor Package IDs
export type SuiExecutorIds = { executorId: string; executorRequestsId: string };
export const suiExecutorIds: Partial<Record<Network, SuiExecutorIds>> = {
  Testnet: {
    executorId:
      "0x4000cfe2955d8355b3d3cf186f854fea9f787a457257056926fde1ec977670eb",
    executorRequestsId:
      "0x2d9ccf3cce3f7dce408e5455e90b80a8161ad9673d1366c2a5def60ad93657a8",
  },
};

// Solana Executor Program IDs
export const solanaExecutorId: Partial<Record<Network, string>> = {
  Testnet: "Ax7mtQPbNPQmghd7C3BHrMdwwmkAXBDq7kNGfXNcc7dg",
};

// cost of 1 signature + rounding error on priority fee
export const SOLANA_MSG_VALUE_BASE_FEE = 5_001n;

// Gas limits must be high enough to cover the worst-case scenario for each chain
// to avoid relay failures. However, they should not be too high to reduce the
// `estimatedCost` returned by the quote endpoint.
export const gasLimits: Partial<
  Record<Network, Partial<Record<Chain, bigint>>>
> = {
  Testnet: {
    Aptos: 1_500n,
    Avalanche: 200_000n,
    BaseSepolia: 200_000n,
    Sepolia: 200_000n,
    Solana: 250_000n,
    Sui: 8_000_000n,
  },
};

// Referrer addresses (to whom the referrer fee should be paid)
export const referrers: Partial<
  Record<Network, Partial<Record<Chain, string>>>
> = {
  Testnet: {
    Aptos: "0x23b54f6e29bba7f4123d088f4cfcd83f5e23a049de15895b119ce5a6cb5faa91",
    Avalanche: "0x8F26A0025dcCc6Cfc07A7d38756280a10E295ad7",
    BaseSepolia: "0x8F26A0025dcCc6Cfc07A7d38756280a10E295ad7",
    Sepolia: "0x8F26A0025dcCc6Cfc07A7d38756280a10E295ad7",
    Solana: "9r6q2iEg4MBevjC8reaLmQUDxueF3vabUoqDkZ2LoAYe",
    Sui: "0x30bd9b3d5ad00f38fd0c314139ba47ccb3c78353d99880d81125ca0c370b415e",
  },
};
