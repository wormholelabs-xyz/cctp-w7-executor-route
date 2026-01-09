import { calculateFastBurnMaxFee } from "../src/utils";

describe("calculateFastBurnMaxFee", () => {
  it("should calculate fee for $1 at 1.3 bps", () => {
    const remainingAmount = 1_000_000n;
    const result = calculateFastBurnMaxFee(remainingAmount, 1.3);
    expect(result).toBe(130n);
  });

  it("should calculate fee for $10 at 2 bps", () => {
    const remainingAmount = 10_000_000n;
    const result = calculateFastBurnMaxFee(remainingAmount, 2);
    expect(result).toBe(2_000n);
  });

  it("should calculate fee for $100 at 1 bps", () => {
    const remainingAmount = 100_000_000n;
    const result = calculateFastBurnMaxFee(remainingAmount, 1);
    expect(result).toBe(10_000n);
  });

  it("should calculate fee for $1,000 at 1.3 bps", () => {
    const remainingAmount = 1_000_000_000n;
    const result = calculateFastBurnMaxFee(remainingAmount, 1.3);
    expect(result).toBe(130_000n);
  });

  it("should calculate fee for $1,000,000 at 2 bps", () => {
    const remainingAmount = 1_000_000_000_000n;
    const result = calculateFastBurnMaxFee(remainingAmount, 2);
    expect(result).toBe(200_000_000n);
  });

  it("should calculate fee for $5,000,000 at 1 bps", () => {
    const remainingAmount = 5_000_000_000_000n;
    const result = calculateFastBurnMaxFee(remainingAmount, 1);
    expect(result).toBe(500_000_000n);
  });

  it("should calculate fee for $100 at 1.3 bps", () => {
    const remainingAmount = 100_000_000n;
    const result = calculateFastBurnMaxFee(remainingAmount, 1.3);
    expect(result).toBe(13_000n);
  });

  it("should calculate fee for $1,000,000 at 1 bps", () => {
    const remainingAmount = 1_000_000_000_000n;
    const result = calculateFastBurnMaxFee(remainingAmount, 1);
    expect(result).toBe(100_000_000n);
  });

  it("should calculate fee for $5,000,000 at 1.3 bps", () => {
    const remainingAmount = 5_000_000_000_000n;
    const result = calculateFastBurnMaxFee(remainingAmount, 1.3);
    expect(result).toBe(650_000_000n);
  });
});
