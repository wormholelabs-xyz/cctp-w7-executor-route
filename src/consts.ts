import { Chain, Network } from "@wormhole-foundation/sdk-connect";

export const apiBaseUrl: Partial<Record<Network, string>> = {
  Testnet: "https://executor-testnet.labsapis.com",
  Mainnet: "https://executor.labsapis.com",
};

// CCTPv1 Shim Contract Addresses (CCTPv1WithExecutor.sol)
export const shimContractsV1: Partial<
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

// CCTPv2 Shim Contract Addresses (CCTPv2WithExecutor.sol)
export const shimContractsV2: Partial<
  Record<Network, Partial<Record<Chain, string>>>
> = {
  Testnet: {
    Avalanche: "0x4058F0C3924eDaB19c15597C438968ed49C1a213",
    BaseSepolia: "0xC400FcC0e92d3406747FBb6f513D3aa8B038fcE9",
    Sepolia: "0x0F18DD26D0B41fb1eaa9cF34D1Ec6022aA69a8e2",
  },
  Mainnet: {
    Arbitrum: "0x8442d68524217601ed126f6859694E4B0C7c66A1",
    Avalanche: "0x3952914628650Ca510404872D84DfF10A844C5B5",
    Base: "0xbd8d42f40a11b37bD1b3770D754f9629F7cd5679",
    Ethereum: "0x2cCf230467FE7387674BAa657747F0B5485c7fEC",
    Linea: "0xc48c126468BE919068dE1983F00F65af759a4E87",
    Optimism: "0xd0a8940b2e743e33b682daec4d52b46713606c9d",
    Sonic: "0xc39BF082ec91D9bC385F956D24a8D66C0c26223d",
    Worldchain: "0x789f2b91f7B35D5B890983328340c4600339B354",
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
    ArbitrumSepolia: 800_000n,
    Avalanche: 200_000n,
    BaseSepolia: 200_000n,
    Linea: 250_000n,
    Sepolia: 200_000n,
    Solana: 250_000n,
    Sonic: 250_000n,
    Sui: 8_000_000n,
  },
  Mainnet: {
    Aptos: 5_000n,
    Arbitrum: 800_000n,
    Avalanche: 250_000n,
    Base: 250_000n,
    Ethereum: 250_000n,
    Linea: 250_000n,
    Optimism: 250_000n,
    Polygon: 250_000n,
    Unichain: 250_000n,
    Solana: 250_000n,
    Sonic: 250_000n,
    Sui: 8_000_000n,
    Worldchain: 250_000n,
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
    Arbitrum: "0x9b2A3B92b1D86938D3Ed37B0519952C227bA6D09",
    Avalanche: "0x9b2A3B92b1D86938D3Ed37B0519952C227bA6D09",
    Base: "0x9b2A3B92b1D86938D3Ed37B0519952C227bA6D09",
    Ethereum: "0x9b2A3B92b1D86938D3Ed37B0519952C227bA6D09",
    Optimism: "0x9b2A3B92b1D86938D3Ed37B0519952C227bA6D09",
    Linea: "0x9b2A3B92b1D86938D3Ed37B0519952C227bA6D09",
    Polygon: "0x9b2A3B92b1D86938D3Ed37B0519952C227bA6D09",
    Unichain: "0x9b2A3B92b1D86938D3Ed37B0519952C227bA6D09",
    Solana: "JB3rmygUVuVZzgkxvMdV8mSKLJeQAkSXEK284Dqsziah",
    Sonic: "0x9b2A3B92b1D86938D3Ed37B0519952C227bA6D09",
    Sui: "0xbfa1240e48c622d97881473953be730091161b7931d89bd6afe667841cf69ef4",
    Worldchain: "0x9b2A3B92b1D86938D3Ed37B0519952C227bA6D09",
  },
};

export type CircleV2Contracts = {
  tokenMessengerV2: string;
  messageTransmitterV2: string;
};

export const circleV2Contracts: Partial<
  Record<Network, Partial<Record<Chain, CircleV2Contracts>>>
> = {
  Testnet: {
    ArbitrumSepolia: {
      tokenMessengerV2: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
      messageTransmitterV2: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
    },
    Avalanche: {
      tokenMessengerV2: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
      messageTransmitterV2: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
    },
    BaseSepolia: {
      tokenMessengerV2: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
      messageTransmitterV2: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
    },
    Linea: {
      tokenMessengerV2: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
      messageTransmitterV2: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
    },
    Sepolia: {
      tokenMessengerV2: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
      messageTransmitterV2: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
    },
    Sonic: {
      tokenMessengerV2: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
      messageTransmitterV2: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
    },
  },
  Mainnet: {
    Arbitrum: {
      tokenMessengerV2: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
      messageTransmitterV2: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
    },
    Avalanche: {
      tokenMessengerV2: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
      messageTransmitterV2: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
    },
    Base: {
      tokenMessengerV2: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
      messageTransmitterV2: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
    },
    Ethereum: {
      tokenMessengerV2: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
      messageTransmitterV2: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
    },
    Linea: {
      tokenMessengerV2: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
      messageTransmitterV2: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
    },
    Optimism: {
      tokenMessengerV2: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
      messageTransmitterV2: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
    },
    Sonic: {
      tokenMessengerV2: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
      messageTransmitterV2: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
    },
    Worldchain: {
      tokenMessengerV2: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
      messageTransmitterV2: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
    },
  },
};

export const circleV1Domains: Partial<
  Record<Network, Partial<Record<Chain, number>>>
> = {
  Testnet: {
    Sepolia: 0,
    Avalanche: 1,
    OptimismSepolia: 2,
    ArbitrumSepolia: 3,
    Solana: 5,
    BaseSepolia: 6,
    Polygon: 7,
    Sui: 8,
    Aptos: 9,
    Unichain: 10,
  },
  Mainnet: {
    Ethereum: 0,
    Avalanche: 1,
    Optimism: 2,
    Arbitrum: 3,
    Solana: 5,
    Base: 6,
    Polygon: 7,
    Sui: 8,
    Aptos: 9,
    Unichain: 10,
  },
};

export const isCircleV1Chain = (network: Network, chain: Chain): boolean => {
  return circleV1Domains[network]?.[chain] !== undefined;
};

export const getCircleV1Domain = (network: Network, chain: Chain): number => {
  const domain = circleV1Domains[network]?.[chain];
  if (domain === undefined) {
    throw new Error(
      `CircleV1 domain not found for network ${network} and chain ${chain}`
    );
  }
  return domain;
};

export const circleV2Domains: Partial<
  Record<Network, Partial<Record<Chain, number>>>
> = {
  Testnet: {
    Sepolia: 0,
    Avalanche: 1,
    ArbitrumSepolia: 3,
    BaseSepolia: 6,
    Linea: 11,
    Sonic: 13,
  },
  Mainnet: {
    Ethereum: 0,
    Avalanche: 1,
    Optimism: 2,
    Arbitrum: 3,
    Base: 6,
    Linea: 11,
    Sonic: 13,
    Worldchain: 14,
  },
};

export const isCircleV2Chain = (network: Network, chain: Chain): boolean => {
  return circleV2Domains[network]?.[chain] !== undefined;
};

export const getCircleV2Domain = (network: Network, chain: Chain): number => {
  const domain = circleV2Domains[network]?.[chain];
  if (domain === undefined) {
    throw new Error(
      `CircleV2 domain not found for network ${network} and chain ${chain}`
    );
  }
  return domain;
};

export const getCircleV2Chain = (network: Network, domain: number): Chain => {
  const chain = Object.entries(circleV2Domains[network] ?? {}).find(
    ([, d]) => d === domain
  )?.[0];
  if (chain === undefined) {
    throw new Error(
      `CircleV2 chain not found for network ${network} and domain ${domain}`
    );
  }
  return chain as Chain;
};

export const circleV2Api: Partial<Record<Network, string>> = {
  Testnet: "https://iris-api-sandbox.circle.com/v2",
  Mainnet: "https://iris-api.circle.com/v2",
};

// https://github.com/circlefin/evm-cctp-contracts/blob/master/src/v2/FinalityThresholds.sol
export enum CircleV2FinalityThreshold {
  CONFIRMED = 1000,
  FINALIZED = 2000,
}

// https://developers.circle.com/stablecoins/required-block-confirmations
export const fastTransferETAs: Partial<
  Record<Network, Partial<Record<Chain, number>>>
> = {
  // milliseconds
  Testnet: {
    ArbitrumSepolia: 8_000,
    BaseSepolia: 8_000,
    Sepolia: 20_000,
    Linea: 8_000,
  },
  Mainnet: {
    Arbitrum: 8_000,
    Base: 8_000,
    Ethereum: 20_000,
    Linea: 8_000,
    Optimism: 8_000,
    Worldchain: 8_000,
  },
};

export const isCircleV2FastChain = (
  network: Network,
  chain: Chain
): boolean => {
  return fastTransferETAs[network]?.[chain] !== undefined;
};
