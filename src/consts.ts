import { PublicKeyInitData } from "@solana/web3.js";
import { Chain, Network } from "@wormhole-foundation/sdk-connect";

export const apiBaseUrl: Partial<Record<Network, string>> = {
  Testnet: "https://executor-testnet.labsapis.com",
  Mainnet: "https://executor.labsapis.com",
};

// CCTPv1 Shim Contract Addresses — legacy (dBPS-based referrer fee)
export const shimContractsV1Legacy: Partial<
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

// CCTPv1 Shim Contract Addresses — flat fee (CCTPv1WithExecutor.sol)
export const shimContractsV1: Partial<
  Record<Network, Partial<Record<Chain, string>>>
> = {
  Testnet: {
    Aptos: "0x14a12d1fd6ef371b70c2113155534ec152ec7f779e281b54866c796c9a4a58d3",
    ArbitrumSepolia: "0x8158305d331594f3e8d18c33ca4e6d3cdc109b75",
    Avalanche: "0x62819ab61cc7fcc864af7bcfc92e6c1965eb69a6",
    BaseSepolia: "0x96846c31e4f87c0f186a322926c61d4183439f0a",
    OptimismSepolia: "0xe17de8e29f1f0941b541b053829af74ac81c89a6",
    Polygon: "0xdce63172e9ad15243c97acafd01cc4fdda98bead",
    Sepolia: "0x2fcc7b2332d924764f17f1cf5eda1cd4b36751a2",
    Solana: "CXGRA5SCc8jxDbaQPZrmmZNu2JV34DP7gFW4m31uC1zs",
    Unichain: "0x2c1354296a11029056e0d7d7abbdd58743dbaf59",
  },
  Mainnet: {
    Aptos: "0xc89bf3746dfc70bb3f2de7c35a98f327a40b9d55a443743a5935c5e3de90b7ac",
    Arbitrum: "0x772373214238F09a494828A5323574E3d7e27558",
    Avalanche: "0x58aC806cd205083E7E048E196f36Ff6C4Ae17bE5",
    Base: "0x4D1Cc8921e291555044C01761f581fa52a24C33d",
    Ethereum: "0x6DDE92942DbB24F7c9B75765b74a33446980C1e3",
    Optimism: "0x6826c075973a4393CEf0e131c4B16869426563a7",
    Polygon: "0x7e6Ae241101B355447A4B471D0C6968b132eC4Ab",
    Unichain: "0xa997Ef229E4D2a1fEca249eB41fBf5D4b2217d6E",
    Solana: "CXGRA5SCc8jxDbaQPZrmmZNu2JV34DP7gFW4m31uC1zs",
  },
};

// CCTPv2 Shim Contract Addresses — legacy (dBPS-based referrer fee)
export const shimContractsV2Legacy: Partial<
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
    HyperEVM: "0xACD054f83c0b852d02503191e2c26527A7E72B1f",
    Linea: "0xc48c126468BE919068dE1983F00F65af759a4E87",
    Optimism: "0xd0a8940b2e743e33b682daec4d52b46713606c9d",
    Polygon: "0xc8a8e6d760dcbd5d6746e2f66cd2ffa722dd1e59",
    Unichain: "0xD5D5D640D8b758672Cc7A078734175c4433866d5",
    Seievm: "0xf4FefFc03EEFB06B009bFB168b60B30edf7abc12",
    Sonic: "0xc39BF082ec91D9bC385F956D24a8D66C0c26223d",
    Worldchain: "0x789f2b91f7B35D5B890983328340c4600339B354",
    Plume: "0x486228859880ec6c05175035bEe2e5383D23B0fE",
    Ink: "0xD71898Ec48D36eba65eeb104AF87b00C24A8F201",
    Monad: "0xA4d775410FB35d8cE49Ad98d3f483A55e532de73",
  },
};

// CCTPv2 Shim Contract Addresses — flat fee (CCTPv2WithExecutor.sol)
export const shimContractsV2: Partial<
  Record<Network, Partial<Record<Chain, string>>>
> = {
  Testnet: {
    ArbitrumSepolia: "0xf601f9988d62943cb842baae1e46be9b17d0b2a4",
    Avalanche: "0x10018394905f70daa1d740040d64cbed5a82301e",
    BaseSepolia: "0x1effdcfedc6d45e44b3133257debfb522adb1cae",
    Ink: "0x63993ee08bda32ecb0ba5cdc751b404f5c5c0458",
    Linea: "0xe8Ad216e23fc9425E65aB315F0EC13737e75afEF",
    OptimismSepolia: "0x49f386393c26439b74e62f5794062925dfb7c1db",
    Polygon: "0x05da7c69db265b37b4d3530d476ec4b33bd9dd45",
    Sepolia: "0xc58475c97ebde9cf4fefa0d4fb2774df81905d43",
    Unichain: "0xf082af7668f000f60bc519b378f6363708fc302b",
  },
  Mainnet: {
    Arbitrum: "0x760feC4425B46E3D8FEf8E2CE49786e5a6f74446",
    Avalanche: "0xE42aE9e352157fcEf74E971F2C5c74A5963a71D7",
    Base: "0x52892976559fB2fc8b7f850440eD9AA5Dc26f7D9",
    Ethereum: "0xDD68aBa3E04CB1a05082402B9325753314803005",
    HyperEVM: "0x001319beBA062d918d7007E4D2D76a0A9cc439Db",
    Linea: "0x257dBB6AD7C7AC19360bEe1A107ebE631D568776",
    Optimism: "0x9b51579e67D4ab18D79609105509ad37B2a0D342",
    Polygon: "0x5116F1358ae2445f571AA702dA1feB5e13094E59",
    Unichain: "0xaf7f4FbB6C220baf57ABC7babF81D47Fd628bdb4",
    Seievm: "0xe067C0D378C50CDc34bCd973F202736D5A19e5D2",
    Sonic: "0x8A850b2077F1eFccA89eAa9c35b45C4dC9227cdb",
    Worldchain: "0xAA4841e5d9652593852403E3ce9e8003f8D579D0",
    Plume: "0x9be9C6B420eAfaaC1162D680fd7E61446b38Cf29",
    Ink: "0xef0B43b49315A4aDF11bA2617Be81a304c5D6ecc",
    Monad: "0x1FdCCf65318b34CFd3F5903fFb747C17e76330ac",
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
    HyperEVM: 250_000n,
    Linea: 250_000n,
    Optimism: 250_000n,
    Polygon: 250_000n,
    Unichain: 250_000n,
    Seievm: 250_000n,
    Solana: 250_000n,
    Sonic: 250_000n,
    Sui: 8_000_000n,
    Worldchain: 250_000n,
    Plume: 250_000n,
    Ink: 250_000n,
    Monad: 500_000n,
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
    Solana: {
      tokenMessengerV2: "CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe",
      messageTransmitterV2: "CCTPV2Sm4AdWt5296sk4P66VBZ7bEhcARwFaaS9YPbeC",
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
    HyperEVM: {
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
    Polygon: {
      tokenMessengerV2: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
      messageTransmitterV2: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
    },
    Solana: {
      tokenMessengerV2: "CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe",
      messageTransmitterV2: "CCTPV2Sm4AdWt5296sk4P66VBZ7bEhcARwFaaS9YPbeC",
    },
    Unichain: {
      tokenMessengerV2: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
      messageTransmitterV2: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
    },
    Seievm: {
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
    Plume: {
      tokenMessengerV2: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
      messageTransmitterV2: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
    },
    Ink: {
      tokenMessengerV2: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
      messageTransmitterV2: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
    },
    Monad: {
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
      `CircleV1 domain not found for network ${network} and chain ${chain}`,
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
    Solana: 5,
    BaseSepolia: 6,
    Linea: 11,
    Sonic: 13,
  },
  Mainnet: {
    Ethereum: 0,
    Avalanche: 1,
    Optimism: 2,
    Arbitrum: 3,
    Solana: 5,
    Base: 6,
    Polygon: 7,
    Unichain: 10,
    Linea: 11,
    Sonic: 13,
    Worldchain: 14,
    Seievm: 16,
    HyperEVM: 19,
    Ink: 21,
    Plume: 22,
    Monad: 15,
  },
};

export const circleV2SvmLut: Partial<
  Record<Network, Partial<Record<Chain, PublicKeyInitData>>>
> = {
  Testnet: {
    Solana: "8ZHaV5NQ218fLR85VtC9oK3Axyvj8uxGpnKdaswxsxe4",
  },
  Mainnet: {
    Solana: "Ec9XVcN6YqFhqNFTYQD3985jmGFEDa7tHEQK8bbQi5xD",
  },
};

export const isCircleV2Chain = (network: Network, chain: Chain): boolean => {
  return circleV2Domains[network]?.[chain] !== undefined;
};

export const getCircleV2Domain = (network: Network, chain: Chain): number => {
  const domain = circleV2Domains[network]?.[chain];
  if (domain === undefined) {
    throw new Error(
      `CircleV2 domain not found for network ${network} and chain ${chain}`,
    );
  }
  return domain;
};

export const getCircleV2Chain = (network: Network, domain: number): Chain => {
  const chain = Object.entries(circleV2Domains[network] ?? {}).find(
    ([, d]) => d === domain,
  )?.[0];
  if (chain === undefined) {
    throw new Error(
      `CircleV2 chain not found for network ${network} and domain ${domain}`,
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
    Polygon: 8_000,
    Unichain: 8_000,
    Seievm: 8_000,
    Worldchain: 8_000,
    Plume: 8_000,
    Ink: 8_000,
  },
};

export const isCircleV2FastChain = (
  network: Network,
  chain: Chain,
): boolean => {
  return fastTransferETAs[network]?.[chain] !== undefined;
};
