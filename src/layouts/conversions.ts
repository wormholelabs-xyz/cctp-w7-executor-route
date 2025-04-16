// import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { CustomConversion } from "binary-layout";
// import { fromBytes, fromHex } from "viem";

//export const hexConversion = {
//  to: (encoded: Uint8Array) => fromBytes(encoded, "hex"),
//  from: (decoded: `0x${string}`) => fromHex(decoded, "bytes"),
//} as const satisfies CustomConversion<Uint8Array, `0x${string}`>;
//
//export const base58Conversion = {
//  to: (encoded: Uint8Array) => bs58.encode(encoded),
//  from: (decoded: string) => new Uint8Array(bs58.decode(decoded)),
//} as const satisfies CustomConversion<Uint8Array, string>;

export const dateConversion = {
  to: (encoded: bigint) => new Date(Number(encoded * 1000n)),
  from: (decoded: Date) => BigInt(decoded.getTime()) / 1000n,
} as const satisfies CustomConversion<bigint, Date>;
