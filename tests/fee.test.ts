import { REFERRER_FEE_DBPS } from "../src/consts";
import { calculateReferrerFee } from "../src/utils";

describe("calculateReferrerFee", () => {
  it("should calculate the referrer fee and remaining amount correctly when dBps is greater than 0", () => {
    const amount = 1_000_000n;
    const dBps = 5000n; // 5%
    const result = calculateReferrerFee(amount, dBps);

    expect(result.referrerFee).toBe(50_000n);
    expect(result.remainingAmount).toBe(950_000n);
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

  it("fee should be between 0 and 65_635", () => {
    expect(REFERRER_FEE_DBPS).toBeLessThanOrEqual(65_535n);
    expect(REFERRER_FEE_DBPS).toBeGreaterThanOrEqual(0n);
  });
});
