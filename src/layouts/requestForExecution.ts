import { DeriveType, Layout } from "binary-layout";
import { layoutItems } from "@wormhole-foundation/sdk-definitions";

// import { hexConversion } from "./conversions";

export enum RequestPrefix {
  ERM1 = "ERM1", // MM
  ERV1 = "ERV1", // VAA_V1
  ERN1 = "ERN1", // NTT_V1
  ERC1 = "ERC1", // CCTP_V1
}

//export const modularMessageRequestLayout = [
//  { name: "chain", binary: "uint", size: 2 },
//  // { name: "address", binary: "bytes", size: 32, custom: hexConversion },
//  { name: "address", binary: "bytes", size: 32, custom: },
//  { name: "sequence", binary: "uint", size: 8 },
//  {
//    name: "payload",
//    binary: "bytes",
//    lengthSize: 4,
//    custom: hexConversion,
//  },
//] as const satisfies Layout;

//export type ModularMessageRequest = DeriveType<
//  typeof modularMessageRequestLayout
//>;

export const vaaV1RequestLayout = [
  { name: "chain", binary: "uint", size: 2 },
  // { name: "address", binary: "bytes", size: 32, custom: hexConversion },
  { name: "address", ...layoutItems.universalAddressItem },
  { name: "sequence", binary: "uint", size: 8 },
] as const satisfies Layout;

export type VAAv1Request = DeriveType<typeof vaaV1RequestLayout>;

export const nttV1RequestLayout = [
  { name: "srcChain", binary: "uint", size: 2 },
  {
    name: "srcManager",
    //binary: "bytes",
    //size: 32,
    //custom: hexConversion,
    ...layoutItems.universalAddressItem,
  },
  {
    name: "messageId",
    binary: "bytes",
    size: 32,
    //custom: hexConversion,
  },
] as const satisfies Layout;

export type NTTv1Request = DeriveType<typeof nttV1RequestLayout>;

export const cctpV1RequestLayout = [
  { name: "sourceDomain", binary: "uint", size: 4 },
  { name: "nonce", binary: "uint", size: 8 },
] as const satisfies Layout;

export type CCTPv1Request = DeriveType<typeof cctpV1RequestLayout>;

export const requestLayout = [
  {
    name: "request",
    binary: "switch",
    idSize: 4,
    idTag: "prefix",
    layouts: [
      // [[0x45524d31, RequestPrefix.ERM1], modularMessageRequestLayout],
      [[0x45525631, RequestPrefix.ERV1], vaaV1RequestLayout],
      [[0x45524e31, RequestPrefix.ERN1], nttV1RequestLayout],
      [[0x45524331, RequestPrefix.ERC1], cctpV1RequestLayout],
    ],
  },
] as const satisfies Layout;

export type Request = DeriveType<typeof requestLayout>;
