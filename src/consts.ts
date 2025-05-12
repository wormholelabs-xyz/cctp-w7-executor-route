import { Chain, Network } from "@wormhole-foundation/sdk-connect";

export const apiBaseUrl: Partial<Record<Network, string>> = {
  Testnet: "https://executor-testnet.labsapis.com",
  Mainnet: "https://executor.labsapis.com",
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
  Mainnet: {
    Aptos: "0x9f5ad7d5c2d067ca4abb6d8d6aba44c15596b71a1def8eb4596089b527bb2eb1",
    Arbitrum: "0x55Dd4466BFec29527C54A72fd306efb54e5F7027",
    Avalanche: "0xd331819478b74d8a7B8EA631118B4a4e50F6EbD1",
    Base: "0x08FEB1838C3d7F8509DA1EBb9a11a94c1f006cb2",
    Ethereum: "0xeEFb36c4458dA7798742cf038C5c27E07aB9c51E",
    Optimism: "0xBC6f9d1CBa49DB365728478cefa02F6743617637",
    Polygon: "0x007995f2AEcfBC745f20a7AE8D3a02c0EbF46264",
    Unichain: "0xA7aBDb8f2108901c586543BD5e10E4fA263F4A47",
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
  Mainnet: {
    executorId:
      "0xdb0fe8bb1e2b5be628adbea0636063325073e1070ee11e4281457dfd7f158235",
    executorRequestsId:
      "0xc030df7a3eed1494fa4b64aa8ab63a79041cf1114f4ff2b7ab5aca1c684a21a7",
  },
};

// Solana Executor Program IDs
export const solanaExecutorId: Partial<Record<Network, string>> = {
  Testnet: "execXUrAsMnqMmTHj5m7N1YQgsDz3cwGLYCYyuDRciV",
  Mainnet: "execXUrAsMnqMmTHj5m7N1YQgsDz3cwGLYCYyuDRciV",
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
    Aptos: 5_000n,
    Avalanche: 200_000n,
    BaseSepolia: 200_000n,
    Sepolia: 200_000n,
    Solana: 250_000n,
    Sui: 8_000_000n,
  },
  Mainnet: {
    Aptos: 5_000n,
    Arbitrum: 250_000n,
    Avalanche: 250_000n,
    Base: 250_000n,
    Ethereum: 250_000n,
    Optimism: 250_000n,
    Polygon: 250_000n,
    Unichain: 250_000n,
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
  Mainnet: {
    Aptos: "0x1f177e724a874ab6267172a3049291c480fc665883e6a3ac95d0909492c09dc8",
    Solana: "JB3rmygUVuVZzgkxvMdV8mSKLJeQAkSXEK284Dqsziah",
    Sui: "0xbfa1240e48c622d97881473953be730091161b7931d89bd6afe667841cf69ef4",
    Arbitrum: "0xF11e0efF8b11Ce382645dd75352fC16b3aB3551E",
    Avalanche: "0xF11e0efF8b11Ce382645dd75352fC16b3aB3551E",
    Base: "0xF11e0efF8b11Ce382645dd75352fC16b3aB3551E",
    Ethereum: "0xF11e0efF8b11Ce382645dd75352fC16b3aB3551E",
    Optimism: "0xF11e0efF8b11Ce382645dd75352fC16b3aB3551E",
    Polygon: "0xF11e0efF8b11Ce382645dd75352fC16b3aB3551E",
    Unichain: "0xF11e0efF8b11Ce382645dd75352fC16b3aB3551E",
  },
};
