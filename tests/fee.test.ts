import { cctpExecutorRoute } from "../src/routes/cctpV1";
import { calculateReferrerFee } from "../src/utils";

describe("calculateReferrerFee", () => {
  it("should calculate the referrer fee and remaining amount correctly when dBps is greater than 0", () => {
    const amount = 1_000_000n;
    const dBps = 5000n; // 5%
    const result = calculateReferrerFee(amount, dBps);

    expect(result.referrerFee).toBe(50_000n);
    expect(result.remainingAmount).toBe(950_000n);
  });

  it("should calculate the referrer fee and remaining amount correctly when referrerFeeThreshold is specified", () => {
    const amount = 1_000_000n; // $1 in base units
    const dBps = 10n; // 1 basis point = 0.01%
    const threshold = 1_000_000n; // $1M threshold in whole USDC

    const result = calculateReferrerFee(amount, dBps, threshold);

    // Amount ($1) is below threshold ($1M), so normal calculation applies
    // fee = (1_000_000 * 10) / 100_000 = 100 base units = $0.0001
    expect(result.referrerFee).toBe(100n);
    expect(result.remainingAmount).toBe(999_900n);
    expect(result.referrerFeeDbps).toBe(10n); // Full rate since below threshold
  });

  it("should calculate referrer fees correctly with same threshold but different amounts", () => {
    const dBps = 10n; // 1 basis point = 0.01%
    const threshold = 1_000_000n; // $1M threshold

    // Test case 1: $100 transfer (below threshold)
    let amount = 100_000_000n; // $100 in base units
    let result = calculateReferrerFee(amount, dBps, threshold);
    // fee = (100_000_000 * 10) / 100_000 = 10_000 = $0.01
    expect(result.referrerFee).toBe(10_000n);
    expect(result.remainingAmount).toBe(99_990_000n);
    expect(result.referrerFeeDbps).toBe(10n); // Full rate

    // Test case 2: $1,000 transfer (below threshold)
    amount = 1_000_000_000n; // $1,000 in base units
    result = calculateReferrerFee(amount, dBps, threshold);
    // fee = (1_000_000_000 * 10) / 100_000 = 100_000 = $0.10
    expect(result.referrerFee).toBe(100_000n);
    expect(result.remainingAmount).toBe(999_900_000n);
    expect(result.referrerFeeDbps).toBe(10n); // Full rate

    // Test case 3: $1,000,000 transfer (at threshold exactly)
    amount = 1_000_000_000_000n; // $1,000,000 in base units
    result = calculateReferrerFee(amount, dBps, threshold);
    // fee = (1_000_000_000_000 * 10) / 100_000 = 100_000_000 = $100
    expect(result.referrerFee).toBe(100_000_000n);
    expect(result.remainingAmount).toBe(999_900_000_000n);
    expect(result.referrerFeeDbps).toBe(10n); // Full rate at threshold

    // Test case 4: $5,000,000 transfer (above threshold)
    amount = 5_000_000_000_000n; // $5,000,000 in base units
    result = calculateReferrerFee(amount, dBps, threshold);
    // Capped: fee = (1_000_000_000_000 * 10) / 100_000 = 100_000_000 = $100 (same as at threshold)
    expect(result.referrerFee).toBe(100_000_000n);
    expect(result.remainingAmount).toBe(4_999_900_000_000n);
    // Effective rate: (100_000_000 * 100_000) / 5_000_000_000_000 = 2 dBps
    expect(result.referrerFeeDbps).toBe(2n);

    // Test case 5: $10,000,000 transfer (max amount)
    amount = 10_000_000_000_000n; // $10M in base units
    result = calculateReferrerFee(amount, dBps, threshold);
    // Capped: fee stays at $100
    expect(result.referrerFee).toBe(100_000_000n);
    expect(result.remainingAmount).toBe(9_999_900_000_000n);
    // Effective rate: (100_000_000 * 100_000) / 10_000_000_000_000 = 1 dBps
    expect(result.referrerFeeDbps).toBe(1n);
  });

  it("should return the full amount as remaining and zero referrer fee when dBps is 0", () => {
    const amount = 1_000_000n;
    const dBps = 0n;
    const result = calculateReferrerFee(amount, dBps);

    expect(result.referrerFee).toBe(0n);
    expect(result.remainingAmount).toBe(1_000_000n);
  });

  it("should throw an error if dBps exceeds MAX_U16", () => {
    const amount = 1_000_000n;
    const dBps = 65_536n; // Exceeds MAX_U16 (65,535)

    expect(() => calculateReferrerFee(amount, dBps)).toThrowError(
      "dBps exceeds max u16"
    );
  });

  it("should handle edge case where dBps is exactly MAX_U16", () => {
    const amount = 1_000_000n;
    const dBps = 65_535n; // Exactly MAX_U16
    const result = calculateReferrerFee(amount, dBps);

    expect(result.referrerFee).toBe(655_350n); // 65.535% of 1,000,000
    expect(result.remainingAmount).toBe(344_650n);
  });

  it("should handle edge case where amount is 0", () => {
    const amount = 0n;
    const dBps = 500n;
    const result = calculateReferrerFee(amount, dBps);

    expect(result.referrerFee).toBe(0n);
    expect(result.remainingAmount).toBe(0n);
  });

  it("fee should be between 0 and 65535", () => {
    expect(() => cctpExecutorRoute({ referrerFeeDbps: -1n })).toThrow();
    expect(() => cctpExecutorRoute({ referrerFeeDbps: 65_536n })).toThrow();
  });
});
