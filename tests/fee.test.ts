import { cctpExecutorRoute } from "../src";
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
    const amount = 1_000_000n;
    const dBps = 50n;
    const threshold = 5n; // threshold is in whole units, so 5n = 5_000_000n in base units
    const cappedResult = calculateReferrerFee(amount, dBps, threshold);

    // using the capped dBps should yield the same result as the no threshold case
    // capped dBps = min(dBps, threshold/amount) = min(50n, 5_000_000n / 1_000_000n) = 5n
    const noCapResult = calculateReferrerFee(amount, 5n);

    expect(cappedResult.referrerFee).equal(noCapResult.referrerFee);
    expect(cappedResult.referrerFee).toBe(50n);
    expect(cappedResult.remainingAmount).toBe(999_950n);
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
