import { DeriveType, Layout } from "binary-layout";

// import { hexConversion } from "./conversions";

export const gasInstructionLayout = [
  { name: "gasLimit", binary: "uint", size: 16 },
  { name: "msgValue", binary: "uint", size: 16 },
] as const satisfies Layout;

export type GasInstruction = DeriveType<typeof gasInstructionLayout>;

export const gasDropOffInstructionLayout = [
  { name: "dropOff", binary: "uint", size: 16 },
  // { name: "recipient", binary: "bytes", size: 32, custom: hexConversion },
  { name: "recipient", binary: "bytes", size: 32 },
] as const satisfies Layout;

export type GasDropOffInstruction = DeriveType<typeof gasDropOffInstructionLayout>;

export const relayInstructionLayout = [
  {
    name: "request",
    binary: "switch",
    idSize: 1,
    idTag: "type",
    layouts: [
      [[1, "GasInstruction"], gasInstructionLayout],
      [[2, "GasDropOffInstruction"], gasDropOffInstructionLayout],
    ],
  },
] as const satisfies Layout;

export type RelayInstruction = DeriveType<typeof relayInstructionLayout>;

export const relayInstructionsLayout = [
  {
    name: "requests",
    binary: "array",
    layout: relayInstructionLayout,
  },
] as const satisfies Layout;

export type RelayInstructions = DeriveType<typeof relayInstructionsLayout>;

/**
 * Calculates the total gas limit and total message value from a set of relay instructions.
 *
 * Each relay instruction can be either a `GasInstruction` or a `GasDropOffInstruction`.
 * - `GasInstruction` contributes to both `gasLimit` and `msgValue`.
 * - `GasDropOffInstruction` contributes only to `msgValue`.
 *
 * @param {RelayInstructions} relayInstructions - An object containing an array of relay instructions to process.
 * @returns {{ gasLimit: bigint; msgValue: bigint }} - The aggregated gas limit and message value.
 *
 * @throws {Error} If an unsupported instruction type is encountered.
 */
export function totalGasLimitAndMsgValue(relayInstructions: RelayInstructions): {
  gasLimit: bigint;
  msgValue: bigint;
} {
  let gasLimit = 0n;
  let msgValue = 0n;
  for (const relayInstruction of relayInstructions.requests) {
    const type = relayInstruction.request.type;
    if (type === "GasInstruction") {
      gasLimit += relayInstruction.request.gasLimit;
      msgValue += relayInstruction.request.msgValue;
    } else if (type === "GasDropOffInstruction") {
      msgValue += relayInstruction.request.dropOff;
    } else {
      // This case is never reached
      // const _: never = type;
      throw new Error(`Unsupported type: ${type}`);
    }
  }
  return { gasLimit, msgValue };
}

///**
// * Returns the first GasDropOffInstruction from a set of relay instructions.
// *
// * If no GasDropOffInstruction is found, dropOff will be 0 and recipient all zeroes
// * The returned dropOff value will be the min of dropOff and gasDropOffLimit
// *
// * @param {RelayInstructions} relayInstructions - An object containing an array of relay instructions to process.
// * @param {bigint} gasDropOffLimit - The maximum supported amount for a gas drop off
// * @returns {{ dropOff: bigint; recipient: `0x${string}` }} - The drop off amount and recipient.
// */
//export function getFirstDropOffInstruction(
//  relayInstructions: RelayInstructions,
//  gasDropOffLimit: bigint,
//): {
//  dropOff: bigint;
//  recipient: `0x${string}`;
//} {
//  for (const relayInstruction of relayInstructions.requests) {
//    const type = relayInstruction.request.type;
//    if (type === "GasDropOffInstruction") {
//      if (relayInstruction.request.dropOff > gasDropOffLimit) {
//        return {
//          dropOff: gasDropOffLimit,
//          recipient: relayInstruction.request.recipient,
//        };
//      }
//      return relayInstruction.request;
//    }
//  }
//  return {
//    dropOff: 0n,
//    recipient: "0x0000000000000000000000000000000000000000000000000000000000000000",
//  };
//}
