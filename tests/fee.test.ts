import { cctpExecutorRoute, CCTPExecutorRoute } from "../src/routes/cctpV1";
import {
  cctpV2StandardExecutorRoute,
  CCTPv2StandardExecutorRoute,
} from "../src/routes/cctpV2Standard";
import {
  cctpV2FastExecutorRoute,
  CCTPv2FastExecutorRoute,
} from "../src/routes/cctpV2Fast";
import { calculateReferrerFee } from "../src/routes/helpers";

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

// ─── Legacy Fee Mode (useLegacyFees: true) ───

describe("Legacy Fee Mode (useLegacyFees: true)", () => {
  it("should create a CCTPv1 route with referrerFeeDbps", () => {
    const config: CCTPExecutorRoute.Config = {
      useLegacyFees: true,
      referrerFeeDbps: 100n, // 0.1%
      referrerAddresses: {
        Mainnet: { Ethereum: "0x1234567890123456789012345678901234567890" },
      },
    };
    const Route = cctpExecutorRoute(config);
    expect(Route.config.useLegacyFees).toBe(true);
    expect(Route.config.referrerFeeDbps).toBe(100n);
  });

  it("should create a CCTPv2 Standard route with referrerFeeDbps", () => {
    const config: CCTPv2StandardExecutorRoute.Config = {
      useLegacyFees: true,
      referrerFeeDbps: 200n,
      referrerAddresses: {
        Mainnet: { Base: "0x1111567890123456789012345678901234567890" },
      },
    };
    const Route = cctpV2StandardExecutorRoute(config);
    expect(Route.config.referrerFeeDbps).toBe(200n);
  });

  it("should create a CCTPv2 Fast route with referrerFeeDbps", () => {
    const config: CCTPv2FastExecutorRoute.Config = {
      useLegacyFees: true,
      referrerFeeDbps: 300n,
      referrerAddresses: {
        Mainnet: {
          Optimism: "0x2222567890123456789012345678901234567890",
          Polygon: "0x3333567890123456789012345678901234567890",
        },
      },
    };
    const Route = cctpV2FastExecutorRoute(config);
    expect(Route.config.referrerFeeDbps).toBe(300n);
  });
});

// ─── Fee Config Validation ───

describe("Fee Config Validation - flat fee mode (default)", () => {
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

describe("Fee Config Validation - legacy dBPS mode", () => {
  it("should throw if referrerFeeDbps exceeds max u16", () => {
    expect(() =>
      cctpExecutorRoute({ useLegacyFees: true, referrerFeeDbps: 65_536n })
    ).toThrow("referrerFeeDbps must be between 0 and 65535");
  });

  it("should throw if referrerFeeDbps is negative", () => {
    expect(() =>
      cctpExecutorRoute({ useLegacyFees: true, referrerFeeDbps: -1n })
    ).toThrow("referrerFeeDbps must be between 0 and 65535");
  });

  it("should throw if referrerFeeDbps > 0 without referrerAddresses", () => {
    expect(() =>
      cctpExecutorRoute({ useLegacyFees: true, referrerFeeDbps: 100n })
    ).toThrow("referrerAddresses must be provided when referrerFeeDbps > 0");
  });

  it("should not throw for zero referrerFeeDbps without referrerAddresses", () => {
    expect(() =>
      cctpExecutorRoute({ useLegacyFees: true, referrerFeeDbps: 0n })
    ).not.toThrow();
  });

  it("should allow max u16 referrerFeeDbps with referrerAddresses", () => {
    expect(() =>
      cctpExecutorRoute({
        useLegacyFees: true,
        referrerFeeDbps: 65_535n,
        referrerAddresses: {
          Mainnet: { Ethereum: "0x1234567890123456789012345678901234567890" },
        },
      })
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

// ─── calculateReferrerFee ───

describe("calculateReferrerFee", () => {
  it("should return zero fee when dBps is 0", () => {
    const result = calculateReferrerFee(1_000_000n, 0n);
    expect(result.referrerFee).toBe(0n);
    expect(result.remainingAmount).toBe(1_000_000n);
  });

  it("should calculate fee correctly for 1% (1000 dBps)", () => {
    // 1% of 100 USDC (100_000_000 base units)
    const result = calculateReferrerFee(100_000_000n, 1000n);
    // 100_000_000 * 1000 / 100_000 = 1_000_000 (1 USDC)
    expect(result.referrerFee).toBe(1_000_000n);
    expect(result.remainingAmount).toBe(99_000_000n);
  });

  it("should calculate fee correctly for 0.1% (100 dBps)", () => {
    const result = calculateReferrerFee(100_000_000n, 100n);
    // 100_000_000 * 100 / 100_000 = 100_000 ($0.10)
    expect(result.referrerFee).toBe(100_000n);
    expect(result.remainingAmount).toBe(99_900_000n);
  });

  it("should cap fee at threshold when amount exceeds threshold", () => {
    // 100 USDC transfer, 1% fee, threshold of 50 USDC
    const result = calculateReferrerFee(100_000_000n, 1000n, 50n);
    // cappedAmount = min(100_000_000, 50 * 1_000_000) = 50_000_000
    // fee = 50_000_000 * 1000 / 100_000 = 500_000 ($0.50)
    expect(result.referrerFee).toBe(500_000n);
    expect(result.remainingAmount).toBe(99_500_000n);
  });

  it("should not cap fee when amount is below threshold", () => {
    // 10 USDC transfer, 1% fee, threshold of 50 USDC
    const result = calculateReferrerFee(10_000_000n, 1000n, 50n);
    // cappedAmount = min(10_000_000, 50_000_000) = 10_000_000
    // fee = 10_000_000 * 1000 / 100_000 = 100_000 ($0.10)
    expect(result.referrerFee).toBe(100_000n);
    expect(result.remainingAmount).toBe(9_900_000n);
  });

  it("should throw if dBps exceeds max u16", () => {
    expect(() =>
      calculateReferrerFee(1_000_000n, 65_536n)
    ).toThrow("dBps exceeds max u16");
  });

  it("should handle max u16 dBps", () => {
    // 65535 dBps = 65.535%
    const result = calculateReferrerFee(1_000_000n, 65_535n);
    // 1_000_000 * 65_535 / 100_000 = 655_350
    expect(result.referrerFee).toBe(655_350n);
    expect(result.remainingAmount).toBe(1_000_000n - 655_350n);
  });

  it("should handle zero amount", () => {
    const result = calculateReferrerFee(0n, 1000n);
    expect(result.referrerFee).toBe(0n);
    expect(result.remainingAmount).toBe(0n);
  });

  it("should handle zero amount with threshold", () => {
    // When amount is 0 and threshold is defined, dBps > 0 but amount is 0
    // The condition `threshold !== undefined && amount > 0n` is false
    // so it falls through to the else branch: (0 * 1000) / 100_000 = 0
    const result = calculateReferrerFee(0n, 1000n, 50n);
    expect(result.referrerFee).toBe(0n);
    expect(result.remainingAmount).toBe(0n);
  });
});
