import { cctpExecutorRoute, CCTPExecutorRoute } from "../src/routes/cctpV1";
import {
  cctpV2StandardExecutorRoute,
  CCTPv2StandardExecutorRoute,
} from "../src/routes/cctpV2Standard";
import {
  cctpV2FastExecutorRoute,
  CCTPv2FastExecutorRoute,
} from "../src/routes/cctpV2Fast";

// ─── Default Config (flat fee mode) ───

describe("CCTPv1 Route Config", () => {
  it("should create a route with default flat fee config when no config is provided", () => {
    const Route = cctpExecutorRoute();
    expect(Route.config).toEqual({
      transferTokenFee: 0n,
      nativeTokenFee: 0n,
    });
  });

  it("should create a route with explicit transferTokenFee", () => {
    const config: CCTPExecutorRoute.Config = {
      transferTokenFee: 50_000n, // $0.05 USDC
      referrerAddresses: {
        Mainnet: { Ethereum: "0x1234567890123456789012345678901234567890" },
      },
    };
    const Route = cctpExecutorRoute(config);
    expect(Route.config.transferTokenFee).toBe(50_000n);
    expect(Route.config.nativeTokenFee).toBeUndefined();
  });

  it("should create a route with explicit nativeTokenFee", () => {
    const config: CCTPExecutorRoute.Config = {
      nativeTokenFee: 1_000_000_000_000_000n, // 0.001 ETH in wei
      referrerAddresses: {
        Mainnet: { Ethereum: "0x1234567890123456789012345678901234567890" },
      },
    };
    const Route = cctpExecutorRoute(config);
    expect(Route.config.nativeTokenFee).toBe(1_000_000_000_000_000n);
    expect(Route.config.transferTokenFee).toBeUndefined();
  });

  it("should create a route with both fee types", () => {
    const config: CCTPExecutorRoute.Config = {
      transferTokenFee: 100_000n,
      nativeTokenFee: 5_000_000_000_000_000n,
      referrerAddresses: {
        Mainnet: {
          Ethereum: "0x1234567890123456789012345678901234567890",
        },
      },
    };
    const Route = cctpExecutorRoute(config);
    expect(Route.config.transferTokenFee).toBe(100_000n);
    expect(Route.config.nativeTokenFee).toBe(5_000_000_000_000_000n);
    expect(Route.config.referrerAddresses?.Mainnet?.Ethereum).toBe(
      "0x1234567890123456789012345678901234567890"
    );
  });

  it("should create a route with referrer addresses only", () => {
    const config: CCTPExecutorRoute.Config = {
      referrerAddresses: {
        Mainnet: {
          Ethereum: "0xaaaa567890123456789012345678901234567890",
          Arbitrum: "0xbbbb567890123456789012345678901234567890",
        },
        Testnet: {
          Sepolia: "0xcccc567890123456789012345678901234567890",
        },
      },
    };
    const Route = cctpExecutorRoute(config);
    expect(Route.config.referrerAddresses?.Mainnet?.Ethereum).toBe(
      "0xaaaa567890123456789012345678901234567890"
    );
    expect(Route.config.referrerAddresses?.Mainnet?.Arbitrum).toBe(
      "0xbbbb567890123456789012345678901234567890"
    );
    expect(Route.config.referrerAddresses?.Testnet?.Sepolia).toBe(
      "0xcccc567890123456789012345678901234567890"
    );
  });
});

describe("CCTPv2 Standard Route Config", () => {
  it("should create a route with default flat fee config when no config is provided", () => {
    const Route = cctpV2StandardExecutorRoute();
    expect(Route.config).toEqual({
      transferTokenFee: 0n,
      nativeTokenFee: 0n,
    });
  });

  it("should create a route with explicit transferTokenFee", () => {
    const config: CCTPv2StandardExecutorRoute.Config = {
      transferTokenFee: 75_000n,
      referrerAddresses: {
        Mainnet: { Base: "0x1111567890123456789012345678901234567890" },
      },
    };
    const Route = cctpV2StandardExecutorRoute(config);
    expect(Route.config.transferTokenFee).toBe(75_000n);
  });
});

describe("CCTPv2 Fast Route Config", () => {
  it("should create a route with default flat fee config when no config is provided", () => {
    const Route = cctpV2FastExecutorRoute();
    expect(Route.config).toEqual({
      transferTokenFee: 0n,
      nativeTokenFee: 0n,
    });
  });

  it("should create a route with explicit transferTokenFee", () => {
    const config: CCTPv2FastExecutorRoute.Config = {
      transferTokenFee: 150_000n,
      referrerAddresses: {
        Mainnet: { Optimism: "0x2222567890123456789012345678901234567890" },
      },
    };
    const Route = cctpV2FastExecutorRoute(config);
    expect(Route.config.transferTokenFee).toBe(150_000n);
  });
});

// ─── Fee Config Validation ───

describe("Fee Config Validation", () => {
  it("should throw if transferTokenFee is negative", () => {
    expect(() =>
      cctpExecutorRoute({ transferTokenFee: -1n })
    ).toThrow("transferTokenFee must be non-negative");
  });

  it("should throw if nativeTokenFee is negative", () => {
    expect(() =>
      cctpExecutorRoute({ nativeTokenFee: -1n })
    ).toThrow("nativeTokenFee must be non-negative");
  });

  it("should throw if transferTokenFee is set without referrerAddresses", () => {
    expect(() =>
      cctpExecutorRoute({ transferTokenFee: 1000n })
    ).toThrow("referrerAddresses must be provided when fees are configured");
  });

  it("should throw if nativeTokenFee is set without referrerAddresses", () => {
    expect(() =>
      cctpExecutorRoute({ nativeTokenFee: 1000n })
    ).toThrow("referrerAddresses must be provided when fees are configured");
  });

  it("should throw if callback fee is set without referrerAddresses", () => {
    expect(() =>
      cctpExecutorRoute({ transferTokenFee: (amount, _chain) => amount / 100n })
    ).toThrow("referrerAddresses must be provided when fees are configured");
  });

  it("should not throw for zero fees without referrerAddresses", () => {
    expect(() =>
      cctpExecutorRoute({ transferTokenFee: 0n, nativeTokenFee: 0n })
    ).not.toThrow();
  });
});

// ─── Fee Amount Handling ───

describe("Fee Amount Handling", () => {
  it("should support zero fees (no referrer fee scenario)", () => {
    const config: CCTPExecutorRoute.Config = {
      transferTokenFee: 0n,
      nativeTokenFee: 0n,
    };
    const Route = cctpExecutorRoute(config);
    expect(Route.config.transferTokenFee).toBe(0n);
    expect(Route.config.nativeTokenFee).toBe(0n);
  });

  it("should support large fee amounts", () => {
    const config: CCTPExecutorRoute.Config = {
      transferTokenFee: 1_000_000_000n,
      nativeTokenFee: 1_000_000_000_000_000_000n,
      referrerAddresses: {
        Mainnet: { Ethereum: "0x1234567890123456789012345678901234567890" },
      },
    };
    const Route = cctpExecutorRoute(config);
    expect(Route.config.transferTokenFee).toBe(1_000_000_000n);
    expect(Route.config.nativeTokenFee).toBe(1_000_000_000_000_000_000n);
  });

  it("should handle typical fee amounts", () => {
    const config: CCTPExecutorRoute.Config = {
      transferTokenFee: 50_000n, // $0.05 with 6 decimals
      referrerAddresses: {
        Mainnet: { Ethereum: "0x1234567890123456789012345678901234567890" },
      },
    };
    const Route = cctpExecutorRoute(config);
    expect(Route.config.transferTokenFee).toBe(50_000n);
  });
});
